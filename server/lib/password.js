const MIN_LENGTH = 12;

function validatePasswordPolicy(password) {
  const errors = [];
  const pw = typeof password === 'string' ? password : '';

  if (pw.length < MIN_LENGTH) errors.push(`Must be at least ${MIN_LENGTH} characters`);
  if (!/[A-Z]/.test(pw)) errors.push('Must contain at least 1 uppercase letter');
  if (!/[a-z]/.test(pw)) errors.push('Must contain at least 1 lowercase letter');
  if (!/[0-9]/.test(pw)) errors.push('Must contain at least 1 number');
  if (!/[^A-Za-z0-9]/.test(pw)) errors.push('Must contain at least 1 special character');

  return errors;
}

module.exports = { validatePasswordPolicy, MIN_LENGTH };
