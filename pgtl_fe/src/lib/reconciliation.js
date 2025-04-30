/**
 * Core reconciliation logic for comparing financial data between two systems
 *
 * This module contains the functions for performing reconciliation between
 * financial data from two different systems, identifying discrepancies,
 * and generating summary statistics.
 */

/**
 * Perform reconciliation between two datasets
 *
 * @param {Array} dataA - Array of transaction objects from System A
 * @param {Array} dataB - Array of transaction objects from System B
 * @param {Object} options - Configuration options for reconciliation
 * @returns {Object} Reconciliation results
 */
export async function performReconciliation(dataA, dataB, options = {}) {
    // Default options
    const config = {
      idField: "transactionId",
      amountField: "amount",
      statusField: "status",
      timestampField: "timestamp",
      ...options,
    }

    // Create indexes for faster lookups
    const indexB = createIndex(dataB, config.idField)

    // Initialize result counters
    const results = {
      totalRecords: {
        systemA: dataA.length,
        systemB: dataB.length,
      },
      matched: 0,
      discrepancies: 0,
      missing: {
        inA: 0,
        inB: 0,
      },
      amountMismatch: 0,
      statusMismatch: 0,
      samples: [],
    }

    // Track sample discrepancies (limited to keep memory usage reasonable)
    const sampleMissingInB = []
    const sampleAmountMismatch = []
    const sampleStatusMismatch = []

    // First pass: Check records in System A against System B
    for (const recordA of dataA) {
      const id = recordA[config.idField]
      const recordB = indexB[id]

      if (!recordB) {
        // Record exists in A but not in B
        results.missing.inB++
        results.discrepancies++

        // Collect sample if needed
        if (sampleMissingInB.length < 10) {
          sampleMissingInB.push({
            id,
            timestampA: recordA[config.timestampField],
            timestampB: null,
            amountA: recordA[config.amountField],
            amountB: null,
            currency: recordA.currency || "USD",
            statusA: recordA[config.statusField],
            statusB: null,
            issue: "MISSING_IN_B",
            details: {
              location: recordA.location || "Unknown",
              merchant: recordA.merchant || "Unknown",
              category: recordA.category || "Unknown",
              notes: "Transaction exists in System A but not in System B",
            },
          })
        }
      } else {
        // Record exists in both systems, check for discrepancies
        if (recordA[config.amountField] !== recordB[config.amountField]) {
          // Amount mismatch
          results.amountMismatch++
          results.discrepancies++

          // Collect sample if needed
          if (sampleAmountMismatch.length < 10) {
            sampleAmountMismatch.push({
              id,
              timestampA: recordA[config.timestampField],
              timestampB: recordB[config.timestampField],
              amountA: recordA[config.amountField],
              amountB: recordB[config.amountField],
              currency: recordA.currency || recordB.currency || "USD",
              statusA: recordA[config.statusField],
              statusB: recordB[config.statusField],
              issue: "AMOUNT_MISMATCH",
              details: {
                location: recordA.location || recordB.location || "Unknown",
                merchant: recordA.merchant || recordB.merchant || "Unknown",
                category: recordA.category || recordB.category || "Unknown",
                notes: `Amount discrepancy: ${recordA[config.amountField]} vs ${recordB[config.amountField]}`,
              },
            })
          }
        } else if (recordA[config.statusField] !== recordB[config.statusField]) {
          // Status mismatch
          results.statusMismatch++
          results.discrepancies++

          // Collect sample if needed
          if (sampleStatusMismatch.length < 10) {
            sampleStatusMismatch.push({
              id,
              timestampA: recordA[config.timestampField],
              timestampB: recordB[config.timestampField],
              amountA: recordA[config.amountField],
              amountB: recordB[config.amountField],
              currency: recordA.currency || recordB.currency || "USD",
              statusA: recordA[config.statusField],
              statusB: recordB[config.statusField],
              issue: "STATUS_MISMATCH",
              details: {
                location: recordA.location || recordB.location || "Unknown",
                merchant: recordA.merchant || recordB.merchant || "Unknown",
                category: recordA.category || recordB.category || "Unknown",
                notes: `Status mismatch: ${recordA[config.statusField]} vs ${recordB[config.statusField]}`,
              },
            })
          }
        } else {
          // Perfect match
          results.matched++
        }

        // Mark this record as processed
        delete indexB[id]
      }
    }

    // Second pass: Find records in B that don't exist in A
    const sampleMissingInA = []
    for (const id in indexB) {
      const recordB = indexB[id]
      results.missing.inA++
      results.discrepancies++

      // Collect sample if needed
      if (sampleMissingInA.length < 10) {
        sampleMissingInA.push({
          id,
          timestampA: null,
          timestampB: recordB[config.timestampField],
          amountA: null,
          amountB: recordB[config.amountField],
          currency: recordB.currency || "USD",
          statusA: null,
          statusB: recordB[config.statusField],
          issue: "MISSING_IN_A",
          details: {
            location: recordB.location || "Unknown",
            merchant: recordB.merchant || "Unknown",
            category: recordB.category || "Unknown",
            notes: "Transaction exists in System B but not in System A",
          },
        })
      }
    }

    // Combine samples
    results.samples = [
      ...sampleMissingInA.slice(0, 5),
      ...sampleMissingInB.slice(0, 5),
      ...sampleAmountMismatch.slice(0, 5),
      ...sampleStatusMismatch.slice(0, 5),
    ]

    // Add a perfect match sample if we have matches
    if (results.matched > 0) {
      // Find a matched record
      for (const recordA of dataA) {
        const id = recordA[config.idField]
        const recordB = dataB.find((r) => r[config.idField] === id)

        if (
          recordB &&
          recordA[config.amountField] === recordB[config.amountField] &&
          recordA[config.statusField] === recordB[config.statusField]
        ) {
          results.samples.unshift({
            id,
            timestampA: recordA[config.timestampField],
            timestampB: recordB[config.timestampField],
            amountA: recordA[config.amountField],
            amountB: recordB[config.amountField],
            currency: recordA.currency || recordB.currency || "USD",
            statusA: recordA[config.statusField],
            statusB: recordB[config.statusField],
            issue: null,
            details: {
              location: recordA.location || recordB.location || "Unknown",
              merchant: recordA.merchant || recordB.merchant || "Unknown",
              category: recordA.category || recordB.category || "Unknown",
              notes: "Transaction matches across both systems",
            },
          })
          break
        }
      }
    }

    return results
  }

  /**
   * Create an index of records by ID for faster lookups
   *
   * @param {Array} data - Array of objects to index
   * @param {string} idField - Field to use as the index key
   * @returns {Object} Index object with IDs as keys and records as values
   */
  function createIndex(data, idField) {
    const index = {}
    for (const record of data) {
      index[record[idField]] = record
    }
    return index
  }

  /**
   * Parse CSV data into an array of objects
   *
   * @param {string} csvData - Raw CSV data as a string
   * @param {Object} options - Configuration options for parsing
   * @returns {Array} Array of objects representing the CSV data
   */
  export function parseCSV(csvData, options = {}) {
    const lines = csvData.split("\n")
    if (lines.length === 0) return []

    // Extract headers from the first line
    const headers = lines[0].split(",").map((h) => h.trim())

    // Parse each data line
    const results = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = line.split(",")
      const obj = {}

      // Map values to headers
      headers.forEach((header, index) => {
        obj[header] = values[index] ? values[index].trim() : ""
      })

      results.push(obj)
    }

    return results
  }

  /**
   * Generate a summary report of reconciliation results
   *
   * @param {Object} results - Reconciliation results
   * @returns {string} Formatted summary report
   */
  export function generateSummaryReport(results) {
    const matchPercentage = ((results.matched / results.totalRecords.systemA) * 100).toFixed(2)

    return `
  Reconciliation Summary Report
  ============================

  Total Records:
    System A: ${results.totalRecords.systemA.toLocaleString()}
    System B: ${results.totalRecords.systemB.toLocaleString()}

  Matched Records: ${results.matched.toLocaleString()} (${matchPercentage}%)

  Discrepancies: ${results.discrepancies.toLocaleString()}
    Missing in System A: ${results.missing.inA.toLocaleString()}
    Missing in System B: ${results.missing.inB.toLocaleString()}
    Amount Mismatches: ${results.amountMismatch.toLocaleString()}
    Status Mismatches: ${results.statusMismatch.toLocaleString()}

  Sample Discrepancies:
  ${results.samples
    .filter((s) => s.issue)
    .map((s) => `  - ${s.id}: ${s.issue} (${s.details.notes})`)
    .join("\n")}
  `
  }
