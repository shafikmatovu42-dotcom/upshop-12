"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Target,
  Trophy,
  AlertTriangle,
  TrendingUp,
  Settings2,
  Users,
  Building2,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Search,
  Lock,
  ShieldAlert,
  ArrowDownRight,
  ArrowUpRight,
  PlusCircle,
  X,
  Plus,
  Trash2,
  Receipt,
  FileText
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { differenceInDays, parseISO, format } from "date-fns"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { printThermalReceipt } from "@/lib/print-receipt"
import { getPeriodFromTimestamp } from "@/lib/utils"
import { calculateInventoryPredictions, ModelType } from "@/lib/predictive-analytics"

export default function NotificationsPage() {
  const { user, token } = useAuth()
  const { toast } = useToast()

  const isAdmin = !user?.role || user?.role === 'admin'

  const safeParseDate = (dateStr: any): Date | null => {
    if (!dateStr) return null
    try {
      const parsed = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr)
      return isNaN(parsed.getTime()) ? null : parsed
    } catch (e) {
      return null
    }
  }

  const safeDiffDays = (targetDate: any, baseDate: Date = new Date()): number | null => {
    const parsed = safeParseDate(targetDate)
    if (!parsed) return null
    try {
      return differenceInDays(parsed, baseDate)
    } catch (e) {
      return null
    }
  }

  const [userProfile, setUserProfile] = useState<any>(null)
  const [sales, setSales] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [returns, setReturns] = useState<any[]>([])
  const [creditors, setCreditors] = useState<any[]>([])
  const [targetInput, setTargetInput] = useState("")
  const [reportPeriod, setReportPeriod] = useState("today")
  
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [selectedReportDocs, setSelectedReportDocs] = useState<string[]>(['sales_report', 'expenses_report'])
  const [exportPdfChecked, setExportPdfChecked] = useState(true)
  const [exportPrintChecked, setExportPrintChecked] = useState(false)
  const [generatedReportsLog, setGeneratedReportsLog] = useState<any[]>([])
  const [generatingReports, setGeneratingReports] = useState(false)
  
  const [debtorSearch, setDebtorSearch] = useState("")
  const [debtorPeriodFilter, setDebtorPeriodFilter] = useState("last_month")

  const [expensesSearch, setExpensesSearch] = useState("")
  const [expensesPeriodFilter, setExpensesPeriodFilter] = useState("last_month")

  const [inflowsSearch, setInflowsSearch] = useState("")
  const [inflowsPeriodFilter, setInflowsPeriodFilter] = useState("last_month")

  const [notes, setNotes] = useState<any[]>([])
  const [activePredictionModel, setActivePredictionModel] = useState<ModelType>("HWES")

  const [loading, setLoading] = useState(true)

  // Custom manual Outflows & Inflows stored locally
  const [customOutflows, setCustomOutflows] = useState<any[]>([])
  const [customInflows, setCustomInflows] = useState<any[]>([])
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([])

  // Modal State for Add Expense
  const [addExpenseModalOpen, setAddExpenseModalOpen] = useState(false)
  const [expenseTitle, setExpenseTitle] = useState("")
  const [expenseCategory, setExpenseCategory] = useState("Owner Withdrawal")
  const [expenseAmount, setExpenseAmount] = useState("")
  const [expenseNotes, setExpenseNotes] = useState("")

  // Modal State for Add Inflow
  const [addInflowModalOpen, setAddInflowModalOpen] = useState(false)
  const [inflowTitle, setInflowTitle] = useState("")
  const [inflowCategory, setInflowCategory] = useState("Personal Capital Injection")
  const [inflowAmount, setInflowAmount] = useState("")
  const [inflowNotes, setInflowNotes] = useState("")

  useEffect(() => {
    const savedOutflows = localStorage.getItem("upshop_custom_outflows")
    if (savedOutflows) setCustomOutflows(JSON.parse(savedOutflows))

    const savedInflows = localStorage.getItem("upshop_custom_inflows")
    if (savedInflows) setCustomInflows(JSON.parse(savedInflows))

    const savedDismissed = localStorage.getItem("upshop_dismissed_alerts")
    if (savedDismissed) setDismissedAlerts(JSON.parse(savedDismissed))

    const savedReports = localStorage.getItem("upshop_generated_reports")
    if (savedReports) setGeneratedReportsLog(JSON.parse(savedReports))
  }, [])

  // Debt payment state
  const [activeDebtor, setActiveDebtor] = useState<any>(null)
  const [paymentInput, setPaymentInput] = useState("")

  // Creditor payment state
  const [creditorSearch, setCreditorSearch] = useState("")
  const [creditorPeriodFilter, setCreditorPeriodFilter] = useState("last_month")
  const [activeCreditor, setActiveCreditor] = useState<any>(null)
  const [creditorPaymentInput, setCreditorPaymentInput] = useState("")

  const fetchData = async () => {
    if (!token) return
    try {
      // Fetch user profile
      const profileResponse = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (profileResponse.ok) {
        setUserProfile(await profileResponse.json())
      }

      // Fetch sales
      const salesResponse = await fetch('/api/sales', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (salesResponse.ok) {
        setSales(await salesResponse.json())
      }

      // Fetch products
      const productsResponse = await fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (productsResponse.ok) {
        setProducts(await productsResponse.json())
      }

      // Fetch movements
      const movementsResponse = await fetch('/api/movements', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (movementsResponse.ok) {
        setMovements(await movementsResponse.json())
      }

      // Fetch returns
      const returnsResponse = await fetch('/api/returns', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (returnsResponse.ok) {
        setReturns(await returnsResponse.json())
      }

      // Fetch creditors
      const creditorsResponse = await fetch('/api/creditors', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (creditorsResponse.ok) {
        setCreditors(await creditorsResponse.json())
      }

      // Fetch notes
      const notesResponse = await fetch('/api/notes', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (notesResponse.ok) {
        setNotes(await notesResponse.json())
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [token])

  const isMonthMode = userProfile?.operationPeriodMode === 'months'
  const currentWeek = userProfile?.currentWeek || (isMonthMode ? 'January' : 'Week 1')
  const currentTarget = userProfile?.revenueTarget || 0

  const periodsList = isMonthMode
    ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    : Array.from({ length: 52 }, (_, i) => `Week ${i + 1}`)

  // Reusable period filter logic
  const filterItemByPeriod = (timestamp: string | undefined, filter: string, itemWeek?: string) => {
    if (filter === "all") return true
    const now = new Date()
    if (filter === "today") {
      if (!timestamp) return false
      try {
        return format(parseISO(timestamp), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')
      } catch (e) { return false }
    }
    if (filter === "yesterday") {
      if (!timestamp) return false
      try {
        const yest = new Date(now)
        yest.setDate(now.getDate() - 1)
        return format(parseISO(timestamp), 'yyyy-MM-dd') === format(yest, 'yyyy-MM-dd')
      } catch (e) { return false }
    }
    if (filter === "last_week") {
      const lastWeekDate = new Date(now)
      lastWeekDate.setDate(now.getDate() - 7)
      const firstDayOfYear = new Date(lastWeekDate.getFullYear(), 0, 1)
      const pastDays = (lastWeekDate.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000)
      const weekNum = Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7)
      const lastWeekLabel = `Week ${Math.min(52, Math.max(1, weekNum))}`
      const period = getPeriodFromTimestamp(timestamp, false, itemWeek)
      return period.toLowerCase() === lastWeekLabel.toLowerCase()
    }
    if (filter === "last_month") {
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
      const lastMonthIdx = (now.getMonth() - 1 + 12) % 12
      const lastMonthLabel = months[lastMonthIdx]
      const period = getPeriodFromTimestamp(timestamp, true, itemWeek)
      return period.toLowerCase() === lastMonthLabel.toLowerCase()
    }
    if (filter === "active") {
      const period = getPeriodFromTimestamp(timestamp, isMonthMode, itemWeek)
      return period.toLowerCase() === currentWeek.toLowerCase()
    }
    const period = getPeriodFromTimestamp(timestamp, isMonthMode, itemWeek)
    return period.toLowerCase() === filter.toLowerCase()
  }

  // Calculate Cash Revenue (cash sales + paid portion of credit sales for the current period)
  const currentPeriodSales = useMemo(() => {
    return sales.filter((s: any) => {
      const period = getPeriodFromTimestamp(s.timestamp, isMonthMode, s.week)
      return period.toLowerCase() === currentWeek.toLowerCase()
    })
  }, [sales, currentWeek, isMonthMode])

  const weeklyCashRevenue = useMemo(() => {
    return currentPeriodSales.reduce((acc, sale) => acc + (sale.amountPaid || 0), 0)
  }, [currentPeriodSales])

  const progress = currentTarget > 0 ? Math.min(100, (weeklyCashRevenue / currentTarget) * 100) : 0

  const handleSetTarget = async () => {
    if (!targetInput || !token) return
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          revenueTarget: Number(targetInput)
        })
      })
      if (response.ok) {
        toast({ title: "Target Set", description: `Goal for ${currentWeek} updated.` })
        setTargetInput("")
        fetchData()
      }
    } catch (error) {
      console.error('Failed to set target:', error)
      toast({ title: "Error", description: "Failed to set target" })
    }
  }

  // Handlers for Custom Expenses & Inflows
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault()
    if (!expenseTitle.trim() || !expenseAmount || Number(expenseAmount) <= 0) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Please provide a title and valid amount." })
      return
    }
    const newEntry = {
      id: `EXP-${Date.now()}`,
      title: expenseTitle.trim(),
      category: expenseCategory,
      amount: Number(expenseAmount),
      notes: expenseNotes.trim(),
      timestamp: new Date().toISOString(),
      source: 'Manual Entry'
    }

    const updated = [newEntry, ...customOutflows]
    setCustomOutflows(updated)
    localStorage.setItem("upshop_custom_outflows", JSON.stringify(updated))

    toast({
      title: "Expense / Outflow Logged",
      description: `Successfully recorded outflow of Shs ${Number(expenseAmount).toLocaleString()} for "${expenseTitle}".`
    })

    setExpenseTitle("")
    setExpenseAmount("")
    setExpenseNotes("")
    setAddExpenseModalOpen(false)
  }

  const handleSaveInflow = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inflowTitle.trim() || !inflowAmount || Number(inflowAmount) <= 0) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Please provide a title and valid amount." })
      return
    }
    const newEntry = {
      id: `INF-${Date.now()}`,
      title: inflowTitle.trim(),
      category: inflowCategory,
      amount: Number(inflowAmount),
      notes: inflowNotes.trim(),
      timestamp: new Date().toISOString(),
      source: 'Manual Entry'
    }

    const updated = [newEntry, ...customInflows]
    setCustomInflows(updated)
    localStorage.setItem("upshop_custom_inflows", JSON.stringify(updated))

    toast({
      title: "Income / Inflow Logged",
      description: `Successfully recorded inflow of Shs ${Number(inflowAmount).toLocaleString()} for "${inflowTitle}".`
    })

    setInflowTitle("")
    setInflowAmount("")
    setInflowNotes("")
    setAddInflowModalOpen(false)
  }

  const handleDeleteExpense = (id: string) => {
    const updated = customOutflows.filter(o => o.id !== id)
    setCustomOutflows(updated)
    localStorage.setItem("upshop_custom_outflows", JSON.stringify(updated))
    toast({ title: "Record Deleted", description: "Custom expense record removed." })
  }

  const handleDeleteInflow = (id: string) => {
    const updated = customInflows.filter(i => i.id !== id)
    setCustomInflows(updated)
    localStorage.setItem("upshop_custom_inflows", JSON.stringify(updated))
    toast({ title: "Record Deleted", description: "Custom inflow record removed." })
  }

  // Expenses & Outflows compiled list
  const allExpensesList = useMemo(() => {
    const list: any[] = []

    // 1. System Expired Stock Losses
    movements.filter(m => m.type === 'dismiss_expired' || m.type === 'loss').forEach(m => {
      list.push({
        id: m.id || `EXP-M-${Math.random()}`,
        title: `Expired Stock Loss: ${m.productName}`,
        category: 'Expired Product Loss',
        amount: m.totalAmount || ((m.quantity || 1) * (m.buyingPrice || 0)),
        source: 'System Auto',
        timestamp: m.timestamp,
        notes: `Dismissed ${m.quantity} unit(s)`
      })
    })

    // 2. Supplier Creditor Payments
    creditors.forEach(c => {
      if ((c.amountPaid || 0) > 0) {
        list.push({
          id: `CRD-PAY-${c.id}`,
          title: `Supplier Payment: ${c.supplierName} (${c.productName})`,
          category: 'Supplier Credit Payment',
          amount: c.amountPaid,
          source: 'System Auto',
          timestamp: c.timestamp,
          notes: `Total bill: Shs ${(c.totalAmount || 0).toLocaleString()}`
        })
      }
    })

    // 3. Product Return Refunds
    returns.forEach(r => {
      list.push({
        id: `RET-REF-${r.id}`,
        title: `Customer Refund: ${r.productName} (x${r.quantity})`,
        category: 'Return Refund',
        amount: r.amount,
        source: 'System Auto',
        timestamp: r.timestamp,
        notes: r.reason || 'Product return refund'
      })
    })

    // 4. Custom Manual Expenses
    customOutflows.forEach(o => {
      list.push({
        id: o.id,
        title: o.title,
        category: o.category || 'Manual Outflow',
        amount: Number(o.amount || 0),
        source: 'Manual Entry',
        timestamp: o.timestamp,
        notes: o.notes || '',
        isManual: true
      })
    })

    list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())

    let filtered = list.filter(item => filterItemByPeriod(item.timestamp, expensesPeriodFilter))

    if (expensesSearch.trim() !== "") {
      const q = expensesSearch.toLowerCase()
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q) ||
        (item.notes && item.notes.toLowerCase().includes(q)) ||
        item.id.toLowerCase().includes(q)
      )
    }

    return filtered
  }, [movements, creditors, returns, customOutflows, expensesPeriodFilter, expensesSearch, isMonthMode, currentWeek])

  const totalExpensesAmount = useMemo(() => {
    return allExpensesList.reduce((acc, e) => acc + (e.amount || 0), 0)
  }, [allExpensesList])

  // Income Earnings & Inflows compiled list
  const allInflowsList = useMemo(() => {
    const list: any[] = []

    // 1. System Product Sales Revenues
    sales.forEach(s => {
      const cashRec = s.amountPaid !== undefined ? s.amountPaid : (s.paymentMethod === 'credit' ? 0 : s.total)
      if (cashRec > 0) {
        const itemNames = s.items && Array.isArray(s.items) && s.items.length > 0
          ? s.items.map((it: any) => `${it.name}${it.quantity ? ` (x${it.quantity})` : ''}`).join(', ')
          : 'Product Sales'

        list.push({
          id: `SALE-${s.id}`,
          title: `${itemNames} (${s.customerName || 'Normal Customer'})`,
          category: 'Sales Revenue',
          amount: cashRec,
          source: 'System Auto',
          timestamp: s.timestamp,
          notes: `Trans ID: #${s.id.slice(0, 8)} • Method: ${(s.paymentMethod || 'cash').toUpperCase()}`
        })
      }
    })

    // 2. Custom Manual Inflows
    customInflows.forEach(i => {
      list.push({
        id: i.id,
        title: i.title,
        category: i.category || 'Manual Inflow',
        amount: Number(i.amount || 0),
        source: 'Manual Entry',
        timestamp: i.timestamp,
        notes: i.notes || '',
        isManual: true
      })
    })

    list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())

    let filtered = list.filter(item => filterItemByPeriod(item.timestamp, inflowsPeriodFilter))

    if (inflowsSearch.trim() !== "") {
      const q = inflowsSearch.toLowerCase()
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q) ||
        (item.notes && item.notes.toLowerCase().includes(q)) ||
        item.id.toLowerCase().includes(q)
      )
    }

    return filtered
  }, [sales, customInflows, inflowsPeriodFilter, inflowsSearch, isMonthMode, currentWeek])

  const totalInflowsAmount = useMemo(() => {
    return allInflowsList.reduce((acc, i) => acc + (i.amount || 0), 0)
  }, [allInflowsList])

  const handlePayDebt = async () => {
    if (!activeDebtor || !paymentInput || !token) return
    const amount = Number(paymentInput)
    const maxPayable = Math.max(0, (activeDebtor.total || 0) - (activeDebtor.amountPaid || 0))

    if (isNaN(amount) || amount <= 0) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid amount." })
      return
    }

    if (amount > maxPayable) {
      toast({ variant: "destructive", title: "Overpayment", description: `Customer only owes Shs ${maxPayable.toLocaleString()}.` })
      return
    }

    try {
      const response = await fetch('/api/debtors/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          saleId: activeDebtor.id,
          amount
        })
      })

      if (response.ok) {
        const printingReceipt = userProfile?.receiptPrintingEnabled !== undefined ? !!userProfile.receiptPrintingEnabled : true
        const printerMsg = printingReceipt 
          ? `Receipt sent to printer: ${userProfile?.printerName || 'UPshop Thermal Receipt-58'} (${userProfile?.printerIp || '192.168.8.100'}).`
          : "Receipt printing is disabled in settings."

        if (printingReceipt) {
          printThermalReceipt({
            id: `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
            saleId: activeDebtor.id,
            amount: amount,
            remainingDebt: maxPayable - amount,
            customerName: activeDebtor.customerName,
            paymentMethod: 'cash',
            status: (maxPayable - amount) <= 0 ? 'fully paid' : 'partially paid',
            timestamp: new Date().toISOString()
          }, userProfile, 'debt_payment')
        }

        toast({ title: "Payment Recorded", description: `Successfully received Shs ${amount.toLocaleString()} from ${activeDebtor.customerName}. ${printerMsg}` })
        setActiveDebtor(null)
        setPaymentInput("")
        fetchData()
        window.dispatchEvent(new Event("upshop_data_updated"))
      } else {
        throw new Error('Payment failed')
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to log debt payment." })
    }
  }

  // Debtors are credit sales that are unpaid
  const debtors = useMemo(() => {
    return sales.filter((s: any) => s.paymentMethod === 'credit' && s.status === 'unpaid')
  }, [sales])

  // Debtors filtered by search and period for visual display in the table
  const filteredDebtors = useMemo(() => {
    let result = debtors
    const now = new Date()

    if (debtorPeriodFilter === "all") {
      // Keep all debtors
    } else if (debtorPeriodFilter === "today") {
      const todayStr = format(now, 'yyyy-MM-dd')
      result = result.filter((s: any) => {
        if (!s.timestamp) return false
        try {
          return format(parseISO(s.timestamp), 'yyyy-MM-dd') === todayStr
        } catch (e) { return false }
      })
    } else if (debtorPeriodFilter === "yesterday") {
      const yesterday = new Date(now)
      yesterday.setDate(now.getDate() - 1)
      const yesterdayStr = format(yesterday, 'yyyy-MM-dd')
      result = result.filter((s: any) => {
        if (!s.timestamp) return false
        try {
          return format(parseISO(s.timestamp), 'yyyy-MM-dd') === yesterdayStr
        } catch (e) { return false }
      })
    } else if (debtorPeriodFilter === "last_week") {
      const lastWeekDate = new Date(now)
      lastWeekDate.setDate(now.getDate() - 7)
      const firstDayOfYear = new Date(lastWeekDate.getFullYear(), 0, 1)
      const pastDays = (lastWeekDate.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000)
      const weekNum = Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7)
      const lastWeekLabel = `Week ${Math.min(52, Math.max(1, weekNum))}`
      result = result.filter((s: any) => {
        const period = getPeriodFromTimestamp(s.timestamp, false, s.week)
        return period.toLowerCase() === lastWeekLabel.toLowerCase()
      })
    } else if (debtorPeriodFilter === "last_month") {
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
      const lastMonthIdx = (now.getMonth() - 1 + 12) % 12
      const lastMonthLabel = months[lastMonthIdx]
      result = result.filter((s: any) => {
        const period = getPeriodFromTimestamp(s.timestamp, true, s.week)
        return period.toLowerCase() === lastMonthLabel.toLowerCase()
      })
    } else if (debtorPeriodFilter === "active") {
      result = result.filter((s: any) => {
        const period = getPeriodFromTimestamp(s.timestamp, isMonthMode, s.week)
        return period.toLowerCase() === currentWeek.toLowerCase()
      })
    } else {
      result = result.filter((s: any) => {
        const period = getPeriodFromTimestamp(s.timestamp, isMonthMode, s.week)
        return period.toLowerCase() === debtorPeriodFilter.toLowerCase()
      })
    }

    if (debtorSearch.trim() !== "") {
      const query = debtorSearch.toLowerCase()
      result = result.filter((d: any) => {
        const matchesName = (d.customerName || 'Normal Customer').toLowerCase().includes(query)
        const matchesId = d.id.toLowerCase().includes(query)
        const matchesItems = d.items?.some((it: any) => it.name.toLowerCase().includes(query)) || false
        return matchesName || matchesId || matchesItems
      })
    }

    return result
  }, [debtors, debtorPeriodFilter, debtorSearch, currentWeek, isMonthMode])

  const handlePayCreditor = async () => {
    if (!activeCreditor || !creditorPaymentInput || !token) return
    const amount = Number(creditorPaymentInput)
    const maxPayable = Math.max(0, (activeCreditor.totalAmount || 0) - (activeCreditor.amountPaid || 0))

    if (isNaN(amount) || amount <= 0) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid payment amount." })
      return
    }

    if (amount > maxPayable) {
      toast({ variant: "destructive", title: "Overpayment", description: `You only owe supplier Shs ${maxPayable.toLocaleString()}.` })
      return
    }

    try {
      const response = await fetch('/api/creditors/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          creditorId: activeCreditor.id,
          amount
        })
      })

      if (response.ok) {
        toast({ title: "Payment Recorded", description: `Successfully paid Shs ${amount.toLocaleString()} towards ${activeCreditor.supplierName}.` })
        setActiveCreditor(null)
        setCreditorPaymentInput("")
        fetchData()
        window.dispatchEvent(new Event("upshop_data_updated"))
      } else {
        throw new Error('Payment failed')
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to log creditor payment." })
    }
  }

  // Filtered Creditors for Managing Creditors Section
  const filteredCreditorsList = useMemo(() => {
    let result = creditors.filter((c: any) => c.status !== 'settled' && Math.max(0, (c.totalAmount || 0) - (c.amountPaid || 0)) > 0)
    const now = new Date()

    if (creditorPeriodFilter === "all") {
      // Keep all
    } else if (creditorPeriodFilter === "today") {
      const todayStr = format(now, 'yyyy-MM-dd')
      result = result.filter((c: any) => {
        if (!c.timestamp) return false
        try { return format(parseISO(c.timestamp), 'yyyy-MM-dd') === todayStr } catch (e) { return false }
      })
    } else if (creditorPeriodFilter === "yesterday") {
      const yesterday = new Date(now)
      yesterday.setDate(now.getDate() - 1)
      const yesterdayStr = format(yesterday, 'yyyy-MM-dd')
      result = result.filter((c: any) => {
        if (!c.timestamp) return false
        try { return format(parseISO(c.timestamp), 'yyyy-MM-dd') === yesterdayStr } catch (e) { return false }
      })
    } else if (creditorPeriodFilter === "last_week") {
      const lastWeekDate = new Date(now)
      lastWeekDate.setDate(now.getDate() - 7)
      const firstDayOfYear = new Date(lastWeekDate.getFullYear(), 0, 1)
      const pastDays = (lastWeekDate.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000)
      const weekNum = Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7)
      const lastWeekLabel = `Week ${Math.min(52, Math.max(1, weekNum))}`
      result = result.filter((c: any) => {
        const period = getPeriodFromTimestamp(c.timestamp, false, c.week)
        return period.toLowerCase() === lastWeekLabel.toLowerCase()
      })
    } else if (creditorPeriodFilter === "last_month") {
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
      const lastMonthIdx = (now.getMonth() - 1 + 12) % 12
      const lastMonthLabel = months[lastMonthIdx]
      result = result.filter((c: any) => {
        const period = getPeriodFromTimestamp(c.timestamp, true, c.week)
        return period.toLowerCase() === lastMonthLabel.toLowerCase()
      })
    } else if (creditorPeriodFilter === "active") {
      result = result.filter((c: any) => {
        const period = getPeriodFromTimestamp(c.timestamp, isMonthMode, c.week)
        return period.toLowerCase() === currentWeek.toLowerCase()
      })
    } else {
      result = result.filter((c: any) => {
        const period = getPeriodFromTimestamp(c.timestamp, isMonthMode, c.week)
        return period.toLowerCase() === creditorPeriodFilter.toLowerCase()
      })
    }

    if (creditorSearch.trim() !== "") {
      const query = creditorSearch.toLowerCase()
      result = result.filter((c: any) => {
        const matchesSupplier = (c.supplierName || '').toLowerCase().includes(query)
        const matchesProduct = (c.productName || '').toLowerCase().includes(query)
        const matchesId = (c.id || '').toLowerCase().includes(query)
        return matchesSupplier || matchesProduct || matchesId
      })
    }

    return result
  }, [creditors, creditorPeriodFilter, creditorSearch, currentWeek, isMonthMode])

  // Dismiss notification handler
  const handleDismissAlert = (alertKey: string) => {
    const updated = [...dismissedAlerts, alertKey]
    setDismissedAlerts(updated)
    localStorage.setItem("upshop_dismissed_alerts", JSON.stringify(updated))
    toast({ title: "Alert Dismissed", description: "Notification hidden from active list." })
  }

  // Generate intelligent system alerts with dismissal & 100-day auto-dismissal
  const systemAlerts = useMemo(() => {
    const list: any[] = []
    const today = new Date()

    // 1. Low stock alerts
    const lowStock = products.filter(p => p.shopStock <= (p.minStockLevel || 5))
    lowStock.forEach(p => {
      const alertKey = `low_stock_${p.id}`
      const alertDate = p.updatedAt ? parseISO(p.updatedAt) : today
      const daysOld = differenceInDays(today, alertDate)

      // Auto-dismiss if older than 100 days OR manually dismissed
      if (daysOld <= 100 && !dismissedAlerts.includes(alertKey)) {
        list.push({
          id: alertKey,
          type: p.shopStock <= 0 ? 'danger' : 'warning',
          timestamp: p.updatedAt || today.toISOString(),
          message: p.shopStock <= 0
            ? `CRITICAL OUT OF STOCK: "${p.name}" has 0 stock remaining on Shop Floor!`
            : `Low Stock: "${p.name}" has only ${p.shopStock} items left on the Shop Floor. (Limit: ${p.minStockLevel || 5})`
        })
      }

      // Expiry alerts for products with expiry date within 30 days
      if (p.expiryDate) {
        try {
          const exp = parseISO(p.expiryDate)
          const daysToExpire = differenceInDays(exp, today)
          const expKey = `expiry_${p.id}`
          if (daysToExpire <= 30 && !dismissedAlerts.includes(expKey)) {
            list.push({
              id: expKey,
              type: daysToExpire <= 7 ? 'danger' : 'warning',
              timestamp: p.expiryDate,
              message: daysToExpire < 0
                ? `EXPIRED STOCK WARNING: "${p.name}" expired ${Math.abs(daysToExpire)} days ago! Please remove from Shop Floor.`
                : `Item Nearing Expiry: "${p.name}" will expire in ${daysToExpire} day(s) (${p.expiryDate}).`
            })
          }
        } catch (e) {}
      }
    })

    // 2. Debtors (Overdue / Upcoming)
    debtors.forEach(d => {
      if (d.dueDate) {
        const due = parseISO(d.dueDate)
        const alertDate = d.timestamp ? parseISO(d.timestamp) : due
        const daysOld = differenceInDays(today, alertDate)

        if (daysOld <= 100) {
          if (due < today) {
            const daysOverdue = differenceInDays(today, due)
            const alertKey = `overdue_debtor_${d.id}`
            if (!dismissedAlerts.includes(alertKey)) {
              list.push({
                id: alertKey,
                type: 'danger',
                timestamp: d.timestamp || today.toISOString(),
                message: `Overdue Customer Payment: ${d.customerName} owes Shs ${(d.total - d.amountPaid).toLocaleString()} (due ${daysOverdue} days ago).`
              })
            }
          } else {
            const daysLeft = differenceInDays(due, today)
            if (daysLeft <= 3) {
              const alertKey = `upcoming_debtor_${d.id}`
              if (!dismissedAlerts.includes(alertKey)) {
                list.push({
                  id: alertKey,
                  type: 'info',
                  timestamp: d.timestamp || today.toISOString(),
                  message: `Upcoming Customer Debt: ${d.customerName} owes Shs ${(d.total - d.amountPaid).toLocaleString()} (due in ${daysLeft} days).`
                })
              }
            }
          }
        }
      }
    })

    // 3. Creditors due
    creditors.filter(c => c.status !== 'settled').forEach(c => {
      const alertKey = `creditor_due_${c.id}`
      if (!dismissedAlerts.includes(alertKey)) {
        const debt = (c.totalAmount || 0) - (c.amountPaid || 0)
        list.push({
          id: alertKey,
          type: 'warning',
          timestamp: c.timestamp || today.toISOString(),
          message: `Pending Supplier Creditor Bill: You owe ${c.supplierName} Shs ${debt.toLocaleString()} for "${c.productName}".`
        })
      }
    })

    return list
  }, [products, debtors, creditors, dismissedAlerts])

  const generateReportDocument = (
    docId: string,
    doc: jsPDF,
    filteredSales: any[],
    filteredMovements: any[],
    filteredReturns: any[],
    filteredExpenses: any[],
    filteredInflows: any[],
    filteredDebtors: any[],
    filteredProducts: any[],
    periodLabel: string
  ) => {
    const now = new Date()
    const businessName = userProfile?.businessName || user?.businessName || 'UPSHOP ENTERPRISE'
    const location = userProfile?.location || 'Central Shopee Console'
    const motto = userProfile?.motto ? `"${userProfile.motto}"` : 'Quality & Service Guaranteed'
    const agentName = userProfile?.fullName || userProfile?.email || user?.fullName || 'Business Admin Agent'
    const modeTag = isMonthMode ? 'MONTH MODE (Aggregated Days)' : 'WEEK MODE (Aggregated Days)'

    const renderHeader = (title: string, themeColor: [number, number, number]) => {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(15)
      doc.setTextColor(themeColor[0], themeColor[1], themeColor[2])
      doc.text(businessName.toUpperCase(), 14, 16)

      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(71, 85, 105)
      doc.text(`Location: ${location} • Motto: ${motto}`, 14, 21)
      doc.text(`Official Document: ${title} | ${modeTag}`, 14, 25)
      doc.text(`Period Covered: ${periodLabel} • Generated: ${now.toLocaleString()} • Attending Agent: ${agentName}`, 14, 29)

      doc.setDrawColor(themeColor[0], themeColor[1], themeColor[2])
      doc.setLineWidth(0.6)
      doc.line(14, 32, 196, 32)
    }

    const renderFooter = (lastTableY: number) => {
      const pageHeight = doc.internal.pageSize.getHeight()
      const endY = Math.min(Math.max(lastTableY + 20, 240), pageHeight - 25)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)

      doc.text("Prepared By: ___________________________ (Agent)", 14, endY)
      doc.text("Approved By: ___________________________ (Admin Sign)", 110, endY)

      doc.setFontSize(7)
      doc.setTextColor(148, 163, 184)
      doc.text("Official Business Document • Generated by UPshop Shopee Management Console • Verified by JAHWI AI Co-Pilot", 14, pageHeight - 8)
    }

    if (docId === 'sales_report') {
      renderHeader("SALES & REVENUE STATEMENT", [26, 35, 126])

      const rows = filteredSales.map((s: any) => {
        const itemNames = s.items && Array.isArray(s.items) && s.items.length > 0
          ? s.items.map((it: any) => `${it.name} (x${it.quantity})`).join(', ')
          : 'General Sale'

        return [
          s.timestamp ? format(parseISO(s.timestamp), 'yyyy-MM-dd HH:mm') : 'N/A',
          `#${s.id.slice(0, 8)}`,
          s.customerName || 'Normal Customer',
          itemNames,
          s.paymentMethod ? s.paymentMethod.toUpperCase() : 'CASH',
          `Shs ${s.total.toLocaleString()}`,
          `Shs ${(s.amountPaid || 0).toLocaleString()}`,
          s.status ? s.status.toUpperCase() : 'PAID'
        ]
      })

      autoTable(doc, {
        startY: 36,
        head: [['Date', 'Trans ID', 'Customer', 'Items Sold', 'Method', 'Total', 'Paid', 'Status']],
        body: rows.length > 0 ? rows : [['No sales recorded for this period.', '', '', '', '', '', '', '']],
        theme: 'striped',
        headStyles: { fillColor: [26, 35, 126] },
        styles: { fontSize: 8 }
      })

      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 150
      renderFooter(finalY)
    }

    if (docId === 'expenses_report') {
      renderHeader("EXPENSES & FINANCIAL OUTFLOWS STATEMENT", [225, 29, 72])

      const rows = filteredExpenses.map((e: any) => [
        e.timestamp ? format(parseISO(e.timestamp), 'yyyy-MM-dd HH:mm') : 'N/A',
        e.title,
        e.category,
        e.source,
        `Shs ${e.amount.toLocaleString()}`,
        e.notes || ''
      ])

      autoTable(doc, {
        startY: 36,
        head: [['Date', 'Description', 'Category', 'Source', 'Outflow Amount', 'Notes']],
        body: rows.length > 0 ? rows : [['No expenses recorded for this period.', '', '', '', '', '']],
        theme: 'striped',
        headStyles: { fillColor: [225, 29, 72] },
        styles: { fontSize: 8 }
      })

      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 150
      renderFooter(finalY)
    }

    if (docId === 'purchases_transfers') {
      renderHeader("PURCHASES & INVENTORY TRANSFERS STATEMENT", [99, 102, 241])

      const rows = filteredMovements.map((m: any) => [
        m.timestamp ? format(parseISO(m.timestamp), 'yyyy-MM-dd HH:mm') : 'N/A',
        m.productName,
        m.quantity,
        m.type ? m.type.toUpperCase() : 'TRANSFER',
        m.destination || 'Shop Floor',
        m.buyingPrice ? `Shs ${m.buyingPrice.toLocaleString()}` : 'N/A'
      ])

      autoTable(doc, {
        startY: 36,
        head: [['Date', 'Product Item', 'Qty', 'Movement Type', 'Destination', 'Unit Buying Price']],
        body: rows.length > 0 ? rows : [['No movements recorded for this period.', '', '', '', '', '']],
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241] },
        styles: { fontSize: 8 }
      })

      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 150
      renderFooter(finalY)
    }

    if (docId === 'expiry_report') {
      renderHeader("EXPIRY PRODUCT RISKS & LOSS AUDIT STATEMENT", [194, 120, 3])

      const expiredList = filteredProducts.filter((p: any) => p.expiryDate || p.shopStock <= 0)
      const rows = expiredList.map((p: any) => [
        p.name,
        p.category || 'General',
        p.shopStock,
        p.warehouseStock,
        p.expiryDate ? format(parseISO(p.expiryDate), 'yyyy-MM-dd') : 'No expiry set',
        `Shs ${((p.shopStock + p.warehouseStock) * (p.buyingPrice || p.price || 0)).toLocaleString()}`
      ])

      autoTable(doc, {
        startY: 36,
        head: [['Product Name', 'Category', 'Shop Stock', 'Warehouse Stock', 'Expiry Date', 'Est. Total Value']],
        body: rows.length > 0 ? rows : [['No expiry product risks detected.', '', '', '', '', '']],
        theme: 'striped',
        headStyles: { fillColor: [194, 120, 3] },
        styles: { fontSize: 8 }
      })

      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 150
      renderFooter(finalY)
    }

    if (docId === 'debtors_report') {
      renderHeader("DEBTORS & CUSTOMER CREDIT ACCOUNTS STATEMENT", [15, 23, 42])

      const rows = filteredDebtors.map((d: any) => [
        d.customerName,
        d.items?.map((it: any) => `${it.name} (x${it.quantity})`).join(', ') || 'N/A',
        `Shs ${(d.total || 0).toLocaleString()}`,
        `Shs ${(d.amountPaid || 0).toLocaleString()}`,
        `Shs ${Math.max(0, (d.total || 0) - (d.amountPaid || 0)).toLocaleString()}`,
        d.dueDate ? format(parseISO(d.dueDate), 'yyyy-MM-dd') : 'N/A',
        d.status ? d.status.toUpperCase() : 'UNPAID'
      ])

      autoTable(doc, {
        startY: 36,
        head: [['Customer', 'Products Taken', 'Total Credit', 'Paid', 'Outstanding Debt', 'Due Date', 'Status']],
        body: rows.length > 0 ? rows : [['No active debtors recorded.', '', '', '', '', '', '']],
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 8 }
      })

      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 150
      renderFooter(finalY)
    }

    if (docId === 'cashflow_statement') {
      renderHeader("EXECUTIVE STATEMENT OF CASHFLOWS", [16, 185, 129])

      const totalSalesCash = filteredSales.reduce((sum, s) => sum + (s.amountPaid || 0), 0)
      const totalManualInflows = filteredInflows.filter(i => i.isManual).reduce((sum, i) => sum + (i.amount || 0), 0)
      const totalOperatingExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
      const netCashflow = (totalSalesCash + totalManualInflows) - totalOperatingExpenses

      const rows = [
        ['Cash Inflows from Sales Collections', `Shs ${totalSalesCash.toLocaleString()}`],
        ['Cash Inflows from Owner Injections & Side Revenue', `Shs ${totalManualInflows.toLocaleString()}`],
        ['TOTAL CASH INFLOWS', `Shs ${(totalSalesCash + totalManualInflows).toLocaleString()}`],
        ['Less: Operating Expenditures & Owner Outflows', `- Shs ${totalOperatingExpenses.toLocaleString()}`],
        ['NET CASHFLOW FOR PERIOD', `Shs ${netCashflow.toLocaleString()}`]
      ]

      autoTable(doc, {
        startY: 36,
        head: [['Cashflow Component', 'Amount (Shs)']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 10, fontStyle: 'bold' }
      })

      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 150
      renderFooter(finalY)
    }

    if (docId === 'profit_loss') {
      renderHeader("STATEMENT OF PROFIT AND LOSS (P&L)", [30, 41, 59])

      const totalSalesValue = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0)
      
      let cogs = 0
      filteredSales.forEach(s => {
        if (s.items && Array.isArray(s.items)) {
          s.items.forEach((it: any) => {
            cogs += (it.buyingPrice || (it.price * 0.7) || 0) * (it.quantity || 1)
          })
        } else {
          cogs += (s.total || 0) * 0.7
        }
      })

      const grossProfit = totalSalesValue - cogs
      const totalOutflows = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
      const netProfit = grossProfit - totalOutflows

      const rows = [
        ['Gross Revenue (Total Sales)', `Shs ${totalSalesValue.toLocaleString()}`],
        ['Less: Cost of Goods Sold (COGS)', `- Shs ${cogs.toLocaleString()}`],
        ['GROSS PROFIT', `Shs ${grossProfit.toLocaleString()}`],
        ['Less: Operating Expenses & Losses', `- Shs ${totalOutflows.toLocaleString()}`],
        ['NET OPERATING PROFIT / (LOSS)', `Shs ${netProfit.toLocaleString()}`]
      ]

      autoTable(doc, {
        startY: 36,
        head: [['P&L Statement Line Item', 'Amount (Shs)']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 10, fontStyle: 'bold' }
      })

      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 150
      renderFooter(finalY)
    }

    if (docId === 'trial_balance') {
      renderHeader("FINANCIAL TRIAL BALANCE STATEMENT", [79, 70, 229])

      const totalCash = filteredSales.reduce((sum, s) => sum + (s.amountPaid || 0), 0)
      const totalDebtors = filteredDebtors.reduce((sum, d) => sum + Math.max(0, (d.total || 0) - (d.amountPaid || 0)), 0)
      const inventoryAssetVal = filteredProducts.reduce((sum, p) => sum + ((p.shopStock + p.warehouseStock) * (p.buyingPrice || p.price || 0)), 0)
      const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
      const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0)

      const totalDebit = totalCash + totalDebtors + inventoryAssetVal + totalExpenses

      const rows = [
        ['Cash Account Balance', `Shs ${totalCash.toLocaleString()}`, '-'],
        ['Accounts Receivable (Debtors)', `Shs ${totalDebtors.toLocaleString()}`, '-'],
        ['Inventory Asset Valuation', `Shs ${inventoryAssetVal.toLocaleString()}`, '-'],
        ['Operating Expenses & Outflows', `Shs ${totalExpenses.toLocaleString()}`, '-'],
        ['Sales Revenue Account', '-', `Shs ${totalRevenue.toLocaleString()}`],
        ['Owner Equity & Float', '-', `Shs ${(totalDebit - totalRevenue).toLocaleString()}`],
        ['BALANCED TOTALS', `Shs ${totalDebit.toLocaleString()}`, `Shs ${totalDebit.toLocaleString()}`]
      ]

      autoTable(doc, {
        startY: 36,
        head: [['Ledger Account Name', 'Debit (Shs)', 'Credit (Shs)']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 9 }
      })

      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 150
      renderFooter(finalY)
    }

    if (docId === 'balance_sheet') {
      renderHeader("EXECUTIVE BALANCE SHEET STATEMENT", [15, 23, 42])

      const cashOnHand = filteredSales.reduce((sum, s) => sum + (s.amountPaid || 0), 0)
      const debtorsAsset = filteredDebtors.reduce((sum, d) => sum + Math.max(0, (d.total || 0) - (d.amountPaid || 0)), 0)
      const inventoryVal = filteredProducts.reduce((sum, p) => sum + ((p.shopStock + p.warehouseStock) * (p.buyingPrice || p.price || 0)), 0)
      const totalAssets = cashOnHand + debtorsAsset + inventoryVal
      const liabilities = creditors.reduce((sum, c) => sum + Math.max(0, (c.totalAmount || 0) - (c.amountPaid || 0)), 0)
      const netEquity = totalAssets - liabilities

      const rows = [
        ['Current Asset: Cash & Float', `Shs ${cashOnHand.toLocaleString()}`],
        ['Current Asset: Accounts Receivable (Debtors)', `Shs ${debtorsAsset.toLocaleString()}`],
        ['Current Asset: Merchandise Inventory', `Shs ${inventoryVal.toLocaleString()}`],
        ['TOTAL ASSETS', `Shs ${totalAssets.toLocaleString()}`],
        ['Current Liabilities: Accounts Payable (Creditors)', `- Shs ${liabilities.toLocaleString()}`],
        ['NET OWNER EQUITY & CAPITAL', `Shs ${netEquity.toLocaleString()}`]
      ]

      autoTable(doc, {
        startY: 36,
        head: [['Financial Position Line Item', 'Amount (Shs)']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 10, fontStyle: 'bold' }
      })

      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 150
      renderFooter(finalY)
    }
  }

  const handleGenerateSelectedReports = async () => {
    if (selectedReportDocs.length === 0) {
      toast({ variant: "destructive", title: "No Reports Selected", description: "Please select at least one document report to generate." })
      return
    }

    setGeneratingReports(true)
    try {
      const doc = new jsPDF()

      let periodLabel = ""
      let filterFunc = (item: any) => true

      const now = new Date()

      if (reportPeriod === 'custom') {
        if (!customStartDate || !customEndDate) {
          toast({ variant: "destructive", title: "Invalid Dates", description: "Please enter both start date and end date for the custom period." })
          setGeneratingReports(false)
          return
        }
        periodLabel = `Custom (${customStartDate} to ${customEndDate})`
        const start = new Date(customStartDate)
        start.setHours(0,0,0,0)
        const end = new Date(customEndDate)
        end.setHours(23,59,59,999)

        filterFunc = (item: any) => {
          if (!item.timestamp) return false
          try {
            const itemDate = parseISO(item.timestamp)
            return itemDate >= start && itemDate <= end
          } catch (e) { return false }
        }
      } else {
        periodLabel = reportPeriod === 'all' ? (isMonthMode ? 'All Months' : 'All Weeks') : reportPeriod
        filterFunc = (item: any) => filterItemByPeriod(item.timestamp, reportPeriod, item.week)
      }

      const filteredSales = sales.filter(filterFunc)
      const filteredMovements = movements.filter(filterFunc)
      const filteredReturns = returns.filter(filterFunc)
      const filteredExpenses = allExpensesList.filter(item => filterFunc(item))
      const filteredInflows = allInflowsList.filter(item => filterFunc(item))
      const filteredDebtors = debtors.filter(d => filterFunc(d))
      const filteredProducts = products

      selectedReportDocs.forEach((docId, idx) => {
        if (idx > 0) doc.addPage()
        generateReportDocument(docId, doc, filteredSales, filteredMovements, filteredReturns, filteredExpenses, filteredInflows, filteredDebtors, filteredProducts, periodLabel)
      })

      const filename = `upshop_report_${reportPeriod}_${format(now, 'yyyyMMdd_HHmmss')}.pdf`
      
      doc.save(filename)

      const pdfDataUrl = doc.output('datauristring')

      const newReportLog = {
        id: `REP-${Date.now()}`,
        filename,
        title: `${selectedReportDocs.length} Report(s) Compiled (${periodLabel})`,
        docsCount: selectedReportDocs.length,
        periodLabel,
        timestamp: new Date().toISOString(),
        format: exportPrintChecked ? 'PDF & Direct Print' : 'PDF Document',
        dataUrl: pdfDataUrl
      }

      const updatedLog = [newReportLog, ...generatedReportsLog]
      setGeneratedReportsLog(updatedLog)
      localStorage.setItem("upshop_generated_reports", JSON.stringify(updatedLog))

      // Dispatch event to notify Jahwi AI
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent("upshop_report_generated", {
          detail: {
            title: `${selectedReportDocs.length} Report Document(s)`,
            filename,
            periodLabel,
            dataUrl: pdfDataUrl
          }
        }))
      }

      if (exportPrintChecked) {
        if (userProfile?.receiptPrintingEnabled !== false) {
          toast({ title: "Print Order Sent", description: `Sending report summaries to printer: ${userProfile?.printerName || 'UPshop Thermal Receipt-58'}.` })
        } else {
          toast({ variant: "destructive", title: "Printing Disabled", description: "Receipt printing is currently disabled in your Settings." })
        }
      }

      toast({
        title: "Reports Generated Successfully",
        description: `Saved ${filename} with ${selectedReportDocs.length} document(s). Jahwi AI notified!`
      })
    } catch (err: any) {
      console.error("Report generation error:", err)
      toast({ variant: "destructive", title: "Generation Error", description: err.message || "Failed to generate report documents." })
    } finally {
      setGeneratingReports(false)
    }
  }

  const handleRevealReportInManager = (rep: any) => {
    try {
      if (rep.dataUrl) {
        const pdfWindow = window.open("", "_blank")
        if (pdfWindow) {
          pdfWindow.document.write(
            `<html style="margin:0;height:100%;"><head><title>${rep.filename}</title></head><body style="margin:0;height:100%;overflow:hidden;"><iframe width="100%" height="100%" style="border:none;" src="${rep.dataUrl}"></iframe></body></html>`
          )
        }
      }
      toast({
        title: "Revealed in File Manager",
        description: `Opened ${rep.filename} in viewer without downloading duplicate copies.`
      })
    } catch (e) {
      toast({
        title: "File Manager",
        description: `Revealed ${rep.filename} location.`
      })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96 font-bold text-slate-500">Loading Business Management...</div>
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-primary">Business Management</h1>
        <p className="text-muted-foreground font-medium">Goal Setting, Outflows & Expenses, Inflows & Revenue, Debtors & Reports | Active Period: {currentWeek}</p>
      </div>

      {/* SECTION 1: Revenue Target Progress & Goal Setting */}
      <div className="grid gap-8 md:grid-cols-3">
        <Card className="md:col-span-2 border-none shadow-xl overflow-hidden bg-white">
          <CardHeader className="bg-primary text-primary-foreground">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-6 w-6 text-accent" />
              Revenue Target Progress (Cash)
            </CardTitle>
            <CardDescription className="text-white/70">Performance based on cash collections for {currentWeek}</CardDescription>
          </CardHeader>
          <CardContent className="pt-8 space-y-8">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold text-muted-foreground">Cash Collected</span>
                <p className="text-4xl font-bold text-primary">Shs {weeklyCashRevenue.toLocaleString()}</p>
              </div>
              <div className="text-right space-y-1">
                <span className="text-xs uppercase font-bold text-muted-foreground">{isMonthMode ? 'Monthly' : 'Weekly'} Target</span>
                <p className="text-2xl font-bold">Shs {currentTarget.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span className={progress >= 100 ? "text-green-600 flex items-center gap-1" : ""}>
                  {progress >= 100 && <Trophy className="h-4 w-4" />}
                  {progress >= 100 ? "Target Achieved!" : "Progress"}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-4 bg-slate-100" />
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-dashed flex items-center gap-4">
              <TrendingUp className="h-10 w-10 text-primary opacity-20" />
              <div>
                <p className="font-bold">Insight</p>
                <p className="text-sm text-muted-foreground">
                  {progress < 50 ? "Early in the period. Keep up the sales momentum!" : progress < 100 ? "Almost there! Focused efforts will hit the mark." : "Excellent work! You've exceeded the target."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Set Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <Label>Revenue Target (Shs)</Label>
              <Input
                type="number"
                placeholder="e.g. 5,000,000"
                className="h-12"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground italic">Target will be applied to {currentWeek}</p>
            </div>
            <Button className="w-full h-11 bg-primary text-white hover:bg-primary/95 font-bold shadow" onClick={handleSetTarget}>Update {isMonthMode ? 'Monthly' : 'Weekly'} Target</Button>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 1B (NEW): Predictive Inventory Analytics & Demand Forecasting */}
      <Card className="border-none shadow-xl bg-white overflow-hidden border-l-4 border-l-cyan-600">
        <CardHeader className="bg-slate-900 text-white p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-cyan-400">
                <Sparkles className="h-6 w-6 text-cyan-400" />
                Predictive Inventory Analytics & Demand Forecasting
              </CardTitle>
              <CardDescription className="text-slate-300 text-xs">
                Real-time ML demand velocity model comparing <strong>Actual Total Count</strong> vs <strong>Predicted Total Count</strong> for 14-day stock planning.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Active Prediction Model:</span>
              <Select value={activePredictionModel} onValueChange={(v) => setActivePredictionModel(v as ModelType)}>
                <SelectTrigger className="w-[300px] h-10 bg-slate-800 border-slate-700 text-white font-bold text-xs">
                  <SelectValue placeholder="Select Algorithm" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 text-white border-slate-700">
                  <SelectItem value="HWES" className="text-xs font-bold">Holt-Winters Exponential Smoothing (HWES)</SelectItem>
                  <SelectItem value="WMA" className="text-xs font-bold">Weighted Moving Average (WMA 30-Day)</SelectItem>
                  <SelectItem value="LSV" className="text-xs font-bold">Linear Daily Sales Velocity (LSV)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 inline-flex items-center gap-2 bg-cyan-950/80 border border-cyan-800/50 text-cyan-300 px-3 py-1 rounded-full text-xs font-bold font-mono">
            <span>⚙️ Model Configured:</span> {calculateInventoryPredictions(products, sales, activePredictionModel, 14).activeModelName}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-100 dark:bg-slate-800">
                <TableHead className="font-extrabold text-xs uppercase text-slate-700 dark:text-slate-300">Product Name</TableHead>
                <TableHead className="font-extrabold text-xs uppercase text-slate-700 dark:text-slate-300">Category</TableHead>
                <TableHead className="text-center font-extrabold text-xs uppercase text-slate-700 dark:text-slate-300">Actual Total Count</TableHead>
                <TableHead className="text-center font-extrabold text-xs uppercase text-slate-700 dark:text-slate-300">Predicted 14d Count</TableHead>
                <TableHead className="text-center font-extrabold text-xs uppercase text-slate-700 dark:text-slate-300">Daily Velocity</TableHead>
                <TableHead className="text-center font-extrabold text-xs uppercase text-slate-700 dark:text-slate-300">Days to Stockout</TableHead>
                <TableHead className="text-center font-extrabold text-xs uppercase text-slate-700 dark:text-slate-300">Suggested Reorder</TableHead>
                <TableHead className="text-right font-extrabold text-xs uppercase text-slate-700 dark:text-slate-300">Stock Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calculateInventoryPredictions(products, sales, activePredictionModel, 14).predictions.slice(0, 15).map((pred) => (
                <TableRow key={pred.productId} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-extrabold text-sm text-slate-900">{pred.productName}</TableCell>
                  <TableCell><Badge variant="outline" className="font-bold text-xs">{pred.category}</Badge></TableCell>
                  <TableCell className="text-center font-mono font-black text-sm text-slate-900">{pred.actualTotalCount} <span className="text-[10px] text-slate-400 font-normal">({pred.shopStock} shop / {pred.warehouseStock} wh)</span></TableCell>
                  <TableCell className="text-center font-mono font-black text-sm text-indigo-700">{pred.predictedTotalCount}</TableCell>
                  <TableCell className="text-center font-mono font-bold text-xs text-slate-600">{pred.dailyVelocity} units/day</TableCell>
                  <TableCell className="text-center font-bold text-xs">
                    {pred.daysUntilStockout !== null ? (
                      <span className={pred.daysUntilStockout <= 3 ? "text-rose-600 font-black" : "text-slate-700"}>{pred.daysUntilStockout} day(s)</span>
                    ) : (
                      <span className="text-slate-400">Stable</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold text-xs text-emerald-700">
                    {pred.reorderRecommendation > 0 ? `+${pred.reorderRecommendation} units` : "Sufficient"}
                  </TableCell>
                  <TableCell className="text-right">
                    {pred.urgency === 'critical' ? (
                      <Badge className="bg-rose-600 text-white font-black text-[10px] uppercase">Reorder Now</Badge>
                    ) : pred.urgency === 'warning' ? (
                      <Badge className="bg-amber-500 text-white font-bold text-[10px] uppercase">Watch Stock</Badge>
                    ) : (
                      <Badge className="bg-emerald-600 text-white font-bold text-[10px] uppercase">Healthy</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* SECTION 1C (NEW): AI-Powered Business Notebook */}
      <Card className="border-none shadow-xl bg-white overflow-hidden border-l-4 border-l-purple-600">
        <CardHeader className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-purple-300">
                <FileText className="h-6 w-6 text-purple-400" />
                AI-Powered Business Notebook (Read, Write & Store)
              </CardTitle>
              <CardDescription className="text-slate-300 text-xs">
                Digital intelligent scratchpad interlinked with JAHWI AI to store reminders, supplier agreements, and debtor context.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {notes.length === 0 ? (
              <div className="col-span-3 text-center py-10 bg-slate-50 rounded-2xl border border-dashed text-slate-500 font-bold">
                No notes in your Business Notebook yet. You can ask JAHWI AI to write a note (e.g., "Jahwi, write a note that Mama Kevin promised to pay Friday"), or create one via API!
              </div>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors shadow-sm flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-extrabold text-sm text-slate-900 truncate">{note.title}</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold text-purple-700 bg-purple-50 border-purple-200">{note.category}</Badge>
                    </div>
                    <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">{note.content}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t text-[10px] text-slate-400 font-bold">
                    <span>{new Date(note.timestamp).toLocaleDateString()}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await fetch(`/api/notes/${note.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
                        fetchData()
                        toast({ title: 'Note Removed', description: 'Deleted note from Business Notebook.' })
                      }}
                      className="h-6 w-6 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-full"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2 (NEW): Expenses & Outflows Section */}
      <Card className="border-none shadow-xl bg-white overflow-hidden border-l-4 border-l-rose-600">
        <CardHeader className="bg-slate-50/50 pb-4 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2 text-rose-700 font-black">
                <ArrowDownRight className="h-6 w-6 text-rose-600" />
                Expenses & Outflows
              </CardTitle>
              <CardDescription className="mt-1">
                Track all business expenditures, owner withdrawals, confirmed product losses, and supplier settlements.
              </CardDescription>
            </div>
            <Button
              onClick={() => setAddExpenseModalOpen(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-11 px-5 rounded-xl shadow-md flex items-center gap-2 shrink-0"
            >
              <PlusCircle className="h-5 w-5" />
              Add Expense / Outflow
            </Button>
          </div>

          <div className="mt-4 p-4 bg-rose-50/60 rounded-xl border border-rose-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-600 text-white rounded-lg">
                <ArrowDownRight className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-black uppercase text-rose-900 tracking-wider">Total Filtered Outflows</span>
                <p className="text-2xl font-black text-rose-700">Shs {totalExpensesAmount.toLocaleString()}</p>
              </div>
            </div>
            <Badge className="bg-rose-100 text-rose-800 font-bold border-rose-200">
              {allExpensesList.length} Record(s)
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between px-6 pt-4 pb-2">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search expenses, category, title..."
                className="pl-9 h-10 border-slate-200 bg-white"
                value={expensesSearch}
                onChange={(e) => setExpensesSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Filter Period:</span>
              <Select value={expensesPeriodFilter} onValueChange={setExpensesPeriodFilter}>
                <SelectTrigger className="w-[220px] h-10 border-slate-200 font-bold bg-white text-slate-700 rounded-xl focus:ring-1 focus:ring-rose-500 shadow-sm">
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent className="font-bold">
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="all">All {isMonthMode ? 'Months' : 'Weeks'}</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value={isMonthMode ? "last_month" : "last_week"}>{isMonthMode ? "Last Month" : "Last Week"}</SelectItem>
                  {periodsList.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto border-t">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-slate-50/50">
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Expense Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Outflow Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allExpensesList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">
                      No expense / outflow records found for the selected filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  allExpensesList.map((item: any) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/40">
                      <TableCell className="text-xs font-bold text-slate-600">
                        {item.timestamp ? format(parseISO(item.timestamp), "MMM dd, yyyy HH:mm") : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-sm">{item.title}</span>
                          {item.notes && <span className="text-[11px] text-slate-500">{item.notes}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-bold text-xs bg-slate-50 text-slate-700">
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          item.source === 'System Auto' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-800'
                        }`}>
                          {item.source}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-rose-600 text-sm">
                        Shs {item.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.isManual && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExpense(item.id)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                            title="Delete manual entry"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>


      {/* SECTION 3 (NEW): Income Earnings & Inflows Section */}
      <Card className="border-none shadow-xl bg-white overflow-hidden border-l-4 border-l-emerald-600">
        <CardHeader className="bg-slate-50/50 pb-4 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2 text-emerald-700 font-black">
                <ArrowUpRight className="h-6 w-6 text-emerald-600" />
                Income Earnings & Inflows
              </CardTitle>
              <CardDescription className="mt-1">
                Record all incoming cash revenues, product sales, debtor payments, and personal capital injections.
              </CardDescription>
            </div>
            <Button
              onClick={() => setAddInflowModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-5 rounded-xl shadow-md flex items-center gap-2 shrink-0"
            >
              <PlusCircle className="h-5 w-5" />
              Add Income / Inflow
            </Button>
          </div>

          <div className="mt-4 p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-lg">
                <ArrowUpRight className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-black uppercase text-emerald-900 tracking-wider">Total Filtered Inflows</span>
                <p className="text-2xl font-black text-emerald-700">Shs {totalInflowsAmount.toLocaleString()}</p>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 font-bold border-emerald-200">
              {allInflowsList.length} Record(s)
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between px-6 pt-4 pb-2">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search inflows, category, title..."
                className="pl-9 h-10 border-slate-200 bg-white"
                value={inflowsSearch}
                onChange={(e) => setInflowsSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Filter Period:</span>
              <Select value={inflowsPeriodFilter} onValueChange={setInflowsPeriodFilter}>
                <SelectTrigger className="w-[220px] h-10 border-slate-200 font-bold bg-white text-slate-700 rounded-xl focus:ring-1 focus:ring-emerald-500 shadow-sm">
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent className="font-bold">
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="all">All {isMonthMode ? 'Months' : 'Weeks'}</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value={isMonthMode ? "last_month" : "last_week"}>{isMonthMode ? "Last Month" : "Last Week"}</SelectItem>
                  {periodsList.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto border-t">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-slate-50/50">
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Inflow Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Inflow Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allInflowsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">
                      No income / inflow records found for the selected filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  allInflowsList.map((item: any) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/40">
                      <TableCell className="text-xs font-bold text-slate-600">
                        {item.timestamp ? format(parseISO(item.timestamp), "MMM dd, yyyy HH:mm") : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-sm">{item.title}</span>
                          {item.notes && <span className="text-[11px] text-slate-500">{item.notes}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-bold text-xs bg-slate-50 text-slate-700">
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          item.source === 'System Auto' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-800'
                        }`}>
                          {item.source}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-emerald-600 text-sm">
                        Shs {item.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.isManual && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteInflow(item.id)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                            title="Delete manual entry"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>


      {/* SECTION 4: Managing Debtors Section */}
      <Card className="border-none shadow-lg bg-white">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle className="text-lg flex items-center gap-2 text-primary font-bold">
            <Users className="h-5 w-5" />
            Managing Debtors
          </CardTitle>
          <CardDescription>View customers with active balances and log credit payments.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row gap-4 mb-4 items-center justify-between px-6 pt-4 pb-2">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search customers, products, or ID..."
                className="pl-9 h-10 border-slate-200 bg-white"
                value={debtorSearch}
                onChange={(e) => setDebtorSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Filter Period:</span>
              <Select value={debtorPeriodFilter} onValueChange={setDebtorPeriodFilter}>
                <SelectTrigger className="w-[220px] h-10 border-slate-200 font-bold bg-white text-slate-700 rounded-xl focus:ring-1 focus:ring-accent shadow-sm">
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent className="font-bold">
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="all">All {isMonthMode ? 'Months' : 'Weeks'}</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value={isMonthMode ? "last_month" : "last_week"}>{isMonthMode ? "Last Month" : "Last Week"}</SelectItem>
                  {periodsList.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="max-h-[350px] overflow-y-auto border-t">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-slate-50/50">
                  <TableHead>Customer</TableHead>
                  <TableHead>Products Taken</TableHead>
                  <TableHead>Outstanding Debt</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDebtors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">
                      No active debtors found matching filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDebtors.map((debtor: any) => {
                    const remainingDebt = Math.max(0, (debtor.total || 0) - (debtor.amountPaid || 0))
                    const daysRemaining = debtor.dueDate ? differenceInDays(new Date(debtor.dueDate), new Date()) : null

                    return (
                      <TableRow key={debtor.id} className="hover:bg-slate-50/30">
                        <TableCell className="font-bold text-slate-800">{debtor.customerName}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-slate-500 font-medium">
                          {debtor.items?.map((it: any) => `${it.name} (x${it.quantity})`).join(', ') || 'Inventory item'}
                        </TableCell>
                        <TableCell className="font-mono">
                          <span className="font-bold text-red-600">Shs {remainingDebt.toLocaleString()}</span>
                          <span className="text-[10px] text-muted-foreground block">Total: Shs {debtor.total.toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          {debtor.dueDate ? format(parseISO(debtor.dueDate), "MMM dd, yyyy") : "N/A"}
                        </TableCell>
                        <TableCell>
                          {daysRemaining !== null ? (
                            daysRemaining < 0 ? (
                              <Badge className="bg-red-100 text-red-800 border-none">Overdue by {Math.abs(daysRemaining)} days</Badge>
                            ) : daysRemaining <= 3 ? (
                              <Badge className="bg-amber-100 text-amber-800 border-none">Due in {daysRemaining} days</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800 border-none">Active ({daysRemaining} days left)</Badge>
                            )
                          ) : (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            onClick={() => setActiveDebtor(debtor)}
                            className="h-8 px-4 bg-primary text-white hover:bg-primary/95 text-xs font-bold"
                          >
                            <DollarSign className="h-3 w-3 mr-1" /> Pay
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>


      {/* SECTION 4B: Managing Creditors Section (Accounts Payable) */}
      <Card className="border-none shadow-lg bg-white">
        <CardHeader className="border-b bg-amber-50/40">
          <CardTitle className="text-lg flex items-center gap-2 text-amber-900 font-bold">
            <Building2 className="h-5 w-5 text-amber-600" />
            Managing Creditors (Accounts Payable)
          </CardTitle>
          <CardDescription>View suppliers with pending credit balances and log payout installments.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row gap-4 mb-4 items-center justify-between px-6 pt-4 pb-2">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search supplier, product, or ID..."
                className="pl-9 h-10 border-slate-200 bg-white"
                value={creditorSearch}
                onChange={(e) => setCreditorSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Filter Period:</span>
              <Select value={creditorPeriodFilter} onValueChange={setCreditorPeriodFilter}>
                <SelectTrigger className="w-[220px] h-10 border-slate-200 font-bold bg-white text-slate-700 rounded-xl focus:ring-1 focus:ring-amber-500 shadow-sm">
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent className="font-bold">
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="all">All {isMonthMode ? 'Months' : 'Weeks'}</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value={isMonthMode ? "last_month" : "last_week"}>{isMonthMode ? "Last Month" : "Last Week"}</SelectItem>
                  {periodsList.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="max-h-[350px] overflow-y-auto border-t">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-slate-50/50">
                  <TableHead>Supplier</TableHead>
                  <TableHead>Product / Order Item</TableHead>
                  <TableHead>Amount Owed</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCreditorsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">
                      No active creditor accounts found matching filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCreditorsList.map((creditor: any) => {
                    const remainingDebt = Math.max(0, (creditor.totalAmount || 0) - (creditor.amountPaid || 0))
                    const daysRemaining = creditor.dueDate ? safeDiffDays(creditor.dueDate, new Date()) : null

                    return (
                      <TableRow key={creditor.id} className="hover:bg-amber-50/20">
                        <TableCell className="font-bold text-slate-800">
                          <div>
                            <span>{creditor.supplierName}</span>
                            {creditor.supplierContact && (
                              <span className="text-[11px] text-slate-500 block font-normal">{creditor.supplierContact}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-slate-600 font-medium">
                          {creditor.productName} ({creditor.quantity} {creditor.unitType || 'pcs'})
                        </TableCell>
                        <TableCell className="font-mono">
                          <span className="font-bold text-amber-700">Shs {remainingDebt.toLocaleString()}</span>
                          <span className="text-[10px] text-muted-foreground block">Total: Shs {(creditor.totalAmount || 0).toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          {creditor.dueDate ? format(safeParseDate(creditor.dueDate) || new Date(), "MMM dd, yyyy") : "N/A"}
                        </TableCell>
                        <TableCell>
                          {daysRemaining !== null ? (
                            daysRemaining < 0 ? (
                              <Badge className="bg-red-100 text-red-800 border-none">Overdue by {Math.abs(daysRemaining)} days</Badge>
                            ) : daysRemaining <= 3 ? (
                              <Badge className="bg-amber-100 text-amber-800 border-none">Due in {daysRemaining} days</Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-800 border-none">Active ({daysRemaining} days left)</Badge>
                            )
                          ) : (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              onClick={() => setActiveCreditor(creditor)}
                              className="h-8 px-3 bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold shadow-sm"
                            >
                              <DollarSign className="h-3 w-3 mr-1" /> Pay
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                await fetch('/api/creditors', {
                                  method: 'DELETE',
                                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                  body: JSON.stringify({ creditorId: creditor.id })
                                })
                                fetchData()
                                toast({ title: 'Creditor Removed', description: 'Deleted creditor record.' })
                              }}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 border-slate-200"
                              title="Delete invalid creditor record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>


      {/* SECTION 5: System Report Generator */}
      <Card className="border-none shadow-xl bg-white overflow-hidden border-l-4 border-l-primary">
        <CardHeader className="bg-slate-50/50 pb-4 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2 text-primary font-black">
                <TrendingUp className="h-5 w-5 text-accent" />
                System Report Generator
              </CardTitle>
              <CardDescription className="mt-1">
                Configure time scope, multi-select report documents, choose format options, and export or print.
              </CardDescription>
            </div>
            {isAdmin && (
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 font-extrabold text-xs px-3 py-1 shrink-0">
                🛡️ Business Admin Controls Unlocked
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
          <div className="grid gap-8 md:grid-cols-3">
            
            {/* SUB-SECTION 1: Time / Period Selection */}
            <div className="space-y-4 p-4 bg-slate-50/60 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 text-primary font-black text-sm uppercase tracking-wide">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-white text-xs font-bold">1</span>
                <span>Select Report Period</span>
              </div>

              <div className="space-y-3">
                <Label className="font-bold text-slate-700 block text-xs">Period Scope</Label>
                <Select value={reportPeriod} onValueChange={setReportPeriod}>
                  <SelectTrigger className="h-11 border-slate-200 font-bold bg-white text-slate-700 rounded-xl focus:ring-1 focus:ring-accent">
                    <SelectValue placeholder="Select Period" />
                  </SelectTrigger>
                  <SelectContent className="font-bold">
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value={isMonthMode ? "last_month" : "last_week"}>{isMonthMode ? "Last Month" : "Last Week"}</SelectItem>
                    <SelectItem value="all">All {isMonthMode ? 'Months' : 'Weeks'} (All-time)</SelectItem>
                    <SelectItem value="custom">📅 Set Custom Period (Date Range)</SelectItem>
                    {periodsList.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {reportPeriod === 'custom' && (
                  <div className="space-y-3 pt-2 animate-in fade-in duration-200 border-t border-slate-200/80">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-600">Starting Date</Label>
                      <Input
                        type="date"
                        className="h-10 border-slate-200 bg-white font-bold text-xs"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-600">Ending Date</Label>
                      <Input
                        type="date"
                        className="h-10 border-slate-200 bg-white font-bold text-xs"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SUB-SECTION 2: Document Selection (Multi-Select) */}
            <div className="space-y-4 p-4 bg-slate-50/60 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 text-primary font-black text-sm uppercase tracking-wide">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-white text-xs font-bold">2</span>
                <span>Select Report Documents</span>
              </div>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 text-xs">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">Standard Operational Reports</span>
                
                {[
                  { id: 'sales_report', label: 'Sales & Revenue Report' },
                  { id: 'expenses_report', label: 'Expenses & Outflows Report' },
                  { id: 'purchases_transfers', label: 'Purchases & Transfers Reorder' },
                  { id: 'expiry_report', label: 'Expiry Products & Stock Loss' },
                  { id: 'debtors_report', label: 'Managing Debtors Summary' },
                ].map(docOpt => {
                  const isChecked = selectedReportDocs.includes(docOpt.id)
                  return (
                    <div
                      key={docOpt.id}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedReportDocs(selectedReportDocs.filter(id => id !== docOpt.id))
                        } else {
                          setSelectedReportDocs([...selectedReportDocs, docOpt.id])
                        }
                      }}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isChecked ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-white border-slate-200 text-slate-700 font-medium hover:bg-slate-100/60'
                      }`}
                    >
                      <span>{docOpt.label}</span>
                      <Checkbox checked={isChecked} />
                    </div>
                  )
                })}

                {isAdmin && (
                  <>
                    <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider block mt-3 mb-1">Critical Admin Financial Statements</span>
                    {[
                      { id: 'cashflow_statement', label: 'Cashflow Statement 🔒' },
                      { id: 'profit_loss', label: 'Profit & Loss Account (P&L) 🔒' },
                      { id: 'trial_balance', label: 'Trial Balance 🔒' },
                      { id: 'balance_sheet', label: 'Executive Balance Sheet 🔒' },
                    ].map(docOpt => {
                      const isChecked = selectedReportDocs.includes(docOpt.id)
                      return (
                        <div
                          key={docOpt.id}
                          onClick={() => {
                            if (isChecked) {
                              setSelectedReportDocs(selectedReportDocs.filter(id => id !== docOpt.id))
                            } else {
                              setSelectedReportDocs([...selectedReportDocs, docOpt.id])
                            }
                          }}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isChecked ? 'bg-amber-100 border-amber-500 text-amber-900 font-bold' : 'bg-amber-50/50 border-amber-200 text-amber-900 font-medium hover:bg-amber-100/50'
                          }`}
                        >
                          <span>{docOpt.label}</span>
                          <Checkbox checked={isChecked} />
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            </div>

            {/* SUB-SECTION 3: Format Selection & Output Actions */}
            <div className="space-y-4 p-4 bg-slate-50/60 rounded-2xl border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-primary font-black text-sm uppercase tracking-wide mb-4">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-white text-xs font-bold">3</span>
                  <span>Output Action & Format</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <Checkbox
                      id="opt-pdf"
                      checked={exportPdfChecked}
                      onCheckedChange={(checked) => setExportPdfChecked(!!checked)}
                    />
                    <label htmlFor="opt-pdf" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
                      Generate as PDF Document
                    </label>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <Checkbox
                      id="opt-print"
                      checked={exportPrintChecked}
                      disabled={userProfile?.receiptPrintingEnabled === false}
                      onCheckedChange={(checked) => setExportPrintChecked(!!checked)}
                    />
                    <div className="flex flex-col">
                      <label htmlFor="opt-print" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
                        Send Direct to Thermal Printer
                      </label>
                      <span className="text-[9px] text-slate-500 font-semibold">
                        {userProfile?.receiptPrintingEnabled !== false ? `Printer: ${userProfile?.printerName || 'UPshop Thermal Receipt-58'}` : 'Disabled in Settings'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGenerateSelectedReports}
                disabled={generatingReports || selectedReportDocs.length === 0}
                className="w-full h-12 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-xs"
              >
                {generatingReports ? (
                  <span>Compiling Reports...</span>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 text-accent" />
                    <span>Generate & Export ({selectedReportDocs.length}) Reports</span>
                  </>
                )}
              </Button>
            </div>

          </div>

          {/* Generated Documents & Reports Log (Bottom of Section) */}
          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Generated Documents & Reports Log</h3>
              </div>
              <Badge variant="outline" className="text-xs font-bold bg-slate-50 text-slate-600">
                {generatedReportsLog.length} File(s)
              </Badge>
            </div>

            {generatedReportsLog.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground italic bg-slate-50 rounded-xl border border-dashed">
                No generated reports yet. Select documents above and click "Generate & Export Selected Reports".
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {generatedReportsLog.map((rep) => (
                  <div
                    key={rep.id}
                    onClick={() => handleRevealReportInManager(rep)}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 text-primary rounded-lg">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800 hover:text-primary">{rep.filename}</span>
                        <span className="text-[10px] text-slate-500 font-semibold">{rep.title} • {format(parseISO(rep.timestamp), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                        {rep.format}
                      </Badge>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-primary font-bold">
                        Open File ↗
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>


      {/* SECTION 6: System Notifications Section with Dismiss & 100-day Auto-dismiss */}
      <Card className="border-none shadow-md bg-white">
        <CardHeader className="bg-destructive/10 border-b border-destructive/20 flex flex-row items-center justify-between">
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            System Notifications
          </CardTitle>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Auto-dismisses after 100 days
          </span>
        </CardHeader>
        <CardContent className="p-6">
          {systemAlerts.length === 0 ? (
            <div className="flex items-center gap-2 text-green-700 font-semibold p-4 bg-green-50 rounded-xl">
              <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
              <span>System healthy. All operations are operating within normal parameters.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {systemAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start justify-between gap-3 p-4 rounded-xl border font-medium text-sm transition-all ${
                    alert.type === 'danger'
                      ? 'bg-red-50 border-red-100 text-red-700'
                      : alert.type === 'warning'
                        ? 'bg-amber-50 border-amber-100 text-amber-800'
                        : 'bg-blue-50 border-blue-100 text-blue-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className={`h-5 w-5 shrink-0 mt-0.5 ${
                      alert.type === 'danger'
                        ? 'text-red-500'
                        : alert.type === 'warning'
                          ? 'text-amber-500'
                          : 'text-blue-500'
                    }`} />
                    <span>{alert.message}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismissAlert(alert.id)}
                    className="h-8 px-3 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg shrink-0 flex items-center gap-1"
                  >
                    <X className="h-4 w-4" />
                    <span>Dismiss</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Modal 1: Add Expense / Outflow Modal */}
      {addExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md border-none shadow-2xl bg-white p-6 animate-in zoom-in-95 duration-200 rounded-2xl">
            <CardHeader className="p-0 pb-4 border-b">
              <CardTitle className="text-xl text-rose-700 font-black flex items-center gap-2">
                <ArrowDownRight className="h-6 w-6 text-rose-600" />
                Add Expense / Outflow
              </CardTitle>
              <CardDescription className="text-slate-500 font-semibold mt-1">
                Enter details of the business expenditure or owner withdrawal.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveExpense} className="py-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exp-title" className="font-bold text-slate-700">Expense Title / Description</Label>
                <Input
                  id="exp-title"
                  type="text"
                  placeholder="e.g. Owner Personal Draw, Shop Rent, Fuel"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  className="h-11 border-slate-200"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Category</Label>
                <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                  <SelectTrigger className="h-11 border-slate-200 font-bold bg-white text-slate-700 rounded-xl">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="font-bold">
                    <SelectItem value="Owner Withdrawal">Owner Withdrawal</SelectItem>
                    <SelectItem value="Operational Overhead">Operational Overhead</SelectItem>
                    <SelectItem value="Salaries & Wages">Salaries & Wages</SelectItem>
                    <SelectItem value="Rent & Utilities">Rent & Utilities</SelectItem>
                    <SelectItem value="Maintenance & Fuel">Maintenance & Fuel</SelectItem>
                    <SelectItem value="Other Outflow">Other Outflow</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="exp-amount" className="font-bold text-slate-700">Outflow Amount (Shs)</Label>
                <Input
                  id="exp-amount"
                  type="number"
                  placeholder="e.g. 150000"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="h-11 border-slate-200 font-mono font-bold"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exp-notes" className="font-bold text-slate-700">Optional Notes / Reason</Label>
                <Input
                  id="exp-notes"
                  type="text"
                  placeholder="e.g. Approved cash withdrawal by owner"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  className="h-11 border-slate-200 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddExpenseModalOpen(false)}
                  className="h-11 font-bold border-slate-200 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-11 bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 rounded-xl shadow"
                >
                  Save Expense Outflow
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}


      {/* Modal 2: Add Income / Inflow Modal */}
      {addInflowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md border-none shadow-2xl bg-white p-6 animate-in zoom-in-95 duration-200 rounded-2xl">
            <CardHeader className="p-0 pb-4 border-b">
              <CardTitle className="text-xl text-emerald-700 font-black flex items-center gap-2">
                <ArrowUpRight className="h-6 w-6 text-emerald-600" />
                Add Income / Inflow
              </CardTitle>
              <CardDescription className="text-slate-500 font-semibold mt-1">
                Enter details of the financial inflow or personal capital injection.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveInflow} className="py-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inf-title" className="font-bold text-slate-700">Inflow Title / Description</Label>
                <Input
                  id="inf-title"
                  type="text"
                  placeholder="e.g. Owner Capital Injection, Side Income"
                  value={inflowTitle}
                  onChange={(e) => setInflowTitle(e.target.value)}
                  className="h-11 border-slate-200"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Category</Label>
                <Select value={inflowCategory} onValueChange={setInflowCategory}>
                  <SelectTrigger className="h-11 border-slate-200 font-bold bg-white text-slate-700 rounded-xl">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="font-bold">
                    <SelectItem value="Personal Capital Injection">Personal Capital Injection</SelectItem>
                    <SelectItem value="Side Business Income">Side Business Income</SelectItem>
                    <SelectItem value="Commission & Bonus">Commission & Bonus</SelectItem>
                    <SelectItem value="Investments">Investments</SelectItem>
                    <SelectItem value="Other Inflow">Other Inflow</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inf-amount" className="font-bold text-slate-700">Inflow Amount (Shs)</Label>
                <Input
                  id="inf-amount"
                  type="number"
                  placeholder="e.g. 500000"
                  value={inflowAmount}
                  onChange={(e) => setInflowAmount(e.target.value)}
                  className="h-11 border-slate-200 font-mono font-bold"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inf-notes" className="font-bold text-slate-700">Optional Notes / Reason</Label>
                <Input
                  id="inf-notes"
                  type="text"
                  placeholder="e.g. Added personal capital to store float"
                  value={inflowNotes}
                  onChange={(e) => setInflowNotes(e.target.value)}
                  className="h-11 border-slate-200 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddInflowModalOpen(false)}
                  className="h-11 font-bold border-slate-200 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 rounded-xl shadow"
                >
                  Save Income Inflow
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}


      {/* Modal 3: Payment Dialog Modal */}
      {activeDebtor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md border-none shadow-2xl bg-white p-6 animate-in zoom-in-95 duration-200 rounded-2xl">
            <CardHeader className="p-0 pb-4 border-b">
              <CardTitle className="text-xl text-primary font-bold">Record Debt Payment</CardTitle>
              <CardDescription className="font-semibold text-slate-500 mt-1">Customer: {activeDebtor.customerName}</CardDescription>
            </CardHeader>
            <div className="py-6 space-y-4">
              <div className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 font-bold">Remaining Debt:</span>
                <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-base">Shs {Math.max(0, (activeDebtor.total || 0) - (activeDebtor.amountPaid || 0)).toLocaleString()}</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-amount" className="font-bold">Payment Received (Shs)</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  placeholder="e.g. 50000"
                  className="h-11 border-slate-200"
                  value={paymentInput}
                  onChange={(e) => setPaymentInput(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t pt-4">
              <Button
                variant="outline"
                onClick={() => { setActiveDebtor(null); setPaymentInput(""); }}
                className="h-11 font-bold border-slate-200 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayDebt}
                className="h-11 bg-primary text-white hover:bg-primary/95 font-bold px-6 rounded-xl"
              >
                Confirm Payment
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal 4: Creditor Payment Dialog Modal */}
      {activeCreditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md border-none shadow-2xl bg-white p-6 animate-in zoom-in-95 duration-200 rounded-2xl">
            <CardHeader className="p-0 pb-4 border-b">
              <CardTitle className="text-xl text-amber-900 font-bold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-600" />
                Pay Supplier Creditor
              </CardTitle>
              <CardDescription className="font-semibold text-slate-500 mt-1">
                Supplier: {activeCreditor.supplierName} ({activeCreditor.productName})
              </CardDescription>
            </CardHeader>
            <div className="py-6 space-y-4">
              <div className="flex justify-between items-center text-sm p-3 bg-amber-50 rounded-lg border border-amber-100">
                <span className="text-amber-900 font-bold">Outstanding Balance Owed:</span>
                <span className="font-mono font-black text-amber-700 text-base">
                  Shs {Math.max(0, (activeCreditor.totalAmount || 0) - (activeCreditor.amountPaid || 0)).toLocaleString()}
                </span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-creditor-amount" className="font-bold">Payment Amount (Shs)</Label>
                <Input
                  id="pay-creditor-amount"
                  type="number"
                  placeholder="e.g. 100000"
                  className="h-11 border-slate-200 font-mono font-bold"
                  value={creditorPaymentInput}
                  onChange={(e) => setCreditorPaymentInput(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t pt-4">
              <Button
                variant="outline"
                onClick={() => { setActiveCreditor(null); setCreditorPaymentInput(""); }}
                className="h-11 font-bold border-slate-200 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayCreditor}
                className="h-11 bg-amber-600 text-white hover:bg-amber-700 font-bold px-6 rounded-xl shadow"
              >
                Confirm Payout
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  )
}
