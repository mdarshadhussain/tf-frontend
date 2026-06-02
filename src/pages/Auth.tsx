import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  Languages, 
  Eye, 
  EyeOff, 
  Sun, 
  Moon, 
  Compass,
  Fingerprint
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext'; 
import { loginUser } from '../api/api';
import './Auth.css';

export const Login = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'SSO'>('LOGIN');
  const [ssoDomain, setSsoDomain] = useState('');

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLng = i18n.language === 'en' ? 'vi' : 'en';
    i18n.changeLanguage(nextLng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginUser(employeeId, password);
      login(data.user, data.token);
      // Redirect based on role: managers go to site attendance, others to dashboard
      if (data.user?.role === 'MANAGER') {
        navigate('/attendance/manager');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCredential = async (role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE') => {
    let username = '';
    let pass = 'password123';
    
    if (role === 'ADMIN') username = 'TF001';
    else if (role === 'MANAGER') username = 'TF002';
    else if (role === 'EMPLOYEE') username = 'TF003';
    
    setEmployeeId(username);
    setPassword(pass);
    setError('');
    
    // Auto-login for super smooth testing experience
    setLoading(true);
    try {
      const data = await loginUser(username, pass);
      login(data.user, data.token);
      // Redirect managers to site attendance after quick login
      if (data.user?.role === 'MANAGER') {
        navigate('/attendance/manager');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || t('quickLoginFailed'));
      setLoading(false);
    }
  };

  const handleSsoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Simulate SSO Redirect
    setTimeout(() => {
      setLoading(false);
      setError(t('ssoGatewayTimeout'));
    }, 1500);
  };

  return (
    <div className={`auth-split-page ${theme}`}>
      
      {/* Left Panel: High Impact Graphics & Branding */}
      <div className="auth-left-panel">
        <div className="left-panel-grid-overlay"></div>
        <div className="left-panel-orb"></div>
        
        <header className="left-panel-header">
          <div className="left-logo">TRACK<span>FORCE</span></div>
        </header>

        <main className="left-panel-body">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="left-panel-tag">{t('secureWorkforceTelemetry')}</span>
            <h1>{t('optimizeWorkforceSecurePerimeter')}</h1>
            <p>
              {t('authLeftPanelDesc')}
            </p>
          </motion.div>

          {/* Graphic Dashboard Mockup element */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 0.15, scale: 1 }}
            transition={{ delay: 0.3, duration: 1 }}
            className="left-panel-graphic"
          >
            <Compass size={320} className="rotating-graphic" />
          </motion.div>
        </main>

        <footer className="left-panel-footer">
          <span>PORTAL NODE: TF-GRID-90</span>
          <span>&copy; 2026 TrackForce Enterprise</span>
        </footer>
      </div>

      {/* Right Panel: Sleek Authentication Form */}
      <div className="auth-right-panel">
        <div className="right-panel-top-bar">
          <div className="mobile-logo">TRACK<span>FORCE</span></div>
          <div className="right-panel-controls">
            <button className="panel-btn" onClick={toggleTheme} aria-label="Toggle Theme">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button className="panel-btn lang-btn" onClick={toggleLanguage} aria-label="Toggle Language">
              <Languages size={16} />
              <span>{i18n.language === 'en' ? 'VN' : 'EN'}</span>
            </button>
          </div>
        </div>

        <div className="right-panel-auth-deck">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="auth-card-deck"
          >
            <div className="auth-deck-header">
              <span className="deck-tag-pre">{t('secureGridEntry')}</span>
              <h2>{t('welcomeBack')}</h2>
              <p>{t('signInSubtitle')}</p>
            </div>



            {error && (
              <div className="deck-error-box">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <AnimatePresence mode="wait">
                <motion.form 
                  key="login"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleSubmit}
                  className="deck-form"
                >
                  <div className="form-group-deck">
                    <label>{t('employeeID')}</label>
                    <div className="input-group-deck">
                      <User size={18} className="input-icon-deck" />
                      <input 
                        type="text" 
                        placeholder="e.g. TF001" 
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group-deck">
                    <label>{t('passwordLabel')}</label>
                    <div className="input-group-deck">
                      <Lock size={18} className="input-icon-deck" />
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        placeholder="••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="pass-eye-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-action-row">
                    <label className="checkbox-deck">
                      <input type="checkbox" /> {t('rememberLogin')}
                    </label>
                    <a href="https://zalo.me/0911907082" target="_blank" rel="noopener noreferrer" className="forgot-key-link" title="Contact Zalo Support for Access Recovery">{t('lostAccessContactAdmin')}</a>
                  </div>

                  <button type="submit" className="btn-deck-primary" disabled={loading}>
                    {loading ? t('authorizingNode') : t('signInNow')} <ArrowRight size={18} />
                  </button>
                </motion.form>
            </AnimatePresence>



            <div className="deck-footer-status">
              <div className="security-status-node">
                <div className="status-ping-pulse"></div>
                <span>{t('portalSecureChannelActive')}</span>
              </div>
            </div>

          </motion.div>
        </div>
      </div>

    </div>
  );
};
export default Login;
