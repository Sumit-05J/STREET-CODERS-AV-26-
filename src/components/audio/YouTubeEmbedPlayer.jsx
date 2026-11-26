import React, { useEffect, useRef, useState } from 'react'
import { ExternalLink, AlertCircle } from 'lucide-react'

let ytApiPromise = null

function loadYouTubeIframeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (ytApiPromise) return ytApiPromise

  ytApiPromise = new Promise((resolve, reject) => {
    const prevReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.()
      resolve(window.YT)
    }

    const existing = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    )
    if (!existing) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      script.onerror = () => reject(new Error('Could not load YouTube Player API.'))
      document.head.appendChild(script)
    }
  })

  return ytApiPromise
}

export function extractYouTubeVideoId(rawUrl) {
  try {
    const parsed = new URL(rawUrl)
    const host = parsed.hostname.toLowerCase()
    if (host === 'youtu.be') {
      return parsed.pathname.split('/').filter(Boolean)[0] || null
    }
    if (host.includes('youtube.com')) {
      const v = parsed.searchParams.get('v')
      if (v) return v
      const parts = parsed.pathname.split('/').filter(Boolean)
      if ((parts[0] === 'embed' || parts[0] === 'shorts') && parts[1]) {
        return parts[1]
      }
    }
  } catch {
    return null
  }
  return null
}

const YT_ERROR_MESSAGES = {
  2: 'Invalid YouTube video ID.',
  5: 'HTML5 player error for this YouTube video.',
  100: 'This YouTube video is unavailable or has been deleted.',
  101: 'The video owner has disabled embedded playback.',
  150: 'The video owner has disabled embedded playback.',
}

export function YouTubeEmbedPlayer({
  videoId,
  sourceUrl,
  title,
  seekToTime = null,
  onTimeUpdate,
  onDurationChange,
  onAutoplayBlocked,
  onPlayStarted,
}) {
  const hostRef = useRef(null)
  const playerRef = useRef(null)
  const isReadyRef = useRef(false)
  const pendingSeekRef = useRef(null)
  const autoplayCheckRef = useRef(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  const performSeek = (targetTime, autoplay) => {
    const player = playerRef.current
    if (!player || !isReadyRef.current) {
      pendingSeekRef.current = { time: targetTime, autoplay }
      return
    }
    const safeTime = Math.max(0, Number(targetTime || 0))
    player.seekTo(safeTime, true)
    onTimeUpdate?.(safeTime)

    if (autoplay) {
      try {
        player.playVideo()
      } catch {
        onAutoplayBlocked?.(safeTime)
        return
      }
      clearTimeout(autoplayCheckRef.current)
      autoplayCheckRef.current = setTimeout(() => {
        try {
          const st = player.getPlayerState?.()
          if (st !== 1 && st !== 3) {
            onAutoplayBlocked?.(safeTime)
          }
        } catch {
          // Ignore state read errors
        }
      }, 900)
    }
  }

  useEffect(() => {
    if (!videoId || !hostRef.current) return
    let cancelled = false
    let pollTimer = null
    setIsLoading(true)
    setErrorMsg('')
    isReadyRef.current = false

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !hostRef.current) return
        const mountEl = document.createElement('div')
        hostRef.current.innerHTML = ''
        hostRef.current.appendChild(mountEl)

        const player = new YT.Player(mountEl, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            enablejsapi: 1,
            rel: 0,
            modestbranding: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (evt) => {
              if (cancelled) return
              isReadyRef.current = true
              setIsLoading(false)
              const dur = evt.target.getDuration?.() || 0
              if (dur > 0) onDurationChange?.(Math.round(dur))

              if (pendingSeekRef.current) {
                const pending = pendingSeekRef.current
                pendingSeekRef.current = null
                performSeek(pending.time, pending.autoplay)
              }

              pollTimer = setInterval(() => {
                try {
                  const t = evt.target.getCurrentTime?.()
                  if (Number.isFinite(t)) onTimeUpdate?.(t)
                } catch {
                  // Ignore polling error on teardown
                }
              }, 500)
            },
            onStateChange: (evt) => {
              if (evt.data === 1) {
                clearTimeout(autoplayCheckRef.current)
                onPlayStarted?.()
              }
            },
            onError: (evt) => {
              if (cancelled) return
              setIsLoading(false)
              setErrorMsg(
                YT_ERROR_MESSAGES[evt.data] ||
                  'Unable to play this YouTube video in the embedded player.'
              )
            },
          },
        })

        playerRef.current = player
      })
      .catch((err) => {
        if (!cancelled) {
          setIsLoading(false)
          setErrorMsg(err.message || 'Could not initialize YouTube player.')
        }
      })

    return () => {
      cancelled = true
      isReadyRef.current = false
      clearInterval(pollTimer)
      clearTimeout(autoplayCheckRef.current)
      try {
        playerRef.current?.destroy?.()
      } catch {
        // Ignore teardown errors
      }
      playerRef.current = null
    }
  }, [videoId])

  useEffect(() => {
    if (seekToTime === null || seekToTime === undefined) return
    const target = seekToTime.time ?? seekToTime
    const autoplay = Boolean(seekToTime.autoplay)
    performSeek(target, autoplay)
  }, [seekToTime])

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-[var(--border)] bg-black">
      <div ref={hostRef} className="w-full h-full" title={title} />

      {isLoading && !errorMsg && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/75 text-xs text-white/80">
          Loading YouTube player...
        </div>
      )}

      {errorMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#141513]/95 px-6 text-center">
          <AlertCircle className="w-6 h-6 text-[#E86B48]" />
          <p className="text-xs text-[#F2F0E9] max-w-md">{errorMsg}</p>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 text-xs font-medium text-white hover:bg-white/20"
            >
              Watch on YouTube
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}
