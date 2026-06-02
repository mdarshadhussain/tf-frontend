import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft,
  Calendar,
  Download,
  Filter,
  Search,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchEmployees, fetchAllLogs, fetchSites } from '../api/api';
import './Attendance.css';
import { useTranslation } from 'react-i18next';


const SearchableSiteDropdown = ({ 
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

  const selectedSite = selectedSiteId === 'all' 
    ? { id: 'all', name: t('allSites') } 
    : sites.find(s => s.id === selectedSiteId) || { id: 'all', name: t('allSites') };

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
        <Filter size={14} className="trigger-icon" />
        <span>{selectedSite.name}</span>
        <span className="dropdown-arrow">▼</span>
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
                placeholder={t('search')} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="dropdown-list-scroller">
              <button 
                type="button"
                className={"dropdown-list-item " + (selectedSiteId === 'all' ? 'active' : '')}
                onClick={() => {
                  onSelectSite('all');
                  setIsOpen(false);
                  setSearchQuery('');
                }}
              >
                {t('allSites')} ({sites.length})
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

const AttendanceGrid: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [employees, setEmployees] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [tempDate, setTempDate] = useState(selectedMonth);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [empList, logsList] = await Promise.all([
          fetchEmployees(),
          fetchAllLogs()
        ]);
        
        setEmployees(Array.isArray(empList) ? empList.filter((e: any) => e.role !== 'ADMIN') : []);
        setAllLogs(Array.isArray(logsList) ? logsList : []);
      } catch (error) {
        console.error('Failed to load employee/attendance data', error);
      } finally {
        setLoading(false);
      }
    };

    const loadSites = async () => {
      try {
        const sitesList = await fetchSites();
        setSites(Array.isArray(sitesList) ? sitesList : []);
      } catch (error) {
        console.error('Failed to load sites', error);
      }
    };

    loadData();
    loadSites();
  }, [selectedMonth]);

  const monthParts = (selectedMonth || '').split('-');
  const year = parseInt(monthParts[0]) || new Date().getFullYear();
  const month = parseInt(monthParts[1]) || (new Date().getMonth() + 1);
  const daysInMonth = new Date(year, month, 0).getDate();

  // Temp states for picker UI
  const tempParts = tempDate.split('-');
  const tYear = parseInt(tempParts[0]);
  const tMonth = parseInt(tempParts[1]);

  const filteredEmployees = employees.filter(emp => {
    const s = searchTerm.toLowerCase();
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    const id = emp.id?.toString().toLowerCase() || '';
    const empId = emp.employeeId?.toString().toLowerCase() || '';
    
    const matchesSearch = fullName.includes(s) || id.includes(s) || empId.includes(s);
    const matchesSite = selectedSite === 'all' || emp.siteId === selectedSite;

    return matchesSearch && matchesSite;
  });

  const calculateHours = (logs: any[]) => {
    return logs.reduce((total, log) => {
      if (log.clockIn && log.clockOut) {
        const start = new Date(log.clockIn);
        const end = new Date(log.clockOut);
        return total + (end.getTime() - start.getTime()) / 3600000;
      }
      return total;
    }, 0);
  };

  const handleApplyFilter = () => {
    setSelectedMonth(tempDate);
    setShowMonthPicker(false);
  };

  const handleExportExcel = () => {
    const header = [t('employeeName'), t('employeeID'), ...[...Array(daysInMonth)].map((_, i) => (i + 1).toString()), t('monthlyHoursLabel')];
    const rows = filteredEmployees.map(emp => {
      let totalHours = 0;
      const dailyData = [...Array(daysInMonth)].map((_, i) => {
        const day = (i + 1).toString().padStart(2, '0');
        const dateStr = `${selectedMonth}-${day}`;
        const dayLogs = allLogs.filter(l => {
          if (!l.date || l.employeeId !== emp.id) return false;
          try {
            const dateObj = new Date(l.date);
            const lDateStr = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
            return lDateStr === dateStr;
          } catch (e) { return false; }
        });
        
        const hours = calculateHours(dayLogs);
        totalHours += hours;
        
        if (dayLogs.length > 0) {
          const s = dayLogs[0].status?.toUpperCase() || 'PENDING';
          const hourText = hours > 0 ? ` (${hours.toFixed(1)}h)` : '';
          if (s === 'PAID' || s === 'APPROVED' || s === 'PRESENT') return `${t('presentLabel')}${hourText}`;
          if (s === 'REJECTED' || s === 'ABSENT') return `${t('absentLabel')}${hourText}`;
          return `${t('pendingLabel')}${hourText}`;
        }
        return '-';
      });
      return [`${emp.firstName} ${emp.lastName}`, emp.employeeId || emp.id, ...dailyData, totalHours.toFixed(2)];
    });

    const csvContent = [header, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Workforce_Matrix_${selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderMonthPicker = () => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="matrix-month-picker"
      onClick={e => e.stopPropagation()}
    >
      <div className="picker-header">
        <button className="year-btn" onClick={() => setTempDate(`${tYear - 1}-${tMonth.toString().padStart(2, '0')}`)}>
          <ChevronLeft size={18} />
        </button>
        <span className="year-display">{tYear}</span>
        <button className="year-btn" onClick={() => setTempDate(`${tYear + 1}-${tMonth.toString().padStart(2, '0')}`)}>
          <ChevronRight size={18} />
        </button>
      </div>
      
      <div className="months-grid">
        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => {
          const mNum = (i + 1).toString().padStart(2, '0');
          const isSelected = tMonth === (i + 1);
          const displayLabel = i18n.language === 'vi' ? `Tháng ${i + 1}` : m;
          return (
            <button 
              key={m}
              className={`month-cell ${isSelected ? 'selected' : ''}`}
              onClick={() => setTempDate(`${tYear}-${mNum}`)}
            >
              {displayLabel}
            </button>
          );
        })}
      </div>

      <div className="picker-footer">
        <button className="picker-btn cancel" onClick={() => setShowMonthPicker(false)}>
          {t('cancel')}
        </button>
        <button className="picker-btn confirm" onClick={handleApplyFilter}>
          {t('saveChanges')}
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="matrix-viewport">
      <header className="matrix-header">
        <div className="header-brand">
          <button className="back-btn" onClick={() => navigate('/attendance')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>{t('workforceAttendance')}</h1>
            <p>{t('timeline')}: {new Date(year, month - 1).toLocaleString(i18n.language === 'vi' ? 'vi-VN' : undefined, { month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="header-actions">
          <div className="search-hub">
            <Search size={18} />
            <input 
              type="text" 
              placeholder={t('search')} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isAdmin && (
            <SearchableSiteDropdown 
              sites={sites} 
              selectedSiteId={selectedSite} 
              onSelectSite={setSelectedSite} 
            />
          )}
          
          {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>
                <X size={14} />
              </button>
          )}

          <div className="month-selector">
            <button onClick={() => {
              setTempDate(selectedMonth);
              setShowMonthPicker(!showMonthPicker);
            }}>
              <Calendar size={18} />
              <span>{new Date(year, month - 1).toLocaleString(i18n.language === 'vi' ? 'vi-VN' : undefined, { month: 'long' })} {year}</span>
            </button>
            <AnimatePresence>
              {showMonthPicker && renderMonthPicker()}
            </AnimatePresence>
          </div>
          <button className="matrix-btn primary" onClick={handleExportExcel}>
            <Download size={18} /> <span>{t('exportCSV')}</span>
          </button>
        </div>
      </header>

      <div className="matrix-container">
        {loading ? (
          <div className="matrix-loader">
            <div className="orbit"></div>
            <span>{t('processing')}</span>
          </div>
        ) : (
          <div className="matrix-data-hub">
            <div className="matrix-body" style={{ height: '540px', overflowY: 'auto' }}>
              {/* Header Row */}
              <div className="matrix-row header">
                <div className="employee-info-cell header-cell">{t('employee')}</div>
                <div className="days-timeline">
                    {[...Array(daysInMonth)].map((_, i) => {
                      const dayNum = i + 1;
                      const day = dayNum.toString().padStart(2, '0');
                      const monthStr = month.toString().padStart(2, '0');
                      const dateStr = `${year}-${monthStr}-${day}`;
                      const isToday = new Date().toISOString().startsWith(dateStr);
                      const isSunday = new Date(year, month - 1, dayNum).getDay() === 0;
                      return (
                        <div key={dayNum} className={`day-tick ${isSunday ? 'sunday-col' : ''} ${isToday ? 'today-col' : ''}`}>
                          <span className="day-num">{dayNum}</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Data Rows */}
              {filteredEmployees.map(emp => (
                <div key={emp.id} className="matrix-row data-row">
                  <div className="employee-info-cell">
                    <div className="emp-meta">
                      <span className="name">{emp.firstName} {emp.lastName}</span>
                      <span className="tag">ID: {emp.employeeId || emp.id.slice(0, 8)}</span>
                    </div>
                  </div>

                  <div className="days-timeline">
                    {[...Array(daysInMonth)].map((_, i) => {
                      const dayNum = i + 1;
                      const day = dayNum.toString().padStart(2, '0');
                      const monthStr = month.toString().padStart(2, '0');
                      const dateStr = `${year}-${monthStr}-${day}`;
                      const isToday = new Date().toISOString().startsWith(dateStr);
                      const isSunday = new Date(year, month - 1, dayNum).getDay() === 0;

                      const dayLogs = allLogs.filter(l => {
                        if (!l.date || l.employeeId !== emp.id) return false;
                        try {
                          const dateObj = new Date(l.date);
                          const logDateStr = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
                          return logDateStr === dateStr;
                        } catch (e) { return false; }
                      });
                      
                      const hours = calculateHours(dayLogs);
                      let status = 'empty';
                      if (dayLogs.length > 0) {
                        const s = dayLogs[0].status?.toUpperCase() || 'PENDING';
                        if (s === 'PAID' || s === 'APPROVED' || s === 'PRESENT') status = 'present';
                        else if (s === 'REJECTED' || s === 'ABSENT') status = 'absent';
                        else status = 'pending';
                      }

                      return (
                        <div key={i + 1} className={`status-cell ${status} ${isSunday ? 'sunday-col' : ''} ${isToday ? 'today-col' : ''}`}>
                          <div className="status-badge-wrapper">
                            <div className={`status-indicator ${hours > 0 ? 'has-hours' : ''}`}>
                              {hours > 0 && <span className="badge-hour">{Math.round(hours)}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="matrix-footer">
        <div className="legend">
          <div className="legend-item"><span className="dot present"></span> {t('presentLabel')}</div>
          <div className="legend-item"><span className="dot pending"></span> {t('pendingLabel')}</div>
          <div className="legend-item"><span className="dot absent"></span> {t('absentLabel')}</div>
          <div className="legend-item"><span className="guide-box sunday"></span> {t('absentLabel')}</div>
          <div className="legend-item"><span className="guide-box today"></span> {t('filterToday')}</div>
        </div>
        <div className="stats-pill">
          <Filter size={14} /> <span>{filteredEmployees.length} {t('employees')}</span>
        </div>
      </div>

      <style>{`
        .matrix-viewport {
          background: var(--bg);
          height: 100vh;
          display: flex;
          flex-direction: column;
          color: var(--text-main);
          font-family: 'Be Vietnam Pro', sans-serif;
        }

        /* --- Header Section --- */
        .matrix-header {
          padding: 20px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          z-index: 100;
          box-shadow: var(--shadow-sm);
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .header-brand h1 {
          font-size: 22px;
          font-weight: 900;
          margin: 0;
          color: var(--text-primary);
          letter-spacing: -0.5px;
        }

        .header-brand p {
          margin: 4px 0 0;
          font-size: 13px;
          color: var(--text-dim);
        }

        .back-btn {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: var(--surface-hover);
          border: 1px solid var(--border);
          color: var(--text-main);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s var(--ease-premium);
        }

        .back-btn:hover {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
          transform: translateX(-3px);
        }

        .header-actions {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        /* --- Search & Filters --- */
        .search-hub, .filter-hub {
          background: var(--surface-hover);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          height: 44px;
          transition: all 0.3s;
        }

        .search-hub:focus-within, .filter-hub:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-glow);
          background: var(--surface);
        }

        .search-hub input, .filter-hub select {
          background: transparent;
          border: none;
          color: var(--text-main);
          font-size: 14px;
          font-weight: 600;
          outline: none;
          width: 100%;
        }

        .site-select {
          cursor: pointer;
          min-width: 120px;
        }

        .site-select option {
          background: #1a1a1a;
          color: white;
        }

        .month-selector {
          position: relative;
        }

        .month-selector button {
          height: 44px;
          padding: 0 20px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          color: var(--text-main);
          cursor: pointer;
          transition: all 0.2s;
        }

        .month-selector button:hover {
          border-color: var(--primary);
          background: var(--surface-hover);
        }

        .matrix-btn.primary {
          height: 44px;
          padding: 0 24px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .matrix-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px var(--primary-glow);
        }

        /* --- Premium Month Picker --- */
        .matrix-month-picker {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          width: 320px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
          box-shadow: var(--shadow-lg);
          z-index: 1000;
        }

        .picker-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .year-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--surface-hover);
          border: 1px solid var(--border);
          color: var(--text-main);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .year-btn:hover {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .year-display {
          font-size: 18px;
          font-weight: 800;
          color: var(--primary);
        }

        .months-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 24px;
        }

        .month-cell {
          padding: 12px 0;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text-main);
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .month-cell:hover {
          border-color: var(--primary);
          background: var(--surface-hover);
        }

        .month-cell.selected {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
          box-shadow: 0 4px 12px var(--primary-glow);
        }

        .picker-footer {
          display: flex;
          gap: 12px;
          border-top: 1px solid var(--border);
          padding-top: 20px;
        }

        .picker-btn {
          flex: 1;
          height: 40px;
          border-radius: 10px;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .picker-btn.cancel {
          background: var(--surface-hover);
          border: 1px solid var(--border);
          color: var(--text-dim);
        }

        .picker-btn.confirm {
          background: var(--success);
          color: white;
          border: none;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }

        .picker-btn.confirm:hover {
          transform: translateY(-2px);
          background: #059669;
        }

        /* --- Matrix Grid --- */
        .matrix-container {
          flex: 1;
          padding: 20px 40px 10px 40px;
          overflow: hidden;
        }

        .matrix-data-hub {
          background: var(--surface);
          border-radius: 16px;
          border: 1px solid var(--border);
          overflow: auto;
          box-shadow: var(--shadow-md);
        }

        .matrix-row {
          display: flex;
          min-width: 1200px;
          border-bottom: 1px solid var(--border);
        }

        .matrix-row.header {
          background: var(--surface-hover);
          position: sticky;
          top: 0;
          z-index: 50;
          border-bottom: 2px solid var(--border);
        }

        .employee-info-cell {
          width: 180px;
          min-width: 180px;
          padding: 12px 20px;
          background: var(--surface);
          position: sticky;
          left: 0;
          z-index: 10;
          border-right: 1px solid var(--border);
          display: flex;
          align-items: center;
        }

        .employee-info-cell.header-cell {
          background: var(--surface-hover);
          font-size: 11px;
          font-weight: 900;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .emp-meta .name {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main);
        }

        .emp-meta .tag {
          font-size: 10px;
          color: var(--text-dim);
        }

        .days-timeline {
          flex: 1;
          display: flex;
        }

        .day-tick, .status-cell {
          flex: 1;
          min-width: 34px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-right: 1px solid var(--border);
        }

        .day-num {
          font-size: 10px;
          font-weight: 800;
          color: var(--text-dim);
        }

        .sunday-col {
          background: rgba(59, 130, 246, 0.05);
        }

        .today-col {
          background: rgba(255, 235, 59, 0.12) !important;
        }

        .status-cell {
          height: 60px;
        }

        .status-badge-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--border);
          transition: all 0.3s;
        }

        .status-indicator.has-hours {
          width: 26px;
          height: 20px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .badge-hour {
          font-size: 11px;
          font-weight: 900;
          color: white;
        }

        .status-cell.present .status-indicator {
          background: var(--success);
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.3);
        }

        .status-cell.pending .status-indicator {
          background: var(--warning);
          box-shadow: 0 0 8px rgba(245, 158, 11, 0.3);
        }

        .status-cell.absent .status-indicator {
          background: var(--error);
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.3);
        }

        /* --- Footer & Legend --- */
        .matrix-footer {
          padding: 10px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--surface);
          border-top: 1px solid var(--border);
        }

        .legend {
          display: flex;
          gap: 20px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .legend-item .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .legend-item .dot.present { background: var(--success); }
        .legend-item .dot.pending { background: var(--warning); }
        .legend-item .dot.absent { background: var(--error); }

        .guide-box {
          width: 14px;
          height: 14px;
          border-radius: 4px;
        }

        .guide-box.sunday { background: rgba(59, 130, 246, 0.15); border: 1px solid var(--primary); }
        .guide-box.today { background: rgba(255, 235, 59, 0.3); border: 1px solid #fbc02d; }

        .stats-pill {
          padding: 6px 16px;
          background: var(--surface-hover);
          border: 1px solid var(--border);
          border-radius: 99px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .matrix-loader {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .orbit {
          width: 32px;
          height: 32px;
          border: 3px solid var(--primary-glow);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @media (max-width: 768px) {
          .matrix-viewport {
            height: auto;
            min-height: 100vh;
          }
          
          .matrix-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
            padding: 20px;
          }
          
          .header-brand {
            width: 100%;
          }
          
          .header-actions {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          
          .header-actions .search-hub,
          .header-actions .searchable-dropdown,
          .header-actions .month-selector button,
          .header-actions .matrix-btn {
            width: 100%;
            justify-content: center;
          }
          
          .matrix-container {
            padding: 16px;
          }
          
          .employee-info-cell {
            width: 120px !important;
            min-width: 120px !important;
            padding: 12px 10px;
          }
          
          .emp-meta .name {
            font-size: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100px;
          }
          
          .emp-meta .tag {
            font-size: 9px;
          }
          
          .day-tick, .status-cell {
            min-width: 32px;
          }
          
          .matrix-footer {
            flex-direction: column;
            gap: 16px;
            padding: 16px 20px;
          }
          
          .legend {
            flex-wrap: wrap;
            justify-content: center;
            gap: 12px;
          }
          
          .matrix-data-hub {
            border-radius: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default AttendanceGrid;
