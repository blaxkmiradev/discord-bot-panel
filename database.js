const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'panel.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      max_servers INTEGER NOT NULL DEFAULT 3,
      max_ram INTEGER NOT NULL DEFAULT 512,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      entry_point TEXT NOT NULL DEFAULT 'index.js',
      ram_limit INTEGER NOT NULL DEFAULT 512,
      cpu_limit INTEGER NOT NULL DEFAULT 100,
      owner TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert default settings if not exist
  const insertSetting = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
  insertSetting.run('site_name', 'Bot Panel');
  insertSetting.run('logo_url', '');
  insertSetting.run('default_ram', '512');
  insertSetting.run('default_cpu', '100');
  insertSetting.run('max_servers_per_user', '5');

  // Create default admin if no admin exists
  const adminCount = db.prepare(`SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'`).get();
  if (adminCount.cnt === 0) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASS || 'admin123', 10);
    db.prepare(`INSERT OR IGNORE INTO users (username, password, role, max_servers, max_ram) VALUES (?, ?, 'admin', 999, 8192)`)
      .run(process.env.ADMIN_USER || 'admin', hash);
  }
}

// ── Settings ──────────────────────────────────────────────
function getSetting(key) {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
}

function getAllSettings() {
  const rows = getDb().prepare('SELECT key, value FROM settings').all();
  const obj = {};
  rows.forEach(r => obj[r.key] = r.value);
  return obj;
}

// ── Users ──────────────────────────────────────────────────
function getUserByUsername(username) {
  return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function getAllUsers() {
  return getDb().prepare("SELECT id, username, role, max_servers, max_ram, created_at FROM users WHERE role != 'admin'").all();
}

function createUser(username, password, maxServers, maxRam) {
  const hash = bcrypt.hashSync(password, 10);
  try {
    getDb().prepare('INSERT INTO users (username, password, role, max_servers, max_ram) VALUES (?, ?, ?, ?, ?)')
      .run(username, hash, 'user', maxServers, maxRam);
    return { success: true };
  } catch (e) {
    return { success: false, message: 'Username already exists' };
  }
}

function deleteUser(username) {
  getDb().prepare("DELETE FROM users WHERE username = ? AND role != 'admin'").run(username);
}

function updateAdminCredentials(newUsername, newPassword) {
  const db = getDb();
  if (newPassword) {
    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare("UPDATE users SET password = ? WHERE role = 'admin'").run(hash);
  }
  if (newUsername) {
    db.prepare("UPDATE users SET username = ? WHERE role = 'admin'").run(newUsername);
  }
}

function verifyPassword(username, password) {
  const user = getUserByUsername(username);
  if (!user) return false;
  return bcrypt.compareSync(password, user.password);
}

// ── Servers (metadata) ─────────────────────────────────────
function getServerMeta(id) {
  const row = getDb().prepare('SELECT * FROM servers WHERE id = ?').get(id);
  if (!row) return { entryPoint: 'index.js', name: id, ramLimit: 512, cpuLimit: 100 };
  return {
    name: row.name,
    entryPoint: row.entry_point,
    ramLimit: row.ram_limit,
    cpuLimit: row.cpu_limit,
    owner: row.owner,
  };
}

function saveServerMeta(id, meta) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM servers WHERE id = ?').get(id);
  if (existing) {
    db.prepare('UPDATE servers SET name=?, entry_point=?, ram_limit=?, cpu_limit=?, owner=? WHERE id=?')
      .run(meta.name || id, meta.entryPoint || 'index.js', meta.ramLimit || 512, meta.cpuLimit || 100, meta.owner || null, id);
  } else {
    db.prepare('INSERT INTO servers (id, name, entry_point, ram_limit, cpu_limit, owner) VALUES (?,?,?,?,?,?)')
      .run(id, meta.name || id, meta.entryPoint || 'index.js', meta.ramLimit || 512, meta.cpuLimit || 100, meta.owner || null);
  }
}

function deleteServerMeta(id) {
  getDb().prepare('DELETE FROM servers WHERE id = ?').run(id);
}

function getAllServerMetas() {
  return getDb().prepare('SELECT * FROM servers').all().map(row => ({
    id: row.id,
    name: row.name,
    entryPoint: row.entry_point,
    ramLimit: row.ram_limit,
    cpuLimit: row.cpu_limit,
    owner: row.owner,
    createdAt: row.created_at,
  }));
}

module.exports = {
  getDb,
  getSetting,
  setSetting,
  getAllSettings,
  getUserByUsername,
  getAllUsers,
  createUser,
  deleteUser,
  updateAdminCredentials,
  verifyPassword,
  getServerMeta,
  saveServerMeta,
  deleteServerMeta,
  getAllServerMetas,
};
