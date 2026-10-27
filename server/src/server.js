const config = require('./config');
const { getDb } = require('./db');
const { createApp } = require('./app');

getDb(); // create the database and tables before accepting requests

const app = createApp();
app.listen(config.port, () => {
  console.log(`Basic LMS API running at http://localhost:${config.port}`);
});
