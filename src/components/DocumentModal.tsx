import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ExternalLink, FileText, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Modal.css';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  docUrl: string;
  docTitle: string;
}

const DocumentModal = ({ isOpen, onClose, docUrl, docTitle }: DocumentModalProps) => {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(docUrl);
  const isPdf = /\.pdf$/i.test(docUrl);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  // Reset zoom/rotation when document changes or modal closes
  React.useEffect(() => {
    if (!isOpen) {
      handleReset();
    }
  }, [isOpen, docUrl]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              width: '90%', 
              maxWidth: '1200px', 
              height: '90vh', 
              display: 'flex', 
              flexDirection: 'column',
              padding: '0',
              overflow: 'hidden',
              background: 'var(--surface)',
              border: '1px solid var(--glass-border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div className="modal-header" style={{ 
              padding: '16px 24px', 
              borderBottom: '1px solid var(--border)',
              margin: '0',
              background: 'rgba(255,255,255,0.03)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '10px', 
                  background: 'rgba(46, 163, 131, 0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: 'var(--primary)'
                }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', margin: '0', fontWeight: 600 }}>{docTitle}</h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '0', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{t('secureNodeViewer')}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Zoom Controls */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  background: 'rgba(255,255,255,0.05)', 
                  borderRadius: '8px',
                  padding: '4px'
                }}>
                  <button onClick={handleZoomOut} className="btn btn-ghost" style={{ padding: '6px' }} title={t('zoomOut')}>
                    <ZoomOut size={18} />
                  </button>
                  <span style={{ fontSize: '12px', minWidth: '45px', textAlign: 'center', fontWeight: 600 }}>
                    {Math.round(zoom * 100)}%
                  </span>
                  <button onClick={handleZoomIn} className="btn btn-ghost" style={{ padding: '6px' }} title={t('zoomIn')}>
                    <ZoomIn size={18} />
                  </button>
                </div>

                <div style={{ width: '1px', height: '24px', background: 'var(--border)' }}></div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleRotate} className="btn btn-ghost" style={{ padding: '8px' }} title={t('rotate')}>
                    <RotateCw size={18} />
                  </button>
                  <a 
                    href={docUrl} 
                    download 
                    className="btn btn-ghost" 
                    style={{ padding: '8px' }}
                    title={t('downloadFile')}
                  >
                    <Download size={18} />
                  </a>
                  <button 
                    onClick={onClose} 
                    className="btn btn-primary" 
                    style={{ padding: '8px 12px', borderRadius: '8px' }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-body" style={{ 
              flex: 1, 
              position: 'relative', 
              background: '#0a0f1e',
              overflow: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {isImage ? (
                <div style={{ 
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  padding: '40px',
                  display: 'inline-block'
                }}>
                  <img 
                    src={docUrl} 
                    alt={docTitle} 
                    style={{ 
                      maxWidth: '85vh', 
                      maxHeight: '75vh', 
                      objectFit: 'contain', 
                      borderRadius: '4px', 
                      boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                      pointerEvents: 'none' 
                    }} 
                  />
                </div>
              ) : isPdf ? (
                <div style={{ 
                  width: '100%', 
                  height: '100%',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.2s ease'
                }}>
                  <iframe 
                    src={`${docUrl}#toolbar=0&navpanes=0`} 
                    width="100%" 
                    height="100%" 
                    title={docTitle}
                    style={{ border: 'none' }}
                  />
                </div>
              ) : (
                <div style={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'var(--text-secondary)',
                  gap: '20px'
                }}>
                  <FileText size={64} style={{ opacity: 0.3 }} />
                  <p>{t('previewNotAvailable')}</p>
                  <a href={docUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                    <ExternalLink size={16} /> {t('openNewTab')}
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DocumentModal;
