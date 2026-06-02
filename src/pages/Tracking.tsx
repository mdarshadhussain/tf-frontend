import { 
  Search,
  MapPin,
  Clock,
  User,
  X
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchLiveTracking, fetchAllLogs } from '../api/api';
import './Tracking.css';

// Fix for Leaflet marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons
const siteIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const empIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const selectedEmpIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [30, 46],
  iconAnchor: [15, 46],
  popupAnchor: [1, -38],
  shadowSize: [46, 46]
});

// Helper component to recenter map
const RecenterMap = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const Tracking = () => {
  const [data, setData] = useState<{sites: any[], activeEmployees: any[]}>({ sites: [], activeEmployees: [] });
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([21.0285, 105.8542]); // Fallback Hanoi
  const [zoomLevel, setZoomLevel] = useState(13);
  const { t } = useTranslation();

  const loadTrackingData = async () => {
    try {
      const [trackingRes, logsRes] = await Promise.all([
        fetchLiveTracking(),
        fetchAllLogs()
      ]);
      
      setData({
        sites: trackingRes.sites || [],
        activeEmployees: trackingRes.activeEmployees || []
      });

      // Filter and sort logs to have unique/recent records per employee
      if (Array.isArray(logsRes)) {
        // Sort by clockIn desc
        const sorted = [...logsRes].sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());
        // Keep only the most recent log for each unique employee
        const uniqueEmployees = new Set();
        const deduplicated = sorted.filter(log => {
          if (!log.employeeId) return false;
          if (uniqueEmployees.has(log.employeeId)) {
            return false;
          }
          uniqueEmployees.add(log.employeeId);
          return true;
        });
        setAllLogs(deduplicated);
      }
    } catch (err) {
      console.error("Failed to load tracking details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrackingData();
    const interval = setInterval(loadTrackingData, 15000); // 15s auto-sync for live tracking
    return () => clearInterval(interval);
  }, []);

  // Update map center to selected employee or first site
  useEffect(() => {
    if (selectedLog) {
      // Find latest coordinates
      const lat = selectedLog.clockOut 
        ? (selectedLog.clockOutLat || selectedLog.clockInLat) 
        : (selectedLog.latitude || selectedLog.clockInLat);
      const lng = selectedLog.clockOut 
        ? (selectedLog.clockOutLong || selectedLog.clockInLong) 
        : (selectedLog.longitude || selectedLog.clockInLong);

      if (lat && lng) {
        setMapCenter([lat, lng]);
        setZoomLevel(15);
      }
    } else if (data.sites && data.sites.length > 0) {
      setMapCenter([data.sites[0].latitude || 21.0285, data.sites[0].longitude || 105.8542]);
    }
  }, [selectedLog, data.sites]);

  // Filter logs based on search query (name or designation)
  const filteredLogs = allLogs.filter(log => {
    const query = searchQuery.toLowerCase();
    const emp = log.employee || {};
    const empName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
    const designation = (emp.designation || '').toLowerCase();
    const siteName = (log.site?.name || '').toLowerCase();
    return empName.includes(query) || designation.includes(query) || siteName.includes(query);
  });

  // Get display site name for coordinates
  const getSiteNameForCoords = (lat: number, lng: number) => {
    if (!lat || !lng) return t('onField');
    // Find closest site
    let closestSite = t('onField');
    let minDistance = Infinity;
    data.sites.forEach(site => {
      const dist = Math.sqrt(Math.pow(site.latitude - lat, 2) + Math.pow(site.longitude - lng, 2));
      if (dist < minDistance && dist < 0.01) { // roughly 1km
        minDistance = dist;
        closestSite = site.name;
      }
    });
    return closestSite;
  };

  return (
    <div className="tracking-page">
      <header className="page-header">
        <div>
          <h1>{t('liveWorkforceTracking')}</h1>
          <p className="subtitle">{t('gpsMonitoringSubtext')}</p>
        </div>
        <div className="live-status">
          <div className="pulse-dot"></div>
          <span>{t('satelliteConnectionActive')}</span>
        </div>
      </header>

      <div className="tracking-layout">
        {/* Left Side: Map */}
        <div className="glass-card map-container">
          {!loading && (
            <MapContainer center={mapCenter} zoom={zoomLevel} style={{ height: '100%', width: '100%', borderRadius: '16px' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <RecenterMap center={mapCenter} zoom={zoomLevel} />
              
              {/* Render Sites */}
              {data.sites.map(site => (
                <div key={site.id}>
                  <Marker position={[site.latitude || 0, site.longitude || 0]} icon={siteIcon}>
                    <Popup>
                      <div className="map-popup">
                        <strong>{t('site')}: {site.name}</strong><br/>
                        {site.location}<br/>
                        {t('radius')}: {site.geofenceRadius || 500}m
                      </div>
                    </Popup>
                  </Marker>
                  <Circle 
                    center={[site.latitude || 0, site.longitude || 0]}
                    radius={site.geofenceRadius || 300}
                    pathOptions={{ color: 'var(--primary)', fillColor: 'var(--primary)', fillOpacity: 0.08 }}
                  />
                </div>
              ))}

              {/* Render Active Employees (Live markers) */}
              {data.activeEmployees.map(log => {
                const isSelected = selectedLog && selectedLog.id === log.id;
                const lat = log.latitude || log.clockInLat || 0;
                const lng = log.longitude || log.clockInLong || 0;

                return (
                  <Marker 
                    key={log.id} 
                    position={[lat, lng]} 
                    icon={isSelected ? selectedEmpIcon : empIcon}
                  >
                    <Popup>
                      <div className="map-popup">
                        <strong>{log.employee?.firstName} {log.employee?.lastName}</strong><br/>
                        {log.employee?.designation || 'Specialist'}<br/>
                        {t('site')}: {log.site?.name || t('onField')}<br/>
                        {t('statusLabel')}: {t('activeStatus')}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Selected Checked Out Employee (if selected) */}
              {selectedLog && selectedLog.clockOut && (
                <Marker 
                  position={[selectedLog.clockOutLat || selectedLog.clockInLat || 0, selectedLog.clockOutLong || selectedLog.clockInLong || 0]} 
                  icon={selectedEmpIcon}
                >
                  <Popup>
                    <div className="map-popup">
                      <strong>{selectedLog.employee?.firstName} {selectedLog.employee?.lastName}</strong><br/>
                      {selectedLog.employee?.designation || 'Specialist'}<br/>
                      {t('statusLabel')}: {t('checkedOutStatus')}
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          )}

          {/* Floating selected employee details card */}
          {selectedLog && (
            <div className="floating-telemetry-card">
              <button className="close-telemetry-btn" onClick={() => setSelectedLog(null)}>
                <X size={16} />
              </button>
              <div className="telemetry-card-header">
                <div className="telemetry-avatar-box">
                  <User size={20} className="telemetry-avatar-icon" />
                </div>
                <div>
                  <h4>{selectedLog.employee?.firstName} {selectedLog.employee?.lastName}</h4>
                  <p>{selectedLog.employee?.designation || 'Specialist'}</p>
                </div>
              </div>

              <div className="telemetry-stats-deck">
                <div className="telemetry-stat">
                  <span className="telemetry-label">{t('statusLabel')}</span>
                  <span className={"telemetry-val-badge " + (selectedLog.clockOut ? "inactive" : "active")}>
                    {selectedLog.clockOut ? t('offline') : t('onlineActive')}
                  </span>
                </div>

                <div className="telemetry-stat">
                  <span className="telemetry-label">{t('checkinDetails')}</span>
                  <div className="telemetry-sub-stats">
                    <span className="t-icon-label"><Clock size={12} /> {new Date(selectedLog.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                    <span className="t-icon-label"><MapPin size={12} /> {getSiteNameForCoords(selectedLog.clockInLat, selectedLog.clockInLong)}</span>
                  </div>
                </div>

                {selectedLog.clockOut && (
                  <div className="telemetry-stat">
                    <span className="telemetry-label">{t('checkoutDetails')}</span>
                    <div className="telemetry-sub-stats">
                      <span className="t-icon-label"><Clock size={12} /> {new Date(selectedLog.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                      <span className="t-icon-label"><MapPin size={12} /> {getSiteNameForCoords(selectedLog.clockOutLat, selectedLog.clockOutLong)}</span>
                    </div>
                  </div>
                )}

                <div className="telemetry-stat">
                  <span className="telemetry-label">{t('coordinates')}</span>
                  <span className="telemetry-val-code">
                    {selectedLog.clockOut 
                      ? `${selectedLog.clockOutLat?.toFixed(6) || '0.0'}, ${selectedLog.clockOutLong?.toFixed(6) || '0.0'}` 
                      : `${selectedLog.latitude?.toFixed(6) || selectedLog.clockInLat?.toFixed(6) || '0.0'}, ${selectedLog.longitude?.toFixed(6) || selectedLog.clockInLong?.toFixed(6) || '0.0'}`
                    }
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Search and List */}
        <div className="tracking-sidebar">
          <div className="glass-card active-list">
            <div className="sidebar-search-block">
              <Search size={16} className="sidebar-search-icon" />
              <input 
                type="text" 
                placeholder={t('searchEmployeeOrDesignation')} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="sidebar-search-input"
              />
              {searchQuery && (
                <button className="sidebar-search-clear" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="list-header" style={{ marginTop: '16px' }}>
              <h3>{t('activeEmployees')}</h3>
              <span className="badge badge-active">{filteredLogs.length} {t('records')}</span>
            </div>

            <div className="employees-scroll">
              {filteredLogs.map((log) => {
                const isActive = !log.clockOut;
                const isSelected = selectedLog && selectedLog.id === log.id;
                
                return (
                  <div 
                    key={log.id} 
                    className={"tracking-item " + (isSelected ? "selected" : "")}
                    onClick={() => setSelectedLog(log)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="tracking-item-header">
                      <div className={"user-dot " + (isActive ? "active" : "inactive")}></div>
                      <span className="user-name">{log.employee?.firstName} {log.employee?.lastName}</span>
                      <span className="user-site">{log.site?.name || t('onField')}</span>
                    </div>
                    <div className="tracking-item-details">
                      <span>{log.employee?.designation || 'Specialist'}</span>
                      <span className="time-badge">
                        {isActive ? `${t('inPrefix')}: ` : `${t('outPrefix')}: `}
                        {isActive 
                          ? new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                          : new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                        }
                      </span>
                    </div>
                  </div>
                );
              })}
              {filteredLogs.length === 0 && (
                <p className="no-data">{t('noActiveEmployees')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tracking;
