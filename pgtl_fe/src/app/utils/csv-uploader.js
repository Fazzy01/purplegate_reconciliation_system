/**
 * Utility for efficiently uploading large CSV files
 * Handles chunking, progress tracking, and error handling
 */

// Default chunk size (10MB)
const DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024

/**
 * Upload a large file in chunks
 * @param {File} file - The file to upload
 * @param {string} system - Identifier for the file (e.g., "A" or "B")
 * @param {string} endpoint - Base API endpoint
 * @param {Function} onProgress - Progress callback function
 * @param {AbortSignal} signal - AbortController signal for cancellation
 * @param {number} chunkSize - Size of each chunk in bytes
 * @returns {Promise<string>} - File ID of the uploaded file
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_LOCAL_BASE_URL || 'http://localhost:3000'

export async function uploadLargeFile(file, system, endpoint, onProgress, signal, chunkSize = DEFAULT_CHUNK_SIZE) {
  // Generate a unique file ID
  const fileId = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9]/g, "_")}`
  const totalChunks = Math.ceil(file.size / chunkSize)

  try {
    // Step 1: Initialize the upload
    const { serverUploadId, clientFileId } = await initializeUpload(file, fileId, totalChunks, system, endpoint, signal)

    // Step 2: Upload each chunk
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      // Check if upload was cancelled
      if (signal?.aborted) {
        throw new Error("Upload cancelled")
      }

      const start = chunkIndex * chunkSize
      const end = Math.min(file.size, start + chunkSize)
      const chunk = file.slice(start, end)

      await uploadChunk(chunk, serverUploadId, fileId, chunkIndex, totalChunks, system, endpoint, signal)

      // Update progress
      const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100)
      onProgress?.(progress)
    }

    // Step 3: Complete the upload
    await completeUpload(serverUploadId, fileId, file.name, system, endpoint, signal)

    return serverUploadId
  } catch (error) {
    // Rethrow the error to be handled by the caller
    throw error
  }
}

/**
 * Initialize the upload process
 */
async function initializeUpload(file, fileId, totalChunks, system, endpoint, signal) {
  const response = await fetch(`${API_BASE_URL}${endpoint}/init`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      fileId,
      totalChunks,
      fileSize: file.size,
      system,
    }),
    signal,
  })
  const data = await response.json();
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Failed to initialize upload")
  }

//   return await response.json()
  return {
    serverUploadId: data.uploadId,
    clientFileId: fileId
  };
}

async function uploadChunk(chunk, uploadId, fileId, chunkIndex, totalChunks, system, endpoint, signal) {

    const formData = new FormData();
    formData.append("chunk", chunk, `chunk-${chunkIndex}.csv`);
    formData.append("uploadId", uploadId);
    formData.append("fileId", fileId);
    formData.append("chunkIndex", chunkIndex.toString());
    formData.append("totalChunks", totalChunks.toString());
    formData.append("system", system);
    // for (const [key, value] of formData.entries()) {
    //     console.log(key, value);
    // }

    const response = await fetch(`${API_BASE_URL}${endpoint}/chunk`, {
        method: "POST",
        body: formData,
        signal,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to upload chunk ${chunkIndex}`);
    }

    return await response.json();
}
/**
 * Complete the upload process
 */
async function completeUpload(uploadId, fileId, fileName, system, endpoint, signal) {
  const response = await fetch(`${API_BASE_URL}${endpoint}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uploadId,
      fileId,
      fileName,
      system,
    }),
    signal,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Failed to complete upload")
  }

  return await response.json()
}

/**
 * Parse a CSV file in chunks to avoid memory issues
 * @param {File} file - The CSV file to parse
 * @param {Function} onChunk - Callback for each chunk of rows
 * @param {Function} onComplete - Callback when parsing is complete
 * @param {Function} onProgress - Progress callback
 * @param {number} chunkSize - Number of rows per chunk
 */
export async function parseCSVInChunks(file, onChunk, onComplete, onProgress, chunkSize = 10000) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    let offset = 0
    let rowCount = 0
    let headers = null
    const totalSize = file.size

    // Process each chunk
    const processChunk = (chunk) => {
      // Split the chunk into rows
      const rows = chunk.split("\n")

      // If this is the first chunk, extract headers
      if (!headers) {
        headers = rows[0].split(",").map((header) => header.trim())
        rows.shift() // Remove header row
      }

      // Process rows into objects
      const processedRows = rows
        .filter((row) => row.trim().length > 0) // Skip empty rows
        .map((row) => {
          const values = row.split(",")
          const rowObject = {}

          // Map values to headers
          headers.forEach((header, index) => {
            rowObject[header] = values[index] ? values[index].trim() : ""
          })

          return rowObject
        })

      // Update row count
      rowCount += processedRows.length

      // Send the processed rows to the callback
      onChunk?.(processedRows, headers)

      return processedRows
    }

    // Read the file in chunks
    const readNextChunk = () => {
      if (offset >= file.size) {
        // We've reached the end of the file
        onComplete?.(rowCount, headers)
        resolve({ rowCount, headers })
        return
      }

      // Calculate the next chunk size
      const chunk = file.slice(offset, offset + 1024 * 1024) // Read 1MB at a time
      reader.readAsText(chunk)
    }

    // Handle chunk loaded
    reader.onload = (e) => {
      try {
        const chunkText = e.target.result
        processChunk(chunkText)

        // Update offset and progress
        offset += chunkText.length
        const progress = Math.min(100, Math.round((offset / totalSize) * 100))
        onProgress?.(progress)

        // Read the next chunk
        readNextChunk()
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = (error) => {
      reject(error)
    }

    // Start reading
    readNextChunk()
  })
}

/**
 * Calculate memory-efficient chunk size based on file size
 * @param {number} fileSize - Size of the file in bytes
 * @returns {number} - Optimal chunk size in bytes
 */
export function calculateOptimalChunkSize(fileSize) {
  // For very large files (>100MB), use smaller chunks to avoid memory issues
  if (fileSize > 100 * 1024 * 1024) {
    return 5 * 1024 * 1024 // 5MB chunks
  }

  // For medium files (20MB-100MB), use 10MB chunks
  if (fileSize > 20 * 1024 * 1024) {
    return 10 * 1024 * 1024 // 10MB chunks
  }

  // For smaller files, use larger chunks for fewer requests
  return 15 * 1024 * 1024 // 15MB chunks
}

/**
 * Validate a CSV file before upload
 * @param {File} file - The file to validate
 * @returns {Promise<{valid: boolean, message: string}>} - Validation result
 */
export async function validateCSVFile(file) {
  // Check file type
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { valid: false, message: "File must be a CSV file" }
  }

  // Check file size (max 2GB)
  if (file.size > 2 * 1024 * 1024 * 1024) {
    return { valid: false, message: "File size exceeds the 2GB limit" }
  }

  try {
    // Read the first few rows to validate structure
    const sample = file.slice(0, 10 * 1024) // Read first 10KB
    const text = await readFileAsText(sample)
    const rows = text.split("\n")

    // Check if file has content
    if (rows.length < 2) {
      return { valid: false, message: "CSV file appears to be empty or invalid" }
    }

    // Check header row
    const headers = rows[0].split(",")
    if (headers.length < 2) {
      return { valid: false, message: "CSV file must have at least two columns" }
    }

    return { valid: true, message: "File is valid" }
  } catch (error) {
    return { valid: false, message: `Error validating file: ${error.message}` }
  }
}

/**
 * Helper function to read a file as text
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = (e) => reject(e.target.error)
    reader.readAsText(file)
  })
}

/**
 * Calculate file hash for verification
 * @param {File} file - The file to hash
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<string>} - File hash
 */
export async function calculateFileHash(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const chunkSize = 2 * 1024 * 1024 // 2MB chunks
    let offset = 0
    let hash = 0

    reader.onload = (e) => {
      try {
        // Simple hash function for demo purposes
        // In production, use a proper hash function like SHA-256
        const text = e.target.result
        for (let i = 0; i < text.length; i++) {
          hash = (hash << 5) - hash + text.charCodeAt(i)
          hash |= 0 // Convert to 32bit integer
        }

        offset += chunkSize
        const progress = Math.min(100, Math.round((offset / file.size) * 100))
        onProgress?.(progress)

        if (offset < file.size) {
          readNextChunk()
        } else {
          resolve(hash.toString(16))
        }
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = (error) => {
      reject(error)
    }

    function readNextChunk() {
      const chunk = file.slice(offset, offset + chunkSize)
      reader.readAsText(chunk)
    }

    readNextChunk()
  })
}
