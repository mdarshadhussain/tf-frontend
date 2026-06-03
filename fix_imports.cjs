const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Employees.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const target = /Phone,\s*\} from 'lucide-react';/g;

if (target.test(content)) {
  content = content.replace(target, "Phone,\n  Upload,\n  FileSpreadsheet\n} from 'lucide-react';");
  fs.writeFileSync(filePath, content);
  console.log("Successfully fixed imports in Employees.tsx!");
} else {
  console.log("Could not find the target string.");
}
