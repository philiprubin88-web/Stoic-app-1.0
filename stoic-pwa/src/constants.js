export const VIRTUES = {
  courage:    { label: 'Courage',    color: '#D4A843', dim: '#5c4418', desc: 'Physical & mental fortitude' },
  wisdom:     { label: 'Wisdom',     color: '#7BA08A', dim: '#2e4a35', desc: 'Knowledge & reflection' },
  temperance: { label: 'Temperance', color: '#7a95a8', dim: '#2c3e4d', desc: 'Restraint & moderation' },
  justice:    { label: 'Justice',    color: '#b57a6e', dim: '#4a2e29', desc: 'Duty & right action' },
}

export const STOIC_CONTENT = [
  {
    quote: 'The obstacle is the way.',
    author: 'Marcus Aurelius, Meditations',
    interpretation: 'Every difficulty is not in opposition to your progress — it is the path itself. Resistance builds the character required for what comes next.',
    prompt: 'What obstacle before you today can become the work itself?',
  },
  {
    quote: 'Waste no more time arguing what a good man should be. Be one.',
    author: 'Marcus Aurelius, Meditations',
    interpretation: 'Action supersedes deliberation. The time spent justifying virtue is time stolen from practicing it.',
    prompt: 'Where have you been theorising instead of acting?',
  },
  {
    quote: 'He suffers more than necessary, who suffers before it is necessary.',
    author: 'Seneca, Letters to Lucilius',
    interpretation: 'Most suffering is anticipatory. The feared event rarely arrives as imagined. Presence is the antidote to dread.',
    prompt: 'What are you dreading that has not yet occurred?',
  },
  {
    quote: 'You have power over your mind — not outside events. Realise this, and you will find strength.',
    author: 'Marcus Aurelius, Meditations',
    interpretation: 'Your domain is internal. The external world is indifferent. Mastery begins at the boundary of what you control.',
    prompt: 'What are you trying to control that lies beyond your reach?',
  },
  {
    quote: 'Difficulties strengthen the mind, as labour does the body.',
    author: 'Seneca, Moral Letters',
    interpretation: 'Comfort atrophies capacity. The mind, like muscle, requires resistance to grow. Seek the difficult deliberately.',
    prompt: 'What difficulty are you avoiding that would make you stronger?',
  },
  {
    quote: 'First say to yourself what you would be; and then do what you have to do.',
    author: 'Epictetus, Discourses',
    interpretation: 'Identity precedes action. Define who you are becoming before you begin. Let that definition drive every decision today.',
    prompt: 'Who are you becoming? Does today\'s behaviour reflect it?',
  },
  {
    quote: 'Be tolerant with others and strict with yourself.',
    author: 'Marcus Aurelius, Meditations',
    interpretation: 'The standard you apply to yourself must exceed the one you hold others to. Accountability flows inward first.',
    prompt: 'Where are you holding others to a higher standard than yourself?',
  },
  {
    quote: 'It is not death that a man should fear, but he should fear never beginning to live.',
    author: 'Marcus Aurelius, Meditations',
    interpretation: 'The unlived life is the greater loss. Begin what must be begun. Hesitation is its own form of failure.',
    prompt: 'What have you been postponing that deserves to begin today?',
  },
  {
    quote: 'Wealth consists not in having great possessions, but in having few wants.',
    author: 'Epictetus, Discourses',
    interpretation: 'Desire is infinite; satisfaction is fleeting. Reduce what you require and you expand your freedom considerably.',
    prompt: 'What desire, if released, would give you more freedom?',
  },
  {
    quote: 'The best revenge is not to be like your enemy.',
    author: 'Marcus Aurelius, Meditations',
    interpretation: 'Do not allow another\'s poor character to corrupt yours. The response to indignity is not to descend to it.',
    prompt: 'Where are you being pulled toward behaviour beneath your standard?',
  },
]

export const VIRTUE_LEVELS = [
  { level: 1,  threshold: 0,    title: 'Initiate' },
  { level: 2,  threshold: 50,   title: 'Aware' },
  { level: 3,  threshold: 130,  title: 'Consistent' },
  { level: 4,  threshold: 250,  title: 'Disciplined' },
  { level: 5,  threshold: 410,  title: 'Focused' },
  { level: 6,  threshold: 620,  title: 'Resolute' },
  { level: 7,  threshold: 880,  title: 'Steadfast' },
  { level: 8,  threshold: 1200, title: 'Virtuous' },
  { level: 9,  threshold: 1600, title: 'Exceptional' },
  { level: 10, threshold: 2100, title: 'Mastery' },
]

export const TIERS = [
  { min: 0,  label: 'Undisciplined', color: '#666' },
  { min: 30, label: 'Developing',    color: '#888' },
  { min: 50, label: 'Consistent',    color: '#7BA08A' },
  { min: 70, label: 'Disciplined',   color: '#7a95a8' },
  { min: 85, label: 'Exceptional',   color: '#D4A843' },
]

// ─── Transformation Stages ────────────────────────────────────────────────────
// Driven by 30-day consistency rate (0–100). Each stage requires the minimum
// consistency rate shown below. Stage transitions reflect a genuine shift in
// identity — not just accumulated points.
export const TRANSFORMATION_STAGES = [
  {
    stage: 0, name: 'Void',
    minRate: 0,
    env: 'No pattern established. Chaos governs.',
    symbolState: 'void',
  },
  {
    stage: 1, name: 'Untrained',
    minRate: 8,
    env: 'The environment resists you. Disorder is the default.',
    symbolState: 'cracked',
  },
  {
    stage: 2, name: 'Stirring',
    minRate: 20,
    env: 'Something begins to take shape. The impulse is present.',
    symbolState: 'cracked',
  },
  {
    stage: 3, name: 'Initiate',
    minRate: 33,
    env: 'The chaos recedes at the edges. Form is possible.',
    symbolState: 'forming',
  },
  {
    stage: 4, name: 'Developing',
    minRate: 46,
    env: 'Consistency is emerging. Space begins to reflect intention.',
    symbolState: 'forming',
  },
  {
    stage: 5, name: 'Consistent',
    minRate: 58,
    env: 'Order is becoming natural. The structure holds without effort.',
    symbolState: 'complete',
  },
  {
    stage: 6, name: 'Disciplined',
    minRate: 70,
    env: 'The mind governs the pattern. Clarity is the baseline.',
    symbolState: 'complete',
  },
  {
    stage: 7, name: 'Resolute',
    minRate: 80,
    env: 'Unwavering in purpose. The environment serves your direction.',
    symbolState: 'radiant',
  },
  {
    stage: 8, name: 'Stoic',
    minRate: 90,
    env: 'Stillness. Intentional clarity. Calm, minimal, strong presence.',
    symbolState: 'radiant',
  },
  {
    stage: 9, name: 'Mastery',
    minRate: 96,
    env: 'The environment and self are one. Presence without need for proof.',
    symbolState: 'radiant',
  },
]

// ─── Stoic Challenges ─────────────────────────────────────────────────────────
// Each challenge is virtue-aligned, has a clear constraint, and a defined
// duration. Completion requires marking progress on ≥70% of days.
export const STOIC_CHALLENGES = [
  // Courage
  {
    id: 'ch_c1', virtue: 'courage',
    title: 'The Difficult Conversation',
    desc: 'Initiate one conversation you have been postponing. Say what needs to be said, without softening or delay.',
    constraint: 'One conversation. Not a message. In person or by voice.',
    duration: 3, xpBonus: 60,
  },
  {
    id: 'ch_c2', virtue: 'courage',
    title: 'The Avoided Action',
    desc: 'Identify the one thing you have been avoiding the longest. Begin it today. Do not wait for readiness.',
    constraint: 'One hour minimum of direct work on the avoided task each day.',
    duration: 4, xpBonus: 65,
  },
  {
    id: 'ch_c3', virtue: 'courage',
    title: 'Cold Discipline',
    desc: 'End every shower with 90 seconds of cold water. Embrace physical discomfort as deliberate training of the will.',
    constraint: '90 seconds. No gradual transition. Full cold.',
    duration: 5, xpBonus: 70,
  },
  {
    id: 'ch_c4', virtue: 'courage',
    title: 'The Public Commitment',
    desc: 'State one significant goal or belief aloud to at least one other person. Commit to it. Let it be witnessed.',
    constraint: 'Spoken declaration only — not a text, not a post. A real conversation.',
    duration: 3, xpBonus: 55,
  },
  // Wisdom
  {
    id: 'ch_w1', virtue: 'wisdom',
    title: 'The Daily Reflection',
    desc: 'Spend 5 uninterrupted minutes each morning writing one thing you observed, learned, or reconsidered the day before.',
    constraint: 'Written. Not typed. Before any screen in the morning.',
    duration: 5, xpBonus: 65,
  },
  {
    id: 'ch_w2', virtue: 'wisdom',
    title: 'Deep Reading',
    desc: 'Read 5 pages of a serious non-fiction book each day. Not summaries. Not excerpts. The full text.',
    constraint: 'No skimming. No audio. Physical or digital book, full attention.',
    duration: 5, xpBonus: 65,
  },
  {
    id: 'ch_w3', virtue: 'wisdom',
    title: 'One Hour of Silence',
    desc: 'Spend one hour each day in complete silence — no screens, no audio, no conversation. Sit with your own thoughts.',
    constraint: 'One continuous hour. Not broken into segments. Outdoors is optimal.',
    duration: 4, xpBonus: 75,
  },
  {
    id: 'ch_w4', virtue: 'wisdom',
    title: 'The Examined Assumption',
    desc: 'Each day, identify one belief you hold and question whether the evidence actually supports it. Write the answer.',
    constraint: 'One belief per day. Must be written, not merely thought.',
    duration: 4, xpBonus: 60,
  },
  // Temperance
  {
    id: 'ch_t1', virtue: 'temperance',
    title: 'No Screens After 8pm',
    desc: 'All leisure screen use ends at 8pm. Guard the evening with discipline. The night belongs to recovery.',
    constraint: 'No phone, tablet, or computer for entertainment. Work emergencies excepted.',
    duration: 5, xpBonus: 65,
  },
  {
    id: 'ch_t2', virtue: 'temperance',
    title: 'Reduced Sugar',
    desc: 'Eliminate added sugar for 3 days. No exceptions, no compromise. Observe what changes in your clarity and energy.',
    constraint: 'No desserts, sweetened drinks, or processed snacks containing added sugar.',
    duration: 3, xpBonus: 55,
  },
  {
    id: 'ch_t3', virtue: 'temperance',
    title: 'The Spare Meal',
    desc: 'Eat one meal per day that is deliberately simple and unadorned. Practice wanting less. Let the desire pass.',
    constraint: 'Plain food only — no sauces, no extras, no ordering out for this meal.',
    duration: 4, xpBonus: 60,
  },
  {
    id: 'ch_t4', virtue: 'temperance',
    title: 'The Consumption Fast',
    desc: 'Buy nothing non-essential for 5 days. Observe the desire when it arises. Let it exist without acting on it.',
    constraint: 'No purchases beyond food, medicine, and transport. Online browsing of products counts as a break.',
    duration: 5, xpBonus: 75,
  },
  // Justice
  {
    id: 'ch_j1', virtue: 'justice',
    title: 'The Anonymous Act',
    desc: 'Help someone in a meaningful way without seeking acknowledgement, credit, or even their knowledge.',
    constraint: 'Must require genuine effort. Anonymity must be real — no hinting, no disclosure.',
    duration: 3, xpBonus: 60,
  },
  {
    id: 'ch_j2', virtue: 'justice',
    title: 'The Lingering Conflict',
    desc: 'Identify one unresolved tension or conflict in your life. Take one concrete step toward resolution each day.',
    constraint: 'Action only. Not thinking about it, not planning. A real step toward the other person or situation.',
    duration: 4, xpBonus: 65,
  },
  {
    id: 'ch_j3', virtue: 'justice',
    title: 'Full Presence',
    desc: 'Give one person per day your complete, undivided attention. No phone visible, no distraction. Just them.',
    constraint: 'Phone face-down or absent. A minimum of 20 minutes of genuine presence.',
    duration: 5, xpBonus: 70,
  },
  {
    id: 'ch_j4', virtue: 'justice',
    title: 'The Overdue Acknowledgement',
    desc: 'Express genuine, specific gratitude or recognition to someone who has not received it from you — and deserves it.',
    constraint: 'Spoken or handwritten. Not a text. Specific and sincere.',
    duration: 3, xpBonus: 55,
  },
]
