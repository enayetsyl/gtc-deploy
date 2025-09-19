// ...existing code...
const mysql = require('mysql2/promise');

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Set DATABASE_URL env var first');
    process.exit(1);
  }
  try {
    const conn = await mysql.createConnection({ uri: url });
    const [rows] = await conn.query('SHOW TABLES;');
    console.log('SHOW TABLES result:', rows);
    await conn.end();
  } catch (err) {
    console.error('DB ERROR:', err.message);
    process.exit(2);
  }
})();