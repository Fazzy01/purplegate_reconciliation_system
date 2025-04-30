"use client"

import { useState, useCallback } from "react"
import { toast } from "react-toastify"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, AlertTriangle, FileUp } from "lucide-react"
import { processLargeCSVFiles, directUpload } from "@/app/utils/csv-processor"

export default function LargeCSVReconciliation() {
  const [file1, setFile1] = useState(null)
  const [file2, setFile2] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress1, setProgress1] = useState(0)
  const [progress2, setProgress2] = useState(0)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const handleFileChange = (e, fileNum) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.name.toLowerCase().endsWith(".csv")) {
      if (fileNum === 1) {
        setFile1(file)
      } else {
        setFile2(file)
      }
      toast.success(`Selected ${file.name}`)
    } else {
      toast.error("Please select a CSV file")
    }
  }

  const handleDrop = (e, fileNum) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]

      if (file.name.toLowerCase().endsWith(".csv")) {
        if (fileNum === 1) {
          setFile1(file)
        } else {
          setFile2(file)
        }
        toast.success(`Dropped ${file.name}`)
      } else {
        toast.error("Please drop a CSV file")
      }
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleStartReconciliation = useCallback(async () => {
    if (!file1 || !file2) {
      toast.error("Please select both files first")
      return
    }

    setIsProcessing(true)
    setProgress1(0)
    setProgress2(0)
    setResults(null)
    setError(null)

    try {
      // Determine if we should use direct upload or chunked upload
      const isLargeFile = file1.size > 50 * 1024 * 1024 || file2.size > 50 * 1024 * 1024

      if (isLargeFile) {
        // Use chunked upload for large files
        await processLargeCSVFiles(
          file1,
          file2,
          (progressInfo) => {
            if (progressInfo.file === "file1") {
              setProgress1(progressInfo.progress)
            } else {
              setProgress2(progressInfo.progress)
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
      } else {
        // Use direct upload for smaller files
        const results = await directUpload(file1, file2)
        setResults(results)
        setIsProcessing(false)
        toast.success("Reconciliation completed successfully")
      }
    } catch (err) {
      setIsProcessing(false)
      setError(err.message)
      toast.error(`Error during reconciliation: ${err.message}`)
    }
  }, [file1, file2])

  const resetForm = () => {
    setFile1(null)
    setFile2(null)
    setIsProcessing(false)
    setProgress1(0)
    setProgress2(0)
    setResults(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      {/* File Uploaders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* File 1 Uploader */}
        <Card className="border shadow">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <CardTitle>System 1 CSV</CardTitle>
            <CardDescription>Upload the CSV file from System 1</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div
              className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center h-40 transition-all duration-300 ${
                file1 ? "border-green-500 bg-green-50" : "border-blue-300 hover:border-blue-400 hover:bg-blue-50"
              }`}
              onDrop={(e) => handleDrop(e, 1)}
              onDragOver={handleDragOver}
            >
              {file1 ? (
                <>
                  <div className="h-8 w-8 text-green-500 mb-2">✓</div>
                  <p className="text-sm font-medium">{file1.name}</p>
                  <p className="text-xs text-gray-500">{(file1.size / (1024 * 1024)).toFixed(2)} MB</p>
                </>
              ) : (
                <>
                  <FileUp className="h-8 w-8 mb-2 text-blue-500" />
                  <p className="text-sm font-medium">Drag & drop your CSV file here</p>
                  <p className="text-xs text-gray-500">or click to browse</p>
                </>
              )}
              <input
                type="file"
                accept=".csv"
                className="hidden"
                id="file-upload-1"
                onChange={(e) => handleFileChange(e, 1)}
              />
            </div>

            {isProcessing && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{progress1}%</span>
                </div>
                <Progress value={progress1} className="h-2" />
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => document.getElementById("file-upload-1").click()}
                disabled={isProcessing}
              >
                {file1 ? "Change File" : "Select File"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* File 2 Uploader */}
        <Card className="border shadow">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b">
            <CardTitle>System 2 CSV</CardTitle>
            <CardDescription>Upload the CSV file from System 2</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div
              className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center h-40 transition-all duration-300 ${
                file2 ? "border-green-500 bg-green-50" : "border-purple-300 hover:border-purple-400 hover:bg-purple-50"
              }`}
              onDrop={(e) => handleDrop(e, 2)}
              onDragOver={handleDragOver}
            >
              {file2 ? (
                <>
                  <div className="h-8 w-8 text-green-500 mb-2">✓</div>
                  <p className="text-sm font-medium">{file2.name}</p>
                  <p className="text-xs text-gray-500">{(file2.size / (1024 * 1024)).toFixed(2)} MB</p>
                </>
              ) : (
                <>
                  <FileUp className="h-8 w-8 mb-2 text-purple-500" />
                  <p className="text-sm font-medium">Drag & drop your CSV file here</p>
                  <p className="text-xs text-gray-500">or click to browse</p>
                </>
              )}
              <input
                type="file"
                accept=".csv"
                className="hidden"
                id="file-upload-2"
                onChange={(e) => handleFileChange(e, 2)}
              />
            </div>

            {isProcessing && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{progress2}%</span>
                </div>
                <Progress value={progress2} className="h-2" />
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => document.getElementById("file-upload-2").click()}
                disabled={isProcessing}
              >
                {file2 ? "Change File" : "Select File"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="animate-fadeIn">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results Display (simplified) */}
      {results && !isProcessing && (
        <Card className="border shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 border-b">
            <CardTitle>Reconciliation Results</CardTitle>
            <CardDescription>Summary of the reconciliation between systems</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <pre className="bg-gray-50 p-4 rounded-md overflow-auto max-h-96">{JSON.stringify(results, null, 2)}</pre>

            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={resetForm} className="mr-2">
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
          disabled={!file1 || !file2 || isProcessing}
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
            <li>Files are uploaded in chunks to handle large sizes efficiently</li>
            <li>Each file can be up to 100MB in size with millions of rows</li>
            <li>Small files (under 50MB) use direct upload for faster processing</li>
            <li>Large files are automatically split into 5MB chunks</li>
            <li>Progress is reported in real-time as chunks are uploaded</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
