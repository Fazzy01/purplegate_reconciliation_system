const { generateUploadId, getChunkPath, assembleFile, uploadSessions, getFinalPath, generateJobId, reconciliationJobs } = require('../utils/fileUpload');
const { startReconciliation, processReconciliationAsync } = require('../utils/reconciliationProcessor');
const fs = require('fs');
const path = require('path');

// Default chunk size (10MB)
const DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024

class ReconcileController {

async initUpload(req, res) {
    try {
        const { fileName, fileSize, system } = req.body; // system = 'A' or 'B'

        if (!fileName || !fileSize || !system) {
            return res.status(400).json({
                error: 'fileName, fileSize, and system are required'
            });
        }

        const uploadId = generateUploadId();

        uploadSessions.set(uploadId, {
            fileName,
            fileSize,
            system,
            chunksReceived: 0,
            totalChunks: Math.ceil(fileSize / DEFAULT_CHUNK_SIZE), // 5MB chunks
            isComplete: false
        });

      return res.json({
        success: true,
        uploadId,
        chunkSize: DEFAULT_CHUNK_SIZE // must match frontend of chunk size
      });

    } catch (error) {
      console.error('Init upload error:', error);
      return res.status(500).json({
        error: 'Failed to initialize upload session',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async uploadChunk(req, res) {
    try {
        const { uploadId, chunkIndex } = req.body;
        const chunk = req.file;

      if (!uploadSessions.has(uploadId)) {
        return res.status(404).json({ error: 'Upload session not found' });
      }

      const session = uploadSessions.get(uploadId);
      // Save chunk
      const chunkPath = getChunkPath(uploadId, session.fileName, chunkIndex);

     // Either use the file's path (if using disk storage) Or read the file into a buffer if needed
     if (chunk.path) {
        await fs.promises.rename(chunk.path, chunkPath);
    }
    else {
        const fileBuffer = await fs.promises.readFile(chunk.path);
        await fs.promises.writeFile(chunkPath, fileBuffer);
    }

      // Update session
      session.chunksReceived++;

      // Check if file is complete
      if (session.chunksReceived >= session.totalChunks) {
        session.isComplete = true;
      }

      return res.json({
        success: true,
        chunksReceived: session.chunksReceived,
        totalChunks: session.totalChunks,
        isComplete: session.isComplete
      });

    } catch (error) {
      return res.status(500).json({
        error: 'Failed to upload chunk',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async completeUpload(req, res) {

    try {
      const { uploadId } = req.body;
      const session = uploadSessions.get(uploadId);

      if (!session) {
        return res.status(404).json({ error: 'Upload session not found' });
      }

      if (!session.isComplete) {
        return res.status(400).json({ error: 'File upload not complete' });
      }

      // Assemble file
      const filePath = await assembleFile(
        uploadId,
        session.fileName,
        session.totalChunks
      );

      return res.json({
        success: true,
        filePath,
        system: session.system,
        message: 'File upload complete'
      });

    } catch (error) {
      console.error('Complete upload error:', error);
      return res.status(500).json({
        error: 'Failed to complete upload',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async finalizeReconciliation(req, res) {
    try {
      const { fileAPath, fileBPath } = req.body;

      if (!fileAPath || !fileBPath) {
        return res.status(400).json({ error: 'Both file paths are required' });
      }

      // Start reconciliation
      const reportPath = await startReconciliation(fileAPath, fileBPath);

      return res.json({
        success: true,
        reportPath,
        message: 'Reconciliation complete. Report generated.'
      });

    } catch (error) {
      console.error('Finalize error:', error);
      return res.status(500).json({
        error: 'Failed to finalize reconciliation',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

    // start reconcilition by file id
async reconcileById(req, res) {
  try {
    const { fileIdA, fileIdB } = req.body;

    // Verify required parameters
    if (!fileIdA || !fileIdB) {
      return res.status(400).json({ error: 'Both fileIdA and fileIdB are required' });
    }

    // Get the session data to access filenames and total chunks
    const sessionA = uploadSessions.get(fileIdA);
    const sessionB = uploadSessions.get(fileIdB);

    if (!sessionA || !sessionB) {
        console.log("One or both upload sessions not found")
      return res.status(404).json({ error: 'One or both upload sessions not found' });
    }

    // Get the final assembled file paths
    const file1Path = getFinalPath(fileIdA, sessionA.fileName);
    const file2Path = getFinalPath(fileIdB, sessionB.fileName);

    // Verify files exist
    if (!fs.existsSync(file1Path) || !fs.existsSync(file2Path)) {
      throw new Error('Assembled files not found - chunks may not have been merged');
    }

    // Generate job ID for background syncing
    const jobId = generateJobId();

    await processReconciliationAsync(file1Path, file2Path, jobId)


    // Process reconciliation
    // const report = await startReconciliation(file1Path, file2Path);

    // Clean up session data
    uploadSessions.delete(fileIdA);
    uploadSessions.delete(fileIdB);

    return res.json({
        success: true,
        jobId,
        message: 'Reconciliation started',
        statusUrl: `/api/reconcile/status/${jobId}`
      });

    // return res.json({
    //   success: true,
    //   report,
    //   completedAt: new Date(),
    //   message: 'Reconciliation completed successfully'
    // });

  } catch (error) {
    console.error('Reconciliation error:', error);
    return res.status(500).json({
      error: 'Reconciliation failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

//check reconcile status
async reconcileStatusById(req, res) {
    console.log("Param in reconcileStatusById : ", req.params);
    console.log("reconciliationJobs get: ", reconciliationJobs)
    const result = reconciliationJobs.get(req.params.jobId);
    if (!result) return res.status(404).json({ error: 'Job not found' });

    try {
        const reportData = typeof result.report === 'string'
            ? JSON.parse(result.report)
            : result.report;

        return res.json(reportData);
    } catch (error) {
        console.error("Error parsing report:", error);
        return res.status(500).json({ error: 'Failed to parse report data' });
    }

}
//fetch reconcile result
async reconcileResultById(req, res) {
    const result = reconciliationJobs.get(req.params.jobId);
    if (!result) return res.status(404).json({ error: 'Job not found' });

    try {
        const reportData = typeof result.report === 'string'
            ? JSON.parse(result.report)
            : result.report;

        return res.json(reportData);
    } catch (error) {
        console.error("Error parsing report:", error);
        return res.status(500).json({ error: 'Failed to parse report data' });
    }

}


//check reconcile status
async reconcileStatusById(req, res) {
    console.log("Param in reconcileStatusById : ", req.params);
    const result = reconciliationJobs.get(req.params.jobId);
    if (!result) return res.status(404).json({ error: 'Job not found' });


  return res.json({
    status: result.status,
    ...(result.status === 'completed' && { progress: result.progress || 100, report: result.report }),
    ...(result.status === 'failed' && { error: result.error, progress: result.progress || 0 })
  });
}

//   use direct upload for from postman
async directUpload(req, res) {
    let file1Path, file2Path;
    let reportPath;

    try {
      if (!req.files || !req.files.file1 || !req.files.file2) {
        return res.status(400).json({ error: 'Please upload both files' });
      }

      // Get file paths from multer
      file1Path = req.files.file1[0].path;
      file2Path = req.files.file2[0].path;

      // Verify files exist before processing
      if (!fs.existsSync(file1Path) || !fs.existsSync(file2Path)) {
        throw new Error('Uploaded files not found on server');
      }

      // Process files
      reportPath = await startReconciliation(file1Path, file2Path);

      return res.json({
        success: true,
        reportPath,
        message: 'Reconciliation completed successfully'
      });

    } catch (error) {
      console.error('Direct upload error:', error);
      return res.status(500).json({
        error: 'Failed to process files',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });

    } finally {
      // Safely attempt cleanup
      try {
        if (file1Path && fs.existsSync(file1Path)) {
          fs.unlinkSync(file1Path);
          console.log(`Cleaned up: ${file1Path}`);
        }
        if (file2Path && fs.existsSync(file2Path)) {
          fs.unlinkSync(file2Path);
          console.log(`Cleaned up: ${file2Path}`);
        }
      } catch (cleanupError) {
        console.error('File cleanup error:', cleanupError);
      }
    }
  }



}

module.exports = new ReconcileController();