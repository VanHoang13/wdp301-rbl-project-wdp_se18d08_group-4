const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  console.log(`UniMove API running on http://localhost:${env.port}`);
  console.log(`Health check: http://localhost:${env.port}/api/health`);
});
