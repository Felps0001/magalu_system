const { connectToMongoDB } = require('../config/mongodb');

async function getHealth(req, res) {
  try {
    const database = await connectToMongoDB();

    res.json({
      status: 'ok',
      mongo: database.databaseName,
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