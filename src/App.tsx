import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AstraProvider } from './context/AstraContext';
import { AppLayout } from './components/layout/AppLayout';
import { StagePage } from './pages/StagePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CheckInPage } from './pages/CheckInPage';
import { MedicalReviewPage } from './pages/MedicalReviewPage';

export function App() {
  return (
    <BrowserRouter>
      <AstraProvider>
        <AppLayout>
          <Routes>
            {/* 1. Stage (Home) */}
            <Route path="/" element={<StagePage />} />
            <Route path="/stage" element={<Navigate to="/" replace />} />

            {/* 2. Health Analytics */}
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/analysis" element={<Navigate to="/analytics" replace />} />

            {/* 3. Daily Check-in & Self-Assessment */}
            <Route path="/check-in" element={<CheckInPage />} />
            <Route path="/assessment" element={<Navigate to="/check-in" replace />} />

            {/* 4. Clinical Medical Review */}
            <Route path="/medical" element={<MedicalReviewPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </AstraProvider>
    </BrowserRouter>
  );
}

export default App;
