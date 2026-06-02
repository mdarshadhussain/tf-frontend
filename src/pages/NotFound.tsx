import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import './NotFound.css';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found-container">
      <div className="not-found-blob blob-1"></div>
      <div className="not-found-blob blob-2"></div>
      
      <div className="not-found-card glass-panel">
        <div className="not-found-icon-wrapper">
          <ShieldAlert size={64} className="not-found-icon" />
        </div>
        <h1 className="not-found-title">404</h1>
        <h2 className="not-found-subtitle">Page Not Found</h2>
        <p className="not-found-desc">
          Sorry, the page you are looking for doesn't exist, has been moved, or is temporarily unavailable.
        </p>
        
        <div className="not-found-actions">
          <button onClick={() => navigate(-1)} className="btn-secondary">
            <ArrowLeft size={18} />
            Go Back
          </button>
          <button onClick={() => navigate('/')} className="btn-primary">
            <Home size={18} />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
