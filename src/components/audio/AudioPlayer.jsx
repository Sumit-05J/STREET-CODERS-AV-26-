import React, { useEffect, useRef, useState } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Repeat,
  Volume2,
  VolumeX,
  MessageSquarePlus,
  Scissors,
} from 'lucide-react'
import { Waveform } from './Waveform'
import { Button } from '../ui/Button'
import { formatTime } from '../../utils/time'

const SPEEDS = [0.75, 1, 1.25, 1.5, 2]

export function AudioPlayer({
  recording,
  mode,
  annotations = [],
  clips = [],
  activeAnnotationId = null,
  clipRange = null,
  seekToTime = null,
  defaultSpeed = 1,
  onTimeUpdate,
  onDurationChange,
  onSelectAnnotation,
  onSelectClip,
  onClearClipRange,
  onCreateAnnotation,
  onCreateClip,
  highlightStart = null,
  onStartHighlight,
  onStopHighlight,
  onCancelHighlight,
}) {
  const wsRef = useRef(null)
  const pendingSeekRef = useRef(null)
  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(recording?.duration || 0)
  const [speed, setSpeed] = useState(defaultSpeed)
  const [isLooping, setIsLooping] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    const initialDur = recording?.duration || 0
    setIsReady(false)
    setDuration(initialDur)
    setCurrentTime(0)
    onDurationChange?.(initialDur)
  }, [recording?.id])

  if (!recording) return null

  // External seek requests (e.g. clicking an annotation card, notification, or chapter)
  useEffect(() => {
    if (seekToTime === null || seekToTime === undefined) return
    const rawTarget = seekToTime.time ?? seekToTime
    const maxDur = duration > 0 ? duration : 999999
    const target = Math.max(0, Math.min(rawTarget, maxDur))

    if (!wsRef.current || !isReady) {
      pendingSeekRef.current = { time: rawTarget, autoplay: Boolean(seekToTime.autoplay) }
      setCurrentTime(target)
      return
    }

    const ws = wsRef.current
    ws.setTime(target)
    setCurrentTime(target)
    if (seekToTime.autoplay) {
      ws.play()
    }
  }, [seekToTime, duration, isReady])

  // Keep playback speed synced
  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.setPlaybackRate(speed)
    }
  }, [speed])

  const handleTogglePlay = () => {
    wsRef.current?.playPause()
  }

  const handleSkip = (delta) => {
    if (!wsRef.current) return
    const next = Math.max(0, Math.min(duration, currentTime + delta))
    wsRef.current.setTime(next)
    setCurrentTime(next)
  }

  const handleToggleMute = () => {
    if (!wsRef.current) return
    const nextMuted = !isMuted
    wsRef.current.setVolume(nextMuted ? 0 : 1)
    setIsMuted(nextMuted)
  }

  const handleTimeUpdate = (t) => {
    setCurrentTime(t)
    onTimeUpdate?.(t)
    if (clipRange && t >= clipRange.endTime) {
      if (isLooping) {
        wsRef.current?.setTime(clipRange.startTime)
      } else {
        wsRef.current?.pause()
        wsRef.current?.setTime(clipRange.endTime)
      }
    }
  }

  const handleFinish = () => {
    if (isLooping && wsRef.current) {
      wsRef.current.setTime(clipRange ? clipRange.startTime : 0)
      wsRef.current.play()
    }
  }

  const handleOpenAnnotate = () => {
    if (isPlaying) {
      wsRef.current?.pause()
    }
    onCreateAnnotation?.(Math.floor(currentTime))
  }

  const handleOpenClip = () => {
    onCreateClip?.(Math.floor(currentTime))
  }

  return (
    <div className="rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-[0_2px_10px_rgba(24,24,22,0.04)] p-4 sm:p-5 space-y-4">
      {/* Waveform + Markers */}
      <Waveform
        audioUrl={recording.audioUrl}
        mode={mode}
        annotations={annotations}
        clips={clips}
        activeAnnotationId={activeAnnotationId}
        clipRange={clipRange}
        waveSurferRef={wsRef}
        onReady={(dur, ws) => {
          setIsReady(true)
          setDuration(dur)
          onDurationChange?.(dur)
          ws.setPlaybackRate(speed)
          if (pendingSeekRef.current) {
            const { time, autoplay } = pendingSeekRef.current
            pendingSeekRef.current = null
            const clamped = Math.max(0, Math.min(time, dur || time))
            ws.setTime(clamped)
            setCurrentTime(clamped)
            if (autoplay) ws.play()
          }
        }}
        onTimeUpdate={handleTimeUpdate}
        onPlayStateChange={setIsPlaying}
        onFinish={handleFinish}
        onSelectAnnotation={(ann) => {
          wsRef.current?.setTime(ann.timestamp)
          setCurrentTime(ann.timestamp)
          onSelectAnnotation?.(ann)
        }}
        onSelectClip={(clip) => {
          wsRef.current?.setTime(clip.startTime)
          setCurrentTime(clip.startTime)
          wsRef.current?.play()
          onSelectClip?.(clip)
        }}
      />

      {clipRange && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-md bg-[var(--accent-study)]/10 border border-[var(--accent-study)]/25 text-xs text-[var(--success)]">
          <span>
            Playing interval: <strong className="font-mono">{formatTime(clipRange.startTime)} – {formatTime(clipRange.endTime)}</strong>
          </span>
          {onClearClipRange && (
            <button
              type="button"
              onClick={onClearClipRange}
              className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Exit interval
            </button>
          )}
        </div>
      )}

      {/* Transport & Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSkip(-5)}
            className="p-2 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
            title="Back 5s"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleTogglePlay}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-xs cursor-pointer ${
              mode === 'study'
                ? 'bg-[var(--accent-study)] hover:bg-[var(--accent-study-hover)] text-white'
                : 'bg-[var(--accent-creator)] hover:bg-[var(--accent-creator-hover)] text-white'
            }`}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSkip(5)}
            className="p-2 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
            title="Forward 5s"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <div className="ml-2 font-mono text-xs text-[var(--text-primary)] bg-[var(--bg-primary)] border border-[var(--border)] px-2.5 py-1.5 rounded-md">
            <span>{formatTime(currentTime)}</span>
            <span className="text-[var(--text-muted)] mx-1">/</span>
            <span className="text-[var(--text-secondary)]">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Speed, Loop, Volume */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center bg-[var(--bg-primary)] border border-[var(--border)] rounded-md p-0.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                  speed === s
                    ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsLooping((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
              isLooping
                ? 'bg-[var(--accent-creator)]/10 border-[var(--accent-creator)]/30 text-[var(--accent-creator)]'
                : 'bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Toggle loop playback"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Loop</span>
          </button>

          <button
            type="button"
            onClick={handleToggleMute}
            className="p-2 rounded-md bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Chapter Timeline + Primary Workspace Actions */}
      <div className="pt-3 border-t border-[var(--border)] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mr-1 shrink-0">
            Chapters
          </span>
          {(recording.chapters || []).map((ch) => {
            const isCurrent =
              currentTime >= ch.startTime &&
              !recording.chapters.some(
                (other) =>
                  other.startTime > ch.startTime && currentTime >= other.startTime
              )
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => {
                  wsRef.current?.setTime(ch.startTime)
                  setCurrentTime(ch.startTime)
                }}
                className={`shrink-0 px-2.5 py-1 rounded-md text-xs border transition-colors cursor-pointer ${
                  isCurrent
                    ? 'bg-[#181816] border-[#181816] text-white'
                    : 'bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className={`font-mono text-[10px] mr-1.5 ${isCurrent ? 'text-[#DFDBD2]' : 'text-[var(--text-muted)]'}`}>
                  {formatTime(ch.startTime)}
                </span>
                {ch.title}
              </button>
            )
          })}
        </div>

        {(onCreateAnnotation || onCreateClip || onStartHighlight) && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onCreateAnnotation && (
              <Button
                size="sm"
                variant={mode === 'study' ? 'cyan' : 'primary'}
                onClick={handleOpenAnnotate}
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                Create Annotation
              </Button>
            )}
            {onStartHighlight && highlightStart === null && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onStartHighlight(currentTime)}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                Start Highlight
              </Button>
            )}
            {highlightStart !== null && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/12 border border-rose-500/35 text-xs">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                <span className="text-[var(--danger)] font-mono">
                  {formatTime(highlightStart)} → {formatTime(currentTime)}
                </span>
                <button
                  type="button"
                  onClick={() => onStopHighlight?.(currentTime)}
                  className="ml-1 px-2 py-0.5 rounded bg-rose-500 text-white text-[11px] font-medium hover:bg-rose-600 cursor-pointer"
                >
                  Stop
                </button>
                <button
                  type="button"
                  onClick={() => onCancelHighlight?.()}
                  className="px-1.5 py-0.5 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
            {onCreateClip && highlightStart === null && (
              <Button size="sm" variant="secondary" onClick={handleOpenClip}>
                <Scissors className="w-3.5 h-3.5" />
                Create Clip
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
