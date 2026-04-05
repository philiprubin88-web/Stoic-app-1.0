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

export function calcWeeklyScore(goals, logs) {
  if (!goals.length) return 0
  const week = getWeekDates()
  let totalWeight = 0, earnedWeight = 0
  goals.forEach(goal => {
    const w = goal.weight || 1
    totalWeight += w * 7
    week.forEach(date => {
      const dayLog = logs[date] || {}
      const val = dayLog[goal.id]
      if (goal.type === 'binary' || goal.type === 'streak') {
        if (val === true || val === 1) earnedWeight += w
      } else if (goal.type === 'quantitative') {
        if (val && parseFloat(val) >= parseFloat(goal.target_value || 1)) earnedWeight += w
        else if (val && parseFloat(val) > 0)
          earnedWeight += w * (parseFloat(val) / parseFloat(goal.target_value || 1))
      }
    })
  })
  return totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0
}

export function getTier(score) {
  return [...TIERS].reverse().find(t => score >= t.min) || TIERS[0]
}

export function uid() {
  return Math.random().toString(36).slice(2, 9)
}
