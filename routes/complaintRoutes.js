const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');

// Protect all complaint routes
router.use(verifyToken);

// GET /api/complaints
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT c.*, 
                   s.name as student_name, 
                   ms.name as staff_name, 
                   ms.staff_id as assigned_staff_id,
                   a.assignment_id
            FROM Complaints c
            LEFT JOIN Students s ON c.student_id = s.student_id
            LEFT JOIN Assignments a ON c.complaint_id = a.complaint_id
            LEFT JOIN Maintenance_Staff ms ON a.staff_id = ms.staff_id
            ORDER BY c.date_submitted DESC
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/complaints
router.post('/', async (req, res) => {
    const { student_id, category, location, description } = req.body;
    if (!student_id || !category || !location || !description) {
        return res.status(400).json({ success: false, error: 'All fields are required.' });
    }
    try {
        const { rows } = await pool.query(
            'INSERT INTO Complaints (student_id, category, location, description, status) VALUES ($1, $2, $3, $4, $5) RETURNING complaint_id',
            [student_id, category, location, description, 'Pending']
        );
        res.json({ success: true, id: rows[0].complaint_id });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/complaints/:id
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM Complaints WHERE complaint_id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/complaints/:id/status
router.put('/:id/status', async (req, res) => {
    try {
        await pool.query('UPDATE Complaints SET status = $1 WHERE complaint_id = $2', [req.body.status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
