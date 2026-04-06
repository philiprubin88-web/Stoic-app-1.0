import { VIRTUE_LEVELS, TIERS } from './constants.js'

export function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export function getWeekDates() {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

export function getVirtueLevel(xp) {
  let cur = VIRTUE_LEVELS[0], nxt = VIRTUE_LEVELS[1]
  for (let i = VIRTUE_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= VIRTUE_LEVELS[i].threshold) {
      cur = VIRTUE_LEVELS[i]
      nxt = VIRTUE_LEVELS[i + 1] || null
      break
    }
  }
  const progress = nxt
    ? ((xp - cur.threshold) / (nxt.threshold - cur.threshold)) * 100
    : 100
  return { current: cur, next: nxt, progress }
}

/**
 * Returns a human-readable label for a goal's frequency setting.
 * Used in both the Goals tab meta line and the Log tab goal cards.
 *
 * Timeframe values:
 *   'daily'         — every day
 *   'weekly'        — legacy weekly (treated as daily for scoring)
 *   'weekly_x'      — X times per week (freq_count stores X)
 *   'every_x_weeks' — once every N weeks (freq_every stores N); treated as long-term
 *   'monthly'       — once a month; long-term
 *   'yearly'        — once a year; long-term
 */
export function freqLabel(goal) {
  switch (goal.timeframe) {
    case 'daily':          return 'Daily'
    case 'weekly':         return 'Weekly'
    case 'weekly_x':       return `${goal.freq_count || 3}× / week`
    case 'every_x_weeks':  return `Every ${goal.freq_every || 2} weeks`
    case 'monthly':        return 'Monthly'
    case 'yearly':         return 'Yearly'
    default:               return 'Daily'
  }
}

/**
 * Returns true if a logged value counts as a completion for the given goal.
 * Handles all goal types:
 *   binary / streak / noted — any truthy non-zero non-empty value
 *   quantitative            — numeric value must meet or exceed target
 */
function isComplete(val, goal) {
  if (val === null || val === undefined || val === 0 || val === '0' || val === '') return false
  if (goal.type === 'quantitative') {
    return parseFloat(val) >= parseFloat(goal.target_value || 1)
  }
  // binary, streak, noted: truthy value counts
  return Boolean(val)
}

/**
 * Calculates the weekly performance score (0–100) across all active goals.
 *
 * Scoring rules by timeframe:
 *   'daily' / 'weekly' — each of the 7 days is scored independently (max = weight × 7)
 *   'weekly_x'         — track total completions this week vs freq_count target (max = weight × freq_count)
 *   long-term goals    — excluded from weekly score entirely
 *
 * Quantitative goals get partial credit proportional to progress toward target.
 */
export function calcWeeklyScore(goals, logs) {
  if (!goals.length) return 0
  const week = getWeekDates()
  let totalWeight = 0, earnedWeight = 0

  goals.forEach(goal => {
    const w = goal.weight || 1
    const timeframe = goal.timeframe || 'daily'

    // Long-term goals are excluded — their value isn't captured by a 7-day window
    if (timeframe === 'monthly' || timeframe === 'yearly' || timeframe === 'every_x_weeks') return

    if (timeframe === 'weekly_x') {
      // Target: freq_count total completions across the 7-day window
      const target = goal.freq_count || 3
      totalWeight += w * target
      const completions = week.filter(
        date => isComplete((logs[date] || {})[goal.id], goal)
      ).length
      // Cap earned at the target — logging 4x when target is 3 doesn't give bonus credit
      earnedWeight += w * Math.min(completions, target)

    } else {
      // Daily / weekly: score each day independently
      totalWeight += w * 7
      week.forEach(date => {
        const val = (logs[date] || {})[goal.id]
        if (goal.type === 'quantitative') {
          // Partial credit for quantitative goals (e.g. 7000/10000 steps = 70%)
          const parsed = parseFloat(val)
          const target = parseFloat(goal.target_value || 1)
          if (!isNaN(parsed) && parsed > 0) {
            earnedWeight += parsed >= target ? w : w * (parsed / target)
          }
        } else if (isComplete(val, goal)) {
          earnedWeight += w
        }
      })
    }
  })

  return totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0
}

export function getTier(score) {
  return [...TIERS].reverse().find(t => score >= t.min) || TIERS[0]
}

export function uid() {
  return Math.random().toString(36).slice(2, 9)
}
