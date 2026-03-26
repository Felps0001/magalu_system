const express = require('express');
const multer = require('multer');

const { edgeCache, noStore } = require('../http/cacheControl');

const {
  createFeedHandler,
  createFeedUploadUrlHandler,
  getFeedPublishAccessHandler,
  listFeedHandler,
} = require('../controllers/feedController');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
});

router.get('/', edgeCache({ maxAgeSeconds: 15, sMaxAgeSeconds: 30, staleWhileRevalidateSeconds: 60 }), listFeedHandler);
router.get('/publish-access', noStore(), getFeedPublishAccessHandler);
router.post('/upload-url', createFeedUploadUrlHandler);
router.post('/', upload.single('imagem'), createFeedHandler);

module.exports = router;