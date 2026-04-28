import { VIRTUE_LEVELS, TIERS } from './constants.js'

// ── Date helpers ──────────────────────────────────────────────────────────────

export function todayStr() { return localDateStr(new Date()) }

export function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function parseLocalDate(str) {
  const [y,m,d] = str.split('-').map(Number)
  return new Date(y, m-1, d)
}

export function getWeekDates() {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    return localDateStr(d)
  })
}

// ── Scoring ───────────────────────────────────────────────────────────────────

export function calcWeeklyScore(goals, logs) {
  if (!goals.length) return 0
  const week    = getWeekDates()
  const today   = todayStr()
  const elapsed = week.filter(d => d <= today)
  if (!elapsed.length) return 0
  const scored  = goals.filter(g => !g.timeframe || g.timeframe === 'daily' || g.timeframe === 'weekly')
  if (!scored.length) return 0

  let totalWeight = 0, earnedWeight = 0
  scored.forEach(goal => {
    const w = goal.weight || 1
    totalWeight += w * elapsed.length
    elapsed.forEach(date => {
      const val = (logs[date] || {})[goal.id]
      if (goal.type === 'binary' || goal.type === 'streak') {
        if (val === true || val === 1) earnedWeight += w
      } else if (goal.type === 'quantitative') {
        const tv = parseFloat(goal.target_value || 1)
        const v  = parseFloat(val)
        if (!isNaN(v) && v > 0) earnedWeight += v >= tv ? w : w * (v / tv)
      }
    })
  })
  return totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0
}

export function getTier(score) {
  return [...TIERS].reverse().find(t => score >= t.min) || TIERS[0]
}

// ── Virtue XP ─────────────────────────────────────────────────────────────────

export function getVirtueLevel(xp) {
  let cur = VIRTUE_LEVELS[0], nxt = VIRTUE_LEVELS[1]
  for (let i = VIRTUE_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= VIRTUE_LEVELS[i].threshold) {
      cur = VIRTUE_LEVELS[i]; nxt = VIRTUE_LEVELS[i+1] || null; break
    }
  }
  const progress = nxt ? ((xp - cur.threshold) / (nxt.threshold - cur.threshold)) * 100 : 100
  return { current: cur, next: nxt, progress }
}

/** Full recalc — used on startup and goal deletion only */
export function recalcVirtueXP(goals, logs) {
  const xp = { courage: 0, wisdom: 0, temperance: 0, justice: 0 }
  Object.values(logs).forEach(dayLogs => {
    goals.forEach(goal => {
      if (!goal.virtue || !(goal.virtue in xp)) return
      const val = dayLogs[goal.id]
      let done = goal.type === 'quantitative'
        ? (!isNaN(parseFloat(val)) && parseFloat(val) >= parseFloat(goal.target_value || 1))
        : (val === 1 || val === true)
      if (done) xp[goal.virtue] += (goal.weight || 1) * 10
    })
  })
  return xp
}

/**
 * Incremental XP delta for a single log change — O(1).
 * Returns { virtue, delta } or null if no change.
 */
export function xpDelta(goal, prevValue, newValue) {
  if (!goal?.virtue) return null
  const wasComplete = isGoalComplete(goal, prevValue)
  const isComplete  = isGoalComplete(goal, newValue)
  if (wasComplete === isComplete) return null
  const amount = (goal.weight || 1) * 10
  return { virtue: goal.virtue, delta: isComplete ? amount : -amount }
}

export function isGoalComplete(goal, val) {
  if (goal.type === 'quantitative') {
    const tv = parseFloat(goal.target_value || 1)
    const v  = parseFloat(val)
    return !isNaN(v) && v >= tv
  }
  return val === 1 || val === true
}

// ── Streak — capped at 91 (matches 90-day prune window) ──────────────────────

export function calcStreak(goalId, logs) {
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 91; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const val = (logs[localDateStr(d)] || {})[goalId]
    if (val === 1 || val === true) {
      streak++
    } else {
      if (i === 0) continue
      break
    }
  }
  return streak
}

// ── Period tracking ───────────────────────────────────────────────────────────

// Fixed epoch so fortnightly periods never split on Jan 1
const FORTNIGHT_EPOCH = new Date(2026, 0, 1)

export function getPeriodDates(timeframe) {
  const now = new Date(); now.setHours(0,0,0,0)

  if (!timeframe || timeframe === 'daily') {
    const s = localDateStr(now); return { start: s, end: s, totalDays: 1 }
  }
  if (timeframe === 'weekly') {
    const day = now.getDay()
    const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    return { start: localDateStr(mon), end: localDateStr(sun), totalDays: 7 }
  }
  if (timeframe === 'fortnightly') {
    // Fixed epoch anchor — never resets on Jan 1
    const daysSince = Math.floor((now - FORTNIGHT_EPOCH) / 86400000)
    const ps = new Date(FORTNIGHT_EPOCH); ps.setDate(FORTNIGHT_EPOCH.getDate() + Math.floor(daysSince / 14) * 14)
    const pe = new Date(ps); pe.setDate(ps.getDate() + 13)
    return { start: localDateStr(ps), end: localDateStr(pe), totalDays: 14 }
  }
  if (timeframe === 'monthly') {
    const s = new Date(now.getFullYear(), now.getMonth(), 1)
    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { start: localDateStr(s), end: localDateStr(e), totalDays: e.getDate() }
  }
  if (timeframe === 'yearly') {
    const s    = new Date(now.getFullYear(), 0, 1)
    const e    = new Date(now.getFullYear(), 11, 31)
    const leap = (now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) || now.getFullYear() % 400 === 0
    return { start: localDateStr(s), end: localDateStr(e), totalDays: leap ? 366 : 365 }
  }
  const s = localDateStr(now); return { start: s, end: s, totalDays: 1 }
}

/** O(log entries in range) — not O(period length) */
export function getPeriodInfo(goal, logs) {
  const frequency = goal.frequency || 1
  const { start, end, totalDays } = getPeriodDates(goal.timeframe)
  const today = localDateStr(new Date())

  // Filter log keys that fall within period — O(keys in range) not O(period days)
  let completions = 0
  Object.entries(logs).forEach(([date, dayLogs]) => {
    if (date < start || date > end || date > today) return
    const val = dayLogs[goal.id]
    const done = goal.type === 'quantitative'
      ? (!isNaN(parseFloat(val)) && parseFloat(val) >= parseFloat(goal.target_value || 1))
      : (val === 1 || val === true)
    if (done) completions++
  })

  const now          = new Date(); now.setHours(0,0,0,0)
  const endDate      = parseLocalDate(end)
  const daysLeft     = Math.max(0, Math.round((endDate - now) / 86400000) + 1)
  const daysElapsed  = Math.max(0, totalDays - daysLeft)
  const needed       = Math.max(0, frequency - completions)
  const complete     = completions >= frequency
  const behind       = !complete && needed > daysLeft
  const expectedNow  = Math.ceil((daysElapsed / totalDays) * frequency)
  const onTrack      = complete || completions >= expectedNow

  return { completions, frequency, needed, daysLeft, totalDays, complete, behind, onTrack }
}

// ── Log maintenance ───────────────────────────────────────────────────────────

export function pruneOldLogs(logs, daysToKeep = 90) {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - daysToKeep)
  const cutoffStr = localDateStr(cutoff)
  return Object.fromEntries(Object.entries(logs).filter(([d]) => d >= cutoffStr))
}

export function uid() { return Math.random().toString(36).slice(2, 9) }

// ── Timeframe display helpers ─────────────────────────────────────────────────

const TIMEFRAME_NOUN = { daily: 'day', weekly: 'week', fortnightly: 'fortnight', monthly: 'month', yearly: 'year' }
export function timeframeNoun(tf) { return TIMEFRAME_NOUN[tf] || tf }
