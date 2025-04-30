const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { reconciliationJobs, saveJobsToFile } = require('./fileUpload');

async function startReconciliation(fileA, fileB) {
    console.log(`Starting reconciliation between ${fileA} and ${fileB}`);
    const transactionsA = await parseCSVWithValidation(fileA, 'System A');
    const transactionsB = await parseCSVWithValidation(fileB, 'System B');

    console.log(`Transactions in A: ${transactionsA.size}`);
    console.log(`Transactions in B: ${transactionsB.size}`);

    const samples = [];
    let missingInA = 0;
    let missingInB = 0;
    let amountMismatch = 0;
    let currencyMismatch = 0;
    let statusMismatch = 0;
    let matched = 0;

    const allTransactionIds = new Set([
      ...transactionsA.keys(),
      ...transactionsB.keys()
    ]);

    for (const id of allTransactionIds) {
      const txA = transactionsA.get(id);
      const txB = transactionsB.get(id);

      if (!txA && txB) {
        missingInA++;
        samples.push({
          transactionId: id,
          issues: ['MISSING_IN_A'],
          details: { systemA: null, systemB: txB }
        });
      } else if (txA && !txB) {
        missingInB++;
        samples.push({
          transactionId: id,
          issues: ['MISSING_IN_B'],
          details: { systemA: txA, systemB: null }
        });
      } else {
        const issues = [];

        if (txA.amount !== txB.amount) {
          issues.push('AMOUNT_MISMATCH');
          amountMismatch++;
        }
        if (txA.currency !== txB.currency) {
          issues.push('CURRENCY_MISMATCH');
          currencyMismatch++;
        }
        if (txA.status !== txB.status) {
          issues.push('STATUS_MISMATCH');
          statusMismatch++;
        }

        if (issues.length > 0) {
          samples.push({
            transactionId: id,
            issues,
            details: { systemA: txA, systemB: txB }
          });
        } else {
          matched++;
        }
      }
    }

    const report = {
      totalRecords: {
        systemA: transactionsA.size,
        systemB: transactionsB.size
      },
      matched,
      discrepancies: samples.length,
      missing: {
        inA: missingInA,
        inB: missingInB
      },
      mismatches: {
        amountMismatch,
        currencyMismatch,
        statusMismatch
      },
      samples
    };

    const reportDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

    const reportPath = path.join(reportDir, `reconciliation_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`Reconciliation complete. Report saved to ${reportPath}`);

    fs.unlinkSync(fileA);
    fs.unlinkSync(fileB);

    return report;
  }


async function processReconciliationAsync(file1Path, file2Path, jobId) {
  try {
    const report = await startReconciliation(file1Path, file2Path);

    reconciliationJobs.set(jobId, {
      status: 'completed',
      report,
      completedAt: new Date().toISOString(),
      createdAt: Date.now()
    });

    saveJobsToFile();
  } catch (error) {
    reconciliationJobs.set(jobId, {
      status: 'failed',
      error: error.message,
      createdAt: Date.now()
    });

    saveJobsToFile();
  }
}

async function parseCSVWithValidation(filePath, systemName) {
    return new Promise((resolve, reject) => {
      const transactions = new Map();
      let validated = false;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          if (!validated) {
            const requiredFields = ['transactionId', 'amount', 'currency', 'status', 'timestamp'];
            const missingFields = requiredFields.filter(field => !(field in row));
            if (missingFields.length > 0) {
              return reject(new Error(
                `Missing required columns in ${systemName}: ${missingFields.join(', ')}`
              ));
            }
            validated = true;
          }

          transactions.set(row.transactionId, {
            transactionId: row.transactionId,
            amount: row.amount,
            currency: row.currency,
            status: row.status,
            timestamp: row.timestamp
          });
        })
        .on('end', () => resolve(transactions))
        .on('error', reject);
    });
  }

module.exports = { startReconciliation, processReconciliationAsync };
