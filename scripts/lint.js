const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dirs = [
  'lib/core',
  'lib/api',
  'lib/commands',
  'lib/mcp',
  'lib/publish'
];
const files = [
  'bin/cli.js',
  'bin/server.js'
];

let failed = false;

// Scan directories for JS files
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.js')) {
      files.push(path.join(dir, file));
    }
  });
});

// Run syntax check on each file
files.forEach(file => {
  try {
    execSync(`node --check "${file}"`, { stdio: 'ignore' });
  } catch (e) {
    console.error(`Syntax check failed: ${file}`);
    failed = true;
  }
});

if (failed) {
  process.exit(1);
} else {
  console.log('All JavaScript files passed syntax check.');
}
