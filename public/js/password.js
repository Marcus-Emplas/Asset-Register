/* Client-side mirror of server/lib/password.js — UX hints only, never the source of truth. */
function validatePasswordPolicy(password) {
  const errors = [];
  const pw = typeof password === 'string' ? password : '';

  if (pw.length < 12) errors.push('Must be at least 12 characters');
  if (!/[A-Z]/.test(pw)) errors.push('Must contain at least 1 uppercase letter');
  if (!/[a-z]/.test(pw)) errors.push('Must contain at least 1 lowercase letter');
  if (!/[0-9]/.test(pw)) errors.push('Must contain at least 1 number');
  if (!/[^A-Za-z0-9]/.test(pw)) errors.push('Must contain at least 1 special character');

  return errors;
}
