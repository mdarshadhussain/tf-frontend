import { AnimatePresence } from 'framer-motion';

import { 
  Search, 
  UserPlus, 
  Download,
  Edit3,
  XCircle,
  Eye,
  Phone,
  Upload,
  FileSpreadsheet
} from 'lucide-react';

import './Employees.css';

import React, { useEffect, useState, useRef } from 'react';
import { fetchEmployees, deleteEmployee, fetchSites, importEmployeesFromExcel, downloadEmployeeTemplate } from '../api/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

import { exportToCSV } from '../utils/export';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import type { ToastType } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import { useNavigate } from 'react-router-dom';
import PremiumSelect from '../components/PremiumSelect';
import { useTranslation } from 'react-i18next';


const Employees = () => {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [sites, setSites] = useState<any[]>([]);
  const [siteFilter, setSiteFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  
  const [toasts, setToasts] = useState<any[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

    const downloadTemplate = async () => {
    try {
      setLoading(true);
      const blob = await downloadEmployeeTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Employee_Import_Template.xlsx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      addToast(err.message || 'Failed to download template', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setLoading(true);
      const res = await importEmployeesFromExcel(file);
      addToast(res.message, 'success');
      if (res.errors && res.errors.length > 0) {
        // Show the first error as well if there were partial failures
        addToast(`${res.errors.length} errors occurred, e.g. ${res.errors[0]}`, 'error');
      }
      loadEmployees();
    } catch (err: any) {
      addToast(err.message || 'Failed to import employees', 'error');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };


  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    loadEmployees();
    loadSites();
  }, []);

  useEffect(() => {
    const filtered = employees.filter(emp => {
      const nameMatch = `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
      const idMatch = emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSearch = searchTerm === '' || nameMatch || idMatch;
      const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;
      const matchesSite = siteFilter === 'ALL' || emp.siteId === siteFilter;
      return matchesSearch && matchesRole && matchesSite;
    });
    setFilteredEmployees(filtered);
  }, [searchTerm, roleFilter, siteFilter, employees]);

  const loadEmployees = async () => {
    try {
      const data = await fetchEmployees();
      setEmployees(data);
    } catch (err) {
      addToast(t('failedLoadWorkforce'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSites = async () => {
    try {
      const data = await fetchSites();
      setSites(data);
    } catch (err) {
      console.error('Failed to load sites');
    }
  };


  const handleDeleteEmployee = (id: string) => {
    setEmployeeToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    try {
      await deleteEmployee(employeeToDelete);
      setEmployees(employees.filter(emp => emp.id !== employeeToDelete));
      addToast(t('employeePurgedSuccess'), 'success');
    } catch (err: any) {
      addToast(err.message || t('actionFailed'), 'error');
    } finally {
      setIsConfirmOpen(false);
    }
  };

  const getDesignationLabel = (title: string) => {
    if (!title) return t('specialist');
    const normalized = title.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalized === 'experienceworker') return t('experienceWorker');
    if (normalized === 'freshworker') return t('freshWorker');
    if (normalized === 'storekeeper') return t('storeKeeper');
    if (normalized === 'srforeman') return t('srForeman');
    if (normalized === 'qaqc') return t('qaqc');
    return t(normalized) || title;
  };

  if (loading) return <div className="loading-state">{t('decryptingLedger')}</div>;

  return (
    <div className="employees-container">
      <div className="premium-toast-container">
        <AnimatePresence>
          {toasts.map((t) => (
            <Toast key={t.id} {...t} onClose={removeToast} />
          ))}
        </AnimatePresence>
      </div>

      {isAdmin && (
        <header className="glass-card profile-header" style={{ marginBottom: '24px' }}>
          <div className="header-content">
            <h1>{t('workforceIntelligence')}</h1>
            <p>{t('masterLedger')}</p>
          </div>
          <div className="header-actions">
            <input 
              type="file" 
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
              style={{ display: 'none' }} 
              ref={fileInputRef}
              onChange={handleFileUpload} 
            />
            <button className="btn btn-ghost" onClick={downloadTemplate}>
              <FileSpreadsheet size={18} /> {t('Template')}
            </button>
            <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>
              <Upload size={18} /> {t('Import')}
            </button>

            <button className="btn btn-ghost" onClick={() => exportToCSV(filteredEmployees, `Workforce_Master_${new Date().toISOString().split('T')[0]}`)}>
              <Download size={18} /> {t('exportLedger')}
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/employees/add')}>
              <UserPlus size={18} /> {t('addNewIdentity')}
            </button>
          </div>
        </header>
      )}

      <div className="employees-toolbar-premium">
        <div className="search-bar-premium">
          <Search size={20} className="search-icon" />
          <input 
            type="text" 
            placeholder={t('searchIdentityLedger')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {isAdmin && (
          <div className="filter-site-premium">
            <PremiumSelect 
              placeholder={t('allRoles')}
              value={roleFilter}
              onChange={(val: string) => setRoleFilter(val)}
              options={[
                { label: t('allRoles'), value: 'ALL' },
                { label: t('admin'), value: 'ADMIN' },
                { label: t('manager'), value: 'MANAGER' },
                { label: t('employee'), value: 'EMPLOYEE' }
              ]}
              className="filter-dropdown"
            />
            <PremiumSelect 
              placeholder={t('allSites')}
              value={siteFilter}
              onChange={(val: string) => setSiteFilter(val)}
              options={[
                { label: t('allSites'), value: 'ALL' },
                ...sites.map(site => ({ label: site.name, value: site.id }))
              ]}
              className="filter-dropdown"
            />
          </div>
        )}
      </div>

      {!isAdmin ? (
        <div className="manager-employee-grid">
          {filteredEmployees.map((emp) => (
            <div className="manager-emp-card glass-card" key={emp.id}>
              <div className="mec-header">
                <div className="mec-profile">
                  <div className="avatar-small">
                    {emp.avatar ? <img src={emp.avatar.startsWith('http') ? emp.avatar : `${API_URL}${emp.avatar}`} alt="Avatar" onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.firstName || 'User'}`; }} /> : emp.firstName.charAt(0)}
                  </div>
                  <div className="name-stack">
                    <span className="full-name">{emp.firstName} {emp.lastName}</span>
                    <span className="designation">{getDesignationLabel(emp.designation)}</span>
                  </div>
                </div>
                {emp.phone && (
                  <a href={`tel:${emp.phone}`} className="mec-call-btn">
                    <Phone size={18} />
                  </a>
                )}
              </div>
              <div className="mec-details">
                <div className="mec-row">
                  <span className="mec-label">{t('employeeID')}</span>
                  <span className="mono-badge">{emp.employeeId}</span>
                </div>
                <div className="mec-row">
                  <span className="mec-label">{t('roleStatus')}</span>
                  <div className="role-status">
                    <span className="role-tag">{t(emp.role.toLowerCase())}</span>
                    <span className={`status-dot ${emp.status.toLowerCase()}`}></span>
                  </div>
                </div>
                <div className="mec-row">
                  <span className="mec-label">{t('site')}</span>
                  <span className="mec-value">{emp.site?.name || t('unassigned')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card table-container-premium">
          <table className="employee-table">
            <thead>
              <tr>
                <th>{t('employeeName')}</th>
                <th>{t('employeeID')}</th>
                <th>{t('phoneNum')}</th>
                <th>{t('roleStatus')}</th>
                <th>{t('site')}</th>
                <th>{t('action')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id}>
                  <td data-label={t('employeeName')}>
                    <div className="emp-identity">
                      <div className="name-stack">
                        <span className="full-name">{emp.firstName} {emp.lastName}</span>
                        <span className="designation">{getDesignationLabel(emp.designation)}</span>
                      </div>
                    </div>
                  </td>
                  <td data-label={t('employeeID')}><span className="mono-badge">{emp.employeeId}</span></td>
                  <td data-label={t('phoneNum')}><span className="email-text">{emp.phone || 'N/A'}</span></td>
                  <td data-label={t('roleStatus')}>
                    <div className="role-status">
                      <span className="role-tag">{t(emp.role.toLowerCase())}</span>
                      <span className={`status-dot ${emp.status.toLowerCase()}`}></span>
                    </div>
                  </td>
                  <td data-label={t('site')}>{emp.site?.name || t('unassigned')}</td>
                  <td data-label={t('action')}>
                      <div className="action-row">
                        {isAdmin && (
                          <button className="action-icon-btn" onClick={() => navigate(`/employees/${emp.id}`)} title={t('viewDetailsBtn')}>
                            <Eye size={18} />
                          </button>
                        )}
                        {(isAdmin || user?.role === 'MANAGER') && emp.phone && (
                          <a href={`tel:${emp.phone}`} className="action-icon-btn call-btn" title={t('talkArchitect')}>
                            <Phone size={18} />
                          </a>
                        )}
                        {isAdmin && (
                          <button className="action-icon-btn" onClick={() => navigate(`/employees/edit/${emp.id}`)} title={t('editProfile')}>
                            <Edit3 size={18} />
                          </button>
                        )}
                        {isAdmin && (
                          <button className="action-icon-btn danger" onClick={() => handleDeleteEmployee(emp.id)} title={t('decommissionIdentityNode')}>
                            <XCircle size={18} />
                          </button>
                        )}
                      </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={isConfirmOpen}
        title={t('decommissionIdentityNode')}
        message={t('decommissionIdentityNodeDesc')}
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
        confirmText={t('executePurge')}
        cancelText={t('cancel')}
        variant="danger"
      />
    </div>
  );
};

export default Employees;
