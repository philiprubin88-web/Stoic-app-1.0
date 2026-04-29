/**
 * Storage — pure localStorage with quota error feedback.
 */

export function storageGet(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? JSON.parse(raw) : defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * Returns true on success, 'QUOTA_EXCEEDED' when storage is full, false on other errors.
 */
export function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (err) {
    if (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22) {
      return 'QUOTA_EXCEEDED'
    }
    console.error('[STOIC] storageSet failed:', err)
    return false
  }
}

/**
 * Properly removes a key — unlike storageSet(key, null) which writes the string "null".
 */
export function storageRemove(key) {
  try {
    localStorage.removeItem(key)
  } catch (err) {
    console.error('[STOIC] storageRemove failed:', err)
  }
}
