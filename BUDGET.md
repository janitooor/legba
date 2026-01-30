# Legba Work Budget

## Your Patterns (from GitHub)

| Time (UTC) | Activity | My Strategy |
|------------|----------|-------------|
| 00-07 | 😴 Sleep | **Heavy work** - PRs, implementation |
| 08-13 | 💻 Peak work | **Light** - available for chat, quick tasks |
| 14-19 | 🌅 Quiet | **Medium work** - design, research |
| 20-22 | 🌙 Evening | **Light** - sync up, report progress |

Your timezone: UTC+6 (based on commit patterns)
- Your morning: 08-13 UTC = 14:00-19:00 local
- Your sleep: ~00-07 UTC = 06:00-13:00 local

## Budget Model

### Option A: Token Budget
```
Daily allowance: 200K tokens (~$5-10/day)

Allocation:
- 00-06 UTC: 80K (heavy work while you sleep)
- 06-12 UTC: 40K (light, you're waking/working)
- 12-18 UTC: 50K (medium work)
- 18-24 UTC: 30K (light, evening sync)
```

### Option B: Cost Budget
```
Daily allowance: $10/day

Allocation by period:
- Your sleep (00-07): $5 (50%)
- Your active (08-22): $4 (40%)
- Reserve: $1 (10%)
```

### Option C: Work Unit Budget
```
Daily allowance: 6 work units

Work unit costs:
- Heavy (PR, implementation): 2 units
- Medium (design, research): 1 unit
- Light (check, sync): 0.5 units
- Heartbeat: 0.25 units

Allocation:
- Sleep period: 3 units (can do 1-2 heavy tasks)
- Active period: 2 units (light work, available)
- Reserve: 1 unit
```

## Proposed: Hybrid Approach

**Daily budget: $10 / 200K tokens / 6 work units**

| Period (UTC) | Budget | Work Style |
|--------------|--------|------------|
| 00-07 (your sleep) | 50% | Autonomous heavy work |
| 08-13 (your peak) | 20% | Light, responsive |
| 14-19 (your quiet) | 20% | Medium autonomous |
| 20-24 (your evening) | 10% | Sync, report |

## Tracking

I'll track in `memory/budget-YYYY-MM.json`:
```json
{
  "2026-02": {
    "totalSpent": 0,
    "dailyLimit": 10,
    "periods": [
      {"date": "2026-02-01", "spent": 4.50, "units": 3}
    ]
  }
}
```

## What This Means

Instead of "1 task per day", I can:
- Do 2-3 heavy tasks during your sleep
- Stay responsive during your work hours
- Batch research and design in quiet periods
- Never exceed daily budget

---

*Which option do you prefer? Or should I just work freely and you'll tell me if costs get too high?*
