#!/bin/bash
# 🔬 Legba's Research Scout
# Usage: ./scout.sh [command] [query]

set -e
cd "$(dirname "$0")"

[ -f "../.secrets/setup.sh" ] && source "../.secrets/setup.sh" 2>/dev/null

case "${1:-hunt}" in
  hunt)
    echo "🔬 Research hunt for: ${2:-agentic AI}"
    curl -s "https://hacker-news.firebaseio.com/v0/topstories.json" | \
      jq '.[0:10][]' | while read id; do
        curl -s "https://hacker-news.firebaseio.com/v0/item/${id}.json" | \
          jq -r 'select(.title | test("AI|agent|LLM|Claude"; "i")) | "\(.score) ⬆ \(.title)"'
      done
    ;;
  *)
    echo "Usage: $0 [hunt] [query]"
    ;;
esac
