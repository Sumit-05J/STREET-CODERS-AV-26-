import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'echospace-theme'
const VALID_THEMES = new Set(['light', 'dark', 'system'])

const listeners = new Set()

function getStoredPreference() {
  try {
    const val = localStorage.getItem(STORAGE_KEY)
    return VALID_THEMES.has(val) ? val : 'system'
  } catch {
    return 'system'
  }
}

export function resolveTheme(pref) {
  if (pref === 'dark' || pref === 'light') return pref
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }
  return 'light'
}

function applyThemeToDom(pref) {
  const resolved = resolveTheme(pref)
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = resolved
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }
  return resolved
}

let currentPreference = getStoredPreference()
let currentResolved = applyThemeToDom(currentPreference)

if (typeof window !== 'undefined' && window.matchMedia) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', () => {
    if (currentPreference === 'system') {
      currentResolved = applyThemeToDom('system')
      listeners.forEach((cb) => cb())
    }
  })
}

export function setThemePreference(nextPref) {
  if (!VALID_THEMES.has(nextPref)) return
  currentPreference = nextPref
  try {
    localStorage.setItem(STORAGE_KEY, nextPref)
  } catch {
    // Ignore storage errors
  }
  currentResolved = applyThemeToDom(nextPref)
  listeners.forEach((cb) => cb())
}

function subscribe(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot() {
  return `${currentPreference}:${currentResolved}`
}

export function useTheme() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return {
    theme: currentPreference,
    resolvedTheme: currentResolved,
    setTheme: setThemePreference,
  }
}
