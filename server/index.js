require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const pool = require('./db/connection');

const isRailway = !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');
const attendanceRoutes = require('./routes/attendance');

const app = express();
const PORT = process.env.PORT || 5000;
const isProductionEnv = () =>
  process.env.NODE_ENV === 'production' || isRailway;

const clientDist = path.resolve(__dirname, '..', 'client', 'dist');
const hasClientBuild = fs.existsSync(path.join(clientDist, 'index.html'));

if (isProductionEnv()) {
  app.set('trust proxy', 1);
}

// Early health check (before DB) for Railway deploy probes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL ? 'configured' : 'missing',
    clientBuild: hasClientBuild,
  });
});

// Middleware
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(null, allowedOrigins[0]);
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auto-migrate on start
const autoMigrate = async () => {
  let client;
  try {
    client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
        UNIQUE(project_id, user_id)
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(300) NOT NULL,
        description TEXT,
        status VARCHAR(30) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
        priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
        due_date DATE,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Add blocked_by column safely if it doesn't exist
    await client.query(`
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocked_by INTEGER REFERENCES tasks(id) ON DELETE SET NULL;
    `);

    // Add Project Activities Timeline Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_activities (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Add tags column safely if it doesn't exist
    await client.query(`
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
    `);

    // Add Task Comments Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_comments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Attendance / punch in-out records
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        punch_in TIMESTAMP NOT NULL DEFAULT NOW(),
        punch_out TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Database tables ready');
  } catch (err) {
    console.error('❌ Migration / Connection error:', err.message);
    if (isProductionEnv()) {
      throw err;
    }
  } finally {
    if (client) client.release();
  }
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);

// Serve React build when dist exists (Railway single-service deploy)
if (hasClientBuild && process.env.SERVE_CLIENT !== 'false') {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
} else if (isProductionEnv()) {
  console.warn('⚠️ client/dist not found — API only. Run build step or set SERVE_CLIENT=false.');
}

// API 404 handler
app.use('/api', (req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found.` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error.' });
});

// Start server
const start = async () => {
  if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is not set. Add it in Railway → Variables.');
    process.exit(1);
  }

  if (isRailway) {
    process.env.NODE_ENV = process.env.NODE_ENV || 'production';
    console.log('🚂 Railway environment detected');
    console.log('   DATABASE_URL:', process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL ? 'set' : 'MISSING');
    console.log('   JWT_SECRET:', process.env.JWT_SECRET ? 'set' : 'MISSING');
    console.log('   Client build:', hasClientBuild ? 'found' : 'MISSING');
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Health: /api/health`);
  });

  server.on('error', (err) => {
    console.error('❌ Server error:', err.message);
    process.exit(1);
  });

  try {
    await autoMigrate();
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
};

start().catch((err) => {
  console.error('❌ Fatal startup error:', err);
  process.exit(1);
});
