"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { FileText, TrendingUp, DollarSign, CreditCard, RotateCcw, AlertTriangle, RefreshCw, Building2, TrendingDown, Calendar, CheckCircle2, Eye, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getPeriodFromTimestamp } from "@/lib/utils"
import { format, parseISO } from "date-fns"

export default function ReportsPage() {
  const { token, user } = useAuth()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [sales, setSales] = useState<any[]>([])
  const [returnsList, setReturnsList] = useState<any[]>([])
  const [creditors, setCreditors] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [customOutflows, setCustomOutflows] = useState<any[]>([])
  const [customInflows, setCustomInflows] = useState<any[]>([])
  const [periodFilter, setPeriodFilter] = useState("active")
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    if (!token) return
    try {
      // 1. Load custom local inflows & outflows
      const savedOutflows = localStorage.getItem("upshop_custom_outflows")
      if (savedOutflows) setCustomOutflows(JSON.parse(savedOutflows))

      const savedInflows = localStorage.getItem("upshop_custom_inflows")
      if (savedInflows) setCustomInflows(JSON.parse(savedInflows))

      const [profileRes, salesRes, returnsRes, creditorsRes, movementsRes] = await Promise.all([
        fetch('/api/user/profile', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/sales', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/returns', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/creditors', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/movements', { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      if (profileRes.ok) setUserProfile(await profileRes.json())
      if (salesRes.ok) setSales(await salesRes.json())
      if (returnsRes.ok) setReturnsList(await returnsRes.json())
      if (creditorsRes.ok) setCreditors(await creditorsRes.json())
      if (movementsRes.ok) setMovements(await movementsRes.json())
    } catch (e) {
      console.error("Reports fetchData error:", e)
    } finally {
      setLoading(false)
    }
  }

  // Real-Time live update listeners
  useEffect(() => {
    fetchData()

    const handleSync = () => fetchData()
    window.addEventListener("upshop_data_updated", handleSync)
    window.addEventListener("storage", handleSync)

    return () => {
      window.removeEventListener("upshop_data_updated", handleSync)
      window.removeEventListener("storage", handleSync)
    }
  }, [token])

  const isMonthMode = userProfile?.operationPeriodMode === 'months'
  const activePeriodLabel = userProfile?.currentWeek || (isMonthMode ? 'January' : 'Week 1')

  // Period Filter Helper
  const filterByPeriod = (timestamp?: string, weekFallback?: string) => {
    if (periodFilter === "all") return true
    const now = new Date()

    if (periodFilter === "today") {
      if (!timestamp) return false
      try {
        return format(parseISO(timestamp), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')
      } catch (e) { return false }
    }

    if (periodFilter === "yesterday") {
      if (!timestamp) return false
      try {
        const yest = new Date(now)
        yest.setDate(now.getDate() - 1)
        return format(parseISO(timestamp), 'yyyy-MM-dd') === format(yest, 'yyyy-MM-dd')
      } catch (e) { return false }
    }

    if (periodFilter === "last_week") {
      const lastWeekDate = new Date(now)
      lastWeekDate.setDate(now.getDate() - 7)
      const firstDayOfYear = new Date(lastWeekDate.getFullYear(), 0, 1)
      const pastDays = (lastWeekDate.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000)
      const weekNum = Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7)
      const lastWeekLabel = `Week ${Math.min(52, Math.max(1, weekNum))}`
      const period = getPeriodFromTimestamp(timestamp, false, weekFallback)
      return period.toLowerCase() === lastWeekLabel.toLowerCase()
    }

    if (periodFilter === "last_month") {
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
      const lastMonthIdx = (now.getMonth() - 1 + 12) % 12
      const lastMonthLabel = months[lastMonthIdx]
      const period = getPeriodFromTimestamp(timestamp, true, weekFallback)
      return period.toLowerCase() === lastMonthLabel.toLowerCase()
    }

    if (periodFilter === "active") {
      const period = getPeriodFromTimestamp(timestamp, isMonthMode, weekFallback)
      return period.toLowerCase() === activePeriodLabel.toLowerCase()
    }

    return true
  }

  // Filtered collections
  const filteredSales = useMemo(() => sales.filter(s => filterByPeriod(s.timestamp, s.week)), [sales, periodFilter, activePeriodLabel, isMonthMode])
  const filteredReturns = useMemo(() => returnsList.filter(r => filterByPeriod(r.timestamp)), [returnsList, periodFilter, activePeriodLabel, isMonthMode])
  const filteredMovements = useMemo(() => movements.filter(m => filterByPeriod(m.timestamp)), [movements, periodFilter, activePeriodLabel, isMonthMode])
  const filteredCreditors = useMemo(() => creditors.filter(c => filterByPeriod(c.timestamp)), [creditors, periodFilter, activePeriodLabel, isMonthMode])
  const filteredCustomOutflows = useMemo(() => customOutflows.filter(o => filterByPeriod(o.timestamp)), [customOutflows, periodFilter, activePeriodLabel, isMonthMode])
  const filteredCustomInflows = useMemo(() => customInflows.filter(i => filterByPeriod(i.timestamp)), [customInflows, periodFilter, activePeriodLabel, isMonthMode])

  const salesCashCollected = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + (s.amountPaid || 0), 0)
  }, [filteredSales])

  const manualInflowsAmount = useMemo(() => {
    return filteredCustomInflows.reduce((acc, i) => acc + (Number(i.amount) || 0), 0)
  }, [filteredCustomInflows])

  const totalCashInflows = salesCashCollected + manualInflowsAmount

  // Active Debtors Balance (includes all current unpaid/overdue customer credit accounts until fully paid)
  const activeDebtorsList = useMemo(() => {
    return sales.filter(s => s.status !== 'paid' && ((s.total || 0) - (s.amountPaid || 0)) > 0)
  }, [sales])

  const totalDebtorsBalance = useMemo(() => {
    return activeDebtorsList.reduce((acc, s) => acc + ((s.total || 0) - (s.amountPaid || 0)), 0)
  }, [activeDebtorsList])

  // Gross Sales Revenue equates to (Cash Inflows / Cash at Hand + Debtors Total)
  const totalGrossRevenue = useMemo(() => {
    return totalCashInflows + totalDebtorsBalance
  }, [totalCashInflows, totalDebtorsBalance])

  // Direct Cash Stock Purchases Outflow
  const cashPurchasesOutflow = useMemo(() => {
    return filteredMovements
      .filter(m => m.type === 'intake' && (m.paymentMode === 'cash' || m.paymentMode === 'mobile_money'))
      .reduce((acc, m) => acc + (m.totalAmount || (m.quantity * (m.buyingPrice || 0))), 0)
  }, [filteredMovements])

  // Supplier Creditor Payments Outflow for selected period
  const creditorSettlementOutflow = useMemo(() => {
    return filteredCreditors.reduce((acc, c) => acc + (c.amountPaid || 0), 0)
  }, [filteredCreditors])

  // Expired Stock Loss & Custom Manual Expenses Outflow
  const customExpensesOutflow = useMemo(() => {
    return filteredCustomOutflows.reduce((acc, o) => acc + (Number(o.amount) || 0), 0)
  }, [filteredCustomOutflows])

  const totalFinancialOutflow = cashPurchasesOutflow + creditorSettlementOutflow + customExpensesOutflow

  // Creditor Liabilities (Accounts Payable - includes all current unpaid/overdue supplier credit purchases until settled)
  const unpaidCreditors = useMemo(() => {
    return creditors.filter(c => c.status !== 'settled' && ((c.totalAmount || 0) - (c.amountPaid || 0)) > 0)
  }, [creditors])

  const totalCreditorLiabilities = useMemo(() => {
    return unpaidCreditors.reduce((acc, c) => acc + ((c.totalAmount || 0) - (c.amountPaid || 0)), 0)
  }, [unpaidCreditors])

  const totalRefunds = useMemo(() => {
    return filteredReturns.reduce((acc, r) => acc + (r.amount || 0), 0)
  }, [filteredReturns])

  const netCashFlow = totalCashInflows - totalFinancialOutflow - totalRefunds

  const [debtorStatusFilter, setDebtorStatusFilter] = useState<'unpaid' | 'paid' | 'all'>('unpaid')
  const [creditorStatusFilter, setCreditorStatusFilter] = useState<'unpaid' | 'paid' | 'all'>('unpaid')

  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [detailsModalData, setDetailsModalData] = useState<any>(null)
  const [detailsModalType, setDetailsModalType] = useState<'debtor' | 'creditor'>('debtor')

  const handleOpenDetails = (data: any, type: 'debtor' | 'creditor') => {
    setDetailsModalData(data)
    setDetailsModalType(type)
    setDetailsModalOpen(true)
  }

  // Filtered Debtors list for table display based on status filter
  const displayedDebtorsList = useMemo(() => {
    return sales.filter(s => {
      const isCredit = s.paymentMethod === 'credit' || (s.creditAmount || 0) > 0
      if (!isCredit) return false
      const owed = Math.max(0, (s.total || 0) - (s.amountPaid || 0))

      if (debtorStatusFilter === 'unpaid') {
        return s.status !== 'paid' && owed > 0
      }
      if (debtorStatusFilter === 'paid') {
        return s.status === 'paid' || owed === 0
      }
      return true
    })
  }, [sales, debtorStatusFilter])

  // Filtered Creditors list for table display based on status filter
  const displayedCreditorsList = useMemo(() => {
    return creditors.filter(c => {
      const owed = Math.max(0, (c.totalAmount || 0) - (c.amountPaid || 0))

      if (creditorStatusFilter === 'unpaid') {
        return c.status !== 'settled' && owed > 0
      }
      if (creditorStatusFilter === 'paid') {
        return c.status === 'settled' || owed === 0
      }
      return true
    })
  }, [creditors, creditorStatusFilter])

  return (
    <div className="p-6 md:p-8 space-y-8 font-body max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header & Period Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary flex items-center gap-3">
            <FileText className="h-8 w-8 text-emerald-600" /> Reports & Financial Statement
          </h1>
          <p className="text-xs font-bold text-muted-foreground mt-1 flex items-center gap-2">
            Real-time financial analytics, cash inflows/outflows, credit ledgers, and liquidity for <span className="text-emerald-700 font-extrabold">{userProfile?.businessName || user?.businessName || "UPshop Enterprise"}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="h-4 w-4 text-slate-600" />
            <span className="text-xs font-bold text-slate-700">Period:</span>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[160px] h-8 text-xs font-bold bg-white border-slate-300">
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Period ({activePeriodLabel})</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last_week">Last Week</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={fetchData} variant="outline" size="sm" className="gap-2 font-bold h-9">
            <RefreshCw className="h-4 w-4 text-emerald-600" /> Live Refresh
          </Button>
        </div>
      </div>

      {/* Financial Overview Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-md bg-white rounded-2xl border-l-4 border-l-emerald-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-black uppercase text-muted-foreground">Gross Sales Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-primary">Shs {totalGrossRevenue.toLocaleString()}</div>
            <p className="text-[11px] font-bold text-muted-foreground mt-1">{filteredSales.length} transaction(s) in selected period</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-md bg-white rounded-2xl border-l-4 border-l-blue-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-black uppercase text-muted-foreground">Cash & Mobile Inflows</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-700">Shs {totalCashInflows.toLocaleString()}</div>
            <p className="text-[11px] font-bold text-emerald-600 mt-1">Sales Collections (Shs {salesCashCollected.toLocaleString()}) + Other Inflows</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-md bg-white rounded-2xl border-l-4 border-l-rose-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-black uppercase text-muted-foreground">Financial Outflows (Expenses)</CardTitle>
            <TrendingDown className="h-5 w-5 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-700">Shs {totalFinancialOutflow.toLocaleString()}</div>
            <p className="text-[11px] font-bold text-rose-600 mt-1">Purchases, Creditor Payouts & Expenses</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-md bg-white rounded-2xl border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-black uppercase text-muted-foreground">Outstanding Customer Debtors</CardTitle>
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-700">Shs {totalDebtorsBalance.toLocaleString()}</div>
            <p className="text-[11px] font-bold text-amber-600 mt-1">{activeDebtorsList.length} active customer debtor account(s)</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-md bg-white rounded-2xl border-l-4 border-l-amber-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-black uppercase text-muted-foreground">Creditor Liabilities (Accounts Payable)</CardTitle>
            <Building2 className="h-5 w-5 text-amber-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-800">Shs {totalCreditorLiabilities.toLocaleString()}</div>
            <p className="text-[11px] font-bold text-amber-700 mt-1">{unpaidCreditors.length} unpaid supplier credit purchase(s)</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-md bg-white rounded-2xl border-l-4 border-l-purple-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-black uppercase text-muted-foreground">Net Cash Flow (Liquidity)</CardTitle>
            <DollarSign className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-black ${netCashFlow >= 0 ? 'text-purple-700' : 'text-amber-700'}`}>
              Shs {Math.abs(netCashFlow).toLocaleString()} {netCashFlow < 0 ? <Badge className="ml-2 bg-amber-500 text-white font-bold text-[10px] uppercase">Deficit</Badge> : <Badge className="ml-2 bg-emerald-600 text-white font-bold text-[10px] uppercase">Surplus</Badge>}
            </div>
            <p className="text-[11px] font-bold text-muted-foreground mt-1">Inflows minus Outflows & Refunds</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-8">
        {/* Debtors Credit Statement */}
        <Card className="border-slate-200 shadow-lg bg-white rounded-2xl">
          <CardHeader className="pb-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
                  <CreditCard className="h-6 w-6 text-amber-600" /> Debtors Ledger (Accounts Receivable)
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Customer credit accounts statement with payment status tracking
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Filter Status:</span>
                  <Select value={debtorStatusFilter} onValueChange={(val: any) => setDebtorStatusFilter(val)}>
                    <SelectTrigger className="w-[170px] h-8 text-xs font-bold bg-white border-slate-300">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Unpaid & Partial</SelectItem>
                      <SelectItem value="paid">Fully Paid</SelectItem>
                      <SelectItem value="all">All Debtors (Paid & Unpaid)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-extrabold text-sm py-1 px-3">
                  Total Outstanding: Shs {totalDebtorsBalance.toLocaleString()}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-xs font-bold">Loading debtors data...</div>
            ) : displayedDebtorsList.length === 0 ? (
              <div className="p-8 text-center text-emerald-600 font-bold text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> No debtor records found for the selected status filter.
              </div>
            ) : (
              <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm max-h-[420px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="font-bold text-xs uppercase">Customer</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Total Bill</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Paid</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Balance Owed</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Status</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Due Date</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedDebtorsList.map((sale) => {
                      const totalVal = sale.total || 0
                      const paidVal = sale.amountPaid || 0
                      const owedVal = Math.max(0, totalVal - paidVal)
                      const isFullyPaid = sale.status === 'paid' || owedVal === 0

                      return (
                        <TableRow key={sale.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-bold text-primary text-xs">
                            {sale.customerName || "Customer"}
                            <span className="block text-[10px] font-mono text-muted-foreground font-normal">#{sale.id.slice(0, 8)}</span>
                          </TableCell>
                          <TableCell className="font-semibold text-xs">Shs {totalVal.toLocaleString()}</TableCell>
                          <TableCell className="font-semibold text-xs text-emerald-700">Shs {paidVal.toLocaleString()}</TableCell>
                          <TableCell className={`font-black text-xs ${owedVal > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            Shs {owedVal.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {isFullyPaid ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[11px]">
                                Fully Paid
                              </Badge>
                            ) : paidVal > 0 ? (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-bold text-[11px]">
                                Partially Paid
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[11px]">
                                Unpaid Debt
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-[11px] text-muted-foreground font-medium">
                            {sale.dueDate ? new Date(sale.dueDate).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDetails(sale, 'debtor')}
                              className="h-8 text-xs font-bold gap-1 border-slate-200 hover:bg-slate-100 text-slate-700"
                            >
                              <Eye className="h-3.5 w-3.5 text-blue-600" /> View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Creditors Accounts Payable Statement */}
        <Card className="border-slate-200 shadow-lg bg-white rounded-2xl">
          <CardHeader className="pb-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-amber-700" /> Creditors Ledger (Accounts Payable)
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Supplier credit purchases requiring payout settlement
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Filter Status:</span>
                  <Select value={creditorStatusFilter} onValueChange={(val: any) => setCreditorStatusFilter(val)}>
                    <SelectTrigger className="w-[170px] h-8 text-xs font-bold bg-white border-slate-300">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Unpaid & Partial</SelectItem>
                      <SelectItem value="paid">Fully Settled</SelectItem>
                      <SelectItem value="all">All Creditors (Paid & Unpaid)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Badge className="bg-rose-100 text-rose-900 border-rose-300 font-extrabold text-sm py-1 px-3">
                  Total Liabilities: Shs {totalCreditorLiabilities.toLocaleString()}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-xs font-bold">Loading creditors data...</div>
            ) : displayedCreditorsList.length === 0 ? (
              <div className="p-8 text-center text-emerald-600 font-bold text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> No creditor records found for the selected status filter.
              </div>
            ) : (
              <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm max-h-[420px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="font-bold text-xs uppercase">Supplier</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Product Delivered</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Total Bill</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Paid</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Balance Owed</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Status</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Due Date</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedCreditorsList.map((c) => {
                      const totalVal = c.totalAmount || 0
                      const paidVal = c.amountPaid || 0
                      const owedVal = Math.max(0, totalVal - paidVal)
                      const isSettled = c.status === 'settled' || owedVal === 0

                      return (
                        <TableRow key={c.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-bold text-primary text-xs">
                            {c.supplierName}
                            <span className="block text-[10px] font-mono text-muted-foreground font-normal">#{c.id}</span>
                          </TableCell>
                          <TableCell className="font-semibold text-xs">
                            {c.productName} ({c.quantity} {c.unitType || 'pcs'})
                          </TableCell>
                          <TableCell className="font-semibold text-xs">Shs {totalVal.toLocaleString()}</TableCell>
                          <TableCell className="font-semibold text-xs text-emerald-700">Shs {paidVal.toLocaleString()}</TableCell>
                          <TableCell className={`font-black text-xs ${owedVal > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                            Shs {owedVal.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {isSettled ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[11px]">
                                Fully Settled
                              </Badge>
                            ) : paidVal > 0 ? (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-bold text-[11px]">
                                Partially Paid
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-[11px]">
                                Unpaid Liability
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-[11px] text-muted-foreground font-medium">
                            {c.dueDate ? new Date(c.dueDate).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDetails(c, 'creditor')}
                              className="h-8 text-xs font-bold gap-1 border-slate-200 hover:bg-slate-100 text-slate-700"
                            >
                              <Eye className="h-3.5 w-3.5 text-blue-600" /> View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction Details Modal Overlay */}
      {detailsModalOpen && detailsModalData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-xl shadow-2xl border-none bg-white rounded-2xl overflow-hidden">
            <CardHeader className={`${detailsModalType === 'debtor' ? 'bg-amber-600' : 'bg-rose-700'} text-white p-6 flex flex-row items-center justify-between`}>
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  {detailsModalType === 'debtor' ? <CreditCard className="h-6 w-6 text-amber-200" /> : <Building2 className="h-6 w-6 text-rose-200" />}
                  {detailsModalType === 'debtor' ? 'Debtor Credit Transaction Details' : 'Supplier Creditor Liability Details'}
                </CardTitle>
                <CardDescription className="text-white/90 text-xs mt-1">
                  {detailsModalType === 'debtor'
                    ? `Account Statement for Customer: ${detailsModalData.customerName || "Normal Customer"}`
                    : `Credit Purchase Record for Vendor: ${detailsModalData.supplierName}`
                  }
                </CardDescription>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Top Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">Total Bill Amount</span>
                  <span className="text-base font-black text-slate-900">
                    Shs {(detailsModalType === 'debtor' ? detailsModalData.total : detailsModalData.totalAmount || 0)?.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 block">Amount Paid</span>
                  <span className="text-base font-black text-emerald-700">
                    Shs {(detailsModalData.amountPaid || 0)?.toLocaleString()}
                  </span>
                </div>
                <div className={`p-3 rounded-xl border ${((detailsModalType === 'debtor' ? detailsModalData.total : detailsModalData.totalAmount) - (detailsModalData.amountPaid || 0)) > 0
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-emerald-50 border-emerald-200'
                  }`}>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">Balance Owed</span>
                  <span className={`text-base font-black ${((detailsModalType === 'debtor' ? detailsModalData.total : detailsModalData.totalAmount) - (detailsModalData.amountPaid || 0)) > 0
                    ? 'text-rose-700'
                    : 'text-emerald-700'
                    }`}>
                    Shs {Math.max(0, (detailsModalType === 'debtor' ? detailsModalData.total : detailsModalData.totalAmount) - (detailsModalData.amountPaid || 0))?.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Detailed Breakdown */}
              {detailsModalType === 'debtor' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-500 block uppercase text-[10px]">Transaction ID</span>
                      <span className="font-semibold text-slate-900">#{detailsModalData.id}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block uppercase text-[10px]">Payment Method</span>
                      <span className="font-semibold text-slate-900 uppercase">{detailsModalData.paymentMethod || 'Credit'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block uppercase text-[10px]">Date Issued</span>
                      <span className="font-semibold text-slate-900">
                        {detailsModalData.timestamp ? format(parseISO(detailsModalData.timestamp), 'PPP pp') : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block uppercase text-[10px]">Due Date</span>
                      <span className="font-semibold text-slate-900">
                        {detailsModalData.dueDate ? format(parseISO(detailsModalData.dueDate), 'PPP') : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-600 mb-2">Items Purchased</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-100">
                          <TableRow>
                            <TableHead className="text-[11px] font-bold uppercase">Item Name</TableHead>
                            <TableHead className="text-[11px] font-bold uppercase text-center">Qty</TableHead>
                            <TableHead className="text-[11px] font-bold uppercase text-right">Unit Price</TableHead>
                            <TableHead className="text-[11px] font-bold uppercase text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailsModalData.items && detailsModalData.items.length > 0 ? (
                            detailsModalData.items.map((item: any, idx: number) => (
                              <TableRow key={idx}>
                                <TableCell className="font-bold text-xs text-slate-900">{item.name}</TableCell>
                                <TableCell className="text-xs text-center font-semibold">{item.quantity || 1}</TableCell>
                                <TableCell className="text-xs text-right font-semibold">Shs {(item.price || 0).toLocaleString()}</TableCell>
                                <TableCell className="text-xs text-right font-bold text-slate-900">
                                  Shs {((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-xs italic text-muted-foreground">
                                General Credit Transaction
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-500 block uppercase text-[10px]">Reference ID</span>
                      <span className="font-semibold text-slate-900">#{detailsModalData.id}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block uppercase text-[10px]">Supplier Name</span>
                      <span className="font-semibold text-slate-900">{detailsModalData.supplierName}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block uppercase text-[10px]">Supplier Contact</span>
                      <span className="font-semibold text-slate-900">{detailsModalData.supplierContact || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block uppercase text-[10px]">Product Delivered</span>
                      <span className="font-semibold text-slate-900">{detailsModalData.productName} ({detailsModalData.quantity} {detailsModalData.unitType || 'pcs'})</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block uppercase text-[10px]">Buying Price per Unit</span>
                      <span className="font-semibold text-slate-900">Shs {(detailsModalData.buyingPrice || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block uppercase text-[10px]">Due Date</span>
                      <span className="font-semibold text-slate-900">
                        {detailsModalData.dueDate ? format(parseISO(detailsModalData.dueDate), 'PPP') : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setDetailsModalOpen(false)}
                  className="h-10 px-6 font-bold"
                >
                  Close Details
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
