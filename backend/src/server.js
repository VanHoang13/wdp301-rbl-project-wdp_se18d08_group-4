const app = require('./app');
const env = require('./config/env');

app.listen(env.PORT, () => {
  console.log(`UniMove API running on http://localhost:${env.PORT}`);
  console.log(`Health check: http://localhost:${env.PORT}/api/health`);
});
