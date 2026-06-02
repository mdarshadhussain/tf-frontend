import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import { Login } from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import AddEmployee from './pages/AddEmployee';
import Attendance from './pages/Attendance';
import AttendanceGrid from './pages/AttendanceGrid';
import Tracking from './pages/Tracking';
import Payroll from './pages/Payroll.tsx';
import Sites from './pages/Sites.tsx';
import Profile from './pages/Profile.tsx';
import ManagerAttendance from './pages/ManagerAttendance.tsx';
import EmployeeDetails from './pages/EmployeeDetails.tsx';
import CompleteProfile from './pages/CompleteProfile.tsx';
import Holidays from './pages/Holidays.tsx';
import NotFound from './pages/NotFound.tsx';
import Sidebar from './layout/Sidebar';
import Topbar from './layout/Topbar';
import MobileNav from './layout/MobileNav';
import './App.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { loadFaceApiModels } from './utils/aiModels';

// Pre-load AI models in the background
loadFaceApiModels().catch(console.error);

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Simple Layout Wrapper
const PlatformLayout = ({ children, hideSidebar = false }: { children: React.ReactNode; hideSidebar?: boolean }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className={`app-container ${collapsed ? 'sidebar-collapsed' : ''} ${hideSidebar ? 'no-sidebar' : ''}`}>
      {!hideSidebar && (
        <>
          <div className={`sidebar-wrapper ${sidebarOpen ? 'mobile-open' : ''} ${collapsed ? 'collapsed' : ''}`}>
            <Sidebar 
              collapsed={collapsed} 
              onToggleCollapse={() => setCollapsed(!collapsed)} 
              onClose={() => setSidebarOpen(false)} 
            />
          </div>
          <div className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}></div>
        </>
      )}
      
      <div className="main-view-wrapper">
        <Topbar onMenuClick={!hideSidebar ? () => setSidebarOpen(true) : undefined} hideMenuBtn={hideSidebar} />
        <main className="main-stage">
          <div className="content-area">
            {children}
          </div>
        </main>
        {!hideSidebar && <MobileNav />}
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />

            {/* Private/Platform Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><PlatformLayout><Dashboard /></PlatformLayout></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute><PlatformLayout><Employees /></PlatformLayout></ProtectedRoute>} />
            <Route path="/employees/add" element={<ProtectedRoute adminOnly><PlatformLayout><AddEmployee /></PlatformLayout></ProtectedRoute>} />
            <Route path="/employees/edit/:id" element={<ProtectedRoute><PlatformLayout><AddEmployee /></PlatformLayout></ProtectedRoute>} />
            <Route path="/employees/complete/:id" element={<ProtectedRoute><PlatformLayout><CompleteProfile /></PlatformLayout></ProtectedRoute>} />
            <Route path="/employees/:id" element={<ProtectedRoute><PlatformLayout><EmployeeDetails /></PlatformLayout></ProtectedRoute>} />
            <Route path="/attendance" element={<ProtectedRoute><PlatformLayout><Attendance /></PlatformLayout></ProtectedRoute>} />
            <Route path="/attendance/grid" element={<ProtectedRoute><PlatformLayout><AttendanceGrid /></PlatformLayout></ProtectedRoute>} />
            <Route path="/attendance/manager" element={<ProtectedRoute><PlatformLayout><ManagerAttendance /></PlatformLayout></ProtectedRoute>} />
            <Route path="/tracking" element={<ProtectedRoute adminOnly><PlatformLayout><Tracking /></PlatformLayout></ProtectedRoute>} />
            <Route path="/payroll" element={<ProtectedRoute><PlatformLayout><Payroll /></PlatformLayout></ProtectedRoute>} />
            <Route path="/holidays" element={<ProtectedRoute adminOnly><PlatformLayout><Holidays /></PlatformLayout></ProtectedRoute>} />
            <Route path="/sites" element={<ProtectedRoute><PlatformLayout><Sites /></PlatformLayout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><PlatformLayout><Profile /></PlatformLayout></ProtectedRoute>} />
            <Route path="/settings" element={<Navigate to="/profile" replace />} />

            {/* Render Custom 404 Page instead of redirecting */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
