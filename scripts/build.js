const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// Helper to resolve paths from root
const fromRoot = (...args) => path.join(rootDir, ...args);

console.log('Building MVV...');

try {
  // 1. Clean up temporary files
  const resDir = fromRoot('src', 'res');
  if (fs.existsSync(resDir)) {
    const files = fs.readdirSync(resDir);
    for (const file of files) {
      if (file.endsWith('~')) {
        fs.unlinkSync(path.join(resDir, file));
      }
    }
  }

  // 2. Recreate docs directory
  const docsDir = fromRoot('docs');
  fs.rmSync(docsDir, { recursive: true, force: true });
  fs.mkdirSync(docsDir, { recursive: true });
  fs.mkdirSync(fromRoot('docs', 'res'), { recursive: true });
  fs.mkdirSync(fromRoot('docs', 'src'), { recursive: true });

  // 3. Compile TypeScript
  console.log('Running TypeScript compiler (tsc)...');
  execSync('npx tsc', { stdio: 'inherit', cwd: rootDir });

  // 4. Copy static assets and library files
  console.log('Copying static assets...');

  // Copy LICENSE
  fs.cpSync(fromRoot('LICENSE'), fromRoot('docs', 'LICENSE'), { force: true });

  // Copy HTML and CSS files from src/
  const srcFiles = fs.readdirSync(fromRoot('src'));
  for (const file of srcFiles) {
    if (file.endsWith('.html') || file.endsWith('.css')) {
      fs.cpSync(fromRoot('src', file), fromRoot('docs', file), { force: true });
    }
  }

  // Copy popbox
  const popboxSrc = fromRoot('src', 'popbox');
  if (fs.existsSync(popboxSrc)) {
    fs.cpSync(popboxSrc, fromRoot('docs', 'popbox'), { recursive: true, force: true });
  }

  // Copy res
  const resSrc = fromRoot('src', 'res');
  if (fs.existsSync(resSrc)) {
    fs.cpSync(resSrc, fromRoot('docs', 'res'), { recursive: true, force: true });
  }

  // Copy js/* files to docs/
  const jsDir = fromRoot('js');
  if (fs.existsSync(jsDir)) {
    const jsFiles = fs.readdirSync(jsDir);
    for (const file of jsFiles) {
      fs.cpSync(path.join(jsDir, file), fromRoot('docs', file), { recursive: true, force: true });
    }
  }

  // Copy source .ts files to docs/src/ (for source maps and reference)
  for (const file of srcFiles) {
    if (file.endsWith('.ts')) {
      fs.cpSync(fromRoot('src', file), fromRoot('docs', 'src', file), { force: true });
    }
  }

  console.log('Success');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
