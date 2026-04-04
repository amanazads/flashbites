const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExt = /jpeg|jpg|png|gif|webp|pdf/;
  const ext = path.extname(file.originalname || '').toLowerCase().replace('.', '');
  const validExt = allowedExt.test(ext);

  const mime = (file.mimetype || '').toLowerCase();
  const validMime = mime.startsWith('image/') || mime === 'application/pdf';

  if (validExt && validMime) {
    return cb(null, true);
  }

  cb(new Error('Only image files (jpeg, jpg, png, gif, webp) and PDF are allowed!'));
};

const uploadPartnerDocs = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter,
});

module.exports = uploadPartnerDocs;
