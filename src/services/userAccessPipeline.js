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
      $lookup: {
        from: 'question_session_checkins',
        localField: '_id',
        foreignField: 'userId',
        as: 'sessionCheckins',
      },
    },
    {
      $addFields: {
        pontos: {
          $add: [
            { $sum: '$checkins.pontos' },
            { $sum: '$sessionCheckins.pontos' },
          ],
        },
        tempo: { $sum: '$checkins.tempo' },
        totalCheckins: {
          $add: [
            { $size: '$checkins' },
            { $size: '$sessionCheckins' },
          ],
        },
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
      $lookup: {
        from: 'hospedagens',
        localField: '_id',
        foreignField: 'userId',
        as: 'hospedagemCollection',
      },
    },
    {
      $addFields: {
        rota: { $arrayElemAt: ['$rotaCollection', 0] },
        aereoDetalhes: { $arrayElemAt: ['$aereoCollection', 0] },
        hospedagem: { $arrayElemAt: ['$hospedagemCollection', 0] },
      },
    },
    {
      $project: {
        rotaCollection: 0,
        aereoCollection: 0,
        hospedagemCollection: 0,
        sessionCheckins: 0,
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