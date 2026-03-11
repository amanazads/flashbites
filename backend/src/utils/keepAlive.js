const https = require('https');

const keepAlive = () => {
  const url = process.env.RENDER_EXTERNAL_URL 
    ? `${process.env.RENDER_EXTERNAL_URL}/api/health`
    : 'https://flashbites-backend.onrender.com/api/health';

  // Ping every 5 minutes — Render.com free tier sleeps at exactly 15 mins of inactivity.
  // 5-min pings ensure the server never goes idle.
  setInterval(() => {
    https.get(url, (res) => {
      console.log(`[KeepAlive] Pinged self at ${new Date().toISOString()} - Status: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error('[KeepAlive] Failed to ping self:', err.message);
    });
  }, 5 * 60 * 1000);
};

module.exports = keepAlive;
