import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scissors } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Input, Textarea } from '../ui/Input'
import { Button } from '../ui/Button'
import { formatTime, parseTimeInput } from '../../utils/time'

export function CreateClipModal({
  isOpen,
  onClose,
  recording,
  initialStartTime = 0,
  onCreateClip,
}) {
  const navigate = useNavigate()
  const maxDur = recording?.duration || 42

  const [title, setTitle] = useState('')
  const [startInput, setStartInput] = useState(formatTime(initialStartTime))
  const [endInput, setEndInput] = useState(
    formatTime(Math.min(maxDur, initialStartTime + 12))
  )
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setStartInput(formatTime(initialStartTime))
      setEndInput(formatTime(Math.min(maxDur, initialStartTime + 12)))
      setError('')
    }
  }, [isOpen, initialStartTime, maxDur])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const startTime = parseTimeInput(startInput)
    const endTime = parseTimeInput(endInput)

    if (!title.trim()) {
      setError('Please provide a clip title.')
      return
    }
    if (endTime <= startTime) {
      setError('End timestamp must be after start timestamp.')
      return
    }

    const created = await onCreateClip({
      recordingId: recording.id,
      title: title.trim(),
      startTime,
      endTime: Math.min(maxDur, endTime),
      notes: notes.trim(),
    })

    setTitle('')
    setNotes('')
    setError('')
    onClose()
    if (created?.shareToken || created?.id) {
      navigate(`/clips/${created.shareToken || created.id}`)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Highlight Clip"
      subtitle={`Extract a shareable segment from "${recording?.title || 'Recording'}".`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Clip Title"
          placeholder="e.g. Key takeaway on leader election"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setError('')
          }}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start Time (m:ss)"
            value={startInput}
            onChange={(e) => {
              setStartInput(e.target.value)
              setError('')
            }}
            className="font-mono"
          />
          <Input
            label="End Time (m:ss)"
            value={endInput}
            onChange={(e) => {
              setEndInput(e.target.value)
              setError('')
            }}
            className="font-mono"
          />
        </div>

        <Textarea
          label="Clip Notes (optional)"
          placeholder="Why this segment matters or context for viewers..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            <Scissors className="w-3.5 h-3.5" />
            Save & Open Share Page
          </Button>
        </div>
      </form>
    </Modal>
  )
}
