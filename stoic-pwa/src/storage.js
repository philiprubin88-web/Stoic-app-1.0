/**
 * Storage abstraction.
 *
 * In the Claude artifact environment the app uses `window.storage` (a custom
 * key-value API). In production (Vite build / PWA) we fall back to
 * localStorage so the app works identically.
 */

function hasClaudeStorage() {
  return typeof window !== 'undefined' && typeof window.storage?.get === 'function'
}

export async function storageGet(key, defaultValue) {
  try {
    if (hasClaudeStorage()) {
      const result = await window.storage.get(key)
      return result ? JSON.parse(result.value) : defaultValue
    } else {
      const raw = localStorage.getItem(key)
      return raw !== null ? JSON.parse(raw) : defaultValue
    }
  } catch {
    return defaultValue
  }
}

export async function storageSet(key, value) {
  try {
    const serialised = JSON.stringify(value)
    if (hasClaudeStorage()) {
      await window.storage.set(key, serialised)
    } else {
      localStorage.setItem(key, serialised)
    }
  } catch (err) {
    console.error('[STOIC] storageSet failed:', err)
  }
}
