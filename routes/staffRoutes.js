const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');

// Protect staff routes
router.use(verifyToken);

// GET /api/staff
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT staff_id, name, email, department, phone FROM Maintenance_Staff');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/staff
router.post('/', async (req, res) => {
    const { name, email, password, department, phone } = req.body;
    if (!name || !email || !password || !department || !phone) {
        return res.status(400).json({ success: false, error: 'All staff fields are required.' });
    }
    try {
        const { rows } = await pool.query(
            'INSERT INTO Maintenance_Staff (name, email, password, department, phone) VALUES ($1, $2, $3, $4, $5) RETURNING staff_id',
            [name, email, password, department, phone]
        );
        res.json({ success: true, id: rows[0].staff_id });
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ success: false, error: 'Email already registered for another staff member.' });
        return res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/staff/:id
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM Maintenance_Staff WHERE staff_id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
