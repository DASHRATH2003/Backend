const nodemailer = require('nodemailer');
const { db } = require('../db');
const usePg = process.env.USE_POSTGRES === 'true' || !!process.env.DATABASE_URL;

function buildTransporter(account) {
  const demo = process.env.DEMO_MODE === 'true';

  if (demo || !account?.smtp_host) {
    return nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    });
  }

  return nodemailer.createTransport({
    host: account.smtp_host,
    port: account.smtp_port || 587,
    secure: false,
    auth: { user: account.email, pass: account.password },
  });
}

const subjects = [
  'Quick check-in',
  'Following up on yesterday',
  'Small update',
  'Heads up',
  'Question about the doc',
];
const bodies = [
  'Just touching base on this. Let me know what you think.',
  'Sharing a minor update — nothing urgent.',
  'Adding a note here so we don’t forget.',
  'Looks good from my side. Thanks!',
  'Flagging this for later review. Cheers!',
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function sendWarmUpEmail(senderAccount, receiverAccount) {
  const transporter = buildTransporter(senderAccount);
  const mailOptions = {
    from: senderAccount.email,
    to: receiverAccount.email,
    subject: `Warm-up: ${randomItem(subjects)}`,
    text: `${randomItem(bodies)}\n\nRef: ${Math.random().toString(36).slice(2)}`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    db.run(
      usePg
        ? `INSERT INTO logs (sender, receiver, status, message_id, error, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6)`
        : `INSERT INTO logs (sender, receiver, status, message_id, error, timestamp)
           VALUES (?, ?, ?, ?, ?, ?)`,
      [
        senderAccount.email,
        receiverAccount.email,
        'sent',
        info?.messageId || 'demo',
        null,
        new Date().toISOString(),
      ]
    );
    return { ok: true };
  } catch (err) {
    db.run(
      usePg
        ? `INSERT INTO logs (sender, receiver, status, message_id, error, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6)`
        : `INSERT INTO logs (sender, receiver, status, message_id, error, timestamp)
           VALUES (?, ?, ?, ?, ?, ?)`,
      [
        senderAccount.email,
        receiverAccount.email,
        'error',
        null,
        err?.message || String(err),
        new Date().toISOString(),
      ]
    );
    return { ok: false, error: err?.message };
  }
}

module.exports = { sendWarmUpEmail };