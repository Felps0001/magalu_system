const { PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');
const { randomUUID } = require('crypto');

let r2Client;

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`A variavel ${name} nao foi definida no arquivo .env.`);
  }

  return value;
}

function getR2Config() {
  const accountId = getRequiredEnv('CLOUDFLARE_R2_ACCOUNT_ID');
  const accessKeyId = getRequiredEnv('CLOUDFLARE_R2_ACCESS_KEY_ID');
  const secretAccessKey = getRequiredEnv('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
  const bucketName = getRequiredEnv('CLOUDFLARE_R2_BUCKET_NAME');
  const publicBaseUrl = getRequiredEnv('CLOUDFLARE_R2_PUBLIC_BASE_URL').replace(/\/$/, '');
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;
  const region = process.env.CLOUDFLARE_R2_REGION || 'auto';

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicBaseUrl,
    endpoint,
    region,
  };
}

function getR2Client() {
  if (r2Client) {
    return r2Client;
  }

  const config = getR2Config();

  r2Client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return r2Client;
}

function sanitizeFileName(fileName) {
  return String(fileName || 'imagem')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function buildObjectKey(fileName, authorIdMagalu) {
  const extension = path.extname(fileName || '').toLowerCase() || '.bin';
  const baseName = path.basename(fileName || 'imagem', extension);
  const safeBaseName = sanitizeFileName(baseName) || 'imagem';
  const safeAuthor = sanitizeFileName(authorIdMagalu || 'usuario') || 'usuario';

  return `feed/${safeAuthor}/${Date.now()}-${randomUUID()}-${safeBaseName}${extension}`;
}

async function uploadFeedImage({ buffer, mimeType, fileName, authorIdMagalu }) {
  const config = getR2Config();
  const client = getR2Client();
  const objectKey = buildObjectKey(fileName, authorIdMagalu);

  await client.send(new PutObjectCommand({
    Bucket: config.bucketName,
    Key: objectKey,
    Body: buffer,
    ContentType: mimeType || 'application/octet-stream',
  }));

  return {
    key: objectKey,
    url: `${config.publicBaseUrl}/${objectKey}`,
  };
}

async function createFeedUploadUrl({ fileName, mimeType, authorIdMagalu, expiresIn = 300 }) {
  const config = getR2Config();
  const client = getR2Client();
  const objectKey = buildObjectKey(fileName, authorIdMagalu);
  const uploadCommand = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: objectKey,
    ContentType: mimeType || 'application/octet-stream',
  });
  const uploadUrl = await getSignedUrl(client, uploadCommand, { expiresIn });

  return {
    key: objectKey,
    uploadUrl,
    publicUrl: `${config.publicBaseUrl}/${objectKey}`,
  };
}

module.exports = {
  createFeedUploadUrl,
  uploadFeedImage,
};