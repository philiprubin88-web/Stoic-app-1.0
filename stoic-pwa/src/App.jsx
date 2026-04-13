import { useState, useEffect, useCallback } from 'react'
import './styles.css'
import { VIRTUES, STOIC_CONTENT, VIRTUE_LEVELS } from './constants.js'
import { todayStr, getWeekDates, getVirtueLevel, calcWeeklyScore, getTier, uid } from './utils.js'
import { storageGet, storageSet } from './storage.js'

// ─── Icons ────────────────────────────────────────────────────────────────────

const LogIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="4" width="18" height="16" rx="1"/>
    <line x1="7" y1="9" x2="17" y2="9"/>
    <line x1="7" y1="13" x2="13" y2="13"/>
  </svg>
)
const GoalsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>
    <line x1="12" y1="3" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21"/>
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

// ─── Focus Screen ─────────────────────────────────────────────────────────────

function FocusScreen({ focus, timer, ready, reflection, onReflection, onProceed, reflectionEnabled }) {
  const pct = ((12 - timer) / 12) * 100
  return (
    <div className="focus-screen fade-in">
      <div className="focus-bg-glow" />
      <div className="focus-label">
        Daily Focus · {new Date().toLocaleDateString('en-GB', {
          weekday: 'long', day: 'numeric', month: 'long'
        }).toUpperCase()}
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
        <div className="timer-track"><div className="timer-fill" style={{ width: `${pct}%` }} /></div>
        <span className="timer-count">{timer > 0 ? timer : ''}</span>
      </div>
      <button className="btn-proceed" disabled={!ready} onClick={onProceed}>
        {ready ? 'Proceed' : `${timer}s`}
      </button>
    </div>
  )
}

// ─── Add Goal Wizard ──────────────────────────────────────────────────────────
// 4-step wizard: each step is a single focused question that fits on one screen.
// The wizard renders as position:fixed so no parent container can misplace it.
// Back (←) and Next/Save are always visible — no scrolling ever required.

const PERIOD_MAX   = { daily: 1, weekly: 7, fortnight: 14, monthly: 30, yearly: 52 }
const PERIOD_LABEL = { daily: 'day', weekly: 'week', fortnight: 'fortnight', monthly: 'month', yearly: 'year' }
const BLANK_FORM   = { name: '', virtue: '', timeframe: 'daily', frequency: 1, type: 'binary', weight: 3, target_value: '', unit: '' }
const STEPS        = ['name', 'virtue', 'schedule', 'details']

function AddGoalWizard({ onSave, onCancel }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(BLANK_FORM)
  const patch = p => setForm(f => ({ ...f, ...p }))

  const canAdvance = step === 0 ? form.name.trim().length > 0
                   : step === 1 ? form.virtue !== ''
                   : true

  const handleNext = () => step < STEPS.length - 1 ? setStep(s => s + 1) : onSave({ ...form, id: uid() })
  const handleBack = () => step === 0 ? onCancel() : setStep(s => s - 1)

  return (
    <div className="wizard">

      {/* Progress header */}
      <div className="wz-header">
        <button className="wz-back" onClick={handleBack} aria-label="Back">
          {step === 0 ? '✕' : '←'}
        </button>
        <div className="wz-track">
          {STEPS.map((_, i) => <div key={i} className={`wz-pip ${i <= step ? 'on' : ''}`} />)}
        </div>
        <span className="wz-counter">{step + 1}/{STEPS.length}</span>
      </div>

      {/* Step body — vertically centred, never scrolls */}
      <div className="wz-body">

        {step === 0 && (
          <>
            <p className="wz-question">What do you want<br/>to build?</p>
            <p className="wz-hint">Name your goal clearly and specifically.</p>
            <input className="wz-text-input" placeholder="e.g. Morning run"
              value={form.name} onChange={e => patch({ name: e.target.value })} autoFocus />
          </>
        )}

        {step === 1 && (
          <>
            <p className="wz-question">Which virtue does<br/>this cultivate?</p>
            <p className="wz-hint">Goals are measured against the virtue they serve.</p>
            <div className="wz-virtue-grid">
              {Object.entries(VIRTUES).map(([key, v]) => (
                <button key={key}
                  className={`wz-virtue-btn ${form.virtue === key ? 'on' : ''}`}
                  style={form.virtue === key
                    ? { background: v.color, borderColor: v.color, color: '#000' }
                    : { borderColor: v.dim }}
                  onClick={() => patch({ virtue: key })}>
                  <span className="wz-vname">{v.label}</span>
                  <span className="wz-vdesc">{v.desc}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="wz-question">How often?</p>
            <p className="wz-hint">Set the cadence you intend to hold yourself to.</p>
            <div className="wz-options">
              {[['daily','Daily'],['weekly','Weekly'],['fortnight','Fortnightly'],['monthly','Monthly'],['yearly','Yearly']].map(([v,l]) => (
                <button key={v} className={`wz-opt ${form.timeframe === v ? 'on' : ''}`}
                  onClick={() => patch({ timeframe: v, frequency: 1 })}>{l}</button>
              ))}
            </div>
            {form.timeframe !== 'daily' && form.timeframe !== 'yearly' && (
              <div className="wz-freq-block">
                <span className="wz-freq-label">Times per {PERIOD_LABEL[form.timeframe]}</span>
                <div className="frequency-row">
                  <button className="freq-btn" disabled={form.frequency <= 1}
                    onClick={() => patch({ frequency: Math.max(1, form.frequency - 1) })}>−</button>
                  <span className="freq-value">{form.frequency}×</span>
                  <button className="freq-btn" disabled={form.frequency >= PERIOD_MAX[form.timeframe]}
                    onClick={() => patch({ frequency: Math.min(PERIOD_MAX[form.timeframe], form.frequency + 1) })}>+</button>
                </div>
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <p className="wz-question">A few final<br/>details.</p>
            <p className="wz-sub-label">Tracking type</p>
            <div className="wz-options">
              {[['binary','Done / Not Done'],['quantitative','Numeric Target'],['streak','Daily Streak']].map(([v,l]) => (
                <button key={v} className={`wz-opt ${form.type === v ? 'on' : ''}`}
                  onClick={() => patch({ type: v })}>{l}</button>
              ))}
            </div>
            {form.type === 'quantitative' && (
              <div className="wz-quant-row">
                <input className="form-input" type="number" inputMode="decimal"
                  placeholder="Target (e.g. 10000)" value={form.target_value}
                  onChange={e => patch({ target_value: e.target.value })} style={{ flex: 2 }} />
                <input className="form-input" placeholder="Unit"
                  value={form.unit} onChange={e => patch({ unit: e.target.value })} style={{ flex: 1 }} />
              </div>
            )}
            <p className="wz-sub-label" style={{ marginTop: 20 }}>Importance</p>
            <div className="weight-row">
              {[1,2,3,4,5].map(w => (
                <button key={w} className={`weight-btn ${form.weight === w ? 'selected' : ''}`}
                  onClick={() => patch({ weight: w })}>{w}</button>
              ))}
            </div>
          </>
        )}

      </div>

      {/* Action footer */}
      <div className="wz-footer">
        <button className="wz-next" disabled={!canAdvance} onClick={handleNext}>
          {step === STEPS.length - 1 ? 'Save Goal' : 'Next'}
        </button>
      </div>

    </div>
  )
}

// ─── Period progress helper ────────────────────────────────────────────────────

function getPeriodProgress(goal, logs) {
  const freq = goal.frequency || 1
  const tf   = goal.timeframe || 'daily'
  if (tf === 'daily' || freq <= 1) return null

  const complete = val => goal.type === 'quantitative'
    ? val && parseFloat(val) >= parseFloat(goal.target_value || 1)
    : val === 1 || val === true

  if (tf === 'weekly') {
    return { done: getWeekDates().filter(d => complete((logs[d] || {})[goal.id])).length, total: freq, label: 'wk' }
  }
  if (tf === 'fortnight') {
    const today = new Date()
    const dates = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() - (13 - i))
      return d.toISOString().split('T')[0]
    })
    return { done: dates.filter(d => complete((logs[d] || {})[goal.id])).length, total: freq, label: 'fn' }
  }
  if (tf === 'monthly') {
    const month = new Date().toISOString().slice(0, 7)
    return { done: Object.keys(logs).filter(d => d.startsWith(month) && complete((logs[d] || {})[goal.id])).length, total: freq, label: 'mo' }
  }
  return null
}

// ─── Log Tab ──────────────────────────────────────────────────────────────────

function LogTab({ goals, logs, onLog }) {
  const today     = todayStr()
  const todayLogs = logs[today] || {}
  const score     = calcWeeklyScore(goals, logs)
  const tier      = getTier(score)
  const weekDates = getWeekDates()
  const [animIds, setAnimIds] = useState([])

  const tap = id => {
    onLog(id, todayLogs[id] ? 0 : 1)
    setAnimIds(p => [...p, id])
    setTimeout(() => setAnimIds(p => p.filter(x => x !== id)), 300)
  }

  const renderGoal = goal => {
    const virtue   = VIRTUES[goal.virtue] || VIRTUES.courage
    const logged   = todayLogs[goal.id]
    const isAnim   = animIds.includes(goal.id)
    const progress = getPeriodProgress(goal, logs)
    const suffix   = goal.frequency > 1
      ? ` · ${goal.frequency}× ${(goal.timeframe || 'daily').toUpperCase()}`
      : goal.timeframe && goal.timeframe !== 'daily' ? ` · ${goal.timeframe.toUpperCase()}` : ''

    return (
      <div key={goal.id} className={`goal-item ${logged ? 'logged' : ''}`}
        onClick={() => goal.type !== 'quantitative' && tap(goal.id)}>
        <div className="goal-virtue-dot" style={{ background: virtue.color }} />
        <div className="goal-info">
          <div className="goal-name">{goal.name}</div>
          <div className="goal-meta">
            {virtue.label.toUpperCase()} · {(goal.type || 'binary').toUpperCase()}
            {goal.type === 'quantitative' && goal.target_value
              ? ` · ${goal.target_value}${goal.unit ? ' ' + goal.unit : ''}` : ''}
            {suffix}
          </div>
        </div>
        {progress && (
          <div className="period-badge"
            style={{ color: progress.done >= progress.total ? 'var(--gold)' : 'var(--dim)' }}>
            <span className="period-count">{progress.done}/{progress.total}</span>
            <span className="period-unit">{progress.label}</span>
          </div>
        )}
        {goal.type === 'quantitative' ? (
          <input className="quant-input" type="number" inputMode="decimal"
            placeholder="0" value={logged || ''} onClick={e => e.stopPropagation()}
            onChange={e => onLog(goal.id, e.target.value)} />
        ) : (
          <div className={`goal-check ${logged ? 'checked' : ''} ${isAnim ? 'check-pop' : ''}`}>
            {logged ? <CheckIcon /> : null}
          </div>
        )}
      </div>
    )
  }

  const daily    = goals.filter(g => !g.timeframe || ['daily','weekly','fortnight'].includes(g.timeframe))
  const longTerm = goals.filter(g => ['monthly','yearly'].includes(g.timeframe))
  const doneCount = Object.keys(todayLogs).filter(k => todayLogs[k] && todayLogs[k] !== '0').length

  return (
    <div className="log-tab fade-in">
      <div className="score-card">
        <div>
          <div className="score-label">Weekly Performance</div>
          <div className="score-value">{score}<span className="score-unit">/100</span></div>
          <span className="tier-badge" style={{ color: tier.color, borderColor: tier.color }}>{tier.label}</span>
        </div>
        <div className="week-mini">
          {weekDates.map(d => {
            const di  = new Date(d).getDay()
            const lbl = ['S','M','T','W','T','F','S'][di]
            const dLogs = logs[d] || {}
            const done  = goals.filter(g => {
              const v = dLogs[g.id]
              return g.type === 'quantitative'
                ? v && parseFloat(v) >= parseFloat(g.target_value || 1)
                : v === 1 || v === true
            }).length
            const cls = d > today ? 'streak-dot future'
              : done > 0 && goals.length > 0 && done >= goals.length * 0.5 ? 'streak-dot done'
              : 'streak-dot missed'
            return (
              <div key={d} className={`week-day ${d === today ? 'today' : ''}`}>
                <span className="week-day-label">{lbl}</span>
                <div className={cls} />
              </div>
            )
          })}
        </div>
      </div>
      <div className="section-header">
        <span className="section-title">Today · {today}</span>
        <span className="section-title" style={{ color: 'var(--text)' }}>{doneCount}/{daily.length}</span>
      </div>
      {goals.length === 0
        ? <div className="empty-state"><p>No goals defined.</p><p>Add goals in the Goals tab.</p></div>
        : daily.map(renderGoal)}
      {longTerm.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop: 24 }}>
            <span className="section-title">Long-term Goals</span>
          </div>
          {longTerm.map(renderGoal)}
        </>
      )}
    </div>
  )
}

// ─── Goals Tab ────────────────────────────────────────────────────────────────

function GoalsTab({ goals, onUpdate, onAddGoal }) {
  const remove   = id => onUpdate(goals.filter(g => g.id !== id))
  const byVirtue = Object.keys(VIRTUES).reduce((acc, v) => {
    acc[v] = goals.filter(g => g.virtue === v); return acc
  }, {})

  return (
    <div className="goals-tab fade-in">
      <button className="btn-add" onClick={onAddGoal}>+ Add Goal</button>
      {goals.length === 0
        ? <div className="empty-state"><p>No goals defined.</p><p>Add your first goal above.</p></div>
        : Object.entries(byVirtue).map(([key, vGoals]) => {
            if (!vGoals.length) return null
            const virtue = VIRTUES[key]
            return (
              <div key={key} style={{ marginBottom: 24 }}>
                <div className="section-header">
                  <span className="section-title" style={{ color: virtue.color }}>{virtue.label}</span>
                  <span className="section-title">{vGoals.length}</span>
                </div>
                {vGoals.map(goal => (
                  <div key={goal.id} className="goal-manage-item">
                    <div className="goal-virtue-dot" style={{ background: virtue.color }} />
                    <div className="goal-manage-info">
                      <div className="goal-name">{goal.name}</div>
                      <div className="goal-meta">
                        {(goal.type || 'binary').toUpperCase()} ·{' '}
                        {goal.frequency > 1
                          ? `${goal.frequency}× ${(goal.timeframe || 'daily').toUpperCase()}`
                          : (goal.timeframe || 'daily').toUpperCase()} · WT {goal.weight}
                      </div>
                    </div>
                    <button className="btn-delete" onClick={() => remove(goal.id)}>×</button>
                  </div>
                ))}
              </div>
            )
          })
      }
    </div>
  )
}

// ─── Virtue Tree ──────────────────────────────────────────────────────────────

function VirtueTree({ virtue, xp, goals, logs }) {
  const { current, next, progress } = getVirtueLevel(xp)
  const v         = VIRTUES[virtue]
  const related   = goals.filter(g => g.virtue === virtue)
  const todayLogs = logs[todayStr()] || {}
  const doneToday = related.filter(g => {
    const val = todayLogs[g.id]
    return g.type === 'quantitative'
      ? val && parseFloat(val) >= parseFloat(g.target_value || 1)
      : val === 1 || val === true
  }).length

  return (
    <div className="virtue-tree-card" style={{ borderColor: xp > 0 ? v.dim : 'var(--border)' }}>
      <div className="virtue-tree-header">
        <span className="virtue-tree-name" style={{ color: v.color }}>{v.label}</span>
        <span style={{ marginLeft: 'auto', fontSize: 'var(--fs-xs)', color: 'var(--dim)', letterSpacing: '.08em' }}>
          {related.length > 0 ? `${doneToday}/${related.length} today` : 'no goals'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 8 }}>
        <span className="virtue-tree-level" style={{ color: xp > 0 ? v.color : 'var(--dim)' }}>{current.level}</span>
        <div style={{ flex: 1 }}>
          <div className="virtue-tree-title">{current.title}</div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%`, background: v.color }} />
          </div>
          <div className="progress-meta">
            <span>{xp} XP</span>
            {next ? <span>→ {next.title} · {next.threshold}</span> : <span>Mastery</span>}
          </div>
        </div>
      </div>
      <div className="level-nodes">
        {VIRTUE_LEVELS.map(lvl => (
          <div key={lvl.level}
            className={`level-node ${lvl.level <= current.level ? 'reached' : ''}`}
            style={lvl.level <= current.level
              ? { background: v.color, borderColor: v.color }
              : lvl.level === current.level + 1 ? { borderColor: v.dim } : {}} />
        ))}
      </div>
    </div>
  )
}

// ─── Progress Tab ─────────────────────────────────────────────────────────────

function ProgressTab({ goals, logs, virtueXP }) {
  const score    = calcWeeklyScore(goals, logs)
  const tier     = getTier(score)
  const week     = getWeekDates()
  const today    = todayStr()
  const totalXP  = Object.values(virtueXP).reduce((a, b) => a + b, 0)
  const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

  const dayScores = week.map(date => {
    if (date > today || !goals.length) return null
    let total = 0, earned = 0
    goals.forEach(g => {
      const w = g.weight || 1; total += w
      const val = (logs[date] || {})[g.id]
      if (g.type === 'quantitative') {
        if (val && parseFloat(val) >= parseFloat(g.target_value || 1)) earned += w
        else if (val && parseFloat(val) > 0) earned += w * (parseFloat(val) / parseFloat(g.target_value || 1))
      } else if (val === 1 || val === true) earned += w
    })
    return total > 0 ? Math.round((earned / total) * 100) : 0
  })

  return (
    <div className="progress-tab fade-in">
      <div className="score-card">
        <div>
          <div className="score-label">Weekly Score</div>
          <div className="score-value">{score}<span className="score-unit">/100</span></div>
          <span className="tier-badge" style={{ color: tier.color, borderColor: tier.color }}>{tier.label}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="score-label">Total XP</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 300, color: 'var(--gold)' }}>{totalXP}</div>
        </div>
      </div>
      <div className="section-header" style={{ marginTop: 4, marginBottom: 8 }}>
        <span className="section-title">This Week</span>
      </div>
      <div className="week-grid">
        {week.map((d, i) => {
          const di = new Date(d).getDay()
          return (
            <div key={d} className={`week-cell ${d === today ? 'today' : ''}`}>
              <span className="day-label">{dayNames[di === 0 ? 6 : di - 1]}</span>
              {d <= today && dayScores[i] !== null
                ? <span className="day-score" style={{ color: dayScores[i] >= 70 ? 'var(--gold)' : dayScores[i] >= 40 ? 'var(--text)' : 'var(--dim)' }}>{dayScores[i]}</span>
                : <span className="day-score" style={{ color: 'var(--border)' }}>—</span>}
            </div>
          )
        })}
      </div>
      <div className="section-header" style={{ marginTop: 24 }}>
        <span className="section-title">Virtue Progression</span>
      </div>
      {Object.keys(VIRTUES).map(v => (
        <VirtueTree key={v} virtue={v} xp={virtueXP[v] || 0} goals={goals} logs={logs} />
      ))}
    </div>
  )
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ settings, onUpdate }) {
  const set = (key, val) => onUpdate({ ...settings, [key]: val })
  return (
    <div className="settings-tab fade-in">
      <div className="settings-section">
        <div className="settings-section-title">Appearance</div>
        <div className="settings-row">
          <span className="settings-label">Text Size</span>
          <div className="select-row">
            {['small','medium','large'].map(s => (
              <button key={s} className={`select-chip ${settings.textSize === s ? 'active' : ''}`}
                onClick={() => set('textSize', s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="settings-section">
        <div className="settings-section-title">Daily Focus</div>
        <div className="settings-row">
          <span className="settings-label">Reflection Input</span>
          <button className={`toggle ${settings.reflectionEnabled ? 'on' : ''}`}
            onClick={() => set('reflectionEnabled', !settings.reflectionEnabled)} />
        </div>
        <div className="settings-row">
          <span className="settings-label">Reopen Focus Screen</span>
          <button className="select-chip"
            onClick={() => { storageSet('stoic-focus-date', ''); window.location.reload() }}>
            Reset
          </button>
        </div>
      </div>
      <div className="settings-section">
        <div className="settings-section-title">Data</div>
        <div className="settings-row">
          <span className="settings-label">Reset All Progress</span>
          <button className="select-chip" style={{ color: '#b55', borderColor: '#b55' }}
            onClick={() => {
              if (window.confirm('Reset all data? This cannot be undone.')) {
                storageSet('stoic-goals', [])
                storageSet('stoic-logs', {})
                storageSet('stoic-virtue-xp', { courage: 0, wisdom: 0, temperance: 0, justice: 0 })
                storageSet('stoic-focus-date', '')
                window.location.reload()
              }
            }}>Clear</button>
        </div>
      </div>
      <div className="app-version">STOIC · v1.0.0 · Performance &amp; Discipline</div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const DEFAULTS = {
  goals:    [],
  logs:     {},
  virtueXP: { courage: 0, wisdom: 0, temperance: 0, justice: 0 },
  settings: { theme: 'dark', textSize: 'medium', reflectionEnabled: true },
}

export default function App() {
  const [loaded,     setLoaded]     = useState(false)
  const [screen,     setScreen]     = useState('focus')
  const [activeTab,  setActiveTab]  = useState('log')
  const [addingGoal, setAddingGoal] = useState(false)
  const [goals,      setGoals]      = useState(DEFAULTS.goals)
  const [logs,       setLogs]       = useState(DEFAULTS.logs)
  const [virtueXP,   setVirtueXP]   = useState(DEFAULTS.virtueXP)
  const [settings,   setSettings]   = useState(DEFAULTS.settings)
  const [focusTimer, setFocusTimer] = useState(12)
  const [focusReady, setFocusReady] = useState(false)
  const [reflection, setReflection] = useState('')
  const [focusIdx,   setFocusIdx]   = useState(0)

  useEffect(() => {
    const g  = storageGet('stoic-goals',     DEFAULTS.goals)
    const l  = storageGet('stoic-logs',      DEFAULTS.logs)
    const xp = storageGet('stoic-virtue-xp', DEFAULTS.virtueXP)
    const fd = storageGet('stoic-focus-date','')
    const s  = storageGet('stoic-settings',  DEFAULTS.settings)
    setGoals(g); setLogs(l); setVirtueXP(xp); setSettings(s)
    const today = todayStr()
    setFocusIdx(today.split('-').reduce((a, n) => a + parseInt(n, 10), 0) % STOIC_CONTENT.length)
    if (fd === today) setScreen('main')
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (screen !== 'focus' || !loaded) return
    if (focusTimer <= 0) { setFocusReady(true); return }
    const t = setTimeout(() => setFocusTimer(v => v - 1), 1000)
    return () => clearTimeout(t)
  }, [screen, focusTimer, loaded])

  const handleProceed = useCallback(() => {
    storageSet('stoic-focus-date', todayStr()); setScreen('main')
  }, [])

  const updateGoals = useCallback(ng => { setGoals(ng); storageSet('stoic-goals', ng) }, [])

  const logGoal = useCallback((goalId, value) => {
    const today   = todayStr()
    const newLogs = { ...logs, [today]: { ...(logs[today] || {}), [goalId]: value } }
    setLogs(newLogs); storageSet('stoic-logs', newLogs)
    const goal   = goals.find(g => g.id === goalId)
    const prevLog = (logs[today] || {})[goalId]
    if (goal && value && value !== 0 && value !== '0' && value !== '' && (!prevLog || prevLog === 0)) {
      const newXP = { ...virtueXP, [goal.virtue]: (virtueXP[goal.virtue] || 0) + (goal.weight || 1) * 10 }
      setVirtueXP(newXP); storageSet('stoic-virtue-xp', newXP)
    }
  }, [logs, goals, virtueXP])

  const updateSettings = useCallback(ns => { setSettings(ns); storageSet('stoic-settings', ns) }, [])

  if (!loaded) return (
    <div style={{ background: '#080808', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontFamily: 'monospace', letterSpacing: '0.3em', fontSize: '11px' }}>
      LOADING
    </div>
  )

  return (
    <div className="app-root" data-size={settings.textSize}>
      {screen === 'focus' ? (
        <FocusScreen focus={STOIC_CONTENT[focusIdx]} timer={focusTimer} ready={focusReady}
          reflection={reflection} onReflection={setReflection}
          onProceed={handleProceed} reflectionEnabled={settings.reflectionEnabled} />
      ) : (
        <div className="main-app">
          <header className="app-header">
            <span className="app-logo">STOIC</span>
            <span className="app-date">
              {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
            </span>
          </header>
          <div className="tab-content">
            {activeTab === 'log'      && <LogTab      goals={goals} logs={logs} onLog={logGoal} />}
            {activeTab === 'goals'    && <GoalsTab    goals={goals} onUpdate={updateGoals} onAddGoal={() => setAddingGoal(true)} />}
            {activeTab === 'progress' && <ProgressTab goals={goals} logs={logs} virtueXP={virtueXP} />}
            {activeTab === 'settings' && <SettingsTab settings={settings} onUpdate={updateSettings} />}
          </div>
          <nav className="bottom-nav">
            {[
              { id: 'log',      label: 'Log',      Icon: LogIcon },
              { id: 'goals',    label: 'Goals',    Icon: GoalsIcon },
              { id: 'progress', label: 'Progress', Icon: ProgressIcon },
              { id: 'settings', label: 'Settings', Icon: SettingsIcon },
            ].map(({ id, label, Icon }) => (
              <button key={id} className={`nav-item ${activeTab === id ? 'active' : ''}`}
                onClick={() => setActiveTab(id)}>
                <Icon /><span className="nav-label">{label}</span>
              </button>
            ))}
          </nav>

          {/* Wizard mounts as position:fixed inside main-app.
              It is anchored to the viewport directly — no parent can misplace it. */}
          {addingGoal && (
            <AddGoalWizard
              onSave={g => { updateGoals([...goals, g]); setAddingGoal(false) }}
              onCancel={() => setAddingGoal(false)}
            />
          )}
        </div>
      )}
    </div>
  )
}
