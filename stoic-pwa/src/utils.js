import { VIRTUE_LEVELS, TIERS, TRANSFORMATION_STAGES, STOIC_CHALLENGES } from './constants.js'

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
 */
function isComplete(val, goal) {
  if (val === null || val === undefined || val === 0 || val === '0' || val === '') return false
  if (goal.type === 'quantitative') {
    return parseFloat(val) >= parseFloat(goal.target_value || 1)
  }
  return Boolean(val)
}

/**
 * Calculates the weekly performance score (0–100) across all active goals.
 */
export function calcWeeklyScore(goals, logs) {
  if (!goals.length) return 0
  const week = getWeekDates()
  let totalWeight = 0, earnedWeight = 0

  goals.forEach(goal => {
    const w = goal.weight || 1
    const timeframe = goal.timeframe || 'daily'

    if (timeframe === 'monthly' || timeframe === 'yearly' || timeframe === 'every_x_weeks') return

    if (timeframe === 'weekly_x') {
      const target = goal.freq_count || 3
      totalWeight += w * target
      const completions = week.filter(
        date => isComplete((logs[date] || {})[goal.id], goal)
      ).length
      earnedWeight += w * Math.min(completions, target)
    } else {
      totalWeight += w * 7
      week.forEach(date => {
        const val = (logs[date] || {})[goal.id]
        if (goal.type === 'quantitative') {
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

// ─── Transformation System ────────────────────────────────────────────────────

/**
 * Calculates 30-day consistency rate (0–100).
 * Only counts days where the app had daily/weekly goals to complete.
 * Partial credit is given for quantitative goals.
 */
export function calcConsistencyRate(goals, logs, days = 30) {
  const dailyGoals = goals.filter(g => {
    const tf = g.timeframe || 'daily'
    return tf === 'daily' || tf === 'weekly' || tf === 'weekly_x'
  })
  if (!dailyGoals.length) return 0

  const scores = []
  for (let i = 1; i <= days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const date = d.toISOString().split('T')[0]
    const dayLogs = logs[date] || {}

    // Only score days where there are logs — don't penalise days before app was used
    const hasAnyLog = Object.keys(dayLogs).length > 0
    if (!hasAnyLog && i > 14) continue // allow first 14 days without logs to count as 0

    let total = 0, earned = 0
    dailyGoals.forEach(g => {
      const w = g.weight || 1
      total += w
      const val = dayLogs[g.id]
      if (g.type === 'quantitative') {
        const parsed = parseFloat(val)
        const target = parseFloat(g.target_value || 1)
        if (!isNaN(parsed) && parsed > 0) {
          earned += parsed >= target ? w : w * (parsed / target)
        }
      } else if (isComplete(val, g)) {
        earned += w
      }
    })
    if (total > 0) scores.push(earned / total)
  }

  if (!scores.length) return 0
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100)
}

/**
 * Returns the transformation stage object for a given consistency rate.
 */
export function getTransformationStage(rate) {
  const stages = [...TRANSFORMATION_STAGES].reverse()
  return stages.find(s => rate >= s.minRate) || TRANSFORMATION_STAGES[0]
}

// ─── Burnout Detection ────────────────────────────────────────────────────────

/**
 * Detects burnout or inactivity patterns.
 * Returns { active: bool, reason: 'overload' | 'inactivity' | null, detail: string }
 *
 * Triggers:
 *   'inactivity' — no goal logs recorded for today AND yesterday
 *   'overload'   — <50% completion rate on 3 consecutive past days
 */
export function detectBurnout(goals, logs) {
  const dailyGoals = goals.filter(g => {
    const tf = g.timeframe || 'daily'
    return tf === 'daily' || tf === 'weekly' || tf === 'weekly_x'
  })
  if (!dailyGoals.length) return { active: false, reason: null }

  const today = todayStr()

  // Inactivity: no logs at all for today and yesterday
  const yest = new Date()
  yest.setDate(yest.getDate() - 1)
  const yestStr = yest.toISOString().split('T')[0]

  const hasLogsToday = dailyGoals.some(g => {
    const v = (logs[today] || {})[g.id]
    return v !== undefined && v !== null && v !== 0 && v !== '0' && v !== ''
  })
  const hasLogsYest = dailyGoals.some(g => {
    const v = (logs[yestStr] || {})[g.id]
    return v !== undefined && v !== null && v !== 0 && v !== '0' && v !== ''
  })

  if (!hasLogsToday && !hasLogsYest) {
    return {
      active: true,
      reason: 'inactivity',
      detail: 'No goals have been logged in the past 48 hours.',
    }
  }

  // Overload: <50% on each of the last 3 completed days
  const dayRates = []
  for (let i = 1; i <= 3; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const date = d.toISOString().split('T')[0]
    const dayLogs = logs[date] || {}
    let total = 0, earned = 0
    dailyGoals.forEach(g => {
      const w = g.weight || 1; total += w
      const val = dayLogs[g.id]
      if (isComplete(val, g)) earned += w
    })
    dayRates.push(total > 0 ? earned / total : 0)
  }

  if (dayRates.length === 3 && dayRates.every(r => r < 0.5)) {
    return {
      active: true,
      reason: 'overload',
      detail: 'Fewer than half your goals have been completed over the past 3 days.',
    }
  }

  return { active: false, reason: null }
}

// ─── Challenge System ─────────────────────────────────────────────────────────

/**
 * Picks the weekly challenge deterministically from the available pool.
 * Rotates weekly, avoiding recently completed challenges.
 */
export function pickWeeklyChallenge(completedIds = []) {
  // Week number since epoch (rotates weekly)
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  const available = STOIC_CHALLENGES.filter(c => !completedIds.includes(c.id))
  const pool = available.length >= 4 ? available : STOIC_CHALLENGES
  return pool[weekNum % pool.length]
}

/**
 * Returns the days remaining on an active challenge.
 */
export function challengeDaysRemaining(challenge) {
  if (!challenge || !challenge.startDate) return 0
  const start = new Date(challenge.startDate + 'T00:00:00')
  const now   = new Date()
  const daysPassed = Math.floor((now - start) / 86400000)
  return Math.max(0, challenge.duration - daysPassed)
}

/**
 * Returns true if the challenge duration has elapsed.
 */
export function challengeIsExpired(challenge) {
  return challengeDaysRemaining(challenge) === 0
}

/**
 * Returns true if the challenge has enough logged days to be considered complete.
 * Requires ≥70% of duration days to be marked.
 */
export function challengeIsComplete(challenge) {
  if (!challenge) return false
  const required = Math.ceil(challenge.duration * 0.7)
  return (challenge.daysLogged || []).length >= required
}
