#!/usr/bin/env node

/**
 * Security Audit Script for Pandora Intel
 * 
 * This script performs various security checks:
 * - Dependency vulnerability scan
 * - Environment variable validation
 * - Security best practices check
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔒 Starting Security Audit for Pandora Intel...\n');

// Check 1: Dependency vulnerabilities
console.log('1. Checking for dependency vulnerabilities...');
try {
  const auditResult = execSync('npm audit --audit-level=moderate', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('✅ No high-severity vulnerabilities found');
} catch (error) {
  console.log('⚠️  Vulnerabilities found:');
  console.log(error.stdout);
}

// Check 2: Environment variables
console.log('\n2. Checking environment variables...');
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  
  // Check for hardcoded secrets
  const secretPatterns = [
    /password\s*=\s*[^"\s]+/gi,
    /secret\s*=\s*[^"\s]+/gi,
    /key\s*=\s*[^"\s]+/gi,
    /token\s*=\s*[^"\s]+/gi
  ];
  
  let hasSecrets = false;
  secretPatterns.forEach(pattern => {
    if (pattern.test(envContent)) {
      console.log('⚠️  Potential hardcoded secrets found in .env file');
      hasSecrets = true;
    }
  });
  
  if (!hasSecrets) {
    console.log('✅ No hardcoded secrets found');
  }
} else {
    console.log('ℹ️  .env file not found (this is normal for production)');
}

// Check 3: Security headers
console.log('\n3. Checking security configuration...');
const indexFile = path.join(__dirname, '..', 'index.js');
if (fs.existsSync(indexFile)) {
  const indexContent = fs.readFileSync(indexFile, 'utf8');
  
  const securityChecks = [
    { name: 'Helmet middleware', pattern: /helmet\(\)/ },
    { name: 'CORS configuration', pattern: /cors\(/ },
    { name: 'Rate limiting', pattern: /rateLimit\(/ },
    { name: 'JWT authentication', pattern: /jsonwebtoken/ },
    { name: 'Password hashing', pattern: /bcrypt/ }
  ];
  
  securityChecks.forEach(check => {
    if (check.pattern.test(indexContent)) {
      console.log(`✅ ${check.name} is configured`);
    } else {
      console.log(`❌ ${check.name} is missing`);
    }
  });
}

// Check 4: File permissions
console.log('\n4. Checking file permissions...');
const sensitiveFiles = [
  '.env',
  'config.js',
  'package.json'
];

sensitiveFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const mode = stats.mode & parseInt('777', 8);
    if (mode > parseInt('644', 8)) {
      console.log(`⚠️  ${file} has overly permissive permissions (${mode.toString(8)})`);
    } else {
      console.log(`✅ ${file} has appropriate permissions`);
    }
  }
});

console.log('\n🔒 Security audit completed!');
console.log('\n📋 Recommendations:');
console.log('- Run "npm audit fix" to fix vulnerabilities');
console.log('- Ensure .env files are in .gitignore');
console.log('- Use strong, unique JWT secrets in production');
console.log('- Regularly update dependencies');
console.log('- Monitor logs for suspicious activity');
