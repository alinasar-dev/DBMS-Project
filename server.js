require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import modular routes
const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const staffRoutes = require('./routes/staffRoutes');
const assignRoutes = require('./routes/assignRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Serve the frontend static files (index.html, styles.css, app.js)
app.use(express.static(path.join(__dirname)));

// Mount API routers
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/assign', assignRoutes);

// Export app for Vercel serverless execution
module.exports = app;

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 CMMS API Server running → http://localhost:${PORT}`);
        console.log(`📁 Open your browser at: http://localhost:${PORT}/index.html`);
    });
}
