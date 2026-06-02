import { useState, useEffect } from 'react';

import { useParams, useNavigate } from 'react-router-dom';
import { 
  Briefcase,
  Calendar,
  ChevronLeft,
  Clock,
  Coins,
  CreditCard,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Key,
  Landmark,
  Lock,
  MapPin,
  Smartphone,
  TrendingUp,
  User,
  Wallet,
} from 'lucide-react';



import { motion } from 'framer-motion';



import { fetchEmployeeFullProfile } from '../api/api';
import DocumentModal from '../components/DocumentModal';
import { useAuth } from '../context/AuthContext';
import './EmployeeDetails.css';
import { useTranslation } from 'react-i18next';


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const EmployeeDetails = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showPassword, setShowPassword] = useState(true);
  const [docModal, setDocModal] = useState({ isOpen: false, url: '', title: '' });

  const openDoc = (url: string, title: string) => {
    setDocModal({ isOpen: true, url: `${API_URL}${url}`, title });
  };


  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }

    const loadProfile = async () => {
      try {
        const fullProfile = await fetchEmployeeFullProfile(id!);
        setData(fullProfile);
      } catch (err) {
        console.error("Failed to fetch workforce intelligence:", err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [id, isAdmin, user, navigate]);

  if (loading) {
    return (
      <div className="loading-state">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <TrendingUp size={48} color="var(--primary)" />
        </motion.div>
        <p>{t('decryptingLedger')}</p>
      </div>
    );
  }

  if (!data) return <div className="error-state">{t('noProjectsFound')}</div>;

  const { employee, attendance, stats } = data;

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

  const getLocaleDateString = (dateStr: string, options?: Intl.DateTimeFormatOptions) => {
    return new Date(dateStr).toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', options);
  };

  return (
    <div className="employee-details-page">

      {/* Hero Section */}
      <section className="glass-card employee-hero-card-premium">
        <button 
          className="hero-back-btn-top-right" 
          onClick={() => navigate('/employees')}
        >
          <ChevronLeft size={16} /> {t('cancel')}
        </button>

        <div className="hero-avatar-wrapper">
          <div className="hero-avatar-large">
            {employee.avatar ? (
              <img src={employee.avatar.startsWith('http') ? employee.avatar : `${API_URL}${employee.avatar}`} alt="" />
            ) : (
              <User size={64} />
            )}
          </div>
          <button 
            className="avatar-edit-badge" 
            onClick={() => navigate(`/employees/edit/${employee.id}`)}
            title={t('editProfile')}
          >
            <Edit3 size={16} />
          </button>
        </div>

        <div className="hero-info-cluster">
          <div className="hero-meta-tags">
            <span className="id-tag-premium">{employee.employeeId}</span>
            <span className={`status-badge-premium ${employee.status.toLowerCase()}`}>{t(employee.status.toLowerCase())}</span>
            <span className={`biometric-badge-premium ${employee.isBiometricEnrolled ? 'verified' : 'pending'}`}>
              {employee.isBiometricEnrolled ? t('verified') : t('notEnrolled')}
            </span>
          </div>
          <h1>{employee.firstName} {employee.lastName}</h1>
          
          <div className="hero-sub-meta" style={{ display: 'flex', gap: '2.5rem', color: 'var(--text-secondary)', alignItems: 'center', marginTop: '1rem' }}>
            <div className="credential-node-premium">
              <Key size={14} />
              <label>{t('employeeID')}:</label>
              <span>{employee.employeeId}</span>
            </div>
            <div className="credential-node-premium">
              <Lock size={14} />
              <label>{t('passwordLabel')}:</label>
              <div className="pass-toggle-node">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={employee.plainPassword || "••••••••"} 
                  readOnly 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="pass-visibility-btn"
                  title={showPassword ? t('rememberLogin') : t('signInNow')}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="hero-sub-meta" style={{ display: 'flex', gap: '2rem', color: 'var(--text-secondary)', alignItems: 'center', marginTop: '1rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={16} /> {getDesignationLabel(employee.designation)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={16} /> {employee.site?.name || t('unassigned')}
            </span>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="intelligence-grid">
        <StatCard 
          icon={<Clock size={24} />} 
          label={t('workingHours')} 
          value={`${parseFloat(stats.totalHours || '0').toFixed(1)}h`} 
          color="var(--primary)" 
        />
        <StatCard 
          icon={<Wallet size={24} />} 
          label={t('grossAmount')} 
          value={`${parseFloat(stats.totalEarnings || '0').toLocaleString('en-US')} ₫`} 
          color="#10b981" 
        />
        <StatCard 
          icon={<Calendar size={24} />} 
          label={t('presentLabel')} 
          value={stats.totalDays} 
          color="#8b5cf6" 
        />
      </div>

      {/* Tabs */}
      <nav className="details-navigation">
        <button 
          className={`nav-tab-premium ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          {t('welcomeBack')}
        </button>
        <button 
          className={`nav-tab-premium ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          {t('history')}
        </button>
      </nav>

      <main className="details-content">
        {activeTab === 'overview' ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="creative-overview-deck"
          >
            <div className="deck-col-main">
              <div className="glass-tile-premium identity-site-tile personal-details-tile">
                <div className="tile-header">
                  <User size={20} />
                  <h4>{t('profile')}</h4>
                </div>
                <div className="tile-content-stack">
                  <InfoItem icon={<Smartphone size={16} />} label={t('phoneNum')} value={employee.phone || t('noCustomHolidays')} />
                  <InfoItem icon={<Calendar size={16} />} label={t('dobLabel')} value={employee.dob ? getLocaleDateString(employee.dob) : t('noCustomHolidays')} />
                  <InfoItem icon={<Calendar size={16} />} label={t('date')} value={getLocaleDateString(employee.createdAt)} />
                </div>
              </div>

              <div className="deck-row-sub">
                <div className="glass-tile-premium finance-tile salary-details-tile">
                  <div className="tile-header">
                    <Coins size={20} />
                    <h4>{t('salaryPayout')}</h4>
                  </div>
                  <div className="tile-data-large">
                    <span className="large-value">{employee.hourlyRate?.toLocaleString('en-US') || '0'} ₫</span>
                    <span className="label">{t('salaryPerHour')}</span>
                  </div>
                  <div className="tile-footer-meta">
                    <TrendingUp size={14} /> 
                    <span>{t('overtime')}: {employee.overtimeType === 'MULTIPLIER' ? `${employee.overtimeValue}x ${t('multiplier')}` : `${employee.overtimeValue?.toLocaleString('en-US')} ₫ ${t('fixedAmount')}`}</span>
                  </div>
                </div>

                <div className="glass-tile-premium performance-tile attendance-stats-tile">
                  <div className="tile-header">
                    <TrendingUp size={20} />
                    <h4>{t('attendanceEfficiency')}</h4>
                  </div>
                  <div className="mini-stat-cluster">
                    <div className="mini-stat">
                      <span>{t('presentLabel')}</span>
                      <strong>{stats.totalDays}</strong>
                    </div>
                    <div className="mini-stat">
                      <span>{t('workingHours')}</span>
                      <strong>{parseFloat(stats.totalHours || '0').toFixed(1)}h</strong>
                    </div>
                  </div>
                </div>
              </div>
              <div className="glass-tile-premium identity-site-tile passport-intelligence-tile">
                <div className="tile-header">
                  <CreditCard size={20} />
                  <h4>{t('identificationDocs')}</h4>
                </div>
                <div className="tile-content-stack">
                  <InfoItem icon={<Smartphone size={14} />} label={t('passportIdNumber')} value={employee.passportNumber || t('noCustomHolidays')} />
                  <InfoItem icon={<Calendar size={14} />} label={t('passportIssueLabel')} value={employee.passportIssue ? getLocaleDateString(employee.passportIssue) : '--'} />
                  <InfoItem icon={<Calendar size={14} />} label={t('passportExpiryLabel')} value={employee.passportExpiry ? getLocaleDateString(employee.passportExpiry) : '--'} />
                </div>
              </div>
            </div>

            <div className="deck-col-side">
              <div className="glass-tile-premium identity-site-tile sidebar-tile financial-node-tile">
                <div className="tile-header">
                  <Landmark size={20} />
                  <h4>{t('bankAccounts')}</h4>
                </div>
                <div className="tile-content-stack">
                  <InfoItem icon={<Landmark size={14} />} label={t('bankNameLabel')} value={employee.bankName || t('noCustomHolidays')} />
                  <InfoItem icon={<CreditCard size={14} />} label={t('accountNumberLabel')} value={employee.accountNumber || t('noCustomHolidays')} />
                  <InfoItem icon={<User size={14} />} label={t('accountHolderNameLabel')} value={employee.accountHolderName || t('noCustomHolidays')} />
                </div>
              </div>

              <div className="glass-tile-premium documents-tile sidebar-tile documentation-tile" style={{ marginTop: '1.5rem' }}>
                <div className="tile-header">
                  <FileText size={20} />
                  <h4>{t('resumeCv')}</h4>
                </div>
                <div className="doc-link-stack">
                  <div className="doc-link-node">
                    <span>{t('resumeCv')}</span>
                    {employee.cvPath ? (
                      <button onClick={() => openDoc(employee.cvPath, t('resumeCv'))} className="doc-btn">
                        <Eye size={14} /> {t('viewDetailsBtn')}
                      </button>
                    ) : (
                      <span className="not-uploaded pending-badge">{t('pendingLabel')}</span>
                    )}
                  </div>
                  <div className="doc-link-node">
                    <span>{t('idProofDoc')}</span>
                    {employee.idDocPath ? (
                      <button onClick={() => openDoc(employee.idDocPath, t('idProofDoc'))} className="doc-btn">
                        <Eye size={14} /> {t('viewDetailsBtn')}
                      </button>
                    ) : (
                      <span className="not-uploaded pending-badge">{t('pendingLabel')}</span>
                    )}
                  </div>


                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="attendance-pane"
          >
            <div className="attendance-timeline-premium">
              {attendance.length > 0 ? attendance.map((log: any) => (
                <div key={log.id} className="glass-card log-entry-card">
                  <div className="log-date-cluster">
                    <span className="log-date">{getLocaleDateString(log.date, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className="log-day">{getLocaleDateString(log.date, { weekday: 'long' })}</span>
                  </div>

                  <div className="log-details-cluster">
                    <div className="time-row">
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} color="#10b981" /> {t('checkin')}: <strong>{new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                      </span>
                      {log.clockOut ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} color="#ef4444" /> {t('checkout')}: <strong>{new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                        </span>
                      ) : (
                        <span className="status-badge-premium pending">{t('active')}</span>
                      )}
                    </div>
                    <div className="location-row" style={{ display: 'flex', gap: '1rem', marginTop: '4px' }}>
                      {log.clockInLat != null && log.clockInLong != null && (
                        <span className="location-tag-premium">
                          <MapPin size={12} /> {Number(log.clockInLat).toFixed(4)}, {Number(log.clockInLong).toFixed(4)} ({t('checkin')})
                        </span>
                      )}
                      {log.clockOutLat != null && log.clockOutLong != null && (
                        <span className="location-tag-premium">
                          <MapPin size={12} /> {Number(log.clockOutLat).toFixed(4)}, {Number(log.clockOutLong).toFixed(4)} ({t('checkout')})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="log-proof-cluster-dual">
                    <div className="proof-node-premium">
                      <span className="proof-label">{t('checkin')}</span>
                      {log.biometricProof ? (
                        <div className="proof-img-container" onClick={() => window.open(log.biometricProof.startsWith('http') ? log.biometricProof : `${API_URL}${log.biometricProof}`, '_blank')}>
                          <img src={log.biometricProof.startsWith('http') ? log.biometricProof : `${API_URL}${log.biometricProof}`} alt="Check-in Proof" />
                          <div className="proof-overlay"><ExternalLink size={12} /></div>
                        </div>
                      ) : (
                        <div className="proof-img-container no-proof"><ImageIcon size={20} color="var(--border)" /></div>
                      )}
                    </div>

                    <div className="proof-node-premium">
                      <span className="proof-label">{t('checkout')}</span>
                      {log.biometricProofOut ? (
                        <div className="proof-img-container" onClick={() => window.open(log.biometricProofOut.startsWith('http') ? log.biometricProofOut : `${API_URL}${log.biometricProofOut}`, '_blank')}>
                          <img src={log.biometricProofOut.startsWith('http') ? log.biometricProofOut : `${API_URL}${log.biometricProofOut}`} alt="Check-out Proof" />
                          <div className="proof-overlay"><ExternalLink size={12} /></div>
                        </div>
                      ) : (
                        <div className="proof-img-container no-proof"><ImageIcon size={20} color="var(--border)" /></div>
                      )}
                    </div>
                    <span className={`status-badge-premium ${log.status.toLowerCase()}`}>{t(log.status.toLowerCase())}</span>
                  </div>
                </div>
              )) : (
                <div className="empty-state-premium">
                  <Clock size={48} />
                  <p>{t('noLogs')}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </main>

      <DocumentModal 
        isOpen={docModal.isOpen}
        onClose={() => setDocModal({ ...docModal, isOpen: false })}
        docUrl={docModal.url}
        docTitle={docModal.title}
      />
    </div>

  );
};

const StatCard = ({ icon, label, value, color }: any) => (
  <div className="glass-card intel-card">
    <div className="intel-icon" style={{ borderColor: `${color}44`, color }}>
      {icon}
    </div>
    <div className="intel-content">
      <span>{label}</span>
      <h3>{value}</h3>
    </div>
  </div>
);

const InfoItem = ({ icon, label, value }: any) => {
  const isNotProvided = value === 'Not provided' || value === '--' || value === 'Chưa cấu hình ngày nghỉ lễ tùy chỉnh' || value === 'No custom holidays configured';
  return (
    <div className="info-item-stack">
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>
        {icon} {label}
      </label>
      <span style={{ 
        fontWeight: isNotProvided ? 400 : 600, 
        fontSize: '1rem', 
        color: isNotProvided ? 'var(--text-tertiary)' : 'var(--text-primary)',
        fontStyle: isNotProvided ? 'italic' : 'normal'
      }}>
        {value}
      </span>
    </div>
  );
};

export default EmployeeDetails;
