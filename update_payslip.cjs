const fs = require('fs');
const path = require('path');

// --- 1. Update PayslipModal.tsx ---
const tsxFile = path.join(__dirname, 'src', 'components', 'PayslipModal.tsx');
let tsxContent = fs.readFileSync(tsxFile, 'utf8');

const oldHeader = `<header className="receipt-header">
                  <h1>TRACKFORCE</h1>
                  <p>{t('salaryReceipt')}</p>
                  <div className="receipt-divider"></div>
                </header>`;

const newHeader = `<header className="receipt-header">
                  <h1 style={{ fontSize: '18px', marginBottom: '4px' }}>CÔNG TY TNHH KỸ THUẬT ELEMECS VIỆT NAM</h1>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold' }}>TAX CODE : 0317597681</p>
                  <p style={{ fontWeight: 'bold', fontSize: '16px' }}>{t('salaryReceipt')}</p>
                  <div className="receipt-divider"></div>
                </header>`;

tsxContent = tsxContent.replace(oldHeader, newHeader);
fs.writeFileSync(tsxFile, tsxContent);

// --- 2. Update PayslipModal.css ---
const cssFile = path.join(__dirname, 'src', 'components', 'PayslipModal.css');
let cssContent = fs.readFileSync(cssFile, 'utf8');

// Replace hardcoded light colors with CSS variables for dark mode support
cssContent = cssContent.replace(/background: #fff;/g, 'background: var(--bg-card, #fff);');
cssContent = cssContent.replace(/color: #1a1a1a;/g, 'color: var(--text-primary, #1a1a1a);');
cssContent = cssContent.replace(/color: #000;/g, 'color: var(--text-primary, #000);');
cssContent = cssContent.replace(/border-bottom: 2px solid #000;/g, 'border-bottom: 2px solid var(--text-primary, #000);');
cssContent = cssContent.replace(/border-bottom: 1px dashed #000;/g, 'border-bottom: 1px dashed var(--text-primary, #000);');
cssContent = cssContent.replace(/border-top: 2px solid #000;/g, 'border-top: 2px solid var(--text-primary, #000);');

// Make sure print overrides variables
if (!cssContent.includes('border-color: #000 !important;')) {
  cssContent = cssContent.replace(
    '  #printable-payslip {\n    position: fixed !important;',
    `  #printable-payslip, .receipt-container {\n    color: #000 !important;\n  }\n  .receipt-divider, .receipt-divider.dashed, .receipt-total {\n    border-color: #000 !important;\n  }\n  #printable-payslip {\n    position: fixed !important;`
  );
}

fs.writeFileSync(cssFile, cssContent);

console.log("Payslip UI updated successfully!");
