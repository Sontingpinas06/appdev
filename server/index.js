const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const uniformRoutes = require('./routes/uniformRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const clientOrigins = (process.env.CLIENT_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

app.use(helmet()); // Security headers
app.use(cors({
    origin: clientOrigins.length ? clientOrigins : true, // Restrict to known clients when configured
    credentials: true
}));
app.use(express.json({ limit: '100kb' })); // Body parser
app.use(morgan('dev')); // Logging

// Routes
app.use('/api/uniforms', uniformRoutes);

// Basic health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
