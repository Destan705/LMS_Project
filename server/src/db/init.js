// npm run db:init   -> creates the database and tables
// npm run db:reset  -> deletes the database file and creates it again
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { getDb, closeDb } = require('./index');

if (process.argv.includes('--reset') && config.dbPath !== ':memory:') {
  const file = path.resolve(config.dbPath);
  for (const f of [file, `${file}-wal`, `${file}-shm`]) {
    if (fs.existsSync(f)) fs.rmSync(f);
  }
  console.log('Deleted old database.');
}

const db = getDb();
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map((t) => t.name);

console.log(`Database ready at ${config.dbPath}`);
console.log(`Tables: ${tables.join(', ')}`);
closeDb();
