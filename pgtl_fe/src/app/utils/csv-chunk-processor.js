/**
 * Utility for processing large CSV files in chunks
 * Handles parsing, chunking, and sending data to the reconciliation API
 */

/**
 * Process a large CSV file in chunks and send to the reconciliation API
 *
 * @param {File} fileA - CSV file from System A
 * @param {File} fileB - CSV file from System B
 * @param {Function} onProgress - Progress callback function
 * @param {Function} onComplete - Completion callback function
 * @param {Function} onError - Error callback function
 * @param {Object} options - Configuration options
 */
export async function processLargeCSVFiles(fileA, fileB, onProgress, onComplete, onError, options = {}) {
    try {
      // Default options
      const config = {
        chunkSize: 10000, // Number of rows per chunk
        endpoint: "/api/reconcile/chunk",
        idField: "id",
        amountField: "amount",
        statusField: "status",
        ...options,
      }

      // Generate a unique session ID
      const sessionId = `recon-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`

      // Initialize the reconciliation session
      const initResponse = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          action: "init",
          options: {
            idField: config.idField,
            amountField: config.amountField,
            statusField: config.statusField,
          },
        }),
      })

      if (!initResponse.ok) {
        const error = await initResponse.json()
        throw new Error(error.message || "Failed to initialize reconciliation")
      }

      // Parse and estimate total chunks
      const [totalRowsA, headersA] = await estimateRowCount(fileA)
      const [totalRowsB, headersB] = await estimateRowCount(fileB)

      const totalChunksA = Math.ceil(totalRowsA / config.chunkSize)
      const totalChunksB = Math.ceil(totalRowsB / config.chunkSize)
      const totalChunks = Math.max(totalChunksA, totalChunksB)

      onProgress({
        phase: "init",
        message: `Starting reconciliation of ${totalRowsA.toLocaleString()} rows from System A and ${totalRowsB.toLocaleString()} rows from System B`,
        progress: 0,
      })

      // Process both files in parallel chunks
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        // Parse chunks from both files
        const chunkA = await parseCSVChunk(fileA, chunkIndex * config.chunkSize, config.chunkSize, headersA)
        const chunkB = await parseCSVChunk(fileB, chunkIndex * config.chunkSize, config.chunkSize, headersB)

        // Send chunks to the API
        const processResponse = await fetch(config.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            action: "process",
            systemA: chunkA,
            systemB: chunkB,
            chunkIndex,
            totalChunks,
          }),
        })

        if (!processResponse.ok) {
          const error = await processResponse.json()
          throw new Error(error.message || `Failed to process chunk ${chunkIndex}`)
        }

        const processResult = await processResponse.json()

        // Update progress
        onProgress({
          phase: "processing",
          chunkIndex,
          totalChunks,
          progress: processResult.progress,
          currentStats: processResult.currentStats,
        })
      }

      // Finalize the reconciliation
      const finalizeResponse = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          action: "finalize",
        }),
      })

      if (!finalizeResponse.ok) {
        const error = await finalizeResponse.json()
        throw new Error(error.message || "Failed to finalize reconciliation")
      }

      const finalResult = await finalizeResponse.json()

      // Call the completion callback with the results
      onComplete(finalResult.results)
    } catch (error) {
      onError(error)
    }
  }

  /**
   * Estimate the number of rows in a CSV file
   *
   * @param {File} file - CSV file
   * @returns {Promise<[number, string[]]>} - [Estimated row count, Headers]
   */
  async function estimateRowCount(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const sample = e.target.result
          const lines = sample.split("\n")
          const headers = lines[0].split(",").map((h) => h.trim())

          // Count newlines in the sample
          const newlineCount = (sample.match(/\n/g) || []).length

          // Estimate total rows based on file size and average row size
          const avgRowSize = sample.length / newlineCount
          const estimatedRows = Math.ceil(file.size / avgRowSize)

          resolve([estimatedRows, headers])
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = (error) => {
        reject(error)
      }

      // Read first 100KB to estimate
      reader.readAsText(file.slice(0, 100 * 1024))
    })
  }

  /**
   * Parse a chunk of a CSV file
   *
   * @param {File} file - CSV file
   * @param {number} startRow - Starting row index
   * @param {number} rowCount - Number of rows to parse
   * @param {string[]} headers - CSV headers
   * @returns {Promise<Array>} - Array of parsed objects
   */
  async function parseCSVChunk(file, startRow, rowCount, headers) {
    return new Promise((resolve, reject) => {
      // First, we need to find the byte position of the starting row
      findBytePositionOfRow(file, startRow)
        .then((startByte) => {
          // Now read a chunk from that position
          const reader = new FileReader()

          reader.onload = (e) => {
            try {
              const chunkText = e.target.result
              const rows = chunkText.split("\n")

              // Parse each row into an object
              const parsedRows = rows
                .filter((row) => row.trim().length > 0)
                .slice(0, rowCount) // Limit to requested row count
                .map((row) => {
                  const values = row.split(",")
                  const obj = {}

                  // Map values to headers
                  headers.forEach((header, index) => {
                    obj[header] = values[index] ? values[index].trim() : ""
                  })

                  return obj
                })

              resolve(parsedRows)
            } catch (error) {
              reject(error)
            }
          }

          reader.onerror = (error) => {
            reject(error)
          }

          // Read a chunk large enough to contain rowCount rows
          // This is an estimate and might need adjustment
          const estimatedBytesPerRow = 200 // Adjust based on your data
          const bytesToRead = rowCount * estimatedBytesPerRow
          reader.readAsText(file.slice(startByte, startByte + bytesToRead))
        })
        .catch(reject)
    })
  }

  /**
   * Find the byte position of a specific row in a CSV file
   *
   * @param {File} file - CSV file
   * @param {number} targetRow - Row index to find
   * @returns {Promise<number>} - Byte position
   */
  async function findBytePositionOfRow(file, targetRow) {
    if (targetRow === 0) {
      return 0 // First row starts at byte 0
    }

    return new Promise((resolve, reject) => {
      const chunkSize = 1024 * 1024 // 1MB chunks
      let rowCount = 0
      let bytePosition = 0
      let pendingText = ""

      // Function to process each chunk
      const processChunk = (start) => {
        if (start >= file.size || rowCount >= targetRow) {
          resolve(bytePosition)
          return
        }

        const reader = new FileReader()
        const end = Math.min(start + chunkSize, file.size)

        reader.onload = (e) => {
          try {
            const text = pendingText + e.target.result
            const lines = text.split("\n")

            // If the last line is incomplete, save it for the next chunk
            pendingText = lines.pop() || ""

            // Count complete rows in this chunk
            const newRows = lines.length

            if (rowCount + newRows >= targetRow) {
              // Target row is in this chunk
              const rowsNeeded = targetRow - rowCount
              const partialText = lines.slice(0, rowsNeeded).join("\n")

              // Calculate byte position
              bytePosition = start + partialText.length + rowsNeeded // Add newlines
              if (rowsNeeded > 0) bytePosition += pendingText.length

              resolve(bytePosition)
            } else {
              // Target row is in a later chunk
              rowCount += newRows
              processChunk(end)
            }
          } catch (error) {
            reject(error)
          }
        }

        reader.onerror = (error) => {
          reject(error)
        }

        reader.readAsText(file.slice(start, end))
      }

      // Start processing from the beginning
      processChunk(0)
    })
  }

  /**
   * Example usage of the CSV chunk processor
   */
  export function reconcileLargeCSVFiles(fileA, fileB, onProgress, onComplete, onError) {
    processLargeCSVFiles(
      fileA,
      fileB,
      (progress) => {
        console.log(`Processing: ${progress.progress}%`)
        onProgress(progress)
      },
      (results) => {
        console.log("Reconciliation complete:", results)
        onComplete(results)
      },
      (error) => {
        console.error("Error during reconciliation:", error)
        onError(error)
      },
      {
        chunkSize: 5000, // Adjust based on your data and memory constraints
        idField: "id", // Field that uniquely identifies transactions
        amountField: "amount", // Field containing transaction amounts
        statusField: "status", // Field containing transaction status
      },
    )
  }
