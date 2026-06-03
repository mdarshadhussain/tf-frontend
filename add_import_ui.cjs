const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Employees.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
content = content.replace(
  "import { fetchEmployees, deleteEmployee, fetchSites } from '../api/api';",
  "import { fetchEmployees, deleteEmployee, fetchSites, importEmployeesFromExcel } from '../api/api';"
);
content = content.replace(
  "  Phone,\n} from 'lucide-react';",
  "  Phone,\n  Upload,\n  FileSpreadsheet\n} from 'lucide-react';"
);

// 2. Add functions inside component
const funcInsertPoint = "const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);";
const funcs = `
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const headers = ['Employee ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Role', 'Designation', 'Password', 'Site ID', 'Hourly Rate'];
    const sample = ['EMP001', 'John', 'Doe', 'john@example.com', '+1234567890', 'EMPLOYEE', 'Engineer', '123456', '', '25'];
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(',') + '\\n' 
        + sample.join(',');
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "employee_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setLoading(true);
      const res = await importEmployeesFromExcel(file);
      addToast(res.message, 'success');
      if (res.errors && res.errors.length > 0) {
        // Show the first error as well if there were partial failures
        addToast(\`\${res.errors.length} errors occurred, e.g. \${res.errors[0]}\`, 'error');
      }
      loadEmployees();
    } catch (err: any) {
      addToast(err.message || 'Failed to import employees', 'error');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
`;

if (!content.includes('const downloadTemplate = () => {')) {
  // We need React.useRef, so let's import React if missing, wait React is usually not needed to be explicitly imported in vite, but let's use it as React.useRef or just import it.
  content = content.replace(
    "import { useEffect, useState } from 'react';",
    "import React, { useEffect, useState, useRef } from 'react';"
  );
  content = content.replace(/fileInputRef = React\.useRef/g, 'fileInputRef = useRef');

  content = content.replace(funcInsertPoint, funcInsertPoint + '\n' + funcs);
}

// 3. Add Buttons
const buttonsInsertPoint = `          <div className="header-actions">`;
const buttons = `
            <input 
              type="file" 
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
              style={{ display: 'none' }} 
              ref={fileInputRef}
              onChange={handleFileUpload} 
            />
            <button className="btn btn-ghost" onClick={downloadTemplate}>
              <FileSpreadsheet size={18} /> {t('Template')}
            </button>
            <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>
              <Upload size={18} /> {t('Import')}
            </button>
`;

if (!content.includes('ref={fileInputRef}')) {
  content = content.replace(buttonsInsertPoint, buttonsInsertPoint + buttons);
}

fs.writeFileSync(filePath, content);
console.log("Successfully updated Employees.tsx");
