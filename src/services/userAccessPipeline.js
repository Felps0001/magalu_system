function buildUserAccessPipeline(matchStage = {}, options = {}) {
  const { limitOne = false } = options;
  const pipeline = [
    {
      $match: matchStage,
    },
    {
      $lookup: {
        from: 'checkins',
        localField: '_id',
        foreignField: 'userId',
        as: 'checkins',
      },
    },
    {
      $addFields: {
        pontos: { $sum: '$checkins.pontos' },
        tempo: { $sum: '$checkins.tempo' },
        totalCheckins: { $size: '$checkins' },
      },
    },
    {
      $lookup: {
        from: 'estandes',
        localField: 'checkins.estandeId',
        foreignField: '_id',
        as: 'estandesVisitados',
      },
    },
    {
      $lookup: {
        from: 'rotas',
        localField: '_id',
        foreignField: 'userId',
        as: 'rotaCollection',
      },
    },
    {
      $lookup: {
        from: 'aereos',
        localField: '_id',
        foreignField: 'userId',
        as: 'aereoCollection',
      },
    },
    {
      $addFields: {
        rota: { $arrayElemAt: ['$rotaCollection', 0] },
        aereoDetalhes: { $arrayElemAt: ['$aereoCollection', 0] },
      },
    },
    {
      $project: {
        rotaCollection: 0,
        aereoCollection: 0,
      },
    },
  ];

  if (limitOne) {
    pipeline.push({ $limit: 1 });
  }

  return pipeline;
}

module.exports = {
  buildUserAccessPipeline,
};