import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Activity, 
  Shield, 
  Edit2,
  Trash2,
  Users,
  Loader2,
  Navigation,
  Clock
} from 'lucide-react';
import './Sites.css';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { fetchSites, createSite, deleteSite, updateSite } from '../api/api';
import { useAuth } from '../context/AuthContext';
import AddSiteModal from '../components/AddSiteModal';
import Toast from '../components/Toast';
import type { ToastType } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

// Fix for Leaflet marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const siteIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper component to recenter map
const ChangeView = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};


const Sites = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER' || isAdmin;

  const [sites, setSites] = useState<any[]>([]);
  const [searchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<string | null>(null);
  const [editingSite, setEditingSite] = useState<any>(null);
  const [toasts, setToasts] = useState<any[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]);
  const [mapZoom, setMapZoom] = useState(13);

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    loadSites();
    const interval = setInterval(loadSites, 60000); // Refresh every 1m
    return () => clearInterval(interval);
  }, []);

  const loadSites = async () => {
    try {
      const data = await fetchSites();
      let filteredSites = data;
      if (!isManager) {
        filteredSites = data.filter((s: any) => s.id === user?.siteId);
      }

      // Sort: Managed site first
      filteredSites.sort((a: any, b: any) => {
        if (a.id === user?.siteId) return -1;
        if (b.id === user?.siteId) return 1;
        return 0;
      });

      setSites(filteredSites);
      
      if (filteredSites.length > 0) {
        setMapCenter([filteredSites[0].latitude || 20.5937, filteredSites[0].longitude || 78.9629]);
      }
    } catch (err) {
      addToast(t('failedLoadSites'), 'error');
    } finally {
      setLoading(false);
    }
  };


  const handleDeleteSite = (siteId: string) => {
    setSiteToDelete(siteId);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!siteToDelete) return;
    try {
      await deleteSite(siteToDelete);
      addToast(t('siteDeletedSuccess'), 'success');
      loadSites();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setSiteToDelete(null);
      setIsConfirmOpen(false);
    }
  };

  const handleSaveSite = async (siteData: any) => {
    try {
      if (editingSite) {
        await updateSite(editingSite.id, siteData);
        addToast(t('siteConfigUpdated'), 'success');
      } else {
        await createSite(siteData);
        addToast(t('siteNodeInitialized'), 'success');
      }
      loadSites();
    } catch (err: any) {
      addToast(err.message || t('actionFailed'), 'error');
      throw err;
    }
  };

  return (
    <div className="sites-page">
      <div className="premium-toast-container">
        <AnimatePresence>
          {toasts.map((t) => (
            <Toast key={t.id} {...t} onClose={removeToast} />
          ))}
        </AnimatePresence>
      </div>

      {/* Header removed to shift content upwards as requested */}


      <div className="sites-layout">
        <div className="sites-list-section">
          {isAdmin && (
            <div className="sites-actions-top" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button 
                className="watt-btn primary" 
                onClick={() => {
                  setEditingSite(null);
                  setIsModalOpen(true);
                }}
              >
                <span>{i18n.language === 'vi' ? 'Thêm địa điểm mới' : 'Add New Site'}</span>
              </button>
            </div>
          )}
          <div className="sites-grid">
            {loading ? (
              <div className="loading-state-site">
                <Loader2 className="spin" size={40} color="var(--primary)" />
                <p>{i18n.language === 'vi' ? 'Đang đồng bộ hóa dữ liệu địa điểm...' : 'Synchronizing Site Data...'}</p>
              </div>
            ) : (
              sites.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map((site) => {
                const isPrimarySite = !isAdmin && user?.siteId === site.id;
                return (
                  <motion.div 
                    key={site.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`glass-card site-card ${isPrimarySite ? 'managed-site' : ''}`}
                  >
                    <div className="site-card-header-premium">
                      <div className="site-identity">
                        <div className="site-icon-premium">
                          <MapPin size={22} />
                        </div>
                        <div className="site-title-group">
                          <h3>{site.name}</h3>
                          <p className="address-premium">
                            {site.displayAddress ? site.displayAddress : (
                              site.location.split(',').length >= 3 
                                ? site.location.split(',').slice(-3, -1).join(', ') 
                                : site.location
                            )}
                          </p>
                        </div>
                      </div>
                      
                      {isPrimarySite && (
                        <div className="assigned-badge-on-border">
                          {t('assigned')}
                        </div>
                      )}

                      {isAdmin && (
                        <div className="site-actions-premium">
                          <button 
                            className="icon-btn-premium edit" 
                            onClick={() => {
                              setEditingSite(site);
                              setIsModalOpen(true);
                            }}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className="icon-btn-premium delete" 
                            onClick={() => handleDeleteSite(site.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  
                    <div className="site-card-content-premium">
                      <div className="intel-row-premium">
                        <div className="intel-item-premium">
                          <Users size={16} />
                          <div className="intel-text">
                            <span className="intel-value">{site._count?.employees || 0}</span>
                            <span className="intel-label">{t('employeesLabel')}</span>
                          </div>
                        </div>
                        <div className="intel-item-premium">
                          <Shield size={16} />
                          <div className="intel-text">
                            <span className="intel-value">{site.geofenceRadius || 500}m</span>
                            <span className="intel-label">{t('geofenceLabel')}</span>
                          </div>
                        </div>
                        <div className="intel-item-premium">
                          <Clock size={16} />
                          <div className="intel-text">
                            <span className="intel-value">{site.workingStartTime || '07:00'}</span>
                            <span className="intel-label">{t('startTimeLabel')}</span>
                          </div>
                        </div>
                        <div className="intel-item-premium">
                          <Clock size={16} style={{ opacity: 0.8 }} />
                          <div className="intel-text">
                            <span className="intel-value" style={{ fontSize: '11px' }}>
                              {site.lunchStartTime || '12:00'} - {site.lunchEndTime || '13:00'}
                            </span>
                            <span className="intel-label">{i18n.language === 'vi' ? 'Nghỉ trưa' : 'Lunch Break'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="site-card-footer-premium">
                      <button className="btn-center-map" onClick={() => {
                        setMapCenter([site.latitude, site.longitude]);
                        setMapZoom(16);
                      }}>
                        <Navigation size={14} /> 
                        {t('centerOnMap')}
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        <div className="map-preview-section">
          <div className="glass-card map-preview-card">
            <div className="map-header">
              <h3>{t('geofenceVisualization')}</h3>
              <div className="map-legend">
                <span className="legend-item active">{t('operational')}</span>
                <span className="legend-item fence">{t('geofenceLabel')}</span>
              </div>
            </div>
            <div className="map-visual-real">
              <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
                <ChangeView center={mapCenter} zoom={mapZoom} />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {sites.map(site => (
                  site.latitude && (
                    <div key={site.id}>
                      <Marker position={[site.latitude, site.longitude]} icon={siteIcon}>
                        <Popup>
                          <strong>{site.name}</strong><br/>
                          {site.location}
                        </Popup>
                      </Marker>
                      <Circle 
                        center={[site.latitude, site.longitude]}
                        radius={site.geofenceRadius || 500}
                        pathOptions={{ color: 'var(--primary)', fillColor: 'var(--primary)', fillOpacity: 0.1 }}
                      />
                    </div>
                  )
                ))}
              </MapContainer>
            </div>
            <div className="map-footer-info">
              <Activity size={16} color="var(--primary)" />
              <span>{t('realtimeGpsStreaming')}</span>
            </div>
          </div>
        </div>
      </div>


      <AddSiteModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingSite(null);
        }}
        onSave={handleSaveSite}
        addToast={addToast}
        initialData={editingSite}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        title={t('deleteOperationalSite')}
        message={t('deleteSiteWarning')}
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
        confirmText={t('confirmDeleteBtn')}
        variant="danger"
      />
    </div>
  );
};

export default Sites;
