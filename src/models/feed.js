const { ObjectId } = require('mongodb');

function createFeed({ authorId, mensagem, imagemUrl }) {
  const mensagemNormalizada = typeof mensagem === 'string' ? mensagem.trim() : '';
  const imagemNormalizada = typeof imagemUrl === 'string' ? imagemUrl.trim() : '';

  if (!ObjectId.isValid(authorId)) {
    throw new Error('O autor informado para o feed e invalido.');
  }

  if (!mensagemNormalizada && !imagemNormalizada) {
    throw new Error('Informe uma mensagem ou a URL da imagem para publicar no feed.');
  }

  return {
    authorId: new ObjectId(authorId),
    mensagem: mensagemNormalizada,
    imagemUrl: imagemNormalizada || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

module.exports = {
  createFeed,
};