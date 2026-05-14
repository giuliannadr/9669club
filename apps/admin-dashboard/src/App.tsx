import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import Home from './pages/Home';
import ContentBoard from './pages/ContentBoard';
import LiveControl from './pages/LiveControl';
import EditorialCalendar from './pages/EditorialCalendar';
import PortfolioManager from './pages/PortfolioManager';
import QuotesBilling from './pages/QuotesBilling';
import Settings from './pages/Settings';
import GuestLive from './pages/GuestLive';
import StageView from './pages/StageView';

const AdminLayout = () => (
  <DashboardLayout>
    <Outlet />
  </DashboardLayout>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public standalone routes */}
        <Route path="/live/:roomId" element={<GuestLive />} />
        <Route path="/stage/:roomId" element={<StageView />} />

        {/* Admin routes wrapped in DashboardLayout */}
        <Route element={<AdminLayout />}>
          <Route path="/"              element={<Home />} />
          <Route path="/live-control"  element={<LiveControl />} />
          <Route path="/content-board" element={<ContentBoard />} />
          <Route path="/calendar"      element={<EditorialCalendar />} />
          <Route path="/portfolio"     element={<PortfolioManager />} />
          <Route path="/billing"       element={<QuotesBilling />} />
          <Route path="/settings"      element={<Settings />} />
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
