const express = require('express');
const router = express.Router();
const db = require('../database');
const config = require('../config');

router.get('/login', (req, res) => {
  if (req.session && req.session.authenticated) return res.redirect('/');
  const cfg = config.loadConfig();
  res.render('login', { error: null, cfg });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const cfg = config.loadConfig();
  const valid = db.verifyPassword(username, password);
  if (valid) {
    const user = db.getUserByUsername(username);
    req.session.authenticated = true;
    req.session.user = username;
    req.session.role = user.role;
    return res.redirect('/');
  }
  res.render('login', { error: 'Invalid username or password', cfg });
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
