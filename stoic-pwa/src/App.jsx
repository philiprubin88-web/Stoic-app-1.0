import { useState, useEffect, useCallback } from 'react'
import './styles.css'
import { VIRTUES, STOIC_CONTENT, VIRTUE_LEVELS } from './constants.js'
import {
  todayStr, getWeekDates, getVirtueLevel, calcWeeklyScore, getTier, uid, freqLabel,
  calcConsistencyRate, getTransformationStage,
  detectBurnout, pickWeeklyChallenge, challengeDaysRemaining, challengeIsExpired, challengeIsComplete,
} from './utils.js'
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

const FOCUS_TIMER_SECONDS = 12

const NAV_TABS = [
  { id: 'log',      label: 'Log',      Icon: LogIcon },
  { id: 'goals',    label: 'Goals',    Icon: GoalsIcon },
  { id: 'progress', label: 'Progress', Icon: ProgressIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
]

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

const BACKGROUND_MEANDER = Array.from({ length: 26 }, (_, i) => {
  const x = i * 18 - 2
  const y = 14
  const s = 6
  return i % 2 === 0
    ? `M${x},${y+s} L${x},${y} L${x+s},${y} L${x+s},${y+s} L${x+2*s},${y+s}`
    : `M${x},${y} L${x+s},${y} L${x+s},${y+s} L${x+2*s},${y+s} L${x+2*s},${y}`
}).join(' ')

// ─── Stoic Background ────────────────────────────────────────────────────────

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
        <g opacity="0.100" stroke={gold} fill="none" strokeWidth="0.7">
          <line x1="0" y1="4"  x2="480" y2="4"  strokeWidth="0.4"/>
          <path d={BACKGROUND_MEANDER}/>
          <line x1="0" y1="28" x2="480" y2="28" strokeWidth="0.4"/>
        </g>
        <g opacity="0.100" stroke={gold} fill="none">
          <circle cx="240" cy="430" r="282" strokeWidth="0.7"/>
          <circle cx="240" cy="430" r="204" strokeWidth="0.5"/>
          <circle cx="240" cy="430" r="126" strokeWidth="0.45"/>
          <circle cx="240" cy="430" r="48"  strokeWidth="0.45"/>
          <line x1="240" y1="100" x2="240" y2="760" strokeWidth="0.4"/>
          <line x1="-60" y1="430" x2="540" y2="430" strokeWidth="0.4"/>
          <line x1="40"  y1="190" x2="440" y2="670" strokeWidth="0.25"/>
          <line x1="440" y1="190" x2="40"  y2="670" strokeWidth="0.25"/>
          {BACKGROUND_TICKS.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} strokeWidth="1.8"/>
          ))}
          <path d="M240,418 L249,430 L240,442 L231,430 Z" strokeWidth="0.5"/>
        </g>
        <g opacity="0.100" fill={gold}>
          <rect x="22"  y="500" width="20" height="230"/>
          <rect x="17"  y="728" width="30" height="6"/>
          <rect x="14"  y="733" width="36" height="5"/>
          <rect x="17"  y="492" width="30" height="8"/>
          <rect x="14"  y="484" width="36" height="10"/>
          <rect x="27"  y="500" width="1.2" height="228" fill="#080808" opacity="0.6"/>
          <rect x="32"  y="500" width="1.2" height="228" fill="#080808" opacity="0.6"/>
          <rect x="37"  y="500" width="1.2" height="228" fill="#080808" opacity="0.6"/>
        </g>
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

function FocusScreen({ focus, timer, ready, reflection, onReflection, onProceed, reflectionEnabled }) {
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

// ─── Transformation Avatar SVG ────────────────────────────────────────────────
// Renders an evolving humanoid figure in 10 stages (0–9).
// Visual parameters — opacity, posture, glow, radiance — interpolate by stage.

function TransformationAvatar({ stage }) {
  const gold = '#c9a84c'
  const opacity = Math.min(1, 0.10 + (stage / 9) * 0.90)
  const sw = stage >= 7 ? 1.8 : stage >= 4 ? 1.3 : 1.0  // stroke weight

  // Glow ellipse behind figure
  const glowOpacity = stage >= 3 ? Math.min(0.18, (stage - 3) * 0.026) : 0
  const glowRx = 18 + stage * 5
  const glowRy = 12 + stage * 3

  const isHunched  = stage < 3
  const isUpright  = stage >= 3 && stage < 7
  const isRadiant  = stage >= 7

  // Void stage (0): scattered faint particles only
  if (stage === 0) {
    return (
      <svg viewBox="0 0 140 160" width="140" height="160" aria-hidden="true">
        {[
          [40, 60], [100, 45], [70, 30], [30, 100], [110, 90],
          [55, 130], [88, 120], [20, 75], [120, 60],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.2" fill={gold} opacity={0.08 + (i % 3) * 0.04} />
        ))}
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 140 160" width="140" height="160" aria-hidden="true">
      {/* Background glow */}
      {glowOpacity > 0 && (
        <ellipse cx="70" cy="95" rx={glowRx} ry={glowRy}
          fill={gold} opacity={glowOpacity}
          style={{ filter: 'blur(6px)' }} />
      )}

      {/* Outer ring — mastery only */}
      {stage === 9 && (
        <circle cx="70" cy="28" r="20" stroke={gold} strokeWidth="0.5"
          fill="none" opacity="0.3" />
      )}

      {/* Radiance lines around head — stage 8+ */}
      {stage >= 8 && Array.from({ length: 8 }, (_, i) => {
        const a = (i * 45 - 90) * Math.PI / 180
        const r1 = 18, r2 = 30
        return (
          <line key={i}
            x1={70 + r1 * Math.cos(a)} y1={28 + r1 * Math.sin(a)}
            x2={70 + r2 * Math.cos(a)} y2={28 + r2 * Math.sin(a)}
            stroke={gold} strokeWidth="0.8" opacity="0.45" />
        )
      })}

      {/* Figure */}
      <g opacity={opacity} stroke={gold} strokeWidth={sw} fill="none" strokeLinecap="round">

        {/* ── Hunched (stages 1–2) ── */}
        {isHunched && (
          <g transform="translate(0,10)">
            {/* Head — lower, angled */}
            <circle cx="65" cy="28" r="10" />
            {/* Neck into curved spine */}
            <path d="M65,38 C61,50 57,60 60,72" strokeWidth={sw} />
            {/* Shoulders — uneven */}
            <line x1="48" y1="50" x2="82" y2="44" />
            {/* Arms hanging */}
            <line x1="48" y1="50" x2="40" y2="74" />
            <line x1="82" y1="44" x2="80" y2="68" />
            {/* Legs — narrow, close */}
            <line x1="60" y1="72" x2="52" y2="100" />
            <line x1="60" y1="72" x2="66" y2="100" />
          </g>
        )}

        {/* ── Upright (stages 3–6) ── */}
        {isUpright && (
          <>
            <circle cx="70" cy="28" r="10" />
            {/* Spine */}
            <line x1="70" y1="38" x2="70" y2="78" strokeWidth={sw * 1.1} />
            {/* Shoulders — widening with stage */}
            <line x1={64 - stage * 1.5} y1="48" x2={76 + stage * 1.5} y2="48" />
            {/* Arms */}
            <line x1={64 - stage * 1.5} y1="48" x2={56 - stage * 1.5} y2="72" />
            <line x1={76 + stage * 1.5} y1="48" x2={84 + stage * 1.5} y2="72" />
            {/* Legs — growing confidence in stance */}
            <line x1="70" y1="78" x2={58 - stage} y2="108" />
            <line x1="70" y1="78" x2={82 + stage} y2="108" />
          </>
        )}

        {/* ── Radiant (stages 7–9) ── */}
        {isRadiant && (
          <>
            <circle cx="70" cy="26" r="11" strokeWidth={sw} />
            {/* Spine */}
            <line x1="70" y1="37" x2="70" y2="78" strokeWidth={sw * 1.3} />
            {/* Wide shoulders — commanding */}
            <line x1="44" y1="48" x2="96" y2="48" strokeWidth={sw} />
            {/* Arms — slightly raised */}
            <line x1="44" y1="48" x2="34" y2="68" strokeWidth={sw} />
            <line x1="96" y1="48" x2="106" y2="68" strokeWidth={sw} />
            {/* Legs — wide, stable stance */}
            <line x1="70" y1="78" x2="54" y2="110" strokeWidth={sw} />
            <line x1="70" y1="78" x2="86" y2="110" strokeWidth={sw} />
          </>
        )}
      </g>
    </svg>
  )
}

// ─── Transformation Symbol ────────────────────────────────────────────────────
// Central Σ evolves through four visual states: void → cracked → forming → complete → radiant

function TransformationSymbol({ stage, symbolState }) {
  const gold = '#c9a84c'
  const isVoid     = symbolState === 'void'
  const isCracked  = symbolState === 'cracked'
  const isForming  = symbolState === 'forming'
  const isComplete = symbolState === 'complete'
  const isRadiant  = symbolState === 'radiant'

  const textOpacity = isVoid ? 0.08 : isCracked ? 0.35 : isForming ? 0.60 : isComplete ? 0.90 : 1.0

  return (
    <svg viewBox="0 0 80 80" width="56" height="56" aria-hidden="true" style={{ flexShrink: 0 }}>
      {/* Radiant glow blur — only for radiant state */}
      {isRadiant && (
        <text x="40" y="60" textAnchor="middle" fontSize="62"
          fontFamily="'Cormorant Garamond', Georgia, serif"
          fill={gold} opacity="0.12"
          style={{ filter: 'blur(5px)', userSelect: 'none' }}>Σ</text>
      )}

      {/* Main Σ */}
      <text x="40" y="60" textAnchor="middle" fontSize="62"
        fontFamily="'Cormorant Garamond', Georgia, serif"
        fontWeight="300"
        fill={isVoid ? 'none' : gold}
        stroke={isVoid || isCracked ? gold : 'none'}
        strokeWidth={isCracked ? '0.6' : '0'}
        opacity={textOpacity}
        strokeDasharray={isForming ? '5 3' : undefined}
        style={{ userSelect: 'none' }}>Σ</text>

      {/* Fracture lines — cracked state only */}
      {isCracked && (
        <g stroke={gold} strokeWidth="0.7" opacity="0.5">
          <line x1="30" y1="18" x2="42" y2="32" />
          <line x1="42" y1="32" x2="35" y2="44" />
          <line x1="44" y1="54" x2="52" y2="64" />
        </g>
      )}

      {/* Small dots at corners — forming state */}
      {isForming && (
        <g fill={gold} opacity="0.4">
          <circle cx="16" cy="16" r="1.5" />
          <circle cx="64" cy="16" r="1.5" />
          <circle cx="16" cy="64" r="1.5" />
          <circle cx="64" cy="64" r="1.5" />
        </g>
      )}
    </svg>
  )
}

// ─── Transformation Card ──────────────────────────────────────────────────────
// Hero card at the top of the Progress tab showing identity-based evolution.

function TransformationCard({ goals, logs }) {
  const rate  = calcConsistencyRate(goals, logs)
  const stg   = getTransformationStage(rate)
  const next  = stg.stage < 9 ? stg.stage + 1 : null

  // Progress within current stage toward next
  const [currMin, nextMin] = [
    stg.minRate,
    next !== null ? (stg.stage + 1 < 10 ? [0,8,20,33,46,58,70,80,90,96][stg.stage + 1] : 100) : 100
  ]
  const stageProgress = next !== null
    ? Math.min(100, Math.round(((rate - currMin) / (nextMin - currMin)) * 100))
    : 100

  return (
    <div className="transformation-card">
      {/* Header */}
      <div className="transform-header">
        <div>
          <div className="transform-label">Identity</div>
          <div className="transform-stage-name">{stg.name}</div>
        </div>
        <div className="transform-rate-block">
          <div className="transform-rate">{rate}<span className="transform-rate-unit">%</span></div>
          <div className="transform-rate-label">30-day consistency</div>
        </div>
      </div>

      {/* Visual section */}
      <div className="transform-visual">
        {/* Avatar */}
        <div className="transform-avatar-wrap">
          <TransformationAvatar stage={stg.stage} />
        </div>

        {/* Symbol + environment */}
        <div className="transform-right">
          <TransformationSymbol stage={stg.stage} symbolState={stg.symbolState} />
          <p className="transform-env">{stg.env}</p>

          {/* Stage progress to next */}
          <div className="transform-progress-wrap">
            <div className="progress-track">
              <div className="progress-fill transform-progress-fill"
                style={{ width: `${stageProgress}%` }} />
            </div>
            {next !== null ? (
              <div className="transform-progress-meta">
                <span>Stage {stg.stage}</span>
                <span>→ Stage {next}</span>
              </div>
            ) : (
              <div className="transform-progress-meta">
                <span>Stage {stg.stage} · Mastery</span>
                <span>Complete</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stage nodes */}
      <div className="transform-stage-nodes">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i}
            className={`transform-node ${i <= stg.stage ? 'reached' : i === stg.stage + 1 ? 'next' : ''}`}
            title={`Stage ${i}`}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Burnout Banner ───────────────────────────────────────────────────────────
// Shown in the Log tab when the burnout/inactivity detection fires.
// Tone is neutral and observational — no judgement.

function BurnoutBanner({ burnout, onDismiss, onActivateMvd, onReduceFreq }) {
  if (!burnout.active) return null
  return (
    <div className="burnout-banner fade-in">
      <div className="burnout-icon">◈</div>
      <div className="burnout-body">
        <div className="burnout-title">A pattern has been observed.</div>
        <div className="burnout-detail">{burnout.detail}</div>
        <div className="burnout-detail" style={{ marginTop: 4, opacity: 0.6 }}>
          Your current load may not be sustainable. No judgement — systems can be adjusted.
        </div>
        <div className="burnout-actions">
          <button className="burnout-btn" onClick={onActivateMvd}>
            Core Goals Only
          </button>
          <button className="burnout-btn" onClick={onReduceFreq}>
            Review Goals
          </button>
          <button className="burnout-btn burnout-btn-dim" onClick={onDismiss}>
            Ignore
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Challenge Offer Modal ────────────────────────────────────────────────────
// Full-screen overlay presenting a new challenge for acceptance or decline.

function ChallengeOfferModal({ challenge, onAccept, onDecline }) {
  if (!challenge) return null
  const virtue = VIRTUES[challenge.virtue] || VIRTUES.courage
  return (
    <div className="modal-overlay" onClick={onDecline}>
      <div className="modal challenge-offer-modal" onClick={e => e.stopPropagation()}>
        <div className="challenge-offer-label">
          <span style={{ color: virtue.color, letterSpacing: '.22em' }}>
            {virtue.label.toUpperCase()}
          </span>
          <span className="challenge-offer-duration">
            {challenge.duration}-day challenge
          </span>
        </div>

        <div className="challenge-offer-title">{challenge.title}</div>

        <div className="focus-divider" style={{ margin: '14px 0' }} />

        <p className="challenge-offer-desc">{challenge.desc}</p>

        <div className="challenge-constraint-block">
          <span className="challenge-constraint-label">Constraint</span>
          <p className="challenge-constraint-text">{challenge.constraint}</p>
        </div>

        <div className="challenge-offer-xp">
          +{challenge.xpBonus} XP upon completion
        </div>

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn-cancel" onClick={onDecline}>Decline</button>
          <button className="btn-save" onClick={() => onAccept(challenge)}>
            Accept Challenge
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Challenge Card ───────────────────────────────────────────────────────────
// Shown in the Log tab when a challenge is active. User marks daily progress.

function ChallengeCard({ challenge, onLogDay, onComplete }) {
  if (!challenge || challenge.status !== 'active') return null

  const virtue     = VIRTUES[challenge.virtue] || VIRTUES.courage
  const today      = todayStr()
  const loggedToday = (challenge.daysLogged || []).includes(today)
  const daysLeft   = challengeDaysRemaining(challenge)
  const logged     = (challenge.daysLogged || []).length
  const required   = Math.ceil(challenge.duration * 0.7)
  const pct        = Math.min(100, Math.round((logged / required) * 100))
  const isComplete = challengeIsComplete(challenge)

  // If expired and complete, trigger completion
  if (challengeIsExpired(challenge) && isComplete && onComplete) {
    // Defer to avoid calling during render
    setTimeout(onComplete, 0)
  }

  return (
    <div className="challenge-card fade-in" style={{ borderColor: virtue.dim }}>
      <div className="challenge-card-header">
        <span className="challenge-virtue-tag" style={{ color: virtue.color }}>
          {virtue.label.toUpperCase()} · CHALLENGE
        </span>
        <span className="challenge-days-left">
          {daysLeft > 0 ? `${daysLeft}d left` : 'Final day'}
        </span>
      </div>

      <div className="challenge-title">{challenge.title}</div>
      <p className="challenge-desc-short">{challenge.constraint}</p>

      <div className="challenge-progress-row">
        <div className="progress-track" style={{ flex: 1 }}>
          <div className="progress-fill" style={{ width: `${pct}%`, background: virtue.color }} />
        </div>
        <span className="challenge-progress-label">
          {logged}/{required} days
        </span>
      </div>

      <button
        className="challenge-log-btn"
        style={{
          borderColor: loggedToday ? virtue.color : 'var(--border)',
          color: loggedToday ? virtue.color : 'var(--dim)',
          background: loggedToday ? virtue.dim : 'transparent',
        }}
        onClick={onLogDay}
        disabled={loggedToday}
      >
        {loggedToday ? '✓ Logged today' : 'Mark today complete'}
      </button>
    </div>
  )
}

// ─── Challenge Completed Banner ───────────────────────────────────────────────

function ChallengeCompletedBanner({ challenge, onDismiss }) {
  if (!challenge) return null
  const virtue = VIRTUES[challenge.virtue] || VIRTUES.courage
  return (
    <div className="challenge-completed-banner fade-in" style={{ borderColor: virtue.color }}>
      <div className="challenge-completed-symbol" style={{ color: virtue.color }}>◆</div>
      <div>
        <div className="challenge-completed-title">Challenge Complete</div>
        <div className="challenge-completed-name">{challenge.title}</div>
        <div className="challenge-completed-xp">+{challenge.xpBonus} XP awarded to {virtue.label}</div>
      </div>
      <button className="challenge-completed-dismiss" onClick={onDismiss}>×</button>
    </div>
  )
}

// ─── Log Tab ──────────────────────────────────────────────────────────────────

function LogTab({ goals, logs, onLog, activeChallenge, onLogChallenge, onChallengeComplete, burnout, onDismissBurnout, onActivateMvd, mvdMode, onToggleMvd, completedChallenge, onDismissCompleted }) {
  const today     = todayStr()
  const todayLogs = logs[today] || {}
  const score     = calcWeeklyScore(goals, logs)
  const tier      = getTier(score)
  const weekDates = getWeekDates()
  const [animIds, setAnimIds] = useState([])

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
    const isInteractiveInput = goal.type === 'quantitative' || goal.type === 'noted'

    return (
      <div key={goal.id}
        className={`goal-item ${logged ? 'logged' : ''}`}
        onClick={() => !isInteractiveInput && tap(goal.id)}
      >
        <div className="goal-virtue-dot" style={{ background: virtue.color }} />
        <div className="goal-info">
          <div className="goal-name">{goal.name}</div>
          <div className="goal-meta">
            {virtue.label.toUpperCase()} · {(goal.type || 'binary').toUpperCase()} · {freqLabel(goal).toUpperCase()}
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
        ) : goal.type === 'noted' ? (
          <input
            className="note-log-input"
            type="text"
            placeholder="Log it…"
            value={typeof logged === 'string' ? logged : ''}
            onClick={e => e.stopPropagation()}
            onChange={e => onLog(goal.id, e.target.value || 0)}
          />
        ) : (
          <div className={`goal-check ${logged ? 'checked' : ''} ${isAnim ? 'check-pop' : ''}`}>
            {logged ? <CheckIcon /> : null}
          </div>
        )}
      </div>
    )
  }

  // MVD mode: show only highest-weight goals (top 3 by weight)
  let visibleGoals = goals
  if (mvdMode) {
    const sorted = [...goals].sort((a, b) => (b.weight || 1) - (a.weight || 1))
    visibleGoals = sorted.slice(0, 3)
  }

  const daily    = visibleGoals.filter(g =>
    !g.timeframe || g.timeframe === 'daily' || g.timeframe === 'weekly' || g.timeframe === 'weekly_x'
  )
  const longTerm = visibleGoals.filter(g =>
    g.timeframe === 'monthly' || g.timeframe === 'yearly' || g.timeframe === 'every_x_weeks'
  )

  const activeGoalIds = new Set(goals.map(g => g.id))
  const doneCount = Object.keys(todayLogs).filter(
    k => activeGoalIds.has(k) && todayLogs[k] && todayLogs[k] !== '0'
  ).length

  return (
    <div className="log-tab fade-in">
      {/* Burnout banner — appears only when detection fires and not dismissed today */}
      {burnout.active && (
        <BurnoutBanner
          burnout={burnout}
          onDismiss={onDismissBurnout}
          onActivateMvd={onActivateMvd}
          onReduceFreq={onDismissBurnout}
        />
      )}

      {/* Challenge completed banner */}
      {completedChallenge && (
        <ChallengeCompletedBanner
          challenge={completedChallenge}
          onDismiss={onDismissCompleted}
        />
      )}

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

      {/* Active challenge */}
      {activeChallenge && activeChallenge.status === 'active' && (
        <ChallengeCard
          challenge={activeChallenge}
          onLogDay={onLogChallenge}
          onComplete={onChallengeComplete}
        />
      )}

      {/* MVD mode indicator */}
      {mvdMode && (
        <div className="mvd-indicator">
          <span className="mvd-label">◈ Core Goals Mode</span>
          <button className="mvd-exit" onClick={onToggleMvd}>Exit</button>
        </div>
      )}

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
      ) : mvdMode && daily.length === 0 ? (
        <div className="empty-state">
          <p>No high-importance goals today.</p>
          <p>Exit Core Goals Mode or add weighted goals.</p>
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

const FREQ_MODES = [
  { val: 'daily',          label: 'Every\nday' },
  { val: 'weekly_x',       label: '×\u2009/\u2009week' },
  { val: 'every_x_weeks',  label: 'Every\nN wks' },
  { val: 'monthly',        label: 'Monthly' },
  { val: 'yearly',         label: 'Yearly' },
]

function AddGoalModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    name:         '',
    type:         'binary',
    virtue:       '',
    timeframe:    'daily',
    freq_count:   3,
    freq_every:   2,
    weight:       2,
    target_value: '',
    unit:         '',
  })

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))
  const valid = form.name.trim() && form.virtue

  const stepFreqCount = (delta) =>
    set('freq_count', Math.min(7, Math.max(1, (form.freq_count || 3) + delta)))
  const stepFreqEvery = (delta) =>
    set('freq_every', Math.min(52, Math.max(2, (form.freq_every || 2) + delta)))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">New Goal</div>

        <div className="form-group">
          <label className="form-label">Goal Name</label>
          <input className="form-input" placeholder="e.g. Gym session"
            value={form.name} onChange={e => set('name', e.target.value)} />
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
                onClick={() => set('virtue', key)}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-select" value={form.type}
            onChange={e => set('type', e.target.value)}>
            <option value="binary">Binary (done / not done)</option>
            <option value="quantitative">Quantitative (numeric target)</option>
            <option value="streak">Streak (daily chain)</option>
            <option value="noted">Noted (log what you did)</option>
          </select>
        </div>

        {form.type === 'quantitative' && (
          <div className="form-group">
            <label className="form-label">Target Value</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" type="number" inputMode="decimal"
                placeholder="e.g. 10000" value={form.target_value}
                onChange={e => set('target_value', e.target.value)}
                style={{ flex: 2 }} />
              <input className="form-input" placeholder="unit"
                value={form.unit} onChange={e => set('unit', e.target.value)}
                style={{ flex: 1 }} />
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Frequency</label>
          <div className="freq-grid">
            {FREQ_MODES.map(({ val, label }) => (
              <button key={val}
                className={`freq-btn ${form.timeframe === val ? 'selected' : ''}`}
                onClick={() => set('timeframe', val)}
                style={{ whiteSpace: 'pre-line' }}>
                {label}
              </button>
            ))}
          </div>

          {form.timeframe === 'weekly_x' && (
            <div className="freq-detail">
              <span className="freq-detail-label">Times per week</span>
              <div className="freq-stepper">
                <button className="freq-stepper-btn" onClick={() => stepFreqCount(-1)}>−</button>
                <span className="freq-stepper-val">{form.freq_count}</span>
                <button className="freq-stepper-btn" onClick={() => stepFreqCount(+1)}>+</button>
              </div>
            </div>
          )}
          {form.timeframe === 'every_x_weeks' && (
            <div className="freq-detail">
              <span className="freq-detail-label">Every N weeks</span>
              <div className="freq-stepper">
                <button className="freq-stepper-btn" onClick={() => stepFreqEvery(-1)}>−</button>
                <span className="freq-stepper-val">{form.freq_every}</span>
                <button className="freq-stepper-btn" onClick={() => stepFreqEvery(+1)}>+</button>
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Importance (1 – 5)</label>
          <div className="weight-row">
            {[1,2,3,4,5].map(w => (
              <button key={w}
                className={`weight-btn ${form.weight === w ? 'selected' : ''}`}
                onClick={() => set('weight', w)}>
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
                    {(goal.type || 'binary').toUpperCase()} · {freqLabel(goal).toUpperCase()} · WT {goal.weight}
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

// ─── Note Journal ─────────────────────────────────────────────────────────────

function NoteJournal({ goals, logs }) {
  const entries = []
  for (let i = 0; i < 30; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const date    = d.toISOString().split('T')[0]
    const dayLogs = logs[date] || {}
    goals.forEach(goal => {
      const note = dayLogs[goal.id]
      if (note && typeof note === 'string' && note.trim()) {
        entries.push({ date, goal, note })
      }
    })
  }

  if (!entries.length) {
    return (
      <div className="empty-state" style={{ padding: '24px 20px' }}>
        <p>No reflections logged yet.</p>
      </div>
    )
  }

  return (
    <div className="note-journal">
      {entries.map((e, i) => {
        const virtue = VIRTUES[e.goal.virtue] || VIRTUES.courage
        const displayDate = new Date(e.date + 'T00:00:00').toLocaleDateString('en-GB', {
          day: 'numeric', month: 'short'
        })
        return (
          <div key={i} className="note-entry">
            <div className="note-entry-header">
              <span className="note-entry-goal" style={{ color: virtue.color }}>
                {e.goal.name}
              </span>
              <span className="note-entry-date">{displayDate}</span>
            </div>
            <p className="note-entry-text">{e.note}</p>
          </div>
        )
      })}
    </div>
  )
}

// ─── Progress Tab ─────────────────────────────────────────────────────────────

function ProgressTab({ goals, logs, virtueXP, activeChallenge }) {
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

  // Completed challenges count (from any status stored)
  const hasActiveChallenge = activeChallenge && activeChallenge.status === 'active'

  return (
    <div className="progress-tab fade-in">
      {/* ── Transformation Hero Card ── */}
      <TransformationCard goals={goals} logs={logs} />

      <div className="score-card" style={{ marginTop: 0 }}>
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

      {/* Active challenge summary in progress tab */}
      {hasActiveChallenge && (
        <>
          <div className="section-header" style={{ marginTop: 24 }}>
            <span className="section-title">Active Challenge</span>
          </div>
          <div className="challenge-summary-card"
            style={{ borderColor: (VIRTUES[activeChallenge.virtue] || VIRTUES.courage).dim }}>
            <span className="challenge-summary-virtue"
              style={{ color: (VIRTUES[activeChallenge.virtue] || VIRTUES.courage).color }}>
              {(VIRTUES[activeChallenge.virtue] || VIRTUES.courage).label.toUpperCase()}
            </span>
            <div className="challenge-summary-title">{activeChallenge.title}</div>
            <div className="challenge-summary-days">
              {(activeChallenge.daysLogged || []).length}/{Math.ceil(activeChallenge.duration * 0.7)} days logged
              · {challengeDaysRemaining(activeChallenge)}d remaining
            </div>
          </div>
        </>
      )}

      <div className="section-header" style={{ marginTop: 24 }}>
        <span className="section-title">Virtue Progression</span>
      </div>
      {Object.keys(VIRTUES).map(v => (
        <VirtueTree key={v} virtue={v} xp={virtueXP[v] || 0} goals={goals} logs={logs} />
      ))}

      {goals.some(g => g.type === 'noted') && (
        <>
          <div className="section-header" style={{ marginTop: 24 }}>
            <span className="section-title">Reflections Journal</span>
            <span className="section-title">30 days</span>
          </div>
          <NoteJournal
            goals={goals.filter(g => g.type === 'noted')}
            logs={logs}
          />
        </>
      )}
    </div>
  )
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ settings, onUpdate, mvdMode, onToggleMvd }) {
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
        <div className="settings-section-title">Adaptive Mode</div>
        <div className="settings-row">
          <span className="settings-label">Core Goals Mode</span>
          <button className={`toggle ${mvdMode ? 'on' : ''}`} onClick={onToggleMvd} />
        </div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--dim)', paddingBottom: 8, letterSpacing: '.04em', lineHeight: 1.6 }}>
          When active, the Log tab shows only your 3 highest-importance goals.
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Data</div>
        <div className="settings-row">
          <span className="settings-label">Reset All Progress</span>
          <button className="select-chip" style={{ color: '#b55', borderColor: '#b55' }}
            onClick={() => {
              if (window.confirm('Reset all data? This cannot be undone.')) {
                storageSet('stoic-goals',              [])
                storageSet('stoic-logs',               {})
                storageSet('stoic-virtue-xp',          { courage: 0, wisdom: 0, temperance: 0, justice: 0 })
                storageSet('stoic-focus-date',         '')
                storageSet('stoic-active-challenge',   null)
                storageSet('stoic-challenge-history',  [])
                storageSet('stoic-next-challenge-date','')
                storageSet('stoic-burnout-dismissed',  '')
                storageSet('stoic-mvd-mode',           false)
                storageSet('stoic-completed-challenge',null)
                window.location.reload()
              }
            }}>
            Clear
          </button>
        </div>
      </div>

      <div className="app-version">STOIC · v1.1.0 · Performance &amp; Discipline</div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const DEFAULTS = {
  goals:    [],
  logs:     {},
  virtueXP: { courage: 0, wisdom: 0, temperance: 0, justice: 0 },
  settings: {
    theme:              'dark',
    textSize:           'medium',
    reflectionEnabled:  true,
  },
}

export default function App() {
  const [loaded,             setLoaded]             = useState(false)
  const [screen,             setScreen]             = useState('focus')
  const [activeTab,          setActiveTab]          = useState('log')
  const [goals,              setGoals]              = useState(DEFAULTS.goals)
  const [logs,               setLogs]               = useState(DEFAULTS.logs)
  const [virtueXP,           setVirtueXP]           = useState(DEFAULTS.virtueXP)
  const [settings,           setSettings]           = useState(DEFAULTS.settings)
  const [focusTimer,         setFocusTimer]         = useState(FOCUS_TIMER_SECONDS)
  const [focusReady,         setFocusReady]         = useState(false)
  const [reflection,         setReflection]         = useState('')
  const [focusIdx,           setFocusIdx]           = useState(0)

  // New system state
  const [activeChallenge,    setActiveChallenge]    = useState(null)
  const [challengeOffer,     setChallengeOffer]     = useState(null)
  const [completedChallenge, setCompletedChallenge] = useState(null)
  const [burnoutDismissed,   setBurnoutDismissed]   = useState('')
  const [mvdMode,            setMvdMode]            = useState(false)

  useEffect(() => {
    const g   = storageGet('stoic-goals',     DEFAULTS.goals)
    const l   = storageGet('stoic-logs',      DEFAULTS.logs)
    const xp  = storageGet('stoic-virtue-xp', DEFAULTS.virtueXP)
    const fd  = storageGet('stoic-focus-date','')
    const s   = { ...DEFAULTS.settings, ...storageGet('stoic-settings', {}) }

    // New system data
    const ac  = storageGet('stoic-active-challenge',   null)
    const bd  = storageGet('stoic-burnout-dismissed',  '')
    const mvd = storageGet('stoic-mvd-mode',           false)
    const cc  = storageGet('stoic-completed-challenge', null)
    const ch  = storageGet('stoic-challenge-history',  [])
    const nextChallengeDate = storageGet('stoic-next-challenge-date', '')

    setGoals(g); setLogs(l); setVirtueXP(xp); setSettings(s)
    setActiveChallenge(ac)
    setBurnoutDismissed(bd)
    setMvdMode(mvd)
    setCompletedChallenge(cc)

    // Resolve challenge expiry
    if (ac && ac.status === 'active') {
      const start = new Date(ac.startDate + 'T00:00:00')
      const daysPassed = Math.floor((new Date() - start) / 86400000)
      if (daysPassed >= ac.duration) {
        const required = Math.ceil(ac.duration * 0.7)
        const isWon = (ac.daysLogged || []).length >= required
        if (isWon) {
          // Auto-complete
          const completed = { ...ac, status: 'completed' }
          storageSet('stoic-active-challenge', completed)
          setActiveChallenge(completed)
          // Award XP
          const newXP = { ...xp, [ac.virtue]: (xp[ac.virtue] || 0) + ac.xpBonus }
          storageSet('stoic-virtue-xp', newXP)
          setVirtueXP(newXP)
          // Show banner
          storageSet('stoic-completed-challenge', completed)
          setCompletedChallenge(completed)
          // Log history
          const newHistory = [...ch, ac.id]
          storageSet('stoic-challenge-history', newHistory)
        } else {
          const expired = { ...ac, status: 'expired' }
          storageSet('stoic-active-challenge', expired)
          setActiveChallenge(expired)
          // Schedule next offer 7 days out
          const nextDate = new Date()
          nextDate.setDate(nextDate.getDate() + 7)
          storageSet('stoic-next-challenge-date', nextDate.toISOString().split('T')[0])
        }
      }
    }

    // Offer a new challenge if no active one and cooldown has passed
    const canOffer = !ac || ac.status === 'completed' || ac.status === 'expired' || ac.status === 'declined'
    const today    = new Date().toISOString().split('T')[0]
    const cooldownPassed = !nextChallengeDate || today >= nextChallengeDate
    if (canOffer && cooldownPassed && g.length > 0) {
      const newChallenge = pickWeeklyChallenge(ch)
      setChallengeOffer(newChallenge)
    }

    const todayStr2 = new Date().toISOString().split('T')[0]
    const hash  = todayStr2.split('-').reduce((a, n) => a + parseInt(n, 10), 0)
    setFocusIdx(hash % STOIC_CONTENT.length)

    if (fd === todayStr2) setScreen('main')
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (screen !== 'focus' || !loaded) return
    if (focusTimer <= 0) { setFocusReady(true); return }
    const t = setTimeout(() => setFocusTimer(v => v - 1), 1000)
    return () => clearTimeout(t)
  }, [screen, focusTimer, loaded])

  const handleProceed = useCallback(() => {
    storageSet('stoic-focus-date', todayStr())
    setScreen('main')
  }, [])

  const updateGoals = useCallback(ng => {
    setGoals(ng)
    storageSet('stoic-goals', ng)
  }, [])

  const logGoal = useCallback((goalId, value) => {
    const today    = todayStr()
    const newLogs  = { ...logs, [today]: { ...(logs[today] || {}), [goalId]: value } }
    setLogs(newLogs)
    storageSet('stoic-logs', newLogs)

    const goal         = goals.find(g => g.id === goalId)
    const prevLogged   = (logs[today] || {})[goalId]
    const isCompletion = value && value !== 0 && value !== '0' && value !== ''
    const wasLogged    = prevLogged && prevLogged !== 0

    if (goal && isCompletion && !wasLogged) {
      const xpGain = (goal.weight || 1) * 10
      const newXP  = { ...virtueXP, [goal.virtue]: (virtueXP[goal.virtue] || 0) + xpGain }
      setVirtueXP(newXP)
      storageSet('stoic-virtue-xp', newXP)
    }
  }, [logs, goals, virtueXP])

  const updateSettings = useCallback(ns => {
    setSettings(ns)
    storageSet('stoic-settings', ns)
  }, [])

  // ── Challenge actions ──

  const acceptChallenge = useCallback((challenge) => {
    const ac = { ...challenge, startDate: todayStr(), daysLogged: [], status: 'active' }
    setActiveChallenge(ac)
    storageSet('stoic-active-challenge', ac)
    setChallengeOffer(null)
    // Set next offer date well into the future (after challenge resolves, cooldown applies)
    const next = new Date()
    next.setDate(next.getDate() + challenge.duration + 7)
    storageSet('stoic-next-challenge-date', next.toISOString().split('T')[0])
  }, [])

  const declineChallenge = useCallback(() => {
    const declined = { ...challengeOffer, status: 'declined' }
    storageSet('stoic-active-challenge', declined)
    setActiveChallenge(declined)
    // Offer another in 7 days
    const next = new Date()
    next.setDate(next.getDate() + 7)
    storageSet('stoic-next-challenge-date', next.toISOString().split('T')[0])
    setChallengeOffer(null)
  }, [challengeOffer])

  const logChallengeDay = useCallback(() => {
    if (!activeChallenge || activeChallenge.status !== 'active') return
    const today = todayStr()
    if ((activeChallenge.daysLogged || []).includes(today)) return

    const updated = {
      ...activeChallenge,
      daysLogged: [...(activeChallenge.daysLogged || []), today],
    }

    // Check if enough days logged to complete
    const required = Math.ceil(updated.duration * 0.7)
    if (updated.daysLogged.length >= required) {
      updated.status = 'completed'
      // Award bonus XP
      const newXP = { ...virtueXP, [updated.virtue]: (virtueXP[updated.virtue] || 0) + updated.xpBonus }
      setVirtueXP(newXP)
      storageSet('stoic-virtue-xp', newXP)
      // Show completed banner
      storageSet('stoic-completed-challenge', updated)
      setCompletedChallenge(updated)
      // Log history
      const history = storageGet('stoic-challenge-history', [])
      storageSet('stoic-challenge-history', [...history, updated.id])
      // Next challenge available in 7 days
      const next = new Date()
      next.setDate(next.getDate() + 7)
      storageSet('stoic-next-challenge-date', next.toISOString().split('T')[0])
    }

    setActiveChallenge(updated)
    storageSet('stoic-active-challenge', updated)
  }, [activeChallenge, virtueXP])

  const handleChallengeComplete = useCallback(() => {
    // Called when ChallengeCard detects expiry+completion during render
    // State already updated by logChallengeDay or the load-time resolver
  }, [])

  const dismissCompleted = useCallback(() => {
    setCompletedChallenge(null)
    storageSet('stoic-completed-challenge', null)
  }, [])

  // ── Burnout actions ──

  // Computed burnout state (not stored — recalculated fresh each render)
  const burnout = (() => {
    if (!loaded) return { active: false, reason: null }
    const detected = detectBurnout(goals, logs)
    if (!detected.active) return detected
    // If dismissed today, suppress
    const today = todayStr()
    if (burnoutDismissed === today) return { active: false, reason: null }
    return detected
  })()

  const dismissBurnout = useCallback(() => {
    const today = todayStr()
    setBurnoutDismissed(today)
    storageSet('stoic-burnout-dismissed', today)
  }, [])

  const activateMvd = useCallback(() => {
    setMvdMode(true)
    storageSet('stoic-mvd-mode', true)
    dismissBurnout()
  }, [dismissBurnout])

  const toggleMvd = useCallback(() => {
    setMvdMode(p => {
      storageSet('stoic-mvd-mode', !p)
      return !p
    })
  }, [])

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
            {activeTab === 'log' && (
              <LogTab
                goals={goals}
                logs={logs}
                onLog={logGoal}
                activeChallenge={activeChallenge}
                onLogChallenge={logChallengeDay}
                onChallengeComplete={handleChallengeComplete}
                burnout={burnout}
                onDismissBurnout={dismissBurnout}
                onActivateMvd={activateMvd}
                mvdMode={mvdMode}
                onToggleMvd={toggleMvd}
                completedChallenge={completedChallenge}
                onDismissCompleted={dismissCompleted}
              />
            )}
            {activeTab === 'goals'    && <GoalsTab goals={goals} onUpdate={updateGoals} />}
            {activeTab === 'progress' && (
              <ProgressTab
                goals={goals}
                logs={logs}
                virtueXP={virtueXP}
                activeChallenge={activeChallenge}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsTab
                settings={settings}
                onUpdate={updateSettings}
                mvdMode={mvdMode}
                onToggleMvd={toggleMvd}
              />
            )}
          </div>

          {/* Challenge offer modal — rendered above nav */}
          {challengeOffer && (
            <ChallengeOfferModal
              challenge={challengeOffer}
              onAccept={acceptChallenge}
              onDecline={declineChallenge}
            />
          )}

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
