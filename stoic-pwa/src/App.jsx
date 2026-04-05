import { useState, useEffect, useCallback } from 'react'
import './styles.css'
import { VIRTUES, STOIC_CONTENT, VIRTUE_LEVELS, TIERS } from './constants.js'
import { todayStr, getWeekDates, getVirtueLevel, calcWeeklyScore, getTier, uid } from './utils.js'
import { storageGet, storageSet } from './storage.js'

// ─── Icons ──────────────────────────────────────────────────────────────────

const LogIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="4" width="18" height="16" rx="1"/>
    <line x1="7" y1="9" x2="17" y2="9"/>
    <line x1="7" y1="13" x2="13" y2="13"/>
  </svg>
)
const GoalsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="12" r="4"/>
    <line x1="12" y1="3" x2="12" y2="5"/>
    <line x1="12" y1="19" x2="12" y2="21"/>
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

// ─── Focus Screen ────────────────────────────────────────────────────────────

function FocusScreen({ focus, timer, ready, reflection, onReflection, onProceed, reflectionEnabled }) {
  const pct = ((12 - timer) / 12) * 100
  return (
    <div className="focus-screen fade-in">
      <div className="focus-bg-glow" />
      <div className="focus-label">
        Daily Focus · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
      </div>
      <blockquote className="focus-quote">"{focus.quote}"</blockquote>
      <div className="focus-author">— {focus.author}</div>
      <div className="focus-divider" />
      <p className="focus-interpretation">{focus.interpretation}</p>
      <p className="focus-prompt">{focus.prompt}</p>
      {reflectionEnabled && (
        <textarea
          className="focus-reflection"
          placeholder="One line. Your answer."
          value={reflection}
          onChange={e => onReflection(e.target.value)}
          maxLength={200}
        />
      )}
      <div className="focus-timer">
        <div className="timer-track">
          <div className="timer-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="timer-count">{timer > 0 ? timer : ''}</span>
      </div>
      <button className="btn-proceed" disabled={!ready} onClick={onProceed}>
        {ready ? 'Proceed' : `${timer}s`}
      </button>
    </div>
  )
}

// ─── Log Tab ─────────────────────────────────────────────────────────────────

function LogTab({ goals, logs, onLog }) {
  const today = todayStr()
  const todayLogs = logs[today] || {}
  const weeklyScore = calcWeeklyScore(goals, logs)
  const tier = getTier(weeklyScore)
  const weekDates = getWeekDates()
  const [animIds, setAnimIds] = useState([])

  const handleBinaryLog = (goalId) => {
    const cur = todayLogs[goalId]
    onLog(goalId, cur ? 0 : 1)
    setAnimIds(p => [...p, goalId])
    setTimeout(() => setAnimIds(p => p.filter(x => x !== goalId)), 300)
  }

  const renderGoals = (subset) => subset.map(goal => {
    const virtue = VIRTUES[goal.virtue] || VIRTUES.courage
    const logged  = todayLogs[goal.id]
    const isAnim  = animIds.includes(goal.id)
    return (
      <div
        key={goal.id}
        className={`goal-item ${logged ? 'logged' : ''}`}
        onClick={() => goal.type !== 'quantitative' && handleBinaryLog(goal.id)}
      >
        <div className="goal-virtue-dot" style={{ background: virtue.color }} />
        <div className="goal-info">
          <div className="goal-name">{goal.name}</div>
          <div className="goal-meta">
            {virtue.label.toUpperCase()} · {(goal.type || 'binary').toUpperCase()}
            {goal.type === 'quantitative' && goal.target_value
              ? ` · TARGET: ${goal.target_value}${goal.unit ? ' ' + goal.unit : ''}`
              : ''}
          </div>
        </div>
        {goal.type === 'quantitative' ? (
          <input
            className="quant-input"
            type="number"
            placeholder="0"
            value={logged || ''}
            onClick={e => e.stopPropagation()}
            onChange={e => onLog(goal.id, e.target.value)}
          />
        ) : (
          <div className={`goal-check ${logged ? 'checked' : ''} ${isAnim ? 'check-pop' : ''}`}>
            {logged ? <CheckIcon /> : null}
          </div>
        )}
      </div>
    )
  })

  const daily    = goals.filter(g => !g.timeframe || g.timeframe === 'daily' || g.timeframe === 'weekly')
  const longTerm = goals.filter(g => g.timeframe === 'monthly' || g.timeframe === 'yearly')

  return (
    <div className="log-tab fade-in">
      {/* Score card */}
      <div className="score-card">
        <div>
          <div className="score-label">Weekly Performance</div>
          <div className="score-value">{weeklyScore}<span className="score-unit">/100</span></div>
          <span className="tier-badge" style={{ color: tier.color, borderColor: tier.color }}>{tier.label}</span>
        </div>
        <div className="week-mini">
          {weekDates.map(d => {
            const di     = new Date(d).getDay()
            const label  = ['S','M','T','W','T','F','S'][di]
            const dLogs  = logs[d] || {}
            const done   = goals.filter(g => {
              const v = dLogs[g.id]
              if (g.type === 'quantitative') return v && parseFloat(v) >= parseFloat(g.target_value || 1)
              return v === 1 || v === true
            }).length
            const isFuture = d > today
            let dotClass = 'streak-dot missed'
            if (isFuture) dotClass = 'streak-dot future'
            else if (done > 0 && done >= goals.length * 0.5) dotClass = 'streak-dot done'
            return (
              <div key={d} className={`week-day ${d === today ? 'today' : ''}`}>
                <span className="week-day-label">{label}</span>
                <div className={dotClass} />
              </div>
            )
          })}
        </div>
      </div>

      <div className="section-header">
        <span className="section-title">Today · {today}</span>
        <span className="section-title" style={{ color: 'var(--text)' }}>
          {Object.keys(todayLogs).filter(k => todayLogs[k]).length}/{daily.length}
        </span>
      </div>

      {goals.length === 0 ? (
        <div className="empty-state">
          <p>No goals defined.</p>
          <p>Add goals in the Goals tab.</p>
        </div>
      ) : renderGoals(daily)}

      {longTerm.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop: 24 }}>
            <span className="section-title">Long-term Goals</span>
          </div>
          {renderGoals(longTerm)}
        </>
      )}
    </div>
  )
}

// ─── Add Goal Modal ──────────────────────────────────────────────────────────

function AddGoalModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    name: '', type: 'binary', virtue: '', timeframe: 'daily', weight: 2, target_value: '', unit: ''
  })
  const valid = form.name.trim() && form.virtue

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">New Goal</div>

        <div className="form-group">
          <label className="form-label">Goal Name</label>
          <input className="form-input" placeholder="e.g. Gym session" value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
        </div>

        <div className="form-group">
          <label className="form-label">Virtue</label>
          <div className="virtue-grid">
            {Object.entries(VIRTUES).map(([key, v]) => (
              <button key={key}
                className={`virtue-btn ${form.virtue === key ? 'selected' : ''}`}
                style={form.virtue === key
                  ? { background: v.color, borderColor: v.color }
                  : { borderColor: v.dim }}
                onClick={() => setForm(p => ({ ...p, virtue: key }))}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-select" value={form.type}
            onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
            <option value="binary">Binary (done / not done)</option>
            <option value="quantitative">Quantitative (numeric target)</option>
            <option value="streak">Streak (daily chain)</option>
          </select>
        </div>

        {form.type === 'quantitative' && (
          <div className="form-group">
            <label className="form-label">Target Value</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" type="number" placeholder="e.g. 10000"
                value={form.target_value}
                onChange={e => setForm(p => ({ ...p, target_value: e.target.value }))}
                style={{ flex: 2 }} />
              <input className="form-input" placeholder="unit (e.g. $)"
                value={form.unit}
                onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                style={{ flex: 1 }} />
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Timeframe</label>
          <select className="form-select" value={form.timeframe}
            onChange={e => setForm(p => ({ ...p, timeframe: e.target.value }))}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Weight (Importance 1–5)</label>
          <div className="weight-row">
            {[1,2,3,4,5].map(w => (
              <button key={w}
                className={`weight-btn ${form.weight === w ? 'selected' : ''}`}
                onClick={() => setForm(p => ({ ...p, weight: w }))}>
                {w}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" disabled={!valid}
            onClick={() => onSave({ ...form, id: uid() })}>
            Add Goal
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Goals Tab ───────────────────────────────────────────────────────────────

function GoalsTab({ goals, onUpdate }) {
  const [showAdd, setShowAdd] = useState(false)

  const handleSave = goal => { onUpdate([...goals, goal]); setShowAdd(false) }
  const handleDelete = id  => onUpdate(goals.filter(g => g.id !== id))

  const byVirtue = Object.keys(VIRTUES).reduce((acc, v) => {
    acc[v] = goals.filter(g => g.virtue === v); return acc
  }, {})

  return (
    <div className="goals-tab fade-in">
      <button className="btn-add" onClick={() => setShowAdd(true)}>+ Add Goal</button>

      {goals.length === 0 ? (
        <div className="empty-state">
          <p>No goals defined.</p>
          <p>Add your first goal above.</p>
        </div>
      ) : (
        Object.entries(byVirtue).map(([key, vGoals]) => {
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
                      {(goal.type || 'binary').toUpperCase()} · {(goal.timeframe || 'daily').toUpperCase()} · WEIGHT {goal.weight}
                      {goal.type === 'quantitative' && goal.target_value
                        ? ` · ${goal.target_value}${goal.unit ? ' ' + goal.unit : ''}`
                        : ''}
                    </div>
                  </div>
                  <button className="btn-delete" onClick={() => handleDelete(goal.id)}>×</button>
                </div>
              ))}
            </div>
          )
        })
      )}

      {showAdd && <AddGoalModal onSave={handleSave} onClose={() => setShowAdd(false)} />}
    </div>
  )
}

// ─── Virtue Tree Card ────────────────────────────────────────────────────────

function VirtueTree({ virtue, xp, goals, logs }) {
  const { current, next, progress } = getVirtueLevel(xp)
  const v = VIRTUES[virtue]
  const relatedGoals = goals.filter(g => g.virtue === virtue)
  const todayLogs    = logs[todayStr()] || {}
  const completedToday = relatedGoals.filter(g => {
    const val = todayLogs[g.id]
    if (g.type === 'quantitative') return val && parseFloat(val) >= parseFloat(g.target_value || 1)
    return val === 1 || val === true
  }).length

  return (
    <div className="virtue-tree-card" style={{ borderColor: xp > 0 ? v.dim : 'var(--border)' }}>
      <div className="virtue-tree-header">
        <span className="virtue-tree-name" style={{ color: v.color }}>{v.label}</span>
        <span style={{
          marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)',
          color: 'var(--text-dim)', letterSpacing: '0.1em'
        }}>
          {relatedGoals.length > 0 ? `${completedToday}/${relatedGoals.length} today` : 'no goals'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 8 }}>
        <span className="virtue-tree-level" style={{ color: xp > 0 ? v.color : 'var(--text-dim)' }}>
          {current.level}
        </span>
        <div style={{ flex: 1 }}>
          <div className="virtue-tree-title">{current.title}</div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%`, background: v.color }} />
          </div>
          <div className="progress-meta">
            <span>{xp} XP</span>
            {next ? <span>→ {next.title} · {next.threshold} XP</span> : <span>Mastery achieved</span>}
          </div>
        </div>
      </div>
      <div className="level-nodes">
        {VIRTUE_LEVELS.map(lvl => (
          <div key={lvl.level}
            className={`level-node ${lvl.level <= current.level ? 'reached' : ''}`}
            title={`Level ${lvl.level}: ${lvl.title}`}
            style={lvl.level <= current.level
              ? { background: v.color, borderColor: v.color }
              : lvl.level === current.level + 1 ? { borderColor: v.dim } : {}}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Progress Tab ────────────────────────────────────────────────────────────

function ProgressTab({ goals, logs, virtueXP }) {
  const weeklyScore = calcWeeklyScore(goals, logs)
  const tier  = getTier(weeklyScore)
  const week  = getWeekDates()
  const today = todayStr()
  const totalXP = Object.values(virtueXP).reduce((a, b) => a + b, 0)
  const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

  const dayScores = week.map(date => {
    if (date > today || !goals.length) return null
    let total = 0, earned = 0
    goals.forEach(g => {
      const w = g.weight || 1
      total += w
      const val = (logs[date] || {})[g.id]
      if (g.type === 'quantitative') {
        if (val && parseFloat(val) >= parseFloat(g.target_value || 1)) earned += w
        else if (val && parseFloat(val) > 0) earned += w * (parseFloat(val) / parseFloat(g.target_value || 1))
      } else {
        if (val === 1 || val === true) earned += w
      }
    })
    return total > 0 ? Math.round((earned / total) * 100) : 0
  })

  return (
    <div className="progress-tab fade-in">
      <div className="score-card">
        <div>
          <div className="score-label">Weekly Score</div>
          <div className="score-value">{weeklyScore}<span className="score-unit">/100</span></div>
          <span className="tier-badge" style={{ color: tier.color, borderColor: tier.color }}>{tier.label}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="score-label">Total XP</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 300, color: 'var(--gold)' }}>
            {totalXP}
          </div>
        </div>
      </div>

      <div className="section-header" style={{ marginTop: 4, marginBottom: 8 }}>
        <span className="section-title">This Week</span>
      </div>
      <div className="week-grid">
        {week.map((d, i) => {
          const score    = dayScores[i]
          const isFuture = d > today
          const isToday  = d === today
          const di       = new Date(d).getDay()
          const label    = dayLabels[di === 0 ? 6 : di - 1]
          return (
            <div key={d} className={`week-cell ${isToday ? 'today' : ''}`}>
              <span className="day-label">{label}</span>
              {!isFuture && score !== null ? (
                <span className="day-score"
                  style={{ color: score >= 70 ? 'var(--gold)' : score >= 40 ? 'var(--text)' : 'var(--dim)' }}>
                  {score}
                </span>
              ) : (
                <span className="day-score" style={{ color: 'var(--border)' }}>—</span>
              )}
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

// ─── Settings Tab ────────────────────────────────────────────────────────────

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
              <button key={s}
                className={`select-chip ${settings.textSize === s ? 'active' : ''}`}
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
          <button
            className={`toggle ${settings.reflectionEnabled ? 'on' : ''}`}
            onClick={() => set('reflectionEnabled', !settings.reflectionEnabled)}
          />
        </div>
        <div className="settings-row">
          <span className="settings-label">Reopen Focus Screen</span>
          <button className="select-chip" onClick={async () => {
            await storageSet('stoic-focus-date', '')
            window.location.reload()
          }}>Reset</button>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Data</div>
        <div className="settings-row">
          <span className="settings-label">Reset All Progress</span>
          <button
            className="select-chip"
            style={{ color: '#b55', borderColor: '#b55' }}
            onClick={async () => {
              if (window.confirm('Reset all data? This cannot be undone.')) {
                await storageSet('stoic-goals',     [])
                await storageSet('stoic-logs',      {})
                await storageSet('stoic-virtue-xp', { courage: 0, wisdom: 0, temperance: 0, justice: 0 })
                await storageSet('stoic-focus-date','')
                window.location.reload()
              }
            }}>
            Clear
          </button>
        </div>
      </div>

      <div className="app-version">STOIC · v1.0.0 · Performance &amp; Discipline System</div>
    </div>
  )
}

// ─── Root App ────────────────────────────────────────────────────────────────

export default function App() {
  const [loaded,    setLoaded]    = useState(false)
  const [screen,    setScreen]    = useState('focus')
  const [activeTab, setActiveTab] = useState('log')
  const [goals,     setGoals]     = useState([])
  const [logs,      setLogs]      = useState({})
  const [virtueXP,  setVirtueXP]  = useState({ courage: 0, wisdom: 0, temperance: 0, justice: 0 })
  const [settings,  setSettings]  = useState({ theme: 'dark', textSize: 'medium', reflectionEnabled: true })
  const [focusTimer, setFocusTimer] = useState(12)
  const [focusReady, setFocusReady] = useState(false)
  const [reflection, setReflection] = useState('')
  const [focusIdx,   setFocusIdx]   = useState(0)

  // Load persisted data
  useEffect(() => {
    async function load() {
      const [g, l, xp, fd, s] = await Promise.all([
        storageGet('stoic-goals',     []),
        storageGet('stoic-logs',      {}),
        storageGet('stoic-virtue-xp', { courage: 0, wisdom: 0, temperance: 0, justice: 0 }),
        storageGet('stoic-focus-date',''),
        storageGet('stoic-settings',  { theme: 'dark', textSize: 'medium', reflectionEnabled: true }),
      ])
      setGoals(g); setLogs(l); setVirtueXP(xp); setSettings(s)
      const today = todayStr()
      const hash  = today.split('-').reduce((a, n) => a + parseInt(n), 0)
      setFocusIdx(hash % STOIC_CONTENT.length)
      if (fd === today) setScreen('main')
      setLoaded(true)
    }
    load()
  }, [])

  // Countdown timer
  useEffect(() => {
    if (screen !== 'focus' || !loaded || focusTimer <= 0) {
      if (focusTimer <= 0) setFocusReady(true)
      return
    }
    const t = setTimeout(() => setFocusTimer(v => v - 1), 1000)
    return () => clearTimeout(t)
  }, [screen, focusTimer, loaded])

  const handleProceed = useCallback(async () => {
    const today = todayStr()
    await storageSet('stoic-focus-date', today)
    setScreen('main')
  }, [])

  const updateGoals = useCallback(async (ng) => {
    setGoals(ng)
    await storageSet('stoic-goals', ng)
  }, [])

  const logGoal = useCallback(async (goalId, value) => {
    const today   = todayStr()
    const newLogs = { ...logs, [today]: { ...(logs[today] || {}), [goalId]: value } }
    setLogs(newLogs)
    await storageSet('stoic-logs', newLogs)

    // Award XP once per goal per day
    const goal = goals.find(g => g.id === goalId)
    if (goal && value && value !== 0 && value !== '0' && value !== '') {
      const prevLogged = (logs[today] || {})[goalId]
      if (!prevLogged || prevLogged === 0) {
        const xpGain = (goal.weight || 1) * 10
        const newXP  = { ...virtueXP, [goal.virtue]: (virtueXP[goal.virtue] || 0) + xpGain }
        setVirtueXP(newXP)
        await storageSet('stoic-virtue-xp', newXP)
      }
    }
  }, [logs, goals, virtueXP])

  const updateSettings = useCallback(async (ns) => {
    setSettings(ns)
    await storageSet('stoic-settings', ns)
  }, [])

  if (!loaded) {
    return (
      <div style={{
        background: '#080808', height: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: '#333', fontFamily: 'monospace', letterSpacing: '0.3em', fontSize: '11px'
      }}>
        LOADING
      </div>
    )
  }

  return (
    <div data-size={settings.textSize}>
      {screen === 'focus' ? (
        <FocusScreen
          focus={STOIC_CONTENT[focusIdx]}
          timer={focusTimer}
          ready={focusReady}
          reflection={reflection}
          onReflection={setReflection}
          onProceed={handleProceed}
          reflectionEnabled={settings.reflectionEnabled}
        />
      ) : (
        <div className="main-app">
          <header className="app-header">
            <span className="app-logo">STOIC</span>
            <span className="app-date">
              {new Date().toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric'
              }).toUpperCase()}
            </span>
          </header>

          <div className="tab-content">
            {activeTab === 'log'      && <LogTab      goals={goals} logs={logs} onLog={logGoal} />}
            {activeTab === 'goals'    && <GoalsTab    goals={goals} onUpdate={updateGoals} />}
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
              <button
                key={id}
                className={`nav-item ${activeTab === id ? 'active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                <Icon />
                <span className="nav-label">{label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
    </div>
  )
}
