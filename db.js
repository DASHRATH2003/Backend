const path = require('path');
const sqlite3 = require('sqlite3').verbose();
let Pool;
try { Pool = require('pg').Pool; } catch (_) {}

const usePg = !!(process.env.USE_POSTGRES === 'true' || process.env.DATABASE_URL);
const DATE_NOW_EXPR = usePg ? 'CURRENT_DATE' : "date('now')";

let db;
let DB_PATH = null;

async function initPg(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      smtp_host TEXT,
      smtp_port INTEGER,
      imap_host TEXT,
      imap_port INTEGER,
      use_tls BOOLEAN DEFAULT TRUE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY,
      sender TEXT,
      receiver TEXT,
      status TEXT,
      message_id TEXT,
      error TEXT,
      timestamp TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      daily_volume INTEGER DEFAULT 2,
      max_volume INTEGER DEFAULT 20,
      demo_mode BOOLEAN DEFAULT TRUE,
      last_reset DATE
    )
  `);

  await pool.query(`
    INSERT INTO settings (id, daily_volume, max_volume, demo_mode, last_reset)
    VALUES (1, 2, 20, TRUE, CURRENT_DATE)
    ON CONFLICT (id) DO NOTHING
  `);
}

function wrapPg(pool) {
  return {
    run(sql, params = [], cb) {
      pool
        .query(sql, params)
        .then((res) => cb && cb(null, res))
        .catch((err) => cb && cb(err));
    },
    get(sql, paramsOrCb, maybeCb) {
      let params = [];
      let cb = maybeCb;
      if (typeof paramsOrCb === 'function') {
        cb = paramsOrCb;
      } else {
        params = paramsOrCb || [];
      }
      pool
        .query(sql, params)
        .then((res) => cb && cb(null, res.rows[0]))
        .catch((err) => cb && cb(err));
    },
    all(sql, paramsOrCb, maybeCb) {
      let params = [];
      let cb = maybeCb;
      if (typeof paramsOrCb === 'function') {
        cb = paramsOrCb;
      } else {
        params = paramsOrCb || [];
      }
      pool
        .query(sql, params)
        .then((res) => cb && cb(null, res.rows))
        .catch((err) => cb && cb(err));
    },
  };
}

function initSqlite() {
  DB_PATH = path.join(__dirname, 'data.db');
  const sqliteDb = new sqlite3.Database(DB_PATH);

  sqliteDb.serialize(() => {
    sqliteDb.run(
      `CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        password TEXT NOT NULL,
        smtp_host TEXT,
        smtp_port INTEGER,
        imap_host TEXT,
        imap_port INTEGER,
        use_tls INTEGER DEFAULT 1
      )`
    );

    sqliteDb.run(
      `CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender TEXT,
        receiver TEXT,
        status TEXT,
        message_id TEXT,
        error TEXT,
        timestamp TEXT
      )`
    );

    sqliteDb.run(
      `CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        daily_volume INTEGER DEFAULT 2,
        max_volume INTEGER DEFAULT 20,
        demo_mode INTEGER DEFAULT 1,
        last_reset TEXT
      )`
    );

    sqliteDb.run(
      `INSERT OR IGNORE INTO settings (id, daily_volume, max_volume, demo_mode, last_reset)
       VALUES (1, 2, 20, 1, date('now'))`
    );
  });

  return sqliteDb;
}

let pool;
if (usePg && Pool) {
  // Normalize scheme and set SSL if required (Render PG needs SSL)
  let conn = process.env.DATABASE_URL || '';
  if (conn.startsWith('postgresql://')) {
    conn = 'postgres://' + conn.slice('postgresql://'.length);
  }
  const PG_SSL = process.env.PG_SSL === 'true' || /render\.com/.test(conn);
  pool = new Pool({ connectionString: conn, ssl: PG_SSL ? { rejectUnauthorized: false } : undefined });
  db = wrapPg(pool);
  // initialize schema
  initPg(pool).catch((err) => {
    console.error('Postgres init error:', err);
  });
} else {
  db = initSqlite();
}

function getSettings(cb) {
  db.get('SELECT * FROM settings WHERE id = 1', (err, row) => {
    if (err) return cb(err);
    cb(null, row);
  });
}

function setSettings({ daily_volume, max_volume }, cb) {
  if (usePg && Pool) {
    db.run(
      `UPDATE settings SET daily_volume = COALESCE($1, daily_volume), max_volume = COALESCE($2, max_volume) WHERE id = 1`,
      [daily_volume, max_volume],
      cb
    );
  } else {
    db.run(
      `UPDATE settings SET daily_volume = COALESCE(?, daily_volume), max_volume = COALESCE(?, max_volume) WHERE id = 1`,
      [daily_volume, max_volume],
      cb
    );
  }
}

module.exports = { db, DB_PATH, getSettings, setSettings, DATE_NOW_EXPR };