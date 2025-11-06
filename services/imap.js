const imapSimple = require('imap-simple');
const { db } = require('../db');
const { sendWarmUpEmail } = require('./email');
const usePg = process.env.USE_POSTGRES === 'true' || !!process.env.DATABASE_URL;

async function checkAndReplyForAccount(account) {
  const demo = process.env.DEMO_MODE === 'true';
  if (demo || !account?.imap_host) {
    if (Math.random() < 0.2) {
      await sendWarmUpEmail(account, account);
    }
    return;
  }

  try {
    const connection = await imapSimple.connect({
      imap: {
        user: account.email,
        password: account.password,
        host: account.imap_host,
        port: account.imap_port || 993,
        tls: true,
      },
    });

    await connection.openBox('INBOX');
    const searchCriteria = ['UNSEEN'];
    const fetchOptions = { bodies: ['HEADER'], markSeen: true };
    const messages = await connection.search(searchCriteria, fetchOptions);

    for (const _msg of messages) {
      await sendWarmUpEmail(account, account);
    }
    connection.end();
  } catch (err) {
    db.run(
      usePg
        ? `INSERT INTO logs (sender, receiver, status, message_id, error, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6)`
        : `INSERT INTO logs (sender, receiver, status, message_id, error, timestamp)
           VALUES (?, ?, ?, ?, ?, ?)`,
      [account.email, account.email, 'imap_error', null, err?.message || String(err), new Date().toISOString()]
    );
  }
}

module.exports = { checkAndReplyForAccount };