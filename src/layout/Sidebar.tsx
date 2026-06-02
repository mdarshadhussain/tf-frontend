import { 
  LogOut, 
  LayoutDashboard, 
  Users, 
  MapPin, 
  Wallet, 
  Building2, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  UserCheck,
  User
} from 'lucide-react';

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { fetchStats, fetchAllLogs } from '../api/api';
import './Sidebar.css';

interface SidebarProps {
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar = ({ onClose, collapsed, onToggleCollapse }: SidebarProps) => {
  const { user, isAdmin, logout } = useAuth();
  const isEmployee = user?.role === 'EMPLOYEE';

  const { t } = useTranslation();
  const isManager = user?.role === 'MANAGER' || isAdmin;

  const [pulseData, setPulseData] = useState<{ 
    present: number; 
    absent: number; 
    percent: number;
    totalHours: number;
    overtimeHours: number;
  }>({
    present: 24,
    absent: 2,
    percent: 92,
    totalHours: 0,
    overtimeHours: 0
  });

  useEffect(() => {
    if (collapsed) return;

    const loadPulseData = async () => {
      try {
        if (user?.role === 'EMPLOYEE') {
          // Regular Employee: Calculate monthly metrics (working hours & overtime)
          const logs = await fetchAllLogs();
          const myLogs = logs.filter((l: any) => l.employeeId === user.id);
          const now = new Date();
          const currentMonthLogs = myLogs.filter((l: any) => {
            const d = new Date(l.date || l.clockIn);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          });

          let totalWorkingHours = 0;
          let totalOvertimeHours = 0;

          // Group by day to compute daily overtime (shift threshold = 8h)
          const dailyHours: { [key: string]: number } = {};
          currentMonthLogs.forEach((l: any) => {
            if (l.clockIn && l.clockOut) {
              const dateStr = new Date(l.date || l.clockIn).toDateString();
              const durationHrs = (new Date(l.clockOut).getTime() - new Date(l.clockIn).getTime()) / 3600000;
              dailyHours[dateStr] = (dailyHours[dateStr] || 0) + durationHrs;
            }
          });

          Object.values(dailyHours).forEach((hrs) => {
            totalWorkingHours += hrs;
            if (hrs > 8) {
              totalOvertimeHours += (hrs - 8);
            }
          });

          setPulseData({
            present: 0,
            absent: 0,
            percent: 0,
            totalHours: totalWorkingHours,
            overtimeHours: totalOvertimeHours
          });
        } else {
          // Admin or Manager: System/Site wide active snapshot of checked-in workers for today
          const stats = await fetchStats();
          const present = stats.presentToday !== undefined ? stats.presentToday : (stats.activeNow || 0);
          const absent = stats.absentToday !== undefined ? stats.absentToday : 0;
          const total = stats.totalEmployees || 1;
          const percent = Math.min(100, Math.round((present / total) * 100));
          setPulseData({ 
            present, 
            absent, 
            percent, 
            totalHours: 0, 
            overtimeHours: 0 
          });
        }
      } catch (err) {
        console.error('Failed to sync sidebar daily pulse metrics:', err);
      }
    };

    loadPulseData();
    const interval = setInterval(loadPulseData, 30000); // Sync every 30s
    return () => clearInterval(interval);
  }, [collapsed, user]);

  const menuItems = [
    ...(user?.role !== 'MANAGER' ? [{ icon: <LayoutDashboard size={20} />, label: t('dashboard'), path: '/dashboard' }] : []),
    ...(isManager ? [{ icon: <UserCheck size={20} />, label: t('siteAttendance'), path: '/attendance/manager' }] : []),
    ...(isManager ? [{ icon: <Users size={20} />, label: t('employees'), path: '/employees' }] : []),
    { icon: <Calendar size={20} />, label: t('attendance'), path: '/attendance' },
    ...(isAdmin ? [{ icon: <MapPin size={20} />, label: t('tracking'), path: '/tracking' }] : []),
    ...((isEmployee || isAdmin) ? [{ icon: <Wallet size={20} />, label: isEmployee ? t('payrollHistory') : t('payroll'), path: '/payroll' }] : []),
    { icon: <Building2 size={20} />, label: t('sites'), path: '/sites' },
    { icon: <User size={20} />, label: t('profile'), path: '/profile' },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-section">
          <div className="logo-icon-box">
            <Building2 size={24} className="logo-icon-svg" />
          </div>
          {!collapsed && (
            <div className="logo-text-group">
              <span className="logo-main">TrackForce</span>
              <span className="logo-sub">Workforce Intel</span>
            </div>
          )}
        </div>

        <button className="collapse-toggle-btn desktop-only" onClick={onToggleCollapse}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="nav-menu">
        {!collapsed && <div className="nav-section-label">{t('mainMenu')}</div>}
        {menuItems.map((item) => (
          <Link 
            key={item.path} 
            to={item.path}
            className={`nav-item ${window.location.pathname === item.path ? 'active' : ''}`}
            onClick={() => window.innerWidth < 1024 && onClose?.()}
            title={collapsed ? item.label : ''}
          >
            <div className="nav-icon-wrapper">
              {item.icon}
            </div>
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && (
          <>
            <div className="pulse-card">
              <div className="pulse-header">
                <span className="pulse-label">{isEmployee ? t('monthlyPulse') : t('dailyPulse')}</span>
                <div className="pulse-dot"></div>
              </div>
              <div className="pulse-stats">
                {isEmployee ? (
                  <>
                    <div className="pulse-stat">
                      <span className="pulse-value">{pulseData.totalHours.toFixed(1)}h</span>
                      <span className="pulse-desc">{t('workingHours')}</span>
                    </div>
                    <div className="pulse-stat">
                      <span className="pulse-value accent">{pulseData.overtimeHours.toFixed(1)}h</span>
                      <span className="pulse-desc">{t('overtime')}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="pulse-stat">
                      <span className="pulse-value">{pulseData.present}</span>
                      <span className="pulse-desc">{t('presentLabel')}</span>
                    </div>
                    <div className="pulse-stat">
                      <span className="pulse-value accent">{pulseData.absent}</span>
                      <span className="pulse-desc">{t('absentLabel')}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="pulse-progress-bg">
                <div 
                  className="pulse-progress-fill" 
                  style={{ width: `${isEmployee ? Math.min(100, (pulseData.totalHours / 160) * 100) : pulseData.percent}%` }}
                ></div>
              </div>
            </div>

            <a 
              href="https://zalo.me/0911907082" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-sidebar-primary"
            >
              <HelpCircle size={18} />
              <span>{t('contactSupport')}</span>
            </a>
          </>
        )}
        
        <button onClick={logout} className="logout-btn-sidebar">
          <LogOut size={18} />
          {!collapsed && <span>{t('logout')}</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
