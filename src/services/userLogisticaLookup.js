const { ObjectId } = require('mongodb');

function normalizeUserObjectId(userId) {
  if (userId instanceof ObjectId) {
    return userId;
  }

  if (typeof userId === 'string' && ObjectId.isValid(userId)) {
    return new ObjectId(userId);
  }

  throw new Error('O userId informado para a logistica e invalido.');
}

function buildUserLogisticaFilter(userId, fieldName = 'userId') {
  const objectId = normalizeUserObjectId(userId);
  const stringUserId = objectId.toHexString();

  return {
    $or: [
      { [fieldName]: objectId },
      { [fieldName]: stringUserId },
    ],
  };
}

function buildUserLogisticaLookup(from, as, fieldName = 'userId') {
  const fieldPath = `$${fieldName}`;

  return {
    $lookup: {
      from,
      let: {
        userIdObject: '$_id',
        userIdString: { $toString: '$_id' },
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $or: [
                { $eq: [fieldPath, '$$userIdObject'] },
                { $eq: [fieldPath, '$$userIdString'] },
              ],
            },
          },
        },
      ],
      as,
    },
  };
}

module.exports = {
  buildUserLogisticaFilter,
  buildUserLogisticaLookup,
  normalizeUserObjectId,
};