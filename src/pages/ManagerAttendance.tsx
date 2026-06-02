import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Search, 
  Clock, 
  UserCheck,
  Shield,
  X,
  Loader2,
  MapPin
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as faceapi from 'face-api.js';
import { loadFaceApiModels, areModelsLoaded } from '../utils/aiModels';
import { fetchEmployees, fetchAllLogs, submitManagerLog, fetchTodayLogs, createSecurityAlert, fetchSites, logManualAttendance } from '../api/api';
import { useAuth } from '../context/AuthContext';
import PremiumSelect from '../components/PremiumSelect';
import './ManagerAttendance.css';

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

const ManagerAttendance: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(user);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(areModelsLoaded());

  // Camera & Face Verification States
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stepper State for Proxy Attendance Log
  const [step, setStep] = useState<'idle' | 'checking_location' | 'location_success' | 'location_failed' | 'facial_scanning' | 'verifying_face' | 'complete' | 'failed'>('idle');
  const [statusMessage, setStatusMessage] = useState("");
  const [errorDetail, setErrorDetail] = useState("");
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);

  // Tab & Manual Attendance States (For Admin)
  const [activeTab, setActiveTab] = useState<'standard' | 'manual'>('standard');
  const [manualCheckIn, setManualCheckIn] = useState<string>('');
  const [manualCheckOut, setManualCheckOut] = useState<string>('');
  const [manualCheckInPic, setManualCheckInPic] = useState<string>('');
  const [manualCheckOutPic, setManualCheckOutPic] = useState<string>('');

  useEffect(() => {
    if (user && !selectedEmployee) {
      setSelectedEmployee(user);
    }
  }, [user, selectedEmployee]);

  // Personal Status State
  const [myTodayLogs, setMyTodayLogs] = useState<any[]>([]);
  const isMyClockedIn = myTodayLogs.length > 0 && !myTodayLogs[0].clockOut;
  const [personalStats, setPersonalStats] = useState({
    totalHours: 0,
    todayHours: '0h 0m',
  });
  const [myElapsedTime, setMyElapsedTime] = useState<string>("");

  useEffect(() => {
    let intervalId: any;
    if (isMyClockedIn && myTodayLogs[0]?.clockIn) {
      const updateElapsed = () => {
        const diff = Date.now() - new Date(myTodayLogs[0].clockIn).getTime();
        if (diff > 0) {
          const mins = Math.floor(diff / 60000) % 60;
          const hrs = Math.floor(diff / 3600000);
          setMyElapsedTime(`${hrs}h ${mins}m`);
        } else {
          setMyElapsedTime("0h 0m");
        }
      };
      updateElapsed();
      intervalId = setInterval(updateElapsed, 60000);
    } else {
      setMyElapsedTime("");
    }
    return () => clearInterval(intervalId);
  }, [isMyClockedIn, myTodayLogs]);

  useEffect(() => {
    loadData();
  }, []);

  // Load AI Models
  useEffect(() => {
    if (!modelsLoaded) {
      loadFaceApiModels()
        .then(() => setModelsLoaded(true))
        .catch(err => {
          console.error("AI load error:", err);
        });
    }
  }, [modelsLoaded]);

  // Start/Stop Camera on Employee Selection
  useEffect(() => {
    stopCamera();
    setStep('idle');
    setStatusMessage("");
    setErrorDetail("");
    setCoords(null);
    setActiveTab('standard');

    const now = new Date();
    const tzoffset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
    setManualCheckIn(localISOTime);
    setManualCheckOut('');
    setManualCheckInPic('');
    setManualCheckOutPic('');

    return () => stopCamera();
  }, [selectedEmployee]);

  // Pre-fill manual attendance fields with existing logs of today if available
  useEffect(() => {
    if (selectedEmployee && attendance.length > 0) {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      const todayLogs = attendance.filter(log => {
        const dateObj = new Date(log.date || log.clockIn);
        const logDateStr = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
        return log.employeeId === selectedEmployee.id && logDateStr === todayStr;
      });

      if (todayLogs.length > 0) {
        const sorted = [...todayLogs].sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime());
        const existingLog = sorted[0];

        if (existingLog.clockIn) {
          const checkInDate = new Date(existingLog.clockIn);
          const tzoffset = checkInDate.getTimezoneOffset() * 60000;
          const checkInLocalTime = (new Date(checkInDate.getTime() - tzoffset)).toISOString().slice(0, 16);
          setManualCheckIn(checkInLocalTime);
        }

        if (existingLog.biometricProof && existingLog.biometricProof !== 'MANAGER_LOG' && existingLog.biometricProof !== 'MANUAL') {
          const fullImgUrl = existingLog.biometricProof.startsWith('http') 
            ? existingLog.biometricProof 
            : `${API_URL}${existingLog.biometricProof}`;
          setManualCheckInPic(fullImgUrl);
        }

        if (existingLog.clockOut) {
          const checkOutDate = new Date(existingLog.clockOut);
          const tzoffset = checkOutDate.getTimezoneOffset() * 60000;
          const checkOutLocalTime = (new Date(checkOutDate.getTime() - tzoffset)).toISOString().slice(0, 16);
          setManualCheckOut(checkOutLocalTime);
        }

        if (existingLog.biometricProofOut) {
          const fullImgUrl = existingLog.biometricProofOut.startsWith('http') 
            ? existingLog.biometricProofOut 
            : `${API_URL}${existingLog.biometricProofOut}`;
          setManualCheckOutPic(fullImgUrl);
        }
      }
    }
  }, [selectedEmployee, attendance]);


  const startCamera = async (mode: 'user' | 'environment') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
    } catch (err) {
      console.error("Camera access failed:", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleFlipCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    if (selectedEmployee) {
      startCamera(nextMode);
    }
  };

  const captureFrame = () => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.6);
  };

  const handleStartVerification = async () => {
    if (!selectedEmployee || submitting) return;

    // Time restriction: prevent clock-in after 5 PM
    const isClockingIn = !getActiveSession(selectedEmployee.id);
    if (isClockingIn) {
      const currentHour = new Date().getHours();
      if (currentHour >= 17) {
        setStep('location_failed'); // Reuse error UI
        setStatusMessage("Time Restriction");
        setErrorDetail("Clock-in is not allowed after 5:00 PM.");
        return;
      }
    }

    setStep('checking_location');
    setStatusMessage(t('acquiringGps'));
    setErrorDetail("");

    let currentCoords: {lat: number, lng: number} | null = null;
    
    if (navigator.geolocation) {
      playSound('location'); // Location query start beep
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
        playSound('error'); // Location query fail buzzer
        console.error("Geolocation error", e);
        let errorMsg = t('unableAcquireGps');
        if (e.code === 1) {
          errorMsg = t('locationPermissionDenied');
        } else if (e.code === 2) {
          errorMsg = t('locationUnavailable');
        } else if (e.code === 3) {
          errorMsg = t('locationTimeout');
        }
        setStep('location_failed');
        setErrorDetail(errorMsg);
        return;
      }
    } else {
      playSound('error'); // Geolocation unsupported error beep
      setStep('location_failed');
      setErrorDetail(t('browserNoGeolocation'));
      return;
    }

    try {
      setStatusMessage(t('checkingBoundaries'));
      
      const employeeSite = sites.find(s => s.id === selectedEmployee.siteId);
      
      if (!employeeSite) {
        playSound('error'); // Missing site boundary configuration beep
        setStep('location_failed');
        setErrorDetail(t('noSiteAssignedProfile'));
        return;
      }

      const distance = getDistance(
        currentCoords.lat, 
        currentCoords.lng, 
        employeeSite.latitude || 0, 
        employeeSite.longitude || 0
      );
      const radius = employeeSite.geofenceRadius || 500;

      if (distance > radius && user?.role === 'MANAGER') {
        playSound('error'); // Boundary violation alert buzzer
        await createSecurityAlert({
          type: 'GEOFENCE_VIOLATION',
          message: `Proxy Log Warning: Manager logged ${selectedEmployee.firstName} from ${Math.round(distance)}m away from ${employeeSite.name}.`,
          severity: 'MEDIUM',
          employeeId: selectedEmployee.id,
          siteId: selectedEmployee.siteId
        });
        
        setStep('location_failed');
        setErrorDetail(t('outOfBounds', { distance: Math.round(distance), siteName: employeeSite.name, radius }));
        return;
      }

      playSound('success'); // Boundaries check success chime
      setStep('location_success');
      setStatusMessage(t('withinBoundary', { siteName: employeeSite.name }));

      setTimeout(() => {
        playSound('facial'); // Initialize camera for face scan beep
        setStep('facial_scanning');
        setStatusMessage(t('initializingBiometricCamera'));
        startCamera(facingMode);
      }, 1500);

    } catch (err: any) {
      playSound('error'); // Operational configuration error buzzer
      console.error("Verification error", err);
      setStep('location_failed');
      setErrorDetail(err.message || t('actionFailed'));
    }
  };



  const resetVerification = () => {
    stopCamera();
    setStep('idle');
    setStatusMessage("");
    setErrorDetail("");
    setCoords(null);
  };

  const handleCaptureAndVerify = async () => {
    if (!selectedEmployee) return;

    const capturedFrame = captureFrame();
    if (!capturedFrame) {
      alert("Failed to capture photo from video feed.");
      return;
    }

    stopCamera();
    setStep('verifying_face');
    setStatusMessage(t('analyzingFace'));
    setSubmitting(true);

    try {
      const proofBlob = base64ToBlob(capturedFrame);

      playSound('facial'); // Start analyzing face beep
      // Verify selected employee
      let isMatch = true; // Default to true if employee does not have an avatar to compare
      if (selectedEmployee.avatar && modelsLoaded) {
        try {
          const avatarUrl = selectedEmployee.avatar.startsWith('http') ? selectedEmployee.avatar : `${API_URL}${selectedEmployee.avatar}`;
          const referenceImg = await faceapi.fetchImage(avatarUrl);
          const capturedImg = await faceapi.fetchImage(capturedFrame);

          const refDetection = await faceapi.detectSingleFace(referenceImg).withFaceLandmarks().withFaceDescriptor();
          const capDetection = await faceapi.detectSingleFace(capturedImg).withFaceLandmarks().withFaceDescriptor();

          if (refDetection?.descriptor && capDetection?.descriptor) {
            const distance = faceapi.euclideanDistance(refDetection.descriptor, capDetection.descriptor);
            isMatch = distance < 0.6;
          } else {
            throw new Error("Could not detect face in reference or captured image.");
          }
        } catch (err: any) {
          console.error("AI Face Verification error:", err);
          throw new Error(t('faceDetectionFailed', { message: err.message || "Face not detected" }));
        }
      }

      if (!isMatch) {
        playSound('biometric_fail'); // Biometric mismatch alert tone
        // Log biometric mismatch to security alerts
        await createSecurityAlert({
          type: 'BIOMETRIC_MISMATCH',
          message: `Proxy Log Failed: Biometric mismatch for ${selectedEmployee.firstName} ${selectedEmployee.lastName}.`,
          severity: 'HIGH',
          employeeId: selectedEmployee.id,
          siteId: selectedEmployee.siteId
        });
        throw new Error(t('biometricMismatchError'));
      }

      playSound('biometric_success'); // Face match success beep

      // Submit attendance
      const type = getActiveSession(selectedEmployee.id) ? 'CLOCK_OUT' : 'CLOCK_IN';
      const formData = new FormData();
      formData.append('employeeId', selectedEmployee.id);
      formData.append('type', type);
      if (coords?.lat) formData.append('latitude', coords.lat.toString());
      if (coords?.lng) formData.append('longitude', coords.lng.toString());
      if (proofBlob) {
        formData.append('biometricProof', proofBlob, `manager-verification-${selectedEmployee.id}-${Date.now()}.jpg`);
      }

      await submitManagerLog(formData);
      
      playSound('success'); // Clock action success chime
      setStep('complete');
      setStatusMessage(type === 'CLOCK_IN' ? t('clockInSuccess') : t('clockOutSuccess'));
      
      // Reset state and reload
      setTimeout(async () => {
        setSelectedEmployee(null);
        await loadData();
      }, 2000);
    } catch (err: any) {
      playSound('error'); // Operation failure warning beep
      setStep('failed');
      setErrorDetail(err.message || t('actionFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualFileChange = (e: React.ChangeEvent<HTMLInputElement>, setPic: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPic(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPic('');
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || submitting) return;
    
    if (!manualCheckIn) {
      alert("Check-in time is required.");
      return;
    }

    setSubmitting(true);
    setStep('verifying_face');
    setStatusMessage("Logging manual attendance...");

    try {
      const payload = {
        employeeId: selectedEmployee.id,
        siteId: selectedEmployee.siteId || (sites.length > 0 ? sites[0].id : null),
        clockIn: new Date(manualCheckIn).toISOString(),
        clockOut: manualCheckOut ? new Date(manualCheckOut).toISOString() : null,
        date: new Date(manualCheckIn).toISOString().split('T')[0],
        status: 'PRESENT',
        biometricProof: manualCheckInPic || null,
        biometricProofOut: manualCheckOutPic || null
      };

      await logManualAttendance(payload);
      
      setStep('complete');
      setStatusMessage("Manual attendance logged successfully!");
      
      setTimeout(async () => {
        setSelectedEmployee(null);
        await loadData();
      }, 2000);
    } catch (err: any) {
      setStep('failed');
      setErrorDetail(err.message || "Manual log failed");
    } finally {
      setSubmitting(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [empList, attList, sitesList] = await Promise.all([
        fetchEmployees(),
        fetchAllLogs(),
        fetchSites()
      ]);
      
      // Filter for employees in manager's site (if manager)
      const siteId = user?.siteId;
      const isAdmin = user?.role === 'ADMIN';
      const filteredEmps = Array.isArray(empList) 
        ? empList.filter(e => e.role !== 'ADMIN' && e.id !== user?.id && (isAdmin || !siteId || e.siteId === siteId))
        : [];
        
      setEmployees(filteredEmps);
      setSites(Array.isArray(sitesList) ? sitesList : []);
      setAttendance(Array.isArray(attList) ? attList : []);

      // Load personal data
      if (user) {
        const myLogs = await fetchTodayLogs(user.id);
        setMyTodayLogs(myLogs);
        
        // Calculate basic stats for the personal card
        const personalAll = Array.isArray(attList) ? attList.filter(l => l.employeeId === user.id) : [];
        let totalMins = 0;
        personalAll.forEach(log => {
          if (log.clockIn && log.clockOut) {
            const start = new Date(log.clockIn).getTime();
            const end = new Date(log.clockOut).getTime();
            totalMins += (end - start) / (1000 * 60);
          }
        });
        
        setPersonalStats({
          totalHours: totalMins / 60,
          todayHours: myLogs.length > 0 ? `${Math.floor(totalMins / 60)}h ${Math.round(totalMins % 60)}m` : '0h 0m'
        });
      }
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMyClockAction = () => {
    if (!user) return;
    setSelectedEmployee(user);
  };

  const filteredEmployees = employees.filter(emp => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(s) || 
           emp.employeeId?.toLowerCase().includes(s);
    return matchesSearch;
  });

  const getActiveSession = (empId: string) => {
    return attendance.find(a => a.employeeId === empId && !a.clockOut && a.status !== 'ABSENT');
  };

  const selectedEmpLogs = selectedEmployee ? attendance.filter(log => {
    const dateObj = new Date(log.date || log.clockIn);
    const logDateStr = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    return log.employeeId === selectedEmployee.id && logDateStr === todayStr;
  }) : [];

  const activeSessionForSelected = selectedEmployee ? selectedEmpLogs.find(l => !l.clockOut && l.status !== 'ABSENT') : null;
  const isAbsentForSelected = selectedEmployee ? selectedEmpLogs.some(l => l.status === 'ABSENT') : false;

  if (loading) return <div className="manager-att-loader">{t('initializingBiometricCamera')}</div>;

  return (
    <div className="enterprise-page manager-att-page">
      <header className="main-header-row">
        <div className="title-section">
          <div>
            <h1>{t('siteAttendance')}</h1>
            <p>{t('proxyLoggingControl')}</p>
          </div>
        </div>

        <div className="filter-controls">
        </div>
      </header>

      <div className={`manager-att-grid ${selectedEmployee ? 'has-selected' : ''}`}>

        <div className="action-control-card glass-card">
          <div className="selected-header" style={{ width: '100%', padding: '20px 20px 0', marginBottom: 0, boxSizing: 'border-box' }}>
            <UserCheck size={24} color="var(--primary)" />
            <div style={{ flex: 1, zIndex: 50 }}>
              <PremiumSelect 
                value={selectedEmployee?.id || user?.id || ''}
                options={[
                  { label: `My Attendance (${user?.firstName || 'Me'})`, value: user?.id || 'self' },
                  ...employees.map(emp => ({
                    label: `${emp.firstName} ${emp.lastName} ${emp.employeeId ? `- ${emp.employeeId}` : ''}`,
                    value: emp.id
                  }))
                ]}
                onChange={(val) => {
                  if (val === user?.id || val === 'self') {
                    setSelectedEmployee(user);
                  } else {
                    const emp = employees.find(emp => emp.id === val);
                    if (emp) setSelectedEmployee(emp);
                  }
                }}
                placeholder={t('selectPersonnel', 'Select an employee...')}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {selectedEmployee ? (
              <motion.div 
                key={selectedEmployee.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="control-surface"
              >

                {isAdmin && step === 'idle' && (
                  <div className="attendance-tab-switcher">
                    <button 
                      className={`tab-btn ${activeTab === 'standard' ? 'active' : ''}`}
                      onClick={() => setActiveTab('standard')}
                    >
                      Biometric Log
                    </button>
                    <button 
                      className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
                      onClick={() => setActiveTab('manual')}
                    >
                      Manual Entry
                    </button>
                  </div>
                )}

                {step === 'idle' ? (
                  activeTab === 'manual' && isAdmin ? (
                    <form onSubmit={handleManualSubmit} className="manual-attendance-form">
                      {activeSessionForSelected && (
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#10b981', 
                          background: 'rgba(16, 185, 129, 0.08)', 
                          padding: '8px 12px', 
                          borderRadius: '8px', 
                          fontWeight: 700, 
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '8px'
                        }}>
                          Employee is currently clocked in. Only check-out can be logged.
                        </div>
                      )}

                      <div className="form-group-premium">
                        <label>Check-In Time</label>
                        <input 
                          type="datetime-local" 
                          required 
                          value={manualCheckIn} 
                          onChange={(e) => setManualCheckIn(e.target.value)} 
                          className="matrix-input"
                          disabled={!!activeSessionForSelected}
                        />
                      </div>

                      <div className="form-group-premium">
                        <label>Check-In Picture (Optional)</label>
                        <div className={`file-upload-zone ${activeSessionForSelected ? 'disabled' : ''}`}>
                          <input 
                            type="file" 
                            accept="image/*" 
                            id="manual-in-pic-input"
                            onChange={(e) => handleManualFileChange(e, setManualCheckInPic)}
                            className="file-input-hidden"
                            disabled={!!activeSessionForSelected}
                          />
                          <label htmlFor="manual-in-pic-input" className="file-upload-label" style={activeSessionForSelected ? { cursor: 'not-allowed', opacity: 0.7 } : {}}>
                            {manualCheckInPic ? (
                              <img src={manualCheckInPic} alt="Check-in Preview" className="upload-preview" />
                            ) : (
                              <div className="upload-placeholder">
                                <span>Choose or Drop Image</span>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>

                      <div className="form-group-premium">
                        <label>Check-Out Time (Optional)</label>
                        <input 
                          type="datetime-local" 
                          value={manualCheckOut} 
                          onChange={(e) => setManualCheckOut(e.target.value)} 
                          className="matrix-input"
                        />
                      </div>

                      <div className="form-group-premium">
                        <label>Check-Out Picture (Optional)</label>
                        <div className="file-upload-zone">
                          <input 
                            type="file" 
                            accept="image/*" 
                            id="manual-out-pic-input"
                            onChange={(e) => handleManualFileChange(e, setManualCheckOutPic)}
                            className="file-input-hidden"
                          />
                          <label htmlFor="manual-out-pic-input" className="file-upload-label">
                            {manualCheckOutPic ? (
                              <img src={manualCheckOutPic} alt="Check-out Preview" className="upload-preview" />
                            ) : (
                              <div className="upload-placeholder">
                                <span>Choose or Drop Image</span>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        className="btn-start-camera" 
                        disabled={submitting}
                        style={{ width: '100%', height: '52px', fontSize: '15px', marginTop: '16px' }}
                      >
                        {submitting ? "Submitting..." : "Submit Manual Log"}
                      </button>
                    </form>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', gap: '16px' }}>
                      {/* Today's Shift Record Summary */}
                      <div className="selected-employee-status-box" style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '8px', 
                        background: 'var(--highlight)', 
                        padding: '16px', 
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        width: '100%'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                            {t('todaysShiftRecord')}
                          </span>
                          <span className={`status-badge-premium ${activeSessionForSelected ? 'online' : isAbsentForSelected ? 'absent' : 'offline'}`} style={{ 
                            fontSize: '10px', 
                            padding: '2px 8px', 
                            borderRadius: '12px',
                            background: activeSessionForSelected ? 'var(--success-bg)' : isAbsentForSelected ? 'rgba(239, 68, 68, 0.1)' : 'var(--border)',
                            color: activeSessionForSelected ? 'var(--success)' : isAbsentForSelected ? '#EF4444' : 'var(--text-tertiary)',
                            fontWeight: 700
                          }}>
                            {activeSessionForSelected ? t('onDuty') : isAbsentForSelected ? t('absentLabel').toUpperCase() : t('offDuty')}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-tertiary)' }}>{t('clockIn')}</label>
                            <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                              {selectedEmpLogs.length > 0 && selectedEmpLogs[selectedEmpLogs.length - 1].clockIn && selectedEmpLogs[selectedEmpLogs.length - 1].status !== 'ABSENT'
                                ? new Date(selectedEmpLogs[selectedEmpLogs.length - 1].clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : '--:--'}
                            </strong>
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-tertiary)' }}>{t('clockOut')}</label>
                            <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                              {selectedEmpLogs.length > 0 && selectedEmpLogs[0].clockOut && selectedEmpLogs[0].status !== 'ABSENT'
                                ? new Date(selectedEmpLogs[0].clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                                : isAbsentForSelected
                                ? t('absentLabel').toUpperCase()
                                : activeSessionForSelected 
                                ? t('activeSession') 
                                : '--:--'}
                            </strong>
                          </div>
                        </div>
                      </div>
 
                      {/* Today's Clocking Logs History */}
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '8px', 
                        background: 'var(--highlight)', 
                        padding: '16px', 
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        width: '100%',
                        maxHeight: '160px',
                        overflowY: 'auto'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <Clock size={14} color="var(--primary)" />
                          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                            {t('todaysClockingLogs')}
                          </span>
                          <span style={{ 
                            fontSize: '10px', 
                            background: 'rgba(255,255,255,0.04)', 
                            padding: '2px 8px', 
                            borderRadius: '8px', 
                            marginLeft: 'auto', 
                            color: 'var(--text-secondary)', 
                            fontWeight: 700 
                          }}>
                            {t('limitLogs', { count: selectedEmpLogs.length, limit: 2 })}
                          </span>
                        </div>
 
                        {selectedEmpLogs.length === 0 ? (
                          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '12px 0' }}>
                            {t('noLogsToday')}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {selectedEmpLogs.map((log, idx) => (
                              <div key={log.id || idx} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between', 
                                    padding: '8px 12px', 
                                    background: 'rgba(255, 255, 255, 0.02)', 
                                    border: '1px solid var(--border)', 
                                    borderRadius: '8px',
                                    fontSize: '12px'
                                  }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ color: 'var(--text-tertiary)', fontWeight: 700 }}>#{selectedEmpLogs.length - idx}</span>
                                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                    {log.clockIn && log.status !== 'ABSENT' ? new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                                  </span>
                                  <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                                  <span style={{ color: log.clockOut ? 'var(--text-primary)' : log.status === 'ABSENT' ? '#EF4444' : '#10b981', fontWeight: 600 }}>
                                    {log.clockOut && log.status !== 'ABSENT' ? new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : log.status === 'ABSENT' ? t('absentLabel') : t('activeSession')}
                                  </span>
                                </div>
                                {log.verified && (
                                  <span style={{ fontSize: '10px', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>
                                    {t('verified').toUpperCase()}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Workplace details */}
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '8px', 
                        background: 'var(--highlight)', 
                        padding: '16px', 
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        width: '100%'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <MapPin size={14} color="var(--primary)" />
                          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>{t('assignedWorkplace')}</span>
                        </div>
                        <div style={{ marginTop: '2px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {sites.find(s => s.id === selectedEmployee.siteId)?.name || t('noSiteAssigned')}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'flex', gap: '8px' }}>
                            <span>{t('geofenceLabel')}: {sites.find(s => s.id === selectedEmployee.siteId)?.geofenceRadius || 500}m</span>
                            <span>•</span>
                            <span>Lat: {sites.find(s => s.id === selectedEmployee.siteId)?.latitude || '0.00'}, Lng: {sites.find(s => s.id === selectedEmployee.siteId)?.longitude || '0.00'}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ width: '100%', marginTop: 'auto', paddingTop: '10px' }}>
                        <button 
                          className="btn-start-camera" 
                          onClick={handleStartVerification}
                          disabled={submitting}
                          style={{ width: '100%', height: '52px', fontSize: '15px' }}
                        >
                          <MapPin size={18} />
                          <span>{t('verifyLocationStartLog')}</span>
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="inline-verification-stepper">
                    <div className="stepper-header">
                      <span className="stepper-title">{t('verificationClock', { type: activeSessionForSelected ? t('outPrefix').toUpperCase() : t('inPrefix').toUpperCase() })}</span>
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

                    <div className="stepper-content" style={{ minHeight: '260px' }}>
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
                          <p className="step-status error-txt">{t('verificationFailed')}</p>
                          <p className="step-detail">{errorDetail}</p>
                          <div className="stepper-actions">
                            <button className="btn-stepper-retry" onClick={handleStartVerification}>{t('retryGps')}</button>
                            <button className="btn-stepper-cancel" onClick={resetVerification}>{t('cancel')}</button>
                          </div>
                        </div>
                      )}

                      {step === 'facial_scanning' && (
                        <div className="step-body camera-inline-flow">
                          <div className="camera-inline-frame" style={{ width: '150px', height: '150px' }}>
                            <video 
                              ref={videoRef} 
                              autoPlay 
                              playsInline 
                              muted 
                              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                            />
                            <div className="camera-laser-scanner"></div>
                          </div>
                          <p className="step-status" style={{ fontSize: '13px', margin: '4px 0' }}>{statusMessage}</p>
                          <div className="stepper-actions" style={{ gap: '8px' }}>
                            <button className="btn-stepper-retry" onClick={handleCaptureAndVerify} disabled={submitting}>
                              {submitting ? t('verifying') : t('captureAndVerify', 'Capture & Verify')}
                            </button>
                            <button className="btn-stepper-cancel" onClick={handleFlipCamera}>{t('flipCamera', 'Flip Camera')}</button>
                          </div>
                        </div>
                      )}

                      {step === 'verifying_face' && (
                        <div className="step-body success-flow animate-fade-in">
                          <Loader2 size={36} className="spinner" />
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
                          <p className="step-status error-txt">{t('verificationFailed')}</p>
                          <p className="step-detail">{errorDetail}</p>
                          <div className="stepper-actions">
                            <button className="btn-stepper-retry" onClick={() => {
                              setStep('facial_scanning');
                              setStatusMessage(t('initializingBiometricCamera'));
                              startCamera(facingMode);
                            }}>{t('retryScan')}</button>
                            <button className="btn-stepper-cancel" onClick={resetVerification}>{t('cancel')}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="empty-control">
                <div className="pulse-icon">
                  <User size={48} />
                </div>
                <h3>{t('selectPersonnel')}</h3>
                <p>{t('selectPersonnelDesc')}</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="personal-status-card ultra-compact-card">
          <div className="compact-header-row">
            <div className="compact-profile">
              <img 
                src={user?.avatar ? (user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}`) : "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin"} 
                alt="Profile" 
                className="compact-avatar" 
              />
              <div className="compact-info">
                <h3>{user?.firstName || 'Arshad'} {user?.lastName || ''}</h3>
                <span className="compact-role">MANAGER</span>
              </div>
            </div>
          </div>

          {user?.role !== 'ADMIN' ? (
            <div className="compact-stats-row">
              <div className="stat-item">
                <span className="stat-label">{t('clockedIn', 'IN')}</span>
                <strong className="stat-value">
                  {isMyClockedIn && myTodayLogs[0] ? new Date(myTodayLogs[0].clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                </strong>
              </div>
              <div className="stat-item">
                <span className="stat-label">{t('currentShiftTime', 'SHIFT')}</span>
                <strong className="stat-value">
                  {isMyClockedIn ? (myElapsedTime || "0h 0m") : '--:--'}
                </strong>
              </div>
              <div className="stat-item highlight">
                <span className="stat-label">{t('totalHours', 'TOTAL')}</span>
                <strong className="stat-value">{personalStats.totalHours.toFixed(2)}h</strong>
              </div>
            </div>
          ) : (
            <div className="admin-exemption-badge" style={{ padding: '12px', marginTop: 0 }}>
              <strong>{t('dutyExempt')}</strong>
              <span>{t('adminExemptDesc')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerAttendance;
