import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Clock,
  TrendingUp,
  Activity,
  CheckCircle2,
  Wallet,
  Calendar,
  Layers,
  Search
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { exportToCSV } from '../utils/export';
import './Dashboard.css';

import { useEffect, useState, useRef } from 'react';
import { fetchStats, fetchSites, fetchEmployees, fetchAllLogs } from '../api/api';
import { useAuth } from '../context/AuthContext';

// Custom Searchable Project Dropdown
const SearchableProjectDropdown = ({ 
  sites, 
  selectedSiteId, 
  onSelectSite 
}: { 
  sites: any[]; 
  selectedSiteId: string; 
  onSelectSite: (id: string) => void; 
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedSite = selectedSiteId === 'ALL' 
    ? { id: 'ALL', name: t('allProjects') } 
    : sites.find(s => s.id === selectedSiteId) || { id: 'ALL', name: t('allProjects') };

  const filteredSites = sites.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="searchable-dropdown" ref={dropdownRef}>
      <button 
        type="button" 
        className={"dropdown-trigger-btn " + (isOpen ? "active" : "")}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Layers size={14} className="trigger-icon" />
        <span>{selectedSite.name}</span>
        <span className="dropdown-arrow">Γû╝</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="dropdown-overlay-deck"
          >
            <div className="dropdown-search-box" onClick={(e) => e.stopPropagation()}>
              <Search size={14} className="search-icon-inside" />
              <input 
                type="text" 
                placeholder={t('searchProjects')} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="dropdown-list-scroller">
              <button 
                type="button"
                className={"dropdown-list-item " + (selectedSiteId === 'ALL' ? 'active' : '')}
                onClick={() => {
                  onSelectSite('ALL');
                  setIsOpen(false);
                  setSearchQuery('');
                }}
              >
                {t('allProjects')}
              </button>
              
              {filteredSites.length > 0 ? (
                filteredSites.map(site => (
                  <button 
                    key={site.id}
                    type="button"
                    className={"dropdown-list-item " + (selectedSiteId === site.id ? 'active' : '')}
                    onClick={() => {
                      onSelectSite(site.id);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                  >
                    {site.name}
                  </button>
                ))
              ) : (
                <div className="dropdown-no-results">{t('noProjectsFound')}</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Custom Date Selection Dropdown
const CustomDateDropdown = ({
  value,
  onChange
}: {
  value: string;
  onChange: (val: any) => void;
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    { value: 'TODAY', label: t('filterToday') },
    { value: '7_DAYS', label: t('filter7Days') },
    { value: 'MONTH', label: t('filterThisMonth') },
    { value: 'CUSTOM', label: t('filterCustomDate') }
  ];

  const selectedOption = options.find(o => o.value === value) || options[1];

  return (
    <div className="searchable-dropdown" ref={dropdownRef}>
      <button 
        type="button" 
        className={"dropdown-trigger-btn " + (isOpen ? "active" : "")}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar size={14} className="trigger-icon" />
        <span>{selectedOption.label}</span>
        <span className="dropdown-arrow">Γû╝</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="dropdown-overlay-deck"
            style={{ minWidth: '160px' }}
          >
            <div className="dropdown-list-scroller">
              {options.map(opt => (
                <button 
                  key={opt.value}
                  type="button"
                  className={"dropdown-list-item " + (value === opt.value ? 'active' : '')}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatCard = ({ icon, label, value, trend, color, description, trendLabel }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="watt-card stat-card"
  >
    <div className="stat-card-top">
      <div className="stat-icon-box" style={{ backgroundColor: `${color}15`, color: color }}>
        {icon}
      </div>
      {trend !== undefined && (
        <div className="stat-trend-badge" style={{ backgroundColor: trend > 0 ? '#10B98115' : '#EF444415', color: trend > 0 ? '#10B981' : '#EF4444' }}>
          <TrendingUp size={12} style={{ transform: trend > 0 ? 'none' : 'rotate(180deg)' }} />
          <span>{Math.abs(trend)}%</span>
        </div>
      )}
      {trendLabel && (
        <div className="stat-trend-label" style={{ display: 'inline-block' }}>
          {trendLabel}
        </div>
      )}
    </div>
    <div className="stat-card-content">
      <span className="stat-label">{label}</span>
      <div className="stat-value-group">
        <h2 className="stat-value">{value}</h2>
        {description && <span className="stat-unit">{description}</span>}
      </div>
    </div>
  </motion.div>
);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Dashboard = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const isManagement = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  // State
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null); // Fallback for normal employees
  const [sites, setSites] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [showAttendancePrompt, setShowAttendancePrompt] = useState(false);

  useEffect(() => {
    if (user && (user.role === 'EMPLOYEE' || user.role === 'MANAGER')) {
      const todayStr = new Date().toISOString().split('T')[0];
      const popupKey = `attendance_prompt_${user.id}_${todayStr}`;
      if (!localStorage.getItem(popupKey)) {
        setShowAttendancePrompt(true);
      }
    }
  }, [user]);

  const handleGoToAttendance = () => {
    if (user) {
      const todayStr = new Date().toISOString().split('T')[0];
      const popupKey = `attendance_prompt_${user.id}_${todayStr}`;
      localStorage.setItem(popupKey, 'shown');
      setShowAttendancePrompt(false);
      if (user.role === 'EMPLOYEE') {
        navigate('/attendance');
      } else if (user.role === 'MANAGER') {
        navigate('/attendance/manager');
      }
    }
  };

  // Filter States
  const [selectedSiteId, setSelectedSiteId] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'TODAY' | '7_DAYS' | 'MONTH' | 'CUSTOM'>('7_DAYS');

  // Project/Search Toggle & Query States
  const [projectFilterMode, setProjectFilterMode] = useState<'DROPDOWN' | 'SEARCH'>('DROPDOWN');
  const [searchVal, setSearchVal] = useState<string>('');

  // Custom Date Options States
  const [customDateType, setCustomDateType] = useState<'SINGLE' | 'RANGE' | 'MONTH'>('SINGLE');
  const [customSingleDate, setCustomSingleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customRangeStart, setCustomRangeStart] = useState<string>(
    (() => {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return d.toISOString().split('T')[0];
    })()
  );
  const [customRangeEnd, setCustomRangeEnd] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customMonth, setCustomMonth] = useState<string>(
    (() => {
      const now = new Date();
      return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    })()
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        if (isManagement) {
          const [sitesData, employeesData, logsData] = await Promise.all([
            fetchSites().catch(() => []),
            fetchEmployees().catch(() => []),
            fetchAllLogs().catch(() => [])
          ]);
          setSites(sitesData);
          setEmployees(employeesData);
          setAllLogs(logsData);
        } else {
          const statsData = await fetchStats();
          setStats(statsData);
        }
      } catch (err) {
        console.error("Dashboard synchronization error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 30000); // 30s auto-sync
    return () => clearInterval(interval);
  }, [isManagement]);

  // Calculations for 30-min block rounding
  const calculateRoundedDuration = (
    clockIn: Date, 
    clockOut: Date, 
    breaks: any[] = [], 
    lunchStartTime?: string | null, 
    lunchEndTime?: string | null
  ) => {
    let durationMs = clockOut.getTime() - clockIn.getTime();
    if (breaks && breaks.length > 0) {
      breaks.forEach(b => {
        if (b.startTime && b.endTime) {
          durationMs -= (new Date(b.endTime).getTime() - new Date(b.startTime).getTime());
        }
      });
    }

    // Subtract lunch break if overlap exists
    if (clockIn && clockOut) {
      const startOfDay = new Date(clockIn);
      startOfDay.setHours(0, 0, 0, 0);
      const [lS_HH, lS_MM] = (lunchStartTime || "12:00").split(":").map(Number);
      const [lE_HH, lE_MM] = (lunchEndTime || "13:00").split(":").map(Number);
      
      const lunchStart = new Date(startOfDay);
      lunchStart.setHours(lS_HH, lS_MM, 0, 0);
      
      const lunchEnd = new Date(startOfDay);
      lunchEnd.setHours(lE_HH, lE_MM, 0, 0);

      const overlapStart = new Date(Math.max(clockIn.getTime(), lunchStart.getTime()));
      const overlapEnd = new Date(Math.min(clockOut.getTime(), lunchEnd.getTime()));
      const overlapMs = Math.max(0, overlapEnd.getTime() - overlapStart.getTime());
      
      durationMs -= overlapMs;
    }

    const durationMins = Math.max(0, durationMs / (1000 * 60));
    return Math.floor(durationMins / 30) * 30; // Round down to nearest 30-min block
  };

  // Get active date boundaries
  const getFilterBoundaries = () => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (dateFilter === 'TODAY') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (dateFilter === '7_DAYS') {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (dateFilter === 'MONTH') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (dateFilter === 'CUSTOM') {
      if (customDateType === 'SINGLE') {
        const parts = customSingleDate.split('-');
        const yyyy = parseInt(parts[0] || '1970');
        const mm = parseInt(parts[1] || '1') - 1;
        const dd = parseInt(parts[2] || '1');
        start = new Date(yyyy, mm, dd, 0, 0, 0, 0);
        end = new Date(yyyy, mm, dd, 23, 59, 59, 999);
      } else if (customDateType === 'RANGE') {
        const startParts = customRangeStart.split('-');
        const endParts = customRangeEnd.split('-');
        
        start = new Date(
          parseInt(startParts[0] || '1970'), 
          parseInt(startParts[1] || '1') - 1, 
          parseInt(startParts[2] || '1'), 
          0, 0, 0, 0
        );
        end = new Date(
          parseInt(endParts[0] || '1970'), 
          parseInt(endParts[1] || '1') - 1, 
          parseInt(endParts[2] || '1'), 
          23, 59, 59, 999
        );
      } else if (customDateType === 'MONTH') {
        const parts = customMonth.split('-'); // YYYY-MM
        const yyyy = parseInt(parts[0] || '1970');
        const mm = parseInt(parts[1] || '1') - 1;
        start = new Date(yyyy, mm, 1, 0, 0, 0, 0);
        end = new Date(yyyy, mm + 1, 0, 23, 59, 59, 999);
      }
    }
    return { start, end };
  };

  const { start: filterStart, end: filterEnd } = getFilterBoundaries();

  // 1. Filtered Datasets
  const filteredEmployees = employees.filter(emp => {
    // Project filter
    if (projectFilterMode === 'DROPDOWN') {
      if (selectedSiteId !== 'ALL' && emp.siteId !== selectedSiteId) return false;
    } else { // SEARCH Mode
      if (searchVal.trim() !== '') {
        const q = searchVal.toLowerCase();
        const empName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
        const siteName = (sites.find(s => s.id === emp.siteId)?.name || '').toLowerCase();
        const matchesName = empName.includes(q);
        const matchesSite = siteName.includes(q);
        const matchesRole = (emp.role || '').toLowerCase().includes(q);
        if (!matchesName && !matchesSite && !matchesRole) return false;
      }
    }
    return true;
  });

  const filteredLogs = allLogs.filter(log => {
    // Project filter
    if (projectFilterMode === 'DROPDOWN') {
      if (selectedSiteId !== 'ALL' && log.siteId !== selectedSiteId) return false;
    } else { // SEARCH Mode
      if (searchVal.trim() !== '') {
        const q = searchVal.toLowerCase();
        const emp = employees.find(e => e.id === log.employeeId);
        const empName = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase() : '';
        const siteName = (log.site?.name || '').toLowerCase();
        const statusStr = (log.status || '').toLowerCase();
        const typeStr = (log.clockOut ? 'clock out' : 'clock in').toLowerCase();
        
        const matchesName = empName.includes(q);
        const matchesSite = siteName.includes(q);
        const matchesStatus = statusStr.includes(q) || (statusStr === 'approved' && 'verified'.includes(q));
        const matchesType = typeStr.includes(q);
        
        if (!matchesName && !matchesSite && !matchesStatus && !matchesType) return false;
      }
    }

    // Date filter
    const logDate = new Date(log.date || log.clockIn);
    return logDate >= filterStart && logDate <= filterEnd;
  });

  // 2. Compute Card Metrics
  const computedTotalWorkforce = filteredEmployees.length;

  const computedActiveNow = allLogs.filter(log => {
    if (log.status === 'ABSENT') return false;
    if (log.clockOut !== null) return false;

    // Project filter
    if (projectFilterMode === 'DROPDOWN') {
      if (selectedSiteId !== 'ALL' && log.siteId !== selectedSiteId) return false;
    } else { // SEARCH Mode
      if (searchVal.trim() !== '') {
        const q = searchVal.toLowerCase();
        const emp = employees.find(e => e.id === log.employeeId);
        const empName = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase() : '';
        const siteName = (log.site?.name || '').toLowerCase();
        const statusStr = (log.status || '').toLowerCase();
        const typeStr = 'clock in';
        
        const matchesName = empName.includes(q);
        const matchesSite = siteName.includes(q);
        const matchesStatus = statusStr.includes(q);
        const matchesType = typeStr.includes(q);
        
        if (!matchesName && !matchesSite && !matchesStatus && !matchesType) return false;
      }
    }
    return true;
  }).length;

  const verifiedShifts = filteredLogs.filter(l => l.status === 'APPROVED' || l.status === 'PRESENT' || l.status === 'PAID').length;
  const computedEfficiency = filteredLogs.length > 0 
    ? parseFloat(((verifiedShifts / filteredLogs.length) * 100).toFixed(1)) 
    : 94.2;

  // Estimate Payroll Sum
  let estimatedPayrollVndSum = 0;
  filteredLogs.forEach(log => {
    if (log.clockIn && log.clockOut) {
      const emp = employees.find(e => e.id === log.employeeId);
      const rate = emp?.hourlyRate || 50000;
      const otType = emp?.overtimeType || 'MULTIPLIER';
      const otValue = emp?.overtimeValue || 1.5;

      const logSite = sites.find(s => s.id === log.siteId);
      const durationMins = calculateRoundedDuration(new Date(log.clockIn), new Date(log.clockOut), log.breaks, logSite?.lunchStartTime, logSite?.lunchEndTime);
      const durationHours = durationMins / 60;

      let earnings = 0;
      if (durationHours > 8) {
        const regularHours = 8;
        const otHours = durationHours - 8;
        const otRate = otType === 'MULTIPLIER' ? rate * otValue : rate + otValue;
        earnings = (regularHours * rate) + (otHours * otRate);
      } else {
        earnings = durationHours * rate;
      }
      estimatedPayrollVndSum += earnings;
    }
  });

  const formattedPayrollValue = (estimatedPayrollVndSum / 1000000).toFixed(1);
  const formattedPayrollDesc = "M Γé½";

  // 3. Compute Chart Activity Trend
  const getChartData = () => {
    if (dateFilter === 'TODAY' || (dateFilter === 'CUSTOM' && customDateType === 'SINGLE')) {
      const hours = [8, 10, 12, 14, 16, 18];
      return hours.map(h => {
        const timeStr = `${h.toString().padStart(2, '0')}:00`;
        const targetTime = new Date(filterStart);
        targetTime.setHours(h, 0, 0, 0);

        let totalHours = 0;
        let otHours = 0;
        const presentEmployeeIds = new Set<string>();

        allLogs.forEach(log => {
          if (log.status === 'ABSENT' || !log.clockIn) return;
          const clockInTime = new Date(log.clockIn);
          if (clockInTime > targetTime) return;

          const clockOutTime = log.clockOut ? new Date(log.clockOut) : new Date();
          if (clockOutTime >= targetTime) {
            presentEmployeeIds.add(log.employeeId);
          }

          const effectiveOutTime = clockOutTime > targetTime ? targetTime : clockOutTime;

          const logSite = sites.find(s => s.id === log.siteId);
          const durationMins = calculateRoundedDuration(clockInTime, effectiveOutTime, log.breaks, logSite?.lunchStartTime, logSite?.lunchEndTime);
          const durationHours = durationMins / 60;

          if (durationHours > 8) {
            totalHours += durationHours;
            otHours += (durationHours - 8);
          } else {
            totalHours += durationHours;
          }
        });

        return { 
          name: timeStr, 
          totalHours: parseFloat(totalHours.toFixed(1)), 
          otHours: parseFloat(otHours.toFixed(1)),
          presentCount: presentEmployeeIds.size 
        };
      });
    } else if (dateFilter === '7_DAYS' || (dateFilter === 'CUSTOM' && customDateType === 'RANGE')) {
      const trend: any[] = [];
      const diffTime = Math.abs(filterEnd.getTime() - filterStart.getTime());
      const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      for (let i = 0; i < diffDays; i++) {
        const date = new Date(filterStart);
        date.setDate(date.getDate() + i);
        const startOfDay = new Date(date.setHours(0,0,0,0));
        const endOfDay = new Date(date.setHours(23,59,59,999));

        let totalHours = 0;
        let otHours = 0;

        const dayLogs = allLogs.filter(log => {
          if (log.status === 'ABSENT') return false;
          // Project filter
          if (projectFilterMode === 'DROPDOWN' && selectedSiteId !== 'ALL' && log.siteId !== selectedSiteId) return false;
          // Search filter
          if (projectFilterMode === 'SEARCH' && searchVal.trim() !== '') {
            const q = searchVal.toLowerCase();
            const emp = employees.find(e => e.id === log.employeeId);
            const empName = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase() : '';
            const siteName = (log.site?.name || '').toLowerCase();
            if (!empName.includes(q) && !siteName.includes(q)) return false;
          }

          const logDate = new Date(log.date || log.clockIn);
          return logDate >= startOfDay && logDate <= endOfDay;
        });

        dayLogs.forEach(log => {
          if (log.clockIn) {
            const inTime = new Date(log.clockIn);
            const outTime = log.clockOut ? new Date(log.clockOut) : new Date();
            const logSite = sites.find(s => s.id === log.siteId);
            const durationMins = calculateRoundedDuration(inTime, outTime, log.breaks, logSite?.lunchStartTime, logSite?.lunchEndTime);
            const durationHours = durationMins / 60;

            if (durationHours > 8) {
              totalHours += durationHours;
              otHours += (durationHours - 8);
            } else {
              totalHours += durationHours;
            }
          }
        });

        const uniquePresent = new Set(dayLogs.map(l => l.employeeId)).size;

        trend.push({
          name: startOfDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          totalHours: parseFloat(totalHours.toFixed(1)),
          otHours: parseFloat(otHours.toFixed(1)),
          presentCount: uniquePresent
        });
      }
      return trend;
    } else { // MONTH or (CUSTOM and customDateType === 'MONTH')
      const trend: any[] = [];
      const daysInMonth = filterEnd.getDate();
      const chunks = [
        { label: 'W1 (1-7)', start: 1, end: 7 },
        { label: 'W2 (8-14)', start: 8, end: 14 },
        { label: 'W3 (15-21)', start: 15, end: 21 },
        { label: 'W4 (22-28)', start: 22, end: 28 },
        { label: 'W5 (29-End)', start: 29, end: daysInMonth }
      ];

      chunks.forEach(chunk => {
        const startDay = new Date(filterStart);
        startDay.setDate(chunk.start);
        startDay.setHours(0, 0, 0, 0);

        const endDay = new Date(filterStart);
        endDay.setDate(chunk.end);
        endDay.setHours(23, 59, 59, 999);

        let totalHours = 0;
        let otHours = 0;

        const chunkLogs = allLogs.filter(log => {
          if (log.status === 'ABSENT') return false;
          // Project filter
          if (projectFilterMode === 'DROPDOWN' && selectedSiteId !== 'ALL' && log.siteId !== selectedSiteId) return false;
          // Search filter
          if (projectFilterMode === 'SEARCH' && searchVal.trim() !== '') {
            const q = searchVal.toLowerCase();
            const emp = employees.find(e => e.id === log.employeeId);
            const empName = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase() : '';
            const siteName = (log.site?.name || '').toLowerCase();
            if (!empName.includes(q) && !siteName.includes(q)) return false;
          }

          const logDate = new Date(log.date || log.clockIn);
          return logDate >= startDay && logDate <= endDay;
        });

        chunkLogs.forEach(log => {
          if (log.clockIn) {
            const inTime = new Date(log.clockIn);
            const outTime = log.clockOut ? new Date(log.clockOut) : new Date();
            const logSite = sites.find(s => s.id === log.siteId);
            const durationMins = calculateRoundedDuration(inTime, outTime, log.breaks, logSite?.lunchStartTime, logSite?.lunchEndTime);
            const durationHours = durationMins / 60;

            if (durationHours > 8) {
              totalHours += durationHours;
              otHours += (durationHours - 8);
            } else {
              totalHours += durationHours;
            }
          }
        });

        const uniquePresent = new Set(chunkLogs.map(l => l.employeeId)).size;

        trend.push({ 
          name: chunk.label, 
          totalHours: parseFloat(totalHours.toFixed(1)), 
          otHours: parseFloat(otHours.toFixed(1)), 
          presentCount: uniquePresent
        });
      });
      return trend;
    }
  };

  const computedChartData = getChartData();

  // 4. Site Distribution list
  const getSitePerformance = () => {
    const today = new Date();
    const todayStart = new Date(today.setHours(0,0,0,0));
    const todayEnd = new Date(today.setHours(23,59,59,999));

    // Get unique employee attendance logs for today
    const todayLogs = allLogs.filter(log => {
      // Search filter integration
      if (projectFilterMode === 'SEARCH' && searchVal.trim() !== '') {
        const q = searchVal.toLowerCase();
        const emp = employees.find(e => e.id === log.employeeId);
        const empName = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase() : '';
        const siteName = (log.site?.name || '').toLowerCase();
        if (!empName.includes(q) && !siteName.includes(q)) return false;
      }

      const logDate = new Date(log.date || log.clockIn);
      return logDate >= todayStart && logDate <= todayEnd;
    });

    const groups: { [key: string]: { name: string; presentCount: number; totalAssigned: number; activeEmployees: string[] } } = {};

    // Populate all sites from `sites` array
    sites.forEach(site => {
      // Check project filter dropdown
      if (projectFilterMode === 'DROPDOWN' && selectedSiteId !== 'ALL' && site.id !== selectedSiteId) return;

      const totalAssigned = employees.filter(e => e.siteId === site.id && e.role !== 'ADMIN').length;
      groups[site.id] = {
        name: site.name,
        presentCount: 0,
        totalAssigned,
        activeEmployees: []
      };
    });

    // Handle Mobile Operations fallback (unassigned employees)
    if (projectFilterMode === 'DROPDOWN' && (selectedSiteId === 'ALL' || selectedSiteId === 'mobile')) {
      const unassignedTotal = employees.filter(e => !e.siteId && e.role !== 'ADMIN').length;
      groups['mobile'] = {
        name: 'Mobile Operations',
        presentCount: 0,
        totalAssigned: unassignedTotal,
        activeEmployees: []
      };
    }

    // Process logs to count present employees today
    todayLogs.forEach(log => {
      if (log.status === 'ABSENT') return;
      const sId = log.siteId || 'mobile';
      const empName = log.employee ? `${log.employee.firstName} ${log.employee.lastName}` : 'Unknown';

      if (groups[sId]) {
        if (!groups[sId].activeEmployees.includes(empName)) {
          groups[sId].activeEmployees.push(empName);
          groups[sId].presentCount++;
        }
      }
    });

    // Return the list sorted by total assigned employees (most ΓåÆ least)
    return Object.values(groups)
      .filter(g => g.totalAssigned > 0 || g.presentCount > 0)
      .sort((a, b) => b.totalAssigned - a.totalAssigned);
  };

  const computedSitePerformance = getSitePerformance();

  // 5. Table recent logs list (dynamic logs computed from verified database logs)
  const computedTableLogs = filteredLogs.slice(0, 10).map(log => {
    const name = log.employee ? `${log.employee.firstName} ${log.employee.lastName}` : 'Unknown Employee';
    return {
      time: log.clockOut || log.clockIn,
      title: name,
      type: log.clockOut ? 'Clock Out' : 'Clock In',
      status: log.status,
      entityId: log.employeeId
    };
  });

  const avatarSrc = user?.avatar 
    ? (user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}`) 
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.firstName || 'User'}`;

  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return isNaN(date.getTime()) ? timeStr : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
      return timeStr || '--:--';
    }
  };

  if (loading && allLogs.length === 0 && !stats) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner-watt"></div>
        <p>Synchronizing Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-watt">
      <header className="dashboard-header">
        <div className="header-titles">
          <div className="identity-section-watt">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="user-avatar-watt"
            >
              <img src={avatarSrc} alt="" onError={(e) => { e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fallback'; }} />
              <div className="status-ring-watt"></div>
            </motion.div>
            <div className="welcome-group-watt">
              <h1 className="page-title">{t('welcomeBack')}, {user?.firstName}</h1>
              <div className="role-chip-watt">
                <Activity size={12} />
                <span>{user?.role} {t('optimizedStatus')}</span>
              </div>
            </div>
          </div>
          <p className="page-subtitle">{t('realtimeGridIntel')}</p>
        </div>

        {/* Filters and Controls */}
        <div className="dashboard-controls-block">
          {isManagement && (
            <div className="dashboard-filters-deck">
              {/* Dropdown vs Search Toggle */}
              {user?.role === 'ADMIN' && (
                <div className="filter-mode-toggle">
                  <button 
                    type="button"
                    className={"toggle-btn " + (projectFilterMode === 'DROPDOWN' ? 'active' : '')}
                    onClick={() => {
                      setProjectFilterMode('DROPDOWN');
                      setSearchVal('');
                    }}
                  >
                    <span>{i18n.language === 'vi' ? 'Danh s├ích' : 'Dropdown'}</span>
                  </button>
                  <button 
                    type="button"
                    className={"toggle-btn " + (projectFilterMode === 'SEARCH' ? 'active' : '')}
                    onClick={() => {
                      setProjectFilterMode('SEARCH');
                      setSelectedSiteId('ALL');
                    }}
                  >
                    <span>{i18n.language === 'vi' ? 'T├¼m kiß║┐m' : 'Search'}</span>
                  </button>
                </div>
              )}

              {/* Toggleable Project Selector or Global Search Input */}
              {projectFilterMode === 'DROPDOWN' ? (
                user?.role === 'ADMIN' && (
                  <SearchableProjectDropdown 
                    sites={sites} 
                    selectedSiteId={selectedSiteId} 
                    onSelectSite={setSelectedSiteId} 
                  />
                )
              ) : (
                <div className="global-search-input-wrapper">
                  <Search size={14} className="search-icon-global" />
                  <input 
                    type="text" 
                    placeholder={i18n.language === 'vi' ? 'T├¼m kiß║┐m trong tß║Ñt cß║ú dß╗▒ ├ín...' : 'Search in all projects...'} 
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    className="global-search-input"
                  />
                  {searchVal && (
                    <button 
                      type="button" 
                      className="search-clear-btn" 
                      onClick={() => setSearchVal('')}
                    >
                      ├ù
                    </button>
                  )}
                </div>
              )}

              {/* Custom Date Dropdown */}
              <CustomDateDropdown 
                value={dateFilter} 
                onChange={setDateFilter} 
              />

              {/* Custom Date Options panel */}
              {dateFilter === 'CUSTOM' && (
                <div className="custom-date-sub-deck">
                  <div className="date-type-selector">
                    <button 
                      type="button"
                      className={"sub-pill-btn " + (customDateType === 'SINGLE' ? 'active' : '')}
                      onClick={() => setCustomDateType('SINGLE')}
                    >
                      {t('filterSubDay')}
                    </button>
                    <button 
                      type="button"
                      className={"sub-pill-btn " + (customDateType === 'RANGE' ? 'active' : '')}
                      onClick={() => setCustomDateType('RANGE')}
                    >
                      {t('filterSubRange')}
                    </button>
                    <button 
                      type="button"
                      className={"sub-pill-btn " + (customDateType === 'MONTH' ? 'active' : '')}
                      onClick={() => setCustomDateType('MONTH')}
                    >
                      {t('filterSubMonth')}
                    </button>
                  </div>

                  <div className="date-inputs-wrapper">
                    {customDateType === 'SINGLE' && (
                      <input 
                        type="date" 
                        value={customSingleDate} 
                        onChange={(e) => setCustomSingleDate(e.target.value)}
                        className="filter-date-input"
                      />
                    )}

                    {customDateType === 'RANGE' && (
                      <div className="range-inputs-group">
                        <input 
                          type="date" 
                          value={customRangeStart} 
                          onChange={(e) => setCustomRangeStart(e.target.value)}
                          className="filter-date-input range-input"
                        />
                        <span className="range-separator">{t('filterSeparatorTo')}</span>
                        <input 
                          type="date" 
                          value={customRangeEnd} 
                          onChange={(e) => setCustomRangeEnd(e.target.value)}
                          className="filter-date-input range-input"
                        />
                      </div>
                    )}

                    {customDateType === 'MONTH' && (
                      <input 
                        type="month" 
                        value={customMonth} 
                        onChange={(e) => setCustomMonth(e.target.value)}
                        className="filter-date-input"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="header-actions">
            <button 
              className="watt-btn primary" 
              onClick={() => exportToCSV(isManagement ? computedTableLogs : (stats?.recentLogs || []), 'Dashboard_Stats')}
            >
              <CheckCircle2 size={18} />
              <span>{t('exportData')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Attendance Quick Banner */}
      {user && (user.role === 'EMPLOYEE' || user.role === 'MANAGER') && (
        <div className="attendance-prompt-banner" onClick={() => setShowAttendancePrompt(true)}>
          <div className="banner-left">
            <Clock className="banner-icon-pulse" size={20} />
            <div className="banner-text">
              <h3>{t('verifyShiftAttendance')}</h3>
              <p>{t('verifyShiftAttendanceDesc')}</p>
            </div>
          </div>
          <button className="banner-btn">{t('recordAttendanceBtn')}</button>
        </div>
      )}

      {/* Stats Cards */}
      <section className="stats-grid-watt">
        <StatCard
          icon={<Users size={20} />}
          label={isManagement ? t('totalWorkforce') : t('weeklyHoursLabel')}
          value={isManagement ? computedTotalWorkforce : (stats?.weeklyHours ?? "0.0")}
          trend={isManagement ? undefined : 4.2}
          color="#3B82F6"
          description={isManagement ? t('workersUnit') : t('hoursUnit')}
        />
        <StatCard
          icon={<Activity size={20} />}
          label={isManagement ? t('activeNow') : t('efficiencyLabel')}
          value={isManagement ? computedActiveNow : `${stats?.efficiency ?? 0}%`}
          trend={isManagement ? undefined : 1.8}
          color="#10B981"
          description={isManagement ? t('activeUnit') : ""}
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label={isManagement ? t('globalEfficiency') : t('monthlyHoursLabel')}
          value={isManagement ? computedEfficiency : (stats?.monthlyHours ?? "0.0")}
          color="#F59E0B"
          description={isManagement ? "%" : t('hoursUnit')}
          trendLabel={isManagement ? t('optimalLabel') : t('filterThisMonth')}
        />
        <StatCard
          icon={<Wallet size={20} />}
          label={isManagement ? t('estPayroll') : t('totalEarnings')}
          value={isManagement ? formattedPayrollValue : (stats?.earnings ?? 0).toLocaleString('en-US')}
          color="#8B5CF6"
          description={isManagement ? formattedPayrollDesc : (stats?.currencySymbol || "Γé½")}
          trendLabel={isManagement ? t('calculatedLabel') : `${i18n.language === 'vi' ? 'Đơn giá: ' : 'Rate: '}${stats?.hourlyRate ? (stats.hourlyRate / 1000).toLocaleString('en-US') + 'k' : '50k'} ₫/hr`}
        />
      </section>

      {/* Charts Grid */}
      <div className="main-charts-grid">
        <div className="watt-card chart-main">
          <div className="card-header-watt">
            <h3 className="card-title">{isManagement ? t('workforceActivityTime') : t('personalPerformanceTrend')}</h3>
            <div className="chart-legend-watt">
              {isManagement ? (
                <>
                  <span className="legend-item"><span className="dot active" style={{ backgroundColor: '#3B82F6' }}></span> {t('overallHours')}</span>
                  <span className="legend-item"><span className="dot baseline" style={{ backgroundColor: '#F59E0B' }}></span> {t('overtimeHours')}</span>
                  <span className="legend-item"><span className="dot baseline" style={{ backgroundColor: '#10B981' }}></span> {t('totalPresent')}</span>
                </>
              ) : (
                <>
                  <span className="legend-item"><span className="dot active"></span> {t('efficiencyLabel')}</span>
                  <span className="legend-item"><span className="dot baseline"></span> {t('baseload')}</span>
                </>
              )}
            </div>
          </div>
          <div className="chart-wrapper-watt" style={{ minHeight: '320px' }}>
            {(isManagement ? computedChartData : (stats?.weeklyTrend || [])).length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={isManagement ? computedChartData : (stats?.weeklyTrend || [])}>
                  <defs>
                    <linearGradient id="overallGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="overtimeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="wattBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isManagement ? "#3B82F6" : "#10B981"} stopOpacity={0.1} />
                      <stop offset="95%" stopColor={isManagement ? "#3B82F6" : "#10B981"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748B', fontSize: 12, fontWeight: 500}} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748B', fontSize: 12, fontWeight: 500}} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      padding: '12px'
                    }} 
                  />
                  {isManagement ? (
                    <>
                      <Area 
                        type="monotone" 
                        dataKey="totalHours" 
                        name={t('overallHours')}
                        stroke="#3B82F6" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#overallGrad)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="otHours" 
                        name={t('overtimeHours')}
                        stroke="#F59E0B" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#overtimeGrad)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="presentCount" 
                        name={t('totalPresent')}
                        stroke="#10B981" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#presentGrad)" 
                      />
                    </>
                  ) : (
                    <Area 
                      type="monotone" 
                      dataKey="attendance" 
                      stroke="#10B981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#wattBlue)" 
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart-state">{t('noTrendData')}</div>
            )}
          </div>
        </div>

        <div className="watt-card asset-distribution">
          <div className="card-header-watt">
            <h3 className="card-title">{isManagement ? t('activityBySite') : t('recentActivityFeed')}</h3>
          </div>
          <div className="asset-list">
            {isManagement ? (
              computedSitePerformance.length > 0 ? computedSitePerformance.map((site: any, idx: number) => (
                <div key={idx} className="asset-item">
                  <div className="asset-info">
                    <span className="asset-name">{site.name}</span>
                    <span className="asset-value">
                      {site.presentCount} / {site.totalAssigned} {i18n.language === 'vi' ? '─É├â C├ô Mß║╢T' : 'PRESENT'}
                    </span>
                  </div>
                  <div className="asset-progress-bg">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${site.totalAssigned > 0 ? (site.presentCount / site.totalAssigned) * 100 : 0}%` }}
                      className="asset-progress-fill"
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                  </div>
              )) : (
                <div className="empty-asset-state">{t('noActiveSiteSessions')}</div>
              )
            ) : (
              <div className="notifications-list-watt">
                {(stats?.recentLogs || []).length > 0 ? (
                  stats.recentLogs.slice(0, 5).map((log: any, idx: number) => (
                    <div key={idx} className="notification-item-watt">
                      <div className={`n-icon-watt ${log.type === 'ALERT' ? 'alert' : 'approved'}`}>
                        {log.type === 'ALERT' ? <Clock size={14} /> : <CheckCircle2 size={14} />}
                      </div>
                      <div className="n-text-watt">
                        <strong>{log.title}</strong>
                        <p>{log.message}</p>
                        <span>{formatTime(log.time)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state-watt">{i18n.language === 'vi' ? 'Kh├┤ng ph├ít hiß╗çn hoß║ít ─æß╗Öng gß║ºn ─æ├óy' : 'No recent activity detected'}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="watt-card recent-events">
        <div className="card-header-watt">
          <h3 className="card-title">{t('recentActivityLogs')}</h3>
        </div>
        <div className="events-table-wrapper">
          {(isManagement ? computedTableLogs : (stats?.recentLogs || [])).length > 0 ? (
          <table className="events-table">
            <thead>
              <tr>
                <th>{t('timestampHeader')}</th>
                <th>{t('entityHeader')}</th>
                <th>{t('eventTypeHeader')}</th>
                <th>{t('statusHeader')}</th>
                <th>{t('actionHeader')}</th>
              </tr>
            </thead>
            <tbody>
              {(isManagement ? computedTableLogs : (stats?.recentLogs || [])).map((log: any, idx: number) => (
                <tr key={idx}>
                  <td className="timestamp" data-label={t('timestampHeader')}>{formatTime(log.time)}</td>
                  <td className="entity" data-label={t('entityHeader')}>{log.title}</td>
                  <td className="event-type" data-label={t('eventTypeHeader')}>{log.type}</td>
                  <td data-label={t('statusHeader')}>
                    <span className={`status-pill ${log.type === 'ALERT' || log.status === 'PENDING' ? 'warning' : 'success'}`}>
                      {log.type === 'ALERT' || log.status === 'PENDING' ? t('pendingLabel') : t('verifiedLabel')}
                    </span>
                  </td>
                  <td data-label={t('actionHeader')}>
                    {user?.role === 'ADMIN' && (
                      <button className="table-action-btn" onClick={() => navigate(`/employees/${log.entityId || ''}`)}>{t('viewDetailsBtn')}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          ) : (
            <div className="empty-table-state">{t('noRecentActivityLogged')}</div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAttendancePrompt && (
          <div className="attendance-modal-backdrop" onClick={() => setShowAttendancePrompt(false)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="attendance-modal-box"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header-accent"></div>
              <div className="modal-inner-content">
                <div className="modal-icon-circle">
                  <Clock size={32} />
                </div>
                <h2>{t('shiftAttendanceReminder')}</h2>
                <p>{t('shiftReminderDesc')}</p>
                
                <div className="modal-actions-deck">
                  <button className="modal-btn-confirm" onClick={handleGoToAttendance}>
                    {t('goToAttendanceBtn')}
                  </button>
                  <button className="modal-btn-cancel" onClick={() => {
                    if (user) {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const popupKey = `attendance_prompt_${user.id}_${todayStr}`;
                      localStorage.setItem(popupKey, 'shown');
                    }
                    setShowAttendancePrompt(false);
                  }}>
                    {t('remindMeLaterBtn')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
