const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET all users (for admin/testing)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id, username, email, role FROM Users');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST a new user (simple signup)
router.post('/register', async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    const [result] = await db.query(`
      INSERT INTO Users (username, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `, [username, email, password, role]);

    res.status(201).json({ message: 'User registered', user_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  res.json(req.session.user);
});

// POST login (dummy version)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query(`
      SELECT user_id, username, role FROM Users
      WHERE email = ? AND password_hash = ?
    `, [email, password]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ message: 'Login successful', user: rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get dogs & details
router.get('/dogs', async (req, res) => {
    try {
        const dogs = await db.execute('SELECT Users.username, Dogs.name, Dogs.size, Dogs.owner_id FROM Dogs LEFT JOIN Users ON Dogs.owner_id=Users.user_id');
        let response = dogs[0];
        let payload = {};
        for (let i = 0; i < response.length; i++) {
            let current_dog = {
                dog_name: response[i].name,
                size: response[i].size,
                owner_username: response[i].username
            };
            payload[i] = (current_dog);
        }
        payload.count = response.length;
        res.json(payload);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch dogs' });
    }
});

module.exports = router;