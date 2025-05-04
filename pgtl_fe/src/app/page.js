"use client"

import React, { useState, useRef } from "react"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import {
  BarChart3,
  PieChart,
  CheckCircle,
  AlertTriangle,
  Upload,
  RefreshCw,
  Download,
  Filter,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  Eye,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import ReconciliationForm from "@/components/reconciliation-form"


export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState(null)
  const [activeTab, setActiveTab] = useState("upload")
  const [progress, setProgress] = useState(0)
  const [jobId, setJobId] = useState(null)
  const [error, setError] = useState(null)
  const progressIntervalRef = useRef(null)
  const [expandedRow, setExpandedRow] = useState(null)
  const [filterType, setFilterType] = useState("all")
  const [chartData, setChartData] = useState({
    matched: 0,
    missing: 0,
    amountMismatch: 0,
    statusMismatch: 0,
  })

   const API_BASE_URL = process.env.NEXT_PUBLIC_LOCAL_BASE_URL || 'http://localhost:3000'

  // Start the reconciliation process
  const handleStartReconciliation = (newJobId) => {
    setJobId(newJobId)
    setIsProcessing(true)
    setActiveTab("processing")
    setProgress(0)

    // Start polling for progress updates
    startProgressPolling(newJobId)
  }

  // Poll for progress updates
  const startProgressPolling = (id) => {
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }

    // Set up polling interval (every 2 seconds) to confirm reconciliation process
    progressIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/reconcile/status/${id}`)

        if (!response.ok) {
          throw new Error("Failed to fetch progress")
        }

        const data = await response.json()
        console.log("Finding data.progress", data)
        setProgress(100)

        // If processing is complete, fetch results
        if (data.status === "completed") {
          clearInterval(progressIntervalRef.current)
          fetchResults(id)
        }
      } catch (error) {
        console.error("Error checking progress:", error)
        toast.error(`Error checking progress: ${error.message}`)
        clearInterval(progressIntervalRef.current)
        setError(`Error checking progress: ${error.message}`)
      }
    }, 2000)
  }

  // Fetch reconciliation results
  const fetchResults = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reconcile/results/${id}`)
      if (!response.ok) {
          throw new Error("Failed to fetch results")
        }

        const data = await response.json()
        console.log("result fetched inside fetch result : ", data)
      setResults(data)
      setIsProcessing(false)
      setActiveTab("results")

      // Update chart data
      setChartData({
        matched: data?.matched || 0,
        missing: (data?.missing?.inA || 0) + (data?.missing?.inB || 0),
        amountMismatch: data?.mismatches?.amountMismatch || 0,
        statusMismatch:
          data?.discrepancies - ((data?.missing?.inA || 0) + (data?.missing?.inB || 0) + (data?.mismatches?.amountMismatch || 0)) ||
          0,
      })

      toast.success("Reconciliation Complete")
    } catch (error) {
      console.error("Error fetching results:", error)
      toast.error(`Error fetching results: ${error.message}`)
      setError(`Error fetching results: ${error.message}`)
      setIsProcessing(false)
    }
  }

  // Reset the form
  const resetForm = () => {
    setJobId(null)
    setResults(null)
    setActiveTab("upload")
    setProgress(0)
    setError(null)
    setExpandedRow(null)
    setChartData({
      matched: 0,
      missing: 0,
      amountMismatch: 0,
      statusMismatch: 0,
    })

    // Clear any polling interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }

    toast.success("Reset Complete")
  }

  const exportResults = () => {
    toast.success("Export Started, Preparing your reconciliation report...")

    setTimeout(() => {
      toast.success("Export Complete, Your report has been downloaded")
    }, 1500)
  }

  const reportIssue = () => {
    toast.success("Issue Reported, Your report has been submitted to the team")
  }

  const toggleRowExpansion = (id) => {
    if (expandedRow === id) {
      setExpandedRow(null)
    } else {
      setExpandedRow(id)
    }
  }

  const filteredSamples = results?.samples?.filter((sample) => {
    if (filterType === "all") return true
    if (filterType === "missing") return sample.issue?.includes("MISSING")
    if (filterType === "amount") return sample.issue === "AMOUNT_MISMATCH"
    if (filterType === "status") return sample.issue === "STATUS_MISMATCH"
    return true
  })

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">

      <div className="flex">
        {/* Sidebar */}
        <div className="hidden md:flex w-64 flex-col fixed inset-y-0 bg-white border-r border-gray-200 shadow-sm z-10 transition-all duration-300 ease-in-out">
          <div className="flex items-center h-16 px-4 border-b bg-gradient-to-r from-purple-500 to-blue-500 text-white">
            <h1 className="text-xl font-bold flex items-center">
              <BarChart3 className="mr-2 h-6 w-6" />
              FinRecon
            </h1>
          </div>
          <div className="flex-1 overflow-auto py-4">
            <nav className="px-2 space-y-1">
              <a
                href="#"
                className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-blue-50 text-blue-700 transition-all duration-200 hover:bg-blue-100"
              >
                <Upload className="mr-3 h-5 w-5 text-blue-500" />
                Reconciliation
              </a>
              <a
                href="#"
                className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 transition-all duration-200 hover:bg-gray-50 hover:text-gray-900"
              >
                <CheckCircle className="mr-3 h-5 w-5 text-gray-400" />
                History
              </a>
              <a
                href="#"
                className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 transition-all duration-200 hover:bg-gray-50 hover:text-gray-900"
              >
                <AlertTriangle className="mr-3 h-5 w-5 text-gray-400" />
                Issues
              </a>
              <a
                href="#"
                className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 transition-all duration-200 hover:bg-gray-50 hover:text-gray-900"
              >
                <PieChart className="mr-3 h-5 w-5 text-gray-400" />
                Analytics
              </a>
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex-shrink-0 w-full group block">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                  FT
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">Financial Team</p>
                  <p className="text-xs font-medium text-gray-500 hover:text-blue-500 cursor-pointer transition-colors">
                    View settings
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-col md:ml-64 flex-1">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white px-4 sm:px-6 shadow-sm">
            <div className="flex flex-1 items-center gap-4">
              <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Financial Reconciliation Dashboard
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="transition-all duration-200 hover:bg-blue-50 hover:text-blue-600"
                    >
                      <QuestionMarkIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Get help with reconciliation</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-md hover:shadow-lg"
              >
                Settings
              </Button>
            </div>
          </header>

          {error && (
            <Alert variant="destructive" className="mb-4 animate-fadeIn mx-4 mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex-1 p-4 sm:p-6 lg:p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <div className="flex items-center justify-between">
                <TabsList className="bg-white border shadow-sm">
                  <TabsTrigger
                    value="upload"
                    disabled={isProcessing}
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all duration-300"
                  >
                    Upload Files
                  </TabsTrigger>
                  <TabsTrigger
                    value="processing"
                    disabled={!isProcessing}
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all duration-300"
                  >
                    Processing
                  </TabsTrigger>
                  <TabsTrigger
                    value="results"
                    disabled={!results}
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all duration-300"
                  >
                    Results
                  </TabsTrigger>
                </TabsList>

                {results && (
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    className="gap-2 transition-all duration-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                  >
                    <RefreshCw className="h-4 w-4" />
                    New Reconciliation
                  </Button>
                )}
              </div>

              <TabsContent value="upload" className="space-y-4 animate-fadeIn">
                <ReconciliationForm onStartReconciliation={handleStartReconciliation} />
              </TabsContent>

              <TabsContent value="processing" className="space-y-4 animate-fadeIn">
                <Card className="border shadow-lg overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
                    <CardTitle>Processing Files</CardTitle>
                    <CardDescription>Please wait while we reconcile your data</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8 p-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Processing...</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2 animate-pulse" />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-4 transition-all duration-300 hover:translate-x-1">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                        </div>
                        <div>
                          <p className="font-medium">Comparing transactions</p>
                          <p className="text-sm text-gray-500">Analyzing records</p>
                        </div>
                      </div>
                    </div>

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
              </TabsContent>

              <TabsContent value="results" className="space-y-6 animate-fadeIn">
                {results && (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="border shadow hover:shadow-md transition-all duration-300 hover:translate-y-[-4px]">
                        <CardHeader className="pb-2 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                          <CardTitle className="text-sm font-medium text-gray-500">Total Records</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            {results.totalRecords.systemA.toLocaleString()}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            System A: {results.totalRecords.systemA.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            System B: {results.totalRecords.systemB.toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="border shadow hover:shadow-md transition-all duration-300 hover:translate-y-[-4px]">
                        <CardHeader className="pb-2 bg-gradient-to-r from-green-50 to-green-100 border-b">
                          <CardTitle className="text-sm font-medium text-gray-500">Matched Transactions</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold text-green-600">{results.matched.toLocaleString()}</div>
                          <p className="text-xs text-gray-500 mt-1">
                            {((results.matched / results.totalRecords.systemA) * 100).toFixed(2)}% of total
                          </p>
                          <div className="relative pt-2">
                            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${(results.matched / results.totalRecords.systemA) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border shadow hover:shadow-md transition-all duration-300 hover:translate-y-[-4px]">
                        <CardHeader className="pb-2 bg-gradient-to-r from-amber-50 to-amber-100 border-b">
                          <CardTitle className="text-sm font-medium text-gray-500">Discrepancies</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold text-amber-600">
                            {results.discrepancies.toLocaleString()}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {((results.discrepancies / results.totalRecords.systemA) * 100).toFixed(2)}% of total
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50 animate-fadeIn">
                              Missing: {(results.missing.inA + results.missing.inB).toLocaleString()}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-700 hover:bg-amber-50 animate-fadeIn animation-delay-100"
                            >
                              Amount: {results?.mismatches?.amountMismatch.toLocaleString()}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border shadow hover:shadow-md transition-all duration-300 hover:translate-y-[-4px]">
                        <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-purple-50 border-b">
                          <CardTitle className="text-sm font-medium text-gray-500">Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-2">
                          <Button
                            variant="outline"
                            className="w-full justify-start gap-2 text-sm transition-all duration-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                            onClick={exportResults}
                          >
                            <Download className="h-4 w-4" />
                            Export Results
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full justify-start gap-2 text-sm transition-all duration-200 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300"
                            onClick={reportIssue}
                          >
                            <AlertTriangle className="h-4 w-4" />
                            Report Issues
                          </Button>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Chart Visualization */}
                    <Card className="border shadow-md overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                        <CardTitle>Reconciliation Summary</CardTitle>
                        <CardDescription>Visual breakdown of reconciliation results</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-6 items-center">
                          {/* Donut Chart */}
                          <div className="relative w-48 h-48">
                            <svg viewBox="0 0 100 100" className="w-full h-full">
                              {/* Background circle */}
                              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f3f4f6" strokeWidth="15" />

                              {/* Matched segment - animated */}
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                                stroke="#10b981"
                                strokeWidth="15"
                                strokeDasharray={`${(chartData.matched / results.totalRecords.systemA) * 251.2} 251.2`}
                                strokeDashoffset="0"
                                transform="rotate(-90 50 50)"
                                className="transition-all duration-1000 ease-out"
                              />

                              {/* Missing segment - animated */}
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                                stroke="#ef4444"
                                strokeWidth="15"
                                strokeDasharray={`${(chartData.missing / results.totalRecords.systemA) * 251.2} 251.2`}
                                strokeDashoffset={`${-1 * (chartData.matched / results.totalRecords.systemA) * 251.2}`}
                                transform="rotate(-90 50 50)"
                                className="transition-all duration-1000 ease-out"
                              />

                              {/* Amount mismatch segment - animated */}
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                                stroke="#f59e0b"
                                strokeWidth="15"
                                strokeDasharray={`${(chartData.amountMismatch / results.totalRecords.systemA) * 251.2} 251.2`}
                                strokeDashoffset={`${-1 * ((chartData.matched + chartData.missing) / results.totalRecords.systemA) * 251.2}`}
                                transform="rotate(-90 50 50)"
                                className="transition-all duration-1000 ease-out"
                              />

                              {/* Status mismatch segment - animated */}
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                                stroke="#8b5cf6"
                                strokeWidth="15"
                                strokeDasharray={`${(chartData.statusMismatch / results.totalRecords.systemA) * 251.2} 251.2`}
                                strokeDashoffset={`${-1 * ((chartData.matched + chartData.missing + chartData.amountMismatch) / results.totalRecords.systemA) * 251.2}`}
                                transform="rotate(-90 50 50)"
                                className="transition-all duration-1000 ease-out"
                              />

                              {/* Center text */}
                              <text x="50" y="45" textAnchor="middle" fontSize="12" fontWeight="bold">
                                {((results.matched / results.totalRecords.systemA) * 100).toFixed(1)}%
                              </text>
                              <text x="50" y="60" textAnchor="middle" fontSize="8">
                                Match Rate
                              </text>
                            </svg>
                          </div>

                          {/* Legend */}
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2 animate-fadeIn">
                              <div className="w-4 h-4 rounded-sm bg-green-500"></div>
                              <div className="text-sm">
                                <span className="font-medium">Matched: </span>
                                <span>{results.matched.toLocaleString()} transactions</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 animate-fadeIn animation-delay-100">
                              <div className="w-4 h-4 rounded-sm bg-red-500"></div>
                              <div className="text-sm">
                                <span className="font-medium">Missing: </span>
                                <span>{(results.missing.inA + results.missing.inB).toLocaleString()} transactions</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 animate-fadeIn animation-delay-200">
                              <div className="w-4 h-4 rounded-sm bg-amber-500"></div>
                              <div className="text-sm">
                                <span className="font-medium">Amount Mismatch: </span>
                                <span>{results?.mismatches?.amountMismatch.toLocaleString()} transactions</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 animate-fadeIn animation-delay-300">
                              <div className="w-4 h-4 rounded-sm bg-purple-500"></div>
                              <div className="text-sm">
                                <span className="font-medium">Status Mismatch: </span>
                                <span>{chartData.statusMismatch.toLocaleString()} transactions</span>
                              </div>
                            </div>
                          </div>

                          {/* Bar Chart */}
                          <div className="flex-1 h-48 flex items-end gap-6 justify-center">
                            <div className="flex flex-col items-center gap-2">
                              <div className="text-xs text-gray-500">Missing in A</div>
                              <div
                                className="w-12 bg-red-400 rounded-t-md transition-all duration-1000 ease-out"
                                style={{ height: `${(results.missing.inA / 3000) * 100}%` }}
                              ></div>
                              <div className="text-xs font-medium">{results.missing.inA.toLocaleString()}</div>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                              <div className="text-xs text-gray-500">Missing in B</div>
                              <div
                                className="w-12 bg-red-600 rounded-t-md transition-all duration-1000 ease-out"
                                style={{ height: `${(results.missing.inB / 3000) * 100}%` }}
                              ></div>
                              <div className="text-xs font-medium">{results.missing.inB.toLocaleString()}</div>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                              <div className="text-xs text-gray-500">Amount</div>
                              <div
                                className="w-12 bg-amber-500 rounded-t-md transition-all duration-1000 ease-out"
                                style={{ height: `${(results?.mismatches?.amountMismatch / 3000) * 100}%` }}
                              ></div>
                              <div className="text-xs font-medium">{results?.mismatches?.amountMismatch.toLocaleString()}</div>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                              <div className="text-xs text-gray-500">Status</div>
                              <div
                                className="w-12 bg-purple-500 rounded-t-md transition-all duration-1000 ease-out"
                                style={{ height: `${(chartData.statusMismatch / 3000) * 100}%` }}
                              ></div>
                              <div className="text-xs font-medium">{chartData.statusMismatch.toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Discrepancy Details */}
                    <Card className="border shadow-md overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                        <div className="flex items-center justify-between">
                          <CardTitle>Discrepancy Details</CardTitle>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 transition-all duration-200 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Filter className="h-4 w-4" />
                              Filter
                            </Button>
                            <Select defaultValue="all" onValueChange={setFilterType}>
                              <SelectTrigger className="w-[180px] h-8">
                                <SelectValue placeholder="Issue Type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Issues</SelectItem>
                                <SelectItem value="missing">Missing Transactions</SelectItem>
                                <SelectItem value="amount">Amount Mismatch</SelectItem>
                                <SelectItem value="status">Status Mismatch</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="w-[30px]"></TableHead>
                                <TableHead className="cursor-pointer hover:text-blue-600 transition-colors">
                                  <div className="flex items-center gap-1">
                                    Transaction ID
                                    <ArrowUpDown className="h-3 w-3" />
                                  </div>
                                </TableHead>
                                <TableHead className="cursor-pointer hover:text-blue-600 transition-colors">
                                  <div className="flex items-center gap-1">
                                    System A Amount
                                    <ArrowUpDown className="h-3 w-3" />
                                  </div>
                                </TableHead>
                                <TableHead className="cursor-pointer hover:text-blue-600 transition-colors">
                                  <div className="flex items-center gap-1">
                                    System B Amount
                                    <ArrowUpDown className="h-3 w-3" />
                                  </div>
                                </TableHead>
                                <TableHead>Currency</TableHead>
                                <TableHead>System A Status</TableHead>
                                <TableHead>System B Status</TableHead>
                                <TableHead>Issue</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredSamples?.map((item) => (
                                <React.Fragment key={item.id}>
                                  <TableRow
                                    key={item.id}
                                    className={`cursor-pointer transition-colors hover:bg-blue-50 ${expandedRow === item.id ? "bg-blue-50" : ""}`}
                                    onClick={() => toggleRowExpansion(item.id)}
                                  >
                                    <TableCell>
                                      <Button variant="ghost" size="icon" className="h-6 w-6">
                                        {expandedRow === item.id ? (
                                          <ChevronDown className="h-4 w-4 transition-transform" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 transition-transform" />
                                        )}
                                      </Button>
                                    </TableCell>
                                    <TableCell className="font-medium">{item.transactionId}</TableCell>
                                    <TableCell>{item?.details?.systemA?.amount || "-"}</TableCell>
                                    <TableCell>{item?.details?.systemB?.amount || "-"}</TableCell>
                                    <TableCell>{item?.details?.systemA?.currency}</TableCell>
                                    <TableCell>
                                      {item?.details?.systemA ? (
                                        <Badge
                                          variant={item?.details?.systemA?.status === "SUCCESS" ? "outline" : "destructive"}
                                          className={
                                            item?.details?.systemA?.status  === "SUCCESS"
                                              ? "bg-green-50 text-green-700 hover:bg-green-50"
                                              : ""
                                          }
                                        >
                                          {item?.details?.systemA?.status }
                                        </Badge>
                                      ) : (
                                        "-"
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {item?.details?.systemB ? (
                                        <Badge
                                          variant={item?.details?.systemB?.status === "SUCCESS" ? "outline" : "destructive"}
                                          className={
                                            item?.details?.systemB?.status === "SUCCESS"
                                              ? "bg-green-50 text-green-700 hover:bg-green-50"
                                              : ""
                                          }
                                        >
                                          {item?.details?.systemB?.status}
                                        </Badge>
                                      ) : (
                                        "-"
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {item.issues && (
                                        <Badge
                                          variant="outline"
                                          className={
                                            item.issues === "AMOUNT_MISMATCH"
                                              ? "bg-amber-50 text-amber-700 hover:bg-amber-50"
                                              : item.issues === "STATUS_MISMATCH"
                                                ? "bg-purple-50 text-purple-700 hover:bg-purple-50"
                                                : "bg-red-50 text-red-700 hover:bg-red-50"
                                          }
                                        >
                                          {item.issues[0]}
                                        </Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                  {expandedRow === item.id && (
                                    <TableRow className="bg-blue-50/50 animate-fadeIn">
                                      <TableCell colSpan={8} className="p-0">
                                        <div className="p-4 space-y-3">
                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <h4 className="text-sm font-semibold mb-2">Transaction Details</h4>
                                              <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div className="text-gray-500">Location:</div>
                                                <div>{item.details.location}</div>
                                                <div className="text-gray-500">Merchant:</div>
                                                <div>{item.details.merchant}</div>
                                                <div className="text-gray-500">Category:</div>
                                                <div>{item.details.category}</div>
                                              </div>
                                            </div>
                                            <div>
                                              <h4 className="text-sm font-semibold mb-2">Discrepancy Notes</h4>
                                              <p className="text-sm">{item.details.notes}</p>
                                              <div className="mt-3 flex gap-2">
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="text-xs h-7 px-2 transition-all duration-200 hover:bg-blue-50 hover:text-blue-600"
                                                >
                                                  <Eye className="h-3 w-3 mr-1" /> View Full Details
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="text-xs h-7 px-2 transition-all duration-200 hover:bg-amber-50 hover:text-amber-600"
                                                >
                                                  <AlertTriangle className="h-3 w-3 mr-1" /> Flag for Review
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </React.Fragment>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="flex items-center justify-between p-4 border-t">
                          <div className="text-sm text-gray-500">
                            Showing {filteredSamples?.length} of {results.discrepancies.toLocaleString()} discrepancies
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              className="transition-all duration-200 hover:bg-blue-50 hover:text-blue-600"
                            >
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="transition-all duration-200 hover:bg-blue-50 hover:text-blue-600"
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </main>
  )
}

// Helper component for the question mark icon
function QuestionMarkIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}
