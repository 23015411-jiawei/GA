const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const app = express();
const bcrypt = require('bcrypt'); // for password hashing

// MySQL Connection
const db = mysql.createConnection({
    host: 'db4free.net',
    user: 'jiaweii',
    password: 'Mrwong123',
    database: 'c368_ga'
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL Database.');
});

let balance = 0;
let transactions = [];

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Routes to render EJS templates
app.get('/', (req, res) => {
    res.render('welcome');
});

app.get('/welcome', (req, res) => {
    res.render('welcome');
});

app.get('/home', (req, res) => {
    res.render('home', { balance: balance });
});

app.get('/about', (req, res) => {
    res.render('about');
});

app.get('/subscription', (req, res) => {
    res.render('subscription');
});

app.get('/wallet', (req, res) => {
    res.render('wallet', { balance: balance, transactions: transactions });
});

app.get('/transaction-history', (req, res) => {
    res.render('transaction-history', { transactions: transactions });
});

app.get('/subscription-success.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'subscription-success.html'));
});

app.get('/create-account', (req, res) => {
    res.render('createaccount');
});

app.post('/create-account', (req, res) => {
    const { name, email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
        return res.send('Passwords do not match');
    }

    // Hash the password before storing it in the database
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error('Error hashing password:', err);
            return res.status(500).send('Server error');
        }

        const query = 'INSERT INTO user (name, email, password) VALUES (?, ?, ?)';
        db.query(query, [name, email, hash], (err, results) => {
            if (err) {
                console.error('Error inserting user into database:', err);
                return res.status(500).send('Server error');
            }
            console.log('User created:', results.insertId);
            res.redirect('/login');  // Redirect to login page after successful account creation
        });
    });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const query = 'SELECT * FROM user WHERE email = ?';
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Error fetching user from database:', err);
            return res.status(500).send('Server error');
        }

        if (results.length === 0) {
            return res.send('No user found with this email');
        }

        const user = results[0];

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.status(500).send('Server error');
            }

            if (!isMatch) {
                return res.send('Invalid email or password');
            }

            res.redirect('/home');
        });
    });
});

app.post('/topup', (req, res) => {
    const amount = parseFloat(req.body.amount);
    if (!isNaN(amount)) {
        balance += amount;
        transactions.push({ date: new Date().toISOString().split('T')[0], type: 'Deposit', amount: amount });
    }
    res.redirect('/wallet');
});

app.post('/transfer', (req, res) => {
    const amount = parseFloat(req.body.amount);
    if (!isNaN(amount) && balance >= amount) {
        balance -= amount;
        transactions.push({ date: new Date().toISOString().split('T')[0], type: 'Withdrawal', amount: amount });
    }
    res.redirect('/wallet');
});

app.get('/purchase/:plan', (req, res) => {
    const plan = req.params.plan;
    let price;

    switch (plan) {
        case 'basic':
            price = 20;
            break;
        case 'standard':
            price = 50;
            break;
        case 'premium':
            price = 100;
            break;
        default:
            res.status(400).send('Invalid plan');
            return;
    }

    if (balance >= price) {
        balance -= price;
        transactions.push({ type: 'Purchase', plan: plan.charAt(0).toUpperCase() + plan.slice(1), amount: price.toFixed(2), date: new Date().toLocaleString() });
        res.redirect('/subscription-success.html');
    } else {
        res.status(400).send('Insufficient funds');
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});












