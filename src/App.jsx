import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { WorkspaceSelectionPage } from './pages/WorkspaceSelectionPage'
import { DashboardPage } from './pages/DashboardPage'
import { StudyWorkspacePage } from './pages/StudyWorkspacePage'
import { CreatorWorkspacePage } from './pages/CreatorWorkspacePage'
import { RecordingsPage } from './pages/RecordingsPage'
import { AudioWorkspacePage } from './pages/AudioWorkspacePage'
import { DiscussionsPage } from './pages/DiscussionsPage'
import { HighlightsPage } from './pages/HighlightsPage'
import { PlaylistsPage } from './pages/PlaylistsPage'
import { MembersPage } from './pages/MembersPage'
import { SettingsPage } from './pages/SettingsPage'
import { ClipSharePage } from './pages/ClipSharePage'
import { JoinWorkspacePage } from './pages/JoinWorkspacePage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/workspaces" element={<WorkspaceSelectionPage />} />
        <Route path="/join/:token" element={<JoinWorkspacePage />} />
        <Route path="/clips/:id" element={<ClipSharePage />} />

        <Route path="/app" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="study" element={<StudyWorkspacePage />} />
          <Route path="creator" element={<CreatorWorkspacePage />} />
          <Route path="recordings" element={<RecordingsPage />} />
          <Route path="recordings/:id" element={<AudioWorkspacePage />} />
          <Route path="discussions" element={<DiscussionsPage />} />
          <Route path="highlights" element={<HighlightsPage />} />
          <Route path="playlists" element={<PlaylistsPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
