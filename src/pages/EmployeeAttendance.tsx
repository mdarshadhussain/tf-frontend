import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  MapPin, 
  Calendar as CalIcon, 
  History, 
  UserCheck,
  Timer,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import * as faceapi from 'face-api.js';
import { useAuth } from '../context/AuthContext';
import { clockIn, clockOut, fetchTodayLogs, fetchAllLogs, createSecurityAlert, fetchEmployeeById } from '../api/api';
import { loadFaceApiModels, areModelsLoaded } from '../utils/aiModels';
import './EmployeeAttendance.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const base64ToBlob = (base64: string) => {
  const byteString = atob(base64.split(',')[1]);
  const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
};

function playSound(type: 'success' | 'error' | 'location' | 'facial' | 'biometric_success' | 'biometric_fail') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'success') {
      // Pleasant double-beep or rising chime
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.25);
    } else if (type === 'error') {
      // Low buzz / double fall
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(150, ctx.currentTime);
      oscillator.frequency.setValueAtTime(120, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.25);
    } else if (type === 'location') {
      // Short neutral blip for location checking
      oscillator.type = 'sine';
      oscillator.frequency.value = 600; // Hz
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.1);
    } else if (type === 'facial') {
      // Short neutral sweep for scanning facial descriptor
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.15);
    } else if (type === 'biometric_success') {
      // Bright high pitch double-beep
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      oscillator.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.1); // C6
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.25);
    } else if (type === 'biometric_fail') {
      // Low warning tone
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(220, ctx.currentTime); // A3
      oscillator.frequency.setValueAtTime(180, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    console.error("Audio Context playback failed", e);
  }
}

const EmployeeAttendance = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [logs, setLogs] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);


  const [activeAction, setActiveAction] = useState<'IN' | 'OUT' | null>(null);
  const [step, setStep] = useState<'idle' | 'checking_location' | 'location_success' | 'location_failed' | 'facial_scanning' | 'complete' | 'failed'>('idle');
  const [statusMessage, setStatusMessage] = useState("");
  const [errorDetail, setErrorDetail] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(areModelsLoaded());
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [viewDate, setViewDate] = useState(new Date());

  const [elapsedTime, setElapsedTime] = useState<string>("");
  const [geoPermission, setGeoPermission] = useState<PermissionState | 'unknown'>('unknown');
  const [cameraPermission, setCameraPermission] = useState<PermissionState | 'unknown'>('unknown');
  const [showPermissionsHelp, setShowPermissionsHelp] = useState(false);

  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' })
        .then(result => {
          setGeoPermission(result.state);
          result.onchange = () => setGeoPermission(result.state);
        }).catch(err => console.warn("Geo permission query not supported", err));

      navigator.permissions.query({ name: 'camera' as any })
        .then(result => {
          setCameraPermission(result.state);
          result.onchange = () => setCameraPermission(result.state);
        }).catch(err => console.warn("Camera permission query not supported", err));
    }
  }, []);

  useEffect(() => {
    let intervalId: any;
    if (isClockedIn && logs[0]?.clockIn) {
      const updateElapsed = () => {
        const diff = Date.now() - new Date(logs[0].clockIn).getTime();
        if (diff > 0) {
          const secs = Math.floor(diff / 1000) % 60;
          const mins = Math.floor(diff / 60000) % 60;
          const hrs = Math.floor(diff / 3600000);
          setElapsedTime(
            `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
          );
        } else {
          setElapsedTime("00:00:00");
        }
      };
      updateElapsed();
      intervalId = setInterval(updateElapsed, 1000);
    } else {
      setElapsedTime("");
    }
    return () => clearInterval(intervalId);
  }, [isClockedIn, logs]);


  const loadData = async () => {
    if (!user) return;
    try {
      const [today, all] = await Promise.all([
        fetchTodayLogs(user.id),
        fetchAllLogs()
      ]);
      setLogs(today);
      const myLogs = all.filter((l: any) => l.employeeId === user.id);
      setAllLogs(myLogs);
      setIsClockedIn(today.length > 0 && !today[0].clockOut && today[0].status !== 'ABSENT');
    } catch (err) {
      console.error("Data load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!modelsLoaded) {
      loadFaceApiModels()
        .then(() => setModelsLoaded(true))
        .catch(err => console.error("AI load error:", err));
    }
  }, [modelsLoaded]);

  useEffect(() => {
    loadData();
    return () => stopCamera();
  }, [user]);

  const captureFrame = () => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.6);
  };

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 400, facingMode: 'user' } });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      return true;
    } catch (err) {
      console.error("Camera access failed", err);
      return false;
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const handleAction = async (type: 'IN' | 'OUT') => {
    if (!user || isProcessing) return;
    setIsProcessing(true);
    setActiveAction(type);
    setStep('checking_location');
    setStatusMessage("Acquiring GPS coordinates...");
    setErrorDetail("");

    let currentCoords: {lat: number, lng: number} | null = null;
    
    // Get geolocation
    if (navigator.geolocation) {
      playSound('location'); // Play location checking sound cue
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            enableHighAccuracy: false, 
            timeout: 15000, 
            maximumAge: 60000 
          });
        });
        currentCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(currentCoords);
      } catch (e: any) {
        playSound('error'); // Location acquisition failure beep
        console.error("Geolocation error", e);
        let errorMsg = "Unable to acquire your GPS location.";
        if (e.code === 1) {
          errorMsg = "Location permission denied. Please allow location access in your browser settings.";
        } else if (e.code === 2) {
          errorMsg = "Location unavailable. Please make sure your device's location/GPS settings are turned on.";
        } else if (e.code === 3) {
          errorMsg = "Location request timed out. Please check your network connection and try again.";
        }
        setStep('location_failed');
        setErrorDetail(errorMsg);
        setIsProcessing(false);
        return;
      }
    } else {
      playSound('error'); // Location unsupported beep
      setStep('location_failed');
      setErrorDetail("Your browser does not support geolocation.");
      setIsProcessing(false);
      return;
    }

    // Check boundaries
    try {
      setStatusMessage("Checking operational boundaries...");
      const emp = await fetchEmployeeById(user.id);
      
      if (!emp || !emp.site) {
        playSound('error'); // Boundary checking config error beep
        setStep('location_failed');
        setErrorDetail("No operational site assigned to your profile. Please contact admin.");
        setIsProcessing(false);
        return;
      }

      const distance = getDistance(
        currentCoords.lat, 
        currentCoords.lng, 
        emp.site.latitude || 0, 
        emp.site.longitude || 0
      );
      const radius = emp.site.geofenceRadius || 500;

      if (distance > radius && user.role === 'EMPLOYEE' && type === 'IN') {
        playSound('error'); // Geofence mismatch warning beep
        await createSecurityAlert({
          type: 'GEOFENCE_VIOLATION',
          message: `${user.firstName} tried to clock in from ${Math.round(distance)}m away from ${emp.site.name}.`,
          severity: 'MEDIUM',
          employeeId: user.id,
          siteId: emp.siteId
        });
        
        setStep('location_failed');
        setErrorDetail(`Out of bounds. You are ${Math.round(distance)}m away from site "${emp.site.name}". Allowed radius is ${radius}m.`);
        setIsProcessing(false);
        return;
      }

      playSound('success'); // Location boundaries check success beep
      setStep('location_success');
      setStatusMessage(`Within boundary of "${emp.site.name}"!`);

      setTimeout(() => {
        setStep('facial_scanning');
        setStatusMessage("Initializing camera for biometric verification...");
        triggerBiometricVerification(type, currentCoords);
      }, 1500);

    } catch (err: any) {
      playSound('error'); // Operational boundary error beep
      console.error("Verification error", err);
      setStep('location_failed');
      setErrorDetail(err.message || "Failed to verify location with operational server.");
      setIsProcessing(false);
    }
  };



  const triggerBiometricVerification = async (type: 'IN' | 'OUT', currentCoords: {lat: number, lng: number} | null) => {
    if (!user) return;
    try {
      const cameraStarted = await startCamera();
      if (!cameraStarted) {
        playSound('biometric_fail'); // Camera failed to start beep
        setStep('failed');
        setErrorDetail("Could not access camera. Please check webcam permissions.");
        setIsProcessing(false);
        return;
      }

      playSound('facial'); // Play facial scanning sound cue
      // Allow stabilization, then capture and process face
      setTimeout(async () => {
        try {
          const biometricProof = captureFrame();
          if (!biometricProof) {
            throw new Error("Failed to capture image frame.");
          }

          setStatusMessage("Analyzing face biometrics...");
          let isMatch = true;

          if (modelsLoaded && user?.avatar) {
            isMatch = false; // Must match successfully if avatar exists
            try {
              const avatarUrl = user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}`;
              const referenceImg = await faceapi.fetchImage(avatarUrl);
              const capturedImg = await faceapi.fetchImage(biometricProof);

              const refDetection = await faceapi.detectSingleFace(referenceImg).withFaceLandmarks().withFaceDescriptor();
              const capDetection = await faceapi.detectSingleFace(capturedImg).withFaceLandmarks().withFaceDescriptor();

              if (refDetection?.descriptor && capDetection?.descriptor) {
                const distance = faceapi.euclideanDistance(refDetection.descriptor, capDetection.descriptor);
                isMatch = distance < 0.6;
              } else {
                throw new Error("Face not clearly detected. Ensure your face is centered and well-lit.");
              }
            } catch (err: any) {
              console.error("Biometric matching error:", err);
              throw new Error(err.message || "Face verification failed.");
            }
          }

          if (!isMatch) {
            playSound('biometric_fail'); // Play biometric fail warning tone
            await createSecurityAlert({
              type: 'BIOMETRIC_MISMATCH',
              message: `Unauthorized attempt: Biometric mismatch for ${user.firstName} ${user.lastName}.`,
              severity: 'HIGH',
              employeeId: user.id,
              siteId: user.siteId
            });
            stopCamera();
            setStep('failed');
            setErrorDetail("Identity verification failed. Facial biometrics do not match profile.");
            setIsProcessing(false);
            return;
          }

          playSound('biometric_success'); // Play biometric match success beep

          setStatusMessage("Logging attendance details...");
          const formData = new FormData();
          formData.append('fullName', `${user.firstName} ${user.lastName}`);
          formData.append('latitude', (currentCoords?.lat || 0).toString());
          formData.append('longitude', (currentCoords?.lng || 0).toString());
          
          if (biometricProof) {
            const proofBlob = base64ToBlob(biometricProof);
            formData.append('biometricProof', proofBlob, `proof-${user.id}-${Date.now()}.jpg`);
          }

          if (type === 'IN') {
            await clockIn(user.id, currentCoords?.lat || 0, currentCoords?.lng || 0, formData);
          } else {
            await clockOut(user.id, currentCoords?.lat || 0, currentCoords?.lng || 0, formData);
          }

          stopCamera();
          playSound('success'); // Play check-in/out final success chime
          setStep('complete');
          setStatusMessage(type === 'IN' ? "Clock In Success!" : "Clock Out Success!");
          setIsProcessing(false);
          
          setTimeout(() => {
            resetVerification();
            loadData();
          }, 2000);

        } catch (err: any) {
          playSound('error'); // Final clock action fail buzzer
          console.error("Attendance API Error:", err);
          stopCamera();
          setStep('failed');
          setErrorDetail(err.message || "Failed to log attendance details.");
          setIsProcessing(false);
        }
      }, 3000);

    } catch (err) {
      playSound('biometric_fail'); // Play biometric scanner failure beep
      console.error("Biometric startup error:", err);
      stopCamera();
      setStep('failed');
      setErrorDetail("Failed to initiate face scanning camera.");
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!isLoading && user && location.state?.autoAction) {
      const action = location.state.autoAction;
      // Clear location state to prevent double execution on reload
      window.history.replaceState({}, document.title);
      
      // Auto trigger the action!
      handleAction(action);
    }
  }, [isLoading, user, location.state]);

  const resetVerification = () => {
    stopCamera();
    setActiveAction(null);
    setStep('idle');
    setStatusMessage("");
    setErrorDetail("");
    setIsProcessing(false);
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const renderMatrixCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const startDay = getFirstDayOfMonth(year, month);
    const cells = [];
    
    ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].forEach(d => cells.push(<div key={d} className="cal-day-header">{d}</div>));
    for (let i = 0; i < startDay; i++) cells.push(<div key={`empty-${i}`} className="cal-dot-box empty"></div>);
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const dayLogs = allLogs.filter(l => {
        const dObj = new Date(l.date);
        const lStr = `${dObj.getFullYear()}-${(dObj.getMonth() + 1).toString().padStart(2, '0')}-${dObj.getDate().toString().padStart(2, '0')}`;
        return lStr === dateStr;
      });
      let status: 'approved' | 'pending' | 'absent' | null = null;
      let hours = 0;
      const dateObj = new Date(year, month, d);
      const isPast = dateObj < new Date(new Date().setHours(0,0,0,0));

      if (dayLogs.length > 0) {
        if (dayLogs.some(l => l.status === 'ABSENT')) {
          status = 'absent';
        } else {
          status = dayLogs.some(l => l.status === 'APPROVED' || l.status === 'PRESENT') ? 'approved' : 'pending';
        }
        hours = dayLogs.reduce((acc, l) => l.clockIn && l.clockOut ? acc + (new Date(l.clockOut).getTime() - new Date(l.clockIn).getTime()) / 3600000 : acc, 0);
      } else if (isPast && dateObj.getDay() !== 0) status = 'absent';
      
      cells.push(
        <motion.div key={d} className={`cal-dot-box ${status || ''} ${new Date().toDateString() === dateObj.toDateString() ? 'today' : ''}`} whileHover={{ scale: 1.05 }}>
          <span className="dot-date">{d}</span>
          {status === 'absent' ? (
            <span className="dot-absent" style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.8rem' }}>Absent</span>
          ) : (
            hours > 0 && <span className="dot-hours">{hours.toFixed(1)}h</span>
          )}
        </motion.div>
      );
    }
    return cells;
  };


  const now = new Date();
  const currentHour = now.getHours();
  
  // User cannot check in after 5:00 PM (17:00)
  const isCheckInDisabled = isClockedIn || currentHour >= 17;
  
  // User cannot clock out after 22:59, OR if it is >= 5 PM and they clocked in >= 5 PM
  const clockInDate = isClockedIn && logs[0]?.clockIn ? new Date(logs[0].clockIn) : null;
  const isCheckOutDisabled = !isClockedIn || currentHour >= 23 || (currentHour >= 17 && clockInDate !== null && clockInDate.getHours() >= 17);

  if (isLoading) return <div className="dashboard-loading"><div className="loading-spinner-watt"></div><span>{t('processing')}</span></div>;

  return (
    <div className="employee-att-container">
      {/* Vertical Profile Header */}
      <div className="vertical-profile-header">
        <div className="vp-avatar-container">
          <img 
            className="vp-avatar"
            src={
              user?.avatar 
                ? (user.avatar.startsWith('http') || user.avatar.startsWith('data:') 
                    ? user.avatar 
                    : `${API_URL}${user.avatar.startsWith('/') ? user.avatar : `/${user.avatar}`}`) 
                : "https://api.dicebear.com/7.x/avataaars/svg?seed=Staff"
            } 
            alt="Avatar" 
          />
          <div className="vp-role-badge">
            {user?.role === 'MANAGER' ? 'MANAGER' : 'EMPLOYEE'}
          </div>
        </div>

        <h1 className="vp-name">{user?.firstName} {user?.lastName}</h1>
        <p className="vp-designation">{user?.designation || (user?.role === 'MANAGER' ? 'System Administrator' : 'Staff Member')}</p>

        <div className="vp-security-badge">
          <svg className="vp-shield-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          BIOMETRIC SECURED
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="att-dashboard-grid">
        
        {/* Left Column: Actions & Analytics */}
        <div className="att-left-column">
          {/* Clock In/Out Actions */}
          <div className="attendance-card-premium">
            <div className="action-header">
              <h2 className="card-title">{t('attendance').toUpperCase()}</h2>
              {isClockedIn && elapsedTime && (
                <div className="elapsed-timer-badge">
                  <Timer size={14} className="timer-icon-spin" />
                  <span>{t('workingHours').toUpperCase()}: {elapsedTime}</span>
                </div>
              )}
            </div>

            {(geoPermission === 'denied' || cameraPermission === 'denied') && (
              <div className="permissions-alert-banner">
                <span className="alert-icon">⚠️</span>
                <div className="alert-text">
                  <strong>{t('accessRestricted')}</strong>
                  <p>
                    {geoPermission === 'denied' && cameraPermission === 'denied'
                      ? 'GPS location & Camera access are blocked. '
                      : geoPermission === 'denied'
                      ? 'GPS location access is blocked. '
                      : 'Camera access is blocked. '}
                    Please enable permissions in your browser settings to allow clocking.
                  </p>
                  <button className="btn-alert-help" onClick={() => setShowPermissionsHelp(true)}>
                    How to enable permissions?
                  </button>
                </div>
              </div>
            )}
            
            {step === 'idle' ? (
              <>
                {logs.length > 0 && logs[0].status === 'ABSENT' ? (
                  <div className="attendance-submitted-banner" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    background: 'rgba(239, 68, 68, 0.08)',
                    borderRadius: '16px',
                    border: '1px dashed rgba(239, 68, 68, 0.3)',
                    margin: '1rem 0'
                  }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem'
                    }}>
                      <UserCheck size={32} />
                    </div>
                    <h3 style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#ef4444',
                      margin: '0 0 0.5rem 0'
                    }}>
                      {i18n.language === 'vi' ? 'Vắng Mặt' : 'Absent'}
                    </h3>
                    <p style={{
                      fontSize: '0.9rem',
                      color: 'var(--text-secondary)',
                      margin: 0,
                      maxWidth: '300px',
                      lineHeight: '1.4'
                    }}>
                      {i18n.language === 'vi' 
                        ? 'Bạn đã được đánh dấu là vắng mặt cho ngày hôm nay.' 
                        : 'You have been marked as absent for today.'}
                    </p>
                  </div>
                ) : logs.length >= 2 && !isClockedIn ? (
                  <div className="attendance-submitted-banner" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    background: 'rgba(16, 185, 129, 0.08)',
                    borderRadius: '16px',
                    border: '1px dashed rgba(16, 185, 129, 0.3)',
                    margin: '1rem 0'
                  }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10B981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem'
                    }}>
                      <UserCheck size={32} />
                    </div>
                    <h3 style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#10B981',
                      margin: '0 0 0.5rem 0'
                    }}>
                      {i18n.language === 'vi' ? 'Đã Nộp Chấm Công' : 'Attendance Submitted'}
                    </h3>
                    <p style={{
                      fontSize: '0.9rem',
                      color: 'var(--text-secondary)',
                      margin: 0,
                      maxWidth: '300px',
                      lineHeight: '1.4'
                    }}>
                      {i18n.language === 'vi' 
                        ? 'Bạn đã hoàn thành giới hạn 2 lần chấm công cho ngày hôm nay.' 
                        : 'You have completed your daily limit of 2 attendance submissions for today.'}
                    </p>
                  </div>
                ) : (
                  <div className="action-buttons-group">
                    <motion.button 
                      whileHover={{ scale: 1.02 }} 
                      whileTap={{ scale: 0.98 }} 
                      className={`big-btn in ${isCheckInDisabled ? 'disabled' : ''}`} 
                      onClick={() => !isCheckInDisabled && handleAction('IN')} 
                      disabled={isCheckInDisabled}
                    >
                      <Clock size={28} /> 
                      <span>{t('clockIn').toUpperCase()}</span>
                    </motion.button>
                    
                    <motion.button 
                      whileHover={{ scale: 1.02 }} 
                      whileTap={{ scale: 0.98 }} 
                      className={`big-btn out ${isCheckOutDisabled ? 'disabled' : ''}`} 
                      onClick={() => !isCheckOutDisabled && handleAction('OUT')} 
                      disabled={isCheckOutDisabled}
                    >
                      <History size={28} /> 
                      <span>{t('clockOut').toUpperCase()}</span>
                    </motion.button>
                  </div>
                )}

                {isClockedIn && logs[0] && (
                  <div className="shift-info-footer">
                    <div className="footer-item">
                      <Clock size={14} /> 
                      <span>{t('checkin')}: <strong>{new Date(logs[0].clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</strong></span>
                    </div>
                    <div className="footer-item">
                      <MapPin size={14} /> 
                      <span>{t('site')}: <strong>{logs[0].site?.name || user?.site?.name || logs[0].location || 'Main Site'}</strong></span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="inline-verification-stepper">
                <div className="stepper-header">
                  <span className="stepper-title">{t('verification').toUpperCase()}: CLOCK-{activeAction}</span>
                  <button className="stepper-cancel-btn" onClick={resetVerification}>{t('cancel')}</button>
                </div>

                <div className="stepper-progress">
                  <div className={`step-dot ${step !== 'checking_location' && step !== 'location_failed' ? 'active' : 'current'}`}>
                    1
                  </div>
                  <div className="step-line"></div>
                  <div className={`step-dot ${step === 'facial_scanning' || step === 'complete' || (step === 'failed' && errorDetail.toLowerCase().includes('camera')) ? 'current' : ''} ${step === 'complete' ? 'active' : ''}`}>
                    2
                  </div>
                </div>

                <div className="stepper-content">
                  {step === 'checking_location' && (
                    <div className="step-body location-checking-flow">
                      <div className="radar-animation">
                        <div className="radar-circle"></div>
                        <MapPin size={24} className="radar-pin" />
                      </div>
                      <p className="step-status">{statusMessage}</p>
                    </div>
                  )}

                  {step === 'location_success' && (
                    <div className="step-body success-flow animate-fade-in">
                      <div className="pulse-success-ring">
                        <UserCheck size={24} />
                      </div>
                      <p className="step-status success-txt">{statusMessage}</p>
                    </div>
                  )}

                  {step === 'location_failed' && (
                    <div className="step-body error-flow animate-fade-in">
                      <div className="error-triangle-icon">⚠️</div>
                      <p className="step-status error-txt">Location Check Failed</p>
                      <p className="step-detail">{errorDetail}</p>
                      <div className="stepper-actions">
                        <button className="btn-stepper-retry" onClick={() => handleAction(activeAction!)}>Retry GPS Check</button>
                        <button className="btn-stepper-cancel" onClick={resetVerification}>{t('cancel')}</button>
                      </div>
                    </div>
                  )}

                  {step === 'facial_scanning' && (
                    <div className="step-body camera-inline-flow">
                      <div className="camera-inline-frame">
                        <video ref={videoRef} autoPlay playsInline muted />
                        <div className="camera-laser-scanner"></div>
                      </div>
                      <p className="step-status">{statusMessage}</p>
                    </div>
                  )}

                  {step === 'complete' && (
                    <div className="step-body success-flow animate-fade-in">
                      <div className="pulse-success-ring">
                        <UserCheck size={24} />
                      </div>
                      <p className="step-status success-txt">{statusMessage}</p>
                    </div>
                  )}

                  {step === 'failed' && (
                    <div className="step-body error-flow animate-fade-in">
                      <div className="error-triangle-icon">❌</div>
                      <p className="step-status error-txt">Verification Failed</p>
                      <p className="step-detail">{errorDetail}</p>
                      <div className="stepper-actions">
                        <button className="btn-stepper-retry" onClick={() => {
                          setStep('facial_scanning');
                          setStatusMessage("Initializing biometric camera...");
                          triggerBiometricVerification(activeAction!, coords);
                        }}>Retry Scan</button>
                        <button className="btn-stepper-cancel" onClick={resetVerification}>{t('cancel')}</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Left Column content is just the Attendance Hub card now */}
        </div>

        {/* Right Column: Calendar History */}
        <div className="calendar-main-card">
          <div className="cal-header-flex">
            <div className="cal-label">
              <CalIcon size={18} /> 
              <span>{viewDate.toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'default', { month: 'long', year: 'numeric' }).toUpperCase()}</span>
            </div>
            <div className="cal-nav-btns">
              <button onClick={() => changeMonth(-1)}><ChevronLeft size={16} /></button>
              <button onClick={() => changeMonth(1)}><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="calendar-matrix-grid">
            {renderMatrixCalendar()}
          </div>
        </div>

      </div>

      <AnimatePresence>
        {showPermissionsHelp && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="permissions-help-backdrop"
            onClick={() => setShowPermissionsHelp(false)}
          >
            <motion.div 
              initial={{ scale: 0.95 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.95 }} 
              className="permissions-help-modal"
              onClick={e => e.stopPropagation()}
            >
              <div className="help-modal-header">
                <h3>Enable Site Permissions</h3>
                <button className="close-help-btn" onClick={() => setShowPermissionsHelp(false)}>×</button>
              </div>

              <div className="help-modal-body">
                <p className="help-intro-text">
                  To complete clocking, this app requires access to your <strong>GPS Location</strong> (to verify your operational site) and <strong>Web Camera</strong> (for facial matching).
                </p>

                <div className="help-guide-steps">
                  <div className="guide-step-row">
                    <span className="step-num">1</span>
                    <div className="step-text">
                      <strong>Check Address Bar Settings:</strong>
                      <p>Click the <strong>Settings/Lock icon</strong> (🔒 or 🎛️) on the left side of your browser URL bar at the top of the screen.</p>
                    </div>
                  </div>

                  <div className="guide-step-row">
                    <span className="step-num">2</span>
                    <div className="step-text">
                      <strong>Toggle Permissions:</strong>
                      <p>Look for <strong>Location</strong> and <strong>Camera</strong> in the dropdown menu, and switch their settings to <strong>"Allow"</strong>.</p>
                    </div>
                  </div>

                  <div className="guide-step-row">
                    <span className="step-num">3</span>
                    <div className="step-text">
                      <strong>Reload & Try Again:</strong>
                      <p>Refresh the page, and try clocking in/out again. If the issue persists, clear your browser settings for this site.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="help-modal-footer">
                <button className="btn-modal-reload" onClick={() => {
                  setShowPermissionsHelp(false);
                  window.location.reload();
                }}>
                  Reload Page
                </button>
                <button className="btn-modal-close" onClick={() => setShowPermissionsHelp(false)}>
                  Close Guide
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeeAttendance;
