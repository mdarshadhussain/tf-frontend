import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Clock, 
  TrendingUp, 
  Download, 
  FileText,
  Wallet,
  ArrowUpRight,
  Search,
  CheckCircle2,
  Printer,
  Activity,
  Calendar,
  ChevronLeft,
  Plus,
  X,
  PlusCircle,
  MinusCircle,
  Camera
} from 'lucide-react';
import { 
  fetchPayroll, 
  fetchSites, 
  logManualAttendance, 
  generateMonthlyPayslip,
  finalizeMonthlyPayslip,
  payMonthlyPayslip,
  fetchEmployeePayslips
} from '../api/api';
import { exportToCSV } from '../utils/export';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import type { ToastType } from '../components/Toast';
import PayslipModal from '../components/PayslipModal';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import PremiumSelect from '../components/PremiumSelect';
import './Payroll.css';
import './PayrollEmployee.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const StatCard = ({ icon, label, value, color, trend }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass-card stat-card-premium"
    style={{ minHeight: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexShrink: 0, padding: '24px', position: 'relative' }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <div className="stat-icon-wrap" style={{ color, margin: 0, flexShrink: 0 }}>
        {icon}
      </div>
      {trend && (
        <div className="stat-trend positive" style={{ position: 'static', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ArrowUpRight size={14} />
          <span>{trend}</span>
        </div>
      )}
    </div>
    <div className="stat-content" style={{ marginTop: '16px' }}>
      <p className="stat-label" style={{ margin: 0 }}>{label}</p>
      <h3 className="stat-value" style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: '800' }}>{value}</h3>
    </div>
  </motion.div>
);

const ALLOWED_DESIGNATIONS = [
  'Supervisor',
  'Foreman',
  'Experience Worker',
  'Engineer',
  'Fresh Worker',
  'Safety',
  'Drawing',
  'QA/QC',
  'QS',
  'Store keeper',
  'Sr. Foreman'
];

const isDateInFilter = (dateStr: string, filter: string, customStart?: string, customEnd?: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  
  const startOfDay = (d: Date) => {
    const nd = new Date(d);
    nd.setHours(0, 0, 0, 0);
    return nd.getTime();
  };

  const endOfDay = (d: Date) => {
    const nd = new Date(d);
    nd.setHours(23, 59, 59, 999);
    return nd.getTime();
  };

  const logTime = date.getTime();

  if (filter === 'TODAY') {
    return logTime >= startOfDay(now) && logTime <= endOfDay(now);
  }
  if (filter === 'LAST_7_DAYS') {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    return logTime >= startOfDay(sevenDaysAgo) && logTime <= endOfDay(now);
  }
  if (filter === 'THIS_MONTH') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return logTime >= startOfDay(startOfMonth) && logTime <= endOfDay(endOfMonth);
  }
  if (filter === 'CUSTOM') {
    let match = true;
    if (customStart) {
      match = match && logTime >= startOfDay(new Date(customStart));
    }
    if (customEnd) {
      match = match && logTime <= endOfDay(new Date(customEnd));
    }
    return match;
  }
  return true;
};

const getAdjustedClockIn = (clockInStr: string, workingStartTimeStr: string) => {
  const checkIn = new Date(clockInStr);
  const [startHour, startMinute] = workingStartTimeStr.split(':').map(Number);
  
  const scheduledStart = new Date(checkIn);
  scheduledStart.setHours(startHour, startMinute, 0, 0);
  
  const diffMins = Math.round((checkIn.getTime() - scheduledStart.getTime()) / 60000);
  
  if (diffMins <= 10) {
    if (diffMins > 0) {
      return scheduledStart.getTime();
    }
    return checkIn.getTime();
  } else {
    const roundedDiffMins = Math.ceil(diffMins / 30) * 30;
    const adjustedTime = new Date(scheduledStart);
    adjustedTime.setMinutes(startMinute + roundedDiffMins);
    return adjustedTime.getTime();
  }
};

const calculatePayrollForLogs = (logs: any[], employee: any, sites: any[] = []) => {
  let regMins = 0;
  let otMins = 0;
  const rate = employee?.hourlyRate || 25;

  logs.forEach((log: any) => {
    if (!log.clockIn || !log.clockOut) return;
    
    const siteId = log.siteId || employee?.siteId;
    const logSite = sites.find((s: any) => s.id === siteId);
    const workingStartTime = logSite?.workingStartTime || '07:00';
    
    const adjustedInTime = getAdjustedClockIn(log.clockIn, workingStartTime);
    const outTime = new Date(log.clockOut).getTime();
    let diffMins = Math.round((outTime - adjustedInTime) / 60000);

    if (log.breaks && Array.isArray(log.breaks)) {
      log.breaks.forEach((b: any) => {
        if (b.endTime) {
          const bDiff = Math.round((new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000);
          diffMins -= bDiff;
        }
      });
    }

    regMins += Math.min(480, diffMins);
    otMins += Math.max(0, diffMins - 480);
  });

  const rh = regMins / 60;
  const oh = otMins / 60;
  let earn = rh * rate;
  if (employee) {
    earn += (employee.overtimeType === 'MULTIPLIER' 
      ? oh * rate * (employee.overtimeValue || 1.5) 
      : oh * (employee.overtimeValue || 20));
  }
  return {
    regularHours: rh,
    overtimeHours: oh,
    earnings: earn
  };
};

const formatVND = (value: number | string) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0 ₫';
  const rounded = Math.round(num / 1000) * 1000;
  return `${rounded.toLocaleString('en-US')} ₫`;
};

const formatDateDDMMYYYY = (date: Date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};


const getLogHoursAndOvertime = (log: any, workingStartTimeStr: string = '07:00') => {
  if (!log.clockIn || !log.clockOut) return { totalHours: 0, overtimeHours: 0 };
  const adjustedInTime = getAdjustedClockIn(log.clockIn, workingStartTimeStr);
  const outTime = new Date(log.clockOut).getTime();
  let diffMins = Math.round((outTime - adjustedInTime) / 60000);

  if (log.breaks && Array.isArray(log.breaks)) {
    log.breaks.forEach((b: any) => {
      if (b.endTime) {
        const bDiff = Math.round((new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000);
        diffMins -= bDiff;
      }
    });
  }

  const otMins = Math.max(0, diffMins - 480);

  return {
    totalHours: Math.max(0, diffMins / 60),
    overtimeHours: Math.max(0, otMins / 60)
  };
};

const Payroll = () => {
  const { user, isAdmin } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isEmployee = user?.role === 'EMPLOYEE';
  
  // Data States
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toasts, setToasts] = useState<any[]>([]);
  
  // Selection States
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(isEmployee && user?.id ? user.id : null);
  const [activeTab, setActiveTab] = useState<'attendance' | 'slips' | 'calculator'>('attendance');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  
  // Payslip Preview States
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  
  // Filters
  const [designationFilter, setDesignationFilter] = useState('ALL');
  const [siteFilter, setSiteFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('THIS_MONTH');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [attendanceMonthFilter, setAttendanceMonthFilter] = useState('ALL');
  const [slipsMonthFilter, setSlipsMonthFilter] = useState('ALL');

  // Manual Log Form State
  const [showManualLog, setShowManualLog] = useState(false);
  const [manualData, setManualData] = useState({
    siteId: '',
    date: new Date().toISOString().split('T')[0],
    clockIn: '07:00',
    clockOut: '15:00',
    status: 'PRESENT'
  });



  // Proof Modal States
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedProofLog, setSelectedProofLog] = useState<any>(null);

  // Calculator States
  const [foodAllowance, setFoodAllowance] = useState<number>(0);
  const [otherAllowance, setOtherAllowance] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(10);
  const [insuranceDeduction, setInsuranceDeduction] = useState<number>(0);
  const [advancePayment, setAdvancePayment] = useState<number>(0);
  const [otherDeductions, setOtherDeductions] = useState<number>(0);

  // Payslip Workflow States
  const [employeePayslips, setEmployeePayslips] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentPayslipId, setPaymentPayslipId] = useState<string>('');
  const [transactionId, setTransactionId] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');


  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    loadPayrollData();
    const interval = setInterval(loadPayrollData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadPayrollData = async () => {
    try {
      const [data, sitesData] = await Promise.all([
        fetchPayroll(),
        fetchSites()
      ]);
      setPayrollData(data);
      setSites(sitesData);
    } catch (err) {
      addToast(t('failedLoadPayrollIntel'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeePayslips = async (idToLoad: string) => {
    if (!idToLoad) return;
    try {
      const slips = await fetchEmployeePayslips(idToLoad);
      setEmployeePayslips(slips);
    } catch (err) {
      console.error("Failed to load employee payslips", err);
    }
  };

  useEffect(() => {
    // If Admin/Manager is viewing a specific employee
    if (selectedEmployeeId && !isEmployee) {
      loadEmployeePayslips(selectedEmployeeId);
    } else if (!selectedEmployeeId && !isEmployee) {
      setEmployeePayslips([]);
    }
  }, [selectedEmployeeId, isEmployee]);

  useEffect(() => {
    // If logged in as an Employee, ALWAYS fetch for their own user.id
    if (isEmployee && user?.id) {
      loadEmployeePayslips(user.id);
    }
  }, [isEmployee, user?.id]);

  const handleViewSlip = (payslip: any) => {
    const slipPayload = {
      id: payslip.id,
      employee: selectedEmployeeRecord?.employee,
      regularHours: payslip.regularHours.toFixed(1),
      overtimeHours: payslip.overtimeHours.toFixed(1),
      earnings: payslip.grossPay.toFixed(2),
      basePay: payslip.regularHours * (selectedEmployeeRecord?.employee?.hourlyRate || 0),
      overtimePay: payslip.overtimeHours * (selectedEmployeeRecord?.employee?.hourlyRate || 0) * (selectedEmployeeRecord?.employee?.overtimeValue || 1.5),
      allowances: {
        food: payslip.foodAllowance,
        other: payslip.otherAllowance
      },
      deductions: {
        tax: payslip.taxAmount,
        taxRate: payslip.taxRate,
        insurance: payslip.insurance,
        advance: payslip.advancePayment,
        other: payslip.otherDeductions
      },
      netTotal: payslip.netPay,
      periodStart: `${payslip.month}-01`,
      periodEnd: `${payslip.month}-28`
    };
    setSelectedPayslip(slipPayload);
    setIsPayslipOpen(true);
  };



  const handleGenerateSlip = async () => {
    if (!selectedEmployeeId || !selectedMonth) return;
    try {
      const response = await generateMonthlyPayslip({
        employeeId: selectedEmployeeId,
        month: selectedMonth,
        regularHours: monthCalculations.regularHours,
        overtimeHours: monthCalculations.overtimeHours,
        grossPay: monthCalculations.grossPay,
        netPay: calculatedNet.net,
        foodAllowance,
        otherAllowance,
        taxRate,
        taxAmount: calculatedNet.tax,
        insurance: insuranceDeduction,
        advancePayment,
        otherDeductions
      });
      
      addToast(t('paymentsProcessedSuccess') || "Payslip generated successfully!", 'success');
      await loadEmployeePayslips(selectedEmployeeId!);
      loadPayrollData();
      
      // Auto view the payslip
      handleViewSlip(response);
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleFinalizeSlip = async (payslipId: string) => {
    try {
      await finalizeMonthlyPayslip(payslipId);
      addToast("Payslip finalized successfully!", 'success');
      await loadEmployeePayslips(selectedEmployeeId!);
      loadPayrollData();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentPayslipId || !transactionId) return;

    try {
      const formData = new FormData();
      formData.append('payslipId', paymentPayslipId);
      formData.append('transactionId', transactionId);
      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      await payMonthlyPayslip(formData);
      addToast("Payment logged and marked as paid!", 'success');
      setShowPaymentModal(false);
      setTransactionId('');
      setReceiptFile(null);
      setReceiptPreview('');
      setPaymentPayslipId('');
      await loadEmployeePayslips(selectedEmployeeId!);
      loadPayrollData();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };





  const handleExport = () => {
    exportToCSV(payrollData, 'Payroll_Registry');
    addToast(t('reportGeneratedSuccess') || 'Report generated successfully', 'success');
  };

  // Find the selected employee record
  const selectedEmployeeRecord = useMemo(() => {
    return payrollData.find(item => item.employee?.id === selectedEmployeeId);
  }, [payrollData, selectedEmployeeId]);

  // Group current employee attendance by month
  const groupedMonths = useMemo(() => {
    if (!selectedEmployeeRecord) return {};
    const groups: { [key: string]: any[] } = {};
    selectedEmployeeRecord.employee.attendance.forEach((log: any) => {
      const logDate = new Date(log.date || log.clockIn);
      const monthKey = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(log);
    });
    return groups;
  }, [selectedEmployeeRecord]);

  // Unique list of months for attendance logs filter
  const attendanceMonths = useMemo(() => {
    if (!selectedEmployeeRecord?.employee?.attendance) return [];
    const monthsSet = new Set<string>();
    selectedEmployeeRecord.employee.attendance.forEach((log: any) => {
      const logDate = new Date(log.date || log.clockIn);
      const monthKey = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
      monthsSet.add(monthKey);
    });
    return Array.from(monthsSet).sort().reverse();
  }, [selectedEmployeeRecord]);

  // Unique list of months for slips filter
  const availableSlipMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    if (selectedEmployeeRecord?.employee?.attendance) {
      selectedEmployeeRecord.employee.attendance.forEach((log: any) => {
        const logDate = new Date(log.date || log.clockIn);
        const monthKey = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
        monthsSet.add(monthKey);
      });
    }
    employeePayslips.forEach(ps => monthsSet.add(ps.month));
    return Array.from(monthsSet).sort().reverse();
  }, [selectedEmployeeRecord, employeePayslips]);

  // Filtered attendance logs based on selected month, generating all days (1 to 30/31)
  const attendanceHistoryRows = useMemo(() => {
    if (!selectedEmployeeRecord) return [];
    
    // Determine target year and month
    const currentYearMonth = new Date().toISOString().slice(0, 7);
    const targetMonthFilter = attendanceMonthFilter === 'ALL' ? currentYearMonth : attendanceMonthFilter;
    const [yearStr, monthStr] = targetMonthFilter.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    
    // Get number of days in the month
    const daysInMonth = new Date(year, month, 0).getDate();
    
    const rows = [];
    const attendanceLogs = selectedEmployeeRecord.employee.attendance || [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, month - 1, d);
      
      // Find log on this day
      const log = attendanceLogs.find((l: any) => {
        const logDate = new Date(l.date || l.clockIn);
        return logDate.getFullYear() === year &&
               (logDate.getMonth() + 1) === month &&
               logDate.getDate() === d;
      });
      
      rows.push({
        day: d,
        date: dayDate,
        log: log || null
      });
    }
    
    // Sort rows: newest date first (day descending)
    return rows.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [selectedEmployeeRecord, attendanceMonthFilter]);

  // Calculated Month Details
  const monthCalculations = useMemo(() => {
    if (!selectedEmployeeRecord || !selectedMonth || !groupedMonths[selectedMonth]) {
      return { regularHours: 0, overtimeHours: 0, grossPay: 0, isPaid: true };
    }
    const logs = groupedMonths[selectedMonth];
    let regMins = 0;
    let otMins = 0;
    const rate = selectedEmployeeRecord.employee.hourlyRate || 25;

    // We fetch holidays to adjust calculation appropriately
    // But since holidays list is not fully available locally, we check against logs info
    logs.forEach((log: any) => {
      // Basic fallback duration calculation
      const inTime = new Date(log.clockIn).getTime();
      const outTime = new Date(log.clockOut).getTime();
      let diffMins = Math.round((outTime - inTime) / 60000);

      // Subtract breaks
      if (log.breaks && Array.isArray(log.breaks)) {
        log.breaks.forEach((b: any) => {
          if (b.endTime) {
            const bDiff = Math.round((new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000);
            diffMins -= bDiff;
          }
        });
      }

      regMins += Math.min(480, diffMins);
      otMins += Math.max(0, diffMins - 480);
    });

    const rh = regMins / 60;
    const oh = otMins / 60;
    let earn = rh * rate;
    const emp = selectedEmployeeRecord.employee;
    earn += (emp.overtimeType === 'MULTIPLIER' ? oh * rate * (emp.overtimeValue || 1.5) : oh * (emp.overtimeValue || 20));

    const isPaid = logs.every((log: any) => log.status === 'PAID');

    return {
      regularHours: rh,
      overtimeHours: oh,
      grossPay: earn,
      isPaid
    };
  }, [selectedEmployeeRecord, selectedMonth, groupedMonths]);

  // Live Calculator Calculations
  const calculatedNet = useMemo(() => {
    const gross = monthCalculations.grossPay;
    const additions = foodAllowance + otherAllowance;
    const tax = Math.round(gross * (taxRate / 100));
    const deductions = tax + insuranceDeduction + advancePayment + otherDeductions;
    const net = Math.max(0, gross + additions - deductions);
    return {
      gross,
      additions,
      tax,
      deductions,
      net
    };
  }, [monthCalculations, foodAllowance, otherAllowance, taxRate, insuranceDeduction, advancePayment, otherDeductions]);

  // Handle Manual Attendance Submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;
    // Auto-use the employee's assigned siteId — no need for the admin to select it
    const employeeSiteId = selectedEmployeeRecord?.employee?.siteId || '';
    try {
      const fullIn = new Date(`${manualData.date}T${manualData.clockIn}`).toISOString();
      const fullOut = manualData.clockOut ? new Date(`${manualData.date}T${manualData.clockOut}`).toISOString() : null;
      
      await logManualAttendance({
        employeeId: selectedEmployeeId,
        siteId: employeeSiteId,
        clockIn: fullIn,
        clockOut: fullOut,
        status: 'PRESENT'
      });
      
      addToast(t('attendanceLoggedSuccess') || "Attendance logged successfully!", 'success');
      setShowManualLog(false);
      loadPayrollData();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };






  const filteredData = useMemo(() => {
    const baseFiltered = payrollData.filter(item => {
      // Admins are excluded from payroll — they are managers only, not salary recipients
      if (item.employee?.role === 'ADMIN') return false;

      let match = true;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const nameMatch = `${item.employee?.firstName} ${item.employee?.lastName}`.toLowerCase().includes(query);
        const idMatch = item.employee?.employeeId?.toLowerCase().includes(query) || false;
        if (!nameMatch && !idMatch) {
          match = false;
        }
      }
      if (designationFilter !== 'ALL' && item.employee?.designation !== designationFilter) {
        match = false;
      }
      if (siteFilter !== 'ALL' && item.employee?.siteId !== siteFilter) {
        match = false;
      }
      return match;
    });

    return baseFiltered.map(item => {
      if (!item.employee?.attendance) return item;

      const filteredAttendance = item.employee.attendance.filter((log: any) => {
        const logDate = log.date || log.clockIn;
        if (!logDate) return false;
        return isDateInFilter(logDate, dateFilter, customStartDate, customEndDate);
      });

      const dynamicPayroll = calculatePayrollForLogs(filteredAttendance, item.employee, sites);

      return {
        ...item,
        regularHours: dynamicPayroll.regularHours.toFixed(1),
        overtimeHours: dynamicPayroll.overtimeHours.toFixed(1),
        earnings: dynamicPayroll.earnings.toFixed(2),
        filteredAttendance
      };
    });
  }, [payrollData, searchTerm, designationFilter, siteFilter, dateFilter, customStartDate, customEndDate, sites]);

  const dynamicStats = useMemo(() => {
    let totalPayout = 0;
    let totalHours = 0;
    let totalOvertime = 0;
    const activeRecipients = filteredData.length;

    filteredData.forEach(item => {
      totalPayout += parseFloat(item.earnings || '0');
      totalHours += parseFloat(item.regularHours || '0') + parseFloat(item.overtimeHours || '0');
      totalOvertime += parseFloat(item.overtimeHours || '0');
    });

    return {
      totalPayout,
      totalHours,
      totalOvertime,
      activeRecipients
    };
  }, [filteredData]);

  const siteWiseData = useMemo(() => {
    const dataMap: { [key: string]: { name: string, payout: number, hours: number } } = {};
    filteredData.forEach(item => {
      const siteId = item.employee?.siteId || 'UNASSIGNED';
      const siteName = sites.find(s => s.id === siteId)?.name || 'Unassigned';
      if (!dataMap[siteId]) {
        dataMap[siteId] = { name: siteName, payout: 0, hours: 0 };
      }
      dataMap[siteId].payout += parseFloat(item.earnings || '0');
      dataMap[siteId].hours += parseFloat(item.regularHours || '0') + parseFloat(item.overtimeHours || '0');
    });
    return Object.values(dataMap);
  }, [filteredData, sites]);

  const bracketData = useMemo(() => {
    let tier1 = 0; // < 5M
    let tier2 = 0; // 5M - 10M
    let tier3 = 0; // 10M - 15M
    let tier4 = 0; // > 15M

    filteredData.forEach(item => {
      const pay = parseFloat(item.earnings || '0');
      if (pay < 5000000) tier1++;
      else if (pay < 10000000) tier2++;
      else if (pay < 15000000) tier3++;
      else tier4++;
    });

    return [
      { bracket: '< 5M ₫', count: tier1 },
      { bracket: '5M - 10M ₫', count: tier2 },
      { bracket: '10M - 15M ₫', count: tier3 },
      { bracket: '> 15M ₫', count: tier4 }
    ];
  }, [filteredData]);

  const topEarners = useMemo(() => {
    return [...filteredData]
      .sort((a, b) => parseFloat(b.earnings || '0') - parseFloat(a.earnings || '0'))
      .slice(0, 5);
  }, [filteredData]);

  const topOvertime = useMemo(() => {
    return [...filteredData]
      .sort((a, b) => parseFloat(b.overtimeHours || '0') - parseFloat(a.overtimeHours || '0'))
      .slice(0, 5);
  }, [filteredData]);

  const designationOptions = useMemo(() => {
    const getDesignationLabel = (title: string) => {
      if (!title) return t('specialist');
      const normalized = title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalized === 'experienceworker') return t('experienceWorker');
      if (normalized === 'freshworker') return t('freshWorker');
      if (normalized === 'storekeeper') return t('storeKeeper');
      if (normalized === 'srforeman') return t('srForeman');
      if (normalized === 'qaqc') return t('qaqc');
      return t(normalized) || title;
    };

    return [
      { label: t('allDesignations'), value: 'ALL' },
      ...ALLOWED_DESIGNATIONS.map(d => ({
        label: getDesignationLabel(d),
        value: d
      }))
    ];
  }, [t]);

  if (loading) return <div className="loading-state">{t('synchronizingFinancial')}</div>;

  if (!isAdmin && !isEmployee) {
    return (
      <div className="payroll-page unauthorized-state" style={{ padding: '60px 40px', textAlign: 'center', background: 'var(--surface)', borderRadius: '24px', border: '1px solid var(--border)', margin: '24px' }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>{t('accessRestricted')}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>{t('noAdminPayrollPerms')}</p>
      </div>
    );
  }

  // Employee Specific view (if employee logs in, show personal E
  if (isEmployee) {
    const personalRecord = payrollData.find(item => item.employee?.id === user?.id) || payrollData[0];
    
    return (
      <div className="payroll-page">
        <div className="employee-payroll-history">
          {personalRecord && (
            <div className="active-cycle-card">
               <div className="cycle-header">
                 <div className="cycle-month">Current Period</div>
                 <div className="cycle-status pending">Pending</div>
               </div>
               <div className="cycle-body">
                 <div className="cycle-metric">
                   <label>Regular Hours</label>
                   <span>{personalRecord.regularHours || '0.0'}h</span>
                 </div>
                 <div className="cycle-metric">
                   <label>Overtime</label>
                   <span>{personalRecord.overtimeHours || '0.0'}h</span>
                 </div>
                 <div className="cycle-metric gross">
                   <label>Estimated Gross</label>
                   <span className="amount">{formatVND(personalRecord.earnings || 0)}</span>
                 </div>
               </div>
            </div>
          )}

          <h2 className="history-section-title" style={{ marginTop: '32px' }}><FileText size={20} style={{marginRight: '8px', color: 'var(--primary)'}} /> Payslip History</h2>
          
          {employeePayslips.length === 0 ? (
            <div className="empty-state-card glass-card" style={{padding: '32px', textAlign: 'center', color: 'var(--text-secondary)'}}>
              <p>No historical payslips found.</p>
            </div>
          ) : (
            <div className="payslip-history-grid">
              {[...employeePayslips]
                .sort((a: any, b: any) => b.month.localeCompare(a.month))
                .map((slip: any, idx: number) => {
                  let displayStatus = 'Paid';
                  let statusClass = 'paid';
                  if (slip.status === 'GENERATED') {
                    displayStatus = 'Pending';
                    statusClass = 'pending';
                  } else if (slip.status === 'FINALIZED') {
                    displayStatus = 'Processing';
                    statusClass = 'processing';
                  }

                  return (
                    <motion.div 
                      key={slip.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="payslip-card-premium"
                    >
                      <div className="ps-header">
                        <div className="ps-month">{slip.month}</div>
                        <span className={`ps-status ${statusClass}`}>{displayStatus}</span>
                      </div>
                      <div className="ps-metrics">
                        <div className="ps-metric">
                          <Clock size={14}/> {Number(slip.regularHours).toFixed(1)}h Reg
                        </div>
                        <div className="ps-metric">
                          <Activity size={14}/> {Number(slip.overtimeHours).toFixed(1)}h OT
                        </div>
                      </div>
                      <div className="ps-net">
                        <label>Net Pay</label>
                        <div className="ps-amount">{formatVND(slip.netPay)}</div>
                      </div>
                      <button 
                        className="btn-view-slip"
                        onClick={() => handleViewSlip(slip)}
                      >
                        <FileText size={16} /> View Full Payslip
                      </button>
                    </motion.div>
                  );
              })}
            </div>
          )}
        </div>

        <PayslipModal 
          isOpen={isPayslipOpen}
          onClose={() => setIsPayslipOpen(false)}
          data={selectedPayslip}
        />
      </div>
    );
  }

  // Admin workflow
  return (
    <div className="payroll-page">
      <div className="premium-toast-container">
        <AnimatePresence>
          {toasts.map((t) => (
            <Toast key={t.id} {...t} onClose={removeToast} />
          ))}
        </AnimatePresence>
      </div>

      <PayslipModal 
        isOpen={isPayslipOpen}
        onClose={() => setIsPayslipOpen(false)}
        data={selectedPayslip}
      />

      <AnimatePresence mode="wait">
        {!selectedEmployeeId ? (
          // ================= MASTER LIST VIEW =================
          <motion.div
            key="master-list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            <header className="page-header-premium">
              <div className="header-text">
                <h1>{t('financialIntelligence')}</h1>
                <p>{t('managedPayrollCycles')}</p>
              </div>
              <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" onClick={handleExport}>
                  <Download size={18} /> {t('exportRegistry')}
                </button>
                <button className="btn btn-ghost" onClick={() => navigate('/holidays')}>
                  <Calendar size={18} /> {t('manageHolidays')}
                </button>
                <div style={{ width: '200px' }}>
                  <PremiumSelect
                    placeholder={t('dateFilter') || 'Filter Dates'}
                    value={dateFilter}
                    onChange={(val: string) => setDateFilter(val)}
                    options={[
                      { label: t('allTime') || 'All Time', value: 'ALL' },
                      { label: t('filterToday') || 'Today', value: 'TODAY' },
                      { label: t('filter7Days') || 'Last 7 Days', value: 'LAST_7_DAYS' },
                      { label: t('filterThisMonth') || 'This Month', value: 'THIS_MONTH' },
                      { label: t('filterCustomDate') || 'Custom Range', value: 'CUSTOM' }
                    ]}
                  />
                </div>
                {dateFilter === 'CUSTOM' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="premium-select-trigger"
                      style={{ 
                        background: 'var(--surface-bright)', 
                        border: '1px solid var(--border)', 
                        color: 'var(--text-primary)', 
                        outline: 'none', 
                        fontSize: '14px',
                        padding: '10px 16px',
                        borderRadius: '12px',
                        minHeight: '44px',
                        cursor: 'pointer'
                      }}
                    />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>{t('filterSeparatorTo') || 'to'}</span>
                    <input 
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="premium-select-trigger"
                      style={{ 
                        background: 'var(--surface-bright)', 
                        border: '1px solid var(--border)', 
                        color: 'var(--text-primary)', 
                        outline: 'none', 
                        fontSize: '14px',
                        padding: '10px 16px',
                        borderRadius: '12px',
                        minHeight: '44px',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                )}
              </div>
            </header>

             <div className="stats-grid-premium">
              <StatCard 
                icon={<Wallet size={24} />} 
                label={t('totalPayouts')} 
                value={formatVND(dynamicStats.totalPayout)}
                color="#f59e0b"
                trend="+12.5%"
              />
              <StatCard 
                icon={<Clock size={24} />} 
                label={t('cumulativeHours')} 
                value={`${dynamicStats.totalHours.toLocaleString('en-US')}h`}
                color="#6366f1"
                trend="+8.2%"
              />
              <StatCard 
                icon={<TrendingUp size={24} />} 
                label={t('activeRecipients')} 
                value={dynamicStats.activeRecipients.toString()}
                color="#10b981"
                trend="+4.3%"
              />
              <StatCard 
                icon={<Activity size={24} />} 
                label={t('overtime')} 
                value={`${dynamicStats.totalOvertime.toLocaleString('en-US')}h`}
                color="#10b981"
              />
            </div>

            <div className="glass-card table-controls" style={{ marginTop: '24px' }}>
              <div className="search-bar">
                <Search size={18} />
                <input 
                  type="text" 
                  placeholder={t('searchRecipients')} 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="dashboard-filters" style={{ display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'center', flexWrap: 'nowrap' }}>
                <PremiumSelect 
                  placeholder={t('filterDesignation')}
                  value={designationFilter}
                  onChange={(val: string) => setDesignationFilter(val)}
                  options={designationOptions}
                  className="dashboard-filter-select"
                />
                <PremiumSelect 
                  placeholder={t('filterSite') || 'Filter Site'}
                  value={siteFilter}
                  onChange={(val: string) => setSiteFilter(val)}
                  options={[
                    { label: t('allSites') || 'All Sites', value: 'ALL' },
                    ...sites.map(s => ({ label: s.name, value: s.id }))
                  ]}
                  className="dashboard-filter-select"
                />
              </div>
            </div>

            <div className="glass-card table-container" style={{ marginTop: '16px' }}>
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>{t('employee')}</th>
                    <th>{t('hourlyRate')}</th>
                    <th>{t('regularHours')}</th>
                    <th>{t('overtime')}</th>
                    <th>{t('grossAmount')}</th>
                    <th>{t('status')}</th>
                    <th>{t('action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedEmployeeId(item.employee?.id)}>
                      <td className="emp-cell">
                        <div className="emp-brief">
                          <div className="emp-initials">
                            {item.employee?.avatar ? (
                              <img src={item.employee.avatar.startsWith('http') ? item.employee.avatar : `${API_URL}${item.employee.avatar.startsWith('/') ? item.employee.avatar : `/${item.employee.avatar}`}`} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover' }} onError={(e) => { e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fallback'; }} />
                            ) : (
                              `${item.employee?.firstName?.[0] || ''}${item.employee?.lastName?.[0] || ''}`
                            )}
                          </div>
                          <div className="v-stack">
                            <span className="name">{item.employee?.firstName} {item.employee?.lastName}</span>
                            <span className="id">{item.employee?.designation || 'Staff'} ({item.employee?.employeeId})</span>
                          </div>
                        </div>
                      </td>
                      <td>{formatVND(item.employee?.hourlyRate || 0).replace(' ₫', ' ₫/h')}</td>
                      <td>{item.regularHours || '0.0'} h</td>
                      <td>{item.overtimeHours || '0.0'} h</td>
                      <td className="amount-cell">{formatVND(item.earnings || 0)}</td>
                      <td>
                        <span className={`badge badge-${(item.status || 'PENDING').toLowerCase()}`}>
                          {t(item.status?.toLowerCase() || 'pending')}
                        </span>
                      </td>
                      <td>
                        <button className="icon-btn highlight" onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmployeeId(item.employee?.id);
                        }}>
                          <ArrowUpRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          // ================= DETAIL VIEW =================
          <motion.div
            key="detail-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            {/* Back to Employees Button */}
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
              <button 
                className="btn btn-ghost" 
                onClick={() => { setSelectedEmployeeId(null); setSelectedMonth(''); setAttendanceMonthFilter('ALL'); }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px', borderRadius: '8px' }}
              >
                <ChevronLeft size={16} /> {t('backToEmployees') || 'Back to Employees'}
              </button>
            </div>

            <header className="page-header-premium" style={{ marginBottom: '24px' }}>
              <div className="header-text" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px' }}>
                <div className="emp-initials" style={{ width: '48px', height: '48px', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selectedEmployeeRecord?.employee?.avatar ? (
                    <img src={selectedEmployeeRecord.employee.avatar.startsWith('http') ? selectedEmployeeRecord.employee.avatar : `${API_URL}${selectedEmployeeRecord.employee.avatar.startsWith('/') ? selectedEmployeeRecord.employee.avatar : `/${selectedEmployeeRecord.employee.avatar}`}`} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover' }} onError={(e) => { e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fallback'; }} />
                  ) : (
                    `${selectedEmployeeRecord?.employee?.firstName?.[0] || ''}${selectedEmployeeRecord?.employee?.lastName?.[0] || ''}`
                  )}
                </div>
                <div>
                  <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
                    {selectedEmployeeRecord?.employee?.firstName} {selectedEmployeeRecord?.employee?.lastName}
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{selectedEmployeeRecord?.employee?.designation} • ID: {selectedEmployeeRecord?.employee?.employeeId}</p>
                </div>
              </div>
              <div className="header-actions">
                <button className="btn btn-primary" onClick={() => setShowManualLog(!showManualLog)}>
                  <Plus size={18} /> {t('logAttendanceForEmployee')}
                </button>
              </div>
            </header>

            {/* Inline Manual Attendance Log Form */}
            <AnimatePresence>
              {showManualLog && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass-card form-section-premium"
                  style={{ marginBottom: '20px', padding: '24px', overflow: 'hidden' }}
                >
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold' }}>{t('logManualAttendance')}</h3>
                  <form onSubmit={handleManualSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', alignItems: 'end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>{t('date')}</label>
                      <input 
                        type="date"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-bright)', color: 'var(--text-primary)' }}
                        value={manualData.date}
                        onChange={(e) => setManualData({ ...manualData, date: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>{t('checkin')}</label>
                      <input 
                        type="time"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-bright)', color: 'var(--text-primary)' }}
                        value={manualData.clockIn}
                        onChange={(e) => setManualData({ ...manualData, clockIn: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>{t('checkout')}</label>
                      <input 
                        type="time"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-bright)', color: 'var(--text-primary)' }}
                        value={manualData.clockOut}
                        onChange={(e) => setManualData({ ...manualData, clockOut: e.target.value })}
                        required
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', flex: 1 }}>{t('submit') || 'Submit'}</button>
                      <button type="button" className="btn btn-ghost" onClick={() => setShowManualLog(false)} style={{ padding: '12px' }}><X size={18} /></button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Summary Cards for Detail page */}
            <div className="stats-grid-premium" style={{ marginBottom: '24px' }}>
              <StatCard 
                icon={<Clock size={24} />} 
                label={t('cumulativeHours')} 
                value={`${selectedEmployeeRecord?.totalHours || '0.0'}h`}
                color="#6366f1"
              />
              <StatCard 
                icon={<Wallet size={24} />} 
                label={t('grossAmount')} 
                value={formatVND(selectedEmployeeRecord?.earnings || 0)}
                color="#f59e0b"
              />
              <StatCard 
                icon={<TrendingUp size={24} />} 
                label={t('hourlyRate')} 
                value={formatVND(selectedEmployeeRecord?.employee?.hourlyRate || 0).replace(' ₫', ' ₫/h')}
                color="#10b981"
              />
              <StatCard 
                icon={<CheckCircle2 size={24} />} 
                label={t('status')} 
                value={t((selectedEmployeeRecord?.status || 'PENDING').toLowerCase())}
                color={selectedEmployeeRecord?.status === 'PAID' ? '#10b981' : '#f59e0b'}
              />
            </div>

            {/* Underline-style Tab Bar Switcher */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '24px', gap: '8px' }}>
              <button 
                onClick={() => setActiveTab('attendance')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'attendance' ? '3px solid var(--primary)' : '3px solid transparent',
                  color: activeTab === 'attendance' ? 'var(--primary)' : 'var(--text-secondary)',
                  padding: '12px 24px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '-1px'
                }}
              >
                {t('history') || 'Attendance Logs'}
              </button>
              <button 
                onClick={() => { setActiveTab('slips'); setSelectedMonth(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'slips' || activeTab === 'calculator' ? '3px solid var(--primary)' : '3px solid transparent',
                  color: activeTab === 'slips' || activeTab === 'calculator' ? 'var(--primary)' : 'var(--text-secondary)',
                  padding: '12px 24px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '-1px'
                }}
              >
                {t('monthlyPayrollSlips') || 'Monthly Slips'}
              </button>
            </div>

            {/* TAB CONTENTS */}
            <div className="glass-card" style={{ padding: '24px' }}>
              {activeTab === 'attendance' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{t('workingHoursHistory')}</h3>
                    <div style={{ width: '200px' }}>
                      <PremiumSelect 
                        placeholder={t('filterMonth') || 'Filter Month'}
                        value={attendanceMonthFilter}
                        onChange={(val: string) => setAttendanceMonthFilter(val)}
                        options={[
                          { label: t('allTime') || 'All Time', value: 'ALL' },
                          ...attendanceMonths.map(m => ({ label: m, value: m }))
                        ]}
                      />
                    </div>
                  </div>
                  <table className="enterprise-table">
                    <thead>
                      <tr>
                        <th>{t('date')}</th>
                        <th>{t('checkin')}</th>
                        <th>{t('checkout')}</th>
                        <th>{t('totalHours') || 'Total Hours'}</th>
                        <th>{t('overtime') || 'Overtime'}</th>
                        <th>{t('status')}</th>
                        <th>{t('action')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceHistoryRows.map(({ date, log, day }) => {
                        const dateText = formatDateDDMMYYYY(date);
                        
                        const todayObj = new Date();
                        todayObj.setHours(0, 0, 0, 0);
                        const rowDate = new Date(date);
                        rowDate.setHours(0, 0, 0, 0);
                        const isFutureOrToday = rowDate.getTime() >= todayObj.getTime();
                        
                        let checkInText = '--:--';
                        let checkOutText = '--:--';
                        let totalHoursText = '0.0h';
                        let overtimeHoursText = '0.0h';
                        let badgeClass = 'absent';
                        let displayStatus = 'Absent';
                        
                        if (log) {
                          const siteId = log.siteId || selectedEmployeeRecord?.employee?.siteId;
                          const logSite = sites.find((s: any) => s.id === siteId);
                          const workingStartTime = logSite?.workingStartTime || '07:00';

                          const { totalHours, overtimeHours } = getLogHoursAndOvertime(log, workingStartTime);
                          checkInText = log.clockIn ? new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--';
                          checkOutText = log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--';
                          totalHoursText = totalHours > 0 ? `${totalHours.toFixed(1)}h` : '0.0h';
                          overtimeHoursText = overtimeHours > 0 ? `${overtimeHours.toFixed(1)}h` : '0.0h';
                          
                          // Check if late based on site workingStartTime and 10-minute grace period
                          const checkInTime = new Date(log.clockIn);
                          const [startHour, startMinute] = workingStartTime.split(':').map(Number);
                          const scheduledStart = new Date(checkInTime);
                          scheduledStart.setHours(startHour, startMinute, 0, 0);
                          const lateDiffMins = Math.round((checkInTime.getTime() - scheduledStart.getTime()) / 60000);
                          const isLate = lateDiffMins > 10;

                          const statusVal = (log.status || '').toUpperCase();
                          badgeClass = 'pending';
                          displayStatus = 'Pending';
                          if (statusVal === 'ABSENT') {
                            badgeClass = 'absent';
                            displayStatus = 'Absent';
                          } else if (statusVal === 'LATE' || isLate) {
                            badgeClass = 'late';
                            displayStatus = 'Late';
                          } else if (statusVal === 'PRESENT' || statusVal === 'APPROVED' || statusVal === 'PAID') {
                            badgeClass = 'present';
                            displayStatus = 'Present';
                          }
                        } else if (isFutureOrToday) {
                          badgeClass = 'scheduled';
                          displayStatus = 'Scheduled';
                        }

                        return (
                          <tr key={log?.id || `absent-day-${day}`}>
                            <td>{dateText}</td>
                            <td>{checkInText}</td>
                            <td>{checkOutText}</td>
                            <td>{totalHoursText}</td>
                            <td>{overtimeHoursText}</td>
                            <td>
                              <span className={`badge badge-${badgeClass}`}>
                                {displayStatus}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>


                                {log && (
                                  <button 
                                    className="icon-btn" 
                                    onClick={() => {
                                      setSelectedProofLog(log);
                                      setShowProofModal(true);
                                    }} 
                                    title="Proof of Attendance" 
                                    style={{ color: '#0ea5e9', borderColor: 'rgba(14, 165, 233, 0.2)', backgroundColor: 'rgba(14, 165, 233, 0.05)' }}
                                  >
                                    <Camera size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {(!attendanceHistoryRows || attendanceHistoryRows.length === 0) && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                            {t('noLogsRecorded') || 'No logs recorded.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'slips' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{t('monthlyPayrollSlips')}</h3>
                    <div style={{ width: '200px' }}>
                      <PremiumSelect 
                        placeholder={t('filterMonth') || 'Filter Month'}
                        value={slipsMonthFilter}
                        onChange={(val: string) => setSlipsMonthFilter(val)}
                        options={[
                          { label: t('allMonths', 'All Months'), value: 'ALL' },
                          ...availableSlipMonths.map(m => ({ label: m, value: m }))
                        ]}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', overflowX: 'auto', paddingBottom: '12px', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
                    {availableSlipMonths
                      .filter(monthKey => slipsMonthFilter === 'ALL' || monthKey === slipsMonthFilter)
                      .map(monthKey => {
                        const logs = groupedMonths[monthKey] || [];
                        
                        // Calculate monthly quick sum
                        const hours = logs.reduce((sum: number, l: any) => {
                          const inTime = new Date(l.clockIn).getTime();
                          const outTime = l.clockOut ? new Date(l.clockOut).getTime() : inTime;
                          return sum + ((outTime - inTime) / 3600000);
                        }, 0);

                        const rate = selectedEmployeeRecord?.employee?.hourlyRate || 25;
                        const earnings = hours * rate;

                        const matchingPayslip = employeePayslips.find(ps => ps.month === monthKey);
                        const payslipStatus = matchingPayslip ? matchingPayslip.status : 'PENDING';

                        let badgeText = t('pending', 'Pending');
                        let badgeClass = 'badge-pending';
                        if (payslipStatus === 'PROCESSING' || payslipStatus === 'FINALIZED') {
                          badgeText = t('processing', 'Processing');
                          badgeClass = 'badge-processing';
                        } else if (payslipStatus === 'PAID') {
                          badgeText = t('paid', 'Paid');
                          badgeClass = 'badge-paid';
                        }

                        return (
                          <div key={monthKey} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', border: `1px solid ${payslipStatus === 'PAID' ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`, width: '100%', flexShrink: 0, scrollSnapAlign: 'start', background: payslipStatus === 'PAID' ? 'rgba(16,185,129,0.04)' : undefined }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h4 style={{ margin: 0, fontWeight: 'bold', fontSize: '16px' }}>{monthKey}</h4>
                              <span className={`badge ${badgeClass}`}>
                                {badgeText}
                              </span>
                            </div>
                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span>{t('hoursWorked') || 'Hours worked'}: <strong>{hours.toFixed(1)}h</strong></span>
                              <span>{t('estimatedSalary') || 'Estimated salary'}: <strong>{formatVND(matchingPayslip ? matchingPayslip.netPay : earnings)}</strong></span>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                              <button 
                                className="btn btn-secondary" 
                                onClick={() => {
                                  if (matchingPayslip) {
                                    handleViewSlip(matchingPayslip);
                                  } else {
                                    addToast(t('generatePayslipFirst', 'Please generate or calculate the payslip first'), 'info');
                                  }
                                }}
                                disabled={!matchingPayslip}
                                style={{ flex: 1, padding: '8px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                              >
                                <FileText size={14} /> {t('view', 'View')}
                              </button>

                              <button 
                                className="btn btn-secondary" 
                                onClick={() => {
                                  setSelectedMonth(monthKey);
                                  setActiveTab('calculator');
                                }}
                                disabled={payslipStatus === 'PAID'}
                                title={payslipStatus === 'PAID' ? (t('cannotEditPaid') || 'Cannot edit a paid payslip') : undefined}
                                style={{ flex: 1, padding: '8px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', opacity: payslipStatus === 'PAID' ? 0.45 : 1, cursor: payslipStatus === 'PAID' ? 'not-allowed' : 'pointer' }}
                              >
                                {payslipStatus === 'PAID' ? (
                                  <><CheckCircle2 size={14} style={{ color: '#10b981' }} /> {t('paid', 'Paid')}</>
                                ) : matchingPayslip ? t('edit', 'Edit') : t('calculate', 'Calculate')}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    {availableSlipMonths.length === 0 && (
                      <div style={{ width: '100%', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        {t('noPayslipData') || 'No payroll data found for this employee.'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'calculator' && (
                <div>
                  {!selectedMonth ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                      {t('selectMonthFirst') || 'Please select a month from the'} <strong>{t('monthlyPayrollSlips') || 'Monthly Payroll Slips'}</strong> {t('tabFirst') || 'tab first.'}
                    </div>
                  ) : (() => {
                    const matchingPayslip = employeePayslips.find(ps => ps.month === selectedMonth);
                    const payslipStatus = matchingPayslip ? matchingPayslip.status : 'PENDING';
                    const isLocked = payslipStatus === 'FINALIZED' || payslipStatus === 'PAID';

                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        {/* Left: Input parameters */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{t('calculatingForMonth') || 'Calculating payroll for'}: {selectedMonth}</h3>
                            <button className="btn btn-ghost" onClick={() => setSelectedMonth('')}>{t('changeMonth') || 'Change Month'}</button>
                          </div>

                          {/* Additions Section */}
                          <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                              <PlusCircle size={18} /> {t('additionsAllowances')}
                            </h4>
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px' }}>{t('foodAllowance')}</label>
                              <input 
                                type="number" 
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-bright)', color: 'var(--text-primary)' }}
                                value={foodAllowance}
                                onChange={(e) => setFoodAllowance(Math.max(0, parseInt(e.target.value) || 0))}
                                disabled={isLocked}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px' }}>{t('otherAllowances')}</label>
                              <input 
                                type="number" 
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-bright)', color: 'var(--text-primary)' }}
                                value={otherAllowance}
                                onChange={(e) => setOtherAllowance(Math.max(0, parseInt(e.target.value) || 0))}
                                disabled={isLocked}
                              />
                            </div>
                          </div>

                          {/* Deductions Section */}
                          <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                              <MinusCircle size={18} /> {t('deductions')}
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px' }}>{t('taxRatePercent')}</label>
                                <input 
                                  type="number" 
                                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-bright)', color: 'var(--text-primary)' }}
                                  value={taxRate}
                                  onChange={(e) => setTaxRate(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                                  disabled={isLocked}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px' }}>{t('insuranceDeduction')}</label>
                                <input 
                                  type="number" 
                                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-bright)', color: 'var(--text-primary)' }}
                                  value={insuranceDeduction}
                                  onChange={(e) => setInsuranceDeduction(Math.max(0, parseInt(e.target.value) || 0))}
                                  disabled={isLocked}
                                />
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px' }}>{t('advancePayment')}</label>
                                <input 
                                  type="number" 
                                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-bright)', color: 'var(--text-primary)' }}
                                  value={advancePayment}
                                  onChange={(e) => setAdvancePayment(Math.max(0, parseInt(e.target.value) || 0))}
                                  disabled={isLocked}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px' }}>{t('otherDeductions')}</label>
                                <input 
                                  type="number" 
                                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-bright)', color: 'var(--text-primary)' }}
                                  value={otherDeductions}
                                  onChange={(e) => setOtherDeductions(Math.max(0, parseInt(e.target.value) || 0))}
                                  disabled={isLocked}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right: Calculations workspace */}
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div className="glass-card" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--border)' }}>
                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>{t('payrollBreakdown') || 'Payroll Breakdown'}</h4>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{t('workingHoursRegularOT') || 'Working Hours (Regular / OT)'}:</span>
                                <strong>{monthCalculations.regularHours.toFixed(1)}h / {monthCalculations.overtimeHours.toFixed(1)}h</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{t('grossPay') || 'Gross Pay'}:</span>
                                <strong>{formatVND(calculatedNet.gross)}</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                                <span>{t('totalAdditions') || 'Total Additions'}:</span>
                                <strong>+{formatVND(calculatedNet.additions)}</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                                <span>{t('incomeTax') || 'Income Tax'} ({taxRate}%):</span>
                                <strong>-{formatVND(calculatedNet.tax)}</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                                <span>{t('totalDeductions') || 'Total Deductions'}:</span>
                                <strong>-{formatVND(calculatedNet.deductions)}</strong>
                              </div>
                            </div>

                            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{t('netTotal')}</span>
                              <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)' }}>{formatVND(calculatedNet.net)}</span>
                            </div>
                          </div>

                          {payslipStatus === 'PENDING' && (
                            <button 
                              onClick={handleGenerateSlip} 
                              className="btn btn-primary" 
                              style={{ width: '100%', marginTop: '16px', padding: '16px', fontSize: '16px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                            >
                              <Printer size={20} /> {t('generateDraftPayslip', 'Generate Draft Payslip')}
                            </button>
                          )}

                          {payslipStatus === 'GENERATED' && (
                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                              <button 
                                onClick={handleGenerateSlip} 
                                className="btn btn-secondary" 
                                style={{ flex: 1, padding: '16px', fontSize: '16px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                              >
                                <Printer size={20} /> {t('regenerateDraft', 'Re-generate Draft')}
                              </button>
                              <button 
                                onClick={() => handleFinalizeSlip(matchingPayslip.id)} 
                                className="btn btn-primary" 
                                style={{ flex: 1, padding: '16px', fontSize: '16px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#f59e0b', borderColor: '#f59e0b' }}
                              >
                                <CheckCircle2 size={20} /> {t('finalizePayslip', 'Finalize Payslip')}
                              </button>
                            </div>
                          )}

                          {payslipStatus === 'FINALIZED' && (
                            <button 
                              onClick={() => {
                                setPaymentPayslipId(matchingPayslip.id);
                                setShowPaymentModal(true);
                              }} 
                              className="btn btn-primary" 
                              style={{ width: '100%', marginTop: '16px', padding: '16px', fontSize: '16px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#10b981', borderColor: '#10b981' }}
                            >
                              <Wallet size={20} /> {t('proceedToPayment', 'Proceed to Payment')}
                            </button>
                          )}

                          {payslipStatus === 'PAID' && (
                            <div className="glass-card" style={{ marginTop: '16px', padding: '16px', border: '1px solid rgba(16, 185, 129, 0.2)', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 'bold', marginBottom: '8px' }}>
                                <CheckCircle2 size={18} /> {t('paymentDone', 'Payment Completed')}
                              </div>
                              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span>Transaction ID: <strong style={{ color: 'var(--text-primary)' }}>{matchingPayslip.transactionId}</strong></span>
                                {matchingPayslip.receiptPath && (
                                  <a 
                                    href={`${API_URL}${matchingPayslip.receiptPath.startsWith('/') ? matchingPayslip.receiptPath : `/${matchingPayslip.receiptPath}`}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{ color: 'var(--primary)', textDecoration: 'underline', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <FileText size={14} /> {t('viewReceipt', 'View Transfer Receipt')}
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedEmployeeId && !isEmployee && (
        <div className="analytics-dashboard-grid">
          {/* Widget 1: Project Site Allocation (Scales infinitely with scrolling list) */}
          <div className="analytics-widget">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ border: 'none', padding: 0, textTransform: 'none', fontSize: '15px' }}>📍 {t('sitePerformance') || 'Project Site Allocation'}</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{siteWiseData.length} {t('sites') || 'Sites'}</span>
            </div>
            <div style={{ maxHeight: '310px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '6px', marginTop: '8px' }}>
              {siteWiseData.map((site) => {
                const maxPayout = Math.max(...siteWiseData.map(s => s.payout), 1);
                const percentage = Math.min(100, Math.max(5, (site.payout / maxPayout) * 100));
                return (
                  <div key={site.name} className="leaderboard-item" style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.02)' }}>
                    <div className="leaderboard-item-header">
                      <span className="leaderboard-item-name" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                        {site.name}
                      </span>
                      <span className="leaderboard-item-value" style={{ fontSize: '12px' }}>
                        {formatVND(site.payout)} <span style={{ color: 'var(--text-tertiary)', fontWeight: 'normal' }}>({site.hours.toFixed(1)} hrs)</span>
                      </span>
                    </div>
                    <div className="leaderboard-progress-bg" style={{ height: '5px' }}>
                      <div className="leaderboard-progress-fill payout" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
              {siteWiseData.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                  No project allocations found.
                </div>
              )}
            </div>
          </div>

          {/* Widget 2: Salary Bracket Distribution (Clean Donut Chart) */}
          <div className="analytics-widget">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ border: 'none', padding: 0, textTransform: 'none', fontSize: '15px' }}>📊 {t('salaryBracketDistribution') || 'Salary Bracket Distribution'}</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{filteredData.length} {t('records') || 'Staff'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', marginTop: '8px' }}>
              {filteredData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie
                        data={bracketData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="count"
                        nameKey="bracket"
                      >
                        {bracketData.map((_, index) => {
                          const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
                          return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                        })}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`${value} Staff`, name]} contentStyle={{ background: 'var(--surface-bright)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Legend Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', padding: '12px 8px 0 8px', borderTop: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    {bracketData.map((entry, index) => {
                      const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
                      return (
                        <div key={entry.bracket} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[index % COLORS.length], display: 'inline-block', flexShrink: 0 }}></span>
                          <span style={{ color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {entry.bracket}: <strong style={{ color: 'var(--text-primary)' }}>{entry.count}</strong>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="empty-chart" style={{ height: '240px' }}>No bracket data available</div>
              )}
            </div>
          </div>

          {/* Widget 3: Top Earners & Overtime Leaders Leaderboard */}
          <div className="analytics-widget" style={{ gridColumn: '1 / -1' }}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ border: 'none', padding: 0, textTransform: 'none', fontSize: '15px' }}>🏆 {t('leaderboards') || 'Top Performers Leaderboards'}</h3>
            </div>
            <div className="leaderboard-columns" style={{ marginTop: '8px' }}>
              {/* Top Earners */}
              <div>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  💵 {t('topEarners') || 'Top Earners'}
                </h4>
                <div className="leaderboard-list">
                  {topEarners.map((emp, idx) => {
                    const highest = parseFloat(topEarners[0]?.earnings || '1');
                    const current = parseFloat(emp.earnings || '0');
                    const percentage = Math.min(100, Math.max(5, (current / highest) * 100));
                    return (
                      <div key={emp.id} className="leaderboard-item">
                        <div className="leaderboard-item-header">
                          <span className="leaderboard-item-name">{idx + 1}. {emp.employee?.firstName} {emp.employee?.lastName}</span>
                          <span className="leaderboard-item-value">{formatVND(emp.earnings)}</span>
                        </div>
                        <div className="leaderboard-progress-bg">
                          <div className="leaderboard-progress-fill payout" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {topEarners.length === 0 && <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>No data available</div>}
                </div>
              </div>

              {/* Overtime Leaders */}
              <div>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ⚡ {t('overtimeLeaders') || 'Overtime Leaders'}
                </h4>
                <div className="leaderboard-list">
                  {topOvertime.map((emp, idx) => {
                    const highest = parseFloat(topOvertime[0]?.overtimeHours || '1');
                    const current = parseFloat(emp.overtimeHours || '0');
                    const percentage = Math.min(100, Math.max(5, (current / highest) * 100));
                    return (
                      <div key={emp.id} className="leaderboard-item">
                        <div className="leaderboard-item-header">
                          <span className="leaderboard-item-name">{idx + 1}. {emp.employee?.firstName} {emp.employee?.lastName}</span>
                          <span className="leaderboard-item-value">{parseFloat(emp.overtimeHours).toFixed(1)} hrs</span>
                        </div>
                        <div className="leaderboard-progress-bg">
                          <div className="leaderboard-progress-fill overtime" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {topOvertime.length === 0 && <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>No data available</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showProofModal && selectedProofLog && (() => {
          const checkinTimeText = selectedProofLog.clockIn ? new Date(selectedProofLog.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
          const checkoutTimeText = selectedProofLog.clockOut ? new Date(selectedProofLog.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
          const siteId = selectedProofLog.siteId || selectedEmployeeRecord?.employee?.siteId;
          const logSite = sites.find((s: any) => s.id === siteId);
          const siteName = logSite?.name || 'Unknown Site';
          const siteLocation = logSite?.location ? ` (${logSite.location})` : '';
          const siteDisplay = `${siteName}${siteLocation}`;

          return (
            <div className="proof-modal-overlay" style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999,
              padding: '20px'
            }}>
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="glass-card"
                style={{ 
                  maxWidth: '700px', 
                  width: '100%', 
                  padding: '32px', 
                  border: '1px solid rgba(255, 255, 255, 0.08)', 
                  background: 'rgba(23, 23, 23, 0.85)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  borderRadius: '24px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '20px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', background: 'linear-gradient(135deg, #fff 0%, #a5f3fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>
                      {t('attendanceProof', 'Proof of Attendance')}
                    </h3>
                    <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>
                      Captured on {formatDateDDMMYYYY(new Date(selectedProofLog.date || selectedProofLog.clockIn))}
                    </p>
                  </div>
                  <button 
                    onClick={() => { setShowProofModal(false); setSelectedProofLog(null); }} 
                    style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'; }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
                  {/* Check-in Photo */}
                  <motion.div 
                    whileHover={{ y: -4 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.04)' }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#22d3ee', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(34, 211, 238, 0.1)', padding: '4px 12px', borderRadius: '12px' }}>
                      {t('checkin', 'Check-in')}
                    </span>
                    {selectedProofLog.biometricProof ? (
                      <div style={{ width: '100%', height: '240px', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(0,0,0,0.3)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}>
                        <img 
                          src={selectedProofLog.biometricProof.startsWith('http') ? selectedProofLog.biometricProof : `${API_URL}${selectedProofLog.biometricProof.startsWith('/') ? selectedProofLog.biometricProof : `/${selectedProofLog.biometricProof}`}`} 
                          alt="Check-in Proof" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    ) : (
                      <div style={{ width: '100%', height: '240px', borderRadius: '14px', border: '1px dashed rgba(255, 255, 255, 0.15)', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '10px', color: 'rgba(255, 255, 255, 0.3)' }}>
                        <Camera size={36} style={{ opacity: 0.5 }} />
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>{t('noPhoto', 'No Photo Captured')}</span>
                      </div>
                    )}
                    <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600, marginTop: '4px' }}>
                      Time: <strong style={{ color: '#fff' }}>{checkinTimeText}</strong>
                    </span>
                    <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500, textAlign: 'center', maxWidth: '100%', wordBreak: 'break-word', padding: '0 4px' }}>
                      Site: <strong style={{ color: '#22d3ee' }}>{siteDisplay}</strong>
                    </span>
                  </motion.div>

                  {/* Check-out Photo */}
                  <motion.div 
                    whileHover={{ y: -4 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.04)' }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(167, 139, 250, 0.1)', padding: '4px 12px', borderRadius: '12px' }}>
                      {t('checkout', 'Check-out')}
                    </span>
                    {selectedProofLog.biometricProofOut ? (
                      <div style={{ width: '100%', height: '240px', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(0,0,0,0.3)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}>
                        <img 
                          src={selectedProofLog.biometricProofOut.startsWith('http') ? selectedProofLog.biometricProofOut : `${API_URL}${selectedProofLog.biometricProofOut.startsWith('/') ? selectedProofLog.biometricProofOut : `/${selectedProofLog.biometricProofOut}`}`} 
                          alt="Check-out Proof" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    ) : (
                      <div style={{ width: '100%', height: '240px', borderRadius: '14px', border: '1px dashed rgba(255, 255, 255, 0.15)', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '10px', color: 'rgba(255, 255, 255, 0.3)' }}>
                        <Camera size={36} style={{ opacity: 0.5 }} />
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>{t('noPhoto', 'No Photo Captured')}</span>
                      </div>
                    )}
                    <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600, marginTop: '4px' }}>
                      Time: <strong style={{ color: '#fff' }}>{checkoutTimeText}</strong>
                    </span>
                    <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500, textAlign: 'center', maxWidth: '100%', wordBreak: 'break-word', padding: '0 4px' }}>
                      Site: <strong style={{ color: '#a78bfa' }}>{siteDisplay}</strong>
                    </span>
                  </motion.div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => { setShowProofModal(false); setSelectedProofLog(null); }} 
                    style={{ padding: '12px 28px', borderRadius: '12px', fontWeight: '700', fontSize: '14px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {showPaymentModal && (
          <div className="proof-modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '20px'
          }}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="glass-card"
              style={{ 
                maxWidth: '500px', 
                width: '100%', 
                padding: '32px', 
                border: '1px solid var(--border)', 
                background: 'var(--surface-bright)',
                boxShadow: 'var(--shadow-lg)',
                borderRadius: '24px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {t('processPayrollPayment', 'Process Payroll Payment')}
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {t('submitTransactionDetails', 'Enter transaction ID and upload payment receipt')}
                  </p>
                </div>
                <button 
                  onClick={() => { setShowPaymentModal(false); setTransactionId(''); setReceiptFile(null); setReceiptPreview(''); }} 
                  style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', transition: 'all 0.2s' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Employee Bank Account Details */}
              {(selectedEmployeeRecord?.employee?.bankName || selectedEmployeeRecord?.employee?.accountNumber) && (
                <div style={{ 
                  background: 'var(--surface-hover)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '16px', 
                  padding: '16px', 
                  marginBottom: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('employeeBankDetails', 'Employee Bank Details')}
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px' }}>{t('bankName', 'Bank Name')}</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{selectedEmployeeRecord?.employee?.bankName || '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px' }}>{t('accountNumber', 'Account Number')}</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{selectedEmployeeRecord?.employee?.accountNumber || '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px' }}>{t('accountHolder', 'Account Holder')}</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{selectedEmployeeRecord?.employee?.accountHolderName || '—'}</strong>
                    </div>
                    {selectedEmployeeRecord?.employee?.swiftCode && (
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px' }}>{t('swiftCode', 'SWIFT Code')}</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{selectedEmployeeRecord?.employee?.swiftCode}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handlePaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                    {t('transactionIdLabel', 'Transaction ID')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder={t('enterTransactionId', 'Enter transaction reference number')}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface-bright)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                    {t('transferReceiptLabel', 'Transfer Receipt (Optional)')}
                  </label>
                  <div 
                    onClick={() => document.getElementById('receipt-upload-input')?.click()}
                    style={{ 
                      width: '100%', 
                      height: '180px', 
                      borderRadius: '16px', 
                      border: '2px dashed var(--border)', 
                      background: 'var(--surface-hover)', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      cursor: 'pointer', 
                      transition: 'all 0.2s',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    {receiptPreview ? (
                      <img src={receiptPreview} alt="Receipt Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <>
                        <Camera size={32} style={{ color: 'var(--text-dim)', marginBottom: '8px' }} />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{t('uploadReceiptText', 'Upload receipt image')}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>PNG, JPG or JPEG</span>
                      </>
                    )}
                  </div>
                  <input 
                    id="receipt-upload-input"
                    type="file" 
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setReceiptFile(file);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setReceiptPreview(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button 
                    type="button" 
                    className="btn btn-ghost" 
                    onClick={() => { setShowPaymentModal(false); setTransactionId(''); setReceiptFile(null); setReceiptPreview(''); }} 
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '700' }}
                  >
                    {t('cancel', 'Cancel')}
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '700' }}
                  >
                    {t('submitPayment', 'Confirm Payment')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Payroll;
