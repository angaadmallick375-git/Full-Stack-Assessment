const { Pool } = require('pg');
const { PGlite } = require('@electric-sql/pglite');
const path = require('path');
const fs = require('fs');

class PGlitePool {
  constructor() {
    const dataDir = path.resolve(__dirname, '..', 'db_data');
    console.log('📦 Using local PGlite database:', dataDir);

    const lockFile = path.join(dataDir, 'postmaster.pid');
    if (fs.existsSync(lockFile)) {
      try {
        fs.unlinkSync(lockFile);
      } catch (err) {
        console.warn('⚠️ Could not remove PGlite lock file:', err.message);
      }
    }

    this.initPromise = PGlite.create(dataDir).then((db) => {
      this.db = db;
      console.log('✅ PGlite initialized');
      return db;
    });

    this.eventListeners = {};
  }

  on(event, callback) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(callback);
  }

  async query(sql, params) {
    const db = await this.initPromise;
    const res = await db.query(sql, params);
    const rowCount = res.affectedRows !== undefined ? res.affectedRows : (res.rows ? res.rows.length : 0);
    return { rows: res.rows || [], rowCount, fields: res.fields || [] };
  }

  async connect() {
    const db = await this.initPromise;
    return {
      query: async (sql, params) => {
        const res = await db.query(sql, params);
        const rowCount = res.affectedRows !== undefined ? res.affectedRows : (res.rows ? res.rows.length : 0);
        return { rows: res.rows || [], rowCount, fields: res.fields || [] };
      },
      release: () => {},
    };
  }

  async end() {
    const db = await this.initPromise;
    await db.close();
  }
}

async function verifyPostgres(pool) {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}

async function createPool() {
  if (process.env.DATABASE_URL) {
    const useSsl =
      process.env.DATABASE_SSL === 'true' ||
      process.env.PGSSLMODE === 'require' ||
      process.env.NODE_ENV === 'production';

    const pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pgPool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error:', err);
    });

    try {
      await verifyPostgres(pgPool);
      console.log('🐘 PostgreSQL connected (DATABASE_URL)');
      return pgPool;
    } catch (err) {
      await pgPool.end().catch(() => {});
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`PostgreSQL connection failed: ${err.message}`);
      }
      console.warn('⚠️ DATABASE_URL invalid — falling back to PGlite:', err.message);
    }
  }

  console.log('💡 Using embedded PGlite (local dev)');
  return new PGlitePool();
}

let pool;
const poolReady = createPool().then((p) => {
  pool = p;
  return p;
});

const poolProxy = {
  query: (...args) => poolReady.then((p) => p.query(...args)),
  connect: () => poolReady.then((p) => p.connect()),
  end: () => poolReady.then((p) => p.end()),
  on: (...args) => poolReady.then((p) => p.on(...args)),
};

module.exports = poolProxy;
