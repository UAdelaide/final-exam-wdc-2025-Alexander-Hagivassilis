const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');

require('dotenv').config();

// Cookies and sessions
const app = express();

// Middleware
app.use(logger('dev'));
app.use(express.json());

app.use(session({
    secret: 'sup3rs3cr3tstr1ng',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

app.use(express.static(path.join(__dirname, '/public')));

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');
const cookieParser = require('cookie-parser');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

// Export the app instead of listening here
module.exports = app;