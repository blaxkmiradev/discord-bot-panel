require('dotenv').config();
const path = require('path');
const fs = require('fs');

const configPath = path.join(__dirname, 'config-data.json');

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {}
  return {
    siteName: 'Bot Panel',
    logoUrl: '',
    adminUser: process.env.ADMIN_USER || 'admin',
    adminPass: process.env.ADMIN_PASS || 'admin123',
  };
}

function saveConfig(cfg) {
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
}

module.exports = {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'changeme_super_secret_key',
  serversDir: path.join(__dirname, 'servers'),
  dataFile: path.join(__dirname, 'panel-data.json'),
  loadConfig,
  saveConfig,
};
