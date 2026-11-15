import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SolarisProvider } from './context/SolarisContext';
import { SolarisVoiceProvider } from './context/SolarisVoiceContext';
import { AppLayout } from './components/layout/AppLayout';

// Page Components
import { StagePage } from './pages/StagePage';
import { HealthMonitoringPage } from './pages/HealthMonitoringPage';
import { BodyExplorerPage } from './pages/BodyExplorerPage';
import { CheckInPage } from './pages/CheckInPage';
import { MeasurePage } from './pages/MeasurePage';
import { EyeScreeningPage } from './pages/EyeScreeningPage';
import { RoutinePage } from './pages/RoutinePage';
import { ExercisePage } from './pages/ExercisePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { MedicalReviewPage } from './pages/MedicalReviewPage';
import { EnvironmentPage } from './pages/EnvironmentPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <BrowserRouter>
      <SolarisProvider>
        <SolarisVoiceProvider>
          <AppLayout>
            <Routes>
            {/* 1. Mission Overview / Holographic Stage */}
            <Route path="/" element={<StagePage />} />
            <Route path="/overview" element={<StagePage />} />
            <Route path="/stage" element={<Navigate to="/" replace />} />

            {/* 2. Health Monitoring & Physiological Telemetry */}
            <Route path="/monitoring" element={<HealthMonitoringPage />} />
            <Route path="/health-monitoring" element={<Navigate to="/monitoring" replace />} />

            {/* 3. Anatomical Body Explorer */}
            <Route path="/body" element={<BodyExplorerPage />} />
            <Route path="/explorer" element={<Navigate to="/body" replace />} />
            <Route path="/anatomy" element={<Navigate to="/body" replace />} />

            {/* 4. Daily Health Assessment & Check-In */}
            <Route path="/check-in" element={<CheckInPage />} />
            <Route path="/assessment" element={<CheckInPage />} />

            {/* 5. Measurement & Diagnostics Centre */}
            <Route path="/measure" element={<MeasurePage />} />
            <Route path="/measure/:metricId" element={<MeasurePage />} />

            {/* 6. Amsler Grid Eye Screening */}
            <Route path="/vision" element={<EyeScreeningPage />} />
            <Route path="/eye-screening" element={<Navigate to="/vision" replace />} />

            {/* 7. Daily Routine & Schedule */}
            <Route path="/routine" element={<RoutinePage />} />

            {/* 8. Countermeasures & Exercise */}
            <Route path="/exercise" element={<ExercisePage />} />

            {/* 9. Health Analytics */}
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/analysis" element={<Navigate to="/analytics" replace />} />

            {/* 10. Clinical Medical Review */}
            <Route path="/medical" element={<MedicalReviewPage />} />
            <Route path="/review" element={<Navigate to="/medical" replace />} />
            <Route path="/clinical" element={<Navigate to="/medical" replace />} />

            {/* 11. Mission Habitat Environment */}
            <Route path="/environment" element={<EnvironmentPage />} />
            <Route path="/habitat" element={<Navigate to="/environment" replace />} />

            {/* 12. Mission Settings & Simulation Controls */}
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/config" element={<Navigate to="/settings" replace />} />

            {/* Fallback - No Dead Links */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
        </SolarisVoiceProvider>
      </SolarisProvider>
    </BrowserRouter>
  );
}

export default App;
