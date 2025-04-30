"use client"

import { useState, useCallback } from "react"
import { toast } from "react-toastify"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, AlertTriangle, FileUp } from "lucide-react"
import LargeFileUploader from "@/app/components/large-file-uploader"
import { reconcileLargeCSVFiles } from "@/app/utils/csv-chunk-processor"

export default function CSVReconciliation() {
  const [fileA, setFileA] = useState(null)
  const [fileB, setFileB] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressPhase, setProgressPhase] = useState("")
  const [progressMessage, setProgressMessage] = useState("")
  const [currentStats, setCurrentStats] = useState(null)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const handleStartReconciliation = useCallback(() => {
    if (!fileA || !fileB) {
      toast.error("Please select both files first")
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setProgressPhase("init")
    setProgressMessage("Preparing to process files...")
    setCurrentStats(null)
    setResults(null)
    setError(null)

    reconcileLargeCSVFiles(
      fileA,
      fileB,
      (progressInfo) => {
        setProgress(progressInfo.progress || 0)
        setProgressPhase(progressInfo.phase)
        setProgressMessage(progressInfo.message || "")

        if (progressInfo.currentStats) {
          setCurrentStats(progressInfo.currentStats)
        }
      },
      (finalResults) => {
        setIsProcessing(false)
        setResults(finalResults)
        toast.success("Reconciliation completed successfully")
      },
      (err) => {
        setIsProcessing(false)
        setError(err.message)
        toast.error(`Error during reconciliation: ${err.message}`)
      },
    )
  }, [fileA, fileB])

  const resetForm = () => {
    setFileA(null)
    setFileB(null)
    setIsProcessing(false)
    setProgress(0)
    setProgressPhase("")
    setProgressMessage("")
    setCurrentStats(null)
    setResults(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      {/* File Uploaders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LargeFileUploader
          system="A"
          endpoint="/api/reconcile"
          onFileSelected={setFileA}
          onUploadComplete={() => {}}
          onUploadError={() => {}}
        />

        <LargeFileUploader
          system="B"
          endpoint="/api/reconcile"
          onFileSelected={setFileB}
          onUploadComplete={() => {}}
          onUploadError={() => {}}
        />
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="animate-fadeIn">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <Card className="border shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
            <CardTitle>Processing Files</CardTitle>
            <CardDescription>{progressPhase === "init" ? "Preparing files..." : "Reconciling data..."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 p-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{progressMessage || "Processing..."}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2 animate-pulse" />
            </div>

            {currentStats && (
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Records Processed:</strong> System A: {currentStats.totalRecordsA.toLocaleString()}, System B:{" "}
                  {currentStats.totalRecordsB.toLocaleString()}
                </p>
                <p>
                  <strong>Matched:</strong> {currentStats.matched.toLocaleString()}
                </p>
                <p>
                  <strong>Discrepancies:</strong> {currentStats.discrepancies.toLocaleString()}
                </p>
              </div>
            )}

            <div className="flex justify-center">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-purple-500 border-l-transparent animate-spin"></div>
                <div className="absolute inset-3 rounded-full border-4 border-t-transparent border-r-blue-300 border-b-transparent border-l-purple-300 animate-spin animation-delay-500"></div>
                <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-700">{progress}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {results && !isProcessing && (
        <Card className="border shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 border-b">
            <CardTitle>Reconciliation Results</CardTitle>
            <CardDescription>Summary of the reconciliation between System A and System B</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-white rounded-lg border shadow-sm">
                <h3 className="text-sm font-medium text-gray-500">Total Records</h3>
                <p className="text-2xl font-bold mt-1">{results.totalRecords.systemA.toLocaleString()}</p>
                <div className="text-xs text-gray-500 mt-1">
                  <p>System A: {results.totalRecords.systemA.toLocaleString()}</p>
                  <p>System B: {results.totalRecords.systemB.toLocaleString()}</p>
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border shadow-sm">
                <h3 className="text-sm font-medium text-gray-500">Matched</h3>
                <p className="text-2xl font-bold text-green-600 mt-1">{results.matched.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {((results.matched / results.totalRecords.systemA) * 100).toFixed(2)}% of total
                </p>
              </div>

              <div className="p-4 bg-white rounded-lg border shadow-sm">
                <h3 className="text-sm font-medium text-gray-500">Discrepancies</h3>
                <p className="text-2xl font-bold text-amber-600 mt-1">{results.discrepancies.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {((results.discrepancies / results.totalRecords.systemA) * 100).toFixed(2)}% of total
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-white rounded-lg border shadow-sm">
                <h3 className="text-sm font-medium text-gray-500">Missing Records</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm">
                    In System A:{" "}
                    <span className="font-medium text-red-600">{results.missing.inA.toLocaleString()}</span>
                  </p>
                  <p className="text-sm">
                    In System B:{" "}
                    <span className="font-medium text-red-600">{results.missing.inB.toLocaleString()}</span>
                  </p>
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border shadow-sm">
                <h3 className="text-sm font-medium text-gray-500">Amount Mismatches</h3>
                <p className="text-xl font-medium text-amber-600 mt-1">{results.amountMismatch.toLocaleString()}</p>
              </div>

              <div className="p-4 bg-white rounded-lg border shadow-sm">
                <h3 className="text-sm font-medium text-gray-500">Status Mismatches</h3>
                <p className="text-xl font-medium text-purple-600 mt-1">{results.statusMismatch.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button variant="outline" onClick={resetForm}>
                New Reconciliation
              </Button>
              <Button>View Detailed Report</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end">
        <Button
          onClick={handleStartReconciliation}
          disabled={!fileA || !fileB || isProcessing}
          className="gap-2 transition-all duration-300 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-md hover:shadow-lg"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <FileUp className="h-4 w-4" />
              Start Reconciliation
            </>
          )}
        </Button>
      </div>

      {/* Instructions Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 text-sm text-blue-700">
          <h3 className="font-medium mb-2">Processing Large CSV Files</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Files are processed in chunks to handle large sizes efficiently</li>
            <li>Each file can be up to 2GB in size with millions of rows</li>
            <li>The reconciliation process may take several minutes for very large files</li>
            <li>Progress is reported in real-time as chunks are processed</li>
            <li>Memory usage is optimized to prevent browser crashes</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
