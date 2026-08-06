"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ShoppingCart,
  Search,
  Trash2,
  CreditCard,
  Banknote,
  Plus,
  Minus,
  History,
  Tag,
  Sliders,
  Smartphone,
  Info,
  X,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Bookmark
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { cn, getPeriodFromTimestamp } from "@/lib/utils"
import { printThermalReceipt } from "@/lib/print-receipt"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

export default function SalesPage() {
  const { token } = useAuth()
  const { toast } = useToast()

  const [cart, setCart] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [userProfile, setUserProfile] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [salesHistory, setSalesHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  // Card Size Slider state (1: Smallest/Most per row, 5: Largest)
  const [cardSize, setCardSize] = useState(3)

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('cash')
  const [cashSubtype, setCashSubtype] = useState<'hard_cash' | 'mobile_money'>('hard_cash')
  const [customerName, setCustomerName] = useState('Normal Customer')
  const [dueDays, setDueDays] = useState(14)

  // History search, period filter, and details modal
  const [historySearchQuery, setHistorySearchQuery] = useState("")
  const [historyPeriodFilter, setHistoryPeriodFilter] = useState("all")
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<any>(null)

  const isMonthMode = userProfile?.operationPeriodMode === 'months'

  const periodsList = useMemo(() => {
    return isMonthMode
      ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
      : Array.from({ length: 52 }, (_, i) => `Week ${i + 1}`)
  }, [isMonthMode])

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return
      try {
        setLoading(true)
        // Fetch user profile
        const profileResponse = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (profileResponse.ok) {
          const profile = await profileResponse.json()
          setUserProfile(profile)
        }

        // Fetch products
        const productsResponse = await fetch('/api/products', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (productsResponse.ok) {
          const productsData = await productsResponse.json()
          setProducts(productsData)
        }

        // Fetch sales history
        const salesResponse = await fetch('/api/sales', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (salesResponse.ok) {
          const salesData = await salesResponse.json()
          setSalesHistory(salesData)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [token])

  const filteredProducts = useMemo(() => {
    return products.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [products, searchTerm])

  const getCartQuantity = (productId: string) => {
    const item = cart.find(c => c.id === productId)
    if (!item) return 0
    if (item.sellingUnitType === 'boxes') {
      return (Number(item.boxQty) || 0) * (Number(item.pcsPerBox) || 1)
    }
    if (item.sellingUnitType === 'boxes_and_pieces') {
      return ((Number(item.boxQty) || 0) * (Number(item.pcsPerBox) || 1)) + (Number(item.pieceQty) || 0)
    }
    return item.quantity || 0
  }

  const getItemTotal = (item: any) => {
    if (item.sellingUnitType === 'boxes') {
      return (Number(item.boxQty) || 0) * (Number(item.boxSellingPrice) || 0)
    }
    if (item.sellingUnitType === 'boxes_and_pieces') {
      const boxCost = (Number(item.boxQty) || 0) * (Number(item.boxSellingPrice) || 0)
      const pieceCost = (Number(item.pieceQty) || 0) * (Number(item.customPrice) || 0)
      return boxCost + pieceCost
    }
    return (Number(item.quantity) || 0) * (Number(item.customPrice) || 0)
  }

  const addToCart = (product: any) => {
    const existing = cart.find(c => c.id === product.id)
    if (existing) {
      setCart(cart.map(c => c.id === product.id ? { ...c, quantity: c.quantity + 1 } : c))
    } else {
      const pcsPerBox = product.piecesPerBox || 12
      const boxSellingPrice = product.boxSellingPrice || (product.price ? product.price * pcsPerBox : 0)
      setCart([...cart, {
        ...product,
        sellingUnitType: "pieces",
        itemPaymentMode: "inherit", // "inherit" | "cash" | "credit"
        quantity: 1,
        boxQty: 1,
        pieceQty: 0,
        pcsPerBox: pcsPerBox,
        boxSellingPrice: boxSellingPrice,
        customPrice: product.price || 0
      }])
    }
  }

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(c => {
      if (c.id === id) {
        return { ...c, quantity: Math.max(1, c.quantity + delta) }
      }
      return c
    }))
  }

  const updateCustomPrice = (id: string, newPrice: number) => {
    setCart(cart.map(c => c.id === id ? { ...c, customPrice: newPrice } : c))
  }

  const updateCartItemField = (id: string, updates: Partial<any>) => {
    setCart(cart.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  // Calculate effective item payment mode ("cash" or "credit")
  const getEffectiveItemMode = (item: any): "cash" | "credit" => {
    if (item.itemPaymentMode && item.itemPaymentMode !== "inherit") {
      return item.itemPaymentMode
    }
    return paymentMethod === "credit" ? "credit" : "cash"
  }

  const creditItems = useMemo(() => {
    return cart.filter(item => getEffectiveItemMode(item) === "credit")
  }, [cart, paymentMethod])

  const cashItems = useMemo(() => {
    return cart.filter(item => getEffectiveItemMode(item) === "cash")
  }, [cart, paymentMethod])

  const hasAnyCredit = creditItems.length > 0
  const isHybrid = creditItems.length > 0 && cashItems.length > 0

  const creditItemsNotice = useMemo(() => {
    if (!hasAnyCredit) return ""
    if (creditItems.length === cart.length) {
      return "(Notice: All products in cart are selected for Credit Sale)"
    }
    const names = creditItems.map(i => `'${i.name}'`)
    if (names.length === 1) {
      return `Notice: ${names[0]} is selected for Credit Sale`
    }
    const copy = [...names]
    const last = copy.pop()
    return `Notice: ${copy.join(", ")} and ${last} are selected for Credit Sale`
  }, [hasAnyCredit, creditItems, cart.length])

  const total = cart.reduce((sum, item) => sum + getItemTotal(item), 0)

  const totalCreditAmount = useMemo(() => {
    return creditItems.reduce((sum, item) => sum + getItemTotal(item), 0)
  }, [creditItems])

  const totalCashAmount = useMemo(() => {
    return cashItems.reduce((sum, item) => sum + getItemTotal(item), 0)
  }, [cashItems])

  // Card Size Dynamic Grid Min Width
  const minCardWidth = useMemo(() => {
    switch (cardSize) {
      case 1: return 130 // smallest -> fits 6 to 8 items per row
      case 2: return 175 // small -> fits 5 to 6 items per row
      case 3: return 210 // medium -> fits 3 to 4 items per row (default)
      case 4: return 260 // large -> fits 2 to 3 items per row
      case 5: return 320 // xl -> fits 1 to 2 items per row
      default: return 210
    }
  }, [cardSize])

  const scrollToHistory = () => {
    const el = document.getElementById("sales-history-section")
    if (el) {
      el.scrollIntoView({ behavior: "smooth" })
    }
  }

  const handleCheckout = async () => {
    if (cart.length === 0 || !token || !userProfile) return

    // If any item is on credit, customer name must be provided
    if (hasAnyCredit && (!customerName || customerName.trim() === '' || customerName.trim().toLowerCase() === 'normal customer')) {
      toast({
        variant: "destructive",
        title: "Customer Name Required",
        description: "Please enter the debtor / customer full name for items sold on credit."
      })
      return
    }

    // Verify stock availability for all items before completing transaction
    const insufficientItems = cart.filter(item => getCartQuantity(item.id) > item.shopStock)
    if (insufficientItems.length > 0) {
      toast({
        variant: "destructive",
        title: "Stock Insufficient",
        description: "Cannot complete checkout. One or more items exceed available shop stock."
      })
      return
    }

    try {
      const calculatedDueDate = hasAnyCredit
        ? new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString()
        : null

      const effectivePaymentMethod = isHybrid
        ? 'hybrid'
        : (hasAnyCredit ? 'credit' : (cashSubtype === 'mobile_money' ? 'mobile_money' : 'cash'))

      const effectiveStatus = isHybrid
        ? 'hybrid'
        : (hasAnyCredit ? 'unpaid' : 'paid')

      const cartWithItemModes = cart.map(item => ({
        ...item,
        itemPaymentMode: getEffectiveItemMode(item),
        subtotal: getItemTotal(item)
      }))

      // Record sale
      const saleResponse = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          week: userProfile.currentWeek,
          total,
          paymentMethod: effectivePaymentMethod,
          cashSubtype: cashSubtype,
          cashAmount: totalCashAmount,
          creditAmount: totalCreditAmount,
          customerName: customerName.trim(),
          status: effectiveStatus,
          dueDate: calculatedDueDate,
          amountPaid: totalCashAmount,
          items: cartWithItemModes
        })
      })

      const saleData = saleResponse.ok ? await saleResponse.json() : null

      // If credit/hybrid transaction, auto register Creditor liability record
      if (hasAnyCredit) {
        const creditProductSummary = creditItems.map(i => `${i.name} (x${getCartQuantity(i.id)})`).join(', ')
        const totalCreditQty = creditItems.reduce((acc, i) => acc + getCartQuantity(i.id), 0)

        await fetch('/api/creditors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            supplierName: customerName.trim(),
            supplierContact: "",
            productName: creditProductSummary,
            quantity: totalCreditQty,
            unitType: "pieces",
            buyingPrice: 0,
            totalAmount: totalCreditAmount,
            paymentMode: "credit",
            paymentDays: dueDays,
            dueDate: calculatedDueDate
          })
        })
      }

      // Update product stock for each item sold
      for (const item of cart) {
        const requiredPieces = getCartQuantity(item.id)
        const newShopStock = Math.max(0, item.shopStock - requiredPieces)
        await fetch(`/api/products/${item.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            shopStock: newShopStock
          })
        })
      }

      const printingReceipt = userProfile.receiptPrintingEnabled !== undefined ? !!userProfile.receiptPrintingEnabled : true
      const printerMsg = printingReceipt
        ? `Receipt printed via ${userProfile.printerName || 'Thermal Printer'}.`
        : "Receipt printing disabled."

      if (printingReceipt && saleData) {
        printThermalReceipt({
          ...saleData,
          items: cartWithItemModes
        }, userProfile, 'sale')
      }

      const successMsg = isHybrid
        ? `Hybrid Transaction: Cash Shs ${totalCashAmount.toLocaleString()} | Credit Shs ${totalCreditAmount.toLocaleString()}`
        : (hasAnyCredit ? `Credit Sale logged for ${customerName.trim()} (Due in ${dueDays} days)` : `Cash Checkout complete via ${cashSubtype === 'mobile_money' ? 'Mobile Money' : 'Hard Cash'}`)

      toast({
        title: "Checkout Successful",
        description: `${successMsg}. ${printerMsg}`
      })

      setCart([])
      setPaymentMethod('cash')
      setCashSubtype('hard_cash')
      setCustomerName('Normal Customer')
      setDueDays(14)

      // Refresh sales history & products
      const updatedSales = await fetch('/api/sales', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
      setSalesHistory(updatedSales)

      const updatedProducts = await fetch('/api/products', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
      setProducts(updatedProducts)
    } catch (e) {
      console.error('Checkout error:', e)
      toast({ variant: "destructive", title: "Checkout Error", description: "Could not complete transaction." })
    }
  }

  const handleSaveAsOrder = async () => {
    if (cart.length === 0) return
    const hasInsufficient = cart.some(item => getCartQuantity(item.id) > item.shopStock)
    if (hasInsufficient) {
      toast({ variant: "destructive", title: "Cannot Save Order", description: "Cart contains items exceeding available shop stock." })
      return
    }

    try {
      const calculatedDueDate = hasAnyCredit
        ? new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString()
        : null

      const effectivePaymentMethod = isHybrid
        ? 'hybrid'
        : (hasAnyCredit ? 'credit' : (cashSubtype === 'mobile_money' ? 'mobile_money' : 'cash'))

      const cartWithItemModes = cart.map(item => ({
        ...item,
        itemPaymentMode: getEffectiveItemMode(item),
        subtotal: getItemTotal(item)
      }))

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          week: userProfile?.currentWeek || 'Week 1',
          total,
          paymentMethod: effectivePaymentMethod,
          cashSubtype: cashSubtype,
          cashAmount: totalCashAmount,
          creditAmount: totalCreditAmount,
          customerName: customerName.trim() || 'Normal Customer',
          status: 'pending',
          dueDate: calculatedDueDate,
          items: cartWithItemModes
        })
      })

      if (response.ok) {
        toast({
          title: "Order Saved as Pending",
          description: `Order saved for ${customerName.trim() || 'Normal Customer'}. You can approve or terminate it from the Dashboard.`
        })
        setCart([])
        setPaymentMethod('cash')
        setCashSubtype('hard_cash')
        setCustomerName('Normal Customer')
        setDueDays(14)
        window.dispatchEvent(new Event("upshop_data_updated"))
      } else {
        throw new Error('Save order failed')
      }
    } catch (e) {
      console.error('Save order error:', e)
      toast({ variant: "destructive", title: "Error", description: "Could not save pending order." })
    }
  }

  // Filter Sales History
  const filteredSalesHistory = useMemo(() => {
    const query = historySearchQuery.trim().toLowerCase()
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)

    return salesHistory.filter((s: any) => {
      // 1. Search Filter
      if (query) {
        const matchesId = s.id && s.id.toLowerCase().includes(query)
        const matchesCustomer = s.customerName && s.customerName.toLowerCase().includes(query)
        const matchesMode = s.paymentMethod && s.paymentMethod.toLowerCase().includes(query)
        const matchesItem = s.items && s.items.some((i: any) => i.name && i.name.toLowerCase().includes(query))
        if (!matchesId && !matchesCustomer && !matchesMode && !matchesItem) return false
      }

      // 2. Period Filter
      if (historyPeriodFilter === "all") return true

      if (historyPeriodFilter === "today") {
        if (!s.timestamp) return false
        try {
          return new Date(s.timestamp).toISOString().slice(0, 10) === todayStr
        } catch (e) { return false }
      }

      if (historyPeriodFilter === "yesterday") {
        if (!s.timestamp) return false
        const yesterday = new Date(now)
        yesterday.setDate(now.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().slice(0, 10)
        try {
          return new Date(s.timestamp).toISOString().slice(0, 10) === yesterdayStr
        } catch (e) { return false }
      }

      if (historyPeriodFilter === "this_period") {
        const period = getPeriodFromTimestamp(s.timestamp, isMonthMode, s.week)
        return period.toLowerCase() === (userProfile?.currentWeek || "").toLowerCase()
      }

      const period = getPeriodFromTimestamp(s.timestamp, isMonthMode, s.week)
      return period.toLowerCase() === historyPeriodFilter.toLowerCase()
    })
  }, [salesHistory, historySearchQuery, historyPeriodFilter, userProfile, isMonthMode])

  // Reset highlighted index when searching
  useEffect(() => {
    if (filteredProducts.length > 0) {
      setHighlightedIndex(0)
    } else {
      setHighlightedIndex(-1)
    }
  }, [searchTerm, products])

  // Keydown shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      const isInput = activeEl && (
        activeEl.tagName === "INPUT" ||
        activeEl.tagName === "SELECT" ||
        activeEl.tagName === "TEXTAREA"
      )

      if (e.key === "F2") {
        e.preventDefault()
        setPaymentMethod(prev => prev === "cash" ? "credit" : "cash")
        return
      }

      if (e.key === "F4" || (e.ctrlKey && e.key.toLowerCase() === "h")) {
        e.preventDefault()
        const el = document.getElementById("customer-name-input")
        if (el) {
          el.focus()
            ; (el as HTMLInputElement).select()
        }
        return
      }

      if (e.key === "F8" || (e.ctrlKey && e.key === "Enter")) {
        e.preventDefault()
        const hasItems = cart.length > 0
        const hasInsufficient = cart.some(item => getCartQuantity(item.id) > item.shopStock)
        if (hasItems && !hasInsufficient) {
          handleCheckout()
        }
        return
      }

      if (e.key === "Escape") {
        if (selectedSaleForDetails) {
          setSelectedSaleForDetails(null)
          return
        }
        if (!isInput && cart.length > 0) {
          e.preventDefault()
          if (confirm("Are you sure you want to clear the current cart?")) {
            setCart([])
          }
          return
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [cart, selectedSaleForDetails, userProfile, token])

  if (loading) {
    return <div className="flex items-center justify-center h-screen font-bold text-slate-500 animate-pulse">Loading Point of Sale Console...</div>
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Top Header & Search / Card Size Control Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Point of Sale Console</h1>
        </div>

        {/* Toolbar: Search + Card Size Slider */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Product Search Input */}
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              id="product-search-input"
              type="search"
              placeholder="Search products by name or category..."
              className="pl-9 h-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Product Icon Size Slider */}
          <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800 p-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
            <Sliders className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">Icon Size:</span>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={cardSize}
              onChange={(e) => setCardSize(Number(e.target.value))}
              className="w-24 accent-blue-600 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 w-4 text-center">{cardSize}</span>
          </div>
        </div>
      </div>

      {/* Main Grid Section: Products Grid tight to Cart Sidebar */}
      <div className="flex flex-col lg:flex-row items-stretch gap-6">
        {/* Left Section: Product Grid Container */}
        <div className="flex-1 w-full min-w-0 flex flex-col">
          <ScrollArea className="h-[calc(100vh-10rem)] min-h-[720px] max-h-[920px] pr-2 flex-1">
            {filteredProducts.length === 0 ? (
              <div className="p-16 text-center text-muted-foreground italic bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                No products found matching "{searchTerm}".
              </div>
            ) : (
              <div
                className="grid gap-3 transition-all duration-300"
                style={{
                  gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`
                }}
              >
                {filteredProducts.map((item, index) => {
                  const cartQty = getCartQuantity(item.id)
                  const isInsufficient = item.shopStock < cartQty
                  const isOutOfStock = item.shopStock <= 0
                  const isHighlighted = index === highlightedIndex

                  return (
                    <Card
                      key={item.id}
                      id={`product-card-${index}`}
                      className={cn(
                        "group border-none shadow-sm hover:shadow-md cursor-pointer overflow-hidden transition-all relative flex flex-col justify-between bg-white dark:bg-slate-900 rounded-xl",
                        isInsufficient && "ring-2 ring-red-500 bg-red-50/50 dark:bg-red-950/20",
                        isOutOfStock && "opacity-60 grayscale-[30%] border border-red-200",
                        isHighlighted && "ring-2 ring-blue-500 bg-blue-50/20"
                      )}
                      onClick={() => addToCart(item)}
                    >
                      <div>
                        {/* Dynamic Image Container based on Card Size */}
                        <div
                          className="relative w-full overflow-hidden bg-slate-100 dark:bg-slate-800"
                          style={{
                            height: cardSize === 1 ? '90px' : cardSize === 2 ? '115px' : cardSize === 3 ? '140px' : cardSize === 4 ? '170px' : '200px'
                          }}
                        >
                          <Image
                            src={item.imageUrl || "https://picsum.photos/seed/placeholder/400/400"}
                            alt={item.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-1.5 right-1.5">
                            <Badge
                              variant={isOutOfStock || isInsufficient ? "destructive" : "secondary"}
                              className={cn(
                                "font-black shadow-sm text-[10px] px-1.5 py-0.5",
                                isOutOfStock || isInsufficient
                                  ? "bg-red-600 text-white"
                                  : "bg-white/90 backdrop-blur-sm text-slate-800 font-bold"
                              )}
                            >
                              {item.shopStock} in Stock
                            </Badge>
                          </div>
                          {isInsufficient && (
                            <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center pointer-events-none">
                              <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow uppercase">
                                Out of Stock
                              </span>
                            </div>
                          )}
                        </div>

                        <CardContent className={cn("flex flex-col", cardSize === 1 ? "p-2" : "p-3")}>
                          <Badge variant="outline" className="w-fit text-[10px] uppercase font-extrabold tracking-wider text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 py-0.5 px-2 mb-1.5">{item.category}</Badge>
                          <h3 className={cn("font-extrabold text-slate-950 dark:text-slate-50 truncate", cardSize === 1 ? "text-xs" : cardSize === 2 ? "text-sm" : "text-base")}>{item.name}</h3>
                          <p className={cn("font-black text-blue-900 dark:text-blue-300 font-mono mt-1", cardSize === 1 ? "text-xs" : cardSize === 2 ? "text-sm" : "text-lg")}>
                            Shs {item.price.toLocaleString()}
                          </p>
                        </CardContent>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Section: Cart / Checkout Sidebar Container */}
        <Card className="w-full lg:w-[440px] border-none shadow-xl bg-[#17247c] text-white flex flex-col shrink-0 rounded-xl overflow-hidden justify-between">
          <CardHeader className="border-b border-white/10 shrink-0 p-5">
            <CardTitle className="flex items-center justify-between text-lg font-bold">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-amber-400" />
                Current Sale
              </div>
              {cart.length > 0 && (
                <Badge className="bg-amber-500 text-slate-950 font-bold text-xs">
                  {cart.length} item(s)
                </Badge>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0 flex flex-col flex-1">
            <ScrollArea className="h-[540px] px-5">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30 my-20">
                  <ShoppingCart className="h-12 w-12 mb-3" />
                  <p className="text-center font-bold text-sm">Cart is empty</p>
                  <p className="text-center text-xs opacity-70 mt-1">Click products on the left to add items</p>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  {cart.map((item) => {
                    const itemReqStock = getCartQuantity(item.id)
                    const isInsufficient = item.shopStock < itemReqStock
                    const itemSubtotal = getItemTotal(item)

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex flex-col gap-2.5 pb-3 border-b border-white/10 transition-all rounded-lg p-3 bg-white/5",
                          isInsufficient && "bg-red-500/20 ring-1 ring-red-400 border-red-500/30"
                        )}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="relative h-10 w-10 rounded-lg overflow-hidden shrink-0 border border-white/20">
                            <Image
                              src={item.imageUrl || "https://picsum.photos/seed/placeholder/100/100"}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-sm truncate text-white">{item.name}</p>
                              <Badge variant="outline" className="text-[9px] font-bold text-amber-300 border-amber-400/40 bg-amber-500/10 px-1.5 py-0">
                                {item.category}
                              </Badge>
                            </div>
                            {isInsufficient ? (
                              <span className="text-[10px] text-red-300 font-extrabold bg-red-950/60 px-1.5 py-0.5 rounded border border-red-500/40 inline-block uppercase mt-0.5">
                                Exceeds Stock ({itemReqStock} req / {item.shopStock} avail)
                              </span>
                            ) : (
                              <span className="text-[10px] text-white/60 font-semibold">Stock: {item.shopStock} avail</span>
                            )}
                          </div>
                          <button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="text-white/40 hover:text-rose-400 p-1">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* SELLING UNIT AND QUANTITIES Section */}
                        <div className="space-y-2 bg-black/30 p-2.5 rounded-lg border border-white/10">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">SELLING UNIT & QUANTITIES</span>
                            <Select
                              value={item.sellingUnitType || "pieces"}
                              onValueChange={(v) => updateCartItemField(item.id, { sellingUnitType: v })}
                            >
                              <SelectTrigger className="h-6 text-[10px] font-bold w-32 bg-white/10 border-white/20 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="font-bold text-xs">
                                <SelectItem value="pieces">Pieces / Units</SelectItem>
                                <SelectItem value="boxes">Boxes / Cartons</SelectItem>
                                <SelectItem value="boxes_and_pieces">Boxes & Pieces</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Mode 1: Pieces / Units */}
                          {(item.sellingUnitType === "pieces" || !item.sellingUnitType) && (
                            <div className="space-y-2 pt-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-semibold text-white/70">Quantity (Pieces)</span>
                                <div className="flex items-center gap-2">
                                  <button type="button" onClick={() => updateQuantity(item.id, -1)} className="h-6 w-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"><Minus className="h-3 w-3" /></button>
                                  <span className="font-mono font-bold text-sm text-white px-1">{item.quantity}</span>
                                  <button type="button" onClick={() => updateQuantity(item.id, 1)} className="h-6 w-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"><Plus className="h-3 w-3" /></button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-2 pt-1">
                                <span className="text-[10px] uppercase text-white/60 font-semibold">SELLING PRICE:</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-amber-400 font-bold">Shs</span>
                                  <Input
                                    type="number"
                                    value={item.customPrice}
                                    onChange={(e) => updateCustomPrice(item.id, Number(e.target.value))}
                                    className="h-7 bg-white/10 border-white/20 font-mono font-bold text-amber-300 text-xs px-2 text-right w-24"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Mode 2: Boxes / Cartons */}
                          {item.sellingUnitType === "boxes" && (
                            <div className="space-y-2 pt-1">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-[9px] uppercase font-bold text-white/70">Box Count</span>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.boxQty}
                                    onChange={(e) => updateCartItemField(item.id, { boxQty: Number(e.target.value) })}
                                    className="h-7 bg-white/10 border-white/20 font-bold text-white text-xs px-2"
                                  />
                                </div>
                                <div>
                                  <span className="text-[9px] uppercase font-bold text-white/70">Pcs Per Box</span>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.pcsPerBox}
                                    onChange={(e) => updateCartItemField(item.id, { pcsPerBox: Number(e.target.value) })}
                                    className="h-7 bg-white/10 border-white/20 font-bold text-white text-xs px-2"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-2 pt-1">
                                <span className="text-[10px] uppercase text-white/60 font-semibold">Box Selling Price:</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-amber-400 font-bold">Shs</span>
                                  <Input
                                    type="number"
                                    value={item.boxSellingPrice}
                                    onChange={(e) => updateCartItemField(item.id, { boxSellingPrice: Number(e.target.value) })}
                                    className="h-7 bg-white/10 border-white/20 font-mono font-bold text-amber-300 text-xs px-2 text-right w-24"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Mode 3: Boxes & Pieces */}
                          {item.sellingUnitType === "boxes_and_pieces" && (
                            <div className="space-y-2 pt-1">
                              <div className="grid grid-cols-3 gap-1.5">
                                <div>
                                  <span className="text-[9px] uppercase font-bold text-white/70">Boxes</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={item.boxQty}
                                    onChange={(e) => updateCartItemField(item.id, { boxQty: Number(e.target.value) })}
                                    className="h-7 bg-white/10 border-white/20 font-bold text-white text-xs px-1.5"
                                  />
                                </div>
                                <div>
                                  <span className="text-[9px] uppercase font-bold text-white/70">Pcs/Box</span>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.pcsPerBox}
                                    onChange={(e) => updateCartItemField(item.id, { pcsPerBox: Number(e.target.value) })}
                                    className="h-7 bg-white/10 border-white/20 font-bold text-white text-xs px-1.5"
                                  />
                                </div>
                                <div>
                                  <span className="text-[9px] uppercase font-bold text-white/70">Loose Pcs</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={item.pieceQty}
                                    onChange={(e) => updateCartItemField(item.id, { pieceQty: Number(e.target.value) })}
                                    className="h-7 bg-white/10 border-white/20 font-bold text-white text-xs px-1.5"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[10px]">
                                <div>
                                  <span className="text-[9px] text-white/60 font-semibold">Box Price (Shs)</span>
                                  <Input
                                    type="number"
                                    value={item.boxSellingPrice}
                                    onChange={(e) => updateCartItemField(item.id, { boxSellingPrice: Number(e.target.value) })}
                                    className="h-7 bg-white/10 border-white/20 font-bold text-amber-300 text-xs px-2"
                                  />
                                </div>
                                <div>
                                  <span className="text-[9px] text-white/60 font-semibold">Piece Price (Shs)</span>
                                  <Input
                                    type="number"
                                    value={item.customPrice}
                                    onChange={(e) => updateCustomPrice(item.id, Number(e.target.value))}
                                    className="h-7 bg-white/10 border-white/20 font-bold text-amber-300 text-xs px-2"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* OPTIONAL Per-Item Payment Mode Selector */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 mt-1">
                            <span className="text-[10px] uppercase font-bold text-white/60">Item Payment:</span>
                            <Select
                              value={item.itemPaymentMode || "inherit"}
                              onValueChange={(v) => updateCartItemField(item.id, { itemPaymentMode: v })}
                            >
                              <SelectTrigger className="h-6 text-[10px] font-bold w-36 bg-white/10 border-white/20 text-white">
                                <SelectValue placeholder="General Mode" />
                              </SelectTrigger>
                              <SelectContent className="font-bold text-xs">
                                <SelectItem value="inherit">Inherit General Mode</SelectItem>
                                <SelectItem value="cash">Cash / MoMo</SelectItem>
                                <SelectItem value="credit">Credit Sale</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-1 border-t border-white/10">
                          <span className="text-xs font-semibold text-white/70">Item Subtotal:</span>
                          <span className="font-mono font-bold text-amber-400 text-base">Shs {itemSubtotal.toLocaleString()}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>

          {/* Checkout Controls Area */}
          <div className="p-5 bg-white/5 space-y-4 shrink-0 border-t border-white/10">
            {cart.length > 0 && (
              <div className="space-y-3 text-xs">
                {/* General Payment Mode Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-white/60">General Payment Mode</span>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                      className={paymentMethod === 'cash' ? 'bg-amber-500 text-slate-950 font-bold h-9 hover:bg-amber-400' : 'bg-transparent border-white/20 hover:bg-white/10 text-white font-bold h-9'}
                      onClick={() => setPaymentMethod('cash')}
                    >
                      Cash Sale
                    </Button>
                    <Button
                      type="button"
                      variant={paymentMethod === 'credit' ? 'default' : 'outline'}
                      className={paymentMethod === 'credit' ? 'bg-amber-500 text-slate-950 font-bold h-9 hover:bg-amber-400' : 'bg-transparent border-white/20 hover:bg-white/10 text-white font-bold h-9'}
                      onClick={() => setPaymentMethod('credit')}
                    >
                      Credit Sale
                    </Button>
                  </div>
                </div>

                {/* Sub-select for Cash Sale (Hard Cash vs Mobile Money) */}
                {paymentMethod === 'cash' && (
                  <div className="flex items-center justify-between bg-black/20 p-2 rounded-lg border border-white/10 text-xs">
                    <span className="font-bold text-white/70">Cash Option:</span>
                    <Select value={cashSubtype} onValueChange={(v: any) => setCashSubtype(v)}>
                      <SelectTrigger className="h-7 text-xs font-bold w-40 bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="font-bold text-xs">
                        <SelectItem value="hard_cash">💵 Hard Cash</SelectItem>
                        <SelectItem value="mobile_money">📱 Mobile Money</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Hybrid Credit Notice Sentence Prompt */}
                {hasAnyCredit && creditItemsNotice && (
                  <div className="p-2.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold animate-in fade-in flex items-start gap-2">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{creditItemsNotice}</span>
                  </div>
                )}

                {/* Customer Name Input */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-white/60">Customer Name</span>
                  <Input
                    id="customer-name-input"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="h-9 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-amber-400 font-semibold"
                  />
                </div>

                {/* Payment Due Days Prompt (shown if any credit item exists or mode is Credit) */}
                {hasAnyCredit && (
                  <div className="flex flex-col gap-1.5 p-2.5 bg-black/30 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-amber-300">Credit Payment Terms</span>
                      <span className="text-[10px] font-mono text-white/80">
                        Due: {new Date(Date.now() + (Number(dueDays || 0) * 86400000)).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        id="due-days-input"
                        type="number"
                        min={1}
                        value={dueDays}
                        onChange={(e) => setDueDays(Number(e.target.value))}
                        className="h-8 bg-white/10 border-white/20 text-white font-bold w-24 text-xs"
                      />
                      <span className="text-white/80 text-xs font-semibold">Days from today</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {cart.some(item => getCartQuantity(item.id) > item.shopStock) && (
              <div className="bg-red-500/20 text-red-200 text-xs font-bold p-2.5 rounded-lg border border-red-500/30 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping shrink-0" />
                <span>Some items exceed available shop stock.</span>
              </div>
            )}

            {/* Total Due Section */}
            <div className="flex justify-between items-center border-t border-white/10 pt-3">
              <span className="text-lg font-bold">Total Due</span>
              <span className="text-2xl font-black text-amber-400 font-mono">Shs {total.toLocaleString()}</span>
            </div>

            {/* Complete Checkout Button */}
            <Button
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black h-12 text-base shadow-lg transition-transform"
              onClick={() => handleCheckout()}
              disabled={cart.length === 0 || cart.some(item => getCartQuantity(item.id) > item.shopStock)}
            >
              {isHybrid ? (
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" /> Complete Hybrid Checkout
                </div>
              ) : hasAnyCredit ? (
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" /> Complete Credit Checkout
                </div>
              ) : cashSubtype === 'mobile_money' ? (
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" /> Complete Mobile Money Checkout
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Banknote className="h-5 w-5" /> Complete Cash Checkout
                </div>
              )}
            </Button>

            {/* Save as Order Button */}
            <Button
              type="button"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black h-11 text-sm shadow-md transition-transform flex items-center justify-center gap-2"
              onClick={handleSaveAsOrder}
              disabled={cart.length === 0 || cart.some(item => getCartQuantity(item.id) > item.shopStock)}
            >
              <Bookmark className="h-4 w-4 text-amber-300" />
              Save as Order
            </Button>

            {/* Button to Smooth-Scroll to Sales History below */}
            <Button
              type="button"
              variant="outline"
              onClick={scrollToHistory}
              className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold h-9 text-xs gap-2"
            >
              <History className="h-4 w-4 text-amber-400" />
              Scroll to Sales History
            </Button>
          </div>
        </Card>
      </div>
      {/* Section 2: Interactive Sales History Table at the Bottom */}
      <Card id="sales-history-section" className="border-none shadow-md overflow-hidden bg-white dark:bg-slate-900 mt-8">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <History className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                Sales History & Transactions Log
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Double-click any transaction row to view detailed item breakdown
              </CardDescription>
            </div>

            {/* Search Bar & Period Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
              {/* Search Input */}
              <div className="relative w-full sm:w-72">
                <Input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Search by customer, Tx ID, item..."
                  className="h-10 pl-9 pr-4 text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>

              {/* Period Filter Select */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">PERIOD:</span>
                <Select value={historyPeriodFilter} onValueChange={setHistoryPeriodFilter}>
                  <SelectTrigger className="w-[180px] h-10 border-slate-200 dark:border-slate-700 font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs rounded-xl">
                    <SelectValue placeholder="Select Period" />
                  </SelectTrigger>
                  <SelectContent className="font-bold">
                    <SelectItem value="all">All Periods</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="this_period">Current {isMonthMode ? 'Month' : 'Week'}</SelectItem>
                    {periodsList.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-slate-50 dark:bg-slate-800/50">
                <TableHead className="w-[180px]">Tx ID / Time</TableHead>
                <TableHead className="w-[160px]">Customer Name</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead>Items Summary</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSalesHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground italic text-sm">
                    No transaction records found matching selected search or period filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSalesHistory.map((s: any) => {
                  const isCredit = s.paymentMethod === 'credit'
                  const isMoMo = s.paymentMethod === 'mobile_money' || s.cashSubtype === 'mobile_money'
                  const isHybridTx = s.paymentMethod === 'hybrid'
                  const itemCount = s.items ? s.items.length : 0

                  return (
                    <TableRow
                      key={s.id}
                      onDoubleClick={() => setSelectedSaleForDetails(s)}
                      className="hover:bg-blue-50/50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <TableCell>
                        <div className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                          #{s.id ? s.id.slice(0, 8) : 'RECORD'}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                          {s.timestamp ? new Date(s.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </TableCell>

                      <TableCell className="font-semibold text-slate-800 dark:text-slate-200">
                        {s.customerName || 'Normal Customer'}
                      </TableCell>

                      <TableCell>
                        {isHybridTx ? (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-extrabold text-[10px] uppercase">
                            HYBRID (CASH+CREDIT)
                          </Badge>
                        ) : isCredit ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-extrabold text-[10px] uppercase">
                            CREDIT SALE
                          </Badge>
                        ) : isMoMo ? (
                          <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-extrabold text-[10px] uppercase">
                            MOBILE MONEY
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold text-[10px] uppercase">
                            HARD CASH
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        {itemCount > 0 ? (
                          <span className="truncate max-w-xs block">
                            <strong>{itemCount} item(s):</strong> {s.items.map((i: any) => i.name).join(', ')}
                          </span>
                        ) : (
                          <span className="italic text-slate-400">Sale recorded</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right font-mono font-bold text-blue-700 dark:text-blue-400">
                        Shs {Number(s.total || 0).toLocaleString()}
                      </TableCell>

                      <TableCell className="text-center">
                        {s.status === 'paid' ? (
                          <Badge className="bg-emerald-600 text-white font-bold text-[10px]">PAID</Badge>
                        ) : s.status === 'hybrid' ? (
                          <Badge className="bg-blue-600 text-white font-bold text-[10px]">HYBRID</Badge>
                        ) : (
                          <Badge className="bg-amber-600 text-white font-bold text-[10px]">UNPAID (CREDIT)</Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedSaleForDetails(s)
                          }}
                          className="h-8 px-2.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transaction Details Modal (Opened via Double Click or View Details Button) */}
      {selectedSaleForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card role="dialog" className="w-full max-w-2xl border-none shadow-2xl bg-white dark:bg-slate-900 p-6 rounded-xl">
            <CardHeader className="p-0 pb-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                  Transaction Breakdown - #{selectedSaleForDetails.id ? selectedSaleForDetails.id.slice(0, 8) : 'RECORD'}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-1">
                  {selectedSaleForDetails.timestamp ? new Date(selectedSaleForDetails.timestamp).toLocaleString([], { dateStyle: 'full', timeStyle: 'medium' }) : ''}
                </CardDescription>
              </div>
              <button
                onClick={() => setSelectedSaleForDetails(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>

            <div className="py-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Meta Information Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer</span>
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{selectedSaleForDetails.customerName || 'Normal Customer'}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Mode</span>
                  <span className="font-bold text-sm text-blue-600 dark:text-blue-400 uppercase">
                    {selectedSaleForDetails.paymentMethod === 'hybrid' ? 'HYBRID (CASH + CREDIT)' :
                      selectedSaleForDetails.paymentMethod === 'credit' ? 'CREDIT SALE' :
                        selectedSaleForDetails.cashSubtype === 'mobile_money' ? 'MOBILE MONEY' : 'HARD CASH'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Tracking Period</span>
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{selectedSaleForDetails.week || 'Active Period'}</span>
                </div>
              </div>

              {/* Hybrid Breakdown (If applicable) */}
              {selectedSaleForDetails.paymentMethod === 'hybrid' && (
                <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex justify-between items-center text-xs font-bold">
                  <div className="text-blue-900 dark:text-blue-200">
                    Cash Paid: <span className="font-mono text-sm">Shs {(selectedSaleForDetails.cashAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="text-amber-700 dark:text-amber-300">
                    Credit Outstanding: <span className="font-mono text-sm">Shs {(selectedSaleForDetails.creditAmount || 0).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Products Table */}
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-slate-500">Products Included in Transaction</Label>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-800">
                        <TableHead className="text-xs font-bold">Product Name</TableHead>
                        <TableHead className="text-xs font-bold text-center">Unit / Qty</TableHead>
                        <TableHead className="text-xs font-bold text-right">Unit Price</TableHead>
                        <TableHead className="text-xs font-bold text-right">Subtotal</TableHead>
                        <TableHead className="text-xs font-bold text-center">Item Payment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!selectedSaleForDetails.items || selectedSaleForDetails.items.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-slate-400 text-xs italic">
                            No detailed item list available for this logged sale.
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedSaleForDetails.items.map((item: any, idx: number) => (
                          <TableRow key={idx} className="hover:bg-transparent">
                            <TableCell className="font-bold text-xs text-slate-800 dark:text-slate-200">{item.name}</TableCell>
                            <TableCell className="text-center font-mono text-xs font-semibold">{item.quantity} {item.sellingUnitType || 'pcs'}</TableCell>
                            <TableCell className="text-right font-mono text-xs">Shs {Number(item.price || item.customPrice || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right font-mono font-bold text-xs text-blue-700 dark:text-blue-400">
                              Shs {Number(item.subtotal || ((item.price || item.customPrice || 0) * item.quantity)).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-[9px] font-extrabold uppercase">
                                {item.itemPaymentMode === 'credit' ? 'CREDIT' : 'CASH'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Total Summary */}
              <div className="flex justify-between items-center p-4 rounded-xl bg-slate-900 text-white">
                <span className="font-bold text-sm">Total Transaction Value</span>
                <span className="font-mono font-black text-xl text-amber-400">Shs {Number(selectedSaleForDetails.total || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between items-center border-t pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (userProfile && selectedSaleForDetails) {
                    printThermalReceipt(selectedSaleForDetails, userProfile, 'sale')
                    toast({ title: "Receipt Sent", description: "Re-printed transaction receipt." })
                  }
                }}
                className="h-10 text-xs font-bold border-slate-200"
              >
                Re-Print Receipt
              </Button>
              <Button
                onClick={() => setSelectedSaleForDetails(null)}
                className="h-10 bg-slate-900 text-white font-bold text-xs px-6"
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
