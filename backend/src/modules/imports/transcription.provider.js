import fs from 'fs'
import path from 'path'
import { env } from '../../config/env.js'

const WHISPER_MAX_BYTES = 24 * 1024 * 1024

/**
 * Clean provider interface for long-form audio transcription.
 * Never fabricates or hardcodes transcript data when no provider is configured.
 */
export async function transcribeAudio({ filePath, mimeType, duration }) {
  const provider = (env.transcriptionProvider || 'none').toLowerCase()

  if (provider === 'none' || !provider) {
    return {
      status: 'SKIPPED',
      provider: 'none',
      reason:
        'No transcription provider configured (set TRANSCRIPTION_PROVIDER and provider API key).',
      segments: [],
      chapters: [],
    }
  }

  if (provider === 'openai') {
    if (!env.openaiApiKey) {
      return {
        status: 'SKIPPED',
        provider: 'openai',
        reason: 'OPENAI_API_KEY is not configured.',
        segments: [],
        chapters: [],
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return {
        status: 'FAILED',
        provider: 'openai',
        reason: 'Audio file path unavailable for transcription.',
        segments: [],
        chapters: [],
      }
    }

    const stat = await fs.promises.stat(filePath)
    if (stat.size > WHISPER_MAX_BYTES) {
      return {
        status: 'SKIPPED',
        provider: 'openai',
        reason:
          'Audio file exceeds 24 MB single-request limit; chunked transcription required.',
        segments: [],
        chapters: [],
      }
    }

    const buffer = await fs.promises.readFile(filePath)
    const form = new FormData()
    form.append(
      'file',
      new Blob([buffer], { type: mimeType || 'audio/mpeg' }),
      path.basename(filePath)
    )
    form.append('model', 'whisper-1')
    form.append('response_format', 'verbose_json')
    form.append('timestamp_granularities[]', 'segment')

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: form,
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(
        `OpenAI transcription failed (${res.status}): ${errText.slice(0, 200)}`
      )
    }

    const data = await res.json()
    const segments = Array.isArray(data.segments)
      ? data.segments.map((s) => ({
          start: Number(s.start || 0),
          end: Number(s.end || 0),
          text: String(s.text || '').trim(),
        }))
      : []

    return {
      status: 'COMPLETED',
      provider: 'openai',
      duration: Number(data.duration || duration || 0),
      text: String(data.text || '').trim(),
      segments,
      chapters: [],
    }
  }

  return {
    status: 'SKIPPED',
    provider,
    reason: `Unsupported TRANSCRIPTION_PROVIDER "${provider}".`,
    segments: [],
    chapters: [],
  }
}
