const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const connectDB = require('./config/db');
const { initRealtime } = require('./realtime/socket');

const PORT = process.env.PORT || 5001;

const start = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`FamilyBalance API running on port ${PORT}`);
    });

    // Notifications et messages en temps réel, sur le même port que l'API.
    initRealtime(server);

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        // eslint-disable-next-line no-console
        console.error(`Port ${PORT} is already in use. Stop the process using that port or set a different PORT value.`);
      }

      // eslint-disable-next-line no-console
      console.error('Server failed to start:', error.message);
      process.exit(1);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

start();
