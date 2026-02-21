const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'bin', 'officeagent');
const linkDir = path.join(__dirname, '..', 'node_modules', '.bin');
const link = path.join(linkDir, 'officeagent');

try {
  fs.mkdirSync(linkDir, { recursive: true });
  try { fs.unlinkSync(link); } catch (e) {}
  fs.symlinkSync(target, link);
} catch (e) {
  // Symlinks may require admin on Windows — not fatal
}
