/**
 * Utility for processing large CSV files in chunks
 * Works with your existing backend endpoints
 */

/**
 * Process a large CSV file in chunks and send to your reconciliation API
 *
 * @param {File} file1 - CSV file from System 1
 * @param {File} file2 - CSV file from System 2
 * @param {Function} onProgress - Progress callback function
 * @param {Function} onComplete - Completion callback function
 * @param {Function} onError - Error callback function
 */
export async function processLargeCSVFiles(file1, file2, onProgress, onComplete, onError) {
    try {
      // Step 1: Initialize the upload session
      const sessionId = await initializeUpload()

      // Step 2: Upload both files in chunks
      await Promise.all([
        uploadFileInChunks(file1, "file1", sessionId, (progress) => {
          onProgress({ file: "file1", progress })
        }),
        uploadFileInChunks(file2, "file2", sessionId, (progress) => {
          onProgress({ file: "file2", progress })
        }),
      ])

      // Step 3: Complete the upload and start reconciliation
      const results = await completeUpload(sessionId, file1.name, file2.name)

      onComplete(results)
    } catch (error) {
      onError(error)
    }
  }

  /**
   * Initialize the upload session
   *
   * @returns {Promise<string>} - Session ID
   */
  async function initializeUpload() {
    const response = await fetch("/api/reconcile/init", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timestamp: Date.now(),
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to initialize upload")
    }

    const data = await response.json()
    return data.sessionId
  }

  /**
   * Upload a file in chunks
   *
   * @param {File} file - The file to upload
   * @param {string} fileKey - The key for the file (file1 or file2)
   * @param {string} sessionId - The upload session ID
   * @param {Function} onProgress - Progress callback function
   */
  async function uploadFileInChunks(file, fileKey, sessionId, onProgress) {
    const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE
      const end = Math.min(file.size, start + CHUNK_SIZE)
      const chunk = file.slice(start, end)

      const formData = new FormData()
      formData.append("chunk", chunk)
      formData.append("sessionId", sessionId)
      formData.append("fileKey", fileKey)
      formData.append("chunkIndex", chunkIndex.toString())
      formData.append("totalChunks", totalChunks.toString())

      const response = await fetch("/api/reconcile/chunk", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `Failed to upload chunk ${chunkIndex}`)
      }

      // Update progress
      const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100)
      onProgress(progress)
    }
  }

  /**
   * Complete the upload and start reconciliation
   *
   * @param {string} sessionId - The upload session ID
   * @param {string} fileName1 - Name of the first file
   * @param {string} fileName2 - Name of the second file
   * @returns {Promise<Object>} - Reconciliation results
   */
  async function completeUpload(sessionId, fileName1, fileName2) {
    const response = await fetch("/api/reconcile/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        fileName1,
        fileName2,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to complete upload")
    }

    return await response.json()
  }

  /**
   * For smaller files, use the direct upload endpoint
   *
   * @param {File} file1 - CSV file from System 1
   * @param {File} file2 - CSV file from System 2
   * @returns {Promise<Object>} - Reconciliation results
   */
  export async function directUpload(file1, file2) {
    const formData = new FormData()
    formData.append("file1", file1)
    formData.append("file2", file2)

    const response = await fetch("/api/reconcile/direct", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to upload files")
    }

    return await response.json()
  }
