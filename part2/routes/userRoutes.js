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
  // Make sure to return all the session information in usable format
  res.json({ user: req.session.user, user_id: req.session.user_id, role: req.session.role });
});

// POST login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.execute(`
      SELECT user_id, email, role FROM Users
      WHERE username = ? AND password_hash = ?
    `, [username, password]);
      // If the user isn't found
    if (rows.length === 0) {
      console.log("invalid credentials");
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Otherwise, store all the information about the user as part of the session
    req.session.user = username;
    req.session.user_id = rows[0].user_id;
    req.session.role = rows[0].role;
    res.status(200).json({ role: req.session.role });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get dogs & details
router.get('/dogs', async (req, res) => {
    try {
        const dogs = await db.execute('SELECT Users.username, Dogs.name, Dogs.size, Dogs.owner_id, Dogs.dog_id FROM Dogs LEFT JOIN Users ON Dogs.owner_id=Users.user_id');
        let response = dogs[0];
        let payload = {};
        for (let i = 0; i < response.length; i++) {
            let current_dog = {
                dog_name: response[i].name,
                size: response[i].size,
                owner_id: response[i].owner_id,
                dog_id: response[i].dog_id
            };
            payload[i] = (current_dog);
        }
        payload.count = response.length;
        res.json(payload);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch dogs' });
    }
});

// Get user dogs
router.get('/userDogs', async (req, res) => {
  try {
    const dogs = await db.execute('SELECT')
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user dogs' })
  }
})

module.exports = router;