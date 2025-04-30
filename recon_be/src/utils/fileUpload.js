const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const JOBS_FILE = 'jobs.json';

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const jobsFilePath = path.join(UPLOAD_DIR, JOBS_FILE);

// Track upload sessions
const uploadSessions = new Map();

// I added this so as to avoid using database but in reality we make use of database
// Initialize or load job storage
if (!global.jobStorage) {
  const reconciliationJobs = new Map();

  // Load persisted jobs from file (if exists)
  if (fs.existsSync(jobsFilePath)) {
    try {
      const jobData = JSON.parse(fs.readFileSync(jobsFilePath, 'utf8'));
      for (const [jobId, job] of Object.entries(jobData)) {
        // Convert stringified dates back to timestamps
        if (job.createdAt) job.createdAt = new Date(job.createdAt).getTime();
        reconciliationJobs.set(jobId, job);
      }
    } catch (err) {
      console.error("Failed to load saved jobs:", err);
    }
  }

  global.jobStorage = {
    reconciliationJobs,

    saveJobsToFile: function () {
      const jobsObj = Object.fromEntries(this.reconciliationJobs);
      try {
        fs.writeFileSync(jobsFilePath, JSON.stringify(jobsObj, null, 2));
      } catch (err) {
        console.error("Error saving jobs to file:", err);
      }
    },

    cleanup: function (maxAgeHours = 24) {
      const now = Date.now();
      for (const [jobId, job] of this.reconciliationJobs) {
        if (now - job.createdAt > maxAgeHours * 60 * 60 * 1000) {
          this.reconciliationJobs.delete(jobId);
        }
      }
      this.saveJobsToFile();
    }
  };

  // Periodic cleanup every hour
  setInterval(() => global.jobStorage.cleanup(), 3600000);
}

// Helpers
function generateUploadId() {
  return crypto.randomBytes(16).toString('hex');
}

function generateJobId() {
  return crypto.randomBytes(8).toString('hex');
}

function getChunkPath(uploadId, filename, chunkIndex) {
  return path.join(UPLOAD_DIR, `${uploadId}-${filename}-${chunkIndex}`);
}

function getFinalPath(uploadId, filename) {
  return path.join(UPLOAD_DIR, `${uploadId}-${filename}`);
}

async function assembleFile(uploadId, filename, totalChunks) {
  const finalPath = getFinalPath(uploadId, filename);
  const writeStream = fs.createWriteStream(finalPath);

  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = getChunkPath(uploadId, filename, i);
    const chunk = await fs.promises.readFile(chunkPath);
    writeStream.write(chunk);
    await fs.promises.unlink(chunkPath); // Clean up chunk
  }

  writeStream.end();
  return finalPath;
}

module.exports = {
  UPLOAD_DIR,
  uploadSessions,
  reconciliationJobs: global.jobStorage.reconciliationJobs,
  saveJobsToFile: global.jobStorage.saveJobsToFile.bind(global.jobStorage),
  generateUploadId,
  generateJobId,
  getChunkPath,
  getFinalPath,
  assembleFile
};
