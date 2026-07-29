const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'dist');
const files = fs.readdirSync(distDir).filter(f => f.endsWith('.exe') && !f.includes('Setup') && !f.includes('unpacked'));
if (files.length === 0) {
  console.error('No exe found in dist/');
  process.exit(1);
}
const exeName = files.sort().pop();
const exePath = path.join(distDir, exeName);
const content = fs.readFileSync(exePath);
const sha512 = crypto.createHash('sha512').update(content).digest('base64');
const size = fs.statSync(exePath).size;
const version = require('../package.json').version;

const yml = `version: ${version}
files:
  - url: ${exeName}
    sha512: ${sha512}
    size: ${size}
path: ${exeName}
sha512: ${sha512}
releaseDate: '${new Date().toISOString()}'
`;

fs.writeFileSync(path.join(distDir, 'latest.yml'), yml);
console.log('Generated latest.yml for ' + exeName);
