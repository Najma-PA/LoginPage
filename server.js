require ('dotenv').config()
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static('public'));

// Session configuration
app.use(session({
    name: 'authSession',
    secret: process.env.SESSION_SECRET /*'your-secret-key-change-in-production'*/,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 30 * 60 * 1000 // 30 minutes
    }
}));

// Predefined credentials
const CREDENTIALS = {
   /* username: 'ADMIN',
    password: 'pswrd123'*/
    username: process.env.ADMIN_USER,
    password: process.env.ADMIN_PASS
};

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (req.session.isAuthenticated) {
        // Update session expiration on each request
        req.session._garbage = Date();
        req.session.touch();
        next();
    } else {
        res.redirect('/');
    }
};

// Prevent caching middleware
const noCache = (req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
};

// Routes
app.get('/', noCache, (req, res) => {
    if (req.session.isAuthenticated) {
        return res.redirect('/home');
    }
    res.render('login', { 
        title: 'Login - QueryChat',
        error: null 
    });
});
//Home
app.get('/home', noCache, requireAuth, (req, res) => {
    res.render('home', {
        title: 'Dashboard - QueryChat',
        username: req.session.username
    });
});
//login
app.post('/login', noCache, (req, res) => {
    const { username, password } = req.body;
    
    if (username === CREDENTIALS.username && password === CREDENTIALS.password) {
        req.session.isAuthenticated = true;
        req.session.username = username;
        res.redirect('/home');
    } else {
        res.render('login', {
            title: 'Login - QueryChat',
            error: 'Invalid username or password. Please try again.'
        });
    }
});
//Logout
app.post('/logout', noCache, (req, res) => {
    const username = req.session.username;
    
    req.session.destroy((err) => {
        if (err) {
            console.log('Error destroying session:', err);
            return res.status(500).send('Error during logout');
        }
        
        res.clearCookie('authSession');

        res.redirect('/?cleared=true');
    });
});

// API endpoint to check session status
app.get('/api/session-status', noCache, (req, res) => {
    res.json({
        isAuthenticated: !!req.session.isAuthenticated,
        username: req.session.username,
        loginTime: req.session.loginTime
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('login', {
        title: 'Error - Secure System',
        error: 'An internal server error occurred. Please try again later.'
    });
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});