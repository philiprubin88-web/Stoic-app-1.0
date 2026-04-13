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
    const w    = goal.weight || 1
    const freq = goal.frequency || 1
    const tf   = goal.timeframe || 'daily'

    // Count completions across a set of dates
    const countDone = (dates) => dates.reduce((sum, date) => {
      const val = (logs[date] || {})[goal.id]
      if (goal.type === 'quantitative') {
        const v = parseFloat(val)
        const t = parseFloat(goal.target_value || 1)
        if (v >= t) return sum + 1
        if (v > 0)  return sum + v / t
      } else {
        if (val === 1 || val === true) return sum + 1
      }
      return sum
    }, 0)

    if (tf === 'daily') {
      // Must complete every day — 7 opportunities per week
      totalWeight  += w * 7
      earnedWeight += w * Math.min(countDone(week), 7)

    } else if (tf === 'weekly') {
      // Must complete `freq` times per week
      totalWeight  += w * freq
      earnedWeight += w * Math.min(countDone(week), freq)

    } else if (tf === 'fortnight') {
      // Must complete `freq` times per fortnight
      // Pro-rate: one week = half a fortnight, so weekly target = freq / 2
      const weeklyTarget = freq / 2
      totalWeight  += w * weeklyTarget
      earnedWeight += w * Math.min(countDone(week), weeklyTarget)

    } else {
      // Monthly / yearly — just needs to happen at least once this week
      totalWeight  += w
      earnedWeight += Math.min(countDone(week), 1) > 0 ? w : 0
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
