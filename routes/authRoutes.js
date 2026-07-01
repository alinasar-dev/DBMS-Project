const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { verifyToken, JWT_SECRET } = require('../middleware/authMiddleware');

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { role, identifier, password } = req.body;
    try {
        let rows = [];
        if (role === 'student') {
            const result = await pool.query('SELECT * FROM Students WHERE email = $1 AND password = $2', [identifier, password]);
            rows = result.rows;
            if (rows.length) {
                const user = { id: rows[0].student_id, name: rows[0].name, role: 'student', email: rows[0].email };
                const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
                return res.json({ success: true, user, token });
            }
        } else if (role === 'admin') {
            const result = await pool.query('SELECT * FROM Administrators WHERE email = $1 AND password = $2', [identifier, password]);
            rows = result.rows;
            if (rows.length) {
                const user = { id: rows[0].admin_id, name: rows[0].name, role: 'admin', email: rows[0].email };
                const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
                return res.json({ success: true, user, token });
            }
        } else if (role === 'staff') {
            const result = await pool.query('SELECT * FROM Maintenance_Staff WHERE email = $1 AND password = $2', [identifier, password]);
            rows = result.rows;
            if (rows.length) {
                const user = { id: rows[0].staff_id, name: rows[0].name, role: 'staff', email: rows[0].email };
                const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
                return res.json({ success: true, user, token });
            }
        }
        return res.status(401).json({ success: false, error: 'Invalid credentials. Please check your email and password.' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { student_id, name, email, password, department } = req.body;
    try {
        await pool.query(
            'INSERT INTO Students (student_id, name, email, password, department) VALUES ($1, $2, $3, $4, $5)',
            [student_id, name, email, password, department]
        );
        res.json({ success: true });
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ success: false, error: 'Email or Student ID already registered.' });
        return res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/auth/me (verify token & return session user)
router.get('/me', verifyToken, async (req, res) => {
    try {
        const { id, role } = req.user;
        let rows = [];
        if (role === 'student') {
            const result = await pool.query('SELECT student_id as id, name, email FROM Students WHERE student_id = $1', [id]);
            rows = result.rows;
        } else if (role === 'admin') {
            const result = await pool.query('SELECT admin_id as id, name, email FROM Administrators WHERE admin_id = $1', [id]);
            rows = result.rows;
        } else if (role === 'staff') {
            const result = await pool.query('SELECT staff_id as id, name, email FROM Maintenance_Staff WHERE staff_id = $1', [id]);
            rows = result.rows;
        }
        if (!rows.length) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }
        return res.json({ success: true, user: { id: rows[0].id, name: rows[0].name, role, email: rows[0].email } });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
