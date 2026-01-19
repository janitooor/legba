#!/usr/bin/env bash
# GPT 5.2 API interaction for cross-model review
#
# Usage: gpt-review-api.sh <review_type> <content_file> [augmentation_file]
#
# Arguments:
#   review_type: prd | sdd | sprint | code
#   content_file: File containing content to review
#   augmentation_file: Optional file with project-specific context
#
# Environment:
#   OPENAI_API_KEY - Required
#   GPT_REVIEW_MODEL - Optional override (default: per review type)
#   GPT_REVIEW_TIMEOUT - Optional override (default: 300)
#
# Exit codes:
#   0 - Success, response written to stdout
#   1 - API error
#   2 - Invalid input
#   3 - Timeout
#   4 - Missing API key
#   5 - Invalid response format

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROMPTS_DIR="${SCRIPT_DIR}/../prompts/gpt-review/base"
CONFIG_FILE=".loa.config.yaml"

# Default models per review type
declare -A DEFAULT_MODELS=(
  ["prd"]="gpt-5.2-pro"
  ["sdd"]="gpt-5.2-pro"
  ["sprint"]="gpt-5.2-pro"
  ["code"]="gpt-5.2-codex"
)

# Default timeout in seconds
DEFAULT_TIMEOUT=300

# Max retries for transient failures
MAX_RETRIES=3
RETRY_DELAY=5

log() {
  echo "[gpt-review-api] $*" >&2
}

error() {
  echo "ERROR: $*" >&2
}

# Load configuration from .loa.config.yaml if available
load_config() {
  if [[ -f "$CONFIG_FILE" ]] && command -v yq &>/dev/null; then
    local timeout_val
    timeout_val=$(yq eval '.gpt_review.timeout_seconds // ""' "$CONFIG_FILE" 2>/dev/null || echo "")
    if [[ -n "$timeout_val" && "$timeout_val" != "null" ]]; then
      GPT_REVIEW_TIMEOUT="${GPT_REVIEW_TIMEOUT:-$timeout_val}"
    fi

    # Model overrides from config
    local doc_model code_model
    doc_model=$(yq eval '.gpt_review.models.documents // ""' "$CONFIG_FILE" 2>/dev/null || echo "")
    code_model=$(yq eval '.gpt_review.models.code // ""' "$CONFIG_FILE" 2>/dev/null || echo "")

    if [[ -n "$doc_model" && "$doc_model" != "null" ]]; then
      DEFAULT_MODELS["prd"]="$doc_model"
      DEFAULT_MODELS["sdd"]="$doc_model"
      DEFAULT_MODELS["sprint"]="$doc_model"
    fi
    if [[ -n "$code_model" && "$code_model" != "null" ]]; then
      DEFAULT_MODELS["code"]="$code_model"
    fi
  fi
}

# Build the system prompt
build_system_prompt() {
  local review_type="$1"
  local augmentation_file="${2:-}"

  local base_prompt_file="${PROMPTS_DIR}/${review_type}-review.md"

  if [[ ! -f "$base_prompt_file" ]]; then
    error "Base prompt not found: $base_prompt_file"
    exit 2
  fi

  local system_prompt
  system_prompt=$(cat "$base_prompt_file")

  # Append augmentation if provided
  if [[ -n "$augmentation_file" && -f "$augmentation_file" ]]; then
    system_prompt+=$'\n\n## Project-Specific Context (Added by Claude)\n\n'
    system_prompt+=$(cat "$augmentation_file")
  fi

  echo "$system_prompt"
}

# Call OpenAI API with retry logic
call_api() {
  local model="$1"
  local system_prompt="$2"
  local content="$3"
  local timeout="$4"

  local api_url="https://api.openai.com/v1/chat/completions"

  # Escape for JSON using jq
  local escaped_system escaped_content
  escaped_system=$(printf '%s' "$system_prompt" | jq -Rs .)
  escaped_content=$(printf '%s' "$content" | jq -Rs .)

  local payload
  payload=$(cat <<EOF
{
  "model": "${model}",
  "messages": [
    {"role": "system", "content": ${escaped_system}},
    {"role": "user", "content": ${escaped_content}}
  ],
  "temperature": 0.3,
  "response_format": {"type": "json_object"}
}
EOF
)

  local attempt=1
  local response http_code

  while [[ $attempt -le $MAX_RETRIES ]]; do
    log "API call attempt $attempt/$MAX_RETRIES (model: $model, timeout: ${timeout}s)"

    # Make API call with timeout
    local curl_output
    curl_output=$(curl -s -w "\n%{http_code}" \
      --max-time "$timeout" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${OPENAI_API_KEY}" \
      -d "$payload" \
      "$api_url" 2>&1) || {
        local curl_exit=$?
        if [[ $curl_exit -eq 28 ]]; then
          error "API call timed out after ${timeout}s (attempt $attempt)"
          if [[ $attempt -lt $MAX_RETRIES ]]; then
            log "Retrying in ${RETRY_DELAY}s..."
            sleep "$RETRY_DELAY"
            ((attempt++))
            continue
          fi
          exit 3
        fi
        error "curl failed with exit code $curl_exit"
        exit 1
      }

    # Extract HTTP code from last line
    http_code=$(echo "$curl_output" | tail -1)
    response=$(echo "$curl_output" | sed '$d')

    # Handle different HTTP codes
    case "$http_code" in
      200)
        # Success - break out of retry loop
        break
        ;;
      401)
        error "Authentication failed - check OPENAI_API_KEY"
        exit 4
        ;;
      429)
        log "Rate limited (429) - attempt $attempt"
        if [[ $attempt -lt $MAX_RETRIES ]]; then
          local wait_time=$((RETRY_DELAY * attempt))
          log "Waiting ${wait_time}s before retry..."
          sleep "$wait_time"
          ((attempt++))
          continue
        fi
        error "Rate limit exceeded after $MAX_RETRIES attempts"
        exit 1
        ;;
      500|502|503|504)
        log "Server error ($http_code) - attempt $attempt"
        if [[ $attempt -lt $MAX_RETRIES ]]; then
          log "Retrying in ${RETRY_DELAY}s..."
          sleep "$RETRY_DELAY"
          ((attempt++))
          continue
        fi
        error "Server error after $MAX_RETRIES attempts"
        exit 1
        ;;
      *)
        error "API returned HTTP $http_code"
        log "Response: $response"
        exit 1
        ;;
    esac
  done

  # Extract content from response
  local content_response
  content_response=$(echo "$response" | jq -r '.choices[0].message.content // empty')

  if [[ -z "$content_response" ]]; then
    error "No content in API response"
    log "Full response: $response"
    exit 5
  fi

  # Validate JSON response
  if ! echo "$content_response" | jq empty 2>/dev/null; then
    error "Invalid JSON in response"
    log "Response content: $content_response"
    exit 5
  fi

  # Validate required fields
  local verdict
  verdict=$(echo "$content_response" | jq -r '.verdict // empty')
  if [[ -z "$verdict" ]]; then
    error "Response missing 'verdict' field"
    log "Response content: $content_response"
    exit 5
  fi

  if [[ "$verdict" != "APPROVED" && "$verdict" != "CHANGES_REQUIRED" && "$verdict" != "DECISION_NEEDED" ]]; then
    error "Invalid verdict: $verdict (expected: APPROVED, CHANGES_REQUIRED, or DECISION_NEEDED)"
    exit 5
  fi

  echo "$content_response"
}

usage() {
  cat <<EOF
Usage: gpt-review-api.sh <review_type> <content_file> [augmentation_file]

Arguments:
  review_type       Type of review: prd, sdd, sprint, code
  content_file      File containing content to review
  augmentation_file Optional file with project-specific context

Environment:
  OPENAI_API_KEY    Required - Your OpenAI API key
  GPT_REVIEW_MODEL  Optional - Override model for all reviews
  GPT_REVIEW_TIMEOUT Optional - Override timeout in seconds (default: 300)

Exit Codes:
  0 - Success
  1 - API error
  2 - Invalid input
  3 - Timeout
  4 - Missing/invalid API key
  5 - Invalid response format
EOF
}

main() {
  local review_type="${1:-}"
  local content_file="${2:-}"
  local augmentation_file="${3:-}"

  # Show usage if no args
  if [[ -z "$review_type" ]]; then
    usage
    exit 2
  fi

  # Validate review type
  if [[ ! "${DEFAULT_MODELS[$review_type]+exists}" ]]; then
    error "Invalid review type: $review_type"
    echo "Valid types: prd, sdd, sprint, code" >&2
    exit 2
  fi

  # Validate content file
  if [[ -z "$content_file" ]]; then
    error "Content file required"
    usage
    exit 2
  fi

  if [[ ! -f "$content_file" ]]; then
    error "Content file not found: $content_file"
    exit 2
  fi

  # Check API key
  if [[ -z "${OPENAI_API_KEY:-}" ]]; then
    error "OPENAI_API_KEY environment variable not set"
    echo "Export your OpenAI API key: export OPENAI_API_KEY='sk-...'" >&2
    exit 4
  fi

  # Check for jq
  if ! command -v jq &>/dev/null; then
    error "jq is required but not installed"
    exit 2
  fi

  # Load configuration
  load_config

  # Determine model and timeout
  local model="${GPT_REVIEW_MODEL:-${DEFAULT_MODELS[$review_type]}}"
  local timeout="${GPT_REVIEW_TIMEOUT:-$DEFAULT_TIMEOUT}"

  log "Review type: $review_type"
  log "Model: $model"
  log "Timeout: ${timeout}s"
  log "Content file: $content_file"
  [[ -n "$augmentation_file" ]] && log "Augmentation: $augmentation_file"

  # Build prompt
  local system_prompt
  system_prompt=$(build_system_prompt "$review_type" "$augmentation_file")

  # Read content
  local content
  content=$(cat "$content_file")

  # Call API
  local response
  response=$(call_api "$model" "$system_prompt" "$content" "$timeout")

  # Output response
  echo "$response"
}

main "$@"
