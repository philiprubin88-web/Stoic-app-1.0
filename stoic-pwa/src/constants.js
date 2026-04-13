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

// ─── Stoic Challenges ─────────────────────────────────────────────────────────
// A new challenge rotates in each week, determined by the week number.
//
// TO ADD A NEW CHALLENGE — append an object to this array:
// {
//   id:          string  — unique slug, e.g. 'courage-4'
//   virtue:      string  — 'courage' | 'wisdom' | 'temperance' | 'justice'
//   title:       string  — short name shown as the heading (max ~30 chars)
//   description: string  — 1–2 sentences on what to do
//   constraint:  string  — the specific rule that must be observed
//   completion:  string  — measurable condition that counts as a successful day
//   duration:    number  — how many days the challenge runs (3–7)
// }

export const CHALLENGES = [

  // ── Courage ──────────────────────────────────────────────────────────────
  {
    id: 'courage-1',
    virtue: 'courage',
    title: 'The Difficult Conversation',
    description: 'Initiate one conversation you have been actively avoiding.',
    constraint: 'Must be in person or by phone — not a text or email.',
    completion: 'Have the conversation and sit with the discomfort.',
    duration: 3,
  },
  {
    id: 'courage-2',
    virtue: 'courage',
    title: 'Do What You Have Avoided',
    description: 'Each day, identify and complete one task you have been postponing.',
    constraint: 'Must be something delayed for at least one week.',
    completion: 'Complete the avoided task before the day ends.',
    duration: 5,
  },
  {
    id: 'courage-3',
    virtue: 'courage',
    title: 'Speak Without Filtering',
    description: 'Share your honest opinion once each day where you would normally stay silent.',
    constraint: 'Must be constructive — courage is not cruelty.',
    completion: 'Speak your mind once, then reflect on the outcome.',
    duration: 5,
  },

  // ── Temperance ───────────────────────────────────────────────────────────
  {
    id: 'temperance-1',
    virtue: 'temperance',
    title: 'No Added Sugar',
    description: 'Eliminate added sugar from your diet entirely.',
    constraint: 'No sweets, sugary drinks, or processed snacks with added sugar.',
    completion: 'Complete the day without consuming added sugar.',
    duration: 3,
  },
  {
    id: 'temperance-2',
    virtue: 'temperance',
    title: 'Digital Sunset',
    description: 'No social media, news feeds, or video content after 8pm.',
    constraint: 'All platforms — no exceptions. Use that time to read or think.',
    completion: 'Complete each evening screen-free from 8pm onward.',
    duration: 7,
  },
  {
    id: 'temperance-3',
    virtue: 'temperance',
    title: 'Deliberate Consumption',
    description: 'Before each non-essential purchase or snack, pause 60 seconds and ask if you truly need it.',
    constraint: 'Applies to all impulsive spending and eating outside scheduled meals.',
    completion: 'Apply the pause without exception for the full day.',
    duration: 5,
  },

  // ── Wisdom ───────────────────────────────────────────────────────────────
  {
    id: 'wisdom-1',
    virtue: 'wisdom',
    title: 'Five Minutes of Silence',
    description: 'Begin each day with five minutes of deliberate, silent reflection.',
    constraint: 'No phone, no music, no distraction. Sit and think.',
    completion: 'Complete the morning reflection before touching your phone.',
    duration: 5,
  },
  {
    id: 'wisdom-2',
    virtue: 'wisdom',
    title: 'Read Every Day',
    description: 'Read at least five pages of a non-fiction or philosophical book each day.',
    constraint: 'Physical reading only — no audiobooks. No skimming.',
    completion: 'Complete at least five pages of meaningful reading.',
    duration: 7,
  },
  {
    id: 'wisdom-3',
    virtue: 'wisdom',
    title: 'Write to Understand',
    description: 'Write three sentences each evening about what you learned or observed.',
    constraint: 'Must be specific — real observations, not vague generalities.',
    completion: 'Write three concrete sentences before sleep.',
    duration: 5,
  },

  // ── Justice ──────────────────────────────────────────────────────────────
  {
    id: 'justice-1',
    virtue: 'justice',
    title: 'Unrecognised Service',
    description: 'Do something genuinely helpful for another person without telling anyone.',
    constraint: 'Do not seek acknowledgement. The act must be its own reward.',
    completion: 'Complete one act of quiet service.',
    duration: 3,
  },
  {
    id: 'justice-2',
    virtue: 'justice',
    title: 'Resolve a Conflict',
    description: 'Take a meaningful step each day toward resolving a lingering tension or disagreement.',
    constraint: 'Must be a real conflict — not a minor inconvenience.',
    completion: 'Take one concrete step toward resolution.',
    duration: 5,
  },
  {
    id: 'justice-3',
    virtue: 'justice',
    title: 'Full Presence',
    description: 'Give your complete, undivided attention to each person you speak with.',
    constraint: 'No phone during conversations. No half-listening.',
    completion: 'Complete each conversation without checking your phone.',
    duration: 3,
  },
]
