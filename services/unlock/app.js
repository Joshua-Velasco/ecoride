const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: 'ecoride',
  password: 'demo123',
  database: 'ecoride',
  port: 5432,
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'unlock' });
});

app.post('/api/unlock/:scooterId', async (req, res) => {
  const { scooterId } = req.params;
  const { userId } = req.body;
  const delay = parseInt(process.env.RESPONSE_DELAY || '100');

  await new Promise(r => setTimeout(r, delay));

  try {
    const result = await pool.query(
      'INSERT INTO trips (user_id, scooter_id, status) VALUES ($1, $2, $3) RETURNING *',
      [userId, scooterId, 'ACTIVE']
    );
    res.json({
      success: true,
      trip_id: result.rows[0].id,
      latency_ms: delay,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log('Unlock Service running on port 3000');
});
