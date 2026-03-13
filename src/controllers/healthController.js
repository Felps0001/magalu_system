const { connectToMongoDB } = require('../config/mongodb');
const { getRedisStatus } = require('../config/redis');

async function getHealth(req, res) {
  try {
    const database = await connectToMongoDB();

    res.json({
      status: 'ok',
      mongo: database.databaseName,
      redis: getRedisStatus(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
}

module.exports = {
  getHealth,
};