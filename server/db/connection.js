const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

function shouldUseSsl(connectionString) {
  if (process.env.DATABASE_SSL === 'false') return false;
  if (process.env.DATABASE_SSL === 'true') return { rejectUnauthorized: false };
  if (process.env.PGSSLMODE === 'require') return { rejectUnauthorized: false };
  if (connectionString.includes('sslmode=disable')) return false;
  if (connectionString.includes('railway.internal')) return false;
  if (connectionString.includes('localhost') || connectionString.includes('127.0.0.1')) {
    return false;
  }
  if (process.env.NODE_ENV === 'production') {
    return { rejectUnauthorized: false };
  }
  return false;
}

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

    try {
      const { PGlite } = require('@electric-sql/pglite');
      this.initPromise = (async () => {
        try {
          const db = await PGlite.create(dataDir);
          this.db = db;
          console.log('✅ PGlite initialized');
          return db;
        } catch (error) {
          console.warn('⚠️ PGlite initialization failed:', error.message);
          throw error;
        }
      })();
    } catch (error) {
      console.warn('⚠️ PGlite not available:', error.message);
      this.initPromise = Promise.reject(new Error('PGlite unavailable'));
    }

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
  const isRailway = !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);
  const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL;

  if (isRailway && !databaseUrl) {
    console.warn('⚠️ DATABASE_URL not set on Railway - will use mock database directly (skipping PGlite to prevent memory limits/crash)');
    const MockDB = require('./mock-db');
    return new MockDB();
  }


  if (databaseUrl) {
    const ssl = shouldUseSsl(databaseUrl);

    const pgPool = new Pool({
      connectionString: databaseUrl,
      ssl: ssl || false,
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
      const isProd =
        process.env.NODE_ENV === 'production' ||
        process.env.RAILWAY_ENVIRONMENT ||
        process.env.RAILWAY_PROJECT_ID;
      if (isProd) {
        throw new Error(`PostgreSQL connection failed: ${err.message}`);
      }
      if (process.env.DEBUG) {
        console.log('Database fallback: DATABASE_URL invalid');
      }
    }
  }

  // Try PGlite
  try {
    if (process.env.DEBUG) {
      console.log('💡 Attempting PGlite initialization...');
    }
    const pool = new PGlitePool();
    // Test if PGlite actually initializes
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('PGlite initialization timeout'));
      }, 5000);
      
      pool.query('SELECT 1').then(() => {
        clearTimeout(timeout);
        resolve();
      }).catch((err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
    return pool;
  } catch (err) {
    if (process.env.DEBUG) {
      console.log('PGlite initialization failed, using Mock Database');
    }
    const MockDB = require('./mock-db');
    return new MockDB();
  }
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
