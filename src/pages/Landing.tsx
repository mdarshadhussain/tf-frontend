import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  ArrowRight, 
  Languages, 
  Globe, 
  Zap, 
  ShieldCheck, 
  Cpu, 
  Sun,
  Moon,
  Activity,
  Layers,
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Play,
  User,
  Radar,
  ScanFace
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext'; 
import './Landing.css';

const fadeInUp: any = {
  initial: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};

const staggerContainer: any = {
  initial: {},
  visible: {
    transition: {
      staggerChildren: 0.15
    }
  }
};

const SIMULATED_WORKERS = [
  { 
    id: 'TF-201', 
    name: 'Arshad Hussain', 
    site: 'Refinery Zone A', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack', 
    distance: 120,
    coords: { x: 55, y: 45 },
    safe: true
  },
  { 
    id: 'TF-204', 
    name: 'Elena Rodriguez', 
    site: 'Loading Dock', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=elena', 
    distance: 780,
    coords: { x: 80, y: 25 },
    safe: false
  },
  { 
    id: 'TF-207', 
    name: 'David Chung', 
    site: 'Storage Area', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david', 
    distance: 340,
    coords: { x: 30, y: 68 },
    safe: true
  }
];

const Landing = () => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef as any,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "-15%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // Live Operations Simulator State
  const [simState, setSimState] = useState<'IDLE' | 'SCANNING' | 'VERIFIED' | 'OUT_OF_BOUNDS'>('IDLE');
  const [selectedWorkerIdx, setSelectedWorkerIdx] = useState(0);
  const [logs, setLogs] = useState<Array<{ time: string; text: string; type: 'info' | 'success' | 'alert' }>>([
    { time: '15:28:01', text: 'System initialized. Geofence nodes connected.', type: 'info' },
    { time: '15:28:15', text: 'Biometric security locks: Active.', type: 'info' },
    { time: '15:29:40', text: 'Telemetry server operational on Port 5000.', type: 'info' }
  ]);
  const [gmtTime, setGmtTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setGmtTime(d.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSimulate = (isSafe: boolean) => {
    if (simState === 'SCANNING') return;
    
    const worker = SIMULATED_WORKERS[isSafe ? 0 : 1];
    setSelectedWorkerIdx(isSafe ? 0 : 1);
    setSimState('SCANNING');
    
    const timeStr = new Date().toTimeString().split(' ')[0];
    
    setLogs(prev => [
      { time: timeStr, text: `Initiating secure clock-in request for ${worker.name}...`, type: 'info' },
      ...prev
    ]);
    
    setTimeout(() => {
      const doneTimeStr = new Date().toTimeString().split(' ')[0];
      if (isSafe) {
        setSimState('VERIFIED');
        setLogs(prev => [
          { time: doneTimeStr, text: `Biometric Match: 99.8% similarity detected. Authorized.`, type: 'success' },
          { time: doneTimeStr, text: `Check-In APPROVED at ${worker.site} (GPS Accuracy: ±2m).`, type: 'success' },
          ...prev
        ]);
        
        setTimeout(() => {
          setSimState(curr => curr === 'VERIFIED' ? 'IDLE' : curr);
        }, 4000);
      } else {
        setSimState('OUT_OF_BOUNDS');
        setLogs(prev => [
          { time: doneTimeStr, text: `Biometric Match: 98.4% similarity. Identity Verified.`, type: 'info' },
          { time: doneTimeStr, text: `⚠️ GEOFENCE VIOLATION: User is ${worker.distance}m from ${worker.site} (Limit: 500m).`, type: 'alert' },
          { time: doneTimeStr, text: `Alert dispatched to Hub Operations Command. Access Denied.`, type: 'alert' },
          ...prev
        ]);
      }
    }, 2000);
  };

  const handleReset = () => {
    setSimState('IDLE');
    const timeStr = new Date().toTimeString().split(' ')[0];
    setLogs([
      { time: timeStr, text: 'Simulation reset. Monitoring channel idle.', type: 'info' },
      { time: timeStr, text: 'Standing by for authorization request...', type: 'info' }
    ]);
  };

  const toggleLanguage = () => {
    const nextLng = i18n.language === 'en' ? 'vi' : 'en';
    i18n.changeLanguage(nextLng);
  };

  return (
    <div className={`landing-page ${theme}`}>
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>
      
      <nav className="landing-nav">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="logo-text"
        >
          TRACK<span>FORCE</span>
        </motion.div>
        <div className="nav-links">
          <button className="nav-tool-btn" onClick={toggleTheme} aria-label="Toggle Theme">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button className="nav-tool-btn" onClick={toggleLanguage} aria-label="Toggle Language">
            <Languages size={18} />
            <span className="lang-text">{i18n.language === 'en' ? 'VN' : 'EN'}</span>
          </button>
          <Link to="/login" className="nav-link-item">Login</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header ref={heroRef} className="hero-section">
        <motion.div style={{ y, opacity }} className="hero-container">
          <div className="hero-text-content">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              {(t('intelligenceTitle') as string).split(' ').slice(0, 2).join(' ')} <span>{(t('intelligenceTitle') as string).split(' ').slice(2).join(' ')}</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {t('heroDescription')}
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="hero-actions"
            >
              <Link to="/login" className="btn-hero-primary">
                {t('deployNow')} <ArrowRight size={22} />
              </Link>
              <button className="btn-hero-secondary" onClick={() => handleSimulate(true)}>
                {t('viewDemo')}
              </button>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="hero-trust-badge"
            >
              <div className="proof-avatars">
                {[1,2,3,4,5].map(i => (
                  <img key={i} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i*2}`} alt="" className="avatar-img" />
                ))}
              </div>
              <span>{t('trustedByEnterprise')}</span>
            </motion.div>
          </div>

          {/* Interactive Simulator Terminal instead of static image */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className={`hero-simulator-wrapper ${simState === 'OUT_OF_BOUNDS' ? 'breached' : ''}`}
          >
            <div className="terminal-dashboard">
              {/* Terminal Header */}
              <div className="terminal-header">
                <div className="terminal-status-indicator">
                  <span className={`status-led ${simState === 'OUT_OF_BOUNDS' ? 'alert' : simState === 'SCANNING' ? 'scanning' : 'active'}`} />
                  <span className="status-text">
                    {simState === 'OUT_OF_BOUNDS' ? 'SECURITY ALERT: BOUNDARY VIOLATION' : simState === 'SCANNING' ? 'X-RAY SCAN IN PROGRESS' : 'NETWORK NODE: ACTIVE'}
                  </span>
                </div>
                <div className="terminal-clock">{gmtTime}</div>
              </div>
              
              {/* Terminal Body */}
              <div className="terminal-grid">
                
                {/* Visual Panels (Radar Map & Face recognition scanner) */}
                <div className="terminal-main-display">
                  {/* Scanner Area */}
                  <div className="terminal-widget scanner-widget">
                    <div className="widget-header">
                      <ScanFace size={14} className="accent-color" /> <span>Biometric Auth Scanner</span>
                    </div>
                    
                    <div className="scanner-viewport">
                      <AnimatePresence mode="wait">
                        {simState === 'IDLE' && (
                          <motion.div 
                            key="idle" 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="scan-state-content state-idle"
                          >
                            <User size={40} className="idle-user-icon" />
                            <span>Authorization Terminal Standby</span>
                            <p>Select simulation path on the deck</p>
                          </motion.div>
                        )}

                        {simState === 'SCANNING' && (
                          <motion.div 
                            key="scanning" 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="scan-state-content state-scanning"
                          >
                            <div className="scanning-face-box">
                              <svg className="scanning-hud-svg" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" stroke="var(--primary)" strokeWidth="0.5" fill="none" strokeDasharray="5 5" />
                                <path d="M30 40 C 30 25, 70 25, 70 40 C 70 60, 60 75, 50 80 C 40 75, 30 60, 30 40 Z" fill="none" stroke="var(--primary)" strokeWidth="1.5" />
                                <circle cx="40" cy="40" r="1.5" fill="var(--primary)" />
                                <circle cx="60" cy="40" r="1.5" fill="var(--primary)" />
                                <circle cx="50" cy="50" r="1" fill="var(--primary)" />
                                <circle cx="44" cy="60" r="1.5" fill="var(--primary)" />
                                <circle cx="56" cy="60" r="1.5" fill="var(--primary)" />
                                <circle cx="50" cy="62" r="1" fill="var(--primary)" />
                              </svg>
                              <div className="scanning-beam"></div>
                              <img src={SIMULATED_WORKERS[selectedWorkerIdx].avatar} alt="Scanner User" className="scanning-avatar-preview" />
                            </div>
                            <span className="live-percentage">ANALYZING FACIAL SIGNATURE...</span>
                          </motion.div>
                        )}

                        {simState === 'VERIFIED' && (
                          <motion.div 
                            key="verified" 
                            initial={{ opacity: 0, scale: 0.9 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            exit={{ opacity: 0 }}
                            className="scan-state-content state-verified"
                          >
                            <CheckCircle size={44} className="result-icon-success" />
                            <div className="result-profile-card">
                              <img src={SIMULATED_WORKERS[selectedWorkerIdx].avatar} alt="" className="result-profile-avatar" />
                              <div className="result-profile-info">
                                <h5>{SIMULATED_WORKERS[selectedWorkerIdx].name}</h5>
                                <span className="profile-id">ID: {SIMULATED_WORKERS[selectedWorkerIdx].id}</span>
                                <span className="profile-badge safe">ACCESS APPROVED</span>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {simState === 'OUT_OF_BOUNDS' && (
                          <motion.div 
                            key="out-of-bounds" 
                            initial={{ opacity: 0, scale: 0.9 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            exit={{ opacity: 0 }}
                            className="scan-state-content state-breached"
                          >
                            <AlertTriangle size={44} className="result-icon-danger" />
                            <div className="result-profile-card">
                              <img src={SIMULATED_WORKERS[selectedWorkerIdx].avatar} alt="" className="result-profile-avatar" />
                              <div className="result-profile-info">
                                <h5>{SIMULATED_WORKERS[selectedWorkerIdx].name}</h5>
                                <span className="profile-id">ID: {SIMULATED_WORKERS[selectedWorkerIdx].id}</span>
                                <span className="profile-badge unsafe">GEOFENCE VIOLATION ({SIMULATED_WORKERS[selectedWorkerIdx].distance}m)</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Geofence Radar Area */}
                  <div className="terminal-widget radar-widget">
                    <div className="widget-header">
                      <Radar size={14} className="accent-color" /> <span>Geofence GPS Radar</span>
                    </div>
                    <div className="radar-viewport">
                      <svg className="radar-grid-svg" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="12" className="radar-grid-ring" />
                        <circle cx="50" cy="50" r="28" className="radar-grid-ring" />
                        <circle cx="50" cy="50" r="42" className="radar-grid-ring" />
                        
                        {/* Green Geofence limit at r=35 */}
                        <circle 
                          cx="50" 
                          cy="50" 
                          r="35" 
                          className={`radar-limit-boundary ${simState === 'OUT_OF_BOUNDS' ? 'limit-breached' : ''}`} 
                        />
                        
                        {/* Sweeper sweep */}
                        <div className="radar-sweeper-hand" />
                        <line x1="50" y1="50" x2="50" y2="8" className="radar-sweep-line" />

                        {/* Workers */}
                        {SIMULATED_WORKERS.map((worker, idx) => {
                          const isCurrent = selectedWorkerIdx === idx && simState !== 'IDLE';
                          return (
                            <g key={worker.id}>
                              <circle 
                                cx={worker.coords.x} 
                                cy={worker.coords.y} 
                                r={isCurrent ? 3.5 : 2} 
                                className={`radar-worker-node ${isCurrent ? (worker.safe ? 'safe-pulse' : 'breached-pulse') : 'static-node'}`} 
                              />
                              {isCurrent && (
                                <circle 
                                  cx={worker.coords.x} 
                                  cy={worker.coords.y} 
                                  r="8" 
                                  className={`radar-worker-pulse-ring ${worker.safe ? 'safe' : 'danger'}`} 
                                />
                              )}
                            </g>
                          );
                        })}
                      </svg>
                      <div className="radar-coordinates">
                        <span>RADIUS: 500M</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Control Deck / Ledger */}
                <div className="terminal-control-deck">
                  <div className="control-deck-actions">
                    <button 
                      className={`control-deck-btn btn-action-success ${simState === 'SCANNING' ? 'disabled' : ''}`}
                      onClick={() => handleSimulate(true)}
                      disabled={simState === 'SCANNING'}
                    >
                      <Play size={12} /> Simulate Safe Login
                    </button>
                    <button 
                      className={`control-deck-btn btn-action-danger ${simState === 'SCANNING' ? 'disabled' : ''}`}
                      onClick={() => handleSimulate(false)}
                      disabled={simState === 'SCANNING'}
                    >
                      <AlertTriangle size={12} /> Trigger Geofence Exit
                    </button>
                    <button 
                      className={`control-deck-btn btn-action-reset ${simState === 'SCANNING' ? 'disabled' : ''}`}
                      onClick={handleReset}
                      disabled={simState === 'SCANNING'}
                    >
                      <RefreshCw size={12} /> Reset Deck
                    </button>
                  </div>
                  
                  <div className="control-deck-logs">
                    <div className="logs-scroller">
                      {logs.map((log, i) => (
                        <div key={i} className={`log-entry ${log.type}`}>
                          <span className="log-time-stamp">[{log.time}]</span>
                          <span className="log-msg-text">{log.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </motion.div>
      </header>

      {/* Stats Strip */}
      <section className="stats-strip">
        <motion.div 
          variants={staggerContainer}
          initial="initial"
          whileInView="visible"
          viewport={{ once: true }}
          className="stats-container"
        >
          {[
            { label: t('activeNodes'), val: "5,280", icon: <Activity size={16} /> },
            { label: t('dailyTransactions'), val: "1.4M", icon: <Database size={16} /> },
            { label: t('uptimeSLA'), val: "99.99%", icon: <ShieldCheck size={16} /> },
            { label: t('sitesMonitored'), val: "312", icon: <Layers size={16} /> }
          ].map((s, i) => (
            <motion.div key={i} variants={fadeInUp} className="stat-node">
              <span className="node-val">{s.val}</span>
              <span className="node-label">
                <span className="status-pulse"></span>
                {s.label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Bento Grid Features */}
      <section className="features-grid-section">
        <div className="section-header">
          <motion.span variants={fadeInUp} className="sub-title">{t('coreIntelligence')}</motion.span>
          <motion.h2 variants={fadeInUp}>{t('obsidianArchitecture')}</motion.h2>
        </div>

        <div className="mosaic-grid">
          {/* Card 1: Biometrics with Code-Based SVG Scanner Animation */}
          <motion.div 
            variants={fadeInUp}
            initial="initial"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="mosaic-card c-biometric"
          >
            <div className="card-top">
              <div className="card-icon-box"><Cpu size={32} /></div>
              <h3>{t('biometricIdentityMatrix')}</h3>
              <p>{t('biometricMatrixDesc')}</p>
            </div>
            
            <div className="vector-card-visual biometrics-vector-visual">
              <svg className="vector-face-grid" viewBox="0 0 100 100">
                <defs>
                  <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(59, 130, 246, 0.15)" />
                    <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
                  </radialGradient>
                </defs>
                <circle cx="50" cy="50" r="45" fill="url(#glowGrad)" />
                <path className="vector-face-contour" d="M30 40 C 30 20, 70 20, 70 40 C 70 65, 60 80, 50 85 C 40 80, 30 65, 30 40 Z" fill="none" stroke="var(--primary)" strokeWidth="1" />
                
                {/* Connecting grid network lines */}
                <line x1="50" y1="20" x2="50" y2="85" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 2" />
                <line x1="30" y1="40" x2="70" y2="40" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 2" />
                <line x1="35" y1="58" x2="65" y2="58" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 2" />

                {/* Animated facial grid coordinates */}
                <circle cx="50" cy="20" r="2" className="vector-hud-dot dot-1" />
                <circle cx="30" cy="40" r="2" className="vector-hud-dot dot-2" />
                <circle cx="70" cy="40" r="2" className="vector-hud-dot dot-3" />
                <circle cx="50" cy="40" r="2" className="vector-hud-dot dot-4" />
                <circle cx="40" cy="58" r="2" className="vector-hud-dot dot-5" />
                <circle cx="60" cy="58" r="2" className="vector-hud-dot dot-6" />
                <circle cx="50" cy="85" r="2" className="vector-hud-dot dot-7" />
              </svg>
              <div className="vector-scan-laser"></div>
            </div>
          </motion.div>

          {/* Card 2: Geofence with Multi-Ring Ripple Animation */}
          <motion.div 
            variants={fadeInUp}
            initial="initial"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="mosaic-card c-geofence"
          >
            <div className="card-top">
              <div className="card-icon-box"><MapPin size={32} /></div>
              <h3>{t('geofenceShield')}</h3>
              <p>{t('geofenceShieldDesc')}</p>
            </div>
            
            <div className="vector-card-visual geofence-vector-visual">
              <div className="radial-pulse-wrapper">
                <div className="geofence-core-hub">
                  <MapPin size={20} color="var(--primary)" />
                </div>
                {[1, 2, 3].map(i => (
                  <div key={i} className="geofence-pulse-ring" style={{ animationDelay: `${i * 0.8}s` }}></div>
                ))}
                <div className="drifter-worker-node"></div>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Telemetry with Looping Waveform SVG */}
          <motion.div 
            variants={fadeInUp}
            initial="initial"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="mosaic-card c-telemetry"
          >
             <div className="card-top">
              <div className="card-icon-box"><Activity size={32} /></div>
              <h3>{t('realtimeTelemetry')}</h3>
              <p>{t('telemetryDesc')}</p>
            </div>
            
            <div className="vector-card-visual telemetry-vector-visual">
              <svg className="telemetry-live-svg" viewBox="0 0 200 80">
                <defs>
                  <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                
                {/* Grid guidelines */}
                <line x1="0" y1="20" x2="200" y2="20" stroke="var(--border)" strokeWidth="0.5" />
                <line x1="0" y1="40" x2="200" y2="40" stroke="var(--border)" strokeWidth="0.5" />
                <line x1="0" y1="60" x2="200" y2="60" stroke="var(--border)" strokeWidth="0.5" />

                {/* Dynamic animated paths */}
                <path 
                  className="telemetry-wave-path wave-path-1" 
                  d="M0,40 Q25,10 50,40 T100,40 T150,40 T200,40" 
                  fill="none" 
                  stroke="url(#waveGrad)" 
                  strokeWidth="2.5" 
                />
                <path 
                  className="telemetry-wave-path wave-path-2" 
                  d="M0,40 Q25,70 50,40 T100,40 T150,40 T200,40" 
                  fill="none" 
                  stroke="url(#waveGrad)" 
                  strokeWidth="1.5" 
                  opacity="0.4"
                />
              </svg>
              <div className="telemetry-pulse-dot" />
            </div>
          </motion.div>

          {/* Card 4: Payroll with Dynamic Interactive Ledger */}
          <motion.div 
            variants={fadeInUp}
            initial="initial"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="mosaic-card c-payroll"
          >
            <div className="card-top">
              <div className="card-icon-box"><Zap size={32} /></div>
              <h3>{t('payrollGrid')}</h3>
              <p>{t('payrollGridDesc')}</p>
            </div>
            
            <div className="vector-card-visual payroll-vector-visual">
              <div className="payroll-simulated-terminal">
                <div className="payroll-item-row processed">
                  <div className="payroll-indicator active" />
                  <span className="payroll-label-text">TF-901 Ledger Sync</span>
                  <span className="payroll-status-badge">PAID</span>
                </div>
                <div className="payroll-item-row processed">
                  <div className="payroll-indicator active" />
                  <span className="payroll-label-text">TF-902 Ledger Sync</span>
                  <span className="payroll-status-badge">PAID</span>
                </div>
                <div className="payroll-item-row loading">
                  <div className="payroll-indicator processing" />
                  <span className="payroll-label-text">TF-903 Hours Calc</span>
                  <div className="payroll-progress-tracker">
                    <div className="payroll-fill-bar" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="cta-control-center"
        >
          <div className="cta-glow-orb"></div>
          <div className="cta-text-side">
            <h2>{t('readyOptimize')}</h2>
            <p>{t('joinElite')}</p>
            <Link to="/login" className="btn-cta-launch">
              {t('launchProject')} <ArrowRight size={24} />
            </Link>
          </div>
          <div className="cta-visual-side">
            <Globe size={300} strokeWidth={0.5} style={{ opacity: 0.15 }} className="rotating-globe-icon" />
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="logo-text">TRACK<span>FORCE</span></div>
            <p>{(t('heroDescription') as string).split('.')[0]}.</p>
          </div>
          <div className="footer-grid">
            <div className="footer-col">
              <h4>{t('platform')}</h4>
              <Link to="/login">{t('intelligenceHub')}</Link>
              <Link to="/login">{t('biometricMatrix')}</Link>
              <Link to="/login">{t('geofencePerimeter')}</Link>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <a href="#docs">Documentation</a>
              <a href="#security">Security Whitepaper</a>
              <a href="#api">API Reference</a>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <a href="#about">About</a>
              <a href="#careers">Careers</a>
              <a href="#privacy">Privacy Policy</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 TrackForce Enterprise. All Rights Reserved.</p>
          <div className="legal-links">
            <a href="#terms">Terms of Service</a>
            <a href="#cookies">Cookie Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
