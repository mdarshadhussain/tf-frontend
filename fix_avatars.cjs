const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;

      // Fix img tags rendering avatar.
      // We look for <img ... avatar ... /> that do not already have onError
      // This is a simple regex that matches <img src={...avatar...} ... />
      // Since regex on JSX is hard, let's just do targeted replacements for the specific files we know.
      
      const replacements = [
        {
          file: 'EmployeeDetails.tsx',
          find: `<img src={employee.avatar.startsWith('http') ? employee.avatar : \`\${API_URL}\${employee.avatar}\`} alt="" />`,
          replace: `<img src={employee.avatar.startsWith('http') ? employee.avatar : \`\${API_URL}\${employee.avatar}\`} alt="" onError={(e) => { e.currentTarget.src = \`https://api.dicebear.com/7.x/avataaars/svg?seed=\${employee.firstName || 'User'}\`; }} />`
        },
        {
          file: 'Employees.tsx',
          find: `{emp.avatar ? <img src={emp.avatar.startsWith('http') ? emp.avatar : \`\${API_URL}\${emp.avatar}\`} alt="Avatar" /> : emp.firstName.charAt(0)}`,
          replace: `{emp.avatar ? <img src={emp.avatar.startsWith('http') ? emp.avatar : \`\${API_URL}\${emp.avatar}\`} alt="Avatar" onError={(e) => { e.currentTarget.src = \`https://api.dicebear.com/7.x/avataaars/svg?seed=\${emp.firstName || 'User'}\`; }} /> : emp.firstName.charAt(0)}`
        }
      ];

      for (const r of replacements) {
        if (fullPath.endsWith(r.file)) {
          content = content.replace(r.find, r.replace);
        }
      }
      
      // Let's also use a general regex to catch other avatar img tags:
      // <img src={...avatar...} alt="..." />
      // We'll just replace the whole tag if it doesn't have onError.
      
      const regex = /<img\s+src=\{[^}]*avatar[^}]*\}.*?(?<!onError=\{[^}]*\})\s*\/>/g;
      content = content.replace(regex, (match) => {
        if (match.includes('onError')) return match;
        // Inject onError before />
        return match.replace(/\/>$/, `onError={(e) => { e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fallback'; }} />`);
      });
      
      // Fix cases where it's <img ... > without closing slash if any
      const regex2 = /<img\s+src=\{[^}]*avatar[^}]*\}[^>]*?(?<!onError=\{[^}]*\})\s*>/g;
      content = content.replace(regex2, (match) => {
        if (match.includes('onError') || match.endsWith('/>')) return match;
        return match.replace(/>$/, ` onError={(e) => { e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fallback'; }}>`);
      });

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed avatars in', fullPath);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
console.log('Done.');
