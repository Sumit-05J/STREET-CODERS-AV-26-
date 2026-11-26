const apiInput = document.getElementById('api-url')
const webInput = document.getElementById('web-url')
const themeSelect = document.getElementById('theme-pref')
const savedMsg = document.getElementById('saved-msg')

function applyOptionsTheme(pref) {
  const isDark =
    pref === 'dark' ||
    (pref === 'system' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
}

chrome.storage.local
  .get(['apiBaseUrl', 'webAppUrl', 'themePreference'])
  .then((res) => {
    apiInput.value = res.apiBaseUrl || 'http://localhost:8080/api'
    webInput.value = res.webAppUrl || 'http://localhost:5173'
    const pref = res.themePreference || 'system'
    if (themeSelect) themeSelect.value = pref
    applyOptionsTheme(pref)
  })

document.getElementById('options-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const themePreference = themeSelect?.value || 'system'
  await chrome.storage.local.set({
    apiBaseUrl: apiInput.value.replace(/\/$/, ''),
    webAppUrl: webInput.value.replace(/\/$/, ''),
    themePreference,
  })
  applyOptionsTheme(themePreference)
  savedMsg.classList.remove('hidden')
  setTimeout(() => savedMsg.classList.add('hidden'), 2000)
})
