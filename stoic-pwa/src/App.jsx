import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
import './styles.css'
import { VIRTUES, STOIC_CONTENT, VIRTUE_LEVELS, CHALLENGES } from './constants.js'
import {
  todayStr, useToday, getWeekDates, getVirtueLevel, calcWeeklyScore, getTier, uid,
  recalcVirtueXP, xpDelta, isGoalComplete, calcStreak, getPeriodInfo, pruneOldLogs,
  parseLocalDate, localDateStr, timeframeNoun, trialEndDate, isTrialFinalDay,
  calcGoalStats, TIMEFRAME_ABBREV
} from './utils.js'
import { storageGet, storageSet, storageRemove } from './storage.js'

const MAX_GOALS   = 20
const TRIAL_DAY_XP = 15

function recalcAllXP(goals, logs, trials = []) {
  const xp = recalcVirtueXP(goals, logs)
  trials.forEach(t => {
    const ch = CHALLENGES.find(c => c.id === t.challengeId)
    if (!ch || !(ch.virtue in xp)) return
    xp[ch.virtue] = (xp[ch.virtue] || 0) + Object.keys(t.dailyLogs || {}).length * TRIAL_DAY_XP
    if (t.completed) xp[ch.virtue] += ch.duration * 10
  })
  return xp
}

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(e) { return { err: e } }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div style={{ background:'#080808', height:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, fontFamily:'monospace', textAlign:'center' }}>
        <div style={{ fontSize:10, letterSpacing:'.3em', color:'#5a4818', marginBottom:20 }}>SYSTEM ERROR</div>
        <div style={{ fontSize:13, color:'#55504a', letterSpacing:'.1em', lineHeight:2, marginBottom:32 }}>Something went wrong.<br/>Your data is safe.</div>
        <button onClick={() => window.location.reload()} style={{ background:'transparent', border:'1px solid #5a4818', color:'#c9a84c', fontFamily:'monospace', fontSize:11, letterSpacing:'.3em', padding:'12px 28px', cursor:'pointer' }}>RELOAD</button>
      </div>
    )
  }
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel='Confirm', danger=false, onConfirm, onCancel }) {
  useEffect(() => {
    const p = document.body.style.overflow; document.body.style.overflow = 'hidden'
    const h = e => e.key === 'Escape' && onCancel()
    document.addEventListener('keydown', h)
    return () => { document.body.style.overflow = p; document.removeEventListener('keydown', h) }
  }, [onCancel])
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="confirm-title">{title}</div>
        {message && <div className="confirm-message">{message}</div>}
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button className={`btn-save${danger?' btn-danger':''}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const LogIcon      = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="16" rx="1"/><line x1="7" y1="9" x2="17" y2="9"/><line x1="7" y1="13" x2="13" y2="13"/></svg>)
const GoalsIcon    = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="3" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21"/></svg>)
const TrialsIcon   = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L15 9H22L16.5 13.5L18.5 21L12 17L5.5 21L7.5 13.5L2 9H9L12 2Z"/></svg>)
const ProgressIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="3,17 8,12 13,15 21,7"/><polyline points="17,7 21,7 21,11"/></svg>)
const SettingsIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="2.5"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>)
const EditIcon     = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>)
const CheckIcon    = () => (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3,8 6.5,11.5 13,4.5"/></svg>)

// ─── Period Chip (inline compact badge) ──────────────────────────────────────
// Accepts an optional cachedInfo prop — when provided, skips the getPeriodInfo call entirely.
const PeriodChip = memo(function PeriodChip({ goal, logs, cachedInfo }) {
  const isStreak = goal.type === 'streak'
  const streak   = useMemo(() => isStreak ? calcStreak(goal.id, logs) : 0, [isStreak, goal.id, logs])
  // Use cachedInfo if caller already computed it, otherwise compute lazily
  const info = useMemo(() => {
    if (isStreak || !goal.timeframe || goal.timeframe === 'daily') return null
    return cachedInfo !== undefined ? cachedInfo : getPeriodInfo(goal, logs)
  }, [isStreak, goal, logs, cachedInfo])

  if (isStreak) {
    return streak > 0
      ? <span className="period-chip" style={{ color:'var(--gold)', borderColor:'var(--gold-d)' }}>🔥{streak}</span>
      : null
  }
  if (!info) return null

  const { completions, frequency, complete, behind, onTrack } = info
  const abbrev = TIMEFRAME_ABBREV[goal.timeframe] || goal.timeframe.slice(0,2).toUpperCase()
  const color  = complete ? 'var(--gold)' : behind ? 'var(--rust)' : onTrack ? 'var(--green)' : 'var(--dim)'

  return (
    <span className="period-chip" style={{ color, borderColor: complete?'var(--gold-d)': behind?'var(--rust)':'var(--border)' }}>
      {completions}/{frequency}<span className="period-chip-tf">{abbrev}</span>
    </span>
  )
})

// ─── Focus Screen ─────────────────────────────────────────────────────────────
function FocusScreen({ focus, timer, ready, reflection, onReflection, onProceed, reflectionEnabled }) {
  const today = useToday()
  const pct = ((12 - timer) / 12) * 100
  return (
    <div className="focus-screen fade-in">
      <div className="focus-bg-glow"/>
      <div className="focus-label">{parseLocalDate(today).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}).toUpperCase()}</div>
      <blockquote className="focus-quote">"{focus.quote}"</blockquote>
      <div className="focus-author">— {focus.author}</div>
      <div className="focus-divider"/>
      <p className="focus-interpretation">{focus.interpretation}</p>
      <p className="focus-prompt">{focus.prompt}</p>
      {reflectionEnabled && (
        <textarea className="focus-reflection" placeholder="One line. Your answer."
          value={reflection} onChange={e => onReflection(e.target.value)} maxLength={200}/>
      )}
      <div className="focus-timer">
        <div className="timer-track"><div className="timer-fill" style={{ width:`${pct}%` }}/></div>
        <span className="timer-count">{timer > 0 ? timer : ''}</span>
      </div>
      <button className="btn-proceed" disabled={!ready} onClick={onProceed}>
        {ready ? 'Proceed' : `${timer}s`}
      </button>
    </div>
  )
}

// ─── Goal Stats Modal ─────────────────────────────────────────────────────────
function GoalStatsModal({ goal, logs, onClose }) {
  const virtue = VIRTUES[goal.virtue] || VIRTUES.courage
  const stats  = useMemo(() => calcGoalStats(goal, logs), [goal, logs])
  const { completions, completionRate, currentStreak, bestStreak, daysSince, heatmap } = stats

  useEffect(() => {
    const p = document.body.style.overflow; document.body.style.overflow = 'hidden'
    const h = e => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', h)
    return () => { document.body.style.overflow = p; document.removeEventListener('keydown', h) }
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal stats-modal" onClick={e => e.stopPropagation()}>
        <div className="stats-virtue" style={{ color:virtue.color }}>{virtue.label.toUpperCase()}</div>
        <div className="stats-title">{goal.name}</div>
        <div className="stats-meta">{(goal.type||'binary').toUpperCase()} · {(goal.timeframe||'daily').toUpperCase()}{goal.frequency>1?` · ${goal.frequency}×`:''}</div>

        <div className="stats-grid">
          {[
            [completions,       'Completions'],
            [`${completionRate}%`, 'Rate'],
            [currentStreak,     'Streak'],
            [bestStreak,        'Best'],
          ].map(([v,l]) => (
            <div key={l} className="stat-item">
              <div className="stat-value" style={{ color:virtue.color }}>{v}</div>
              <div className="stat-label">{l}</div>
            </div>
          ))}
        </div>

        <div className="stats-heatmap-label">Last 28 Days</div>
        <div className="stats-heatmap">
          {heatmap.map(({date,done}) => (
            <div key={date} className={`heatmap-cell ${done?'done':''}`}
              title={date} style={done?{background:virtue.color}:{}}/>
          ))}
        </div>

        {goal.createdAt && (
          <div className="stats-footnote">Tracking since {goal.createdAt} · {daysSince} days</div>
        )}
        <button className="btn-cancel" style={{ width:'100%', marginTop:16 }} onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

// ─── Log Tab ──────────────────────────────────────────────────────────────────
function LogTab({ goals, logs, onLog, trials, onLogTrial }) {
  // Always compute today locally — never trust a prop that may be one render stale
  const today     = useToday()
  const todayLogs = useMemo(() => logs[today] || {}, [logs, today])
  const weekDates = useMemo(() => getWeekDates(), [today])
  const [animIds, setAnimIds] = useState([])

  const score = useMemo(() => calcWeeklyScore(goals, logs), [goals, logs])
  const tier  = useMemo(() => getTier(score), [score])

  const weekRange = useMemo(() => {
    const fmt = d => parseLocalDate(d).toLocaleDateString('en-GB',{day:'numeric',month:'short'}).toUpperCase()
    return `${fmt(weekDates[0])} – ${fmt(weekDates[6])}`
  }, [weekDates])

  const daily    = useMemo(() => goals.filter(g => !g.timeframe || g.timeframe === 'daily' || g.timeframe === 'weekly'), [goals])
  const longTerm = useMemo(() => goals.filter(g => g.timeframe && g.timeframe !== 'daily' && g.timeframe !== 'weekly'), [goals])

  // Change 9: group long-term by virtue
  const longTermByVirtue = useMemo(() => Object.keys(VIRTUES).reduce((acc, v) => {
    const vg = longTerm.filter(g => g.virtue === v); if (vg.length) acc[v] = vg; return acc
  }, {}), [longTerm])

  const hasLongTermGoals = longTerm.length > 0
  const hasOnlyLongTerm  = goals.length > 0 && daily.length === 0

  const doneCount = useMemo(() =>
    daily.filter(g => {
      const val = todayLogs[g.id]
      return g.type==='quantitative' ? (val&&parseFloat(val)>=parseFloat(g.target_value||1)) : (val===1||val===true)
    }).length, [daily, todayLogs])

  // Fix 4 & 9: lock the sort order at session start (when today or daily changes).
  // Do NOT re-sort when todayLogs changes — goals jumping around mid-session breaks muscle memory.
  const sessionOrder = useRef({})
  const sortedDaily = useMemo(() => {
    // Capture initial done-state for sorting purposes
    const snapshot = logs[todayStr()] || {}
    const sorted = [...daily].sort((a, b) => {
      const ad = snapshot[a.id]===1||snapshot[a.id]===true
      const bd = snapshot[b.id]===1||snapshot[b.id]===true
      return ad===bd ? 0 : ad ? 1 : -1
    })
    // Store stable index so render can preserve order even after tapping
    sorted.forEach((g, i) => { sessionOrder.current[g.id] = i })
    return sorted
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daily])  // ← intentionally omits todayLogs so order never changes mid-session

  const tap = useCallback((goalId) => {
    // Use todayStr() directly here — avoids any stale closure on today
    const cur = (logs[todayStr()]||{})[goalId]
    onLog(goalId, cur ? 0 : 1)
    setAnimIds(p => [...p, goalId])
    setTimeout(() => setAnimIds(p => p.filter(x => x !== goalId)), 300)
  }, [logs, onLog])

  const activeTrials = useMemo(() => trials.filter(t => {
    if (t.completed||t.expired) return false
    const ch = CHALLENGES.find(c=>c.id===t.challengeId)
    return ch && today <= trialEndDate(t, ch)
  }), [trials, today])

  // Fix 8: GoalItem extracted so it can receive pre-computed period info
  // This avoids getPeriodInfo being called twice (once here, once in PeriodChip)
  const GoalItem = useCallback(({ goal }) => {
    const virtue = VIRTUES[goal.virtue] || VIRTUES.courage
    const logged = todayLogs[goal.id]
    const isAnim = animIds.includes(goal.id)

    // Compute period info once — pass down to both the border class and the chip
    const hasPeriod = !!(goal.timeframe && goal.timeframe !== 'daily')
    const periodInfo = useMemo(
      () => hasPeriod ? getPeriodInfo(goal, logs) : null,
      [goal, logs, hasPeriod]
    )
    const periodComplete = periodInfo?.complete ?? false

    return (
      <div key={goal.id} className={`goal-item ${logged?'logged':''} ${periodComplete?'period-complete':''}`}
        onClick={() => goal.type !== 'quantitative' && tap(goal.id)}>
        <div className="goal-virtue-dot" style={{ background:virtue.color }}/>
        <div className="goal-info">
          <div className="goal-name">{goal.name}</div>
          <div className="goal-meta">
            {virtue.label.toUpperCase()} · {(goal.type||'binary').toUpperCase()}
            {goal.type==='quantitative'&&goal.target_value ? ` · ${goal.target_value}${goal.unit?' '+goal.unit:''}` : ''}
            {goal.frequency>1 && goal.timeframe!=='daily' ? ` · ${goal.frequency}× ${timeframeNoun(goal.timeframe).toUpperCase()}` : ''}
          </div>
        </div>
        {/* Pass pre-computed info to chip — no second getPeriodInfo call */}
        <PeriodChip goal={goal} logs={logs} cachedInfo={periodInfo}/>
        {goal.type === 'quantitative' ? (
          <input className="quant-input" type="number" inputMode="decimal" min="0"
            placeholder="0" value={logged||''} onClick={e=>e.stopPropagation()} onChange={e=>onLog(goal.id,e.target.value)}/>
        ) : (
          <div className={`goal-check ${logged?'checked':''} ${isAnim?'check-pop':''}`}>{logged?<CheckIcon/>:null}</div>
        )}
      </div>
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayLogs, animIds, logs, tap, onLog])

  const renderGoal = (goal) => <GoalItem key={goal.id} goal={goal}/>

  return (
    <div className="log-tab fade-in">
      {/* Score card — Change 10: date range at same size as label */}
      <div className="score-card">
        <div>
          <div className="score-label">WEEKLY PERFORMANCE · {weekRange}</div>
          <div className="score-value">{score}<span className="score-unit">/100</span></div>
          <span className="tier-badge" style={{ color:tier.color, borderColor:tier.color }}>{tier.label}</span>
          {hasLongTermGoals && <div className="score-subtitle">Daily &amp; weekly goals only</div>}
        </div>
        {/* Change 6: today dot gets ring style via CSS */}
        <div className="week-mini">
          {weekDates.map(d => {
            const dt    = parseLocalDate(d)
            const label = ['Su','Mo','Tu','We','Th','Fr','Sa'][dt.getDay()]
            const relevantGoals = goals.filter(g => !g.createdAt || g.createdAt <= d)
            const dLogs = logs[d]||{}
            const done  = relevantGoals.filter(g => {
              const v = dLogs[g.id]
              return g.type==='quantitative'?(v&&parseFloat(v)>=parseFloat(g.target_value||1)):(v===1||v===true)
            }).length
            const isFuture = d > today
            let cls = relevantGoals.length===0 ? 'streak-dot neutral' : 'streak-dot missed'
            if (isFuture) cls = 'streak-dot future'
            else if (relevantGoals.length>0 && done>=relevantGoals.length*0.5) cls = 'streak-dot done'
            return (
              <div key={d} className={`week-day ${d===today?'today':''}`}>
                <span className="week-day-label">{label}</span>
                <div className={cls}/>
              </div>
            )
          })}
        </div>
      </div>

      {/* Change 5: Period Progress card for long-term goals */}
      {hasLongTermGoals && (
        <div className="period-progress-card">
          <div className="score-label" style={{ marginBottom:8 }}>PERIOD PROGRESS</div>
          {longTerm.map(goal => {
            const info   = getPeriodInfo(goal, logs)
            const virtue = VIRTUES[goal.virtue]||VIRTUES.courage
            const color  = info.complete?'var(--gold)':info.behind?'var(--rust)':info.onTrack?'var(--green)':'var(--dim)'
            const abbrev = TIMEFRAME_ABBREV[goal.timeframe]||''
            return (
              <div key={goal.id} className="period-progress-row">
                <div className="goal-virtue-dot" style={{ background:virtue.color, marginTop:1, flexShrink:0 }}/>
                <span className="period-progress-name">{goal.name}</span>
                <span className="period-progress-stat" style={{ color }}>
                  {info.completions}/{info.frequency}{abbrev&&` ${abbrev}`} · {info.daysLeft}d
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className="section-header">
        <span className="section-title">Today · {today}</span>
        <span className="section-title" style={{ color:'var(--text)' }}>{doneCount}/{daily.length}</span>
      </div>

      {goals.length===0 ? (
        <div className="empty-state"><p>No goals defined.</p><p>Add goals in the Goals tab.</p></div>
      ) : sortedDaily.map(renderGoal)}

      {/* Change 9: long-term goals grouped by virtue with colour */}
      {Object.entries(longTermByVirtue).map(([key, vGoals]) => {
        const virtue = VIRTUES[key]
        return (
          <div key={key}>
            <div className="section-header" style={{ marginTop:24 }}>
              <span className="section-title" style={{ color:virtue.color }}>{virtue.label} · Long-term</span>
            </div>
            {vGoals.map(renderGoal)}
          </div>
        )
      })}

      {activeTrials.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop:24 }}>
            <span className="section-title">Active Trials</span>
            <span className="section-title">{activeTrials.length}</span>
          </div>
          {activeTrials.map(trial => {
            const ch = CHALLENGES.find(c=>c.id===trial.challengeId); if (!ch) return null
            const virtue   = VIRTUES[ch.virtue]||VIRTUES.courage
            const logged   = !!(trial.dailyLogs||{})[today]
            const daysDone = Object.keys(trial.dailyLogs||{}).length
            const isFinalDay = isTrialFinalDay(trial, ch)
            return (
              <div key={trial.id} className={`goal-item ${logged?'logged':''}`} onClick={()=>onLogTrial(trial.id)}>
                <div className="goal-virtue-dot" style={{ background:virtue.color }}/>
                <div className="goal-info">
                  <div className="goal-name-row">
                    <span className="goal-name">{ch.title}</span>
                    {isFinalDay && <span className="final-day-badge" style={{ color:virtue.color, borderColor:virtue.color }}>FINAL DAY</span>}
                  </div>
                  <div className="goal-meta">{virtue.label.toUpperCase()} · TRIAL · {daysDone}/{ch.duration} DAYS</div>
                </div>
                <span className="period-chip" style={{ color:virtue.color, borderColor:virtue.dim }}>
                  {daysDone}/{ch.duration}<span className="period-chip-tf">D</span>
                </span>
                <div className={`goal-check ${logged?'checked':''}`}
                  style={logged?{background:virtue.color,borderColor:virtue.color}:{borderColor:virtue.color}}>
                  {logged?<CheckIcon/>:null}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

// ─── Goal Form (shared by Add and Edit) ───────────────────────────────────────
function GoalForm({ initial, onSave, onClose, existingNames, isEdit=false }) {
  const [form, setForm] = useState(initial)
  const [nameError, setNameError] = useState('')

  useEffect(() => {
    const p = document.body.style.overflow; document.body.style.overflow = 'hidden'
    const h = e => e.key==='Escape' && onClose()
    document.addEventListener('keydown', h)
    return () => { document.body.style.overflow = p; document.removeEventListener('keydown', h) }
  }, [onClose])

  const handleSave = () => {
    const trimmed = form.name.trim()
    if (!trimmed || !form.virtue) return
    const dupe = existingNames.filter(n => !isEdit || n !== initial.name)
      .some(n => n.toLowerCase() === trimmed.toLowerCase())
    if (dupe) { setNameError('A goal with this name already exists.'); return }
    onSave({ ...form, name: trimmed })
  }

  const valid = form.name.trim() && form.virtue && !nameError
  const f = (k, v) => { setForm(p=>({...p,[k]:v})); if (k==='name') setNameError('') }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-title">{isEdit ? 'Edit Goal' : 'New Goal'}</div>

        <div className="form-group">
          <label className="form-label">Goal Name</label>
          <input className="form-input" placeholder="e.g. Gym session" value={form.name} onChange={e=>f('name',e.target.value)}/>
          {nameError && <div className="form-error">{nameError}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Virtue</label>
          <div className="virtue-grid">
            {Object.entries(VIRTUES).map(([key,v]) => (
              <button key={key} className={`virtue-btn ${form.virtue===key?'selected':''}`}
                style={form.virtue===key?{background:v.color,borderColor:v.color}:{borderColor:v.dim}}
                onClick={()=>f('virtue',key)}>
                <span>{v.label}</span><span className="virtue-btn-desc">{v.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-select" value={form.type} onChange={e=>f('type',e.target.value)}>
            <option value="binary">Binary (done / not done)</option>
            <option value="quantitative">Quantitative (numeric target)</option>
            <option value="streak">Streak (daily chain)</option>
          </select>
        </div>
        {form.type==='quantitative' && (
          <div className="form-group">
            <label className="form-label">Target Value</label>
            <div style={{ display:'flex', gap:8 }}>
              <input className="form-input" type="number" inputMode="decimal" min="0" placeholder="e.g. 10000"
                value={form.target_value} onChange={e=>f('target_value',e.target.value)} style={{ flex:2 }}/>
              <input className="form-input" placeholder="unit" value={form.unit} onChange={e=>f('unit',e.target.value)} style={{ flex:1 }}/>
            </div>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Timeframe</label>
          <select className="form-select" value={form.timeframe} onChange={e=>{ f('timeframe',e.target.value); f('frequency',1) }}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="fortnightly">Fortnightly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        {form.timeframe!=='daily' && (
          <div className="form-group">
            <label className="form-label">How many times per {timeframeNoun(form.timeframe)}?</label>
            <div className="stepper-row">
              <button className="stepper-btn" onClick={()=>f('frequency',Math.max(1,form.frequency-1))}>−</button>
              <span className="stepper-val">{form.frequency}</span>
              <button className="stepper-btn" onClick={()=>f('frequency',Math.min(99,form.frequency+1))}>+</button>
              <span className="stepper-label">time{form.frequency!==1?'s':''} per {timeframeNoun(form.timeframe)}</span>
            </div>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Importance (1 – 5)</label>
          <div className="weight-row">
            {[1,2,3,4,5].map(w=>(
              <button key={w} className={`weight-btn ${form.weight===w?'selected':''}`} onClick={()=>f('weight',w)}>{w}</button>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" disabled={!valid} onClick={handleSave}>{isEdit?'Save Changes':'Add Goal'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Goals Tab ────────────────────────────────────────────────────────────────
const GOAL_DEFAULTS = { name:'', type:'binary', virtue:'', timeframe:'daily', weight:2, target_value:'', unit:'', frequency:1 }

function GoalsTab({ goals, onUpdate, logs }) {
  const [showAdd,      setShowAdd]      = useState(false)
  const [editTarget,   setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [statsTarget,  setStatsTarget]  = useState(null)
  const [sort,         setSort]         = useState('default')

  const existingNames = useMemo(() => goals.map(g=>g.name), [goals])
  const atLimit = goals.length >= MAX_GOALS

  // Add goal
  const handleAdd = g => { onUpdate([...goals, {...g, id:uid(), createdAt:todayStr()}]); setShowAdd(false) }

  // Edit goal — keep same id and createdAt, update metadata only
  const handleEdit = updated => {
    onUpdate(goals.map(g => g.id===editTarget.id ? {...updated, id:g.id, createdAt:g.createdAt} : g))
    setEditTarget(null)
  }

  const confirmDelete = () => { onUpdate(goals.filter(g=>g.id!==deleteTarget.id)); setDeleteTarget(null) }

  const byVirtue = useMemo(() => Object.keys(VIRTUES).reduce((acc, v) => {
    let vg = goals.filter(g=>g.virtue===v)
    if (sort==='importance') vg=[...vg].sort((a,b)=>(b.weight||1)-(a.weight||1))
    if (sort==='alpha')      vg=[...vg].sort((a,b)=>a.name.localeCompare(b.name))
    acc[v]=vg; return acc
  }, {}), [goals, sort])

  return (
    <div className="goals-tab fade-in">
      <div className="goals-tab-header">
        {atLimit
          ? <div className="limit-banner">Maximum {MAX_GOALS} goals. Remove one to add another.</div>
          : <button className="btn-add" onClick={()=>setShowAdd(true)}>+ Add Goal</button>}
        <div className="sort-row">
          <span className="sort-label">Sort</span>
          {[['default','New'],['importance','Weight'],['alpha','A–Z']].map(([val,lbl])=>(
            <button key={val} className={`select-chip ${sort===val?'active':''}`} onClick={()=>setSort(val)}>{lbl}</button>
          ))}
        </div>
      </div>

      {goals.length===0 ? (
        <div className="empty-state"><p>No goals.</p><p>Add your first goal above.</p></div>
      ) : Object.entries(byVirtue).map(([key,vGoals]) => {
        if (!vGoals.length) return null
        const virtue = VIRTUES[key]
        return (
          <div key={key} style={{ marginBottom:24 }}>
            <div className="section-header">
              <span className="section-title" style={{ color:virtue.color }}>{virtue.label}</span>
              <span className="section-title virtue-desc-inline">{virtue.desc}</span>
            </div>
            {vGoals.map(goal => (
              <div key={goal.id} className="goal-manage-item">
                <div className="goal-virtue-dot" style={{ background:virtue.color }}/>
                <div className="goal-manage-info">
                  {/* Tap name to see stats */}
                  <div className="goal-name goal-name-tap" onClick={()=>setStatsTarget(goal)}>{goal.name}</div>
                  <div className="goal-meta">
                    {(goal.type||'binary').toUpperCase()} · {(goal.timeframe||'daily').toUpperCase()}
                    {goal.frequency>1?` · ${goal.frequency}×`:''} · WT {goal.weight}
                    {goal.type==='quantitative'&&goal.target_value?` · ${goal.target_value}${goal.unit?' '+goal.unit:''}` : ''}
                  </div>
                </div>
                {/* Edit button */}
                <button className="btn-icon" title="Edit goal" onClick={()=>setEditTarget(goal)}><EditIcon/></button>
                <button className="btn-delete" onClick={()=>setDeleteTarget({id:goal.id,name:goal.name})}>×</button>
              </div>
            ))}
          </div>
        )
      })}

      {showAdd && (
        <GoalForm initial={{...GOAL_DEFAULTS}} onSave={handleAdd} onClose={()=>setShowAdd(false)} existingNames={existingNames}/>
      )}
      {editTarget && (
        <GoalForm initial={{...editTarget}} onSave={handleEdit} onClose={()=>setEditTarget(null)}
          existingNames={existingNames} isEdit/>
      )}
      {deleteTarget && (
        <ConfirmModal title={`Delete "${deleteTarget.name}"?`} message="Log history remains. XP will be adjusted."
          confirmLabel="Delete" danger onConfirm={confirmDelete} onCancel={()=>setDeleteTarget(null)}/>
      )}
      {statsTarget && (
        <GoalStatsModal goal={statsTarget} logs={logs} onClose={()=>setStatsTarget(null)}/>
      )}
    </div>
  )
}

// ─── Trials Tab ───────────────────────────────────────────────────────────────
function TrialsTab({ trials, onStart, onAbandon, onDismissExpired }) {
  const today        = useToday()
  const [abandonTarget, setAbandonTarget] = useState(null)
  const activeIds    = useMemo(()=>new Set(trials.filter(t=>!t.completed&&!t.expired).map(t=>t.challengeId)),[trials])
  const completedIds = useMemo(()=>new Set(trials.filter(t=>t.completed).map(t=>t.challengeId)),[trials])
  const expiredTrials= useMemo(()=>trials.filter(t=>t.expired&&!t.dismissed),[trials])
  const byVirtue     = useMemo(()=>Object.keys(VIRTUES).reduce((acc,v)=>{acc[v]=CHALLENGES.filter(c=>c.virtue===v);return acc},{}),[])

  const getStatus = cid => {
    const t=trials.find(t=>t.challengeId===cid&&!t.completed&&!t.expired); if(!t) return null
    const ch=CHALLENGES.find(c=>c.id===cid)
    return ch?{trial:t,daysDone:Object.keys(t.dailyLogs||{}).length,todayDone:!!(t.dailyLogs||{})[today],ch}:null
  }

  return (
    <div className="trials-tab fade-in">
      {expiredTrials.length>0 && (
        <>
          <div className="section-header"><span className="section-title" style={{color:'var(--rust)'}}>Failed</span><span className="section-title">{expiredTrials.length}</span></div>
          {expiredTrials.map(trial=>{
            const ch=CHALLENGES.find(c=>c.id===trial.challengeId); if(!ch) return null
            const virtue=VIRTUES[ch.virtue]||VIRTUES.courage
            const daysDone=Object.keys(trial.dailyLogs||{}).length
            return (
              <div key={trial.id} className="trial-expired-card">
                <div className="trial-active-header">
                  <span className="trial-active-virtue" style={{color:'var(--rust)'}}>{virtue.label.toUpperCase()} · FAILED</span>
                  <span className="trial-active-days" style={{color:'var(--rust)'}}>{daysDone}/{ch.duration} DAYS</span>
                </div>
                <div className="trial-active-title" style={{opacity:.7}}>{ch.title}</div>
                <div className="period-bar-track" style={{margin:'8px 0'}}><div className="period-bar-fill" style={{width:`${(daysDone/ch.duration)*100}%`,background:'var(--rust)'}}/></div>
                <div className="trial-active-footer">
                  <span style={{fontFamily:'var(--font-mono)',fontSize:'var(--fs-xs)',color:'var(--dim)',letterSpacing:'.08em'}}>Started {trial.startDate}</span>
                  <button className="trial-abandon-btn" onClick={()=>onDismissExpired(trial.id)}>DISMISS</button>
                </div>
              </div>
            )
          })}
          <div style={{height:8}}/>
        </>
      )}

      {trials.filter(t=>!t.completed&&!t.expired).length>0 && (
        <>
          <div className="section-header"><span className="section-title">In Progress</span><span className="section-title" style={{color:'var(--text)'}}>{trials.filter(t=>!t.completed&&!t.expired).length}</span></div>
          {trials.filter(t=>!t.completed&&!t.expired).map(trial=>{
            const ch=CHALLENGES.find(c=>c.id===trial.challengeId); if(!ch) return null
            const virtue=VIRTUES[ch.virtue]||VIRTUES.courage
            const daysDone=Object.keys(trial.dailyLogs||{}).length
            const todayDone=!!(trial.dailyLogs||{})[today]
            const isFinalDay=isTrialFinalDay(trial,ch)
            return (
              <div key={trial.id} className={`trial-active-card ${isFinalDay?'final-day':''}`}>
                <div className="trial-active-header">
                  <span className="trial-active-virtue" style={{color:virtue.color}}>{virtue.label.toUpperCase()}</span>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    {isFinalDay&&<span className="final-day-badge" style={{color:virtue.color,borderColor:virtue.color}}>FINAL DAY</span>}
                    <span className="trial-active-days">{daysDone}/{ch.duration} DAYS</span>
                  </div>
                </div>
                <div className="trial-active-title">{ch.title}</div>
                <div className="trial-active-completion">{ch.completion}</div>
                <div className="period-bar-track" style={{margin:'8px 0'}}><div className="period-bar-fill" style={{width:`${(daysDone/ch.duration)*100}%`,background:virtue.color}}/></div>
                <div className="trial-active-footer">
                  <span className={`trial-today-status ${todayDone?'done':''}`}>{todayDone?'✓ LOGGED TODAY':'— NOT YET'}</span>
                  <button className="trial-abandon-btn" onClick={()=>setAbandonTarget({id:trial.id,name:ch.title})}>ABANDON</button>
                </div>
              </div>
            )
          })}
          <div style={{height:8}}/>
        </>
      )}

      {Object.entries(byVirtue).map(([key,challenges])=>{
        const virtue=VIRTUES[key]
        return (
          <div key={key} style={{marginBottom:28}}>
            <div className="section-header">
              <span className="section-title" style={{color:virtue.color}}>{virtue.label}</span>
              <span className="section-title virtue-desc-inline">{virtue.desc}</span>
            </div>
            {challenges.map(ch=>{
              const isActive=activeIds.has(ch.id), isDone=completedIds.has(ch.id), status=getStatus(ch.id)
              return (
                <div key={ch.id} className={`trial-card ${isActive?'active':''} ${isDone?'completed':''}`}>
                  <div className="trial-card-header"><span className="trial-card-title">{ch.title}</span><span className="trial-card-duration" style={{color:virtue.color}}>{ch.duration}D</span></div>
                  <div className="trial-card-desc">{ch.description}</div>
                  <div className="trial-card-constraint"><span className="trial-label">CONSTRAINT</span> {ch.constraint}</div>
                  <div className="trial-card-completion"><span className="trial-label">DONE WHEN</span> {ch.completion}</div>
                  {isActive&&status?(<div className="trial-card-progress"><div className="period-bar-track"><div className="period-bar-fill" style={{width:`${(status.daysDone/ch.duration)*100}%`,background:virtue.color}}/></div><span style={{color:virtue.color,fontSize:'var(--fs-xs)',letterSpacing:'.1em'}}>DAY {status.daysDone}/{ch.duration}</span></div>)
                  :isDone?(<div className="trial-completed-badge">COMPLETED</div>)
                  :(<button className="trial-begin-btn" style={{borderColor:virtue.dim,color:virtue.color}} onClick={()=>onStart(ch.id)}>BEGIN TRIAL</button>)}
                </div>
              )
            })}
          </div>
        )
      })}

      {abandonTarget&&(
        <ConfirmModal title={`Abandon "${abandonTarget.name}"?`} message="Progress will be lost."
          confirmLabel="Abandon" danger
          onConfirm={()=>{onAbandon(abandonTarget.id);setAbandonTarget(null)}}
          onCancel={()=>setAbandonTarget(null)}/>
      )}
    </div>
  )
}

// ─── Virtue Tree ──────────────────────────────────────────────────────────────
function VirtueTree({ virtue, xp, goals, logs }) {
  const today       = useToday()
  const {current,next,progress} = useMemo(()=>getVirtueLevel(xp),[xp])
  const v         = VIRTUES[virtue]
  const related   = useMemo(()=>goals.filter(g=>g.virtue===virtue),[goals,virtue])
  const todayLogs = useMemo(()=>logs[today]||{},[logs,today])
  const doneToday = useMemo(()=>related.filter(g=>{
    const val=todayLogs[g.id]; return g.type==='quantitative'?(val&&parseFloat(val)>=parseFloat(g.target_value||1)):(val===1||val===true)
  }).length,[related,todayLogs])

  return (
    <div className="virtue-tree-card" style={{borderColor:xp>0?v.dim:'var(--border)'}}>
      <div className="virtue-tree-header">
        <div><span className="virtue-tree-name" style={{color:v.color}}>{v.label}</span><div className="virtue-tree-desc">{v.desc}</div></div>
        <span style={{marginLeft:'auto',fontSize:'var(--fs-xs)',color:'var(--dim)',letterSpacing:'.08em',textAlign:'right'}}>
          {related.length>0?`${doneToday}/${related.length} today`:'no goals'}
        </span>
      </div>
      <div style={{display:'flex',alignItems:'flex-end',gap:12,marginBottom:8}}>
        <span className="virtue-tree-level" style={{color:xp>0?v.color:'var(--dim)'}}>{current.level}</span>
        <div style={{flex:1}}>
          <div className="virtue-tree-title">{current.title}</div>
          <div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`,background:v.color}}/></div>
          <div className="progress-meta"><span>{xp} XP</span>{next?<span>→ {next.title} · {next.threshold}</span>:<span>Mastery</span>}</div>
        </div>
      </div>
      <div className="level-nodes">
        {VIRTUE_LEVELS.map(lvl=>(
          <div key={lvl.level} className={`level-node ${lvl.level<=current.level?'reached':''}`}
            title={`Level ${lvl.level}: ${lvl.title}`}
            style={lvl.level<=current.level?{background:v.color,borderColor:v.color}:lvl.level===current.level+1?{borderColor:v.dim}:{}}/>
        ))}
      </div>
    </div>
  )
}

// ─── Progress Tab ─────────────────────────────────────────────────────────────
function ProgressTab({ goals, logs, virtueXP, trials }) {
  const today   = useToday()
  const score   = useMemo(()=>calcWeeklyScore(goals,logs),[goals,logs])
  const tier    = useMemo(()=>getTier(score),[score])
  const week    = useMemo(()=>getWeekDates(),[today])
  const totalXP = Object.values(virtueXP).reduce((a,b)=>a+b,0)
  const dayNames= ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

  const weekRange = useMemo(()=>{
    const fmt=d=>parseLocalDate(d).toLocaleDateString('en-GB',{day:'numeric',month:'short'}).toUpperCase()
    return `${fmt(week[0])} – ${fmt(week[6])}`
  },[week])

  // Change 3: 0 → —
  const dayScores = useMemo(()=>week.map(date=>{
    if (date>today||!goals.length) return null
    let total=0,earned=0
    goals.forEach(g=>{
      if(g.timeframe&&!['daily','weekly',undefined,''].includes(g.timeframe)) return
      if(g.createdAt&&date<g.createdAt) return
      const w=g.weight||1; total+=w
      const val=(logs[date]||{})[g.id]
      if(g.type==='quantitative'){const tv=parseFloat(g.target_value||1),v=parseFloat(val);if(!isNaN(v)&&v>0)earned+=v>=tv?w:w*(v/tv)}
      else{if(val===1||val===true)earned+=w}
    })
    return total>0?Math.round((earned/total)*100):0
  }),[week,today,goals,logs])

  const completedTrials = useMemo(()=>trials.filter(t=>t.completed),[trials])
  const completedByVirtue = useMemo(()=>Object.keys(VIRTUES).reduce((acc,v)=>{
    acc[v]=completedTrials.filter(t=>{const ch=CHALLENGES.find(c=>c.id===t.challengeId);return ch?.virtue===v}); return acc
  },{}), [completedTrials])

  const hasLongTerm = goals.some(g=>g.timeframe&&!['daily','weekly',undefined,''].includes(g.timeframe))

  return (
    <div className="progress-tab fade-in">
      <div className="score-card">
        <div>
          <div className="score-label">WEEKLY SCORE · {weekRange}</div>
          <div className="score-value">{score}<span className="score-unit">/100</span></div>
          <span className="tier-badge" style={{color:tier.color,borderColor:tier.color}}>{tier.label}</span>
          {hasLongTerm&&<div className="score-subtitle">Daily &amp; weekly goals only</div>}
        </div>
        <div style={{textAlign:'right'}}>
          <div className="score-label">TOTAL XP</div>
          <div style={{fontFamily:'var(--font-display)',fontSize:'var(--fs-xl)',fontWeight:300,color:'var(--gold)'}}>{totalXP}</div>
        </div>
      </div>

      <div className="section-header" style={{marginTop:4,marginBottom:8}}><span className="section-title">This Week</span></div>
      <div className="week-grid">
        {week.map((d,i)=>{
          const s=dayScores[i],isFuture=d>today,isToday=d===today
          const dt=parseLocalDate(d),di=dt.getDay()
          return (
            <div key={d} className={`week-cell ${isToday?'today':''}`}>
              <span className="day-label">{dayNames[di===0?6:di-1]}</span>
              {/* Change 3: show — for 0, not "0" */}
              {!isFuture&&s!==null
                ?<span className="day-score" style={{color:s>=70?'var(--gold)':s>=40?'var(--text)':s>0?'var(--dim)':'var(--border)'}}>
                    {s===0?'—':s}
                  </span>
                :<span className="day-score" style={{color:'var(--border)'}}>—</span>}
            </div>
          )
        })}
      </div>

      <div className="section-header" style={{marginTop:24}}><span className="section-title">Virtue Progression</span></div>
      {Object.keys(VIRTUES).map(v=>(
        <VirtueTree key={v} virtue={v} xp={virtueXP[v]||0} goals={goals} logs={logs}/>
      ))}

      {completedTrials.length>0&&(
        <>
          <div className="section-header" style={{marginTop:24}}>
            <span className="section-title">Trial History</span>
            <span className="section-title" style={{color:'var(--gold)'}}>{completedTrials.length} COMPLETED</span>
          </div>
          {Object.entries(completedByVirtue).map(([key,cTrials])=>{
            if(!cTrials.length) return null
            const virtue=VIRTUES[key]
            return (
              <div key={key} style={{marginBottom:16}}>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'var(--fs-xs)',letterSpacing:'.22em',color:virtue.color,textTransform:'uppercase',marginBottom:6}}>{virtue.label}</div>
                {cTrials.map(trial=>{
                  const ch=CHALLENGES.find(c=>c.id===trial.challengeId); if(!ch) return null
                  const xpEarned=Object.keys(trial.dailyLogs||{}).length*TRIAL_DAY_XP+ch.duration*10
                  return (
                    <div key={trial.id} className="trial-history-item">
                      <div className="goal-virtue-dot" style={{background:virtue.color,marginTop:3}}/>
                      <div style={{flex:1}}>
                        <div className="goal-name">{ch.title}</div>
                        <div className="goal-meta">{ch.duration}D TRIAL{trial.completedAt?` · ${trial.completedAt}`:''}</div>
                      </div>
                      <span style={{fontFamily:'var(--font-mono)',fontSize:'var(--fs-xs)',color:virtue.color,letterSpacing:'.1em',whiteSpace:'nowrap'}}>+{xpEarned} XP</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab({ settings, onUpdate }) {
  const [resetConfirm,  setResetConfirm]  = useState(false)
  const [notifStatus,   setNotifStatus]   = useState(
    typeof Notification!=='undefined' ? Notification.permission : 'unsupported'
  )
  const set = (k,v) => onUpdate({...settings,[k]:v})

  const requestNotif = async () => {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setNotifStatus(perm)
    if (perm === 'granted') set('reminderEnabled', true)
  }

  // Export data
  const handleExport = () => {
    const data = {
      version:'1.3.0', exportDate:todayStr(),
      goals:storageGet('stoic-goals',[]), logs:storageGet('stoic-logs',{}),
      virtueXP:storageGet('stoic-virtue-xp',{}), trials:storageGet('stoic-trials',[]),
      settings:storageGet('stoic-settings',{}),
    }
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href=url; a.download=`stoic-backup-${todayStr()}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const fileRef = useRef(null)
  const handleImportFile = e => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = evt => {
      try {
        const d = JSON.parse(evt.target.result)
        if (d.goals)     storageSet('stoic-goals',d.goals)
        if (d.logs)      storageSet('stoic-logs',d.logs)
        if (d.virtueXP)  storageSet('stoic-virtue-xp',d.virtueXP)
        if (d.trials)    storageSet('stoic-trials',d.trials)
        if (d.settings)  storageSet('stoic-settings',d.settings)
        window.location.reload()
      } catch { alert('Invalid backup file.') }
    }
    reader.readAsText(file)
  }

  return (
    <div className="settings-tab fade-in">
      <div className="settings-section">
        <div className="settings-section-title">Appearance</div>
        <div className="settings-row">
          <span className="settings-label">Text Size</span>
          <div className="select-row">
            {['small','medium','large'].map(s=>(
              <button key={s} className={`select-chip ${settings.textSize===s?'active':''}`} onClick={()=>set('textSize',s)}>
                {s.charAt(0).toUpperCase()+s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Daily Focus</div>
        <div className="settings-row">
          <span className="settings-label">Reflection Input</span>
          <button className={`toggle ${settings.reflectionEnabled?'on':''}`} onClick={()=>set('reflectionEnabled',!settings.reflectionEnabled)}/>
        </div>
        <div className="settings-row">
          <span className="settings-label">Reopen Focus Screen</span>
          <button className="select-chip" onClick={()=>{storageSet('stoic-focus-date','');window.location.reload()}}>Reset</button>
        </div>
      </div>

      {/* Daily Reminder */}
      <div className="settings-section">
        <div className="settings-section-title">Notifications</div>
        {notifStatus==='unsupported' ? (
          <div className="settings-row"><span className="settings-label" style={{color:'var(--dim)'}}>Not supported on this device</span></div>
        ) : notifStatus!=='granted' ? (
          <div className="settings-row">
            <span className="settings-label">Daily Reminder</span>
            <button className="select-chip" onClick={requestNotif}>Enable</button>
          </div>
        ) : (
          <>
            <div className="settings-row">
              <span className="settings-label">Daily Reminder</span>
              <button className={`toggle ${settings.reminderEnabled?'on':''}`} onClick={()=>set('reminderEnabled',!settings.reminderEnabled)}/>
            </div>
            {settings.reminderEnabled && (
              <div className="settings-row">
                <span className="settings-label">Reminder Time</span>
                <input className="time-input" type="time" value={settings.reminderTime||'09:00'}
                  onChange={e=>set('reminderTime',e.target.value)}/>
              </div>
            )}
          </>
        )}
      </div>

      {/* Data */}
      <div className="settings-section">
        <div className="settings-section-title">Data</div>
        <div className="settings-row">
          <span className="settings-label">Export Backup</span>
          <button className="select-chip" onClick={handleExport}>Download</button>
        </div>
        <div className="settings-row">
          <span className="settings-label">Import Backup</span>
          <button className="select-chip" onClick={()=>fileRef.current?.click()}>Restore</button>
          <input ref={fileRef} type="file" accept=".json" style={{display:'none'}} onChange={handleImportFile}/>
        </div>
        <div className="settings-row">
          <span className="settings-label">Reset All Progress</span>
          <button className="select-chip" style={{color:'#b55',borderColor:'#b55'}} onClick={()=>setResetConfirm(true)}>Clear</button>
        </div>
      </div>

      <div className="app-version">STOIC · v1.4.0 · Performance &amp; Discipline</div>

      {resetConfirm&&(
        <ConfirmModal title="Reset All Data?" message="Goals, logs, XP, trials and settings will be deleted."
          confirmLabel="Reset Everything" danger
          onConfirm={()=>{
            ['stoic-goals','stoic-logs','stoic-virtue-xp','stoic-focus-date','stoic-trials','stoic-settings','stoic-last-reminder'].forEach(k=>storageRemove(k))
            window.location.reload()
          }}
          onCancel={()=>setResetConfirm(false)}/>
      )}
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────
const DEFAULTS = {
  goals:[], logs:{}, virtueXP:{courage:0,wisdom:0,temperance:0,justice:0},
  settings:{theme:'dark',textSize:'medium',reflectionEnabled:true,reminderEnabled:false,reminderTime:'09:00'},
  trials:[],
}

export default function App() {
  const today = useToday()  // Change 2: reactive — updates at midnight + visibilitychange

  const [screen,     setScreen]     = useState(null)  // Change 1: null → no flash
  const [activeTab,  setActiveTab]  = useState('log')
  const [goals,      setGoals]      = useState(DEFAULTS.goals)
  const [logs,       setLogs]       = useState(DEFAULTS.logs)
  const [virtueXP,   setVirtueXP]   = useState(DEFAULTS.virtueXP)
  const [settings,   setSettings]   = useState(DEFAULTS.settings)
  const [trials,     setTrials]     = useState(DEFAULTS.trials)
  const [focusTimer, setFocusTimer] = useState(12)
  const [focusReady, setFocusReady] = useState(false)
  const [reflection, setReflection] = useState('')
  const [focusIdx,   setFocusIdx]   = useState(0)
  const [storageWarn,setStorageWarn]= useState(false)

  const logsRef   = useRef(logs); const goalsRef  = useRef(goals)
  const xpRef     = useRef(virtueXP); const trialsRef = useRef(trials)
  useEffect(()=>{logsRef.current=logs},[logs])
  useEffect(()=>{goalsRef.current=goals},[goals])
  useEffect(()=>{xpRef.current=virtueXP},[virtueXP])
  useEffect(()=>{trialsRef.current=trials},[trials])

  const focusStartRef = useRef(null)

  useEffect(()=>{
    const g  = storageGet('stoic-goals',   DEFAULTS.goals)
    const raw= storageGet('stoic-logs',    DEFAULTS.logs)
    const fd = storageGet('stoic-focus-date','')
    const s  = {...DEFAULTS.settings,...storageGet('stoic-settings',{})}
    const tr = storageGet('stoic-trials',  DEFAULTS.trials)||[]

    const l = pruneOldLogs(raw)
    if (Object.keys(l).length!==Object.keys(raw).length) storageSet('stoic-logs',l)

    const t2 = tr.map(trial=>{
      if(trial.completed||trial.expired) return trial
      const ch=CHALLENGES.find(c=>c.id===trial.challengeId); if(!ch) return trial
      if(today>trialEndDate(trial,ch)) return {...trial,expired:true}
      return trial
    })
    const expiredChanged = t2.some((t,i)=>t.expired!==tr[i]?.expired)
    if(expiredChanged) storageSet('stoic-trials',t2)

    const xp = recalcAllXP(g,l,t2)
    setGoals(g); setLogs(l); setVirtueXP(xp); setSettings(s); setTrials(t2)

    const epoch=new Date(2026,0,1).getTime()
    const now=new Date(); now.setHours(0,0,0,0)
    const days=Math.floor((now-epoch)/86400000)
    setFocusIdx(((days%STOIC_CONTENT.length)+STOIC_CONTENT.length)%STOIC_CONTENT.length)

    const isFocusDone = fd===today
    setScreen(isFocusDone?'main':'focus')
    if (!isFocusDone) focusStartRef.current=Date.now()
  },[])

  // Change 8: wall-clock interval timer
  useEffect(()=>{
    if(screen!=='focus') return
    if(!focusStartRef.current) focusStartRef.current=Date.now()
    const tick=()=>{
      const rem=Math.max(0,12-Math.floor((Date.now()-focusStartRef.current)/1000))
      setFocusTimer(rem); if(rem<=0) setFocusReady(true)
    }
    tick(); const id=setInterval(tick,250); return ()=>clearInterval(id)
  },[screen])

  useEffect(()=>{
    if(screen!=='focus') return
    const onVis=()=>{ if(document.visibilityState==='visible'&&focusStartRef.current){ const rem=Math.max(0,12-Math.floor((Date.now()-focusStartRef.current)/1000)); setFocusTimer(rem); if(rem<=0) setFocusReady(true) } }
    document.addEventListener('visibilitychange',onVis)
    return ()=>document.removeEventListener('visibilitychange',onVis)
  },[screen])

  // Fix 2: reminder lives in root so it fires regardless of which tab is open
  useEffect(() => {
    if (!settings.reminderEnabled) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const checkReminder = () => {
      const todayKey = todayStr()
      const lastShown = storageGet('stoic-last-reminder', '')
      if (lastShown === todayKey) return
      const [h, m] = (settings.reminderTime || '09:00').split(':').map(Number)
      const now = new Date(), due = new Date()
      due.setHours(h, m, 0, 0)
      if (now >= due) {
        new Notification('STOIC', { body: 'Log your goals. Maintain the standard.', icon: '/icons/icon-192.png' })
        storageSet('stoic-last-reminder', todayKey)
      }
    }
    checkReminder()
    // Re-check on visibility restore — user may open app after reminder time
    const onVis = () => { if (document.visibilityState === 'visible') checkReminder() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [settings.reminderEnabled, settings.reminderTime])

  const handleProceed = useCallback(()=>{ storageSet('stoic-focus-date',today); setScreen('main') },[today])

  const updateGoals = useCallback(ng=>{
    setGoals(ng); storageSet('stoic-goals',ng)
    const newXP=recalcAllXP(ng,logsRef.current,trialsRef.current)
    setVirtueXP(newXP); storageSet('stoic-virtue-xp',newXP)
  },[])

  const logGoal = useCallback((goalId,value)=>{
    const today_=todayStr(),logs_=logsRef.current,goals_=goalsRef.current,xp_=xpRef.current
    const prev=(logs_[today_]||{})[goalId]
    const newLogs={...logs_,[today_]:{...(logs_[today_]||{}),[goalId]:value}}
    setLogs(newLogs)
    const r=storageSet('stoic-logs',newLogs); if(r==='QUOTA_EXCEEDED') setStorageWarn(true)
    const g_=goals_.find(g=>g.id===goalId), d=xpDelta(g_,prev,value)
    if(d){ const nx={...xp_,[d.virtue]:Math.max(0,(xp_[d.virtue]||0)+d.delta)}; setVirtueXP(nx); storageSet('stoic-virtue-xp',nx) }
  },[])

  const updateSettings = useCallback(ns=>{ setSettings(ns); storageSet('stoic-settings',ns) },[])

  const startTrial = useCallback(challengeId=>{
    const tr=trialsRef.current
    if(tr.some(t=>t.challengeId===challengeId&&!t.completed&&!t.expired)) return
    const nt=[...tr,{id:uid(),challengeId,startDate:todayStr(),dailyLogs:{},completed:false,expired:false}]
    setTrials(nt); storageSet('stoic-trials',nt)
  },[])

  const logTrial = useCallback(trialId=>{
    const today_=todayStr(),tr=trialsRef.current,xp=xpRef.current
    const trial=tr.find(t=>t.id===trialId); if(!trial) return
    const ch=CHALLENGES.find(c=>c.id===trial.challengeId); if(!ch) return
    const already=!!(trial.dailyLogs||{})[today_]
    const newDL=already?Object.fromEntries(Object.entries(trial.dailyLogs).filter(([d])=>d!==today_)):{...(trial.dailyLogs||{}),[today_]:true}
    const daysDone=Object.keys(newDL).length, completed=daysDone>=ch.duration
    const completedAt=completed&&!trial.completedAt?today_:trial.completedAt
    const nt=tr.map(t=>t.id===trialId?{...t,dailyLogs:newDL,completed,...(completedAt?{completedAt}:{})}:t)
    setTrials(nt); storageSet('stoic-trials',nt)
    const v=ch.virtue
    if(!already){ const bonus=completed?ch.duration*10:0; const nx={...xp,[v]:(xp[v]||0)+TRIAL_DAY_XP+bonus}; setVirtueXP(nx); storageSet('stoic-virtue-xp',nx) }
    else{ const nx={...xp,[v]:Math.max(0,(xp[v]||0)-TRIAL_DAY_XP)}; setVirtueXP(nx); storageSet('stoic-virtue-xp',nx) }
  },[])

  const abandonTrial = useCallback(trialId=>{
    const tr=trialsRef.current, trial=tr.find(t=>t.id===trialId)
    if(trial){ const ch=CHALLENGES.find(c=>c.id===trial.challengeId)
      if(ch){ const days=Object.keys(trial.dailyLogs||{}).length, xp=xpRef.current
        const nx={...xp,[ch.virtue]:Math.max(0,(xp[ch.virtue]||0)-days*TRIAL_DAY_XP)}
        setVirtueXP(nx); storageSet('stoic-virtue-xp',nx) } }
    const nt=tr.filter(t=>t.id!==trialId); setTrials(nt); storageSet('stoic-trials',nt)
  },[])

  const dismissExpired = useCallback(trialId=>{
    const tr=trialsRef.current
    const nt=tr.map(t=>t.id===trialId?{...t,dismissed:true}:t)
    setTrials(nt); storageSet('stoic-trials',nt)
  },[])

  // Change 7: nav badge computation
  const trialBadge = useMemo(()=>{
    const hasExpired = trials.some(t=>t.expired&&!t.dismissed)
    const hasFinal   = trials.some(t=>{
      if(t.completed||t.expired) return false
      const ch=CHALLENGES.find(c=>c.id===t.challengeId)
      return ch && isTrialFinalDay(t,ch)
    })
    if(hasExpired) return 'rust'; if(hasFinal) return 'gold'; return null
  },[trials])

  if (screen===null) return <div style={{background:'#080808',height:'100dvh'}}/>

  const TABS=[
    {id:'log',      label:'Log',      Icon:LogIcon},
    {id:'goals',    label:'Goals',    Icon:GoalsIcon},
    {id:'trials',   label:'Trials',   Icon:TrialsIcon,  badge:trialBadge},
    {id:'progress', label:'Progress', Icon:ProgressIcon},
    {id:'settings', label:'Settings', Icon:SettingsIcon},
  ]

  return (
    <ErrorBoundary>
      <div style={{height:'100dvh'}} data-size={settings.textSize}>
        {storageWarn&&(
          <div className="storage-warning">
            <span>Storage full. Export &amp; clear in Settings.</span>
            <button onClick={()=>setStorageWarn(false)}>×</button>
          </div>
        )}
        {screen==='focus'?(
          <FocusScreen focus={STOIC_CONTENT[focusIdx]} timer={focusTimer} ready={focusReady}
            reflection={reflection} onReflection={setReflection}
            onProceed={handleProceed} reflectionEnabled={settings.reflectionEnabled}/>
        ):(
          <div className="main-app">
            <header className="app-header">
              <span className="app-logo">STOIC</span>
              <span className="app-date">{parseLocalDate(today).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}).toUpperCase()}</span>
            </header>
            <div className="tab-content">
              <div className={`tab-panel ${activeTab==='log'?'active':''}`}>
                <LogTab goals={goals} logs={logs} onLog={logGoal} trials={trials} onLogTrial={logTrial}/>
              </div>
              <div className={`tab-panel ${activeTab==='goals'?'active':''}`}>
                <GoalsTab goals={goals} onUpdate={updateGoals} logs={logs}/>
              </div>
              <div className={`tab-panel ${activeTab==='trials'?'active':''}`}>
                <TrialsTab trials={trials} onStart={startTrial} onAbandon={abandonTrial} onDismissExpired={dismissExpired}/>
              </div>
              <div className={`tab-panel ${activeTab==='progress'?'active':''}`}>
                <ProgressTab goals={goals} logs={logs} virtueXP={virtueXP} trials={trials}/>
              </div>
              <div className={`tab-panel ${activeTab==='settings'?'active':''}`}>
                <SettingsTab settings={settings} onUpdate={updateSettings}/>
              </div>
            </div>
            <nav className="bottom-nav">
              {TABS.map(({id,label,Icon,badge})=>(
                <button key={id} className={`nav-item ${activeTab===id?'active':''}`} onClick={()=>setActiveTab(id)}>
                  <div className="nav-icon-wrap">
                    <Icon/>
                    {/* Change 7: badge dot */}
                    {badge&&<div className="nav-badge" style={{background:`var(--${badge})`}}/>}
                  </div>
                  <span className="nav-label">{label}</span>
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}
