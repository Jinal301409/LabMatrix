const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const pool = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, message: 'API and DB are up' });
  } catch (e) { next(e); }
});

app.use('/api', require('./routes'));

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));
app.use(errorHandler);

module.exports = app;