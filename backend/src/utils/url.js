const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
])

/**
 * Canonicalize an HTTP/HTTPS URL for duplicate episode detection.
 * Preserves significant query params (such as YouTube `v`) while stripping
 * fragments, tracking parameters, and redundant trailing slashes.
 */
export function canonicalizeUrl(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl || '').trim())
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return String(rawUrl || '').trim()
    }

    parsed.hash = ''
    parsed.hostname = parsed.hostname.toLowerCase()

    // Normalize youtu.be/<id> to youtube.com/watch?v=<id>
    if (parsed.hostname === 'youtu.be') {
      const videoId = parsed.pathname.replace(/^\/+/, '').split('/')[0]
      if (videoId) {
        parsed.hostname = 'www.youtube.com'
        parsed.pathname = '/watch'
        const kept = new URLSearchParams()
        kept.set('v', videoId)
        parsed.search = kept.toString()
        return parsed.toString()
      }
    }

    for (const key of Array.from(parsed.searchParams.keys())) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.delete(key)
      }
    }

    if (parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, '')
    }

    return parsed.toString()
  } catch {
    return String(rawUrl || '').trim()
  }
}
