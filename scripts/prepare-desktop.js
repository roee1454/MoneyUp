const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const desktopResourcesDir = path.join(rootDir, 'apps/desktop/resources');
const binDir = path.join(desktopResourcesDir, 'bin');
const serverDestDir = path.join(desktopResourcesDir, 'server');

// Helper function to recursively delete directories and files matching criteria
function pruneDirectory(dir) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    
    let stat;
    try {
      stat = fs.lstatSync(fullPath);
    } catch (e) {
      // If lstat fails (e.g. on a very broken entry), delete it directly
      try {
        fs.unlinkSync(fullPath);
      } catch (err) {}
      continue;
    }

    if (stat.isSymbolicLink()) {
      fs.unlinkSync(fullPath);
    } else if (stat.isDirectory()) {
      const lowerName = file.toLowerCase();
      // Delete test, documentation and unused assets folders
      if (['test', 'tests', '__tests__', 'spec', 'specs', 'docs', 'documentation', 'samples', 'images', 'example', 'examples'].includes(lowerName)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        pruneDirectory(fullPath);
        // If the directory became empty after pruning, remove it
        if (fs.readdirSync(fullPath).length === 0) {
          fs.rmdirSync(fullPath);
        }
      }
    } else {
      const ext = path.extname(file).toLowerCase();
      // Delete development and documentation files (completely safe for runtime)
      if (['.map', '.ts', '.tsx', '.d.ts', '.md', '.markdown'].includes(ext)) {
        fs.unlinkSync(fullPath);
      }
    }
  }
}

function main() {
  console.log('🧹 Cleaning existing resources directory...');
  fs.rmSync(desktopResourcesDir, { recursive: true, force: true });
  fs.mkdirSync(binDir, { recursive: true });
  fs.mkdirSync(serverDestDir, { recursive: true });

  // 1. Build workspace packages, client and server
  console.log('📦 Building packages and applications...');
  execSync('pnpm build:packages', { cwd: rootDir, stdio: 'inherit' });
  execSync('pnpm build:client', { cwd: rootDir, stdio: 'inherit' });
  execSync('pnpm build:server', { cwd: rootDir, stdio: 'inherit' });

  // 2. Pack workspace packages into tarballs in the root directory
  console.log('📦 Packing local dependencies to tarballs...');
  execSync('pnpm --filter=@money-up/common pack', { cwd: rootDir, stdio: 'inherit' });
  execSync('pnpm --filter=@money-up/types pack', { cwd: rootDir, stdio: 'inherit' });

  // 3. Copy the active Node.js binary (platform specific)
  const isWindows = process.platform === 'win32';
  const nodeDestName = isWindows ? 'node.exe' : 'node';
  const nodeSource = process.execPath;
  const nodeDest = path.join(binDir, nodeDestName);

  console.log(`Copying Node binary from ${nodeSource} to ${nodeDest}...`);
  fs.copyFileSync(nodeSource, nodeDest);
  fs.chmodSync(nodeDest, 0o755);



  // 4. Copy server files (dist and package.json)
  console.log('📂 Staging server files...');
  fs.cpSync(path.join(rootDir, 'apps/server/dist'), path.join(serverDestDir, 'dist'), { recursive: true });
  
  const srcPkgPath = path.join(rootDir, 'apps/server/package.json');
  const destPkgPath = path.join(serverDestDir, 'package.json');
  
  // 5. Modify package.json to point to physical tarballs instead of workspace dependencies
  const pkg = JSON.parse(fs.readFileSync(srcPkgPath, 'utf8'));
  pkg.dependencies['@money-up/common'] = 'file:../../../../money-up-common-1.0.0.tgz';
  pkg.dependencies['@money-up/types'] = 'file:../../../../money-up-types-1.0.0.tgz';
  pkg.dependencies['israeli-bank-scrapers'] = 'file:../../../../libs/israeli-bank-scrapers-patched.tgz';
  
  fs.writeFileSync(destPkgPath, JSON.stringify(pkg, null, 2));

  // 6. Run production npm install in resources directory
  console.log('🚚 Installing flat production dependencies via npm...');
  execSync('npm install --omit=dev --no-audit --no-fund', {
    cwd: serverDestDir,
    stdio: 'inherit',
    env: { ...process.env, PUPPETEER_SKIP_DOWNLOAD: 'true' },
  });

  // 6.1 Smart Pruning of node_modules
  console.log('🧹 Running smart dependency pruning on node_modules...');
  const nodeModulesPath = path.join(serverDestDir, 'node_modules');
  
  // Deleting completely unused compile-time packages
  const prunePackages = ['typescript', '@swc', 'ts-node', '@types'];
  for (const pkgName of prunePackages) {
    const targetPkgPath = path.join(nodeModulesPath, pkgName);
    if (fs.existsSync(targetPkgPath)) {
      console.log(`🗑️  Removing compiler package: ${pkgName}`);
      fs.rmSync(targetPkgPath, { recursive: true, force: true });
    }
  }

  // Recursively clean docs, tests, and map files from other packages
  pruneDirectory(nodeModulesPath);

  // 7. Clean up temporary tarballs in root
  console.log('🧹 Cleaning up temporary tarballs...');
  fs.rmSync(path.join(rootDir, 'money-up-common-1.0.0.tgz'), { force: true });
  fs.rmSync(path.join(rootDir, 'money-up-types-1.0.0.tgz'), { force: true });

  console.log('✅ Desktop resources successfully prepared and optimized!');
}

main();
