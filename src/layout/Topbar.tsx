import { 
  Sun, 
  Moon, 
  Menu, 
  Bell,
  HelpCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Topbar.css';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Topbar = ({ onMenuClick, hideMenuBtn = false }: { onMenuClick?: () => void; hideMenuBtn?: boolean }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { i18n } = useTranslation();

  return (
    <header className="topbar">
      <div className="topbar-inner">
        {!hideMenuBtn && (
          <button className="mobile-menu-btn" onClick={onMenuClick}>
            <Menu size={24} />
          </button>
        )}
        
        <div className="topbar-mobile-logo">
          {user?.role === 'EMPLOYEE' ? (
            <span className="user-welcome-name" style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-primary)' }}>
              {user?.firstName} {user?.lastName}
            </span>
          ) : (
            <>TRACK<span>FORCE</span></>
          )}
        </div>
        
        <div className="topbar-spacer"></div>

        <div className="topbar-actions">
          <button className="icon-btn theme-btn" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
          </button>

          <button className="icon-btn bell-btn">
            <Bell size={20} />
            <span className="notification-dot"></span>
          </button>

          <button className="icon-btn help-btn">
            <HelpCircle size={20} />
          </button>

          <div className="lang-direct-switch" style={{ display: 'flex', alignItems: 'center', marginLeft: '6px' }}>
            {i18n.language === 'vi' ? (
              <button 
                className="flag-btn" 
                onClick={() => i18n.changeLanguage('en')}
                title="Switch to English"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <img src="https://flagcdn.com/w40/gb.png" alt="English" style={{ width: '28px', height: '20px', objectFit: 'cover', borderRadius: '4px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', display: 'block' }} />
              </button>
            ) : (
              <button 
                className="flag-btn" 
                onClick={() => i18n.changeLanguage('vi')}
                title="Chuyển sang Tiếng Việt"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <img src="https://flagcdn.com/w40/vn.png" alt="Tiếng Việt" style={{ width: '28px', height: '20px', objectFit: 'cover', borderRadius: '4px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', display: 'block' }} />
              </button>
            )}
          </div>
          
          <div className="user-profile-mini">
            <img 
              src={
                user?.avatar
                  ? (user.avatar.startsWith('http') || user.avatar.startsWith('data:')
                      ? user.avatar
                      : `${API_URL}${user.avatar.startsWith('/') ? user.avatar : `/${user.avatar}`}`)
                  : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.firstName || 'User'}`
              }
              alt="User" 
              className="user-avatar-mini"
              onError={(e) => {
                e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.firstName || 'User'}`;
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
