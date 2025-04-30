"use client"

import { useState, useRef, useCallback } from "react"
import { toast } from "react-toastify"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileUp, X, AlertTriangle, CheckCircle } from "lucide-react"
import { uploadLargeFile, validateCSVFile, calculateOptimalChunkSize } from "@/app/utils/csv-uploader"

/**
 * Component for uploading large CSV files with progress tracking
 */
export default function LargeFileUploader({
  system,
  endpoint,
  onFileSelected,
  onUploadComplete,
  onUploadError,
  className,
}) {
  const [file, setFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [validationError, setValidationError] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const abortControllerRef = useRef(null)
  const fileInputRef = useRef(null)

  // Handle file selection
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    try {
      setValidationError(null)
      setUploadError(null)

      // Validate the file
      const validation = await validateCSVFile(selectedFile)
      if (!validation.valid) {
        setValidationError(validation.message)
        toast.error(validation.message)
        return
      }

      setFile(selectedFile)
      setUploadProgress(0)
      onFileSelected?.(selectedFile)

      toast.success(`File selected: ${selectedFile.name} (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)`)
    } catch (error) {
      setValidationError(`Error validating file: ${error.message}`)
      toast.error(`Error validating file: ${error.message}`)
    }
  }

  // Handle drag and drop
  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]

      try {
        setValidationError(null)
        setUploadError(null)

        // Validate the file
        const validation = await validateCSVFile(droppedFile)
        if (!validation.valid) {
          setValidationError(validation.message)
          toast.error(validation.message)
          return
        }

        setFile(droppedFile)
        setUploadProgress(0)
        onFileSelected?.(droppedFile)

        toast.success(`File dropped: ${droppedFile.name} (${(droppedFile.size / (1024 * 1024)).toFixed(2)} MB)`)
      } catch (error) {
        setValidationError(`Error validating file: ${error.message}`)
        toast.error(`Error validating file: ${error.message}`)
      }
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  // Start the upload process
  const startUpload = useCallback(async () => {
    if (!file) {
      toast.error("Please select a file first")
      return
    }

    try {
      setIsUploading(true)
      setUploadError(null)
      abortControllerRef.current = new AbortController()

      // Calculate optimal chunk size based on file size
      const chunkSize = calculateOptimalChunkSize(file.size)

      // Start the upload
      const serverUploadId = await uploadLargeFile(
        file,
        system,
        endpoint,
        (progress) => setUploadProgress(progress),
        abortControllerRef.current.signal,
        chunkSize,
      )

      setIsUploading(false)
      toast.success(`File ${system} uploaded successfully`)
      onUploadComplete?.(serverUploadId, file)
    } catch (error) {
      setIsUploading(false)

      if (error.name === "AbortError" || error.message === "Upload cancelled") {
        toast.info(`Upload of ${file.name} was cancelled`)
      } else {
        setUploadError(`Error uploading file: ${error.message}`)
        toast.error(`Error uploading file: ${error.message}`)
        onUploadError?.(error)
      }
    }
  }, [file, system, endpoint, onUploadComplete, onUploadError])

  // Cancel the upload
  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsUploading(false)
      toast.info("File upload has been cancelled")
    }
  }

  // Reset the component
  const resetUploader = () => {
    setFile(null)
    setUploadProgress(0)
    setValidationError(null)
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Card className={className}>
      <CardHeader
        className={`bg-gradient-to-r ${system === "A" ? "from-blue-50 to-blue-100" : "from-purple-50 to-purple-100"} border-b`}
      >
        <CardTitle>Source System {system}</CardTitle>
        <CardDescription>Upload the CSV file from System {system}</CardDescription>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Validation Error */}
        {validationError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        {/* Upload Error */}
        {uploadError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}

        {/* File Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center h-40 transition-all duration-300 ${
            file
              ? "border-green-500 bg-green-50"
              : system === "A"
                ? "border-blue-300 hover:border-blue-400 hover:bg-blue-50"
                : "border-purple-300 hover:border-purple-400 hover:bg-purple-50"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {file ? (
            <>
              <CheckCircle className="h-8 w-8 text-green-500 mb-2 animate-scaleIn" />
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            </>
          ) : (
            <>
              <FileUp
                className={`h-8 w-8 mb-2 transition-colors duration-300 ${system === "A" ? "text-blue-500" : "text-purple-500"}`}
              />
              <p className="text-sm font-medium">Drag & drop your CSV file here</p>
              <p className="text-xs text-gray-500">or click to browse</p>
            </>
          )}
          <input
            type="file"
            accept=".csv"
            className="hidden"
            id={`file-upload-${system.toLowerCase()}`}
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            className={`flex-1 transition-all duration-300 ${file ? "border-green-500 text-green-600 hover:bg-green-50" : system === "A" ? "hover:bg-blue-50 hover:text-blue-600" : "hover:bg-purple-50 hover:text-purple-600"}`}
            onClick={() => document.getElementById(`file-upload-${system.toLowerCase()}`).click()}
            disabled={isUploading}
          >
            {file ? "Change File" : "Select File"}
          </Button>

          {file && !isUploading && (
            <Button
              onClick={startUpload}
              className={`flex-1 gap-2 transition-all duration-300 ${
                system === "A" ? "bg-blue-500 hover:bg-blue-600" : "bg-purple-500 hover:bg-purple-600"
              }`}
            >
              <FileUp className="h-4 w-4" />
              Upload
            </Button>
          )}

          {isUploading && (
            <Button variant="destructive" onClick={cancelUpload} className="flex-1 gap-2">
              <X className="h-4 w-4" />
              Cancel
            </Button>
          )}

          {file && !isUploading && (
            <Button variant="ghost" onClick={resetUploader} className="w-10 p-0">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
