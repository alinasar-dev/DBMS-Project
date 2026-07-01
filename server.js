require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve the frontend static files (index.html, styles.css, app.js)
app.use(express.static(path.join(__dirname)));

// PostgreSQL connection pool (supports Supabase connection string via DATABASE_URL)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:5432/${process.env.DB_NAME || 'cmms_db'}`,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Test DB connection on startup
pool.connect()
    .then(client => {
        console.log('✅ PostgreSQL (Supabase) Connected!');
        client.release();
    })
    .catch(err => console.error('❌ PostgreSQL Connection Failed:', err.message));

// ==========================================
// AUTHENTICATION
// ==========================================
app.post('/api/auth/login', async (req, res) => {
    const { role, identifier, password } = req.body;
    try {
        let rows = [];
        if (role === 'student') {
            const result = await pool.query('SELECT * FROM Students WHERE email = $1 AND password = $2', [identifier, password]);
            rows = result.rows;
            if (rows.length) return res.json({ success: true, user: { id: rows[0].student_id, name: rows[0].name, role: 'student', email: rows[0].email } });
        } else if (role === 'admin') {
            const result = await pool.query('SELECT * FROM Administrators WHERE email = $1 AND password = $2', [identifier, password]);
            rows = result.rows;
            if (rows.length) return res.json({ success: true, user: { id: rows[0].admin_id, name: rows[0].name, role: 'admin', email: rows[0].email } });
        } else if (role === 'staff') {
            const result = await pool.query('SELECT * FROM Maintenance_Staff WHERE email = $1 AND password = $2', [identifier, password]);
            rows = result.rows;
            if (rows.length) return res.json({ success: true, user: { id: rows[0].staff_id, name: rows[0].name, role: 'staff', email: rows[0].email } });
        }
        return res.status(401).json({ success: false, error: 'Invalid credentials. Please check your email and password.' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/auth/register', async (req, res) => {
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

// ==========================================
// COMPLAINTS
// ==========================================
app.get('/api/complaints', async (req, res) => {
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

app.post('/api/complaints', async (req, res) => {
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

app.delete('/api/complaints/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM Complaints WHERE complaint_id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/complaints/:id/status', async (req, res) => {
    try {
        await pool.query('UPDATE Complaints SET status = $1 WHERE complaint_id = $2', [req.body.status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// MAINTENANCE STAFF
// ==========================================
app.get('/api/staff', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT staff_id, name, email, department, phone FROM Maintenance_Staff');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/staff', async (req, res) => {
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

app.delete('/api/staff/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM Maintenance_Staff WHERE staff_id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// ASSIGNMENTS
// ==========================================
app.post('/api/assign', async (req, res) => {
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

// Export app for Vercel serverless execution
module.exports = app;

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 CMMS API Server running → http://localhost:${PORT}`);
        console.log(`📁 Open your browser at: http://localhost:${PORT}/index.html`);
    });
}
