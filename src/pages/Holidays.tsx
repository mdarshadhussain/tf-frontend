import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Trash2, Loader2, CalendarDays, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchHolidays, createHoliday, deleteHoliday } from '../api/api';
import Toast from '../components/Toast';
import type { ToastType } from '../components/Toast';
import './Holidays.css';

const Holidays = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toasts, setToasts] = useState<any[]>([]);
  
  const [newDate, setNewDate] = useState('');
  const [newName, setNewName] = useState('');

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    setLoading(true);
    try {
      const data = await fetchHolidays();
      setHolidays(data);
    } catch (err: any) {
      addToast(err.message || t('failedLoadHolidays'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) {
      addToast(t('selectDate'), 'info');
      return;
    }
    setIsSaving(true);
    try {
      await createHoliday({ date: newDate, name: newName || undefined });
      addToast(t('holidayAddedSuccess'), 'success');
      setNewDate('');
      setNewName('');
      loadHolidays();
    } catch (err: any) {
      addToast(err.message || t('failedAddHoliday'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!window.confirm(t('confirmRemoveHoliday'))) return;
    try {
      await deleteHoliday(id);
      addToast(t('holidayDeletedSuccess'), 'success');
      loadHolidays();
    } catch (err: any) {
      addToast(err.message || t('failedDeleteHoliday'), 'error');
    }
  };

  return (
    <div className="holidays-page">
      <div className="premium-toast-container">
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onClose={removeToast} />
        ))}
      </div>

      <header className="page-header-premium">
        <div className="header-text">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {t('annualHolidaysCalendar')}
          </motion.h1>
          <p>{t('holidaysSubtext')}</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={() => navigate('/payroll')}>
            <ArrowLeft size={18} /> {t('backToPayroll')}
          </button>
        </div>
      </header>

      <div className="holidays-layout-grid">
        {/* Left Column: Form Card */}
        <motion.div 
          className="glass-card holiday-form-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="card-header-premium">
            <div className="header-icon">
              <Calendar size={20} />
            </div>
            <h3>{t('configureNewHoliday')}</h3>
          </div>
          
          <form onSubmit={handleAddHoliday} className="holiday-form">
            <div className="form-group">
              <label>{t('holidayDate')}</label>
              <input 
                type="date" 
                required 
                value={newDate} 
                onChange={e => setNewDate(e.target.value)} 
                className="holiday-input"
              />
            </div>
            
            <div className="form-group">
              <label>{t('holidayLabelName')}</label>
              <input 
                type="text" 
                placeholder={t('holidayPlaceholder')}
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                className="holiday-input"
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary submit-btn"
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
              {t('addToCalendar')}
            </button>
          </form>
        </motion.div>

        {/* Right Column: Holidays List Card */}
        <motion.div 
          className="glass-card holiday-list-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="card-header-premium">
            <div className="header-icon">
              <CalendarDays size={20} />
            </div>
            <h3>{t('scheduledStatutoryHolidays')}</h3>
          </div>

          <div className="holiday-list-scroll">
            {loading ? (
              <div className="loading-state-holiday">
                <Loader2 className="spin" size={32} color="var(--primary)" />
                <p>{t('loadingScheduledCalendar')}</p>
              </div>
            ) : holidays.length > 0 ? (
              <div className="holiday-items-grid">
                {holidays.map((h) => (
                  <div key={h.id} className="holiday-item-row">
                    <div className="holiday-info">
                      <span className="holiday-name">{h.name || t('annualHoliday')}</span>
                      <span className="holiday-date">
                        {new Date(h.date).toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleDeleteHoliday(h.id)}
                      className="icon-btn-premium delete"
                      title="Remove Holiday"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-holidays-state">
                <Calendar size={48} className="empty-icon" />
                <p className="main-msg">{t('noCustomHolidays')}</p>
                <p className="sub-msg">{t('addCustomHolidaysDesc')}</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Holidays;
