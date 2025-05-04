"use client"

import { useState, useRef } from "react"
import { toast } from "react-toastify"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"
import LargeFileUploader from "./large-file-uploader"


export default function ReconciliationForm({ onStartReconciliation }) {
  const [fileA, setFileA] = useState(null)
  const [fileB, setFileB] = useState(null)
  const [fileIdA, setFileIdA] = useState(null)
  const [fileIdB, setFileIdB] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const abortControllerRef = useRef(null)

  const API_BASE_URL = process.env.NEXT_PUBLIC_LOCAL_BASE_URL || 'http://localhost:3000'

  // UPLOAD--> Handle file upload completion
  const handleUploadComplete = (system, fileId, file) => {
    if (system === "A") {
      setFileIdA(fileId)
    } else {
      setFileIdB(fileId)
    }

    // If both files are uploaded, enable the reconciliation button
    if ((system === "A" && fileIdB) || (system === "B" && fileIdA)) {
      setIsUploading(false)
    }
  }

  // Handle file upload error
  const handleUploadError = () => {
    setIsUploading(false)
  }

  // RECONCILIATION--> Start the reconciliation process
  const startReconciliation = async () => {
    console.log("fileIdA: ", fileIdA)
    console.log("fileIdB: ", fileIdB)
    if (!fileIdA || !fileIdB) {
      toast.error("Please upload both files first")
      return
    }

    try {
      // Call the reconciliation API
      const response = await fetch(`${API_BASE_URL}/api/reconcile/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // body: formData,
        body: JSON.stringify({
          fileIdA,
          fileIdB,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to start reconciliation")
      }

      const data = await response.json()

      // Call the parent component's callback with the job ID\
      console.log("job id in startReconciliation : ", data.jobId)
      onStartReconciliation(data.jobId)

      toast.success("Reconciliation process started")
    } catch (error) {
      toast.error(`Error starting reconciliation: ${error.message}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System A File Uploader */}
        <LargeFileUploader
          system="A"
          endpoint="/api/reconcile"
          onFileSelected={setFileA}
          onUploadComplete={(fileId, file) => handleUploadComplete("A", fileId, file)}
          onUploadError={handleUploadError}
        />

        {/* System B File Uploader */}
        <LargeFileUploader
          system="B"
          endpoint="/api/reconcile"
          onFileSelected={setFileB}
          onUploadComplete={(fileId, file) => handleUploadComplete("B", fileId, file)}
          onUploadError={handleUploadError}
        />
      </div>

      {/* Start Reconciliation Button */}
      <div className="flex justify-end">
        <Button
          onClick={startReconciliation}
          disabled={!fileIdA || !fileIdB || isUploading}
          className="gap-2 transition-all duration-300 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-md hover:shadow-lg"
        >
          <RefreshCw className="h-4 w-4" />
          Start Reconciliation
        </Button>
      </div>

      {/* Instructions Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 text-sm text-blue-700">
          <h3 className="font-medium mb-2">Tips for Large CSV Files</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Files are uploaded in chunks to handle large sizes efficiently</li>
            <li>Each file can be up to 2GB in size</li>
            <li>The upload can be paused or cancelled at any time</li>
            <li>For best performance, ensure your CSV files have consistent formatting</li>
            <li>The reconciliation process may take several minutes for very large files</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
