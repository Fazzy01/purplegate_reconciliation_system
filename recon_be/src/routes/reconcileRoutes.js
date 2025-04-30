const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const reconcileController = require('../controllers/reconcileController');

// Only accept CSV files
const fileFilter = (req, file, cb) => {
    const validMimeTypes = [
        'text/csv',
        'application/vnd.ms-excel', // Excel CSV
        'text/plain'
      ];
    const validExtension = file.originalname.toLowerCase().endsWith('.csv');

    if (validMimeTypes.includes(file.mimetype) || validExtension) {
        cb(null, true);
      } else {
        const error = new Error('Invalid file type. Only CSV files are allowed.');
        error.code = 'INVALID_FILE_TYPE';
        cb(error, false);
    }
  };

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '..', 'uploads');
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      cb(null, `temp-${Date.now()}-${file.originalname}`);
    }
  });

  const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 100 * 1024 * 1024 // 100MB
    }
  });

// Initialize upload session
router.post('/init', reconcileController.initUpload);
// upload files in chunk
router.post('/chunk',
    (req, res, next) => {
      // Manually parse the content-type to get the boundary
      const contentType = req.headers['content-type'];
      const boundary = contentType.match(/boundary=(.*)$/)?.[1];

      if (!boundary) {
        return res.status(400).json({ error: 'Missing boundary in Content-Type' });
      }

      // Create a custom multer instance for this request
      const upload = multer({
        storage: storage,
        fileFilter: fileFilter,
        limits: {
          fileSize: 100 * 1024 * 1024
        }
      }).single('chunk');

      // Handle the upload with the proper boundary
      upload(req, res, (err) => {
        if (err) {
          console.error('Multer error:', err);
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'File too large' });
          }
          return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
          return res.status(400).json({ error: 'No file was uploaded' });
        }

        // console.log('File processed:', {
        //   originalname: req.file.originalname,
        //   size: req.file.size,
        //   body: req.body
        // });

        next(); // Proceed to controller
      });
    },
    reconcileController.uploadChunk
  );

// Complete upload and start reconciliation
router.post('/complete', reconcileController.completeUpload);
// start reconcilition by fileId
router.post('/create', reconcileController.reconcileById);

// check recocile status by id
router.get('/status/:jobId', reconcileController.reconcileStatusById);
//  fetch reconcile result by id
router.get('/results/:jobId', reconcileController.reconcileResultById);

// Direct upload endpoint for testing files from postman
router.post('/direct',
  upload.fields([
    { name: 'file1', maxCount: 1 },
    { name: 'file2', maxCount: 1 }
  ]),
  reconcileController.directUpload
);

// Error handling for file uploads
router.use((err, req, res, next) => {
    if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          success: false,
          error: err.message,
          details: {
            allowedTypes: ['text/csv', 'application/vnd.ms-excel'],
            allowedExtensions: ['.csv']
          }
        });
    }

    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'File too large',
          message: 'Maximum file size is 100MB'
        });
      }
      // Handle other Multer errors
      return res.status(400).json({
        error: 'File upload error',
        message: err.message
      });
    }
    // Handle other errors
    next(err);
  });


module.exports = router;