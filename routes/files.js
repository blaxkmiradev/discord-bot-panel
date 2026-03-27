const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const pm = require('../services/processManager');

function safePath(serverId, rel) {
  const base = pm.getServerDir(serverId);
  const full = path.resolve(base, rel || '');
  if (!full.startsWith(base)) throw new Error('Path traversal detected');
  return full;
}

// File manager list
router.get('/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const rel = req.query.path || '';
  let full;
  try { full = safePath(id, rel); } catch (e) { return res.status(403).send('Forbidden'); }

  if (!fs.existsSync(full)) return res.status(404).send('Not found');

  const stat = fs.statSync(full);
  if (!stat.isDirectory()) return res.redirect(`/files/${id}/edit?path=${encodeURIComponent(rel)}`);

  const entries = fs.readdirSync(full).map((name) => {
    const p = path.join(full, name);
    const s = fs.statSync(p);
    return {
      name,
      isDir: s.isDirectory(),
      size: s.isDirectory() ? '-' : `${(s.size / 1024).toFixed(1)} KB`,
      mtime: s.mtime.toISOString().replace('T', ' ').slice(0, 19),
      relPath: rel ? `${rel}/${name}` : name,
    };
  }).sort((a, b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name));

  const meta = pm.loadMeta(id);
  res.render('file-manager', {
    serverId: id,
    serverName: meta.name || id,
    currentPath: rel,
    parentPath: rel.includes('/') ? rel.split('/').slice(0, -1).join('/') : '',
    entries,
    user: req.session.user,
  });
});

// Edit file
router.get('/:id/edit', requireAuth, (req, res) => {
  const { id } = req.params;
  const rel = req.query.path || '';
  let full;
  try { full = safePath(id, rel); } catch (e) { return res.status(403).send('Forbidden'); }

  if (!fs.existsSync(full)) return res.status(404).send('File not found');

  const content = fs.readFileSync(full, 'utf8');
  const meta = pm.loadMeta(id);
  const ext = path.extname(rel).replace('.', '') || 'javascript';

  res.render('file-editor', {
    serverId: id,
    serverName: meta.name || id,
    filePath: rel,
    content,
    ext,
    user: req.session.user,
  });
});

// Save file
router.post('/:id/edit', requireAuth, (req, res) => {
  const { id } = req.params;
  const { filePath, content } = req.body;
  let full;
  try { full = safePath(id, filePath); } catch (e) { return res.status(403).json({ success: false }); }

  fs.writeFileSync(full, content, 'utf8');
  res.json({ success: true, message: 'Saved' });
});

// Upload file
router.post('/:id/upload', requireAuth, (req, res) => {
  const { id } = req.params;
  const rel = req.body.path || '';
  if (!req.files || !req.files.file) return res.redirect(`/files/${id}?path=${encodeURIComponent(rel)}`);

  let dir;
  try { dir = safePath(id, rel); } catch (e) { return res.status(403).send('Forbidden'); }

  const file = req.files.file;
  const dest = path.join(dir, file.name);
  file.mv(dest, (err) => {
    if (err) return res.status(500).send('Upload failed: ' + err.message);
    res.redirect(`/files/${id}?path=${encodeURIComponent(rel)}`);
  });
});

// Delete file/folder
router.post('/:id/delete', requireAuth, (req, res) => {
  const { id } = req.params;
  const { filePath } = req.body;
  let full;
  try { full = safePath(id, filePath); } catch (e) { return res.status(403).json({ success: false }); }

  if (!fs.existsSync(full)) return res.json({ success: false, message: 'Not found' });

  const stat = fs.statSync(full);
  if (stat.isDirectory()) {
    fs.rmSync(full, { recursive: true, force: true });
  } else {
    fs.unlinkSync(full);
  }
  res.json({ success: true });
});

// Create new file
router.post('/:id/new-file', requireAuth, (req, res) => {
  const { id } = req.params;
  const { dirPath, fileName } = req.body;
  let full;
  try {
    const dir = safePath(id, dirPath || '');
    full = path.join(dir, fileName);
    if (!full.startsWith(pm.getServerDir(id))) throw new Error('Traversal');
  } catch (e) { return res.status(403).json({ success: false }); }

  fs.writeFileSync(full, '', 'utf8');
  res.json({ success: true });
});

// Create new folder
router.post('/:id/new-folder', requireAuth, (req, res) => {
  const { id } = req.params;
  const { dirPath, folderName } = req.body;
  let full;
  try {
    const dir = safePath(id, dirPath || '');
    full = path.join(dir, folderName);
    if (!full.startsWith(pm.getServerDir(id))) throw new Error('Traversal');
  } catch (e) { return res.status(403).json({ success: false }); }

  fs.mkdirSync(full, { recursive: true });
  res.json({ success: true });
});

module.exports = router;
