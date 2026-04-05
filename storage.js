/**
 * Storage — pure localStorage.
 * Works in all browsers, Safari PWA, and installed home screen apps.
 */

export function storageGet(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? JSON.parse(raw) : defaultValue
  } catch {
    return defaultValue
  }
}

export function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.error('[STOIC] storageSet failed:', err)
  }
}
