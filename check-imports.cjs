const fs = require('fs');
const path = require('path');

const visited = new Set();
const missing = [];
const circularChains = [];

function resolve(importPath, fromFile) {
  if (importPath.startsWith('@/')) {
    return path.join('src', importPath.slice(2));
  } else {
    return path.join(path.dirname(fromFile), importPath);
  }
}

function findFile(resolved) {
  const exts = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
  for (const ext of exts) {
    const full = resolved + ext;
    if (fs.existsSync(full)) return full;
  }
  return null;
}

function checkImportsRecursive(filePath, chain) {
  const normalized = path.normalize(filePath);
  if (visited.has(normalized)) {
    // Check for circular
    const idx = chain.indexOf(normalized);
    if (idx >= 0) {
      circularChains.push(chain.slice(idx).concat(normalized));
    }
    return;
  }
  visited.add(normalized);
  
  if (!fs.existsSync(normalized)) {
    missing.push({ file: normalized, chain: [...chain] });
    return;
  }
  
  const content = fs.readFileSync(normalized, 'utf8');
  const importRegex = /from\s+['"](@\/[^'"]+|\.\.?\/[^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const resolved = resolve(importPath, normalized);
    const actualFile = findFile(resolved);
    if (!actualFile) {
      missing.push({ import: importPath, from: normalized, resolved });
    } else {
      checkImportsRecursive(actualFile, [...chain, normalized]);
    }
  }
}

checkImportsRecursive('src/pages/admin/AdminSupport.tsx', []);

console.log('\n=== MISSING IMPORTS ===');
if (missing.length === 0) {
  console.log('None found in local imports.');
} else {
  missing.forEach(m => {
    if (m.file) {
      console.log('File not found:', m.file, 'Chain:', m.chain.join(' -> '));
    } else {
      console.log('Import not found:', m.import, 'from', m.from, '(resolved:', m.resolved + ')');
    }
  });
}

console.log('\n=== CIRCULAR DEPENDENCIES ===');
if (circularChains.length === 0) {
  console.log('None found.');
} else {
  circularChains.forEach(c => console.log(c.join(' -> ')));
}

console.log('\n=== FILES VISITED ===');
console.log(visited.size, 'files checked');
visited.forEach(f => console.log(' ', f));
