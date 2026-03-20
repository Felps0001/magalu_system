const { getUsersCollection } = require('../config/collections');

async function cleanupUsersHandler(req, res) {
  const secret = req.get('x-admin-secret') || req.query.secret || '';

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const action = (req.query.action || 'deleteAll').toLowerCase();

  try {
    const usersCollection = await getUsersCollection();

    if (action === 'deleteall') {
      const result = await usersCollection.deleteMany({});
      res.json({ deletedCount: result.deletedCount });
      return;
    }

    if (action === 'unsetlegacy') {
      const result = await usersCollection.updateMany({}, {
        $unset: {
          regiao: '',
          loja: '',
          turma: '',
          cidade: '',
          transfer: '',
          hospedagem: '',
          aereo: '',
        },
      });

      res.json({ modifiedCount: result.modifiedCount });
      return;
    }

    if (action === 'drop') {
      // drop will remove the collection entirely from the DB
      await (await getUsersCollection()).drop();
      res.json({ dropped: true });
      return;
    }

    res.status(400).json({ error: 'Invalid action. Use deleteAll|unsetLegacy|drop' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  cleanupUsersHandler,
};
