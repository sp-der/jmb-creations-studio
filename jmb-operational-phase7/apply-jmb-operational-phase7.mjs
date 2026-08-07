import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = path.join(root, 'src/routes/custom-orders.tsx');
if (!fs.existsSync(file)) {
  console.error('Could not find src/routes/custom-orders.tsx. Run this from the JMB repo root.');
  process.exit(1);
}

let text = fs.readFileSync(file, 'utf8');
const oldLine = '      window.location.assign(result.accessUrl);';
const newLine = '      window.location.assign(`/guest/custom/${result.request.id}?token=${encodeURIComponent(result.guestToken)}`);';

if (text.includes(newLine)) {
  console.log('Guest custom-chat redirect is already fixed.');
} else if (text.includes(oldLine)) {
  text = text.replace(oldLine, newLine);
  fs.writeFileSync(file, text);
  console.log('Updated guest custom-chat redirect to stay on the current site origin.');
} else {
  console.error('Could not find the expected guest redirect line. The route may have changed.');
  process.exit(1);
}
