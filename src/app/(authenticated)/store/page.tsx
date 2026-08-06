
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowRightLeft, 
  PackageCheck, 
  Truck, 
  PlusCircle,
  Image as ImageIcon,
  Upload,
  X,
  Search,
  Check,
  Building2,
  Store,
  ChevronDown,
  Calculator,
  Tag,
  ArrowRight
} from "lucide-react"
import { format, parseISO } from "date-fns"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn, getPeriodFromTimestamp } from "@/lib/utils"

const COMMON_CATEGORIES = [
  "General",
  "Electronics",
  "Accessories",
  "Food & Beverages",
  "Clothing",
  "Hardware",
  "Stationery",
  "Beauty & Care"
]

export default function StoreManagementPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [userProfile, setUserProfile] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Transfer state
  const [transferDirection, setTransferDirection] = useState<'whse-to-shop' | 'shop-to-whse'>('whse-to-shop')
  const [selectedProduct, setSelectedProduct] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [transferAmount, setTransferAmount] = useState("")
  const [transferUnitType, setTransferUnitType] = useState<"pieces" | "boxes" | "boxes_and_pieces">("pieces")
  const [transferBoxQty, setTransferBoxQty] = useState("")
  const [transferPcsPerBox, setTransferPcsPerBox] = useState("12")
  const [transferLoosePcs, setTransferLoosePcs] = useState("0")
  const [transferredBy, setTransferredBy] = useState("")

  // Received products / intake state
  const [partners, setPartners] = useState<any[]>([])
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false)
  const [isIntakeDropdownOpen, setIsIntakeDropdownOpen] = useState(false)
  const [intakeData, setIntakeData] = useState({ 
    productName: "", 
    buyingPrice: "",
    price: "", // Selling price
    boxBuyingPrice: "",
    boxSellingPrice: "",
    unitType: "pieces", // "pieces" | "boxes" | "kgs" | "litres"
    qty: "", 
    boxQty: "",
    piecesPerBox: "12",
    extraPieces: "0",
    paymentMode: "cash", // "cash" | "mobile_money" | "credit"
    mobileMoneyContact: "",
    paymentDays: "14",
    supplierName: "",
    supplierContact: "",
    expiryDate: "",
    destination: "warehouse", 
    category: "General", 
    imageUrl: "",
    receivedBy: ""
  })

  // History search queries & period filters
  const [historySearchQuery, setHistorySearchQuery] = useState("")
  const [historyPeriodFilter, setHistoryPeriodFilter] = useState("today")
  const [purchaseSearchQuery, setPurchaseSearchQuery] = useState("")
  const [purchasePeriodFilter, setPurchasePeriodFilter] = useState("today")
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!token) {
      router.push('/login')
    }
  }, [token, router])

  // Fetch data
  useEffect(() => {
    if (!token) return

    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch user profile
        const profileResponse = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (profileResponse.ok) {
          const profile = await profileResponse.json()
          setUserProfile(profile)
          if (profile?.fullName) {
            setTransferredBy(prev => prev || profile.fullName)
            setIntakeData(prev => ({ ...prev, receivedBy: prev.receivedBy || profile.fullName }))
          }
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

        // Fetch partners
        const partnersResponse = await fetch('/api/partners', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (partnersResponse.ok) {
          setPartners(await partnersResponse.json())
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [token])

  const selectedProductObj = useMemo(() => {
    return products.find(p => p.id === selectedProduct)
  }, [products, selectedProduct])

  const filteredTransferProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return products.filter(p => 
      p.name.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q))
    )
  }, [products, searchQuery])

  const filteredIntakeProducts = useMemo(() => {
    if (!intakeData.productName.trim()) return []
    const q = intakeData.productName.toLowerCase().trim()
    return products.filter(p => 
      p.name.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q))
    )
  }, [products, intakeData.productName])

  const filteredSupplierPartners = useMemo(() => {
    if (!intakeData.supplierName.trim()) return partners
    return partners.filter(p => 
      p.name.toLowerCase().includes(intakeData.supplierName.toLowerCase()) ||
      (p.contactPerson && p.contactPerson.toLowerCase().includes(intakeData.supplierName.toLowerCase()))
    )
  }, [partners, intakeData.supplierName])

  const availableCategories = useMemo(() => {
    const customCats = products.map(p => p.category).filter(Boolean)
    const combined = Array.from(new Set([...COMMON_CATEGORIES, ...customCats]))
    if (!intakeData.category) return combined
    return combined.filter(c => c.toLowerCase().includes(intakeData.category.toLowerCase()))
  }, [products, intakeData.category])

  const periodsList = useMemo(() => {
    const isMonthMode = userProfile?.operationPeriodMode === 'months'
    return isMonthMode
      ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
      : Array.from({ length: 52 }, (_, i) => `Week ${i + 1}`)
  }, [userProfile?.operationPeriodMode])

  // Transfer History Movements (Transfers only: type === 'transfer')
  const filteredTransferMovements = useMemo(() => {
    const query = historySearchQuery.trim().toLowerCase()
    const isMonthMode = userProfile?.operationPeriodMode === 'months'
    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')

    const transferOnly = movements.filter(m => m.type === 'transfer')

    return transferOnly.filter(m => {
      // 1. Search filter
      if (query) {
        const matchesSearch = 
          (m.productName && m.productName.toLowerCase().includes(query)) ||
          (m.destination && m.destination.toLowerCase().includes(query)) ||
          (m.transferredBy && m.transferredBy.toLowerCase().includes(query))
        if (!matchesSearch) return false
      }

      // 2. Period filter
      if (historyPeriodFilter === "all") return true

      if (historyPeriodFilter === "today") {
        if (!m.timestamp) return false
        try {
          return format(parseISO(m.timestamp), 'yyyy-MM-dd') === todayStr
        } catch (e) {
          return false
        }
      }

      if (historyPeriodFilter === "yesterday") {
        if (!m.timestamp) return false
        const yesterday = new Date(now)
        yesterday.setDate(now.getDate() - 1)
        const yesterdayStr = format(yesterday, 'yyyy-MM-dd')
        try {
          return format(parseISO(m.timestamp), 'yyyy-MM-dd') === yesterdayStr
        } catch (e) {
          return false
        }
      }

      if (historyPeriodFilter === "last_week") {
        const lastWeekDate = new Date(now)
        lastWeekDate.setDate(now.getDate() - 7)
        const firstDayOfYear = new Date(lastWeekDate.getFullYear(), 0, 1)
        const pastDays = (lastWeekDate.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000)
        const weekNum = Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7)
        const lastWeekLabel = `Week ${Math.min(52, Math.max(1, weekNum))}`
        const period = getPeriodFromTimestamp(m.timestamp, false, m.week)
        return period.toLowerCase() === lastWeekLabel.toLowerCase()
      }

      if (historyPeriodFilter === "last_month") {
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        const lastMonthIdx = (now.getMonth() - 1 + 12) % 12
        const lastMonthLabel = months[lastMonthIdx]
        const period = getPeriodFromTimestamp(m.timestamp, true, m.week)
        return period.toLowerCase() === lastMonthLabel.toLowerCase()
      }

      const period = getPeriodFromTimestamp(m.timestamp, isMonthMode, m.week)
      return period.toLowerCase() === historyPeriodFilter.toLowerCase()
    })
  }, [movements, historySearchQuery, historyPeriodFilter, userProfile])

  // Received Products & Purchases History Movements (Intakes/Purchases: type !== 'transfer')
  const filteredPurchaseMovements = useMemo(() => {
    const query = purchaseSearchQuery.trim().toLowerCase()
    const isMonthMode = userProfile?.operationPeriodMode === 'months'
    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')

    const purchaseOnly = movements.filter(m => m.type !== 'transfer')

    return purchaseOnly.filter(m => {
      // 1. Search filter
      if (query) {
        const matchesSearch = 
          (m.productName && m.productName.toLowerCase().includes(query)) ||
          (m.supplierName && m.supplierName.toLowerCase().includes(query)) ||
          (m.destination && m.destination.toLowerCase().includes(query)) ||
          (m.paymentMode && m.paymentMode.toLowerCase().includes(query)) ||
          (m.receivedBy && m.receivedBy.toLowerCase().includes(query))
        if (!matchesSearch) return false
      }

      // 2. Period filter
      if (purchasePeriodFilter === "all") return true

      if (purchasePeriodFilter === "today") {
        if (!m.timestamp) return false
        try {
          return format(parseISO(m.timestamp), 'yyyy-MM-dd') === todayStr
        } catch (e) {
          return false
        }
      }

      if (purchasePeriodFilter === "yesterday") {
        if (!m.timestamp) return false
        const yesterday = new Date(now)
        yesterday.setDate(now.getDate() - 1)
        const yesterdayStr = format(yesterday, 'yyyy-MM-dd')
        try {
          return format(parseISO(m.timestamp), 'yyyy-MM-dd') === yesterdayStr
        } catch (e) {
          return false
        }
      }

      if (purchasePeriodFilter === "last_week") {
        const lastWeekDate = new Date(now)
        lastWeekDate.setDate(now.getDate() - 7)
        const firstDayOfYear = new Date(lastWeekDate.getFullYear(), 0, 1)
        const pastDays = (lastWeekDate.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000)
        const weekNum = Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7)
        const lastWeekLabel = `Week ${Math.min(52, Math.max(1, weekNum))}`
        const period = getPeriodFromTimestamp(m.timestamp, false, m.week)
        return period.toLowerCase() === lastWeekLabel.toLowerCase()
      }

      if (purchasePeriodFilter === "last_month") {
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        const lastMonthIdx = (now.getMonth() - 1 + 12) % 12
        const lastMonthLabel = months[lastMonthIdx]
        const period = getPeriodFromTimestamp(m.timestamp, true, m.week)
        return period.toLowerCase() === lastMonthLabel.toLowerCase()
      }

      const period = getPeriodFromTimestamp(m.timestamp, isMonthMode, m.week)
      return period.toLowerCase() === purchasePeriodFilter.toLowerCase()
    })
  }, [movements, purchaseSearchQuery, purchasePeriodFilter, userProfile])

  // Total items quantity calculation based on unitType
  const computedTotalUnits = useMemo(() => {
    if (intakeData.unitType === "boxes") {
      const boxes = Number(intakeData.boxQty) || 0
      const multiplier = Number(intakeData.piecesPerBox) || 1
      return boxes * multiplier
    }
    if (intakeData.unitType === "boxes_and_pieces") {
      const boxes = Number(intakeData.boxQty) || 0
      const multiplier = Number(intakeData.piecesPerBox) || 1
      const extra = Number(intakeData.extraPieces) || 0
      return (boxes * multiplier) + extra
    }
    return Number(intakeData.qty) || 0
  }, [intakeData.unitType, intakeData.qty, intakeData.boxQty, intakeData.piecesPerBox, intakeData.extraPieces])

  // Total purchase cost based on unitType & prices
  const totalIntakeCost = useMemo(() => {
    const boxQty = Number(intakeData.boxQty) || 0
    const pcsPerBox = Number(intakeData.piecesPerBox) || 1
    let pieceBuying = Number(intakeData.buyingPrice) || Number(intakeData.price) || 0
    let boxBuying = Number(intakeData.boxBuyingPrice) || 0
    const extraPcs = Number(intakeData.extraPieces) || 0

    if (boxBuying > 0 && pieceBuying === 0) {
      pieceBuying = Math.round(boxBuying / pcsPerBox)
    } else if (pieceBuying > 0 && boxBuying === 0) {
      boxBuying = pieceBuying * pcsPerBox
    }

    if (intakeData.unitType === "boxes_and_pieces") {
      const totalBoxCost = boxQty * boxBuying
      const totalPieceCost = extraPcs * pieceBuying
      return totalBoxCost + totalPieceCost
    }
    if (intakeData.unitType === "boxes") {
      const totalBoxCost = boxQty * boxBuying
      return totalBoxCost > 0 ? totalBoxCost : pieceBuying * computedTotalUnits
    }
    return pieceBuying * computedTotalUnits
  }, [intakeData.unitType, intakeData.boxQty, intakeData.boxBuyingPrice, intakeData.extraPieces, intakeData.buyingPrice, intakeData.price, intakeData.piecesPerBox, computedTotalUnits])

  // Computed total transfer units based on transferUnitType
  const computedTransferTotalUnits = useMemo(() => {
    if (transferUnitType === "boxes") {
      const boxes = Number(transferBoxQty) || 0
      const multiplier = Number(transferPcsPerBox) || 1
      return boxes * multiplier
    }
    if (transferUnitType === "boxes_and_pieces") {
      const boxes = Number(transferBoxQty) || 0
      const multiplier = Number(transferPcsPerBox) || 1
      const loose = Number(transferLoosePcs) || 0
      return (boxes * multiplier) + loose
    }
    return Number(transferAmount) || 0
  }, [transferUnitType, transferAmount, transferBoxQty, transferPcsPerBox, transferLoosePcs])

  const handleTransfer = async () => {
    if (!selectedProduct || computedTransferTotalUnits <= 0 || !token || !userProfile) return
    const product = products.find(p => p.id === selectedProduct)
    if (!product) return

    const qty = computedTransferTotalUnits

    const availableStock = transferDirection === 'whse-to-shop' ? product.warehouseStock : product.shopStock
    if (availableStock < qty) {
      const locationName = transferDirection === 'whse-to-shop' ? 'Warehouse' : 'Shop Floor'
      toast({ variant: "destructive", title: "Insufficient Stock", description: `${locationName} only has ${availableStock} items, but ${qty} item(s) requested.` })
      return
    }

    const targetDestination = transferDirection === 'whse-to-shop' ? 'shop' : 'warehouse'
    const newWhseStock = transferDirection === 'whse-to-shop' ? product.warehouseStock - qty : product.warehouseStock + qty
    const newShopStock = transferDirection === 'whse-to-shop' ? product.shopStock + qty : product.shopStock - qty

    try {
      // Create movement
      await fetch('/api/movements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productName: product.name,
          quantity: qty,
          type: "transfer",
          destination: targetDestination,
          week: userProfile.currentWeek,
          transferredBy: transferredBy.trim() || userProfile?.fullName || 'System'
        })
      })

      // Update product stocks
      await fetch(`/api/products/${selectedProduct}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          warehouseStock: newWhseStock,
          shopStock: newShopStock
        })
      })

      // Refresh data
      const updatedProducts = await fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json())
      setProducts(updatedProducts)

      const updatedMovements = await fetch('/api/movements', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json())
      setMovements(updatedMovements)

      const fromLabel = transferDirection === 'whse-to-shop' ? 'Warehouse' : 'Shop Floor'
      const toLabel = transferDirection === 'whse-to-shop' ? 'Shop Floor' : 'Warehouse'
      toast({ title: "Transfer Successful", description: `Moved ${qty} item(s) of ${product.name} from ${fromLabel} to ${toLabel}` })
      setTransferAmount("")
      setTransferBoxQty("")
      setTransferLoosePcs("0")
      setSelectedProduct("")
      setSearchQuery("")
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to transfer stock." })
    }
  }

  const handleIntake = async () => {
    if (!intakeData.productName || computedTotalUnits <= 0 || !token || !userProfile) return
    
    const qty = computedTotalUnits
    const pcsPerBox = Number(intakeData.piecesPerBox) || 12

    let pieceBuyingPrice = Number(intakeData.buyingPrice) || 0
    let pieceSellingPrice = Number(intakeData.price) || 0
    let boxBuyingPrice = Number(intakeData.boxBuyingPrice) || 0
    let boxSellingPrice = Number(intakeData.boxSellingPrice) || 0

    // Auto-calculate missing rates
    if (boxBuyingPrice > 0 && pieceBuyingPrice === 0) {
      pieceBuyingPrice = Math.round(boxBuyingPrice / pcsPerBox)
    }
    if (boxSellingPrice > 0 && pieceSellingPrice === 0) {
      pieceSellingPrice = Math.round(boxSellingPrice / pcsPerBox)
    }
    if (pieceBuyingPrice > 0 && boxBuyingPrice === 0) {
      boxBuyingPrice = pieceBuyingPrice * pcsPerBox
    }
    if (pieceSellingPrice > 0 && boxSellingPrice === 0) {
      boxSellingPrice = pieceSellingPrice * pcsPerBox
    }

    const totalCost = totalIntakeCost
    
    try {
      const intakeName = intakeData.productName.trim().toLowerCase()
      const intakeCategory = (intakeData.category || "General").trim().toLowerCase()

      const existingProduct = products.find(p => 
        p.name.trim().toLowerCase() === intakeName && 
        (p.category || "General").trim().toLowerCase() === intakeCategory
      )
      
      if (!existingProduct) {
        // Create new product
        await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: intakeData.productName.trim(),
            category: intakeData.category || "General",
            buyingPrice: pieceBuyingPrice,
            price: pieceSellingPrice > 0 ? pieceSellingPrice : pieceBuyingPrice,
            boxBuyingPrice: boxBuyingPrice,
            boxSellingPrice: boxSellingPrice,
            piecesPerBox: pcsPerBox,
            warehouseStock: intakeData.destination === "warehouse" ? qty : 0,
            shopStock: intakeData.destination === "shop" ? qty : 0,
            imageUrl: intakeData.imageUrl || "https://picsum.photos/seed/placeholder/400/400",
            expiryDate: intakeData.expiryDate || null
          })
        })
      } else {
        // Update existing product
        await fetch(`/api/products/${existingProduct.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            category: intakeData.category || existingProduct.category,
            buyingPrice: pieceBuyingPrice > 0 ? pieceBuyingPrice : existingProduct.buyingPrice,
            price: pieceSellingPrice > 0 ? pieceSellingPrice : existingProduct.price,
            boxBuyingPrice: boxBuyingPrice > 0 ? boxBuyingPrice : existingProduct.boxBuyingPrice,
            boxSellingPrice: boxSellingPrice > 0 ? boxSellingPrice : existingProduct.boxSellingPrice,
            piecesPerBox: pcsPerBox,
            warehouseStock: intakeData.destination === "warehouse" ? existingProduct.warehouseStock + qty : existingProduct.warehouseStock,
            shopStock: intakeData.destination === "shop" ? existingProduct.shopStock + qty : existingProduct.shopStock,
            ...(intakeData.imageUrl && { imageUrl: intakeData.imageUrl }),
            ...(intakeData.expiryDate && !existingProduct.expiryDate && { expiryDate: intakeData.expiryDate })
          })
        })
      }

      // Create movement record
      await fetch('/api/movements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productName: intakeData.productName.trim(),
          quantity: qty,
          type: "collection",
          destination: intakeData.destination,
          week: userProfile.currentWeek,
          buyingPrice: pieceBuyingPrice,
          sellingPrice: pieceSellingPrice,
          unitType: intakeData.unitType,
          paymentMode: intakeData.paymentMode,
          supplierName: intakeData.supplierName,
          supplierContact: intakeData.supplierContact,
          totalAmount: totalCost,
          receivedBy: (intakeData.receivedBy || "").trim() || userProfile?.fullName || 'System',
          expiryDate: intakeData.expiryDate || null
        })
      })

      // If purchased on credit, create a Creditor record for notifications & settlement
      if (intakeData.paymentMode === "credit") {
        const days = Number(intakeData.paymentDays) || 14
        const due = new Date()
        due.setDate(due.getDate() + days)

        await fetch('/api/creditors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            supplierName: intakeData.supplierName || "General Supplier",
            supplierContact: intakeData.supplierContact || "",
            productName: intakeData.productName.trim(),
            quantity: qty,
            unitType: intakeData.unitType,
            buyingPrice: pieceBuyingPrice,
            totalAmount: totalCost,
            paymentMode: "credit",
            paymentDays: days,
            dueDate: due.toISOString()
          })
        })
      }

      // Refresh data
      const updatedProducts = await fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json())
      setProducts(updatedProducts)

      const updatedMovements = await fetch('/api/movements', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json())
      setMovements(updatedMovements)

      window.dispatchEvent(new Event("upshop_data_updated"))

      const destName = intakeData.destination === "warehouse" ? "Warehouse" : "Shop Floor"
      toast({ title: "Purchase Logged", description: `Added ${qty} items (${intakeData.unitType}) of ${intakeData.productName} to ${destName} via ${intakeData.paymentMode.toUpperCase()}` })
      setIntakeData({ 
        productName: "", 
        buyingPrice: "",
        price: "",
        boxBuyingPrice: "",
        boxSellingPrice: "",
        unitType: "pieces",
        qty: "", 
        boxQty: "",
        piecesPerBox: "12",
        extraPieces: "0",
        paymentMode: "cash", 
        mobileMoneyContact: "",
        paymentDays: "14",
        supplierName: "",
        supplierContact: "",
        expiryDate: "",
        destination: "warehouse", 
        category: "General", 
        imageUrl: "",
        receivedBy: userProfile?.fullName || ""
      })
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to process received product." })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setIntakeData(prev => ({ ...prev, imageUrl: reader.result as string }))
        toast({ title: "Image Loaded", description: "Product photo uploaded successfully." })
      }
      reader.readAsDataURL(file)
    }
  }

  const selectExistingIntakeProduct = (p: any) => {
    const pcsPerBox = p.piecesPerBox || 12
    setIntakeData(prev => ({
      ...prev,
      productName: p.name,
      buyingPrice: String(p.buyingPrice || p.price || 0),
      price: String(p.price || 0),
      boxBuyingPrice: String(p.boxBuyingPrice || (p.buyingPrice ? p.buyingPrice * pcsPerBox : 0)),
      boxSellingPrice: String(p.boxSellingPrice || (p.price ? p.price * pcsPerBox : 0)),
      piecesPerBox: String(pcsPerBox),
      category: p.category || "General",
      imageUrl: p.imageUrl || "",
      expiryDate: p.expiryDate || ""
    }))
    setIsIntakeDropdownOpen(false)
  }

  const selectSupplierPartner = (partner: any) => {
    setIntakeData(prev => ({
      ...prev,
      supplierName: partner.name,
      supplierContact: partner.phone || partner.email || ""
    }))
    setIsSupplierDropdownOpen(false)
  }

  const handleQuickQty = (add: number) => {
    setTransferAmount(prev => {
      const curr = Number(prev) || 0
      return String(curr + add)
    })
  }

  const handleMaxQty = () => {
    if (!selectedProductObj) return
    const max = transferDirection === 'whse-to-shop' ? selectedProductObj.warehouseStock : selectedProductObj.shopStock
    setTransferAmount(String(max))
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><div className="animate-spin">Loading...</div></div>
  }

  const currentAvailableStock = selectedProductObj 
    ? (transferDirection === 'whse-to-shop' ? selectedProductObj.warehouseStock : selectedProductObj.shopStock)
    : 0

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Product Purchasing and Transfers</h1>
          <p className="text-muted-foreground font-medium">Tracking period: {userProfile?.currentWeek || "Active Period"}</p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Product Transfers Card */}
        <Card className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-xl overflow-hidden flex flex-col justify-between">
          <div>
            <CardHeader className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <ArrowRightLeft className="h-6 w-6 text-blue-300" />
                  Product Transfers
                </CardTitle>
                <Badge variant="outline" className="bg-white/10 text-white border-white/20 px-3 py-1 font-semibold text-xs">
                  {transferDirection === 'whse-to-shop' ? 'Whse → Shop' : 'Shop → Whse'}
                </Badge>
              </div>
              <CardDescription className="text-blue-100/80 mt-1">
                Move inventory stock between Warehouse and Shop Floor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Transferred By Input */}
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Transferred By (Officer / Staff)</Label>
                <Input 
                  type="text" 
                  value={transferredBy}
                  onChange={(e) => setTransferredBy(e.target.value)}
                  placeholder="e.g. John Doe (Logged Staff)"
                  className="h-11 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                />
              </div>

              {/* Direction Selector */}
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-slate-500">Transfer Direction</Label>
                <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setTransferDirection('whse-to-shop')
                      setSelectedProduct("")
                      setSearchQuery("")
                    }}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-xs font-bold transition-all",
                      transferDirection === 'whse-to-shop' 
                        ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm" 
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    )}
                  >
                    <Building2 className="h-4 w-4" />
                    Warehouse → Shop Floor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTransferDirection('shop-to-whse')
                      setSelectedProduct("")
                      setSearchQuery("")
                    }}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-xs font-bold transition-all",
                      transferDirection === 'shop-to-whse' 
                        ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm" 
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    )}
                  >
                    <Store className="h-4 w-4" />
                    Shop Floor → Warehouse
                  </button>
                </div>
              </div>

              {/* Product Search & Dropdown */}
              <div className="space-y-2 relative">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Select Product</Label>
                <div className="relative">
                  <Input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setSelectedProduct("")
                      setIsDropdownOpen(true)
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                    placeholder="Type product name to search..."
                    className="h-12 border-slate-200 dark:border-slate-700 pr-10 bg-white dark:bg-slate-800"
                  />
                  <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400">
                    <Search className="h-5 w-5" />
                  </div>

                  {isDropdownOpen && (
                    <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl rounded-lg">
                      <CardContent className="p-1 divide-y divide-slate-100 dark:divide-slate-700">
                        {filteredTransferProducts.length === 0 ? (
                          <div className="p-3 text-sm text-muted-foreground text-center">No matching products found</div>
                        ) : (
                          filteredTransferProducts.map(p => {
                            const avail = transferDirection === 'whse-to-shop' ? p.warehouseStock : p.shopStock
                            return (
                              <div 
                                key={p.id} 
                                onClick={() => {
                                  setSelectedProduct(p.id)
                                  setSearchQuery(`${p.name} (${p.category})`)
                                  setIsDropdownOpen(false)
                                }}
                                className={cn(
                                  "p-3 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer rounded transition-colors flex justify-between items-center",
                                  selectedProduct === p.id && "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <span>{p.name}</span>
                                  <Badge variant="outline" className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{p.category}</Badge>
                                </div>
                                <div className="flex gap-2 items-center text-xs">
                                  <Badge variant={avail > 0 ? "secondary" : "destructive"} className="font-bold">
                                    {transferDirection === 'whse-to-shop' ? `Whse: ${p.warehouseStock}` : `Shop: ${p.shopStock}`}
                                  </Badge>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {selectedProductObj && (
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs font-semibold border border-slate-200/60 dark:border-slate-700 mt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-600 dark:text-slate-400">Selected Product:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedProductObj.name}</span>
                      <Badge variant="secondary" className="text-[10px] font-bold py-0.5 px-2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">{selectedProductObj.category}</Badge>
                    </div>
                    <span className={cn("font-bold text-sm", currentAvailableStock > 0 ? "text-emerald-600" : "text-rose-600")}>
                      {currentAvailableStock} unit(s)
                    </span>
                  </div>
                )}
              </div>

              {/* Transfer Unit & Quantities Selector */}
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase font-bold text-slate-500">Transfer Unit & Quantities</Label>
                  <Select value={transferUnitType} onValueChange={(v: any) => setTransferUnitType(v)}>
                    <SelectTrigger className="h-8 text-xs font-bold w-40 bg-white dark:bg-slate-700 border-blue-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pieces">Pieces / Units</SelectItem>
                      <SelectItem value="boxes">Boxes / Cartons</SelectItem>
                      <SelectItem value="boxes_and_pieces">Boxes & Pieces</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {transferUnitType === "pieces" && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Quantity to Move (Pieces)</Label>
                      {selectedProductObj && (
                        <div className="flex items-center gap-1.5">
                          <Button type="button" variant="outline" size="sm" onClick={() => handleQuickQty(1)} className="h-7 text-xs px-2">+1</Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => handleQuickQty(5)} className="h-7 text-xs px-2">+5</Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => handleQuickQty(10)} className="h-7 text-xs px-2">+10</Button>
                          <Button type="button" variant="secondary" size="sm" onClick={handleMaxQty} className="h-7 text-xs px-2 font-bold bg-blue-100 text-blue-700 hover:bg-blue-200">Max</Button>
                        </div>
                      )}
                    </div>
                    <Input 
                      type="number" 
                      min="1"
                      value={transferAmount} 
                      onChange={(e) => setTransferAmount(e.target.value)} 
                      className="h-11 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-bold" 
                      placeholder="0" 
                    />
                  </div>
                )}

                {transferUnitType === "boxes" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] font-bold text-slate-500">Box Count</Label>
                      <Input 
                        type="number"
                        min="1"
                        value={transferBoxQty}
                        onChange={(e) => setTransferBoxQty(e.target.value)}
                        placeholder="e.g. 2 boxes"
                        className="h-10 text-xs font-bold bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-slate-500">Pcs Per Box</Label>
                      <Input 
                        type="number"
                        min="1"
                        value={transferPcsPerBox}
                        onChange={(e) => setTransferPcsPerBox(e.target.value)}
                        placeholder="e.g. 12"
                        className="h-10 text-xs font-bold bg-white dark:bg-slate-800"
                      />
                    </div>
                  </div>
                )}

                {transferUnitType === "boxes_and_pieces" && (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px] font-bold text-slate-500">Box Count</Label>
                      <Input 
                        type="number"
                        min="0"
                        value={transferBoxQty}
                        onChange={(e) => setTransferBoxQty(e.target.value)}
                        placeholder="e.g. 1"
                        className="h-10 text-xs font-bold bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-slate-500">Pcs Per Box</Label>
                      <Input 
                        type="number"
                        min="1"
                        value={transferPcsPerBox}
                        onChange={(e) => setTransferPcsPerBox(e.target.value)}
                        placeholder="e.g. 12"
                        className="h-10 text-xs font-bold bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-slate-500">Pieces Count</Label>
                      <Input 
                        type="number"
                        min="0"
                        value={transferLoosePcs}
                        onChange={(e) => setTransferLoosePcs(e.target.value)}
                        placeholder="e.g. 4"
                        className="h-10 text-xs font-bold bg-white dark:bg-slate-800"
                      />
                    </div>
                  </div>
                )}

                <div className="text-right text-xs font-bold text-blue-800 dark:text-blue-300">
                  Calculated Total: <span className="font-mono text-sm">{computedTransferTotalUnits}</span> single items to move
                </div>
              </div>
            </CardContent>
          </div>

          <CardFooter className="p-6 pt-0">
            <Button 
              className="w-full h-12 font-bold text-base bg-blue-700 hover:bg-blue-800 text-white shadow-md transition-all" 
              onClick={handleTransfer} 
              disabled={!selectedProduct || computedTransferTotalUnits <= 0}
            >
              Transfer to {transferDirection === 'whse-to-shop' ? 'Shop Floor' : 'Warehouse'}
            </Button>
          </CardFooter>
        </Card>

        {/* Received Products / Purchases Card */}
        <Card className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-xl overflow-hidden flex flex-col justify-between">
          <div>
            <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6">
              <CardTitle className="flex items-center gap-2 text-xl font-bold">
                <Truck className="h-6 w-6 text-amber-200" />
                Received Products / Purchases
              </CardTitle>
              <CardDescription className="text-amber-100/90 mt-1">
                Log new stock arrivals, prices, supplier details & credit payment terms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              {/* Product Name with Auto-Suggest */}
              <div className="space-y-2 relative">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Product Name</Label>
                <div className="relative">
                  <Input 
                    value={intakeData.productName} 
                    onChange={(e) => {
                      setIntakeData({...intakeData, productName: e.target.value})
                      setIsIntakeDropdownOpen(true)
                    }} 
                    onFocus={() => setIsIntakeDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsIntakeDropdownOpen(false), 200)}
                    className="h-12 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold" 
                    placeholder="Type or search product name..." 
                  />
                  
                  {isIntakeDropdownOpen && filteredIntakeProducts.length > 0 && (
                    <Card className="absolute z-50 w-full mt-1 max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl rounded-lg">
                      <CardContent className="p-1 divide-y divide-slate-100 dark:divide-slate-700">
                        <div className="p-2 text-[10px] font-bold uppercase text-slate-400">Select Existing Product (Auto-fills prices & category)</div>
                        {filteredIntakeProducts.map(p => (
                          <div 
                            key={p.id}
                            onClick={() => selectExistingIntakeProduct(p)}
                            className="p-2.5 text-sm hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer rounded flex justify-between items-center"
                          >
                            <span className="font-medium">{p.name}</span>
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant="outline" className="text-slate-500">{p.category}</Badge>
                              <span className="font-mono font-bold text-amber-700 dark:text-amber-400">Buying: Shs {(p.buyingPrice || p.price)?.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Purchasing Unit Type & Quantity Selector */}
              <div className="space-y-3 p-4 bg-amber-50/50 dark:bg-slate-800/50 rounded-xl border border-amber-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase font-bold text-slate-500">Purchasing Unit & Quantities</Label>
                  <Select value={intakeData.unitType} onValueChange={(v) => setIntakeData({...intakeData, unitType: v})}>
                    <SelectTrigger className="h-8 text-xs font-bold w-44 bg-white dark:bg-slate-700 border-amber-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pieces">Pieces / Units</SelectItem>
                      <SelectItem value="boxes">Boxes / Cartons</SelectItem>
                      <SelectItem value="boxes_and_pieces">Boxes & Pieces</SelectItem>
                      <SelectItem value="kgs">Kilograms (Kg's)</SelectItem>
                      <SelectItem value="litres">Litres</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {intakeData.unitType === "boxes" && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[10px] font-bold text-slate-500">Box Count</Label>
                        <Input 
                          type="number" 
                          value={intakeData.boxQty} 
                          onChange={(e) => setIntakeData({...intakeData, boxQty: e.target.value})}
                          placeholder="e.g. 5 boxes"
                          className="h-10 text-xs font-bold bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-bold text-slate-500">Pcs Per Box</Label>
                        <Input 
                          type="number" 
                          value={intakeData.piecesPerBox} 
                          onChange={(e) => setIntakeData({...intakeData, piecesPerBox: e.target.value})}
                          placeholder="e.g. 24"
                          className="h-10 text-xs font-bold bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>
                    <div className="text-right text-xs font-bold text-amber-800 dark:text-amber-400">
                      Calculated Total: <span className="font-mono text-sm">{computedTotalUnits}</span> single items added to stock
                    </div>
                  </div>
                )}

                {intakeData.unitType === "boxes_and_pieces" && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-[10px] font-bold text-slate-500">Box Count</Label>
                        <Input 
                          type="number" 
                          value={intakeData.boxQty} 
                          onChange={(e) => setIntakeData({...intakeData, boxQty: e.target.value})}
                          placeholder="e.g. 5 boxes"
                          className="h-10 text-xs font-bold bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-bold text-slate-500">Pcs Per Box</Label>
                        <Input 
                          type="number" 
                          value={intakeData.piecesPerBox} 
                          onChange={(e) => setIntakeData({...intakeData, piecesPerBox: e.target.value})}
                          placeholder="e.g. 24"
                          className="h-10 text-xs font-bold bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-bold text-slate-500">Pieces Count</Label>
                        <Input 
                          type="number" 
                          value={intakeData.extraPieces} 
                          onChange={(e) => setIntakeData({...intakeData, extraPieces: e.target.value})}
                          placeholder="e.g. 2 pieces"
                          className="h-10 text-xs font-bold bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-between items-center text-xs font-bold text-amber-800 dark:text-amber-400 gap-1 pt-1">
                      <span>Calculated Total: <span className="font-mono text-sm">{computedTotalUnits}</span> single items</span>
                      <span>Total Purchase Cost: <span className="font-mono text-sm">Shs {totalIntakeCost.toLocaleString()}</span></span>
                    </div>
                  </div>
                )}

                {intakeData.unitType !== "boxes" && intakeData.unitType !== "boxes_and_pieces" && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Quantity Received ({intakeData.unitType})</Label>
                    <Input 
                      type="number" 
                      min="1"
                      value={intakeData.qty} 
                      onChange={(e) => setIntakeData({...intakeData, qty: e.target.value})} 
                      className="h-11 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-bold" 
                      placeholder="0" 
                    />
                  </div>
                )}
              </div>

              {/* Dynamic Price Inputs Grid depending on Unit Type */}
              {intakeData.unitType === "boxes_and_pieces" ? (
                <div className="space-y-2 p-3 bg-amber-50/30 dark:bg-slate-800/30 rounded-xl border border-amber-200/50">
                  <Label className="text-[11px] font-bold uppercase text-amber-800 dark:text-amber-300">Unit Prices Breakdown (4 Price Fields)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Box Buying Price (Shs)</Label>
                      <Input 
                        type="number" 
                        value={intakeData.boxBuyingPrice} 
                        onChange={(e) => setIntakeData({...intakeData, boxBuyingPrice: e.target.value})} 
                        className="h-10 text-xs font-mono font-bold text-amber-700 bg-white dark:bg-slate-800" 
                        placeholder="e.g. 50,000 / box" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Box Selling Price (Shs)</Label>
                      <Input 
                        type="number" 
                        value={intakeData.boxSellingPrice} 
                        onChange={(e) => setIntakeData({...intakeData, boxSellingPrice: e.target.value})} 
                        className="h-10 text-xs font-mono font-bold text-emerald-700 bg-white dark:bg-slate-800" 
                        placeholder="e.g. 60,000 / box" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Piece Buying Price (Shs)</Label>
                      <Input 
                        type="number" 
                        value={intakeData.buyingPrice} 
                        onChange={(e) => setIntakeData({...intakeData, buyingPrice: e.target.value})} 
                        className="h-10 text-xs font-mono font-bold text-amber-700 bg-white dark:bg-slate-800" 
                        placeholder="e.g. 2,000 / piece" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Piece Selling Price (Shs)</Label>
                      <Input 
                        type="number" 
                        value={intakeData.price} 
                        onChange={(e) => setIntakeData({...intakeData, price: e.target.value})} 
                        className="h-10 text-xs font-mono font-bold text-emerald-700 bg-white dark:bg-slate-800" 
                        placeholder="e.g. 2,500 / piece" 
                      />
                    </div>
                  </div>
                </div>
              ) : intakeData.unitType === "boxes" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-slate-700 dark:text-slate-300">Box Buying Price (Shs)</Label>
                    <Input 
                      type="number" 
                      value={intakeData.boxBuyingPrice} 
                      onChange={(e) => setIntakeData({...intakeData, boxBuyingPrice: e.target.value})} 
                      className="h-12 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-amber-700 dark:text-amber-400" 
                      placeholder="e.g. 50000 (Cost/Box)" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-slate-700 dark:text-slate-300">Box Selling Price (Shs)</Label>
                    <Input 
                      type="number" 
                      value={intakeData.boxSellingPrice} 
                      onChange={(e) => setIntakeData({...intakeData, boxSellingPrice: e.target.value})} 
                      className="h-12 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-emerald-700 dark:text-emerald-400" 
                      placeholder="e.g. 60000 (Retail/Box)" 
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-slate-700 dark:text-slate-300">Buying Unit Price (Shs)</Label>
                    <Input 
                      type="number" 
                      value={intakeData.buyingPrice} 
                      onChange={(e) => setIntakeData({...intakeData, buyingPrice: e.target.value})} 
                      className="h-12 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-amber-700 dark:text-amber-400" 
                      placeholder="e.g. 5000 (Cost)" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-slate-700 dark:text-slate-300">Selling Unit Price (Shs)</Label>
                    <Input 
                      type="number" 
                      value={intakeData.price} 
                      onChange={(e) => setIntakeData({...intakeData, price: e.target.value})} 
                      className="h-12 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-emerald-700 dark:text-emerald-400" 
                      placeholder="e.g. 7000 (Retail)" 
                    />
                  </div>
                </div>
              )}

              {/* Supplier Name, Contact & Received By Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2 relative">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Supplier Name</Label>
                  <div className="relative">
                    <Input 
                      value={intakeData.supplierName} 
                      onChange={(e) => {
                        setIntakeData({...intakeData, supplierName: e.target.value})
                        setIsSupplierDropdownOpen(true)
                      }} 
                      onFocus={() => setIsSupplierDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsSupplierDropdownOpen(false), 200)}
                      className="h-11 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" 
                      placeholder="e.g. Apex Wholesalers" 
                    />

                    {isSupplierDropdownOpen && filteredSupplierPartners.length > 0 && (
                      <Card className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl rounded-lg">
                        <CardContent className="p-1 divide-y divide-slate-100 dark:divide-slate-700">
                          <div className="p-1.5 text-[9px] font-bold uppercase text-slate-400">Registered Partners</div>
                          {filteredSupplierPartners.map(partner => (
                            <div 
                              key={partner.id}
                              onClick={() => selectSupplierPartner(partner)}
                              className="p-2 text-xs hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer rounded flex justify-between items-center"
                            >
                              <span className="font-bold">{partner.name}</span>
                              <span className="text-[10px] text-slate-500">{partner.phone}</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Supplier Contact / Phone</Label>
                  <Input 
                    value={intakeData.supplierContact} 
                    onChange={(e) => setIntakeData({...intakeData, supplierContact: e.target.value})} 
                    className="h-11 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" 
                    placeholder="+256 700 000 000" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Received By (Officer / Staff)</Label>
                  <Input 
                    value={intakeData.receivedBy} 
                    onChange={(e) => setIntakeData({...intakeData, receivedBy: e.target.value})} 
                    className="h-11 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold" 
                    placeholder="e.g. Jane Smith" 
                  />
                </div>
              </div>

              {/* Payment Mode Selector & Options */}
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <Label className="text-xs uppercase font-bold text-slate-500">Mode of Purchase Payment</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "cash", label: "Cash" },
                    { id: "mobile_money", label: "Mobile Money" },
                    { id: "credit", label: "Supplier Credit" }
                  ].map(m => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setIntakeData({...intakeData, paymentMode: m.id})}
                      className={cn(
                        "py-2 px-3 rounded-lg text-xs font-bold border transition-all text-center",
                        intakeData.paymentMode === m.id
                          ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {intakeData.paymentMode === "mobile_money" && (
                  <div className="space-y-1.5 pt-2 animate-in fade-in">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Mobile Money Phone / Reference Contact</Label>
                    <Input 
                      value={intakeData.mobileMoneyContact}
                      onChange={(e) => setIntakeData({...intakeData, mobileMoneyContact: e.target.value})}
                      className="h-10 text-xs bg-white dark:bg-slate-800"
                      placeholder="e.g. +256 772 123456 (Ref TX-992)"
                    />
                  </div>
                )}

                {intakeData.paymentMode === "credit" && (
                  <div className="space-y-2 pt-2 animate-in fade-in">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Terms (Days)</Label>
                        <Input 
                          type="number"
                          value={intakeData.paymentDays}
                          onChange={(e) => setIntakeData({...intakeData, paymentDays: e.target.value})}
                          className="h-10 text-xs font-bold bg-white dark:bg-slate-800"
                          placeholder="14"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <div className="p-2 rounded-md bg-amber-100 dark:bg-amber-950/50 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                          Due Date: {new Date(Date.now() + (Number(intakeData.paymentDays || 0) * 86400000)).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 italic">
                      * This purchase will be registered under Creditor Liabilities in Dashboard & Business Management for settlement tracking.
                    </p>
                  </div>
                )}
              </div>

              {/* Product Expiry Date & Category Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 relative">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-amber-600" /> Category
                  </Label>
                  <div className="relative">
                    <Input 
                      value={intakeData.category}
                      onChange={(e) => {
                        setIntakeData({...intakeData, category: e.target.value})
                        setIsCategoryDropdownOpen(true)
                      }}
                      onFocus={() => setIsCategoryDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsCategoryDropdownOpen(false), 200)}
                      className="h-11 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                      placeholder="Type or select category..."
                    />
                    {isCategoryDropdownOpen && availableCategories.length > 0 && (
                      <Card className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl rounded-lg">
                        <CardContent className="p-1 divide-y divide-slate-100 dark:divide-slate-700">
                          <div className="p-1.5 text-[9px] font-bold uppercase text-slate-400">Category Suggestions</div>
                          {availableCategories.map(cat => (
                            <div 
                              key={cat}
                              onClick={() => {
                                setIntakeData(prev => ({ ...prev, category: cat }))
                                setIsCategoryDropdownOpen(false)
                              }}
                              className="p-2 text-xs hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer rounded font-medium"
                            >
                              {cat}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300">Expiry Date (Optional)</Label>
                  <Input 
                    type="date" 
                    value={intakeData.expiryDate} 
                    onChange={(e) => setIntakeData({...intakeData, expiryDate: e.target.value})} 
                    className="h-11 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" 
                  />
                </div>
              </div>

              {/* Product Photo Upload */}
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-amber-600" /> Product Photo
                </Label>
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*" 
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex items-center gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    className="h-10 px-4 text-xs border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <Upload className="h-4 w-4 mr-2 text-amber-600" /> Choose from Files
                  </Button>

                  {intakeData.imageUrl && (
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-1 pr-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="h-8 w-8 rounded overflow-hidden border border-slate-200">
                        <img src={intakeData.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Photo attached</span>
                      <button 
                        type="button" 
                        onClick={() => setIntakeData(prev => ({ ...prev, imageUrl: "" }))}
                        className="text-slate-400 hover:text-rose-500 ml-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Destination Radio Group */}
              <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <Label className="text-xs uppercase font-extrabold text-slate-700 dark:text-slate-300">Initial Destination</Label>
                  <div className="text-sm font-mono font-black text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2.5 py-1 rounded-md border border-amber-300/40">
                    Total Cost: Shs {totalIntakeCost.toLocaleString()}
                  </div>
                </div>
                <RadioGroup value={intakeData.destination} onValueChange={(v) => setIntakeData({...intakeData, destination: v})} className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="warehouse" id="dest-wh" />
                    <Label htmlFor="dest-wh" className="cursor-pointer font-bold flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200">
                      <Building2 className="h-4 w-4 text-blue-600" /> Warehouse
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="shop" id="dest-shop" />
                    <Label htmlFor="dest-shop" className="cursor-pointer font-bold flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200">
                      <Store className="h-4 w-4 text-indigo-600" /> Shop Floor
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </div>

          <CardFooter className="p-6 pt-0">
            <Button 
              className="w-full h-14 font-black text-base uppercase tracking-wider bg-amber-600 hover:bg-amber-700 text-white shadow-lg transition-all" 
              onClick={handleIntake}
              disabled={!intakeData.productName || computedTotalUnits <= 0}
            >
              Confirm Product Purchase & Arrival
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Product Transfer History Card */}
      <Card className="border-none shadow-lg overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <PackageCheck className="h-6 w-6 text-primary" />
              Product Transfer History
            </CardTitle>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
              {/* Search Bar for Transfer History */}
              <div className="relative w-full sm:w-72">
                <Input 
                  type="text" 
                  value={historySearchQuery} 
                  onChange={(e) => setHistorySearchQuery(e.target.value)} 
                  placeholder="Search transfer history..." 
                  className="h-10 pl-9 pr-4 text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" 
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>

              {/* Filter Period Dropdown */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">FILTER PERIOD:</span>
                <Select value={historyPeriodFilter} onValueChange={setHistoryPeriodFilter}>
                  <SelectTrigger className="w-[200px] h-10 border-slate-200 dark:border-slate-700 font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl focus:ring-1 focus:ring-accent shadow-sm text-xs">
                    <SelectValue placeholder="Select Period" />
                  </SelectTrigger>
                  <SelectContent className="font-bold">
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="all">All {userProfile?.operationPeriodMode === 'months' ? 'Months' : 'Weeks'}</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value={userProfile?.operationPeriodMode === 'months' ? "last_month" : "last_week"}>
                      {userProfile?.operationPeriodMode === 'months' ? "Last Month" : "Last Week"}
                    </SelectItem>
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
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTransferMovements.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground italic text-sm">
                No product transfer history found matching selected filter or search criteria.
              </div>
            ) : (
              filteredTransferMovements.map((m: any, i: number) => {
                const isWhseToShop = m.destination === 'shop'

                return (
                  <div key={m.id || i} className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        <ArrowRightLeft className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{m.productName}</span>
                          <Badge variant="outline" className="text-[10px] font-semibold text-slate-500">
                            {getPeriodFromTimestamp(m.timestamp, userProfile?.operationPeriodMode === 'months', m.week)}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground mt-0.5 font-medium">
                          <span>Transferred By: <strong className="text-slate-700 dark:text-slate-200">{m.transferredBy || userProfile?.fullName || 'System'}</strong></span>
                          <span>• {m.timestamp ? new Date(m.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Logged Record'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6">
                      <div className="text-left md:text-center">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Quantity</span>
                        <span className="font-mono font-bold text-base text-slate-900 dark:text-slate-100">{m.quantity} units</span>
                      </div>
                      
                      <div>
                        {isWhseToShop ? (
                          <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-1 px-3">
                            Warehouse → Shop Floor
                          </Badge>
                        ) : (
                          <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-1 px-3">
                            Shop Floor → Warehouse
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Received Products & Purchases History Card */}
      <Card className="border-none shadow-lg overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 p-6 bg-slate-50/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Truck className="h-6 w-6 text-amber-600" />
              Received Products & Purchases History
            </CardTitle>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
              {/* Search Bar for Purchase History */}
              <div className="relative w-full sm:w-72">
                <Input 
                  type="text" 
                  value={purchaseSearchQuery} 
                  onChange={(e) => setPurchaseSearchQuery(e.target.value)} 
                  placeholder="Search purchase history..." 
                  className="h-10 pl-9 pr-4 text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" 
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>

              {/* Filter Period Dropdown */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">FILTER PERIOD:</span>
                <Select value={purchasePeriodFilter} onValueChange={setPurchasePeriodFilter}>
                  <SelectTrigger className="w-[200px] h-10 border-slate-200 dark:border-slate-700 font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl focus:ring-1 focus:ring-amber-500 shadow-sm text-xs">
                    <SelectValue placeholder="Select Period" />
                  </SelectTrigger>
                  <SelectContent className="font-bold">
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="all">All {userProfile?.operationPeriodMode === 'months' ? 'Months' : 'Weeks'}</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value={userProfile?.operationPeriodMode === 'months' ? "last_month" : "last_week"}>
                      {userProfile?.operationPeriodMode === 'months' ? "Last Month" : "Last Week"}
                    </SelectItem>
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
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredPurchaseMovements.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground italic text-sm">
                No received products or purchase history found matching selected filter or search criteria.
              </div>
            ) : (
              filteredPurchaseMovements.map((m: any, i: number) => {
                const isWhse = m.destination === 'warehouse'
                const paymentModeLabel = m.paymentMode === 'credit' ? 'CREDIT' : m.paymentMode === 'mobile_money' ? 'MOBILE MONEY' : 'CASH'

                return (
                  <div key={m.id || i} className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 shrink-0">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{m.productName}</span>
                          <Badge variant="outline" className="text-[10px] font-semibold text-slate-500">
                            {getPeriodFromTimestamp(m.timestamp, userProfile?.operationPeriodMode === 'months', m.week)}
                          </Badge>
                          {m.paymentMode && (
                            <Badge className={cn(
                              "text-[10px] font-extrabold uppercase py-0.5 px-2",
                              m.paymentMode === 'credit' ? "bg-amber-100 text-amber-800 border-amber-300" :
                              m.paymentMode === 'mobile_money' ? "bg-purple-100 text-purple-800 border-purple-300" :
                              "bg-emerald-100 text-emerald-800 border-emerald-300"
                            )}>
                              {paymentModeLabel}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground mt-0.5 font-medium">
                          <span>Supplier: {m.supplierName || 'General Supplier'}</span>
                          {m.supplierContact && <span>• Contact: {m.supplierContact}</span>}
                          <span>• Received By: <strong className="text-slate-700 dark:text-slate-200">{m.receivedBy || userProfile?.fullName || 'System'}</strong></span>
                          <span>• {m.timestamp ? new Date(m.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Logged Record'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6">
                      <div className="text-left md:text-center">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Quantity</span>
                        <span className="font-mono font-bold text-base text-slate-900 dark:text-slate-100">{m.quantity} units</span>
                      </div>

                      {m.totalAmount > 0 && (
                        <div className="text-left md:text-right">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Cost</span>
                          <span className="font-mono font-bold text-base text-amber-700 dark:text-amber-400">Shs {Number(m.totalAmount).toLocaleString()}</span>
                        </div>
                      )}
                      
                      <div>
                        {isWhse ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-1 px-3">
                            Supplier → Warehouse
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs py-1 px-3">
                            Supplier → Shop Floor
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

