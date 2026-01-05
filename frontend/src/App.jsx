import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ActiveNumbers from './pages/ActiveNumbers';
import GHLIntegration from './pages/GHLIntegration';
import BulkPurchase from './pages/BulkPurchase';
import Analytics from './pages/Analytics';
import SetterPerformance from './pages/Setterperformance';
import CloserManagement from './pages/CloserManagement';
import SystemStatus from './pages/Systemstatus';
import CloserOnboarding from './pages/CloserOnboarding';
import CallsManagement from './pages/CallsManagement';
import SalesAnalytics from './pages/SalesAnalytics';

// Placeholder pages for new routes
const TeamManagement = () => <CloserManagement />;
const PhoneNumbers = () => <ActiveNumbers />;
const AnalyticsReports = () => <Analytics />;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          {/* Team Management */}
          <Route path="closers" element={<TeamManagement />} />
          <Route path="setters" element={<SetterPerformance />} />
          
          {/* Phone Numbers */}
          <Route path="numbers" element={<PhoneNumbers />} />
          <Route path="bulk-purchase" element={<BulkPurchase />} />
          
          {/* Analytics & Reports */}
          <Route path="analytics" element={<AnalyticsReports />} />
          <Route path="calls-analytics" element={<CallsManagement />} />
          <Route path="sales" element={<SalesAnalytics />} />
          
          {/* System Status */}
          <Route path="system-status" element={<SystemStatus />} />
          
          {/* Legacy routes - keep for now */}
          <Route path="ghl" element={<GHLIntegration />} />
        </Route>

        {/* Public Onboarding Page */}
        <Route path="/onboard" element={<CloserOnboarding />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;