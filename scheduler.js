const cron = require('node-cron');
const { db, getSettings, DATE_NOW_EXPR } = require('./db');
const { sendWarmUpEmail } = require('./services/email');
const { checkAndReplyForAccount } = require('./services/imap');

let schedulerActive = false;

// Daily reset marker
cron.schedule('0 0 * * *', () => {
  db.run(`UPDATE settings SET last_reset = ${DATE_NOW_EXPR} WHERE id = 1`);
});

// Every 5 minutes: perform a few sends
cron.schedule('*/5 * * * *', () => {
  if (!schedulerActive) return;

  getSettings((err, settings) => {
    if (err || !settings) return;
    const dailyVolume = Number(settings.daily_volume) || 2;

    db.all('SELECT * FROM accounts', async (accErr, accounts) => {
      if (accErr || !accounts || accounts.length < 2) return;
      const shuffled = accounts.sort(() => 0.5 - Math.random());

      const sendsThisRun = Math.min(2, Math.max(1, Math.floor(dailyVolume / 8)));
      for (let i = 0; i < sendsThisRun; i++) {
        const from = shuffled[i % shuffled.length];
        const to = shuffled[(i + 1) % shuffled.length];
        await sendWarmUpEmail(from, to);
      }

      if (Math.random() < 0.3) {
        const a = shuffled[0];
        checkAndReplyForAccount(a);
      }
    });
  });
});

function startScheduler() {
  schedulerActive = true;
}

function stopScheduler() {
  schedulerActive = false;
}

function isSchedulerActive() {
  return schedulerActive;
}

module.exports = { startScheduler, stopScheduler, isSchedulerActive };