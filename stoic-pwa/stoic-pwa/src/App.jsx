import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
import './styles.css'
import { VIRTUES, STOIC_CONTENT, VIRTUE_LEVELS, CHALLENGES } from './constants.js'
import {
  todayStr, getWeekDates, getVirtueLevel, calcWeeklyScore, getTier, uid,
  recalcVirtueXP, xpDelta, calcStreak, getPeriodInfo, pruneOldLogs,
  parseLocalDate, localDateStr, timeframeNoun
} from './utils.js'
import { storageGet, storageSet } from './storage.js'

const MAX_GOALS = 20

// ─── Error Boundary ───────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ background:'#080808', height:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, color:'#e0d8cc', fontFamily:'monospace', textAlign:'center' }}>
        <div style={{ fontSize:10, letterSpacing:'.3em', color:'#5a4818', marginBottom:20 }}>SYSTEM ERROR</div>
        <div style={{ fontSize:13, color:'#55504a', letterSpacing:'.1em', lineHeight:2, marginBottom:32 }}>
          Something went wrong.<br/>Your data is safe.
        </div>
        <button onClick={() => window.location.reload()}
          style={{ background:'transparent', border:'1px solid #5a4818', color:'#c9a84c', fontFamily:'monospace', fontSize:11, letterSpacing:'.3em', padding:'12px 28px', cursor:'pointer' }}>
          RELOAD
        </button>
      </div>
    )
  }
}

// Need React class for ErrorBoundary
import React from 'react'

// ─── Confirm Modal (replaces window.confirm — blocked in iOS PWA) ─────────────

function ConfirmModal({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = e => e.key === 'Escape' && onCancel()
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [onCancel])
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="confirm-title">{title}</div>
        {message && <div className="confirm-message">{message}</div>}
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button className={`btn-save${danger ? ' btn-danger' : ''}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const LogIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="4" width="18" height="16" rx="1"/>
    <line x1="7" y1="9" x2="17" y2="9"/><line x1="7" y1="13" x2="13" y2="13"/>
  </svg>
)
const GoalsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>
    <line x1="12" y1="3" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21"/>
  </svg>
)
const TrialsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 2L15 9H22L16.5 13.5L18.5 21L12 17L5.5 21L7.5 13.5L2 9H9L12 2Z"/>
  </svg>
)
const ProgressIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="3,17 8,12 13,15 21,7"/>
    <polyline points="17,7 21,7 21,11"/>
  </svg>
)
const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="2.5"/>
    <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
)
const CheckIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="3,8 6.5,11.5 13,4.5"/>
  </svg>
)

// ─── Period Indicator (memoised) ──────────────────────────────────────────────

const PeriodIndicator = memo(function PeriodIndicator({ goal, logs }) {
  const showPeriod = goal.timeframe && goal.timeframe !== 'daily'
  const showStreak = goal.type === 'streak'

  const streak = useMemo(
    () => showStreak ? calcStreak(goal.id, logs) : 0,
    [showStreak, goal.id, logs]
  )
  const info = useMemo(
    () => showPeriod ? getPeriodInfo(goal, logs) : null,
    [showPeriod, goal, logs]
  )

  if (!showPeriod && !showStreak) return null

  if (showStreak && !showPeriod) {
    return (
      <div className="period-row">
        <span className="period-streak" style={{ color: streak > 0 ? 'var(--gold)' : 'var(--dim)' }}>
          {streak > 0 ? `${streak} DAY STREAK` : 'NO STREAK YET'}
        </span>
      </div>
    )
  }
  if (!info) return null

  const { completions, frequency, needed, daysLeft, complete, behind, onTrack } = info
  const fillPct = Math.min(100, (completions / frequency) * 100)
  const statusColor = complete ? 'var(--gold)' : behind ? 'var(--rust)' : onTrack ? 'var(--green)' : 'var(--text-dim)'

  let statusText
  if (complete)    statusText = `${completions}/${frequency} · COMPLETE`
  else if (behind) statusText = `${completions}/${frequency} · ${needed} MORE · ⚠ ${daysLeft}D`
  else             statusText = `${completions}/${frequency} · ${needed} MORE · ${daysLeft}D LEFT`
  if (showStreak && streak > 0) statusText += ` · 🔥${streak}`

  return (
    <div className="period-row">
      <div className="period-bar-track">
        <div className="period-bar-fill" style={{ width: `${fillPct}%`, background: statusColor }} />
      </div>
      <span className="period-status" style={{ color: statusColor }}>{statusText}</span>
    </div>
  )
})

// ─── Focus Screen ─────────────────────────────────────────────────────────────

function FocusScreen({ focus, timer, ready, reflection, onReflection, onProceed, reflectionEnabled }) {
  const pct = ((12 - timer) / 12) * 100
  return (
    <div className="focus-screen fade-in">
      <div className="focus-bg-glow" />
      <div className="focus-label">
        Daily Focus · {new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' }).toUpperCase()}
      </div>
      <blockquote className="focus-quote">"{focus.quote}"</blockquote>
      <div className="focus-author">— {focus.author}</div>
      <div className="focus-divider" />
      <p className="focus-interpretation">{focus.interpretation}</p>
      <p className="focus-prompt">{focus.prompt}</p>
      {reflectionEnabled && (
        <textarea className="focus-reflection" placeholder="One line. Your answer."
          value={reflection} onChange={e => onReflection(e.target.value)} maxLength={200} />
      )}
      <div className="focus-timer">
        <div className="timer-track"><div className="timer-fill" style={{ width:`${pct}%` }} /></div>
        <span className="timer-count">{timer > 0 ? timer : ''}</span>
      </div>
      <button className="btn-proceed" disabled={!ready} onClick={onProceed}>
        {ready ? 'Proceed' : `${timer}s`}
      </button>
    </div>
  )
}

// ─── Log Tab ──────────────────────────────────────────────────────────────────

function LogTab({ goals, logs, onLog, trials, onLogTrial }) {
  const today     = todayStr()
  const todayLogs = logs[today] || {}
  const weekDates = getWeekDates()
  const [animIds, setAnimIds] = useState([])

  const score = useMemo(() => calcWeeklyScore(goals, logs), [goals, logs])
  const tier  = useMemo(() => getTier(score), [score])

  // Week date range label — e.g. "22 APR – 28 APR"
  const weekRange = useMemo(() => {
    const fmt = d => parseLocalDate(d).toLocaleDateString('en-GB', { day:'numeric', month:'short' }).toUpperCase()
    return `${fmt(weekDates[0])} – ${fmt(weekDates[6])}`
  }, [weekDates])

  const daily    = useMemo(() => goals.filter(g => !g.timeframe || g.timeframe === 'daily' || g.timeframe === 'weekly'), [goals])
  const longTerm = useMemo(() => goals.filter(g => g.timeframe && g.timeframe !== 'daily' && g.timeframe !== 'weekly'), [goals])

  const doneCount = useMemo(() =>
    daily.filter(g => {
      const val = todayLogs[g.id]
      return g.type === 'quantitative'
        ? (val && parseFloat(val) >= parseFloat(g.target_value || 1))
        : (val === 1 || val === true)
    }).length,
    [daily, todayLogs]
  )

  const tap = useCallback((goalId) => {
    const cur = (logs[today] || {})[goalId]
    onLog(goalId, cur ? 0 : 1)
    setAnimIds(p => [...p, goalId])
    setTimeout(() => setAnimIds(p => p.filter(x => x !== goalId)), 300)
  }, [logs, today, onLog])

  // Active trials for today
  const activeTrials = useMemo(() => {
    return trials.filter(t => {
      if (t.completed) return false
      const end = parseLocalDate(t.startDate)
      const ch  = CHALLENGES.find(c => c.id === t.challengeId)
      if (!ch) return false
      end.setDate(end.getDate() + ch.duration - 1)
      return today <= localDateStr(end)
    })
  }, [trials, today])

  const renderGoal = goal => {
    const virtue = VIRTUES[goal.virtue] || VIRTUES.courage
    const logged = todayLogs[goal.id]
    const isAnim = animIds.includes(goal.id)
    return (
      <div key={goal.id} className={`goal-item ${logged ? 'logged' : ''}`}
        onClick={() => goal.type !== 'quantitative' && tap(goal.id)}>
        <div className="goal-virtue-dot" style={{ background: virtue.color }} />
        <div className="goal-info">
          <div className="goal-name">{goal.name}</div>
          <div className="goal-meta">
            {virtue.label.toUpperCase()} · {(goal.type || 'binary').toUpperCase()}
            {goal.type === 'quantitative' && goal.target_value ? ` · ${goal.target_value}${goal.unit ? ' '+goal.unit : ''}` : ''}
            {goal.frequency > 1 ? ` · ${goal.frequency}×` : ''}
          </div>
          <PeriodIndicator goal={goal} logs={logs} />
        </div>
        {goal.type === 'quantitative' ? (
          <input className="quant-input" type="number" inputMode="decimal" min="0" placeholder="0"
            value={logged || ''} onClick={e => e.stopPropagation()} onChange={e => onLog(goal.id, e.target.value)} />
        ) : (
          <div className={`goal-check ${logged ? 'checked' : ''} ${isAnim ? 'check-pop' : ''}`}>
            {logged ? <CheckIcon /> : null}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="log-tab fade-in">
      {/* Score card with date range */}
      <div className="score-card">
        <div>
          <div className="score-label">Weekly Performance</div>
          <div className="score-range">{weekRange}</div>
          <div className="score-value">{score}<span className="score-unit">/100</span></div>
          <span className="tier-badge" style={{ color: tier.color, borderColor: tier.color }}>{tier.label}</span>
        </div>
        <div className="week-mini">
          {weekDates.map(d => {
            const dt    = parseLocalDate(d)
            const label = ['Su','Mo','Tu','We','Th','Fr','Sa'][dt.getDay()]
            const dLogs = logs[d] || {}
            const done  = goals.filter(g => {
              const v = dLogs[g.id]
              return g.type === 'quantitative' ? (v && parseFloat(v) >= parseFloat(g.target_value || 1)) : (v === 1 || v === true)
            }).length
            const isFuture = d > today
            let cls = 'streak-dot missed'
            if (isFuture) cls = 'streak-dot future'
            else if (done > 0 && goals.length > 0 && done >= goals.length * 0.5) cls = 'streak-dot done'
            return (
              <div key={d} className={`week-day ${d === today ? 'today' : ''}`}>
                <span className="week-day-label">{label}</span>
                <div className={cls} />
              </div>
            )
          })}
        </div>
      </div>

      <div className="section-header">
        <span className="section-title">Today · {today}</span>
        <span className="section-title" style={{ color:'var(--text)' }}>{doneCount}/{daily.length}</span>
      </div>

      {goals.length === 0 ? (
        <div className="empty-state"><p>No goals defined.</p><p>Add goals in the Goals tab.</p></div>
      ) : daily.map(renderGoal)}

      {longTerm.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop:24 }}>
            <span className="section-title">Long-term Goals</span>
          </div>
          {longTerm.map(renderGoal)}
        </>
      )}

      {/* Active trials */}
      {activeTrials.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop:24 }}>
            <span className="section-title">Active Trials</span>
            <span className="section-title">{activeTrials.length}</span>
          </div>
          {activeTrials.map(trial => {
            const ch      = CHALLENGES.find(c => c.id === trial.challengeId)
            if (!ch) return null
            const virtue  = VIRTUES[ch.virtue] || VIRTUES.courage
            const logged  = (trial.dailyLogs || {})[today]
            const daysDone = Object.keys(trial.dailyLogs || {}).length
            const dayNum   = daysDone + (logged ? 0 : 1)
            return (
              <div key={trial.id} className={`goal-item ${logged ? 'logged' : ''}`}
                onClick={() => onLogTrial(trial.id)}>
                <div className="goal-virtue-dot" style={{ background: virtue.color }} />
                <div className="goal-info">
                  <div className="goal-name">{ch.title}</div>
                  <div className="goal-meta">
                    {virtue.label.toUpperCase()} · TRIAL · DAY {Math.min(dayNum, ch.duration)}/{ch.duration}
                  </div>
                  <div className="period-row">
                    <div className="period-bar-track">
                      <div className="period-bar-fill" style={{ width:`${(daysDone/ch.duration)*100}%`, background: virtue.color }} />
                    </div>
                    <span className="period-status" style={{ color: virtue.color }}>
                      {daysDone}/{ch.duration} DAYS COMPLETE
                    </span>
                  </div>
                </div>
                <div className={`goal-check ${logged ? 'checked' : ''}`} style={logged ? { background:virtue.color, borderColor:virtue.color } : { borderColor:virtue.color }}>
                  {logged ? <CheckIcon /> : null}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

// ─── Add Goal Modal ───────────────────────────────────────────────────────────

function AddGoalModal({ onSave, onClose, existingNames }) {
  const [form, setForm] = useState({ name:'', type:'binary', virtue:'', timeframe:'daily', weight:2, target_value:'', unit:'', frequency:1 })
  const [nameError, setNameError] = useState('')

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = e => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [onClose])

  const handleSave = () => {
    const trimmed = form.name.trim()
    if (!trimmed || !form.virtue) return
    // Fix 15: deduplicate goal names
    if (existingNames.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
      setNameError('A goal with this name already exists.')
      return
    }
    onSave({ ...form, name: trimmed, id: uid() })
  }

  const valid = form.name.trim() && form.virtue && !nameError

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">New Goal</div>

        <div className="form-group">
          <label className="form-label">Goal Name</label>
          <input className="form-input" placeholder="e.g. Gym session" value={form.name}
            onChange={e => { setForm(p => ({...p, name: e.target.value})); setNameError('') }} />
          {nameError && <div className="form-error">{nameError}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Virtue</label>
          <div className="virtue-grid">
            {Object.entries(VIRTUES).map(([key, v]) => (
              <button key={key} className={`virtue-btn ${form.virtue === key ? 'selected' : ''}`}
                style={form.virtue === key ? { background:v.color, borderColor:v.color } : { borderColor:v.dim }}
                onClick={() => setForm(p => ({...p, virtue:key}))}>
                <span>{v.label}</span>
                {/* Fix 11: show virtue desc */}
                <span className="virtue-btn-desc">{v.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-select" value={form.type} onChange={e => setForm(p => ({...p, type:e.target.value}))}>
            <option value="binary">Binary (done / not done)</option>
            <option value="quantitative">Quantitative (numeric target)</option>
            <option value="streak">Streak (daily chain)</option>
          </select>
        </div>

        {form.type === 'quantitative' && (
          <div className="form-group">
            <label className="form-label">Target Value</label>
            <div style={{ display:'flex', gap:8 }}>
              {/* Fix 19: min=0 */}
              <input className="form-input" type="number" inputMode="decimal" min="0" placeholder="e.g. 10000"
                value={form.target_value} onChange={e => setForm(p => ({...p, target_value:e.target.value}))} style={{ flex:2 }} />
              <input className="form-input" placeholder="unit" value={form.unit}
                onChange={e => setForm(p => ({...p, unit:e.target.value}))} style={{ flex:1 }} />
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Timeframe</label>
          <select className="form-select" value={form.timeframe}
            onChange={e => setForm(p => ({...p, timeframe:e.target.value, frequency:1}))}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="fortnightly">Fortnightly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        {form.timeframe !== 'daily' && (
          <div className="form-group">
            {/* Fix 6: correct grammar for each timeframe */}
            <label className="form-label">How many times per {timeframeNoun(form.timeframe)}?</label>
            <div className="stepper-row">
              <button className="stepper-btn" onClick={() => setForm(p => ({...p, frequency:Math.max(1,p.frequency-1)}))}>−</button>
              <span className="stepper-val">{form.frequency}</span>
              <button className="stepper-btn" onClick={() => setForm(p => ({...p, frequency:Math.min(99,p.frequency+1)}))}>+</button>
              <span className="stepper-label">time{form.frequency !== 1 ? 's' : ''} per {timeframeNoun(form.timeframe)}</span>
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Importance (1 – 5)</label>
          <div className="weight-row">
            {[1,2,3,4,5].map(w => (
              <button key={w} className={`weight-btn ${form.weight === w ? 'selected' : ''}`}
                onClick={() => setForm(p => ({...p, weight:w}))}>{w}</button>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" disabled={!valid} onClick={handleSave}>Add Goal</button>
        </div>
      </div>
    </div>
  )
}

// ─── Goals Tab ────────────────────────────────────────────────────────────────

function GoalsTab({ goals, onUpdate, logs }) {
  const [showAdd,   setShowAdd]   = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null) // { id, name }

  const existingNames = useMemo(() => goals.map(g => g.name), [goals])
  const atLimit = goals.length >= MAX_GOALS

  const save   = g => { onUpdate([...goals, g]); setShowAdd(false) }
  const confirmDelete = () => {
    onUpdate(goals.filter(g => g.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  const byVirtue = Object.keys(VIRTUES).reduce((acc, v) => {
    acc[v] = goals.filter(g => g.virtue === v); return acc
  }, {})

  return (
    <div className="goals-tab fade-in">
      {/* Fix 20: goal limit */}
      {atLimit ? (
        <div className="limit-banner">Maximum {MAX_GOALS} goals reached. Remove one to add another.</div>
      ) : (
        <button className="btn-add" onClick={() => setShowAdd(true)}>+ Add Goal</button>
      )}

      {goals.length === 0 ? (
        <div className="empty-state"><p>No goals defined.</p><p>Add your first goal above.</p></div>
      ) : Object.entries(byVirtue).map(([key, vGoals]) => {
        if (!vGoals.length) return null
        const virtue = VIRTUES[key]
        return (
          <div key={key} style={{ marginBottom:24 }}>
            <div className="section-header">
              <span className="section-title" style={{ color:virtue.color }}>{virtue.label}</span>
              {/* Fix 11: show virtue desc */}
              <span className="section-title virtue-desc-inline">{virtue.desc}</span>
            </div>
            {vGoals.map(goal => (
              <div key={goal.id} className="goal-manage-item">
                <div className="goal-virtue-dot" style={{ background:virtue.color }} />
                <div className="goal-manage-info">
                  <div className="goal-name">{goal.name}</div>
                  <div className="goal-meta">
                    {(goal.type||'binary').toUpperCase()} · {(goal.timeframe||'daily').toUpperCase()}
                    {goal.frequency > 1 ? ` · ${goal.frequency}×` : ''} · WT {goal.weight}
                    {goal.type==='quantitative'&&goal.target_value ? ` · ${goal.target_value}${goal.unit?' '+goal.unit:''}` : ''}
                  </div>
                  <PeriodIndicator goal={goal} logs={logs} />
                </div>
                {/* Fix 1: in-app confirm */}
                <button className="btn-delete" onClick={() => setDeleteTarget({ id:goal.id, name:goal.name })}>×</button>
              </div>
            ))}
          </div>
        )
      })}

      {showAdd && <AddGoalModal onSave={save} onClose={() => setShowAdd(false)} existingNames={existingNames} />}

      {/* Fix 1: in-app delete confirmation */}
      {deleteTarget && (
        <ConfirmModal
          title={`Delete "${deleteTarget.name}"?`}
          message="This cannot be undone. All logs for this goal remain in history."
          confirmLabel="Delete"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ─── Trials Tab ───────────────────────────────────────────────────────────────

function TrialsTab({ trials, onStart, onAbandon }) {
  const [abandonTarget, setAbandonTarget] = useState(null)
  const today = todayStr()

  const activeIds = useMemo(() => new Set(trials.filter(t => !t.completed).map(t => t.challengeId)), [trials])
  const completedIds = useMemo(() => new Set(trials.filter(t => t.completed).map(t => t.challengeId)), [trials])

  const byVirtue = Object.keys(VIRTUES).reduce((acc, v) => {
    acc[v] = CHALLENGES.filter(c => c.virtue === v); return acc
  }, {})

  const getTrialStatus = (challengeId) => {
    const t = trials.find(t => t.challengeId === challengeId && !t.completed)
    if (!t) return null
    const ch        = CHALLENGES.find(c => c.id === challengeId)
    const daysDone  = Object.keys(t.dailyLogs || {}).length
    const todayDone = !!(t.dailyLogs || {})[today]
    return { trial: t, daysDone, todayDone, ch }
  }

  return (
    <div className="trials-tab fade-in">
      {/* Active trials summary */}
      {trials.filter(t => !t.completed).length > 0 && (
        <>
          <div className="section-header">
            <span className="section-title">In Progress</span>
            <span className="section-title" style={{ color:'var(--text)' }}>{trials.filter(t=>!t.completed).length}</span>
          </div>
          {trials.filter(t => !t.completed).map(trial => {
            const ch = CHALLENGES.find(c => c.id === trial.challengeId)
            if (!ch) return null
            const virtue   = VIRTUES[ch.virtue] || VIRTUES.courage
            const daysDone = Object.keys(trial.dailyLogs || {}).length
            const todayDone= !!(trial.dailyLogs || {})[today]
            return (
              <div key={trial.id} className="trial-active-card">
                <div className="trial-active-header">
                  <span className="trial-active-virtue" style={{ color:virtue.color }}>{virtue.label.toUpperCase()}</span>
                  <span className="trial-active-days">{daysDone}/{ch.duration} DAYS</span>
                </div>
                <div className="trial-active-title">{ch.title}</div>
                <div className="trial-active-completion">{ch.completion}</div>
                <div className="period-bar-track" style={{ margin:'8px 0' }}>
                  <div className="period-bar-fill" style={{ width:`${(daysDone/ch.duration)*100}%`, background:virtue.color }} />
                </div>
                <div className="trial-active-footer">
                  <span className={`trial-today-status ${todayDone ? 'done' : ''}`}>
                    {todayDone ? '✓ LOGGED TODAY' : '— NOT LOGGED TODAY'}
                  </span>
                  <button className="trial-abandon-btn" onClick={() => setAbandonTarget({ id:trial.id, name:ch.title })}>
                    ABANDON
                  </button>
                </div>
              </div>
            )
          })}
          <div style={{ height:8 }} />
        </>
      )}

      {/* Available challenges by virtue */}
      {Object.entries(byVirtue).map(([key, challenges]) => {
        const virtue = VIRTUES[key]
        return (
          <div key={key} style={{ marginBottom:28 }}>
            <div className="section-header">
              <span className="section-title" style={{ color:virtue.color }}>{virtue.label}</span>
              <span className="section-title virtue-desc-inline">{virtue.desc}</span>
            </div>
            {challenges.map(ch => {
              const isActive    = activeIds.has(ch.id)
              const isCompleted = completedIds.has(ch.id)
              const status = getTrialStatus(ch.id)
              return (
                <div key={ch.id} className={`trial-card ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                  <div className="trial-card-header">
                    <span className="trial-card-title">{ch.title}</span>
                    <span className="trial-card-duration" style={{ color:virtue.color }}>{ch.duration}D</span>
                  </div>
                  <div className="trial-card-desc">{ch.description}</div>
                  <div className="trial-card-constraint">
                    <span className="trial-label">CONSTRAINT</span> {ch.constraint}
                  </div>
                  <div className="trial-card-completion">
                    <span className="trial-label">DONE WHEN</span> {ch.completion}
                  </div>
                  {isActive && status ? (
                    <div className="trial-card-progress">
                      <div className="period-bar-track">
                        <div className="period-bar-fill" style={{ width:`${(status.daysDone/ch.duration)*100}%`, background:virtue.color }} />
                      </div>
                      <span style={{ color:virtue.color, fontSize:'var(--fs-xs)', letterSpacing:'.1em' }}>
                        DAY {status.daysDone}/{ch.duration}
                      </span>
                    </div>
                  ) : isCompleted ? (
                    <div className="trial-completed-badge">COMPLETED</div>
                  ) : (
                    <button className="trial-begin-btn" style={{ borderColor:virtue.dim, color:virtue.color }}
                      onClick={() => onStart(ch.id)}>
                      BEGIN TRIAL
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      {abandonTarget && (
        <ConfirmModal
          title={`Abandon "${abandonTarget.name}"?`}
          message="Your progress will be lost."
          confirmLabel="Abandon"
          danger
          onConfirm={() => { onAbandon(abandonTarget.id); setAbandonTarget(null) }}
          onCancel={() => setAbandonTarget(null)}
        />
      )}
    </div>
  )
}

// ─── Virtue Tree ──────────────────────────────────────────────────────────────

function VirtueTree({ virtue, xp, goals, logs }) {
  const today     = useMemo(() => todayStr(), [])
  const { current, next, progress } = useMemo(() => getVirtueLevel(xp), [xp])
  const v         = VIRTUES[virtue]
  const related   = useMemo(() => goals.filter(g => g.virtue === virtue), [goals, virtue])
  const todayLogs = useMemo(() => logs[today] || {}, [logs, today])
  const doneToday = useMemo(() => related.filter(g => {
    const val = todayLogs[g.id]
    return g.type === 'quantitative' ? (val && parseFloat(val) >= parseFloat(g.target_value||1)) : (val===1||val===true)
  }).length, [related, todayLogs])

  return (
    <div className="virtue-tree-card" style={{ borderColor: xp > 0 ? v.dim : 'var(--border)' }}>
      <div className="virtue-tree-header">
        <div>
          <span className="virtue-tree-name" style={{ color:v.color }}>{v.label}</span>
          {/* Fix 11: show virtue desc */}
          <div className="virtue-tree-desc">{v.desc}</div>
        </div>
        <span style={{ marginLeft:'auto', fontSize:'var(--fs-xs)', color:'var(--dim)', letterSpacing:'.08em', textAlign:'right' }}>
          {related.length > 0 ? `${doneToday}/${related.length} today` : 'no goals'}
        </span>
      </div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:12, marginBottom:8 }}>
        <span className="virtue-tree-level" style={{ color: xp>0 ? v.color : 'var(--dim)' }}>{current.level}</span>
        <div style={{ flex:1 }}>
          <div className="virtue-tree-title">{current.title}</div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width:`${progress}%`, background:v.color }} />
          </div>
          <div className="progress-meta">
            <span>{xp} XP</span>
            {next ? <span>→ {next.title} · {next.threshold}</span> : <span>Mastery</span>}
          </div>
        </div>
      </div>
      <div className="level-nodes">
        {VIRTUE_LEVELS.map(lvl => (
          <div key={lvl.level} className={`level-node ${lvl.level <= current.level ? 'reached' : ''}`}
            title={`Level ${lvl.level}: ${lvl.title}`}
            style={lvl.level <= current.level ? { background:v.color, borderColor:v.color } : lvl.level === current.level+1 ? { borderColor:v.dim } : {}} />
        ))}
      </div>
    </div>
  )
}

// ─── Progress Tab ─────────────────────────────────────────────────────────────

function ProgressTab({ goals, logs, virtueXP }) {
  const score    = useMemo(() => calcWeeklyScore(goals, logs), [goals, logs])
  const tier     = useMemo(() => getTier(score), [score])
  const week     = useMemo(() => getWeekDates(), [])
  const today    = todayStr()
  const totalXP  = Object.values(virtueXP).reduce((a,b) => a+b, 0)
  const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

  const weekRange = useMemo(() => {
    const fmt = d => parseLocalDate(d).toLocaleDateString('en-GB', { day:'numeric', month:'short' }).toUpperCase()
    return `${fmt(week[0])} – ${fmt(week[6])}`
  }, [week])

  const dayScores = useMemo(() => week.map(date => {
    if (date > today || !goals.length) return null
    let total = 0, earned = 0
    goals.forEach(g => {
      if (g.timeframe && g.timeframe !== 'daily' && g.timeframe !== 'weekly') return
      const w = g.weight||1; total += w
      const val = (logs[date]||{})[g.id]
      if (g.type === 'quantitative') {
        const tv = parseFloat(g.target_value||1), v = parseFloat(val)
        if (!isNaN(v) && v > 0) earned += v >= tv ? w : w*(v/tv)
      } else { if (val===1||val===true) earned += w }
    })
    return total > 0 ? Math.round((earned/total)*100) : 0
  }), [week, today, goals, logs])

  return (
    <div className="progress-tab fade-in">
      <div className="score-card">
        <div>
          <div className="score-label">Weekly Score</div>
          <div className="score-range">{weekRange}</div>
          <div className="score-value">{score}<span className="score-unit">/100</span></div>
          <span className="tier-badge" style={{ color:tier.color, borderColor:tier.color }}>{tier.label}</span>
        </div>
        <div style={{ textAlign:'right' }}>
          <div className="score-label">Total XP</div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'var(--fs-xl)', fontWeight:300, color:'var(--gold)' }}>{totalXP}</div>
        </div>
      </div>

      <div className="section-header" style={{ marginTop:4, marginBottom:8 }}>
        <span className="section-title">This Week</span>
      </div>
      <div className="week-grid">
        {week.map((d, i) => {
          const s = dayScores[i], isFuture = d > today, isToday = d === today
          const dt = parseLocalDate(d), di = dt.getDay()
          return (
            <div key={d} className={`week-cell ${isToday ? 'today' : ''}`}>
              <span className="day-label">{dayNames[di === 0 ? 6 : di-1]}</span>
              {!isFuture && s !== null
                ? <span className="day-score" style={{ color: s>=70?'var(--gold)':s>=40?'var(--text)':'var(--dim)' }}>{s}</span>
                : <span className="day-score" style={{ color:'var(--border)' }}>—</span>}
            </div>
          )
        })}
      </div>

      <div className="section-header" style={{ marginTop:24 }}>
        <span className="section-title">Virtue Progression</span>
      </div>
      {Object.keys(VIRTUES).map(v => (
        <VirtueTree key={v} virtue={v} xp={virtueXP[v]||0} goals={goals} logs={logs} />
      ))}
    </div>
  )
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ settings, onUpdate }) {
  const [resetConfirm, setResetConfirm] = useState(false)
  const set = (key, val) => onUpdate({ ...settings, [key]: val })

  return (
    <div className="settings-tab fade-in">
      <div className="settings-section">
        <div className="settings-section-title">Appearance</div>
        <div className="settings-row">
          <span className="settings-label">Text Size</span>
          <div className="select-row">
            {['small','medium','large'].map(s => (
              <button key={s} className={`select-chip ${settings.textSize===s?'active':''}`}
                onClick={() => set('textSize', s)}>
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
          <button className={`toggle ${settings.reflectionEnabled?'on':''}`}
            onClick={() => set('reflectionEnabled', !settings.reflectionEnabled)} />
        </div>
        <div className="settings-row">
          <span className="settings-label">Reopen Focus Screen</span>
          <button className="select-chip" onClick={() => { storageSet('stoic-focus-date',''); window.location.reload() }}>Reset</button>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Data</div>
        <div className="settings-row">
          <span className="settings-label">Reset All Progress</span>
          {/* Fix 1: in-app confirm */}
          <button className="select-chip" style={{ color:'#b55', borderColor:'#b55' }}
            onClick={() => setResetConfirm(true)}>
            Clear
          </button>
        </div>
      </div>

      <div className="app-version">STOIC · v1.2.0 · Performance &amp; Discipline</div>

      {resetConfirm && (
        <ConfirmModal
          title="Reset All Data?"
          message="Goals, logs, XP, and trials will be permanently deleted."
          confirmLabel="Reset Everything"
          danger
          onConfirm={() => {
            storageSet('stoic-goals',   [])
            storageSet('stoic-logs',    {})
            storageSet('stoic-virtue-xp', { courage:0, wisdom:0, temperance:0, justice:0 })
            storageSet('stoic-focus-date', '')
            storageSet('stoic-trials',  [])
            window.location.reload()
          }}
          onCancel={() => setResetConfirm(false)}
        />
      )}
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────

const DEFAULTS = {
  goals:    [],
  logs:     {},
  virtueXP: { courage:0, wisdom:0, temperance:0, justice:0 },
  settings: { theme:'dark', textSize:'medium', reflectionEnabled:true },
  trials:   [],
}

export default function App() {
  const [loaded,      setLoaded]      = useState(false)
  const [screen,      setScreen]      = useState('focus')
  const [activeTab,   setActiveTab]   = useState('log')
  const [goals,       setGoals]       = useState(DEFAULTS.goals)
  const [logs,        setLogs]        = useState(DEFAULTS.logs)
  const [virtueXP,    setVirtueXP]    = useState(DEFAULTS.virtueXP)
  const [settings,    setSettings]    = useState(DEFAULTS.settings)
  const [trials,      setTrials]      = useState(DEFAULTS.trials)
  const [focusTimer,  setFocusTimer]  = useState(12)
  const [focusReady,  setFocusReady]  = useState(false)
  const [reflection,  setReflection]  = useState('')
  const [focusIdx,    setFocusIdx]    = useState(0)
  const [storageWarn, setStorageWarn] = useState(false)

  // Fix 9: stable refs so logGoal / updateGoals have zero deps
  const logsRef   = useRef(logs)
  const goalsRef  = useRef(goals)
  const xpRef     = useRef(virtueXP)
  const trialsRef = useRef(trials)
  useEffect(() => { logsRef.current = logs },     [logs])
  useEffect(() => { goalsRef.current = goals },   [goals])
  useEffect(() => { xpRef.current = virtueXP },   [virtueXP])
  useEffect(() => { trialsRef.current = trials }, [trials])

  // Load
  useEffect(() => {
    const g  = storageGet('stoic-goals',     DEFAULTS.goals)
    const raw= storageGet('stoic-logs',      DEFAULTS.logs)
    const fd = storageGet('stoic-focus-date','')
    // Fix 9: merge settings with defaults
    const s  = { ...DEFAULTS.settings, ...storageGet('stoic-settings', {}) }
    const tr = storageGet('stoic-trials',    DEFAULTS.trials)

    const l = pruneOldLogs(raw)
    if (Object.keys(l).length !== Object.keys(raw).length) storageSet('stoic-logs', l)

    // Fix 12: compute XP from logs on startup (single source of truth)
    const xp = recalcVirtueXP(g, l)

    setGoals(g); setLogs(l); setVirtueXP(xp); setSettings(s); setTrials(tr)

    // Fix 7: 40-quote sequential cycling via days-since-epoch
    const epoch = new Date(2026, 0, 1).getTime()
    const now   = new Date(); now.setHours(0,0,0,0)
    const days  = Math.floor((now - epoch) / 86400000)
    setFocusIdx(((days % STOIC_CONTENT.length) + STOIC_CONTENT.length) % STOIC_CONTENT.length)

    if (fd === todayStr()) setScreen('main')
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (screen !== 'focus' || !loaded) return
    if (focusTimer <= 0) { setFocusReady(true); return }
    const t = setTimeout(() => setFocusTimer(v => v-1), 1000)
    return () => clearTimeout(t)
  }, [screen, focusTimer, loaded])

  const handleProceed = useCallback(() => {
    storageSet('stoic-focus-date', todayStr()); setScreen('main')
  }, [])

  // Fix 18: updateGoals uses ref — stable reference, no re-render cascade
  const updateGoals = useCallback(ng => {
    setGoals(ng)
    storageSet('stoic-goals', ng)
    // Full recalc needed since a goal may have been deleted
    const newXP = recalcVirtueXP(ng, logsRef.current)
    setVirtueXP(newXP)
    storageSet('stoic-virtue-xp', newXP)
  }, [])

  // Fix 2 & 9: incremental XP delta, stable callback via refs
  const logGoal = useCallback((goalId, value) => {
    const today  = todayStr()
    const logs   = logsRef.current
    const goals  = goalsRef.current
    const xp     = xpRef.current

    const prevValue = (logs[today] || {})[goalId]
    const newLogs   = { ...logs, [today]: { ...(logs[today]||{}), [goalId]: value } }
    setLogs(newLogs)
    const result = storageSet('stoic-logs', newLogs)
    if (result === 'QUOTA_EXCEEDED') setStorageWarn(true)

    // Incremental XP delta — O(1) not O(goals × 90 days)
    const goal  = goals.find(g => g.id === goalId)
    const delta = xpDelta(goal, prevValue, value)
    if (delta) {
      const newXP = { ...xp, [delta.virtue]: Math.max(0, (xp[delta.virtue]||0) + delta.delta) }
      setVirtueXP(newXP)
      storageSet('stoic-virtue-xp', newXP)
    }
  }, [])

  const updateSettings = useCallback(ns => {
    setSettings(ns); storageSet('stoic-settings', ns)
  }, [])

  // Trials
  const startTrial = useCallback(challengeId => {
    const trials = trialsRef.current
    if (trials.some(t => t.challengeId === challengeId && !t.completed)) return
    const newTrials = [...trials, { id: uid(), challengeId, startDate: todayStr(), dailyLogs: {}, completed: false }]
    setTrials(newTrials)
    storageSet('stoic-trials', newTrials)
  }, [])

  const logTrial = useCallback(trialId => {
    const today  = todayStr()
    const trials = trialsRef.current
    const xp     = xpRef.current
    const trial  = trials.find(t => t.id === trialId)
    if (!trial) return
    const ch     = CHALLENGES.find(c => c.id === trial.challengeId)
    if (!ch) return

    const alreadyLogged = !!(trial.dailyLogs || {})[today]
    const newDailyLogs  = alreadyLogged
      ? Object.fromEntries(Object.entries(trial.dailyLogs).filter(([d]) => d !== today))
      : { ...(trial.dailyLogs || {}), [today]: true }

    const daysDone = Object.keys(newDailyLogs).length
    const completed = daysDone >= ch.duration

    const newTrials = trials.map(t => t.id === trialId ? { ...t, dailyLogs: newDailyLogs, completed } : t)
    setTrials(newTrials)
    storageSet('stoic-trials', newTrials)

    // Award XP per trial day (15 XP) + completion bonus
    const virtue = ch.virtue
    if (!alreadyLogged) {
      const bonus  = completed ? ch.duration * 10 : 0
      const gain   = 15 + bonus
      const newXP  = { ...xp, [virtue]: (xp[virtue]||0) + gain }
      setVirtueXP(newXP)
      storageSet('stoic-virtue-xp', newXP)
    } else if (alreadyLogged) {
      const gain  = 15
      const newXP = { ...xp, [virtue]: Math.max(0, (xp[virtue]||0) - gain) }
      setVirtueXP(newXP)
      storageSet('stoic-virtue-xp', newXP)
    }
  }, [])

  const abandonTrial = useCallback(trialId => {
    const trials  = trialsRef.current
    const newTrials = trials.filter(t => t.id !== trialId)
    setTrials(newTrials)
    storageSet('stoic-trials', newTrials)
  }, [])

  if (!loaded) return (
    <div style={{ background:'#080808', height:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', color:'#333', fontFamily:'monospace', letterSpacing:'.3em', fontSize:'11px' }}>
      LOADING
    </div>
  )

  const TABS = [
    { id:'log',      label:'Log',      Icon:LogIcon },
    { id:'goals',    label:'Goals',    Icon:GoalsIcon },
    { id:'trials',   label:'Trials',   Icon:TrialsIcon },
    { id:'progress', label:'Progress', Icon:ProgressIcon },
    { id:'settings', label:'Settings', Icon:SettingsIcon },
  ]

  return (
    <ErrorBoundary>
      <div style={{ height:'100dvh' }} data-size={settings.textSize}>
        {storageWarn && (
          <div className="storage-warning">
            <span>Storage full. Clear old data in Settings.</span>
            <button onClick={() => setStorageWarn(false)}>×</button>
          </div>
        )}
        {screen === 'focus' ? (
          <FocusScreen focus={STOIC_CONTENT[focusIdx]} timer={focusTimer} ready={focusReady}
            reflection={reflection} onReflection={setReflection}
            onProceed={handleProceed} reflectionEnabled={settings.reflectionEnabled} />
        ) : (
          <div className="main-app">
            <header className="app-header">
              <span className="app-logo">STOIC</span>
              <span className="app-date">{new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }).toUpperCase()}</span>
            </header>

            {/* Fix 5: all tabs remain mounted — visibility toggled via CSS */}
            <div className="tab-content">
              <div className={`tab-panel ${activeTab==='log'      ? 'active' : ''}`}>
                <LogTab goals={goals} logs={logs} onLog={logGoal} trials={trials} onLogTrial={logTrial} />
              </div>
              <div className={`tab-panel ${activeTab==='goals'    ? 'active' : ''}`}>
                <GoalsTab goals={goals} onUpdate={updateGoals} logs={logs} />
              </div>
              <div className={`tab-panel ${activeTab==='trials'   ? 'active' : ''}`}>
                <TrialsTab trials={trials} onStart={startTrial} onAbandon={abandonTrial} />
              </div>
              <div className={`tab-panel ${activeTab==='progress' ? 'active' : ''}`}>
                <ProgressTab goals={goals} logs={logs} virtueXP={virtueXP} />
              </div>
              <div className={`tab-panel ${activeTab==='settings' ? 'active' : ''}`}>
                <SettingsTab settings={settings} onUpdate={updateSettings} />
              </div>
            </div>

            <nav className="bottom-nav">
              {TABS.map(({ id, label, Icon }) => (
                <button key={id} className={`nav-item ${activeTab===id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
                  <Icon />
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
