(() => {
  const pageUrl = window.location.href
  const pageTitle = document.title || 'Untitled Page'
  const canonicalEl = document.querySelector('link[rel="canonical"]')
  const canonicalHref = canonicalEl?.getAttribute('href') || ''
  let canonicalUrl = pageUrl
  if (canonicalHref) {
    try {
      const resolved = new URL(canonicalHref, pageUrl)
      if (['http:', 'https:'].includes(resolved.protocol)) {
        canonicalUrl = resolved.toString()
      }
    } catch {
      canonicalUrl = pageUrl
    }
  }

  const host = window.location.hostname.toLowerCase()
  let siteType = 'webpage'
  if (host.includes('youtube.com') || host.includes('youtu.be')) {
    siteType = 'youtube'
  } else if (host.includes('vimeo.com')) {
    siteType = 'vimeo'
  } else if (host.includes('spotify.com')) {
    siteType = 'spotify'
  }

  const elements = Array.from(document.querySelectorAll('video, audio'))
  if (elements.length === 0) {
    return {
      supported: false,
      siteType,
      waveformSupport: siteType !== 'webpage' ? 'restricted' : 'none',
      reason:
        siteType !== 'webpage'
          ? `Detected ${siteType} page without an active HTML5 media element. Waveform unavailable.`
          : 'No HTML5 <audio> or <video> element found on this page.',
      pageTitle,
      pageUrl,
      canonicalUrl,
      currentTime: 0,
      duration: 0,
      hasFiniteDuration: false,
    }
  }

  const target =
    elements.find((el) => !el.paused && !el.ended) ||
    elements.find((el) => el.readyState > 0) ||
    elements[0]

  const hasDrm = Boolean(target.mediaKeys)
  const currentTime = Number.isFinite(target.currentTime)
    ? Math.floor(target.currentTime)
    : 0
  const duration = Number.isFinite(target.duration)
    ? Math.floor(target.duration)
    : 0
  const hasFiniteDuration =
    Number.isFinite(target.duration) && target.duration > 0
  const mediaSrc = target.currentSrc || target.src || ''

  if (hasDrm) {
    return {
      supported: false,
      siteType,
      waveformSupport: 'restricted',
      reason:
        'Protected DRM media detected. EchoSpace does not circumvent DRM.',
      pageTitle,
      pageUrl,
      canonicalUrl,
      currentTime,
      duration,
      hasFiniteDuration,
    }
  }

  const isRestrictedProvider =
    siteType === 'youtube' ||
    siteType === 'vimeo' ||
    siteType === 'spotify' ||
    mediaSrc.startsWith('blob:') ||
    mediaSrc.startsWith('mediasource:')

  const waveformSupport = isRestrictedProvider
    ? 'restricted'
    : /^https?:\/\//i.test(mediaSrc)
      ? 'direct'
      : 'none'

  return {
    supported: true,
    siteType: siteType === 'webpage' ? 'html5' : siteType,
    tagName: target.tagName.toLowerCase(),
    paused: Boolean(target.paused),
    currentTime,
    duration,
    hasFiniteDuration,
    mediaSrc,
    waveformSupport,
    pageTitle,
    pageUrl,
    canonicalUrl,
  }
})()
