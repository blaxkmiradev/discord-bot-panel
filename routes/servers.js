const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/auth');
const pm = require('../services/processManager');

// Create server
router.post('/create', requireAuth, (req, res) => {
  const { name, entryPoint, ramLimit, cpuLimit } = req.body;
  const id = uuidv4().split('-')[0];
  const serverDir = pm.getServerDir(id);
  fs.mkdirSync(serverDir, { recursive: true });
  pm.saveMeta(id, {
    name: name || id,
    entryPoint: entryPoint || 'index.js',
    ramLimit: parseInt(ramLimit) || 512,
    cpuLimit: parseInt(cpuLimit) || 100,
  });
  if (req.files && req.files.botZip) {
    const zip = new AdmZip(req.files.botZip.data);
    zip.extractAllTo(serverDir, true);
  }
  res.redirect(`/servers/${id}`);
});

// Server detail
router.get('/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const dir = pm.getServerDir(id);
  if (!fs.existsSync(dir)) return res.status(404).send('Server not found');
  const meta = pm.loadMeta(id);
  const status = pm.getStatus(id);
  const logs = pm.getLogs(id);
  res.render('server-detail', { serverId: id, meta, status, logs: logs.join('\n'), user: req.session.user });
});

// Start
router.post('/:id/start', requireAuth, (req, res) => {
  res.json(pm.start(req.params.id));
});

// Stop
router.post('/:id/stop', requireAuth, (req, res) => {
  res.json(pm.stop(req.params.id));
});

// Restart
router.post('/:id/restart', requireAuth, (req, res) => {
  res.json(pm.restart(req.params.id));
});

// Delete
router.post('/:id/delete', requireAuth, (req, res) => {
  const { id } = req.params;
  pm.stop(id);
  const dir = pm.getServerDir(id);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  const db = require('../database');
  db.deleteServerMeta(id);
  res.redirect('/');
});

// Status API
router.get('/:id/status', requireAuth, (req, res) => {
  res.json(pm.getStatus(req.params.id));
});

// Logs API
router.get('/:id/logs', requireAuth, (req, res) => {
  res.json({ logs: pm.getLogs(req.params.id) });
});

// Install npm
router.post('/:id/npm', requireAuth, (req, res) => {
  const { packages } = req.body;
  if (!packages) return res.json({ success: false, message: 'No packages specified' });
  pm.runNpm(req.params.id, packages);
  res.json({ success: true, message: `Installing: ${packages}` });
});

// Update meta
router.post('/:id/meta', requireAuth, (req, res) => {
  const { name, entryPoint, ramLimit, cpuLimit } = req.body;
  const meta = pm.loadMeta(req.params.id);
  if (name) meta.name = name;
  if (entryPoint) meta.entryPoint = entryPoint;
  if (ramLimit) meta.ramLimit = parseInt(ramLimit);
  if (cpuLimit) meta.cpuLimit = parseInt(cpuLimit);
  pm.saveMeta(req.params.id, meta);
  res.json({ success: true });
});

module.exports = router;
