import React, { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { TimelineMarker } from './TimelineMarker'

export function Waveform({
  audioUrl,
  mode = 'study',
  annotations = [],
  clips = [],
  activeAnnotationId = null,
  clipRange = null,
  height = 96,
  onReady,
  onTimeUpdate,
  onPlayStateChange,
  onFinish,
  onSelectAnnotation,
  onSelectClip,
  waveSurferRef: externalRef,
}) {
  const containerRef = useRef(null)
  const internalWsRef = useRef(null)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const container = containerRef.current
    if (!container || !audioUrl) return

    let isCleanedUp = false
    setIsLoading(true)
    setLoadError('')

    const accent = mode === 'study' ? '#22D3EE' : '#8B5CF6'

    const audioEl = new Audio()
    audioEl.crossOrigin = 'anonymous'
    audioEl.preload = 'metadata'

    const ws = WaveSurfer.create({
      container,
      waveColor: '#3F3F46',
      progressColor: accent,
      cursorColor: '#F4F4F5',
      cursorWidth: 2,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      height,
      normalize: true,
      media: audioEl,
      url: audioUrl,
    })

    internalWsRef.current = ws
    if (externalRef) externalRef.current = ws

    ws.on('ready', (dur) => {
      if (isCleanedUp) return
      const resolvedDuration = dur || ws.getDuration() || 0
      setDuration(resolvedDuration)
      setIsLoading(false)
      onReady?.(resolvedDuration, ws)
    })

    ws.on('timeupdate', (currentTime) => {
      if (!isCleanedUp) onTimeUpdate?.(currentTime)
    })

    ws.on('play', () => {
      if (!isCleanedUp) onPlayStateChange?.(true)
    })
    ws.on('pause', () => {
      if (!isCleanedUp) onPlayStateChange?.(false)
    })
    ws.on('finish', () => {
      if (isCleanedUp) return
      onPlayStateChange?.(false)
      onFinish?.()
    })

    ws.on('error', (err) => {
      if (isCleanedUp || err?.name === 'AbortError') return
      setIsLoading(false)
      setLoadError(err?.message || 'Could not load audio stream.')
    })

    return () => {
      isCleanedUp = true
      audioEl.pause()
      audioEl.removeAttribute('src')
      audioEl.load()
      ws.destroy()
      internalWsRef.current = null
      if (externalRef) externalRef.current = null
    }
  }, [audioUrl, mode, height])

  const clipStartPct =
    clipRange && duration > 0
      ? Math.max(0, Math.min(100, (clipRange.startTime / duration) * 100))
      : 0
  const clipWidthPct =
    clipRange && duration > 0
      ? Math.max(0, Math.min(100 - clipStartPct, ((clipRange.endTime - clipRange.startTime) / duration) * 100))
      : 0

  return (
    <div className="relative w-full select-none">
      {/* Clip highlight overlay if active */}
      {clipRange && duration > 0 && clipWidthPct > 0 && (
        <div
          className="pointer-events-none absolute top-0 bottom-6 bg-[#8B5CF6]/15 border-x border-[#8B5CF6]/60 z-0"
          style={{ left: `${clipStartPct}%`, width: `${clipWidthPct}%` }}
        />
      )}

      {/* WaveSurfer canvas */}
      <div className="relative rounded-lg bg-[#09090B] border border-[#27272F] px-3 py-3 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#09090B]/80 z-20">
            <span className="text-xs text-[#A1A1AA] animate-pulse">
              Rendering waveform...
            </span>
          </div>
        )}
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#09090B]/90 z-20 px-4 text-center">
            <span className="text-xs text-rose-400">
              Audio playback error: {loadError}
            </span>
          </div>
        )}
        <div ref={containerRef} className="w-full" />
      </div>

      {/* Annotation & Clip marker track */}
      {(annotations.length > 0 || clips.length > 0) && duration > 0 && (
        <div className="relative h-6 mt-1.5 rounded bg-[#09090B] border border-[#27272F]/70">
          <div className="absolute inset-x-0 top-1/2 h-px bg-[#27272F]" />
          {clips.map((clip) => {
            const leftPct = Math.max(0, Math.min(98, (clip.startTime / duration) * 100))
            const widthPct = Math.max(
              1.5,
              Math.min(100 - leftPct, ((clip.endTime - clip.startTime) / duration) * 100)
            )
            return (
              <button
                key={clip.id}
                type="button"
                onClick={() => onSelectClip?.(clip)}
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                title={`Clip: ${clip.title}`}
                className="absolute top-1 bottom-1 rounded-sm bg-emerald-500/35 border border-emerald-400/70 hover:bg-emerald-500/55 transition-colors cursor-pointer z-0"
              />
            )
          })}
          {annotations.map((ann) => (
            <TimelineMarker
              key={ann.id}
              annotation={ann}
              duration={duration}
              mode={mode}
              isActive={ann.id === activeAnnotationId}
              onSelect={onSelectAnnotation}
            />
          ))}
        </div>
      )}
    </div>
  )
}
