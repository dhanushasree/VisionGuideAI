import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AccessibilityProvider } from "./context/AccessibilityContext";
import ProtectedRoute from "./components/ProtectedRoute";

import LandingPage          from "./pages/LandingPage";
import SignInPage           from "./pages/SignInPage";
import SignUpPage           from "./pages/SignUpPage";
import DashboardPage        from "./pages/DashboardPage";
import VoiceAssistantPage   from "./pages/VoiceAssistantPage";
import EmergencyContactsPage from "./pages/EmergencyContactsPage";
import ArticleReaderPage    from "./pages/ArticleReaderPage";
import NavigationPage       from "./pages/NavigationPage";
import SOSPage              from "./pages/SOSPage";
import SavedLocationsPage   from "./pages/SavedLocationsPage";
import CommandHistoryPage   from "./pages/CommandHistoryPage";
import FeedbackPage         from "./pages/FeedbackPage";
import CameraOCRPage        from "./pages/CameraOCRPage";
import SafeWalkPage         from "./pages/SafeWalkPage";
import SettingsPage         from "./pages/SettingsPage";
import ObjectDetectionPage  from "./pages/ObjectDetectionPage";
import SafetyTipsPage       from "./pages/SafetyTipsPage";

import "./App.css";

export default function App() {
  return (
    <AccessibilityProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/"        element={<LandingPage />} />
            <Route path="/signin"  element={<SignInPage />} />
            <Route path="/signup"  element={<SignUpPage />} />

            {/* Protected dashboard routes */}
            <Route path="/dashboard"          element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/dashboard/voice"    element={<ProtectedRoute><VoiceAssistantPage /></ProtectedRoute>} />
            <Route path="/dashboard/camera"   element={<ProtectedRoute><CameraOCRPage /></ProtectedRoute>} />
            <Route path="/dashboard/safewalk" element={<ProtectedRoute><SafeWalkPage /></ProtectedRoute>} />
            <Route path="/dashboard/emergency" element={<ProtectedRoute><EmergencyContactsPage /></ProtectedRoute>} />
            <Route path="/dashboard/articles" element={<ProtectedRoute><ArticleReaderPage /></ProtectedRoute>} />
            <Route path="/dashboard/navigation" element={<ProtectedRoute><NavigationPage /></ProtectedRoute>} />
            <Route path="/dashboard/sos"      element={<ProtectedRoute><SOSPage /></ProtectedRoute>} />
            <Route path="/dashboard/locations" element={<ProtectedRoute><SavedLocationsPage /></ProtectedRoute>} />
            <Route path="/dashboard/commands" element={<ProtectedRoute><CommandHistoryPage /></ProtectedRoute>} />
            <Route path="/dashboard/feedback" element={<ProtectedRoute><FeedbackPage /></ProtectedRoute>} />
            <Route path="/dashboard/objects"  element={<ProtectedRoute><ObjectDetectionPage /></ProtectedRoute>} />
            <Route path="/dashboard/safety"   element={<ProtectedRoute><SafetyTipsPage /></ProtectedRoute>} />
            <Route path="/dashboard/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </AccessibilityProvider>
  );
}
