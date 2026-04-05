async function storageGet(key, def) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : def;
  } catch {
    return def;
  }
}

async function storageSet(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}
