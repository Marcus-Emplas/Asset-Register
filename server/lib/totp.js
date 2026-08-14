const otplib = require('otplib');
const QRCode = require('qrcode');

const ISSUER = 'Asset Register';

async function generateSecret() {
  return otplib.generateSecret();
}

async function buildEnrollment(email, secret) {
  const uri = await otplib.generateURI({ issuer: ISSUER, label: email, secret, type: 'totp' });
  const qr = await QRCode.toDataURL(uri);
  return { qr, manualKey: secret, uri };
}

async function verifyToken(secret, token) {
  if (!secret || !token) return false;
  try {
    const result = await otplib.verify({ secret, token: String(token), type: 'totp' });
    return !!(result && result.valid);
  } catch (e) {
    return false;
  }
}

module.exports = { generateSecret, buildEnrollment, verifyToken };
