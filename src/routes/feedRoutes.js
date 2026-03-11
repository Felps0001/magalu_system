const express = require('express');
const multer = require('multer');

const {
  createFeedHandler,
  createFeedUploadUrlHandler,
  listFeedHandler,
} = require('../controllers/feedController');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
});

router.get('/', listFeedHandler);
router.post('/upload-url', createFeedUploadUrlHandler);
router.post('/', upload.single('imagem'), createFeedHandler);

module.exports = router;