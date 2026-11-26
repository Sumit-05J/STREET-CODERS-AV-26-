# EchoSpace

**Listen. Understand. Discuss. Create.**

EchoSpace is a full-stack, PostgreSQL-backed audio collaboration platform with a Manifest V3 Chrome Extension, supporting **Study Mode** (for students, teachers, and study groups) and **Creator Mode** (for podcasters, interviewers, and audio teams).

---

## Architecture & Implemented Features

### 1. Frontend Web Application (`src/`)
Built with **React 19**, **Vite**, **Tailwind CSS v4**, **React Router**, **Zustand**, **WaveSurfer.js**, **Axios**, and **Socket.IO Client**, styled with an editorial + precision-audio design system supporting **Light**, **Dark**, and **System** themes (`src/utils/theme.js`, `src/styles/index.css` CSS variables, no-flash boot script in `index.html`, `#D9532F`/`#E86B48` burnt coral for Creator Mode, `#3F6A58`/`#5D947D` muted sage for Study Mode, `Newsreader` display serif, `Plus Jakarta Sans` UI sans, and `JetBrains Mono` timestamps).

- **Authentication & RBAC Workspaces**: Real registration/login, JWT persistence, protected `/app/*` routes ([AppLayout.jsx](file:///c:/Users/sumit/EchoSpace/src/layouts/AppLayout.jsx)), **Create Workspace** (name, description, Study/Creator mode), **Join Workspace** via `/join/:token` invitation link or `ECHO-XXXXXX` code, **My Workspaces** dashboard cards, **Owner-only Delete Workspace** (in [SettingsPage.jsx](file:///c:/Users/sumit/EchoSpace/src/pages/SettingsPage.jsx) Danger Zone, with confirmation, DB cascade cleanup, and exclusive uploaded-audio storage removal), and dual-mode switching driven by [modeConfig.js](file:///c:/Users/sumit/EchoSpace/src/config/modeConfig.js).
- **Members & Invitations (`/app/members`, `/join/:token`)**: Generate hashed invitation links and short invite codes with optional expiry and role (`ADMIN`, `EDITOR`, `MEMBER`, `VIEWER`), revoke invitations, remove members, and receive live `workspace:<workspaceId>` Socket.IO updates.
- **Unified Audio Workspace (`/app/recordings/:id`)**:
  - Single authoritative [AudioPlayer.jsx](file:///c:/Users/sumit/EchoSpace/src/components/audio/AudioPlayer.jsx) + [Waveform.jsx](file:///c:/Users/sumit/EchoSpace/src/components/audio/Waveform.jsx) using WaveSurfer.js backed by an `HTMLAudioElement` (`crossOrigin="anonymous"`, `preload="metadata"`) for native HTTP `206 Partial Content` Range streaming, explicit JWT `?token=` passing, React StrictMode cleanup guard, and pending pre-ready seek queue.
  - Official YouTube/Vimeo `<iframe>` embeds for `EXTERNAL_LINK` video episodes (no unauthorized downloading), plus personal **Bookmarks** (`/api/episodes/:id/bookmarks`) for revisiting timestamps.
  - **Study Mode**: Timestamped **Questions** and unified **Notes** (legacy `INSIGHT`/`REVISION` migrated/normalized to `NOTE`); clicking any question/note card or notification navigates directly to its exact timestamp.
  - **Creator Mode**: Timestamped **Feedback**, **Corrections**, and **Suggestions** with `OPEN`/`RESOLVED` status tracking, chapters, playlists, and RSS 2.0 feeds.
  - **Manual Highlight Recording & Clips**: **Start Highlight / Stop Highlight / Cancel** during playback to capture exact intervals, preview intervals in [ClipModal.jsx](file:///c:/Users/sumit/EchoSpace/src/components/clips/ClipModal.jsx), play `[startTime, endTime]` intervals (stopping or looping at `endTime`), delete clips, and share via `/clips/:token` ([ClipSharePage.jsx](file:///c:/Users/sumit/EchoSpace/src/pages/ClipSharePage.jsx)).
  - **Notifications**: Persistent + real-time Socket.IO notification bell in [Navbar.jsx](file:///c:/Users/sumit/EchoSpace/src/components/layout/Navbar.jsx) when someone answers your question, with unread count, mark-as-read, and deep-linking to the exact recording and timestamp.
  - **Upload, External Import & Deletion**: Upload audio files, import direct audio URLs or Podcast RSS episodes via [UploadRecordingModal.jsx](file:///c:/Users/sumit/EchoSpace/src/components/dashboard/UploadRecordingModal.jsx), link external media, and securely delete recordings with confirmation.

### 2. Backend API, Database & Worker (`backend/`)
Built with **Node.js**, **Express.js**, **Prisma ORM**, **PostgreSQL**, **JWT**, **bcryptjs**, **Zod**, **Multer**, **Socket.IO**, `@aws-sdk/client-s3`, and `fast-xml-parser`.

- **PostgreSQL Schema & Migrations (`backend/prisma/schema.prisma`, `backend/prisma/migrations/0001_init/migration.sql`, `0002_workspace_invitations/migration.sql`, `backend/prisma/upgrade_legacy_notes.sql`)**:
  - UUID models: `User`, `Workspace` (with `description`), `WorkspaceMember` (`OWNER`, `ADMIN`, `EDITOR`, `MEMBER`, `VIEWER`), `WorkspaceInvitation` (`tokenHash`, `code`, `expiresAt`, `revokedAt`), `Show`, `Episode` (with `deletedAt` staged soft-delete), `Annotation`, `AnnotationReply`, `Clip`, `Chapter`, `Playlist`, `PlaylistEpisode`, `Bookmark`, `Notification`, and `ImportJob`.
- **Auth & Workspaces**: `/api/auth/*` (including short-lived single-use `/api/auth/handoff` & `/api/auth/handoff/exchange` for secure Chrome extension → web app session handoff), `/api/users/me`, `/api/workspaces/*`, `/api/invitations/:token`, `/api/invitations/:token/accept`, `/api/workspaces/join` with rate limiting and server-enforced RBAC.
- **Audio Upload, Streaming & Storage (`backend/src/utils/storage.js`)**:
  - Supports `STORAGE_DRIVER=local` (dev/persistent disk, `EXDEV`-safe) and `STORAGE_DRIVER=s3` (S3-compatible object storage with range reads).
  - `POST /api/episodes/upload` (extension + magic-byte validation, orphan cleanup), `POST /api/episodes/external`, `GET /api/episodes/:id/audio` (`206 Partial Content` Range streaming), `DELETE /api/episodes/:id` (atomic `deletedAt` soft-delete → storage removal → hard-delete, with startup pending-delete recovery).
- **External Audio, Video Extraction & RSS Import Queue (`backend/src/modules/imports/`, `backend/src/modules/imports/transcription.provider.js`, `backend/src/utils/ssrf.js`)**:
  - `POST /api/imports`, `POST /api/imports/video` (user-uploaded video audio extraction via FFmpeg), `POST /api/imports/rss/preview` (with episode/channel artwork), `POST /api/imports/rss/episode`, `GET /api/imports/:id`, `POST /api/imports/:id/retry`, `POST /api/imports/:id/cancel`.
  - DB-backed persistent queue (`QUEUED` → `PROCESSING` → `COMPLETED` / `FAILED` / `CANCELLED`) with atomic job claiming, canonical URL duplicate prevention, startup recovery, DNS-pinned SSRF protection, safe XML parsing (`processEntities: false`), optional `ffprobe` duration detection, and an explicit transcription provider interface (`TRANSCRIPTION_PROVIDER=none|openai`, never faking transcripts when unconfigured).
- **Notifications & Socket.IO**:
  - `/api/notifications`, `/api/notifications/:id/read`, `/api/notifications/read-all`.
  - JWT-authenticated Socket.IO rooms (`user:<id>` and `episode:<id>`) for live annotations, replies, clips, and notifications, plus graceful shutdown on `SIGTERM`/`SIGINT`.

### 3. Chrome Extension (`extension/`)
Manifest V3 extension ([manifest.json](file:///c:/Users/sumit/EchoSpace/extension/manifest.json)) with `activeTab`, `storage`, `scripting`, and locally bundled [wavesurfer.min.js](file:///c:/Users/sumit/EchoSpace/extension/vendor/wavesurfer.min.js):
- Signs in with your EchoSpace account (handling expired `401` sessions cleanly), switches and remembers the last selected workspace & Study/Creator mode, and selects either active tab media or any existing workspace episode.
- Renders a compact **WaveSurfer.js** waveform (play/pause, seek, time/duration) for EchoSpace audio streams and CORS-accessible external audio, and shows explicit status messages when waveform rendering is blocked by CORS or restricted players (YouTube/Vimeo/Spotify/DRM).
- Detects canonical URLs via `GET /api/episodes/lookup`, avoids duplicate links, surfaces existing discussions with one-click deep links (`/app/recordings/:id?t=...`), and captures timestamped notes/questions.

---

## How to Run Locally

```bash
# 1. Install dependencies
npm install
npm --prefix backend install

# 2. Configure environment variables
cp .env.example .env
cp backend/.env.example backend/.env
# Update DATABASE_URL and JWT_SECRET in backend/.env

# 3. Start PostgreSQL & sync schema (using Prisma local Postgres or your Postgres)
cd backend
npx prisma dev --name echospace
# In another terminal (from backend/):
npx prisma generate
npx prisma db push

# 4. Start backend & frontend
# Terminal 1 (from backend/): npm run dev
# Terminal 2 (from root):     npm run dev
```

## Production Deployment (Vercel + Render + S3)
- **Frontend (Vercel)**: [vercel.json](file:///c:/Users/sumit/EchoSpace/vercel.json) provides SPA routing rewrites. Set `VITE_API_URL` and `VITE_SOCKET_URL` to your Render backend URL (`https://...` / `wss://...`).
- **Backend & PostgreSQL (Render)**: [render.yaml](file:///c:/Users/sumit/EchoSpace/render.yaml) defines the Node web service (`npm start`, `npx prisma migrate deploy`, `/api/health`) and Render PostgreSQL. Set `CORS_ORIGIN`, `PUBLIC_BASE_URL`, and `S3_*` credentials in the Render dashboard.

## Running Tests & Builds
```bash
npm run build
node backend/tests/e2e.mjs
node backend/tests/audit.mjs
```
