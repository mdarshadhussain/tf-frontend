const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Employees.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Update imports
if (!content.includes('downloadEmployeeTemplate')) {
  content = content.replace(
    'importEmployeesFromExcel } from',
    'importEmployeesFromExcel, downloadEmployeeTemplate } from'
  );
}

// Replace downloadTemplate function
const newDownloadFunc = `  const downloadTemplate = async () => {
    try {
      setLoading(true);
      const blob = await downloadEmployeeTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Employee_Import_Template.xlsx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      addToast(err.message || 'Failed to download template', 'error');
    } finally {
      setLoading(false);
    }
  };`;

const regex = /const downloadTemplate = \(\) => \{[\s\S]*?document\.body\.removeChild\(link\);\s*\};/;
content = content.replace(regex, newDownloadFunc);

fs.writeFileSync(filePath, content);
console.log("Successfully updated template download logic in UI");
