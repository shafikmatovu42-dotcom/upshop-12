"use client"

import { useMemo, useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from "recharts"
import {
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  Calendar,
  Building2,
  MapPin,
  User as UserIcon,
  Activity,
  Camera,
  Percent,
  CreditCard,
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Search,
  Copy,
  RotateCcw,
  Bookmark,
  XCircle,
  X
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useApiMutation } from "@/lib/use-api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { parseISO, format, differenceInDays } from "date-fns"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { useToast } from "@/hooks/use-toast"
import { getPeriodFromTimestamp } from "@/lib/utils"

export default function DashboardPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [allSales, setAllSales] = useState<any[]>([])
  const [allReturns, setAllReturns] = useState<any[]>([])
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [allCreditors, setAllCreditors] = useState<any[]>([])
  const [allOrders, setAllOrders] = useState<any[]>([])
  const [allMovements, setAllMovements] = useState<any[]>([])
  const [activeChartIndex, setActiveChartIndex] = useState(0)
  const [isChartPaused, setIsChartPaused] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(true)
  const [loading, setLoading] = useState(true)

  // Search & Period Filters for Dashboard Sections
  const [salesSearch, setSalesSearch] = useState("")
  const [salesPeriodFilter, setSalesPeriodFilter] = useState("today")
  const [ordersSearch, setOrdersSearch] = useState("")
  const [ordersPeriodFilter, setOrdersPeriodFilter] = useState("all")

  const [debtorsSearch, setDebtorsSearch] = useState("")
  const [debtorsPeriodFilter, setDebtorsPeriodFilter] = useState("all")

  const [creditorsSearch, setCreditorsSearch] = useState("")
  const [creditorsPeriodFilter, setCreditorsPeriodFilter] = useState("all")

  const [expiringSearch, setExpiringSearch] = useState("")
  const [expiringPeriodFilter, setExpiringPeriodFilter] = useState("all")

  const [returnsSearch, setReturnsSearch] = useState("")
  const [returnsPeriodFilter, setReturnsPeriodFilter] = useState("all")

  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [detailsModalData, setDetailsModalData] = useState<any>(null)
  const [detailsModalType, setDetailsModalType] = useState<'sale' | 'debtor' | 'return' | 'creditor'>('sale')

  const [expiryDetailsModalOpen, setExpiryDetailsModalOpen] = useState(false)
  const [expiryDetailsProduct, setExpiryDetailsProduct] = useState<any>(null)

  const [dismissModalOpen, setDismissModalOpen] = useState(false)
  const [dismissProduct, setDismissProduct] = useState<any>(null)
  const [dismissQty, setDismissQty] = useState(0)
  const [dismissRemaining, setDismissRemaining] = useState(0)
  const [dismissLoss, setDismissLoss] = useState(0)

  const openDismissModal = (prod: any) => {
    const totalStock = prod.quantity || (prod.shopStock || 0) + (prod.warehouseStock || 0)
    const unitBuyingPrice = prod.buyingPrice || (prod.boxBuyingPrice && prod.piecesPerBox ? prod.boxBuyingPrice / prod.piecesPerBox : 0) || 0
    setDismissProduct(prod)
    setDismissQty(totalStock)
    setDismissRemaining(0)
    setDismissLoss(totalStock * unitBuyingPrice)
    setDismissModalOpen(true)
  }

  const handleDismissQtyChange = (newQty: number) => {
    if (!dismissProduct) return
    const totalStock = dismissProduct.quantity || (dismissProduct.shopStock || 0) + (dismissProduct.warehouseStock || 0)
    const validQty = Math.max(0, Math.min(totalStock, newQty))
    const unitBuyingPrice = dismissProduct.buyingPrice || (dismissProduct.boxBuyingPrice && dismissProduct.piecesPerBox ? dismissProduct.boxBuyingPrice / dismissProduct.piecesPerBox : 0) || 0
    setDismissQty(validQty)
    setDismissRemaining(totalStock - validQty)
    setDismissLoss(validQty * unitBuyingPrice)
  }

  const handleDismissRemainingChange = (newRem: number) => {
    if (!dismissProduct) return
    const totalStock = dismissProduct.quantity || (dismissProduct.shopStock || 0) + (dismissProduct.warehouseStock || 0)
    const validRem = Math.max(0, Math.min(totalStock, newRem))
    const validQty = totalStock - validRem
    const unitBuyingPrice = dismissProduct.buyingPrice || (dismissProduct.boxBuyingPrice && dismissProduct.piecesPerBox ? dismissProduct.boxBuyingPrice / dismissProduct.piecesPerBox : 0) || 0
    setDismissRemaining(validRem)
    setDismissQty(validQty)
    setDismissLoss(validQty * unitBuyingPrice)
  }

  const handleConfirmDismissExpired = async () => {
    if (!dismissProduct) return
    try {
      const isBatch = !!dismissProduct.movementId
      const endpoint = isBatch ? '/api/products/dismiss-batch' : '/api/products/dismiss-expired'
      const payload = isBatch
        ? { movementId: dismissProduct.movementId, productId: dismissProduct.productId, qtyToDismiss: dismissQty, lossAmount: dismissLoss }
        : { productId: dismissProduct.productId || dismissProduct.id, qtyToDismiss: dismissQty, lossAmount: dismissLoss }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const nameToDisplay = dismissProduct.productName || dismissProduct.name
        const batchTag = dismissProduct.batchLabel ? ` (${dismissProduct.batchLabel})` : ''
        toast({
          title: "Stock Dismissed & Loss Logged",
          description: `Dismissed ${dismissQty} unit(s) of ${nameToDisplay}${batchTag}. Recorded internal loss of Shs ${dismissLoss.toLocaleString()}.`
        })
        setDismissModalOpen(false)
        fetchData(false)
        window.dispatchEvent(new Event("upshop_data_updated"))
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Could not dismiss stock." })
    }
  }

  const handleIgnoreExpiryReminder = async (prodId: string, prodName: string) => {
    try {
      const res = await fetch('/api/products/ignore-expiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId: prodId })
      })

      if (res.ok) {
        toast({
          title: "Reminder Ignored",
          description: `Expiry alert for '${prodName}' marked as ignored.`
        })
        fetchData(false)
        window.dispatchEvent(new Event("upshop_data_updated"))
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Could not ignore reminder." })
    }
  }

  const handleOpenDetails = (data: any, type: 'sale' | 'debtor' | 'return' | 'creditor') => {
    setDetailsModalData(data)
    setDetailsModalType(type)
    setDetailsModalOpen(true)
  }

  const [systemDateTime, setSystemDateTime] = useState<Date | null>(null)

  useEffect(() => {
    setSystemDateTime(new Date())
    const interval = setInterval(() => {
      setSystemDateTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const formattedSystemDate = systemDateTime ? format(systemDateTime, 'EEEE, MMM dd, yyyy') : ''
  const formattedSystemTime = systemDateTime ? format(systemDateTime, 'hh:mm:ss a') : ''

  const { mutate: updateProfile } = useApiMutation('/api/user/profile', 'PUT')

  // Redirect if not authenticated
  useEffect(() => {
    if (!token) {
      router.push('/login')
    }
  }, [token, router])

  const fetchData = async (showLoading = true) => {
    if (!token || !user) return
    try {
      if (showLoading) setLoading(true)
      const response = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const profile = await response.json()
        setUserProfile(profile)

        // Fetch sales
        const salesResponse = await fetch('/api/sales', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (salesResponse.ok) {
          const salesData = await salesResponse.json()
          setAllSales(salesData)
        }

        // Fetch returns
        const returnsResponse = await fetch('/api/returns', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (returnsResponse.ok) {
          const returnsData = await returnsResponse.json()
          setAllReturns(returnsData)
        }

        // Fetch products
        const productsResponse = await fetch('/api/products', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (productsResponse.ok) {
          const productsData = await productsResponse.json()
          setAllProducts(productsData)
        }

        // Fetch creditors
        const creditorsResponse = await fetch('/api/creditors', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (creditorsResponse.ok) {
          const creditorsData = await creditorsResponse.json()
          setAllCreditors(creditorsData)
        }

        // Fetch orders
        const ordersResponse = await fetch('/api/orders', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json()
          setAllOrders(ordersData)
        }

        // Fetch movements for stock purchase history
        const movementsResponse = await fetch('/api/movements', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (movementsResponse.ok) {
          const movementsData = await movementsResponse.json()
          setAllMovements(movementsData)
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  // Fetch user profile and sales data & listen for live JAHWI AI actions
  useEffect(() => {
    fetchData()

    const handleGlobalUpdate = () => {
      fetchData(false)
    }

    window.addEventListener('upshop_data_updated', handleGlobalUpdate)
    return () => {
      window.removeEventListener('upshop_data_updated', handleGlobalUpdate)
    }
  }, [token, user])

  // Tauri Rust Backend Connection Check
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      import('@tauri-apps/api/core').then((module) => {
        if (module && module.invoke) {
          module.invoke<string>('greet', { name: 'Active Agent' })
            .then((msg) => {
              toast({
                title: "Tauri Bridge Active",
                description: msg,
                duration: 5000,
              })
            })
            .catch((err) => {
              console.error("Tauri invoke failed:", err)
            })
        } else {
          console.warn("Tauri invoke is not available in imported module.")
        }
      }).catch((err) => {
        console.log("Failed to load Tauri core APIs:", err)
      })
    } else {
      console.log("Running in standard browser mode (non-Tauri environment).")
    }
  }, [])

  const isMonthMode = userProfile?.operationPeriodMode === 'months'
  const activePeriod = userProfile?.currentWeek || (isMonthMode ? 'January' : 'Week 1')
  const weeklyTarget = userProfile?.revenueTarget || 0

  // Filter sales for the current active period (week or month)
  const weeklySales = useMemo(() => {
    return allSales.filter((s: any) => {
      const period = getPeriodFromTimestamp(s.timestamp, isMonthMode, s.week)
      return period.toLowerCase() === activePeriod.toLowerCase()
    })
  }, [allSales, activePeriod, isMonthMode])

  // Revenue in Cash: sum of amountPaid for current period's sales
  const weeklyCashRevenue = useMemo(() => {
    return weeklySales.reduce((acc, sale) => acc + (sale.amountPaid || 0), 0)
  }, [weeklySales])

  // Revenue in Credit: sum of unpaid amount (total - amountPaid) for current week's sales
  const weeklyCreditRevenue = useMemo(() => {
    return weeklySales.reduce((acc, sale) => {
      if (sale.paymentMethod === 'credit' && sale.status === 'unpaid') {
        return acc + (sale.total - (sale.amountPaid || 0))
      }
      return acc
    }, 0)
  }, [weeklySales])

  // Progress rate in %: cash revenue / weeklyTarget * 100
  const progressRate = useMemo(() => {
    if (weeklyTarget <= 0) return 0
    return Math.round((weeklyCashRevenue / weeklyTarget) * 100)
  }, [weeklyCashRevenue, weeklyTarget])

  const isAdmin = !user?.role || user?.role === 'admin'

  // Dynamic Store Health calculation based on real system data (Exclusive to Business Admin Console)
  // Note: Store Health evaluates stock health (low/out of stock), revenue target performance, debtor credit ratios, and hardware printer status.
  const storeHealthMetrics = useMemo(() => {
    // 1. Inventory Stock Health Score (35% weight)
    const totalProductsCount = allProducts.length
    let outOfStockCount = 0
    let lowStockCount = 0
    
    allProducts.forEach((p: any) => {
      const stock = p.shopStock ?? 0
      const minStock = p.minStockLevel ?? 5
      if (stock <= 0) {
        outOfStockCount++
      } else if (stock <= minStock) {
        lowStockCount++
      }
    })

    let stockScore = 100
    if (totalProductsCount > 0) {
      const stockPenalty = ((outOfStockCount * 1.0) + (lowStockCount * 0.4)) / totalProductsCount
      stockScore = Math.max(0, Math.round((1 - stockPenalty) * 100))
    }

    // 2. Revenue Target Performance Score (35% weight)
    let revenueScore = 100
    if (weeklyTarget > 0) {
      revenueScore = Math.min(100, Math.round((weeklyCashRevenue / weeklyTarget) * 100))
    } else {
      revenueScore = weeklySales.length > 0 ? 85 : 75
    }

    // 3. Debtor & Credit Health Score (20% weight)
    const unpaidCreditSales = allSales.filter((s: any) => s.paymentMethod === 'credit' && s.status === 'unpaid')
    const overdueDebtors = unpaidCreditSales.filter((s: any) => {
      if (!s.dueDate) return false
      try {
        return parseISO(s.dueDate).getTime() < new Date().getTime()
      } catch (e) {
        return false
      }
    })
    
    let debtorScore = 100
    if (unpaidCreditSales.length > 0) {
      debtorScore = Math.max(0, 100 - (unpaidCreditSales.length * 10) - (overdueDebtors.length * 15))
    }

    // 4. Hardware & System Printer Connection Score (10% weight)
    const isPrinterOnline = (userProfile?.printerStatus || 'Online').toLowerCase() === 'online'
    const hardwareScore = isPrinterOnline ? 100 : 50

    // Composite Weighted Health Score (0% - 100%)
    const overallHealthPercentage = Math.round(
      (stockScore * 0.35) + 
      (revenueScore * 0.35) + 
      (debtorScore * 0.20) + 
      (hardwareScore * 0.10)
    )

    // Dynamic Labels & Colors
    let badgeText = "Optimal"
    let statusSummary = "Your store is in great shape!"
    let badgeColor = "bg-emerald-500 text-white"
    let circleColor = "border-emerald-500 text-emerald-700 bg-emerald-50"
    let borderLeftColor = "border-l-emerald-500"

    if (overallHealthPercentage >= 85) {
      badgeText = "Optimal"
      statusSummary = "Your store is in great shape!"
      badgeColor = "bg-emerald-500 text-white"
      circleColor = "border-emerald-500 text-emerald-700 bg-emerald-50"
      borderLeftColor = "border-l-emerald-500"
    } else if (overallHealthPercentage >= 70) {
      badgeText = "Good"
      statusSummary = "Store operating well with minor alerts."
      badgeColor = "bg-blue-500 text-white"
      circleColor = "border-blue-500 text-blue-700 bg-blue-50"
      borderLeftColor = "border-l-blue-500"
    } else if (overallHealthPercentage >= 50) {
      badgeText = "Fair"
      statusSummary = "Attention needed: low stock or debtors."
      badgeColor = "bg-amber-500 text-white"
      circleColor = "border-amber-500 text-amber-700 bg-amber-50"
      borderLeftColor = "border-l-amber-500"
    } else {
      badgeText = "Needs Action"
      statusSummary = "Critical alerts: low stock or high debt!"
      badgeColor = "bg-red-500 text-white"
      circleColor = "border-red-500 text-red-700 bg-red-50"
      borderLeftColor = "border-l-red-500"
    }

    // Precise sub-metric indicators so each row reflects exact real-time components
    let performanceText = "Excellent"
    let performanceColor = "text-emerald-600"
    if (revenueScore < 50) {
      performanceText = "Low"
      performanceColor = "text-red-600"
    } else if (revenueScore < 75) {
      performanceText = "Moderate"
      performanceColor = "text-amber-600"
    } else if (revenueScore < 85) {
      performanceText = "Good"
      performanceColor = "text-blue-600"
    }

    let stockStatusText = "Healthy"
    let stockStatusColor = "text-emerald-600"
    if (outOfStockCount > 0) {
      stockStatusText = `${outOfStockCount} Out of Stock`
      stockStatusColor = "text-red-600"
    } else if (lowStockCount > 0) {
      stockStatusText = `${lowStockCount} Low Stock`
      stockStatusColor = "text-amber-600"
    }

    let debtorStatusText = "Clean"
    let debtorStatusColor = "text-emerald-600"
    if (overdueDebtors.length > 0) {
      debtorStatusText = `${overdueDebtors.length} Overdue`
      debtorStatusColor = "text-red-600"
    } else if (unpaidCreditSales.length > 0) {
      debtorStatusText = `${unpaidCreditSales.length} Unpaid`
      debtorStatusColor = "text-amber-600"
    }

    return {
      percentage: overallHealthPercentage,
      badgeText: `${overallHealthPercentage}% ${badgeText}`,
      statusSummary,
      badgeColor,
      circleColor,
      borderLeftColor,
      performanceText,
      performanceColor,
      stockStatusText,
      stockStatusColor,
      debtorStatusText,
      debtorStatusColor
    }
  }, [allProducts, weeklySales, weeklyCashRevenue, weeklyTarget, allSales, userProfile])



  // 7-day filtered sales array (current day + previous 6 days)
  const last7DaysSalesList = useMemo(() => {
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    return allSales.filter((sale: any) => {
      if (!sale.timestamp) return false
      try {
        const saleDate = parseISO(sale.timestamp)
        return saleDate >= sevenDaysAgo
      } catch (e) {
        return false
      }
    })
  }, [allSales])

  // Chart data (displays 7-day rolling collection: Today & Previous 6 Days)
  // 1. Sales Trend Over Time (Current day + previous 6 days)
  const salesTrendData = useMemo(() => {
    const today = new Date()
    const days: { dateStr: string; dayLabel: string; sales: number }[] = []
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const dateStr = format(d, 'yyyy-MM-dd')
      const dayLabel = i === 0 ? `Today` : format(d, 'EEE dd')
      days.push({ dateStr, dayLabel, sales: 0 })
    }

    allSales.forEach((sale: any) => {
      if (sale.timestamp) {
        try {
          const saleDateStr = format(parseISO(sale.timestamp), 'yyyy-MM-dd')
          const matchedDay = days.find(d => d.dateStr === saleDateStr)
          if (matchedDay) {
            matchedDay.sales += (sale.total || 0)
          }
        } catch (e) {}
      }
    })

    return days.map(d => ({ name: d.dayLabel, sales: d.sales }))
  }, [allSales])

  // 2. Top Performing Products by Revenue (7-Day Rolling Window)
  const topPerformingProducts = useMemo(() => {
    const productSales: Record<string, number> = {}
    last7DaysSalesList.forEach((sale: any) => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          productSales[item.name] = (productSales[item.name] || 0) + (item.price * item.quantity)
        })
      }
    })
    const sorted = Object.entries(productSales)
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5)
    
    if (sorted.length === 0) {
      return [
        { name: "No Sales Yet", sales: 0 }
      ]
    }
    return sorted
  }, [last7DaysSalesList])

  // 3. Sales by Category (7-Day Rolling Window)
  const categorySales = useMemo(() => {
    const productCategoryMap: Record<string, string> = {}
    allProducts.forEach((p: any) => {
      productCategoryMap[p.name.toLowerCase()] = p.category || 'General'
      if (p.id) {
        productCategoryMap[p.id.toLowerCase()] = p.category || 'General'
      }
    })

    const categories: Record<string, number> = {}
    last7DaysSalesList.forEach((sale: any) => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          const cat = productCategoryMap[item.name.toLowerCase()] || 
                      (item.productId && productCategoryMap[item.productId.toLowerCase()]) || 
                      'General'
          categories[cat] = (categories[cat] || 0) + (item.price * item.quantity)
        })
      }
    })

    const totalRevenue = Object.values(categories).reduce((a, b) => a + b, 0)
    if (totalRevenue === 0) {
      return [
        { name: 'General', value: 100, percentage: 100, sales: 0 }
      ]
    }

    return Object.entries(categories).map(([name, sales]) => {
      const percentage = Math.round((sales / totalRevenue) * 100)
      return { name, value: sales, percentage, sales }
    })
  }, [weeklySales, allProducts])

  // 4. Top Customers for Pie Chart slide
  const topCustomerSales = useMemo(() => {
    const customerMap: Record<string, number> = {}
    weeklySales.forEach((sale: any) => {
      const name = sale.customerName || 'Normal Customer'
      customerMap[name] = (customerMap[name] || 0) + sale.total
    })

    const sorted = Object.entries(customerMap)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4)

    if (sorted.length === 0) {
      return [
        { name: "Normal Customer", total: 0 }
      ]
    }
    return sorted
  }, [weeklySales])

  // 5. Auto-slide effect (rotates index in one direction: 0 -> 1 -> 2 -> 3)
  useEffect(() => {
    if (isChartPaused) return
    const interval = setInterval(() => {
      setIsTransitioning(true)
      setActiveChartIndex((prev) => prev + 1)
    }, 5000)
    return () => clearInterval(interval)
  }, [isChartPaused])

  // Snap back to 0 seamlessly when reaching slide 3 (cloned slide 1)
  useEffect(() => {
    if (activeChartIndex === 3) {
      const timer = setTimeout(() => {
        setIsTransitioning(false)
        setActiveChartIndex(0)
      }, 700) // matches transitions animation time (700ms)
      return () => clearTimeout(timer)
    }
  }, [activeChartIndex])

  // 6. Resume auto-play on scroll event
  useEffect(() => {
    const handleScroll = () => {
      setIsChartPaused(false)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleChartClick = () => {
    setIsChartPaused((prev) => !prev)
  }

  const handleDotClick = (idx: number) => {
    setIsTransitioning(true)
    setActiveChartIndex(idx)
  }

  // Recently Sold Products with search and period filtering
  const recentlySoldByDay = useMemo(() => {
    const groups: Record<string, { date: Date; items: any[] }> = {}
    const now = new Date()
    
    // Determine sales to process based on select filter
    let salesToProcess: any[] = []
    
    if (salesPeriodFilter === "all") {
      salesToProcess = allSales
    } else if (salesPeriodFilter === "today") {
      const todayStr = format(now, 'yyyy-MM-dd')
      salesToProcess = allSales.filter((s: any) => {
        if (!s.timestamp) return false
        try {
          return format(parseISO(s.timestamp), 'yyyy-MM-dd') === todayStr
        } catch (e) {
          return false
        }
      })
    } else if (salesPeriodFilter === "yesterday") {
      const yesterday = new Date(now)
      yesterday.setDate(now.getDate() - 1)
      const yesterdayStr = format(yesterday, 'yyyy-MM-dd')
      salesToProcess = allSales.filter((s: any) => {
        if (!s.timestamp) return false
        try {
          return format(parseISO(s.timestamp), 'yyyy-MM-dd') === yesterdayStr
        } catch (e) {
          return false
        }
      })
    } else if (salesPeriodFilter === "last_week") {
      const lastWeekDate = new Date(now)
      lastWeekDate.setDate(now.getDate() - 7)
      const firstDayOfYear = new Date(lastWeekDate.getFullYear(), 0, 1)
      const pastDays = (lastWeekDate.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000)
      const weekNum = Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7)
      const lastWeekLabel = `Week ${Math.min(52, Math.max(1, weekNum))}`

      salesToProcess = allSales.filter((s: any) => {
        const period = getPeriodFromTimestamp(s.timestamp, false, s.week)
        return period.toLowerCase() === lastWeekLabel.toLowerCase()
      })
    } else if (salesPeriodFilter === "last_month") {
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
      const lastMonthIdx = (now.getMonth() - 1 + 12) % 12
      const lastMonthLabel = months[lastMonthIdx]

      salesToProcess = allSales.filter((s: any) => {
        const period = getPeriodFromTimestamp(s.timestamp, true, s.week)
        return period.toLowerCase() === lastMonthLabel.toLowerCase()
      })
    } else if (salesPeriodFilter === "active") {
      salesToProcess = weeklySales
    } else {
      // Filter by specific selected period (e.g. Week 1, January, etc.)
      salesToProcess = allSales.filter((s: any) => {
        const period = getPeriodFromTimestamp(s.timestamp, isMonthMode, s.week)
        return period.toLowerCase() === salesPeriodFilter.toLowerCase()
      })
    }

    salesToProcess.forEach((sale: any) => {
      if (sale.timestamp && sale.items && Array.isArray(sale.items)) {
        try {
          const dateObj = parseISO(sale.timestamp)
          const dayName = format(dateObj, 'EEEE')
          const displayGroupKey = `${dayName} (${format(dateObj, 'MMM dd')})`

          sale.items.forEach((item: any) => {
            const matchesSearch = 
              item.name.toLowerCase().includes(salesSearch.toLowerCase()) || 
              (sale.customerName || 'Normal Customer').toLowerCase().includes(salesSearch.toLowerCase()) ||
              sale.id.toLowerCase().includes(salesSearch.toLowerCase());

            if (!matchesSearch) return

            if (!groups[displayGroupKey]) {
              groups[displayGroupKey] = {
                date: dateObj,
                items: []
              }
            }

            groups[displayGroupKey].items.push({
              saleId: sale.id, // Transaction ID
              productName: item.name,
              typeName: item.typeName || item.type || 'Standard',
              customerName: sale.customerName || 'Normal Customer',
              quantity: item.quantity,
              amount: item.price * item.quantity,
              time: format(dateObj, 'hh:mm a'),
              paymentMethod: sale.paymentMethod || 'cash',
              status: sale.status || 'paid',
              timestamp: sale.timestamp,
              items: sale.items
            })
          })
        } catch (e) {
          console.error("Recently sold parse error", e)
        }
      }
    })

    return Object.entries(groups)
      .sort((a, b) => b[1].date.getTime() - a[1].date.getTime())
      .map(([day, val]) => ({ day, items: val.items }))
  }, [weeklySales, allSales, salesPeriodFilter, salesSearch, isMonthMode])

  // Filtered Pending Orders with search and period filtering
  const filteredPendingOrders = useMemo(() => {
    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')
    const query = ordersSearch.trim().toLowerCase()

    return allOrders.filter((ord: any) => {
      // 1. Search Filter
      if (query) {
        const matchesId = ord.id && ord.id.toLowerCase().includes(query)
        const matchesCustomer = ord.customerName && ord.customerName.toLowerCase().includes(query)
        const matchesMode = ord.paymentMethod && ord.paymentMethod.toLowerCase().includes(query)
        const matchesItems = ord.items && Array.isArray(ord.items) && ord.items.some((i: any) => i.name && i.name.toLowerCase().includes(query))
        if (!matchesId && !matchesCustomer && !matchesMode && !matchesItems) return false
      }

      // 2. Period Filter
      if (ordersPeriodFilter === "all") return true

      if (ordersPeriodFilter === "today") {
        if (!ord.timestamp) return false
        try {
          return format(parseISO(ord.timestamp), 'yyyy-MM-dd') === todayStr
        } catch (e) { return false }
      }

      if (ordersPeriodFilter === "yesterday") {
        if (!ord.timestamp) return false
        const yesterday = new Date(now)
        yesterday.setDate(now.getDate() - 1)
        const yesterdayStr = format(yesterday, 'yyyy-MM-dd')
        try {
          return format(parseISO(ord.timestamp), 'yyyy-MM-dd') === yesterdayStr
        } catch (e) { return false }
      }

      if (ordersPeriodFilter === "active") {
        const period = getPeriodFromTimestamp(ord.timestamp, isMonthMode, ord.week)
        return period.toLowerCase() === (userProfile?.currentWeek || "").toLowerCase()
      }

      const period = getPeriodFromTimestamp(ord.timestamp, isMonthMode, ord.week)
      return period.toLowerCase() === ordersPeriodFilter.toLowerCase()
    })
  }, [allOrders, ordersSearch, ordersPeriodFilter, isMonthMode, userProfile])

  const handleApproveOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'approved' })
      })

      if (res.ok) {
        toast({ title: "Order Approved!", description: "Transaction completed and inventory stock updated." })
        fetchData(false)
        window.dispatchEvent(new Event("upshop_data_updated"))
      } else {
        throw new Error('Approve failed')
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Could not approve order." })
    }
  }

  const handleTerminateOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'terminated' })
      })

      if (res.ok) {
        toast({ title: "Order Terminated", description: "Order has been marked as terminated." })
        fetchData(false)
        window.dispatchEvent(new Event("upshop_data_updated"))
      } else {
        throw new Error('Terminate failed')
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Could not terminate order." })
    }
  }

  // Debtor notifications auto-dismissed after 50 days or manual dismissal
  const debtorNotifications = useMemo(() => {
    const now = new Date()
    return allSales.filter((s: any) => {
      if (s.paymentMethod !== 'credit' || s.dismissed) return false
      if (s.timestamp) {
        try {
          const daysOld = differenceInDays(now, parseISO(s.timestamp))
          if (daysOld > 50) return false // Auto-dismiss after 50 days
        } catch (e) {}
      }
      return true
    })
  }, [allSales])

  // Returns notifications auto-dismissed after 50 days or manual dismissal
  const returnNotifications = useMemo(() => {
    const now = new Date()
    return allReturns.filter((r: any) => {
      if (r.dismissed) return false
      if (r.timestamp) {
        try {
          const daysOld = differenceInDays(now, parseISO(r.timestamp))
          if (daysOld > 50) return false // Auto-dismiss after 50 days
        } catch (e) {}
      }
      return true
    })
  }, [allReturns])

  const handleDismissNotification = async (saleId: string) => {
    // Instantly update state locally so the item smoothly vanishes with zero reload/flicker
    setAllSales(prevSales => prevSales.map(s => s.id === saleId ? { ...s, dismissed: true } : s))

    try {
      const response = await fetch('/api/debtors/dismiss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ saleId })
      })

      if (response.ok) {
        toast({ title: "Notification Dismissed", description: "Debtor notification dismissed successfully." })
      } else {
        throw new Error('Dismiss failed')
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to dismiss notification." })
      fetchData(false)
    }
  }

  const handleDismissReturnNotification = async (returnId: string) => {
    // Instantly update state locally so the item smoothly vanishes with zero reload/flicker
    setAllReturns(prevReturns => prevReturns.map(r => r.id === returnId ? { ...r, dismissed: true } : r))

    try {
      const response = await fetch('/api/returns/dismiss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ returnId })
      })

      if (response.ok) {
        toast({ title: "Return Notification Dismissed", description: "Return alert notification dismissed successfully." })
      } else {
        throw new Error('Dismiss failed')
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to dismiss return notification." })
      fetchData(false)
    }
  }

  const handleEntirelyDismissIgnored = async (prodId: string, prodName: string) => {
    try {
      const res = await fetch('/api/products/dismiss-expired', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: prodId,
          qtyToDismiss: 0,
          lossAmount: 0
        })
      })

      if (res.ok) {
        toast({
          title: "Alert Dismissed",
          description: `Ignored alert for '${prodName}' has been entirely removed.`
        })
        fetchData(false)
        window.dispatchEvent(new Event("upshop_data_updated"))
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Could not dismiss alert." })
    }
  }

  // Search & Period Filtered Memos
  const filteredDebtors = useMemo(() => {
    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')
    const query = debtorsSearch.trim().toLowerCase()

    return debtorNotifications.filter((notif: any) => {
      if (query) {
        const matchesCustomer = notif.customerName && notif.customerName.toLowerCase().includes(query)
        const matchesId = notif.id && notif.id.toLowerCase().includes(query)
        const matchesTotal = notif.total && String(notif.total).includes(query)
        if (!matchesCustomer && !matchesId && !matchesTotal) return false
      }

      if (debtorsPeriodFilter === "all") return true

      if (debtorsPeriodFilter === "today") {
        if (!notif.timestamp) return false
        try { return format(parseISO(notif.timestamp), 'yyyy-MM-dd') === todayStr } catch (e) { return false }
      }

      if (debtorsPeriodFilter === "yesterday") {
        if (!notif.timestamp) return false
        const yesterday = new Date(now)
        yesterday.setDate(now.getDate() - 1)
        const yesterdayStr = format(yesterday, 'yyyy-MM-dd')
        try { return format(parseISO(notif.timestamp), 'yyyy-MM-dd') === yesterdayStr } catch (e) { return false }
      }

      if (debtorsPeriodFilter === "active") {
        const period = getPeriodFromTimestamp(notif.timestamp, isMonthMode, notif.week)
        return period.toLowerCase() === (userProfile?.currentWeek || "").toLowerCase()
      }

      const period = getPeriodFromTimestamp(notif.timestamp, isMonthMode, notif.week)
      return period.toLowerCase() === debtorsPeriodFilter.toLowerCase()
    })
  }, [debtorNotifications, debtorsSearch, debtorsPeriodFilter, isMonthMode, userProfile])

  const creditorNotifications = useMemo(() => {
    return allCreditors.filter((c: any) => !c.dismissed)
  }, [allCreditors])

  const filteredCreditors = useMemo(() => {
    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')
    const query = creditorsSearch.trim().toLowerCase()

    return creditorNotifications.filter((c: any) => {
      if (query) {
        const matchesSupplier = c.supplierName && c.supplierName.toLowerCase().includes(query)
        const matchesId = c.id && c.id.toLowerCase().includes(query)
        const matchesProduct = c.productName && c.productName.toLowerCase().includes(query)
        if (!matchesSupplier && !matchesId && !matchesProduct) return false
      }

      if (creditorsPeriodFilter === "all") return true

      if (creditorsPeriodFilter === "today") {
        if (!c.timestamp) return false
        try { return format(parseISO(c.timestamp), 'yyyy-MM-dd') === todayStr } catch (e) { return false }
      }

      if (creditorsPeriodFilter === "yesterday") {
        if (!c.timestamp) return false
        const yesterday = new Date(now)
        yesterday.setDate(now.getDate() - 1)
        const yesterdayStr = format(yesterday, 'yyyy-MM-dd')
        try { return format(parseISO(c.timestamp), 'yyyy-MM-dd') === yesterdayStr } catch (e) { return false }
      }

      const period = getPeriodFromTimestamp(c.timestamp, isMonthMode, c.week)
      return period.toLowerCase() === creditorsPeriodFilter.toLowerCase()
    })
  }, [creditorNotifications, creditorsSearch, creditorsPeriodFilter, isMonthMode])

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

  const allExpiringBatches = useMemo(() => {
    if (!allProducts) return []
    const batches: any[] = []

    allProducts.forEach((p: any) => {
      // Find purchase movements for this product that have an expiryDate and are not dismissed
      const pMovements = allMovements.filter((m: any) => 
        m.productName?.toLowerCase() === p.name?.toLowerCase() &&
        (m.type === 'collection' || m.type === 'purchase') &&
        m.expiryDate &&
        !m.dismissed
      )

      const productBatches: any[] = []

      // 1. Movement batches
      pMovements.forEach((m: any) => {
        productBatches.push({
          id: m.id,
          batchId: m.id,
          movementId: m.id,
          productId: p.id,
          productName: p.name,
          name: p.name,
          category: p.category || 'General',
          expiryDate: m.expiryDate,
          quantity: m.quantity,
          shopStock: p.shopStock || 0,
          warehouseStock: p.warehouseStock || 0,
          buyingPrice: m.buyingPrice || p.buyingPrice || (p.boxBuyingPrice && p.piecesPerBox ? p.boxBuyingPrice / p.piecesPerBox : 0) || 0,
          price: m.sellingPrice || p.price || 0,
          expiryIgnored: !!p.expiryIgnored,
          expiryDismissed: !!p.expiryDismissed,
          timestamp: m.timestamp || p.createdAt,
          supplierName: m.supplierName || 'Supplier Purchase Lot'
        })
      })

      // 2. Initial product-level batch (if product has an expiryDate that is NOT already represented in movements)
      if (p.expiryDate && !p.expiryDismissed) {
        const hasMatchingMovement = pMovements.some((m: any) => m.expiryDate === p.expiryDate)
        if (!hasMatchingMovement) {
          productBatches.push({
            id: `PROD-${p.id}`,
            batchId: `PROD-${p.id}`,
            movementId: null,
            productId: p.id,
            productName: p.name,
            name: p.name,
            category: p.category || 'General',
            expiryDate: p.expiryDate,
            quantity: (p.shopStock || 0) + (p.warehouseStock || 0),
            shopStock: p.shopStock || 0,
            warehouseStock: p.warehouseStock || 0,
            buyingPrice: p.buyingPrice || (p.boxBuyingPrice && p.piecesPerBox ? p.boxBuyingPrice / p.piecesPerBox : 0) || 0,
            price: p.price || 0,
            expiryIgnored: !!p.expiryIgnored,
            expiryDismissed: !!p.expiryDismissed,
            timestamp: p.createdAt || p.expiryDate,
            supplierName: 'Initial Purchase Lot'
          })
        }
      }

      // Sort product batches by expiry date ascending
      productBatches.sort((a: any, b: any) => {
        const dA = safeParseDate(a.expiryDate)?.getTime() || 0
        const dB = safeParseDate(b.expiryDate)?.getTime() || 0
        return dA - dB
      })

      // Assign sequential batch labels (Batch A, Batch B, Batch C...)
      productBatches.forEach((b: any, idx: number) => {
        b.batchLabel = `Batch ${String.fromCharCode(65 + idx)}`
        batches.push(b)
      })
    })

    return batches
  }, [allProducts, allMovements])

  const filteredExpiringProducts = useMemo(() => {
    if (!allExpiringBatches) return []
    const now = new Date()
    const thirtyDaysLater = new Date()
    thirtyDaysLater.setDate(now.getDate() + 30)
    const todayStr = format(now, 'yyyy-MM-dd')
    const query = expiringSearch.trim().toLowerCase()

    return allExpiringBatches.filter((b: any) => {
      const expDate = safeParseDate(b.expiryDate)
      if (!expDate) return false

      // Auto-dismiss ignored notifications after 100 days
      if (b.expiryIgnored) {
        const daysOld = safeDiffDays(expDate, now)
        if (daysOld !== null && Math.abs(daysOld) > 100) return false
      }

      if (expDate > thirtyDaysLater) return false

      // Search filter
      if (query) {
        const matchesName = b.productName && b.productName.toLowerCase().includes(query)
        const matchesCategory = b.category && b.category.toLowerCase().includes(query)
        const matchesBatch = b.batchLabel && b.batchLabel.toLowerCase().includes(query)
        if (!matchesName && !matchesCategory && !matchesBatch) return false
      }

      // Period filter
      if (expiringPeriodFilter === "all") return true

      if (expiringPeriodFilter === "today") {
        return format(expDate, 'yyyy-MM-dd') === todayStr
      }

      if (expiringPeriodFilter === "yesterday") {
        const yesterday = new Date(now)
        yesterday.setDate(now.getDate() - 1)
        const yesterdayStr = format(yesterday, 'yyyy-MM-dd')
        return format(expDate, 'yyyy-MM-dd') === yesterdayStr
      }

      return true
    }).sort((a: any, b: any) => {
      const dA = safeParseDate(a.expiryDate)?.getTime() || 0
      const dB = safeParseDate(b.expiryDate)?.getTime() || 0
      return dA - dB
    })
  }, [allExpiringBatches, expiringSearch, expiringPeriodFilter])

  const filteredReturns = useMemo(() => {
    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')
    const query = returnsSearch.trim().toLowerCase()

    return returnNotifications.filter((r: any) => {
      if (query) {
        const matchesProduct = r.productName && r.productName.toLowerCase().includes(query)
        const matchesId = r.id && r.id.toLowerCase().includes(query)
        const matchesSaleId = r.saleId && r.saleId.toLowerCase().includes(query)
        if (!matchesProduct && !matchesId && !matchesSaleId) return false
      }

      if (returnsPeriodFilter === "all") return true

      if (returnsPeriodFilter === "today") {
        if (!r.timestamp) return false
        try { return format(parseISO(r.timestamp), 'yyyy-MM-dd') === todayStr } catch (e) { return false }
      }

      if (returnsPeriodFilter === "yesterday") {
        if (!r.timestamp) return false
        const yesterday = new Date(now)
        yesterday.setDate(now.getDate() - 1)
        const yesterdayStr = format(yesterday, 'yyyy-MM-dd')
        try { return format(parseISO(r.timestamp), 'yyyy-MM-dd') === yesterdayStr } catch (e) { return false }
      }

      return true
    })
  }, [returnNotifications, returnsSearch, returnsPeriodFilter])

  const handleDismissCreditorNotification = async (creditorId: string) => {
    setAllCreditors(prev => prev.map(c => c.id === creditorId ? { ...c, dismissed: true } : c))
    try {
      const response = await fetch('/api/creditors/dismiss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ creditorId })
      })
      if (response.ok) {
        toast({ title: "Notification Dismissed", description: "Creditor notification dismissed." })
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to dismiss notification." })
    }
  }

  const handleSettleCreditor = async (creditorId: string, amount: number) => {
    try {
      const response = await fetch('/api/creditors/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ creditorId, amount })
      })
      if (response.ok) {
        toast({ title: "Payment Recorded", description: `Paid Shs ${amount.toLocaleString()} towards creditor balance.` })
        fetchData(false)
        window.dispatchEvent(new Event("upshop_data_updated"))
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to record payment." })
    }
  }

  const handleWeekChange = async (newWeek: string) => {
    try {
      const updated = await updateProfile({ currentWeek: newWeek })
      setUserProfile(updated)
      toast({ title: "Week Updated", description: `Switched to ${newWeek}` })
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update week" })
    }
  }

  const handleUpdateAvatar = async (url: string) => {
    try {
      const updated = await updateProfile({ photoUrl: url })
      setUserProfile(updated)
      toast({ title: "Profile Updated", description: "Agent visual identification changed." })
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update avatar" })
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Error", description: "Image size must be less than 5MB" })
      return
    }

    const reader = new FileReader()
    reader.onload = async () => {
      const base64Data = reader.result as string
      try {
        const updated = await updateProfile({ photoUrl: base64Data })
        setUserProfile(updated)
        toast({ title: "Profile Updated", description: "Agent profile picture changed successfully." })
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to update avatar" })
      }
    }
    reader.readAsDataURL(file)
  }

  const renderSalesTrendSlide = () => (
    <div className="flex flex-col h-full justify-between">
      <div>
        <h3 className="text-base font-black text-slate-800">Sales Trend Over Time</h3>
        <p className="text-xs text-muted-foreground mb-4">Cash & Credit sales generated over the current active period.</p>
      </div>
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={salesTrendData}>
            <defs>
              <linearGradient id="colorSalesTrend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1A237E" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#1A237E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontWeight: 800, fontSize: 11, fill: '#64748b' }}
            />
            <YAxis
              tickFormatter={(v) => `Shs ${v >= 1000 ? (v / 1000) + 'k' : v}`}
              width={80}
              axisLine={false}
              tickLine={false}
              tick={{ fontWeight: 800, fontSize: 11, fill: '#64748b' }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '16px',
                border: 'none',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                padding: '12px',
                fontWeight: 800
              }}
              formatter={(v: any) => [`Shs ${v.toLocaleString()}`, 'Total Sales']}
            />
            <Area
              type="monotone"
              dataKey="sales"
              stroke="#1A237E"
              fillOpacity={1}
              fill="url(#colorSalesTrend)"
              strokeWidth={4}
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )

  const periodsList = isMonthMode
    ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    : Array.from({ length: 52 }, (_, i) => `Week ${i + 1}`)

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Activity className="h-10 w-10 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative overflow-hidden bg-primary text-primary-foreground p-10 rounded-[2rem] shadow-2xl border-b-8 border-accent">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <Building2 className="h-64 w-64 rotate-12" />
        </div>

        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            <div className="relative group">
              <div className="h-24 w-24 rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl bg-white/15">
                <img
                  src={userProfile?.photoUrl || "https://picsum.photos/seed/agent/200/200"}
                  alt="Agent"
                  className="h-full w-full object-cover"
                />
              </div>
              <input
                type="file"
                id="avatar-file-input"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <DropdownMenu>
                <DropdownMenuTrigger className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-accent text-accent-foreground border-none p-0 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer shadow-lg focus:outline-none">
                  <Camera className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="font-bold">
                  <DropdownMenuItem onClick={() => document.getElementById('avatar-file-input')?.click()} className="cursor-pointer">
                    Upload from files
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleUpdateAvatar("https://picsum.photos/seed/agent/200/200")} className="cursor-pointer">
                    Use Default Avatar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-accent/20 text-accent font-black text-xs uppercase tracking-[0.2em]">
                Active Terminal
              </div>
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-none">
                {userProfile?.businessName || "UPSHOP Enterprise"}
              </h1>
              <div className="flex flex-wrap items-center gap-6 pt-4 text-primary-foreground/90 font-bold">
                <span className="flex items-center gap-2 bg-white/15 border border-white/10 px-4 py-2 rounded-xl">
                  <MapPin className="h-5 w-5 text-accent" />
                  {userProfile?.location || "No location set"}
                </span>
                <span className="flex items-center gap-2 bg-white/15 border border-white/10 px-4 py-2 rounded-xl">
                  <UserIcon className="h-5 w-5 text-accent" />
                  {user?.role === 'agent' ? 'Agent: ' : 'Admin: '}{userProfile?.fullName || "Not identified"}
                </span>
                <span className="flex items-center gap-2 bg-white/15 border border-white/10 px-4 py-2 rounded-xl font-mono text-xs">
                  <Calendar className="h-5 w-5 text-accent animate-pulse" />
                  📅 {formattedSystemDate} | 🕒 {formattedSystemTime}
                </span>
              </div>
              {userProfile?.motto && (
                <p className="mt-4 text-primary-foreground/80 font-bold italic text-sm bg-white/20 px-4 py-2 rounded-xl w-fit border border-white/15 shadow-sm">
                  “ {userProfile.motto} ”
                </p>
              )}
            </div>
          </div>

          <div className="bg-white/15 p-6 rounded-2xl border border-white/20 shadow-2xl min-w-[240px] shrink-0">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-primary shadow-inner">
                  <Calendar className="h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-black opacity-80 tracking-widest">Operational Period</span>
                  <Select value={activePeriod} onValueChange={handleWeekChange}>
                    <SelectTrigger className="w-[140px] h-8 bg-transparent border-none p-0 focus:ring-0 font-black text-white text-xl">
                      <SelectValue placeholder={isMonthMode ? "Set Month" : "Set Week"} />
                    </SelectTrigger>
                    <SelectContent className="font-bold">
                      {periodsList.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="border-t border-white/10 pt-2 mt-1">
                <span className="text-[9px] uppercase font-black opacity-60 tracking-wider block mb-0.5">System Clock</span>
                <p className="font-mono text-xs font-black text-accent">{formattedSystemDate}</p>
                <p className="font-mono text-[11px] font-bold text-white/90">{formattedSystemTime}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards Section & Store Health Widget (Store Health is Exclusive to Admin Console) */}
      <div className={`grid gap-6 ${isAdmin ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}>
        {isAdmin && (
          <Card className={`border-none shadow-xl hover:shadow-2xl transition-all duration-300 bg-white group border-l-4 ${storeHealthMetrics.borderLeftColor} rounded-2xl p-5 flex flex-col justify-between`}>
            <div>
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-black uppercase text-muted-foreground tracking-widest">Store Health</span>
                <Badge className={`${storeHealthMetrics.badgeColor} text-[10px] font-bold shadow-sm`}>{storeHealthMetrics.badgeText}</Badge>
              </div>
              <div className="flex items-center gap-4 my-2">
                <div className={`relative h-16 w-16 rounded-full border-4 ${storeHealthMetrics.circleColor} flex items-center justify-center font-black text-xl shrink-0 shadow-inner`}>
                  {storeHealthMetrics.percentage}%
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{storeHealthMetrics.statusSummary}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">Real-time admin metrics</p>
                </div>
              </div>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px] font-semibold">
              <div className="flex justify-between"><span className="text-slate-500">Performance</span><span className={`${storeHealthMetrics.performanceColor} font-bold`}>{storeHealthMetrics.performanceText}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Stock Status</span><span className={`${storeHealthMetrics.stockStatusColor} font-bold`}>{storeHealthMetrics.stockStatusText}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Debtors</span><span className={`${storeHealthMetrics.debtorStatusColor} font-bold`}>{storeHealthMetrics.debtorStatusText}</span></div>
            </div>
          </Card>
        )}

        <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 bg-white group border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest">Revenue in Cash</CardTitle>
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary tracking-tighter">
              <span className="text-sm mr-1 text-primary/60">Shs</span>
              {weeklyCashRevenue.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase">Cash Sales & Payments Received</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 bg-white group border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest">Revenue in Credit</CardTitle>
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <CreditCard className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600 tracking-tighter">
              <span className="text-sm mr-1 text-amber-600/60">Shs</span>
              {weeklyCreditRevenue.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase">Income Not Paid Yet</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 bg-white group border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest">Progress Rate</CardTitle>
            <div className="h-10 w-10 rounded-2xl bg-green-500/10 flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-colors">
              <Percent className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-600 tracking-tighter">
              {progressRate}%
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${Math.min(100, progressRate)}%` }} />
              </div>
              <p className="text-[9px] text-green-600 font-bold uppercase whitespace-nowrap">
                of Shs {weeklyTarget.toLocaleString()} {isMonthMode ? 'Monthly' : 'Weekly'} Target
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Graph Carousel */}
      <div className="grid gap-6 md:grid-cols-1">
        <Card 
          className="border-none shadow-xl bg-white overflow-hidden select-none cursor-pointer"
          onClick={handleChartClick}
          title={isChartPaused ? "Click to resume autoplay" : "Click to pause autoplay"}
        >
          <CardHeader className="border-b border-slate-50 bg-slate-50/30 p-8 flex flex-row justify-between items-center">
            <div className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-3 font-black tracking-tight text-primary">
                <TrendingUp className="h-6 w-6" />
                Performance Analytics
              </CardTitle>
              <CardDescription className="text-xs font-semibold text-muted-foreground">
                Showing 7-Day Performance (Current Day & Previous 6 Days).
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {isChartPaused && (
                <Badge className="bg-amber-100 text-amber-800 border-none font-bold text-[10px] animate-pulse">
                  ⏸ Autoplay Paused
                </Badge>
              )}
              <Badge variant="outline" className="font-bold px-3 py-1 border-primary/20 text-primary">
                7-Day Rolling Focus
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="relative w-full overflow-hidden min-h-[340px]">
              <div 
                className={`flex ${isTransitioning ? 'transition-transform duration-700 ease-in-out' : ''}`}
                style={{ transform: `translateX(-${activeChartIndex * 100}%)` }}
              >
                {/* Slide 1: Sales Trend Over Time */}
                <div className="w-full shrink-0 px-2">
                  {renderSalesTrendSlide()}
                </div>

                {/* Slide 2: Top Performing Products */}
                <div className="w-full shrink-0 px-2">
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-800">Top Performing Products</h3>
                      <p className="text-xs text-muted-foreground mb-4">Best products ranked by overall sales revenue in the current period.</p>
                    </div>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topPerformingProducts} layout="vertical" margin={{ left: 20, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                          <XAxis
                            type="number"
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `Shs ${v >= 1000 ? (v / 1000) + 'k' : v}`}
                            tick={{ fontWeight: 800, fontSize: 11, fill: '#64748b' }}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            width={100}
                            tick={{ fontWeight: 800, fontSize: 11, fill: '#64748b' }}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: '16px',
                              border: 'none',
                              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                              padding: '12px',
                              fontWeight: 800
                            }}
                            formatter={(v: any) => [`Shs ${v.toLocaleString()}`, 'Revenue']}
                          />
                          <Bar dataKey="sales" fill="#3B82F6" radius={[0, 8, 8, 0]} maxBarSize={30}>
                            {topPerformingProducts.map((entry, index) => {
                              const colors = ["#1D4ED8", "#2563EB", "#3B82F6", "#60A5FA", "#93C5FD"]
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Slide 3: Sales by Category & Top Customers */}
                <div className="w-full shrink-0 px-2">
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-800">Sales by Category & Top Customers</h3>
                      <p className="text-xs text-muted-foreground mb-4">Category breakdown and highest spending clients of the active period.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-[250px]">
                      {/* Category Pie Chart */}
                      <div className="h-full w-full flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categorySales}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {categorySales.map((entry, index) => {
                                const COLORS = ["#1A237E", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6"]
                                return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              })}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                borderRadius: '16px',
                                border: 'none',
                                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                padding: '10px',
                                fontWeight: 800
                              }}
                              formatter={(v: any, name: any, props: any) => [`Shs ${v.toLocaleString()} (${props.payload.percentage}%)`, name]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute text-center">
                          <span className="text-[10px] uppercase font-black text-slate-400 block tracking-widest">Sales Split</span>
                          <span className="text-xs font-bold text-slate-700">By Category</span>
                        </div>
                      </div>

                      {/* Top Customers Table */}
                      <div className="overflow-hidden border border-slate-100 rounded-2xl bg-slate-50/50 p-4 h-full flex flex-col justify-center">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Name</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Spend</span>
                        </div>
                        <div className="divide-y divide-slate-100/80 overflow-y-auto max-h-[160px] pr-1 mt-1">
                          {topCustomerSales.map((cust, idx) => (
                            <div key={idx} className="flex justify-between items-center py-2 text-xs font-semibold">
                              <span className="text-slate-700 truncate max-w-[150px]" title={cust.name}>{cust.name}</span>
                              <span className="font-mono text-primary font-bold">Shs {cust.total.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 4 (Cloned Slide 1): Sales Trend Over Time */}
                <div className="w-full shrink-0 px-2">
                  {renderSalesTrendSlide()}
                </div>
              </div>
            </div>

            {/* Slider Dots */}
            <div className="flex justify-center gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
              {[0, 1, 2].map((idx) => {
                const isSelected = activeChartIndex === idx || (activeChartIndex === 3 && idx === 0)
                return (
                  <button
                    key={idx}
                    onClick={() => handleDotClick(idx)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${isSelected ? 'w-8 bg-primary' : 'w-2.5 bg-slate-200 hover:bg-slate-300'}`}
                    title={`Go to slide ${idx + 1}`}
                  />
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recently Sold Products categorised by current week days */}
      <Card className="border-none shadow-xl bg-white overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle className="text-lg flex items-center gap-2 text-primary font-black">
            <ShoppingBag className="h-5 w-5 text-accent" />
            Recently Sold Products
          </CardTitle>
          <CardDescription>Items sold during the current active period, grouped by weekdays (most recent first).</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search products, customers, or ID..."
                className="pl-9 h-10 border-slate-200"
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Filter Period:</span>
              <Select value={salesPeriodFilter} onValueChange={setSalesPeriodFilter}>
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
          <div className="flex flex-col gap-6 max-h-[500px] overflow-y-auto pr-2">
            {recentlySoldByDay.map(({ day, items }) => (
              <div key={day} className="space-y-3 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 w-full">
                <h4 className="font-black text-sm text-primary border-b pb-2 flex justify-between">
                  <span>{day}</span>
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-bold text-[10px]">
                    {items.length} {items.length === 1 ? 'sale' : 'sales'}
                  </Badge>
                </h4>
                <div className="divide-y divide-slate-100">
                  {items.map((it: any, idx: number) => (
                    <div 
                      key={idx} 
                      onDoubleClick={() => handleOpenDetails(it, 'sale')}
                      className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm gap-2 first:pt-0 last:pb-0 cursor-pointer select-none hover:bg-slate-100/30 p-2 rounded-xl transition-all duration-200"
                      title="Double click to inspect sale details"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-accent" />
                        <div>
                          <p className="font-bold text-slate-800">{it.productName}</p>
                          <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground font-semibold">
                            <span>Customer: {it.customerName}</span>
                            <span>•</span>
                            <span className="inline-flex items-center px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded">{it.typeName || 'Standard'}</span>
                            <span>•</span>
                            <span 
                              onClick={() => {
                                navigator.clipboard.writeText(it.saleId);
                                toast({ title: "Copied", description: "Transaction ID copied to clipboard." });
                              }}
                              className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs font-bold text-slate-800 hover:bg-slate-200 cursor-pointer flex items-center gap-1 transition-colors"
                              title="Click to copy Transaction ID"
                            >
                              ID: #{it.saleId.slice(0, 8)}
                              <Copy className="h-3 w-3 opacity-60" />
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-left sm:text-right flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-end">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Qty</span>
                          <span className="font-mono font-bold text-slate-700">{it.quantity}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Amount</span>
                          <span className="font-bold text-primary">Shs {it.amount.toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {it.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {recentlySoldByDay.length === 0 && (
              <div className="py-8 text-center text-muted-foreground italic text-sm">
                No products sold in the current active period.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Orders & Holds Section */}
      <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-800/50 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Bookmark className="h-6 w-6 text-amber-500" />
                Pending Orders & Holds
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Orders saved on hold. Approve an order to complete it as a normal transaction or terminate it.
              </CardDescription>
            </div>

            {/* Search Bar & Period Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
              {/* Search Input */}
              <div className="relative w-full sm:w-72">
                <Input
                  type="text"
                  value={ordersSearch}
                  onChange={(e) => setOrdersSearch(e.target.value)}
                  placeholder="Search by customer, Order ID, item..."
                  className="h-10 pl-9 pr-4 text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>

              {/* Period Filter Select */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">PERIOD:</span>
                <Select value={ordersPeriodFilter} onValueChange={setOrdersPeriodFilter}>
                  <SelectTrigger className="w-[180px] h-10 border-slate-200 dark:border-slate-700 font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs rounded-xl">
                    <SelectValue placeholder="Select Period" />
                  </SelectTrigger>
                  <SelectContent className="font-bold">
                    <SelectItem value="all">All Periods</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="active">Active Period</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-2">
            {filteredPendingOrders.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground italic text-sm">
                No pending orders found matching current search or period filter.
              </div>
            ) : (
              filteredPendingOrders.map((ord: any) => {
                const isPending = ord.status === 'pending'
                const isApproved = ord.status === 'approved'
                const isTerminated = ord.status === 'terminated'
                const itemCount = ord.items ? ord.items.length : 0

                return (
                  <div
                    key={ord.id}
                    className={`border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-200 ${
                      isApproved ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-100' :
                      isTerminated ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-100 opacity-75' :
                      'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/60'
                    }`}
                  >
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-xs bg-slate-900 text-amber-400 px-2 py-0.5 rounded shadow-sm">
                          #{ord.id}
                        </span>
                        <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">{ord.customerName || 'Normal Customer'}</h4>
                        {isPending && (
                          <Badge className="bg-amber-500 text-slate-950 font-extrabold text-[10px] uppercase">PENDING</Badge>
                        )}
                        {isApproved && (
                          <Badge className="bg-emerald-600 text-white font-extrabold text-[10px] uppercase">APPROVED & COMPLETED</Badge>
                        )}
                        {isTerminated && (
                          <Badge className="bg-rose-600 text-white font-extrabold text-[10px] uppercase">TERMINATED</Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
                        <span>
                          <strong>Items:</strong> {itemCount > 0 ? ord.items.map((i: any) => `${i.name} (x${i.quantity || 1})`).join(', ') : 'No item list'}
                        </span>
                        <span>•</span>
                        <span>Mode: <strong className="uppercase text-slate-800 dark:text-slate-200">{ord.paymentMethod || 'cash'}</strong></span>
                        <span>•</span>
                        <span>Saved: {ord.timestamp ? format(parseISO(ord.timestamp), 'MMM dd, hh:mm a') : ''}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0 w-full md:w-auto justify-between sm:justify-end">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Value</span>
                        <span className="font-mono font-black text-lg text-blue-700 dark:text-blue-400">Shs {Number(ord.total || 0).toLocaleString()}</span>
                      </div>

                      {isPending && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Button
                            type="button"
                            onClick={() => handleApproveOrder(ord.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold h-9 text-xs px-3 gap-1.5 shadow-sm"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Approve Order
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => handleTerminateOrder(ord.id)}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold h-9 text-xs px-3 gap-1.5 shadow-sm"
                          >
                            <XCircle className="h-4 w-4" />
                            Terminate Order
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Debtors Notifications Section */}
      <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-800/50 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <AlertCircle className="h-6 w-6 text-amber-500" />
                Debtors Notifications ({filteredDebtors.length})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Payment alerts for credit transactions. Paid entries require dismissal.
              </CardDescription>
            </div>

            {/* Search Bar & Period Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
              <div className="relative w-full sm:w-72">
                <Input
                  type="text"
                  value={debtorsSearch}
                  onChange={(e) => setDebtorsSearch(e.target.value)}
                  placeholder="Search by customer, Tx ID, amount..."
                  className="h-10 pl-9 pr-4 text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">PERIOD:</span>
                <Select value={debtorsPeriodFilter} onValueChange={setDebtorsPeriodFilter}>
                  <SelectTrigger className="w-[180px] h-10 border-slate-200 dark:border-slate-700 font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs rounded-xl">
                    <SelectValue placeholder="Select Period" />
                  </SelectTrigger>
                  <SelectContent className="font-bold">
                    <SelectItem value="all">All Periods</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="active">Active Period</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 max-h-[450px] overflow-y-auto pr-2">
            {filteredDebtors.map((notif: any) => {
              const remainingDebt = Math.max(0, (notif.total || 0) - (notif.amountPaid || 0))
              const daysLeft = notif.dueDate ? differenceInDays(new Date(notif.dueDate), new Date()) : null
              const isPaid = notif.status === 'paid'

              return (
                <div
                  key={notif.id}
                  onDoubleClick={() => handleOpenDetails(notif, 'debtor')}
                  className={`border border-slate-100 shadow-sm rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer select-none hover:opacity-90 transition-all duration-200 ${isPaid ? 'bg-green-50/40 border-green-100' : daysLeft !== null && daysLeft < 0 ? 'bg-red-50/40 border-red-100' : 'bg-amber-50/30 border-amber-100'
                    }`}
                  title="Double click to inspect debtor details"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-base text-slate-800">{notif.customerName}</h4>
                      {isPaid ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none font-bold text-[10px]">Fully Paid</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none font-bold text-[10px]">Unpaid</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground font-semibold">
                      <span 
                        onClick={() => {
                          navigator.clipboard.writeText(notif.id);
                          toast({ title: "Copied", description: "Transaction ID copied to clipboard." });
                        }}
                        className="font-mono bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded cursor-pointer flex items-center gap-1 transition-colors text-slate-700"
                        title="Click to copy Transaction ID"
                      >
                        Transaction ID: #{notif.id.slice(0, 8)}
                        <Copy className="h-3 w-3 opacity-60" />
                      </span>
                      <span>Total Amount: Shs {notif.total.toLocaleString()}</span>
                      {notif.dueDate && (
                        <span>Due Date: {format(parseISO(notif.dueDate), "MMM dd, yyyy")}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6 shrink-0 w-full md:w-auto">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Outstanding Balance</span>
                      <span className="font-mono font-black text-lg text-slate-800">Shs {remainingDebt.toLocaleString()}</span>
                    </div>

                    {!isPaid && notif.dueDate && (
                      <div className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white shadow-sm border border-slate-100">
                        {daysLeft !== null && daysLeft < 0 ? (
                          <span className="text-red-600 flex items-center gap-1.5">
                            <AlertCircle className="h-4 w-4" /> Overdue by {Math.abs(daysLeft)} days
                          </span>
                        ) : daysLeft !== null && daysLeft <= 3 ? (
                          <span className="text-amber-600 flex items-center gap-1.5">
                            <AlertCircle className="h-4 w-4" /> Due in {daysLeft} days
                          </span>
                        ) : (
                          <span className="text-green-600 flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" /> Due in {daysLeft} days
                          </span>
                        )}
                      </div>
                    )}

                    {isPaid && (
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDismissNotification(notif.id);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold h-10 px-6 shrink-0 w-full md:w-auto shadow-sm"
                      >
                        Dismiss Notification
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
            {filteredDebtors.length === 0 && (
              <div className="py-8 text-center text-muted-foreground italic text-sm">
                No active debtor notifications matching search or filter.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Creditors Notifications Section */}
      <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-800/50 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Building2 className="h-6 w-6 text-amber-600" />
                Creditors Notifications (Accounts Payable) ({filteredCreditors.length})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Payment alerts for supplier credit purchases. Track upcoming and overdue payout dates.
              </CardDescription>
            </div>

            {/* Search Bar & Period Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
              <div className="relative w-full sm:w-72">
                <Input
                  type="text"
                  value={creditorsSearch}
                  onChange={(e) => setCreditorsSearch(e.target.value)}
                  placeholder="Search supplier, ID, product..."
                  className="h-10 pl-9 pr-4 text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">PERIOD:</span>
                <Select value={creditorsPeriodFilter} onValueChange={setCreditorsPeriodFilter}>
                  <SelectTrigger className="w-[180px] h-10 border-slate-200 dark:border-slate-700 font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs rounded-xl">
                    <SelectValue placeholder="Select Period" />
                  </SelectTrigger>
                  <SelectContent className="font-bold">
                    <SelectItem value="all">All Periods</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="active">Active Period</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 max-h-[450px] overflow-y-auto pr-2">
            {filteredCreditors.map((c: any) => {
              const remainingDebt = c.totalAmount - (c.amountPaid || 0)
              const daysLeft = c.dueDate ? differenceInDays(new Date(c.dueDate), new Date()) : null
              const isSettled = c.status === 'settled' || remainingDebt <= 0

              return (
                <div
                  key={c.id}
                  onDoubleClick={() => handleOpenDetails(c, 'creditor')}
                  className={`border border-slate-100 shadow-sm rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer select-none hover:opacity-90 transition-all duration-200 ${
                    isSettled ? 'bg-green-50/40 border-green-100' : daysLeft !== null && daysLeft < 0 ? 'bg-red-50/40 border-red-100' : 'bg-amber-50/30 border-amber-100'
                  }`}
                  title="Double click to inspect creditor details"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-base text-slate-800">{c.supplierName}</h4>
                      <Badge className={isSettled ? "bg-green-100 text-green-700 font-bold text-[10px]" : "bg-amber-100 text-amber-800 font-bold text-[10px]"}>
                        {isSettled ? "Settled" : "Unpaid Credit"}
                      </Badge>
                      <Badge variant="outline" className="text-slate-500 font-bold text-[10px]">
                        {c.productName} ({c.quantity} {c.unitType || 'units'})
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground font-semibold">
                      <span>Ref ID: #{c.id}</span>
                      <span>Supplier Contact: {c.supplierContact || 'N/A'}</span>
                      {c.dueDate && <span>Due Date: {format(parseISO(c.dueDate), "MMM dd, yyyy")}</span>}
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6 shrink-0 w-full md:w-auto">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Amount Owed</span>
                      <span className="font-mono font-black text-lg text-amber-700">Shs {remainingDebt.toLocaleString()}</span>
                    </div>

                    {!isSettled && c.dueDate && (
                      <div className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white shadow-sm border border-slate-100">
                        {daysLeft !== null && daysLeft < 0 ? (
                          <span className="text-red-600 flex items-center gap-1.5">
                            <AlertCircle className="h-4 w-4" /> Overdue by {Math.abs(daysLeft)} days
                          </span>
                        ) : daysLeft !== null && daysLeft <= 3 ? (
                          <span className="text-amber-600 flex items-center gap-1.5">
                            <AlertCircle className="h-4 w-4" /> Due in {daysLeft} days
                          </span>
                        ) : (
                          <span className="text-green-600 flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" /> Due in {daysLeft} days
                          </span>
                        )}
                      </div>
                    )}

                    {isSettled && (
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDismissCreditorNotification(c.id);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold h-10 px-6 shrink-0 w-full md:w-auto shadow-sm"
                      >
                        Dismiss Notification
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
            {creditorNotifications.length === 0 && (
              <div className="py-8 text-center text-muted-foreground italic text-sm">
                No active creditor notifications.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expiring Products Alerts Section */}
      <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden border-l-4 border-l-rose-500">
        <CardHeader className="border-b bg-rose-50/30 dark:bg-rose-950/20 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-rose-700 dark:text-rose-400">
                <AlertCircle className="h-6 w-6 text-rose-600 animate-pulse" />
                Expiring Products Alerts ({filteredExpiringProducts.length})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Stock items reaching or past their expiration dates requiring immediate attention.
              </CardDescription>
            </div>

            {/* Search Bar & Period Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
              <div className="relative w-full sm:w-72">
                <Input
                  type="text"
                  value={expiringSearch}
                  onChange={(e) => setExpiringSearch(e.target.value)}
                  placeholder="Search product name, category..."
                  className="h-10 pl-9 pr-4 text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">PERIOD:</span>
                <Select value={expiringPeriodFilter} onValueChange={setExpiringPeriodFilter}>
                  <SelectTrigger className="w-[180px] h-10 border-slate-200 dark:border-slate-700 font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs rounded-xl">
                    <SelectValue placeholder="Select Period" />
                  </SelectTrigger>
                  <SelectContent className="font-bold">
                    <SelectItem value="all">All Periods</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="active">Active Period</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 max-h-[450px] overflow-y-auto pr-2">
            {filteredExpiringProducts.map((prod: any) => {
              const daysRemaining = safeDiffDays(prod.expiryDate, new Date())
              const daysToExpire = daysRemaining !== null ? daysRemaining : 0
              const isExpired = daysRemaining !== null && daysRemaining <= 0
              const isIgnored = !!prod.expiryIgnored
              const expParsed = safeParseDate(prod.expiryDate)

              return (
                <div
                  key={prod.id}
                  className={`border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-200 ${
                    isIgnored ? 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200' : 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-100'
                  }`}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">{prod.productName || prod.name}</h4>
                      {prod.batchLabel && (
                        <Badge className="bg-blue-600 text-white font-extrabold text-[11px] px-2 py-0.5 shadow-sm">
                          {prod.batchLabel}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-500">
                        {prod.category || 'General'}
                      </Badge>
                      {isIgnored ? (
                        <Badge className="bg-slate-500 text-white font-bold text-[10px] uppercase">IGNORED</Badge>
                      ) : (
                        <Badge className={isExpired ? "bg-rose-600 text-white font-bold text-[10px] animate-pulse" : "bg-amber-500 text-white font-bold text-[10px]"}>
                          {daysToExpire <= 0 ? `Expired (${Math.abs(daysToExpire)} days ago)` : `${daysToExpire} days remaining`}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
                      <span>Batch Stock: <strong>{prod.quantity || ((prod.warehouseStock || 0) + (prod.shopStock || 0))} units</strong></span>
                      <span>•</span>
                      <span>Expiry Date: <strong className="font-mono">{expParsed ? format(expParsed, "MMM dd, yyyy") : 'N/A'}</strong></span>
                      <span>•</span>
                      <span>Unit Buying Price: <strong>Shs {(prod.buyingPrice || 0).toLocaleString()}</strong></span>
                      {prod.supplierName && (
                        <>
                          <span>•</span>
                          <span>Supplier: <strong>{prod.supplierName}</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 w-full md:w-auto justify-between sm:justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setExpiryDetailsProduct(prod)
                        setExpiryDetailsModalOpen(true)
                      }}
                      className="h-9 px-3 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    >
                      <Activity className="h-4 w-4 mr-1" />
                      See Details
                    </Button>

                    {isIgnored ? (
                      <Button
                        type="button"
                        onClick={() => handleEntirelyDismissIgnored(prod.productId || prod.id, prod.productName || prod.name)}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs h-9 px-4 shadow-sm"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Dismiss
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          onClick={() => openDismissModal(prod)}
                          className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs h-9 px-3 shadow-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Dismiss Stock
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleIgnoreExpiryReminder(prod.productId || prod.id, prod.productName || prod.name)}
                          className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 font-bold text-xs h-9 px-3"
                        >
                          Ignore Reminder
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {filteredExpiringProducts.length === 0 && (
              <div className="py-8 text-center text-muted-foreground italic text-sm">
                No expiring products found matching current search or period filter.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Returns Alerts & Notifications Section */}
      <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-800/50 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <RotateCcw className="h-6 w-6 text-accent animate-spin-slow" style={{ animationDuration: '8s' }} />
                Returns Alerts & Notifications ({filteredReturns.length})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Real-time log of returned items, showing reinstated/discarded stocks and corresponding cash/credit adjustments.
              </CardDescription>
            </div>

            {/* Search Bar & Period Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
              <div className="relative w-full sm:w-72">
                <Input
                  type="text"
                  value={returnsSearch}
                  onChange={(e) => setReturnsSearch(e.target.value)}
                  placeholder="Search product, return ID, sale ID..."
                  className="h-10 pl-9 pr-4 text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">PERIOD:</span>
                <Select value={returnsPeriodFilter} onValueChange={setReturnsPeriodFilter}>
                  <SelectTrigger className="w-[180px] h-10 border-slate-200 dark:border-slate-700 font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs rounded-xl">
                    <SelectValue placeholder="Select Period" />
                  </SelectTrigger>
                  <SelectContent className="font-bold">
                    <SelectItem value="all">All Periods</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="active">Active Period</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 max-h-[450px] overflow-y-auto pr-2">
            {filteredReturns.map((notif: any) => {
              const sale = allSales.find(s => s.id === notif.saleId);
              const method = sale?.paymentMethod || 'cash';
              
              return (
                <div
                  key={notif.id}
                  onDoubleClick={() => handleOpenDetails(notif, 'return')}
                  className="border border-slate-100 shadow-sm rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50 hover:bg-slate-50 cursor-pointer select-none transition-all duration-200"
                  title="Double click to inspect return details"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-base text-slate-800">{notif.productName} (x{notif.quantity})</h4>
                      <Badge className={notif.status === 'reinstated' ? "bg-green-100 text-green-700 hover:bg-green-200 border-none font-bold text-[10px]" : "bg-amber-100 text-amber-700 hover:bg-amber-200 border-none font-bold text-[10px]"}>
                        {notif.status === 'reinstated' ? 'Stock Reinstated' : 'Stock Discarded'}
                      </Badge>
                      <Badge variant="outline" className="font-bold text-[10px] border-slate-200 uppercase">
                        {method} Sale Adjusted
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground font-semibold">
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                        Return ID: #{notif.id}
                      </span>
                      <span>Sale ID: #{notif.saleId.slice(0, 8)}</span>
                      {notif.reason && <span>Reason: {notif.reason}</span>}
                      {notif.timestamp && <span>Date: {format(parseISO(notif.timestamp), "MMM dd, yyyy hh:mm a")}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        {method === 'credit' ? 'Credit Reduced' : 'Cash Refunded'}
                      </span>
                      <span className="font-mono font-black text-lg text-rose-600 dark:text-rose-400">
                        Shs {Math.abs(notif.amount || 0).toLocaleString()}
                      </span>
                    </div>

                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDismissReturnNotification(notif.id);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold h-10 px-6 shrink-0 w-full md:w-auto shadow-sm"
                    >
                      Dismiss Notification
                    </Button>
                  </div>
                </div>
              );
            })}
            {filteredReturns.length === 0 && (
              <div className="py-8 text-center text-muted-foreground italic text-sm">
                No active return alerts or notifications.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dismiss Expired Stock Confirmation Modal */}
      {dismissModalOpen && dismissProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <Card role="dialog" className="w-full max-w-lg border-none shadow-2xl bg-white dark:bg-slate-900 p-6 rounded-2xl">
            <CardHeader className="p-0 pb-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <AlertCircle className="h-6 w-6 text-rose-600" />
                  Dismiss Expired Stock Confirmation
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-1">
                  Review predicted expired quantities and financial loss before recording internal loss.
                </CardDescription>
              </div>
              <button
                onClick={() => setDismissModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>

            <div className="py-5 space-y-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800 flex justify-between items-center">
                <div>
                  <span className="text-xs uppercase font-bold text-rose-800 dark:text-rose-300 block">Product</span>
                  <span className="font-extrabold text-base text-slate-900 dark:text-slate-100">{dismissProduct.name}</span>
                </div>
                <Badge className="bg-rose-600 text-white font-bold text-xs uppercase">
                  EXPIRED
                </Badge>
              </div>

              {/* Editable Fields: Predicted Stock to Dismiss & Remaining Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                    📉 Stock to Dismiss (Units)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={(dismissProduct.shopStock || 0) + (dismissProduct.warehouseStock || 0)}
                    value={dismissQty}
                    onChange={(e) => handleDismissQtyChange(Number(e.target.value))}
                    className="h-10 text-base font-extrabold font-mono border-rose-300 focus-visible:ring-rose-500 bg-white dark:bg-slate-900"
                  />
                  <span className="text-[10px] text-muted-foreground font-semibold">Editable by user</span>
                </div>

                <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                    📊 Remaining Stock After
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={(dismissProduct.shopStock || 0) + (dismissProduct.warehouseStock || 0)}
                    value={dismissRemaining}
                    onChange={(e) => handleDismissRemainingChange(Number(e.target.value))}
                    className="h-10 text-base font-extrabold font-mono border-emerald-300 focus-visible:ring-emerald-500 bg-white dark:bg-slate-900"
                  />
                  <span className="text-[10px] text-muted-foreground font-semibold">Editable by user</span>
                </div>
              </div>

              {/* Financial Loss Calculation */}
              <div className="p-4 rounded-xl bg-rose-600 text-white flex justify-between items-center shadow-md">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider block opacity-90">💰 Calculated Financial Loss</span>
                  <span className="text-[11px] opacity-75 font-mono block">
                    ({dismissQty} units × Shs {(dismissProduct.buyingPrice || (dismissProduct.boxBuyingPrice && dismissProduct.piecesPerBox ? dismissProduct.boxBuyingPrice / dismissProduct.piecesPerBox : 0) || 0).toLocaleString()}/unit)
                  </span>
                </div>
                <span className="font-mono font-black text-2xl text-amber-300">
                  Shs {dismissLoss.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDismissModalOpen(false)}
                className="font-bold text-xs h-10 px-5"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDismissExpired}
                className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs h-10 px-6 gap-2 shadow-lg"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm Stock Dismissal
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Detail Inspector Modal */}
      {detailsModalOpen && detailsModalData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-lg shadow-2xl border-none ring-1 ring-slate-200 bg-white overflow-hidden animate-in zoom-in-95 duration-200">
            <CardHeader className="bg-primary text-primary-foreground p-6">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-black">
                  {detailsModalType === 'sale' && "Sale Transaction Details"}
                  {detailsModalType === 'debtor' && "Debtor Account Details"}
                  {detailsModalType === 'return' && "Return Transaction Details"}
                </CardTitle>
                <button 
                  onClick={() => setDetailsModalOpen(false)}
                  className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white font-bold"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="text-white/70 font-semibold mt-1">
                {detailsModalType === 'sale' && `Transaction ID: #${detailsModalData.saleId}`}
                {detailsModalType === 'debtor' && `Transaction ID: #${detailsModalData.id}`}
                {detailsModalType === 'return' && `Return Reference: #${detailsModalData.id}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6 max-h-[70vh] overflow-y-auto font-body">
              {detailsModalType === 'sale' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 border-b pb-4 text-sm font-semibold">
                    <div>
                      <span className="text-xs text-muted-foreground block uppercase">Customer</span>
                      <span className="text-slate-800 font-bold">{detailsModalData.customerName}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block uppercase">Date & Time</span>
                      <span className="text-slate-800 font-bold">
                        {detailsModalData.timestamp ? format(parseISO(detailsModalData.timestamp), 'MMM dd, yyyy hh:mm a') : detailsModalData.time}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground block uppercase">Payment Method</span>
                      <Badge className="bg-slate-100 text-slate-800 border-none font-bold uppercase">{detailsModalData.paymentMethod}</Badge>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground block uppercase">Payment Status</span>
                      <Badge className={detailsModalData.status === 'paid' ? "bg-green-100 text-green-700 font-bold uppercase" : "bg-red-100 text-red-700 font-bold uppercase"}>
                        {detailsModalData.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-xs uppercase text-slate-400">Items Purchased</h5>
                    <div className="divide-y border rounded-xl overflow-hidden bg-slate-50/50">
                      {detailsModalData.items?.map((item: any, idx: number) => (
                        <div key={idx} className="p-3 flex justify-between items-center text-sm">
                          <div>
                            <p className="font-bold text-slate-800">{item.name}</p>
                            <p className="text-xs text-muted-foreground font-semibold">
                              Shs {item.price.toLocaleString()} x {item.quantity}
                            </p>
                          </div>
                          <span className="font-bold text-slate-800">
                            Shs {(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 font-black text-lg border-t">
                    <span className="text-slate-700">Total Transaction Value</span>
                    <span className="text-primary font-mono">Shs {detailsModalData.amount.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {detailsModalType === 'debtor' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 border-b pb-4 text-sm font-semibold">
                    <div>
                      <span className="text-xs text-muted-foreground block uppercase">Customer/Debtor</span>
                      <span className="text-slate-800 font-bold">{detailsModalData.customerName}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block uppercase">Due Date</span>
                      <span className="text-slate-800 font-bold">
                        {detailsModalData.dueDate ? format(parseISO(detailsModalData.dueDate), 'MMM dd, yyyy') : 'N/A'}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground block uppercase">Payment Status</span>
                      <Badge className={detailsModalData.status === 'paid' ? "bg-green-100 text-green-700 font-bold uppercase" : "bg-red-100 text-red-700 font-bold uppercase"}>
                        {detailsModalData.status}
                      </Badge>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground block uppercase">Date Created</span>
                      <span className="text-slate-800 font-bold">
                        {detailsModalData.timestamp ? format(parseISO(detailsModalData.timestamp), 'MMM dd, yyyy hh:mm a') : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-xs uppercase text-slate-400">Accounts Summary</h5>
                    <div className="bg-slate-50 p-4 rounded-xl space-y-2 border text-sm font-semibold">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Charged Amount</span>
                        <span className="text-slate-800">Shs {detailsModalData.total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Amount Paid</span>
                        <span className="text-green-600">Shs {(detailsModalData.amountPaid || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 font-bold">
                        <span className="text-slate-700">Outstanding Debt</span>
                        <span className="text-red-600 font-mono">Shs {(detailsModalData.total - (detailsModalData.amountPaid || 0)).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-bold text-xs uppercase text-slate-400">Items Purchased on Credit</h5>
                    <div className="divide-y border rounded-xl overflow-hidden bg-slate-50/50">
                      {detailsModalData.items?.map((item: any, idx: number) => (
                        <div key={idx} className="p-3 flex justify-between items-center text-sm">
                          <div>
                            <p className="font-bold text-slate-800">{item.name}</p>
                            <p className="text-xs text-muted-foreground font-semibold">
                              Shs {item.price.toLocaleString()} x {item.quantity}
                            </p>
                          </div>
                          <span className="font-bold text-slate-800">
                            Shs {(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {detailsModalType === 'return' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 border-b pb-4 text-sm font-semibold">
                    <div>
                      <span className="text-xs text-muted-foreground block uppercase">Returned Product</span>
                      <span className="text-slate-800 font-bold">{detailsModalData.productName}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block uppercase">Date of Return</span>
                      <span className="text-slate-800 font-bold">
                        {detailsModalData.timestamp ? format(parseISO(detailsModalData.timestamp), 'MMM dd, yyyy hh:mm a') : 'N/A'}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground block uppercase">Restocking Status</span>
                      <Badge className={detailsModalData.status === 'reinstated' ? "bg-green-100 text-green-700 font-bold uppercase" : "bg-amber-100 text-amber-700 font-bold uppercase"}>
                        {detailsModalData.status}
                      </Badge>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground block uppercase">Customer / Purchaser</span>
                      <span className="text-slate-800 font-bold">
                        {allSales.find(s => s.id === detailsModalData.saleId)?.customerName || "Normal Customer"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border space-y-2 text-sm font-semibold">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Return Quantity</span>
                      <span className="text-slate-800">{detailsModalData.quantity} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Return Unit Price</span>
                      <span className="text-slate-800">Shs {(detailsModalData.amount / detailsModalData.quantity).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold">
                      <span className="text-slate-700">Refund/Adjustment Value</span>
                      <span className="text-red-600 font-mono">Shs {detailsModalData.amount.toLocaleString()}</span>
                    </div>
                  </div>

                  {detailsModalData.reason && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block uppercase">Reason for Return</span>
                      <p className="p-3 bg-red-50 text-red-900 border border-red-100 rounded-xl text-sm italic font-medium">
                        “ {detailsModalData.reason} ”
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <div className="border-t p-4 bg-slate-50 flex justify-end">
              <Button 
                onClick={() => setDetailsModalOpen(false)}
                className="bg-primary hover:bg-primary/95 text-white font-bold h-10 px-6"
              >
                Close Inspector
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Product Expiry & Stock Details Modal */}
      {expiryDetailsModalOpen && expiryDetailsProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-lg shadow-2xl border-none ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900 overflow-hidden rounded-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="bg-rose-700 text-white p-6">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-extrabold flex items-center gap-2">
                  <Activity className="h-6 w-6" />
                  Product Expiry & Stock Details
                </CardTitle>
                <button 
                  onClick={() => setExpiryDetailsModalOpen(false)}
                  className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white font-bold"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="text-rose-100 font-semibold mt-1">
                Detailed purchase history, available stock breakdown, supplier info, and expiry metrics.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <span className="text-xs uppercase font-extrabold text-slate-400">Product Name</span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">{expiryDetailsProduct.name}</h3>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-500 mt-1">
                    Category: {expiryDetailsProduct.category || 'General'}
                  </Badge>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase font-extrabold text-slate-400 block">Expiry Status</span>
                  {(() => {
                    const days = safeDiffDays(expiryDetailsProduct.expiryDate, new Date())
                    const isExp = days !== null && days <= 0
                    if (isExp) {
                      return (
                        <Badge className="bg-rose-600 text-white font-bold text-xs uppercase animate-pulse">
                          EXPIRED ({Math.abs(days)}d ago)
                        </Badge>
                      )
                    }
                    return (
                      <Badge className="bg-amber-500 text-white font-bold text-xs">
                        Expires in {days !== null ? days : 0} days
                      </Badge>
                    )
                  })()}
                </div>
              </div>

              {/* Purchase Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-muted-foreground uppercase font-bold block">📅 Date of Purchase / Entry</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">
                    {(() => {
                      const movement = allMovements.find(m => m.productName?.toLowerCase() === expiryDetailsProduct.name?.toLowerCase())
                      const dateStr = movement?.timestamp || expiryDetailsProduct.createdAt || expiryDetailsProduct.expiryDate
                      try { return format(parseISO(dateStr), "MMM dd, yyyy hh:mm a") } catch (e) { return "N/A" }
                    })()}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-muted-foreground uppercase font-bold block">🏢 Supplier / Partner</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">
                    {(() => {
                      const movement = allMovements.find(m => m.productName?.toLowerCase() === expiryDetailsProduct.name?.toLowerCase())
                      return movement?.supplierName || "General Supplier / Purchase Lot"
                    })()}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-muted-foreground uppercase font-bold block">📦 Total Stock Available</span>
                  <span className="font-black text-base text-slate-900 dark:text-slate-100 font-mono">
                    {(expiryDetailsProduct.shopStock || 0) + (expiryDetailsProduct.warehouseStock || 0)} units
                  </span>
                  <span className="text-[10px] text-slate-500 block font-semibold">
                    (Shop: {expiryDetailsProduct.shopStock || 0} | Warehouse: {expiryDetailsProduct.warehouseStock || 0})
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-muted-foreground uppercase font-bold block">💰 Unit Buying Price</span>
                  <span className="font-black text-base text-slate-900 dark:text-slate-100 font-mono">
                    Shs {(expiryDetailsProduct.buyingPrice || (expiryDetailsProduct.boxBuyingPrice && expiryDetailsProduct.piecesPerBox ? expiryDetailsProduct.boxBuyingPrice / expiryDetailsProduct.piecesPerBox : 0) || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Expiry Date Card */}
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 flex justify-between items-center">
                <div>
                  <span className="text-xs uppercase font-extrabold text-rose-800 dark:text-rose-300 block">System Expiry Date</span>
                  <span className="font-mono font-black text-lg text-slate-900 dark:text-slate-100">
                    {expiryDetailsProduct.expiryDate ? format(parseISO(expiryDetailsProduct.expiryDate), "MMMM dd, yyyy") : 'N/A'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase font-extrabold text-rose-800 dark:text-rose-300 block">Unit Selling Price</span>
                  <span className="font-mono font-black text-lg text-emerald-600 dark:text-emerald-400">
                    Shs {(expiryDetailsProduct.price || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>

            <div className="border-t p-4 bg-slate-50 dark:bg-slate-800 flex justify-end">
              <Button 
                onClick={() => setExpiryDetailsModalOpen(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 px-6 rounded-xl"
              >
                Close Details
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
