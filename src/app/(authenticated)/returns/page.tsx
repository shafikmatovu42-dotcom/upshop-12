"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  RotateCcw,
  Search,
  History,
  CheckCircle2,
  AlertCircle,
  Undo2,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Calendar,
  Sparkles,
  Truck,
  PackageCheck
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { format, parseISO } from "date-fns"
import { printThermalReceipt } from "@/lib/print-receipt"
import { getPeriodFromTimestamp } from "@/lib/utils"

export default function ReturnsPage() {
  const { token } = useAuth()
  const { toast } = useToast()

  const [returnType, setReturnType] = useState<'inwards' | 'outwards'>('inwards')

  const [sales, setSales] = useState<any[]>([])
  const [creditors, setCreditors] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [returnsHistory, setReturnsHistory] = useState<any[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [searchInput, setSearchInput] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [verifiedTransaction, setVerifiedTransaction] = useState<any>(null)
  const [verifyError, setVerifyError] = useState("")

  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [returnQuantity, setReturnQuantity] = useState(1)
  const [reason, setReason] = useState("")

  // Return History Log Filters
  const [periodFilter, setPeriodFilter] = useState("today")
  const [historySearch, setHistorySearch] = useState("")

  const fetchData = async () => {
    if (!token) return
    try {
      setLoading(true)
      const [salesRes, profileRes, returnsRes, creditorsRes, productsRes] = await Promise.all([
        fetch('/api/sales', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/user/profile', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/returns', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/creditors', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/products', { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      if (salesRes.ok) setSales(await salesRes.json())
      if (profileRes.ok) setUserProfile(await profileRes.json())
      if (returnsRes.ok) setReturnsHistory(await returnsRes.json())
      if (creditorsRes.ok) setCreditors(await creditorsRes.json())
      if (productsRes.ok) setProducts(await productsRes.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [token])

  // Reset verified transaction when return type changes
  useEffect(() => {
    setSearchInput("")
    setVerifiedTransaction(null)
    setSelectedProduct(null)
    setVerifyError("")
  }, [returnType])

  // Live Suggestions list based on returnType & searchInput
  const transactionSuggestions = useMemo(() => {
    const query = searchInput.toLowerCase().trim().replace('#', '')

    if (returnType === 'inwards') {
      // Search Sales
      return sales.filter((s: any) => {
        if (!query) return true
        const matchId = s.id.toLowerCase().includes(query)
        const matchCustomer = (s.customerName || '').toLowerCase().includes(query)
        const matchItem = s.items?.some((it: any) => (it.name || '').toLowerCase().includes(query))
        return matchId || matchCustomer || matchItem
      }).map((s: any) => ({
        id: s.id,
        displayId: `#${s.id.slice(0, 8)}`,
        title: s.customerName || 'Normal Customer',
        subtitle: s.items?.map((it: any) => `${it.name} (x${it.quantity})`).join(', ') || 'Sale items',
        date: s.timestamp,
        items: s.items || [],
        total: s.total,
        raw: s
      })).slice(0, 8)
    } else {
      // Search Supplier Purchases / Creditors / Inventory
      return creditors.filter((c: any) => {
        if (!query) return true
        const matchId = c.id.toLowerCase().includes(query)
        const matchSupplier = (c.supplierName || '').toLowerCase().includes(query)
        const matchProduct = (c.productName || '').toLowerCase().includes(query)
        return matchId || matchSupplier || matchProduct
      }).map((c: any) => ({
        id: c.id,
        displayId: `#${c.id.slice(0, 8)}`,
        title: c.supplierName || 'General Supplier',
        subtitle: `${c.productName} (Qty: ${c.quantity || 1}) • Bill: Shs ${(c.totalAmount || 0).toLocaleString()}`,
        date: c.timestamp,
        items: [{
          productId: c.productId,
          name: c.productName,
          price: c.buyingPrice || (c.totalAmount ? Math.round(c.totalAmount / (c.quantity || 1)) : 0),
          quantity: c.quantity || 100
        }],
        total: c.totalAmount,
        raw: c
      })).slice(0, 8)
    }
  }, [sales, creditors, returnType, searchInput])

  const handleSelectTransaction = (item: any) => {
    setSearchInput(item.displayId)
    setVerifiedTransaction(item)
    setShowSuggestions(false)
    setVerifyError("")

    if (item.items && item.items.length > 0) {
      setSelectedProduct(item.items[0])
      setReturnQuantity(1)
    }

    toast({
      title: "Transaction Verified",
      description: `Matched ${returnType === 'inwards' ? 'Customer Sale' : 'Supplier Purchase'}: ${item.title}`
    })
  }

  const handleVerifyManualInput = () => {
    setVerifyError("")
    setShowSuggestions(false)

    if (!searchInput.trim()) return

    const match = transactionSuggestions.find(
      t => t.id.toLowerCase().includes(searchInput.toLowerCase().trim().replace('#', '')) ||
           t.title.toLowerCase().includes(searchInput.toLowerCase().trim())
    )

    if (match) {
      handleSelectTransaction(match)
    } else {
      setVerifiedTransaction(null)
      setSelectedProduct(null)
      setVerifyError("No matching transaction found. Please select from recent suggestions below.")
      toast({ variant: "destructive", title: "Verification Failed", description: "No matching record." })
    }
  }

  const handleProcessReturn = async (status: 'reinstated' | 'discarded') => {
    if (!verifiedTransaction || !selectedProduct || !token) return

    if (returnQuantity <= 0 || returnQuantity > (selectedProduct.quantity || 999)) {
      toast({ variant: "destructive", title: "Invalid Quantity", description: `Return quantity must be between 1 and ${selectedProduct.quantity}.` })
      return
    }

    try {
      const refundAmount = selectedProduct.price * returnQuantity

      const response = await fetch('/api/returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          saleId: verifiedTransaction.id,
          productId: selectedProduct.productId,
          productName: selectedProduct.name,
          quantity: returnQuantity,
          amount: refundAmount,
          reason,
          status: returnType === 'outwards' ? 'processed' : status,
          returnType
        })
      })

      const returnData = response.ok ? await response.json() : null

      if (response.ok) {
        const printingReceipt = userProfile?.receiptPrintingEnabled !== undefined ? !!userProfile.receiptPrintingEnabled : true
        const printerMsg = printingReceipt
          ? `Return receipt sent to printer: ${userProfile?.printerName || 'UPshop Thermal Receipt-58'}.`
          : "Receipt printing is disabled in settings."

        if (printingReceipt && returnData && returnType === 'inwards') {
          printThermalReceipt(returnData, userProfile, 'return')
        }

        toast({
          title: returnType === 'inwards' ? "Return Inward Processed" : "Return Outward Processed",
          description: `Recorded ${returnQuantity}x ${selectedProduct.name} (${returnType === 'inwards' ? 'Customer Refund' : 'Supplier Credit/Refund'}). ${printerMsg}`
        })

        // Reset
        setSearchInput("")
        setVerifiedTransaction(null)
        setSelectedProduct(null)
        setReason("")

        // Refresh
        fetchData()
      } else {
        toast({ variant: "destructive", title: "Save Failed", description: "Failed to record return entry." })
      }
    } catch (error) {
      console.error(error)
      toast({ variant: "destructive", title: "Error", description: "Failed to process return request." })
    }
  }

  // Filtered Return History Log with Period Filter
  const filteredReturnsHistory = useMemo(() => {
    let list = returnsHistory
    const now = new Date()

    if (periodFilter === "today") {
      const todayStr = format(now, 'yyyy-MM-dd')
      list = list.filter((r: any) => {
        if (!r.timestamp) return false
        try {
          return format(parseISO(r.timestamp), 'yyyy-MM-dd') === todayStr
        } catch (e) { return false }
      })
    } else if (periodFilter === "yesterday") {
      const yesterday = new Date(now)
      yesterday.setDate(now.getDate() - 1)
      const yesterdayStr = format(yesterday, 'yyyy-MM-dd')
      list = list.filter((r: any) => {
        if (!r.timestamp) return false
        try {
          return format(parseISO(r.timestamp), 'yyyy-MM-dd') === yesterdayStr
        } catch (e) { return false }
      })
    } else if (periodFilter === "last_week") {
      const lastWeekDate = new Date(now)
      lastWeekDate.setDate(now.getDate() - 7)
      const firstDayOfYear = new Date(lastWeekDate.getFullYear(), 0, 1)
      const pastDays = (lastWeekDate.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000)
      const weekNum = Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7)
      const lastWeekLabel = `Week ${Math.min(52, Math.max(1, weekNum))}`
      list = list.filter((r: any) => {
        const period = getPeriodFromTimestamp(r.timestamp, false, r.week)
        return period.toLowerCase() === lastWeekLabel.toLowerCase()
      })
    } else if (periodFilter === "last_month") {
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
      const lastMonthIdx = (now.getMonth() - 1 + 12) % 12
      const lastMonthLabel = months[lastMonthIdx]
      list = list.filter((r: any) => {
        const period = getPeriodFromTimestamp(r.timestamp, true, r.week)
        return period.toLowerCase() === lastMonthLabel.toLowerCase()
      })
    }

    if (historySearch.trim() !== "") {
      const q = historySearch.toLowerCase()
      list = list.filter((r: any) =>
        (r.id || '').toLowerCase().includes(q) ||
        (r.productName || '').toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q) ||
        (r.saleId || '').toLowerCase().includes(q)
      )
    }

    return list
  }, [returnsHistory, periodFilter, historySearch])

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-primary">Returns Management</h1>
        <p className="text-muted-foreground font-medium">Manage Customer Sales Returns (Inward) & Supplier Purchase Returns (Outward).</p>
      </div>

      {/* Return Type Selector Tabs */}
      <div className="grid grid-cols-2 gap-4 max-w-xl">
        <button
          type="button"
          onClick={() => setReturnType('inwards')}
          className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
            returnType === 'inwards'
              ? 'bg-primary text-white border-primary shadow-lg scale-[1.02]'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${returnType === 'inwards' ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>
              <ArrowDownLeft className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="font-extrabold text-sm">Return Inwards</p>
              <p className={`text-[11px] font-medium ${returnType === 'inwards' ? 'text-white/80' : 'text-slate-500'}`}>Customer Sales Return</p>
            </div>
          </div>
          {returnType === 'inwards' && <Badge className="bg-white text-primary font-black text-xs">Active</Badge>}
        </button>

        <button
          type="button"
          onClick={() => setReturnType('outwards')}
          className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
            returnType === 'outwards'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-[1.02]'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${returnType === 'outwards' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
              <ArrowUpRight className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="font-extrabold text-sm">Return Outwards</p>
              <p className={`text-[11px] font-medium ${returnType === 'outwards' ? 'text-white/80' : 'text-slate-500'}`}>Supplier Purchase Return</p>
            </div>
          </div>
          {returnType === 'outwards' && <Badge className="bg-white text-indigo-700 font-black text-xs">Active</Badge>}
        </button>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-none shadow-lg overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/70 border-b">
              <CardTitle className="text-lg flex items-center gap-2 text-primary font-bold">
                <Undo2 className="h-5 w-5 text-accent" />
                Process {returnType === 'inwards' ? 'Return Inward (Customer)' : 'Return Outward (Supplier)'}
              </CardTitle>
              <CardDescription>
                Search by Customer / Supplier Name, Product Name, or Transaction ID. Click a suggestion below to populate.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              {/* Smart Transaction Search & Suggestions */}
              <div className="space-y-3 relative">
                <Label htmlFor="trans-search" className="font-bold text-slate-700 flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  {returnType === 'inwards' ? 'Search Sale Transaction' : 'Search Purchase / Supplier Order'}
                </Label>
                <div className="flex gap-2 relative">
                  <div className="relative flex-1">
                    <Input
                      id="trans-search"
                      placeholder={returnType === 'inwards' ? "Type Customer Name, Product Name, or ID (e.g. Woofer, #0ff81b50)" : "Type Supplier Name, Product, or ID (e.g. Sony, #CRD-102)"}
                      className="h-11 font-medium pl-4"
                      value={searchInput}
                      onFocus={() => setShowSuggestions(true)}
                      onChange={(e) => {
                        setSearchInput(e.target.value)
                        setShowSuggestions(true)
                      }}
                    />
                  </div>
                  <Button onClick={handleVerifyManualInput} className="h-11 px-6 font-bold bg-primary text-white hover:bg-primary/95">
                    Verify
                  </Button>
                </div>

                {verifyError && (
                  <p className="text-red-500 text-xs font-semibold">{verifyError}</p>
                )}

                {/* Suggestions List Dropdown / Quick Selector */}
                {showSuggestions && transactionSuggestions.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-20 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto animate-in fade-in duration-200">
                    <div className="p-2 bg-slate-50 border-b flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <span>{returnType === 'inwards' ? 'Matching Recent Customer Sales' : 'Matching Recent Supplier Purchases'}</span>
                      <button onClick={() => setShowSuggestions(false)} className="text-slate-400 hover:text-slate-600">Close ✕</button>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {transactionSuggestions.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectTransaction(item)}
                          className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-xs">{item.title}</span>
                              <Badge variant="outline" className="text-[10px] font-mono font-bold bg-slate-50 text-slate-600">
                                {item.displayId}
                              </Badge>
                            </div>
                            <span className="text-[11px] text-slate-500">{item.subtitle}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">
                            {item.date ? format(parseISO(item.date), 'MMM dd, HH:mm') : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Quick Pills */}
                {!verifiedTransaction && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Quick Suggestions (Recent {returnType === 'inwards' ? 'Sales' : 'Purchases'}):</span>
                    <div className="flex flex-wrap gap-2">
                      {transactionSuggestions.slice(0, 4).map((sug) => (
                        <Badge
                          key={sug.id}
                          onClick={() => handleSelectTransaction(sug)}
                          className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 font-bold text-xs py-1 px-3"
                        >
                          {sug.title} ({sug.displayId})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {!verifiedTransaction && (
                <div className="p-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-center space-y-3">
                  <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-slate-500 font-medium text-xs">
                    Select a {returnType === 'inwards' ? 'Customer Sale' : 'Supplier Purchase'} from the suggestions above to load transaction items.
                  </p>
                </div>
              )}

              {/* Verified Transaction Details */}
              {verifiedTransaction && (
                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in duration-300">
                  <div className="flex justify-between items-start text-xs border-b pb-2">
                    <div>
                      <span className="text-slate-400 font-bold block uppercase">{returnType === 'inwards' ? 'Customer Name' : 'Supplier Name'}</span>
                      <span className="font-bold text-slate-800 text-sm">{verifiedTransaction.title}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 font-bold block uppercase">Transaction Date</span>
                      <span className="font-bold text-slate-700">
                        {verifiedTransaction.date ? format(parseISO(verifiedTransaction.date), 'MMM dd, yyyy HH:mm') : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Select Item to Return</Label>
                    <select
                      className="w-full h-11 border border-slate-200 bg-white rounded-lg px-3 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-accent"
                      value={selectedProduct ? verifiedTransaction.items.indexOf(selectedProduct) : 0}
                      onChange={(e) => {
                        const idx = Number(e.target.value)
                        setSelectedProduct(verifiedTransaction.items[idx])
                        setReturnQuantity(1)
                      }}
                    >
                      {verifiedTransaction.items?.map((item: any, idx: number) => (
                        <option key={idx} value={idx}>
                          {item.name} (Qty: {item.quantity} @ Shs {(item.price || 0).toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedProduct && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="return-qty" className="font-bold text-slate-700">Return Quantity</Label>
                        <Input
                          id="return-qty"
                          type="number"
                          min={1}
                          max={selectedProduct.quantity || 999}
                          value={returnQuantity}
                          onChange={(e) => setReturnQuantity(Math.min(selectedProduct.quantity || 999, Math.max(1, Number(e.target.value))))}
                          className="h-11 border-slate-200 font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-slate-700 block">Total Refund Value</Label>
                        <div className="h-11 bg-white border border-slate-200 rounded-lg flex items-center px-3 font-mono font-black text-slate-800">
                          Shs {((selectedProduct.price || 0) * returnQuantity).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Return</Label>
                <Textarea
                  id="reason"
                  placeholder={returnType === 'inwards' ? "Defective unit, customer exchange, wrong product model, etc." : "Damaged supplier shipment, expired batch, return to vendor, etc."}
                  className="min-h-[80px]"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              {returnType === 'inwards' ? (
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => handleProcessReturn('discarded')}
                    disabled={!verifiedTransaction}
                    variant="outline"
                    className="h-11 font-bold border-slate-200 hover:bg-slate-50 text-slate-700"
                  >
                    Damaged Stock (Discard)
                  </Button>
                  <Button
                    onClick={() => handleProcessReturn('reinstated')}
                    disabled={!verifiedTransaction}
                    className="h-11 bg-primary font-bold text-white hover:bg-primary/95 shadow"
                  >
                    Reinstate to Shop Stock
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => handleProcessReturn('reinstated')}
                  disabled={!verifiedTransaction}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow"
                >
                  Process Supplier Outward Return (Deduct Stock)
                </Button>
              )}

            </CardContent>
          </Card>

          {/* Return History Log with Period Filter */}
          <Card className="border-none shadow-md overflow-hidden bg-white">
            <CardHeader className="border-b bg-slate-50/50 pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg text-primary font-bold">Return History Log</CardTitle>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className="w-[160px] h-9 border-slate-200 font-bold bg-white text-slate-700 rounded-xl text-xs">
                      <SelectValue placeholder="Period Filter" />
                    </SelectTrigger>
                    <SelectContent className="font-bold">
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="last_week">Last Week</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search return log by product, reason, ID..."
                  className="pl-9 h-9 border-slate-200 bg-white text-xs"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 max-h-[360px] overflow-auto">
                {filteredReturnsHistory.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground italic text-sm">
                    No return logs matching the selected period filter.
                  </div>
                ) : (
                  filteredReturnsHistory.map((ret: any) => {
                    const isInward = !ret.returnType || ret.returnType === 'inwards'

                    return (
                      <div key={ret.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-slate-800">{ret.id}</p>
                            <Badge
                              variant="outline"
                              className={isInward ? "text-emerald-700 bg-emerald-50 border-emerald-200 font-bold text-[10px]" : "text-indigo-700 bg-indigo-50 border-indigo-200 font-bold text-[10px]"}
                            >
                              {isInward ? '📥 Inward (Customer)' : '📤 Outward (Supplier)'}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-600 font-semibold">
                            {ret.productName} (x{ret.quantity}) • Ref #{ret.saleId?.slice(0, 8)}
                          </p>
                          {ret.reason && (
                            <p className="text-[11px] text-slate-500 italic font-medium">Reason: {ret.reason}</p>
                          )}
                          <p className="text-[10px] text-slate-400 font-semibold">
                            {ret.timestamp ? format(parseISO(ret.timestamp), "MMM dd, yyyy HH:mm") : 'N/A'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary text-sm">Shs {Math.abs(ret.amount || 0).toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            {isInward ? 'Customer Refund' : 'Supplier Credit'}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Policy & Quick Info Sidebar */}
        <div className="space-y-6">
          <Card className="border-none shadow-md bg-accent/10 border-accent/20">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">Return Policy Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                <p><strong>Inward Returns:</strong> Reinstates customer returned stock back to shop floor inventory.</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0" />
                <p><strong>Outward Returns:</strong> Deducts stock returned back to vendor or supplier.</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                <p>Smart search works with Customer Name, Supplier Name, Item Name, or Transaction ID.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md overflow-hidden bg-white">
            <CardHeader className="bg-primary text-primary-foreground">
              <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-80">Returns Summary Stats</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 text-xs font-semibold text-slate-600">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Total Inward Customer Returns</span>
                <span className="font-bold text-emerald-700">
                  {returnsHistory.filter(r => !r.returnType || r.returnType === 'inwards').length} entries
                </span>
              </div>
              <div className="flex justify-between items-center border-t pt-3">
                <span className="text-muted-foreground font-medium">Total Outward Supplier Returns</span>
                <span className="font-bold text-indigo-700">
                  {returnsHistory.filter(r => r.returnType === 'outwards').length} entries
                </span>
              </div>
              <div className="flex justify-between items-center border-t pt-3">
                <span className="text-muted-foreground font-medium">Total Refunded Value</span>
                <span className="font-bold text-primary">
                  Shs {returnsHistory.reduce((sum, r) => sum + (r.amount || 0), 0).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
