var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

let db;

(async () => {
  try {
    // Connect to MySQL without specifying a database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '' // Set your MySQL root password
    });

    // Create the database if it doesn't exist
    await connection.query('CREATE DATABASE IF NOT EXISTS DogWalkService');
    await connection.end();

    // Now connect to the created database
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'DogWalkService'
    });

    // Create a table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('owner', 'walker') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Dogs (
    dog_id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    size ENUM('small', 'medium', 'large') NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES Users(user_id)
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS WalkRequests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    dog_id INT NOT NULL,
    requested_time DATETIME NOT NULL,
    duration_minutes INT NOT NULL,
    location VARCHAR(255) NOT NULL,
    status ENUM('open', 'accepted', 'completed', 'cancelled') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dog_id) REFERENCES Dogs(dog_id)
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS WalkApplications (
    application_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    walker_id INT NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
    FOREIGN KEY (walker_id) REFERENCES Users(user_id),
    CONSTRAINT unique_application UNIQUE (request_id, walker_id)
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS WalkRatings (
    rating_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    walker_id INT NOT NULL,
    owner_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comments TEXT,
    rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
    FOREIGN KEY (walker_id) REFERENCES Users(user_id),
    FOREIGN KEY (owner_id) REFERENCES Users(user_id),
    CONSTRAINT unique_rating_per_walk UNIQUE (request_id)
      )
    `);

    // Insert data if table is empty
    const [rows] = await db.execute('SELECT COUNT(*) AS count FROM Users');
    if (rows[0].count === 0) {
      await db.execute(`
        INSERT INTO Users (username, email, password_hash, role)
        VALUES
        ('alice123', 'alice@exmaple.com', 'hashed123', 'owner'),
        ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
        ('carol123', 'carol@example.com', 'hashed789', 'owner'),
        ('timmy123', 'timmy@anotherexample.com', 'hashed234', 'walker'),
        ('jimmy321', 'jimmy321@example.com', 'hashed345', 'owner');

        INSERT INTO Dogs (name, size, owner_id)
        SELECT 'Max', 'medium', user_id FROM Users WHERE username='alice123';

        INSERT INTO Dogs (name, size, owner_id)
        SELECT 'Bella', 'small', user_id FROM Users WHERE username='carol123';

        INSERT INTO Dogs (name, size, owner_id)
        SELECT 'Harry', 'large', user_id FROM Users WHERE username='carol123';

        INSERT INTO Dogs (name, size, owner_id)
        SELECT 'Cat', 'small', user_id FROM Users WHERE username='jimmy321';

        INSERT INTO Dogs (name, size, owner_id)
        SELECT 'Fluffy', 'large', user_id FROM Users WHERE username='carol123';

        INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location)
        SELECT dog_id, '2025-06-10 08:00:00', 30, 'Parklands' FROM Dogs WHERE name='Max';

        INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
        SELECT dog_id, '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted' FROM Dogs WHERE name='Bella';

        INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
        SELECT dog_id, '2025-05-10 10:30:00', 90, 'Glenelg', 'completed' FROM Dogs WHERE name='Harry';

        INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location)
        SELECT dog_id, '2025-06-13 11:30:00', 10, 'North Terrace' FROM Dogs WHERE name='Fluffy';

        INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
        SELECT dog_id, '2025-06-29 19:30:00', 5, 'Adelaide', 'cancelled' FROM Dogs WHERE name='Cat';
      `);
    }
  } catch (err) {
    console.error('Error setting up database. Ensure Mysql is running: service mysql start', err);
  }
})();

app.get('/api/dogs', async (req, res) => {
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
        res.json(payload);
    } catch (err) {
      console.log(err);
        res.status(500).json({ error: 'Failed to fetch dogs' });
    }
});

app.get('/api/walkrequests/open', async (req, res) => {
    try {
        const open_requests = await db.execute("SELECT Users.username, Dogs.name, WalkRequests.requested_time, WalkRequests.duration_minutes, WalkRequests.request_id, WalkRequests.location FROM WalkRequests LEFT JOIN Dogs ON WalkRequests.dog_id=Dogs.dog_id LEFT JOIN Users ON Dogs.owner_id=Users.user_id WHERE status='open'");
        let response = open_requests[0]
        let payload = {};
        for (let i = 0; i < response.length; i++) {
            let current_walk = {
                request_id: response[i].request_id,
                dog_name: response[i].name,
                requested_time: response[i].requested_time,
                duration_minutes: response[i].duration_minutes,
                location: response[i].location,
                owner_username: response[i].username
            };
            payload.push(current_walk);
        }
        res.json(payload);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch open walk requests' });
    }
});

app.get('/api/walkers/summary', async (req, res) => {
    try {
        const walkers = await db.execute("SELECT Users.username, WalkRatings.rating FROM Users LEFT JOIN WalkRatings ON WalkRatings.walker_id=user_id WHERE role='walker'");
        let response = walkers[0];
        let payload = {};
        for (let i = 0; i < response.length; i++) {
            let found = false;
            let current_walker_name = response[i].username;
            for (let j = 0; j < payload.length; j++) {
                if (payload[j].walker_username === current_walker_name && response[i].rating) {
                    payload[j].average_rating = (payload[j].average_rating
                        * payload[j].total_ratings + response[i].rating)
                        / (payload[j].total_ratings + 1);
                    payload[j].completed_walks++;
                    payload[j].total_ratings++;
                    found = true;
                }
            }
            if (!found) {
                if (!response[i].rating) {
                    let new_walker = {
                        walker_username: current_walker_name,
                        total_ratings: 0,
                        average_rating: null,
                        completed_walks: 0
                    };
                    payload.push(new_walker);
                } else {
                    let new_walker = {
                        walker_username: current_walker_name,
                        total_ratings: 1,
                        average_rating: response[i].rating,
                        completed_walks: 1
                    };
                    payload.push(new_walker);
                }
            }
        }
        res.json(payload);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch walker summary' });
    }
});

app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;
