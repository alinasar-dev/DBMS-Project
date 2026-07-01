const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');

// Protect assignment routes
router.use(verifyToken);

// POST /api/assign
router.post('/', async (req, res) => {
    const { complaint_id, staff_id } = req.body;
    if (!complaint_id || !staff_id) {
        return res.status(400).json({ success: false, error: 'complaint_id and staff_id are required.' });
    }
    try {
        // Remove previous assignment
        await pool.query('DELETE FROM Assignments WHERE complaint_id = $1', [complaint_id]);
        // Insert new assignment
        await pool.query('INSERT INTO Assignments (complaint_id, staff_id) VALUES ($1, $2)', [complaint_id, staff_id]);
        // Reset status to Pending — staff will mark Resolved when done
        await pool.query("UPDATE Complaints SET status = 'Pending' WHERE complaint_id = $1", [complaint_id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
