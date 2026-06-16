import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, User, Briefcase, MapPin, Shield, Camera, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { fetchSites } from '../api/api';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (employee: any) => Promise<void> | void;
}

const AddEmployeeModal = ({ isOpen, onClose, onAdd }: AddEmployeeModalProps) => {
  const { isAdmin } = useAuth();
  const { t } = useTranslation();
  const [sites, setSites] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    designation: '',
    role: 'EMPLOYEE',
    siteId: '',
    avatar: null as string | null
  });

  useEffect(() => {
    if (isOpen) {
      fetchSites().then(setSites).catch(console.error);
    }
  }, [isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glass-card modal-content"
          >
            <div className="modal-header">
              <h3>{t('addNewEmployee')}</h3>
              <button onClick={onClose} className="icon-btn"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              {/* Profile Image Upload */}
              <div className="profile-upload-section">
                <div className="avatar-preview">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Preview" onError={(e) => { e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fallback'; }} />
                  ) : (
                    <User size={40} />
                  )}
                  <label htmlFor="avatar-upload" className="upload-badge">
                    <Camera size={16} />
                  </label>
                </div>
                <input 
                  id="avatar-upload"
                  type="file" 
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
                <div className="upload-info">
                  <h4>{t('profilePicture')}</h4>
                  <p>{t('uploadPhotoInfo')}</p>
                </div>
              </div>

              <div className="form-group">
                <label>{t('employeeID')}</label>
                <div className="input-with-icon">
                  <Shield size={16} />
                  <input 
                    type="text" 
                    required 
                    value={formData.employeeId}
                    onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                    placeholder="e.g. TF005" 
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>{t('firstName')}</label>
                  <div className="input-with-icon">
                    <User size={16} />
                    <input 
                      type="text" 
                      required 
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      placeholder="John" 
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>{t('lastName')}</label>
                  <div className="input-with-icon">
                    <User size={16} />
                    <input 
                      type="text" 
                      required 
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      placeholder="Doe" 
                    />
                  </div>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>{t('emailAddress')}</label>
                  <input 
                    type="email" 
                    required 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="john.doe@company.com" 
                  />
                </div>
                <div className="form-group">
                  <label>{t('initialPassword')}</label>
                  <div className="input-with-icon">
                    <Lock size={16} />
                    <input 
                      type="password" 
                      required 
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="••••••••" 
                    />
                  </div>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>{t('designation')}</label>
                  <div className="input-with-icon">
                    <Briefcase size={16} />
                    <select 
                      value={formData.designation}
                      onChange={(e) => setFormData({...formData, designation: e.target.value})}
                      required={formData.role === 'EMPLOYEE'}
                      disabled={formData.role !== 'EMPLOYEE'}
                    >
                      <option value="" disabled={formData.role === 'EMPLOYEE'}>Select Designation</option>
                      <option value="Supervisor">Supervisor</option>
                      <option value="Foreman">Foreman</option>
                      <option value="Experience Worker">Experience Worker</option>
                      <option value="Engineer">Engineer</option>
                      <option value="Fresh Worker">Fresh Worker</option>
                      <option value="Safety">Safety</option>
                      <option value="Drawing">Drawing</option>
                      <option value="QA/QC">QA/QC</option>
                      <option value="QS">QS</option>
                      <option value="Store keeper">Store keeper</option>
                      <option value="Sr. Foreman">Sr. Foreman</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>{t('accessLevel')}</label>
                  <div className="input-with-icon">
                    <Shield size={16} />
                    {isAdmin ? (
                      <select 
                        value={formData.role}
                        onChange={(e) => {
                          const nextRole = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            role: nextRole,
                            ...(nextRole !== 'EMPLOYEE' ? { designation: '' } : {}),
                            ...(nextRole === 'ADMIN' ? { siteId: '' } : {})
                          }));
                        }}
                      >
                        <option value="EMPLOYEE">Standard Employee</option>
                        <option value="MANAGER">Manager</option>
                        <option value="ADMIN">Administrator</option>
                      </select>
                    ) : (
                      <select disabled value="EMPLOYEE">
                        <option value="EMPLOYEE">Standard Employee (Fixed)</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {formData.role !== 'ADMIN' && (
                <div className="form-group">
                  <label>Default Assignment (Site)</label>
                  <div className="input-with-icon">
                    <MapPin size={16} />
                    <select 
                      required={formData.role !== 'ADMIN'}
                      value={formData.siteId}
                      onChange={(e) => setFormData({...formData, siteId: e.target.value})}
                    >
                      <option value="">Select a site...</option>
                      {sites.map(site => (
                        <option key={site.id} value={site.id}>{site.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="face-enrollment-box">
                <Camera size={24} />
                <div>
                  <h4>Face ID Enrollment</h4>
                  <p>Employee will be prompted to enroll biometric data on first login.</p>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={onClose} className="btn btn-ghost">{t('cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('createProfile')}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddEmployeeModal;
