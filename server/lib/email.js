const sgMail = require('@sendgrid/mail');

if (process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendPasswordResetEmail(email, code) {
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
    console.warn(`SendGrid not configured — password reset code for ${email}: ${code}`);
    return;
  }
  await sgMail.send({
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: 'Your TheAssetHub password reset code',
    text: `Your password reset code is ${code}. It expires in 15 minutes. If you didn't request this, you can ignore this email.`,
    html: `<p>Your password reset code is:</p><p style="font-size:20px;font-weight:600;letter-spacing:2px;">${code}</p><p>It expires in 15 minutes. If you didn't request this, you can ignore this email.</p>`,
  });
}

module.exports = { sendPasswordResetEmail };
