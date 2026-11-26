export const MODES = {
  study: {
    id: 'study',
    name: 'Study Mode',
    shortName: 'Study',
    tagline: 'Learn together.',
    description:
      'For students, teachers, and study groups. Capture timestamped doubts, key insights, and revision highlights across lectures.',
    accentColor: '#3F6A58',
    accentBg: 'bg-[var(--accent-study)]/10',
    accentText: 'text-[var(--accent-study)]',
    accentBorder: 'border-[var(--accent-study)]/25',
    recordingNoun: 'Lecture',
    recordingPlural: 'Lectures',
    collectionNoun: 'Subject Playlist',
    collectionPlural: 'Subject Playlists',
    primaryAction: {
      label: 'Upload Lecture',
      shortLabel: 'Upload',
    },
    secondaryAction: {
      label: 'New Subject Playlist',
    },
    dashboardSections: [
      { id: 'recentRecordings', title: 'Recent Lectures' },
      { id: 'openItems', title: 'Unresolved Doubts' },
      { id: 'highlights', title: 'Revision Highlights' },
      { id: 'collections', title: 'Subject Playlists' },
      { id: 'activity', title: 'Group Activity' },
    ],
    annotationCategories: [
      {
        id: 'QUESTION',
        label: 'Question',
        color: '#3F6A58',
        badgeClass: 'bg-[var(--accent-study)]/10 text-[var(--accent-study)] border-[var(--accent-study)]/25',
        dotClass: 'bg-[var(--accent-study)]',
      },
      {
        id: 'NOTE',
        label: 'Note',
        color: '#D9532F',
        badgeClass: 'bg-[var(--accent-creator)]/10 text-[var(--accent-creator)] border-[var(--accent-creator)]/25',
        dotClass: 'bg-[var(--accent-creator)]',
      },
    ],
    statusLabels: {
      OPEN: {
        label: 'Unresolved',
        badgeClass: 'bg-[#B7791F]/10 text-[var(--warning)] border-[#B7791F]/25',
      },
      RESOLVED: {
        label: 'Resolved',
        badgeClass: 'bg-[var(--accent-study)]/12 text-[var(--success)] border-[var(--accent-study)]/30',
      },
    },
    filters: ['ALL', 'QUESTION', 'NOTE'],
    emptyStateText: 'No study annotations match this filter yet.',
  },
  creator: {
    id: 'creator',
    name: 'Creator Mode',
    shortName: 'Creator',
    tagline: 'Create together.',
    description:
      'For podcasters, interviewers, and audio teams. Leave timestamped feedback, correction markers, and approve highlight clips.',
    accentColor: '#D9532F',
    accentBg: 'bg-[var(--accent-creator)]/10',
    accentText: 'text-[var(--accent-creator)]',
    accentBorder: 'border-[var(--accent-creator)]/25',
    recordingNoun: 'Episode',
    recordingPlural: 'Episodes',
    collectionNoun: 'Show',
    collectionPlural: 'Shows',
    primaryAction: {
      label: 'Upload Episode',
      shortLabel: 'Upload',
    },
    secondaryAction: {
      label: 'New Show',
    },
    dashboardSections: [
      { id: 'recentRecordings', title: 'Recent Episodes' },
      { id: 'openItems', title: 'Pending Feedback' },
      { id: 'highlights', title: 'Approved Highlights' },
      { id: 'collections', title: 'Shows & Feeds' },
      { id: 'activity', title: 'Production Activity' },
    ],
    annotationCategories: [
      {
        id: 'FEEDBACK',
        label: 'Feedback',
        color: '#D9532F',
        badgeClass: 'bg-[var(--accent-creator)]/10 text-[var(--accent-creator)] border-[var(--accent-creator)]/25',
        dotClass: 'bg-[var(--accent-creator)]',
      },
      {
        id: 'CORRECTION',
        label: 'Correction',
        color: '#B93829',
        badgeClass: 'bg-[#B93829]/10 text-[var(--danger)] border-[#B93829]/25',
        dotClass: 'bg-[#B93829]',
      },
      {
        id: 'SUGGESTION',
        label: 'Suggestion',
        color: '#3F6A58',
        badgeClass: 'bg-[var(--accent-study)]/10 text-[var(--accent-study)] border-[var(--accent-study)]/25',
        dotClass: 'bg-[var(--accent-study)]',
      },
    ],
    statusLabels: {
      OPEN: {
        label: 'Pending',
        badgeClass: 'bg-[#B93829]/10 text-[var(--danger)] border-[#B93829]/25',
      },
      RESOLVED: {
        label: 'Approved',
        badgeClass: 'bg-[var(--accent-study)]/12 text-[var(--success)] border-[var(--accent-study)]/30',
      },
    },
    filters: ['ALL', 'FEEDBACK', 'CORRECTION', 'SUGGESTION'],
    emptyStateText: 'No production notes match this filter yet.',
  },
}

export function getModeConfig(mode) {
  return MODES[mode] || MODES.study
}

export function getCategoryMeta(mode, categoryId) {
  const cfg = getModeConfig(mode)
  const normalized =
    mode === 'study' && (categoryId === 'INSIGHT' || categoryId === 'REVISION')
      ? 'NOTE'
      : categoryId
  return (
    cfg.annotationCategories.find((c) => c.id === normalized) ||
    cfg.annotationCategories[0]
  )
}

export function getStatusMeta(mode, statusId) {
  const cfg = getModeConfig(mode)
  const normalized = String(statusId || 'OPEN').toUpperCase()
  return cfg.statusLabels[normalized] || cfg.statusLabels.OPEN
}
