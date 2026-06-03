import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './PayslipModal.css';

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

const formatVND = (value: number | string) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0 ₫';
  const rounded = Math.round(num / 1000) * 1000;
  return `${rounded.toLocaleString('en-US')} ₫`;
};

const PayslipModal: React.FC<PayslipModalProps> = ({ isOpen, onClose, data }) => {
  const { t } = useTranslation();

  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="payslip-modal-overlay">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="payslip-modal-content"
          >
            <div className="payslip-header-actions no-print">
               <button className="btn-icon" onClick={handlePrint} title={t('printPayslip')}>
                <Printer size={20} />
              </button>
              <button className="btn-icon close" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            <div className="payslip-content-printable" id="printable-payslip">
              <div className="receipt-container">
                <header className="receipt-header">
                  <h1>CÔNG TY TNHH KỸ THUẬT ELEMECS VIỆT NAM</h1>
                  <p>TAX CODE : 0317597681</p>
                  <span className="title-tag">{t('salaryReceipt')}</span>
                  <div className="receipt-divider"></div>
                </header>

                <div className="receipt-body">
                  <div className="receipt-section">
                    <div className="receipt-row">
                      <span>{t('receiptEmployee')}</span>
                      <span>{data.employee?.firstName} {data.employee?.lastName}</span>
                    </div>
                    <div className="receipt-row">
                      <span>{t('receiptId')}</span>
                      <span>{data.employee?.employeeId}</span>
                    </div>
                    <div className="receipt-row">
                      <span>{t('receiptPeriod')}</span>
                      <span>{data.periodStart ? new Date(data.periodStart).toLocaleDateString() : (t('current') || 'Current')} - {data.periodEnd ? new Date(data.periodEnd).toLocaleDateString() : (t('period') || 'Period')}</span>
                    </div>
                  </div>

                  <div className="receipt-divider dashed"></div>

                  <div className="receipt-section">
                    <div className="receipt-row">
                      <span>{t('regularHoursValue', { hours: data.regularHours })}</span>
                      <span>{formatVND(data.basePay !== undefined ? data.basePay : (parseFloat(data.regularHours) * (data.employee?.hourlyRate || 0)))}</span>
                    </div>
                    {parseFloat(data.overtimeHours) > 0 && (
                      <div className="receipt-row">
                        <span>{t('overtimeValue', { hours: data.overtimeHours })}</span>
                        <span>{formatVND(data.overtimePay !== undefined ? data.overtimePay : (parseFloat(data.earnings) - (parseFloat(data.regularHours) * (data.employee?.hourlyRate || 0))))}</span>
                      </div>
                    )}
                    
                    {data.allowances && (data.allowances.food > 0 || data.allowances.other > 0) && (
                      <>
                        <div className="receipt-divider dashed"></div>
                        <h4 className="receipt-subsection-title" style={{ fontSize: '12px', fontWeight: 'bold', margin: '8px 0 4px 0', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{t('additionsAllowances')}</h4>
                        {data.allowances.food > 0 && (
                          <div className="receipt-row">
                            <span>{t('foodAllowance')}</span>
                            <span>{formatVND(data.allowances.food)}</span>
                          </div>
                        )}
                        {data.allowances.other > 0 && (
                          <div className="receipt-row">
                            <span>{t('otherAllowances')}</span>
                            <span>{formatVND(data.allowances.other)}</span>
                          </div>
                        )}
                      </>
                    )}

                    {data.deductions && (data.deductions.tax > 0 || data.deductions.insurance > 0 || data.deductions.advance > 0 || data.deductions.other > 0) && (
                      <>
                        <div className="receipt-divider dashed"></div>
                        <h4 className="receipt-subsection-title" style={{ fontSize: '12px', fontWeight: 'bold', margin: '8px 0 4px 0', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{t('deductions')}</h4>
                        {data.deductions.tax > 0 && (
                          <div className="receipt-row">
                            <span>{t('taxDeduction')}{data.deductions.taxRate ? ` (${data.deductions.taxRate}%)` : ''}</span>
                            <span>-{formatVND(data.deductions.tax)}</span>
                          </div>
                        )}
                        {data.deductions.insurance > 0 && (
                          <div className="receipt-row">
                            <span>{t('insuranceDeduction')}</span>
                            <span>-{formatVND(data.deductions.insurance)}</span>
                          </div>
                        )}
                        {data.deductions.advance > 0 && (
                          <div className="receipt-row">
                            <span>{t('advancePayment')}</span>
                            <span>-{formatVND(data.deductions.advance)}</span>
                          </div>
                        )}
                        {data.deductions.other > 0 && (
                          <div className="receipt-row">
                            <span>{t('otherDeductions')}</span>
                            <span>-{formatVND(data.deductions.other)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="receipt-divider dashed"></div>

                  <div className="receipt-total">
                    <span>{t('netTotal')}</span>
                    <span>{formatVND(data.netTotal !== undefined ? data.netTotal : parseFloat(data.earnings))}</span>
                  </div>

                  <div className="receipt-footer">
                    <p>{t('paidTo')} {data.employee?.bankName || t('directDeposit')}</p>
                    <p>{t('receiptAccount')} ****{data.employee?.accountNumber?.slice(-4) || 'N/A'}</p>
                    <div className="receipt-divider"></div>
                    <p className="timestamp">{t('receiptGenerated')} {new Date().toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PayslipModal;
