#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Validating Invoice AI Platform Setup...\n');

// Test each workspace
const workspaces = [
  { name: 'Server', path: 'server', script: 'build' },
  { name: 'Admin App', path: 'client/admin', script: 'build' },
  { name: 'Business App', path: 'client/business', script: 'build' }
];

async function testWorkspace(workspace) {
  return new Promise((resolve, reject) => {
    console.log(`📦 Testing ${workspace.name}...`);
    
    const child = spawn('npm', ['run', workspace.script], {
      cwd: path.join(__dirname, workspace.path),
      stdio: 'pipe'
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${workspace.name} - Build successful`);
        resolve();
      } else {
        console.log(`❌ ${workspace.name} - Build failed`);
        console.log(`Error: ${errorOutput}`);
        reject(new Error(`${workspace.name} build failed`));
      }
    });
  });
}

async function main() {
  try {
    // Test builds for all workspaces
    for (const workspace of workspaces) {
      await testWorkspace(workspace);
    }
    
    console.log('\n🎉 All tests passed! Your Invoice AI Platform is ready to use.');
    console.log('\n📋 Quick Start:');
    console.log('1. Copy .env.example to .env and configure your settings');
    console.log('2. Run: npm run setup');
    console.log('3. Run: npm run dev');
    console.log('\n🌐 Access your applications:');
    console.log('• 🖥️  Server: http://localhost:3000');
    console.log('• 👤 Admin: http://localhost:5173');
    console.log('• 💼 Business: http://localhost:5174');
    
  } catch (error) {
    console.log('\n❌ Validation failed. Please check the errors above.');
    process.exit(1);
  }
}

main();