const { buildUserLogisticaLookup } = require('./userLogisticaLookup');

function buildAggregatedUserScoreLookup({ from, alias, includeTempo = false }) {
  const groupStage = {
    _id: null,
    totalPontos: { $sum: '$pontos' },
    totalCheckins: { $sum: 1 },
  };

  if (includeTempo) {
    groupStage.totalTempo = { $sum: '$tempo' };
  }

  return {
    $lookup: {
      from,
      let: {
        userId: '$_id',
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ['$userId', '$$userId'],
            },
          },
        },
        {
          $group: groupStage,
        },
      ],
      as: alias,
    },
  };
}

function buildUserSummaryPipeline(matchStage = {}, options = {}) {
  const { limitOne = false, sortRanking = false, limit = null } = options;
  const pipeline = [
    {
      $match: matchStage,
    },
    buildAggregatedUserScoreLookup({
      from: 'checkins',
      alias: 'checkinSummary',
      includeTempo: true,
    }),
    buildAggregatedUserScoreLookup({
      from: 'question_session_checkins',
      alias: 'sessionCheckinSummary',
    }),
    buildAggregatedUserScoreLookup({
      from: 'dissertative_answers',
      alias: 'dissertativeAnswerSummary',
    }),
    {
      $addFields: {
        checkinSummary: {
          $ifNull: [
            { $arrayElemAt: ['$checkinSummary', 0] },
            {
              totalPontos: 0,
              totalTempo: 0,
              totalCheckins: 0,
            },
          ],
        },
        sessionCheckinSummary: {
          $ifNull: [
            { $arrayElemAt: ['$sessionCheckinSummary', 0] },
            {
              totalPontos: 0,
              totalCheckins: 0,
            },
          ],
        },
        dissertativeAnswerSummary: {
          $ifNull: [
            { $arrayElemAt: ['$dissertativeAnswerSummary', 0] },
            {
              totalPontos: 0,
              totalCheckins: 0,
            },
          ],
        },
      },
    },
    {
      $addFields: {
        pontos: {
          $add: [
            '$checkinSummary.totalPontos',
            '$sessionCheckinSummary.totalPontos',
            '$dissertativeAnswerSummary.totalPontos',
          ],
        },
        tempo: '$checkinSummary.totalTempo',
        totalCheckins: {
          $add: [
            '$checkinSummary.totalCheckins',
            '$sessionCheckinSummary.totalCheckins',
            '$dissertativeAnswerSummary.totalCheckins',
          ],
        },
      },
    },
    {
      $project: {
        checkinSummary: 0,
        sessionCheckinSummary: 0,
        dissertativeAnswerSummary: 0,
      },
    },
  ];

  if (sortRanking) {
    pipeline.push({
      $sort: {
        pontos: -1,
        totalCheckins: -1,
        tempo: 1,
        nome: 1,
      },
    });
  }

  if (limitOne) {
    pipeline.push({ $limit: 1 });
  } else if (Number.isFinite(limit) && limit > 0) {
    pipeline.push({ $limit: limit });
  }

  return pipeline;
}

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
      $lookup: {
        from: 'dissertative_answers',
        localField: '_id',
        foreignField: 'userId',
        as: 'dissertativeAnswers',
      },
    },
    {
      $addFields: {
        pontos: {
          $add: [
            { $sum: '$checkins.pontos' },
            { $sum: '$sessionCheckins.pontos' },
            { $sum: '$dissertativeAnswers.pontos' },
          ],
        },
        tempo: { $sum: '$checkins.tempo' },
        totalCheckins: {
          $add: [
            { $size: '$checkins' },
            { $size: '$sessionCheckins' },
            { $size: '$dissertativeAnswers' },
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
    buildUserLogisticaLookup('rotas', 'rotaCollection'),
    buildUserLogisticaLookup('aereos', 'aereoCollection'),
    buildUserLogisticaLookup('hospedagens', 'hospedagemCollection'),
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
        dissertativeAnswers: 0,
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
  buildUserSummaryPipeline,
};