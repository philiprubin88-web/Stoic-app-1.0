import { useState, useEffect, useCallback } from 'react'
import './styles.css'
import { VIRTUES, STOIC_CONTENT, VIRTUE_LEVELS } from './constants.js'
import { todayStr, getWeekDates, getVirtueLevel, calcWeeklyScore, getTier, uid } from './utils.js'
import { storageGet, storageSet } from './storage.js'

// ─── Icons ───────────────────────────────────────────────────────────────────

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

// ─── Module-level constants ───────────────────────────────────────────────────
// These never change and are hoisted here to avoid recomputation on re-renders.

// Duration in seconds the user must view the daily focus before proceeding.
const FOCUS_TIMER_SECONDS = 12

// Static nav tab definitions — icons are stable component references.
const NAV_TABS = [
  { id: 'log',      label: 'Log',      Icon: LogIcon },
  { id: 'goals',    label: 'Goals',    Icon: GoalsIcon },
  { id: 'progress', label: 'Progress', Icon: ProgressIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
]

// ─── StoicBackground pre-computed geometry ────────────────────────────────────
// Compass tick endpoints: 8 evenly-spaced points on the outer ring of the
// cosmic wheel, each tick spanning from r=272 to r=284 in the SVG coordinate
// space (viewBox 0 0 480 860, wheel centred at 240,430).
const BACKGROUND_TICKS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i * 45 * Math.PI) / 180
  const cx = 240, cy = 430
  return {
    x1: cx + 272 * Math.sin(angle),
    y1: cy - 272 * Math.cos(angle),
    x2: cx + 284 * Math.sin(angle),
    y2: cy - 284 * Math.cos(angle),
  }
})

// Greek meander (key) border pattern rendered as a single SVG path string.
// Alternating step directions create the classic interlocking key motif.
// 26 units × 18px stride covers the full 480px viewBox width.
const BACKGROUND_MEANDER = Array.from({ length: 26 }, (_, i) => {
  const x = i * 18 - 2
  const y = 14
  const s = 6   // step size in px
  return i % 2 === 0
    ? `M${x},${y+s} L${x},${y} L${x+s},${y} L${x+s},${y+s} L${x+2*s},${y+s}`
    : `M${x},${y} L${x+s},${y} L${x+s},${y+s} L${x+2*s},${y+s} L${x+2*s},${y}`
}).join(' ')

// ─── Stoic Background ────────────────────────────────────────────────────────
// Purely decorative SVG layer rendered behind all tab content and the focus
// screen. Uses pre-computed module-level constants so it never recomputes
// geometry on re-renders. aria-hidden keeps it invisible to screen readers.

function StoicBackground() {
  const gold = '#c9a84c'
  return (
    <div className="stoic-bg" aria-hidden="true">
      <svg
        width="100%" height="100%"
        viewBox="0 0 480 860"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* ── Meander border strip at top ── */}
        <g opacity="0.100" stroke={gold} fill="none" strokeWidth="0.7">
          <line x1="0" y1="4"  x2="480" y2="4"  strokeWidth="0.4"/>
          <path d={BACKGROUND_MEANDER}/>
          <line x1="0" y1="28" x2="480" y2="28" strokeWidth="0.4"/>
        </g>

        {/* ── Cosmic wheel (Logos) — concentric rings + axes + compass marks ── */}
        <g opacity="0.100" stroke={gold} fill="none">
          <circle cx="240" cy="430" r="282" strokeWidth="0.7"/>
          <circle cx="240" cy="430" r="204" strokeWidth="0.5"/>
          <circle cx="240" cy="430" r="126" strokeWidth="0.45"/>
          <circle cx="240" cy="430" r="48"  strokeWidth="0.45"/>
          {/* Cardinal cross */}
          <line x1="240" y1="100" x2="240" y2="760" strokeWidth="0.4"/>
          <line x1="-60" y1="430" x2="540" y2="430" strokeWidth="0.4"/>
          {/* Diagonal axes */}
          <line x1="40"  y1="190" x2="440" y2="670" strokeWidth="0.25"/>
          <line x1="440" y1="190" x2="40"  y2="670" strokeWidth="0.25"/>
          {/* Compass tick marks — 8 positions pre-computed at module load */}
          {BACKGROUND_TICKS.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} strokeWidth="1.8"/>
          ))}
          {/* Centre diamond */}
          <path d="M240,418 L249,430 L240,442 L231,430 Z" strokeWidth="0.5"/>
        </g>

        {/* ── Left Doric column ── */}
        {/* Shaft starts at y=500 and spans 230px down; capital sits above, plinth below.
            Positioned at x=22 (not x=0) to avoid clipping at the SVG viewBox boundary
            when the SVG is scaled to fill a screen narrower than 480px. */}
        <g opacity="0.100" fill={gold}>
          <rect x="22"  y="500" width="20" height="230"/>   {/* shaft */}
          <rect x="17"  y="728" width="30" height="6"/>     {/* base plinth upper */}
          <rect x="14"  y="733" width="36" height="5"/>     {/* base plinth lower */}
          <rect x="17"  y="492" width="30" height="8"/>     {/* capital echinus */}
          <rect x="14"  y="484" width="36" height="10"/>    {/* capital abacus */}
          {/* Fluting: dark vertical grooves carved into the shaft */}
          <rect x="27"  y="500" width="1.2" height="228" fill="#080808" opacity="0.6"/>
          <rect x="32"  y="500" width="1.2" height="228" fill="#080808" opacity="0.6"/>
          <rect x="37"  y="500" width="1.2" height="228" fill="#080808" opacity="0.6"/>
        </g>

        {/* ── Right Doric column — mirror of left at x=458 axis ── */}
        <g opacity="0.100" fill={gold}>
          <rect x="438" y="500" width="20" height="230"/>
          <rect x="433" y="728" width="30" height="6"/>
          <rect x="430" y="733" width="36" height="5"/>
          <rect x="433" y="492" width="30" height="8"/>
          <rect x="430" y="484" width="36" height="10"/>
          <rect x="443" y="500" width="1.2" height="228" fill="#080808" opacity="0.6"/>
          <rect x="448" y="500" width="1.2" height="228" fill="#080808" opacity="0.6"/>
          <rect x="453" y="500" width="1.2" height="228" fill="#080808" opacity="0.6"/>
        </g>

        {/* ── ΛΟΓΟΣ watermark — Stoic concept of universal rational order (Logos) ── */}
        <text
          x="240" y="442"
          textAnchor="middle"
          fill={gold}
          opacity="0.100"
          fontSize="64"
          letterSpacing="24"
          fontFamily="Georgia, serif"
          fontStyle="italic"
          fontWeight="300"
        >ΛΟΓΟΣ</text>
      </svg>
    </div>
  )
}

// ─── Focus Screen ─────────────────────────────────────────────────────────────
// Shown once per day before the main app. Displays the daily Stoic quote with a
// mandatory read timer (FOCUS_TIMER_SECONDS). An optional reflection textarea
// lets the user record their response before proceeding.

function FocusScreen({ focus, timer, ready, reflection, onReflection, onProceed, reflectionEnabled }) {
  // Progress percentage for the countdown bar (fills left-to-right as time elapses)
  const pct = ((FOCUS_TIMER_SECONDS - timer) / FOCUS_TIMER_SECONDS) * 100
  return (
    <div className="focus-screen fade-in">
      <StoicBackground />
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

// ─── Log Tab ──────────────────────────────────────────────────────────────────

function LogTab({ goals, logs, onLog }) {
  const today     = todayStr()
  const todayLogs = logs[today] || {}
  const score     = calcWeeklyScore(goals, logs)
  const tier      = getTier(score)
  const weekDates = getWeekDates()
  const [animIds, setAnimIds] = useState([])

  // Toggle a binary/streak goal for today and trigger the check-pop animation.
  // The 300ms timeout matches the CSS animation duration. In React 18 a setState
  // call after unmount (e.g. user switches tabs mid-animation) silently no-ops,
  // so no explicit cleanup ref is required for this short duration.
  const tap = (goalId) => {
    const cur = todayLogs[goalId]
    onLog(goalId, cur ? 0 : 1)
    setAnimIds(p => [...p, goalId])
    setTimeout(() => setAnimIds(p => p.filter(x => x !== goalId)), 300)
  }

  const renderGoal = (goal) => {
    const virtue = VIRTUES[goal.virtue] || VIRTUES.courage
    const logged = todayLogs[goal.id]
    const isAnim = animIds.includes(goal.id)
    return (
      <div key={goal.id}
        className={`goal-item ${logged ? 'logged' : ''}`}
        onClick={() => goal.type !== 'quantitative' && tap(goal.id)}
      >
        <div className="goal-virtue-dot" style={{ background: virtue.color }} />
        <div className="goal-info">
          <div className="goal-name">{goal.name}</div>
          <div className="goal-meta">
            {virtue.label.toUpperCase()} · {(goal.type || 'binary').toUpperCase()}
            {goal.type === 'quantitative' && goal.target_value
              ? ` · ${goal.target_value}${goal.unit ? ' ' + goal.unit : ''}`
              : ''}
          </div>
        </div>
        {goal.type === 'quantitative' ? (
          <input className="quant-input" type="number" inputMode="decimal"
            placeholder="0" value={logged || ''}
            onClick={e => e.stopPropagation()}
            onChange={e => onLog(goal.id, e.target.value)} />
        ) : (
          <div className={`goal-check ${logged ? 'checked' : ''} ${isAnim ? 'check-pop' : ''}`}>
            {logged ? <CheckIcon /> : null}
          </div>
        )}
      </div>
    )
  }

  const daily    = goals.filter(g => !g.timeframe || g.timeframe === 'daily' || g.timeframe === 'weekly')
  const longTerm = goals.filter(g => g.timeframe === 'monthly' || g.timeframe === 'yearly')

  // Count completions only for goals that still exist. Log entries for deleted
  // goals persist in localStorage (intentional — preserves history), so we
  // must filter by the current active goal IDs to avoid inflating the count.
  const activeGoalIds = new Set(goals.map(g => g.id))
  const doneCount = Object.keys(todayLogs).filter(
    k => activeGoalIds.has(k) && todayLogs[k] && todayLogs[k] !== '0'
  ).length

  return (
    <div className="log-tab fade-in">
      <div className="score-card">
        <div>
          <div className="score-label">Weekly Performance</div>
          <div className="score-value">{score}<span className="score-unit">/100</span></div>
          <span className="tier-badge" style={{ color: tier.color, borderColor: tier.color }}>
            {tier.label}
          </span>
        </div>
        <div className="week-mini">
          {weekDates.map(d => {
            const di    = new Date(d).getDay()
            const label = ['S','M','T','W','T','F','S'][di]
            const dLogs = logs[d] || {}
            const done  = goals.filter(g => {
              const v = dLogs[g.id]
              if (g.type === 'quantitative') return v && parseFloat(v) >= parseFloat(g.target_value || 1)
              return v === 1 || v === true
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
        <span className="section-title" style={{ color: 'var(--text)' }}>
          {doneCount}/{daily.length}
        </span>
      </div>

      {goals.length === 0 ? (
        <div className="empty-state">
          <p>No goals defined.</p>
          <p>Add goals in the Goals tab.</p>
        </div>
      ) : daily.map(renderGoal)}

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

// ─── Add Goal Modal ───────────────────────────────────────────────────────────

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
          <input className="form-input" placeholder="e.g. Gym session"
            value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
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
              <input className="form-input" type="number" inputMode="decimal"
                placeholder="e.g. 10000" value={form.target_value}
                onChange={e => setForm(p => ({ ...p, target_value: e.target.value }))}
                style={{ flex: 2 }} />
              <input className="form-input" placeholder="unit"
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
          <label className="form-label">Importance (1 – 5)</label>
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

// ─── Goals Tab ────────────────────────────────────────────────────────────────

function GoalsTab({ goals, onUpdate }) {
  const [showAdd, setShowAdd] = useState(false)
  const save   = g  => { onUpdate([...goals, g]); setShowAdd(false) }
  const remove = id => onUpdate(goals.filter(g => g.id !== id))
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
      ) : Object.entries(byVirtue).map(([key, vGoals]) => {
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
                    {(goal.type || 'binary').toUpperCase()} · {(goal.timeframe || 'daily').toUpperCase()} · WT {goal.weight}
                    {goal.type === 'quantitative' && goal.target_value
                      ? ` · ${goal.target_value}${goal.unit ? ' ' + goal.unit : ''}`
                      : ''}
                  </div>
                </div>
                <button className="btn-delete" onClick={() => remove(goal.id)}>×</button>
              </div>
            ))}
          </div>
        )
      })}
      {showAdd && <AddGoalModal onSave={save} onClose={() => setShowAdd(false)} />}
    </div>
  )
}

// ─── Virtue Tree ──────────────────────────────────────────────────────────────

function VirtueTree({ virtue, xp, goals, logs }) {
  const { current, next, progress } = getVirtueLevel(xp)
  const v            = VIRTUES[virtue]
  const related      = goals.filter(g => g.virtue === virtue)
  const todayLogs    = logs[todayStr()] || {}
  const doneToday    = related.filter(g => {
    const val = todayLogs[g.id]
    if (g.type === 'quantitative') return val && parseFloat(val) >= parseFloat(g.target_value || 1)
    return val === 1 || val === true
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
        <span className="virtue-tree-level" style={{ color: xp > 0 ? v.color : 'var(--dim)' }}>
          {current.level}
        </span>
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
              : lvl.level === current.level + 1 ? { borderColor: v.dim } : {}}
          />
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
        else if (val && parseFloat(val) > 0)
          earned += w * (parseFloat(val) / parseFloat(g.target_value || 1))
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
          <div className="score-value">{score}<span className="score-unit">/100</span></div>
          <span className="tier-badge" style={{ color: tier.color, borderColor: tier.color }}>
            {tier.label}
          </span>
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
          // Rename to dayScore to avoid shadowing the outer `score` (weekly aggregate)
          const dayScore = dayScores[i]
          const isFuture = d > today
          const isToday  = d === today
          const di       = new Date(d).getDay()
          const label    = dayNames[di === 0 ? 6 : di - 1]
          return (
            <div key={d} className={`week-cell ${isToday ? 'today' : ''}`}>
              <span className="day-label">{label}</span>
              {!isFuture && dayScore !== null ? (
                <span className="day-score"
                  style={{ color: dayScore >= 70 ? 'var(--gold)' : dayScore >= 40 ? 'var(--text)' : 'var(--dim)' }}>
                  {dayScore}
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
          <button className={`toggle ${settings.reflectionEnabled ? 'on' : ''}`}
            onClick={() => set('reflectionEnabled', !settings.reflectionEnabled)} />
        </div>
        <div className="settings-row">
          <span className="settings-label">Reopen Focus Screen</span>
          <button className="select-chip" onClick={() => {
            storageSet('stoic-focus-date', '')
            window.location.reload()
          }}>Reset</button>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Data</div>
        <div className="settings-row">
          <span className="settings-label">Reset All Progress</span>
          <button className="select-chip" style={{ color: '#b55', borderColor: '#b55' }}
            onClick={() => {
              if (window.confirm('Reset all data? This cannot be undone.')) {
                storageSet('stoic-goals',     [])
                storageSet('stoic-logs',      {})
                storageSet('stoic-virtue-xp', { courage: 0, wisdom: 0, temperance: 0, justice: 0 })
                storageSet('stoic-focus-date','')
                window.location.reload()
              }
            }}>
            Clear
          </button>
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
  settings: {
    // theme: planned for future dark/light toggle — not yet applied anywhere in CSS.
    // Kept in DEFAULTS so it persists to localStorage and is available when implemented.
    theme:              'dark',
    textSize:           'medium',
    reflectionEnabled:  true,
  },
}

export default function App() {
  const [loaded,     setLoaded]     = useState(false)
  const [screen,     setScreen]     = useState('focus')
  const [activeTab,  setActiveTab]  = useState('log')
  const [goals,      setGoals]      = useState(DEFAULTS.goals)
  const [logs,       setLogs]       = useState(DEFAULTS.logs)
  const [virtueXP,   setVirtueXP]   = useState(DEFAULTS.virtueXP)
  const [settings,   setSettings]   = useState(DEFAULTS.settings)
  const [focusTimer, setFocusTimer] = useState(FOCUS_TIMER_SECONDS)
  const [focusReady, setFocusReady] = useState(false)
  const [reflection, setReflection] = useState('')
  const [focusIdx,   setFocusIdx]   = useState(0)

  // Load persisted data from localStorage on first mount.
  useEffect(() => {
    const g   = storageGet('stoic-goals',     DEFAULTS.goals)
    const l   = storageGet('stoic-logs',      DEFAULTS.logs)
    const xp  = storageGet('stoic-virtue-xp', DEFAULTS.virtueXP)
    const fd  = storageGet('stoic-focus-date','')
    // Spread DEFAULTS.settings first so any keys added after a user's initial
    // install (e.g. reflectionEnabled added in a later version) always have a
    // default value rather than landing as undefined.
    const s   = { ...DEFAULTS.settings, ...storageGet('stoic-settings', {}) }

    setGoals(g); setLogs(l); setVirtueXP(xp); setSettings(s)

    // Deterministically pick today's quote: sum of YYYY + MM + DD digits.
    // Adjacent days differ by 1, so the quote rotates daily without randomness.
    const today = todayStr()
    const hash  = today.split('-').reduce((a, n) => a + parseInt(n, 10), 0)
    setFocusIdx(hash % STOIC_CONTENT.length)

    // Skip focus screen if the user has already passed through it today.
    if (fd === today) setScreen('main')
    setLoaded(true)
  }, [])

  // Countdown timer — decrements once per second while focus screen is active.
  // Stops at 0 and flips focusReady to unlock the Proceed button.
  useEffect(() => {
    if (screen !== 'focus' || !loaded) return
    if (focusTimer <= 0) { setFocusReady(true); return }
    const t = setTimeout(() => setFocusTimer(v => v - 1), 1000)
    return () => clearTimeout(t)
  }, [screen, focusTimer, loaded])

  // Stamp today's date into localStorage so the focus screen is skipped for the rest of the day.
  const handleProceed = useCallback(() => {
    storageSet('stoic-focus-date', todayStr())
    setScreen('main')
  }, [])

  // Persist goals to localStorage and update React state atomically.
  const updateGoals = useCallback(ng => {
    setGoals(ng)
    storageSet('stoic-goals', ng)
  }, [])

  // Log a goal value for today and award XP on the first completion of the day.
  // XP = goal weight × 10. Only awarded once per goal per day (not on unchecks).
  const logGoal = useCallback((goalId, value) => {
    const today    = todayStr()
    const newLogs  = { ...logs, [today]: { ...(logs[today] || {}), [goalId]: value } }
    setLogs(newLogs)
    storageSet('stoic-logs', newLogs)

    const goal      = goals.find(g => g.id === goalId)
    const prevLogged = (logs[today] || {})[goalId]
    const isCompletion = value && value !== 0 && value !== '0' && value !== ''
    const wasAlreadyLogged = prevLogged && prevLogged !== 0

    if (goal && isCompletion && !wasAlreadyLogged) {
      const xpGain = (goal.weight || 1) * 10
      const newXP  = { ...virtueXP, [goal.virtue]: (virtueXP[goal.virtue] || 0) + xpGain }
      setVirtueXP(newXP)
      storageSet('stoic-virtue-xp', newXP)
    }
  }, [logs, goals, virtueXP])

  // Persist settings changes immediately so they survive a reload.
  const updateSettings = useCallback(ns => {
    setSettings(ns)
    storageSet('stoic-settings', ns)
  }, [])

  // Show a minimal loading shell while localStorage is being read.
  // This prevents a flash of default state before stored data is applied.
  if (!loaded) return (
    <div style={{
      background: '#080808', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#333', fontFamily: 'monospace', letterSpacing: '0.3em', fontSize: '11px'
    }}>
      LOADING
    </div>
  )

  return (
    <div style={{ height: '100%' }} data-size={settings.textSize}>
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
          <StoicBackground />
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

          {/* NAV_TABS is a module-level constant — avoids re-allocating the array on every render. */}
          <nav className="bottom-nav">
            {NAV_TABS.map(({ id, label, Icon }) => (
              <button key={id}
                className={`nav-item ${activeTab === id ? 'active' : ''}`}
                onClick={() => setActiveTab(id)}>
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
