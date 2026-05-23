#!/usr/bin/env node

/**
 * Generate a secure JWT_SECRET for Railway deployment
 * Run: node generate-jwt-secret.js
 */

const crypto = require('crypto');

function generateJWTSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

const secret = generateJWTSecret();

console.log('🔐 Generated JWT_SECRET (copy this to Railway environment variables):\n');
console.log(secret);
console.log('\n✅ Secret length:', secret.length, 'characters');
console.log('📌 Add this to Railway → your service → Variables → JWT_SECRET');
