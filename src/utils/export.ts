export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;

  // High-Fidelity Executive Mapping Manifest
  const mapping = [
    { label: 'Employee ID', key: 'employeeId' },
    { label: 'First Name', key: 'firstName' },
    { label: 'Last Name', key: 'lastName' },
    { label: 'Email', key: 'email' },
    { label: 'Phone', key: 'phone' },
    { label: 'Designation', key: 'designation' },
    { label: 'Role', key: 'role' },
    { label: 'Status', key: 'status' },
    { label: 'Hourly Rate ($)', key: 'hourlyRate' },
    { label: 'Overtime Type', key: 'overtimeType' },
    { label: 'Overtime Value', key: 'overtimeValue' },
    { label: 'Passport Number', key: 'passportNumber' },
    { label: 'Date of Birth', key: 'dob', transform: (v: any) => v ? new Date(v).toLocaleDateString() : '--' },
    { label: 'Assigned Site', key: 'site', transform: (v: any) => v?.name || 'Unassigned' },
    { label: 'Enrolled On', key: 'createdAt', transform: (v: any) => new Date(v).toLocaleDateString() }
  ];

  const headers = mapping.map(m => m.label);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      mapping.map(m => {
        let val = row[m.key];
        if (m.transform) val = m.transform(val);
        // Decommission line breaks and ensure robust string conversion
        const stringVal = val === null || val === undefined ? '' : String(val).replace(/[\n\r]+/g, ' ').trim();
        // Ensure high-fidelity CSV escaping
        return `"${stringVal.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ];

  const csvString = csvRows.join('\n');
  // Add UTF-8 BOM for high-fidelity Excel compatibility
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
