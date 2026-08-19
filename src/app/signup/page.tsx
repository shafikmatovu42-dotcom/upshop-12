"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Building,
  User,
  MapPin,
  Mail,
  Key,
  DollarSign,
  Target,
  Calendar,
  Package,
  CreditCard,
  Building2,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Quote,
  Info,
  LogIn,
  Layers,
  Zap,
  BarChart3,
  ShieldCheck,
  Bot,
  Smartphone,
  Check,
  Store,
  Users
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function SignupPage() {
  // welcomeSlide: 1, 2, 3 for Welcome Slides, or null when in Registration Wizard steps (1 to 5)
  const [welcomeSlide, setWelcomeSlide] = useState<number | null>(1)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // Step 1: Business Credentials & Info
  const [formData, setFormData] = useState({
    fullName: "",
    businessName: "",
    motto: "",
    location: "",
    email: "",
    password: ""
  })

  // Step 2: Operating Setup & Opening Liquidity
  const [operationPeriodMode, setOperationPeriodMode] = useState<'weeks' | 'months'>('weeks')
  const [revenueTarget, setRevenueTarget] = useState("")
  const [openingCash, setOpeningCash] = useState("")

  // Step 3: Starting Inventory Products
  const [initialProducts, setInitialProducts] = useState<Array<{
    name: string;
    category: string;
    price: string;
    buyingPrice: string;
    shopStock: string;
    warehouseStock: string;
  }>>([
    { name: "", category: "General", price: "", buyingPrice: "", shopStock: "", warehouseStock: "" },
    { name: "", category: "General", price: "", buyingPrice: "", shopStock: "", warehouseStock: "" },
    { name: "", category: "General", price: "", buyingPrice: "", shopStock: "", warehouseStock: "" }
  ])

  // Step 4: Opening Customer Demands & Supplier Demands
  const [initialDebtors, setInitialDebtors] = useState<Array<{
    customerName: string;
    total: string;
    dueDate: string;
  }>>([])

  const [initialCreditors, setInitialCreditors] = useState<Array<{
    supplierName: string;
    supplierContact: string;
    productName: string;
    quantity: string;
    totalAmount: string;
    dueDate: string;
  }>>([])

  // Universal Enter Key Focus Navigator
  const handleEnterNavigation = (e: React.KeyboardEvent, nextId?: string, onLastAction?: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (nextId) {
        const nextElem = document.getElementById(nextId)
        if (nextElem) {
          nextElem.focus()
          return
        }
      }
      if (onLastAction) {
        onLastAction()
      }
    }
  }

  // Auto-focus first input when step changes
  useEffect(() => {
    if (welcomeSlide !== null) return
    const timer = setTimeout(() => {
      if (step === 1) {
        document.getElementById('step1-fullName')?.focus()
      } else if (step === 2) {
        document.getElementById('step2-target')?.focus()
      } else if (step === 3) {
        document.getElementById('prod-input-0-0')?.focus()
      } else if (step === 4) {
        const debtorInput = document.getElementById('debtor-name-0')
        if (debtorInput) debtorInput.focus()
        else document.getElementById('creditor-name-0')?.focus()
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [step, welcomeSlide])

  // Handlers for adding/removing product rows
  const handleAddProductRow = (count = 1) => {
    const newRows = Array.from({ length: count }, () => ({
      name: "",
      category: "General",
      price: "",
      buyingPrice: "",
      shopStock: "",
      warehouseStock: ""
    }))
    setInitialProducts(prev => [...prev, ...newRows])
  }

  const handleRemoveProductRow = (index: number) => {
    setInitialProducts(prev => prev.filter((_, i) => i !== index))
  }

  const handleClearProducts = () => {
    setInitialProducts([{ name: "", category: "General", price: "", buyingPrice: "", shopStock: "", warehouseStock: "" }])
  }

  const handleProductChange = (index: number, field: string, value: string) => {
    setInitialProducts(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Keyboard Enter navigation for fast table input
  const handleKeyDownProduct = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const nextColIndex = colIndex + 1
      const totalCols = 6

      if (nextColIndex < totalCols) {
        const nextInput = document.getElementById(`prod-input-${rowIndex}-${nextColIndex}`)
        if (nextInput) nextInput.focus()
      } else {
        if (rowIndex + 1 < initialProducts.length) {
          const nextRowInput = document.getElementById(`prod-input-${rowIndex + 1}-0`)
          if (nextRowInput) nextRowInput.focus()
        } else {
          handleAddProductRow(1)
          setTimeout(() => {
            const newRowInput = document.getElementById(`prod-input-${rowIndex + 1}-0`)
            if (newRowInput) newRowInput.focus()
          }, 50)
        }
      }
    }
  }

  // Handlers for adding/removing debtor rows
  const handleAddDebtorRow = () => {
    setInitialDebtors(prev => [...prev, { customerName: "", total: "", dueDate: "" }])
  }
  const handleRemoveDebtorRow = (index: number) => {
    setInitialDebtors(prev => prev.filter((_, i) => i !== index))
  }
  const handleDebtorChange = (index: number, field: string, value: string) => {
    setInitialDebtors(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Handlers for adding/removing creditor rows
  const handleAddCreditorRow = () => {
    setInitialCreditors(prev => [...prev, { supplierName: "", supplierContact: "", productName: "", quantity: "1", totalAmount: "", dueDate: "" }])
  }
  const handleRemoveCreditorRow = (index: number) => {
    setInitialCreditors(prev => prev.filter((_, i) => i !== index))
  }
  const handleCreditorChange = (index: number, field: string, value: string) => {
    setInitialCreditors(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Step 1 Validation
  const validateStep1 = () => {
    if (!formData.fullName.trim() || !formData.businessName.trim() || !formData.location.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast({ variant: "destructive", title: "Missing Required Fields", description: "Please fill in all mandatory account details." })
      return false
    }
    return true
  }

  const handleNextStep = () => {
    if (step === 1 && !validateStep1()) return
    setStep(prev => prev + 1)
  }

  const handlePrevStep = () => {
    setStep(prev => Math.max(1, prev - 1))
  }

  const handleFinalSubmit = async () => {
    setLoading(true)
    try {
      const validProducts = initialProducts
        .filter(p => p.name.trim() !== '')
        .map(p => ({
          name: p.name.trim(),
          category: p.category || 'General',
          price: Number(p.price || 0),
          buyingPrice: Number(p.buyingPrice || 0),
          shopStock: Number(p.shopStock || 0),
          warehouseStock: Number(p.warehouseStock || 0)
        }))

      const validDebtors = initialDebtors
        .filter(d => d.customerName.trim() !== '' && Number(d.total || 0) > 0)
        .map(d => ({
          customerName: d.customerName.trim(),
          total: Number(d.total),
          dueDate: d.dueDate || undefined
        }))

      const validCreditors = initialCreditors
        .filter(c => c.supplierName.trim() !== '' && Number(c.totalAmount || 0) > 0)
        .map(c => ({
          supplierName: c.supplierName.trim(),
          supplierContact: c.supplierContact.trim(),
          productName: c.productName.trim() || 'Stock Purchase',
          quantity: Number(c.quantity || 1),
          totalAmount: Number(c.totalAmount),
          dueDate: c.dueDate || undefined
        }))

      await signup(
        formData.email,
        formData.password,
        formData.fullName,
        formData.businessName,
        formData.location,
        {
          motto: formData.motto.trim(),
          operationPeriodMode,
          revenueTarget: Number(revenueTarget || 0),
          openingCash: Number(openingCash || 0),
          initialProducts: validProducts,
          initialDebtors: validDebtors,
          initialCreditors: validCreditors
        }
      )

      toast({
        title: "Business Initialized Successfully!",
        description: `Welcome to UPshop Enterprise. Starting state configured with Shs ${Number(openingCash || 0).toLocaleString()} opening cash.`
      })
      router.push("/dashboard")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "Failed to initialize business account."
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-3 sm:p-6 md:p-10 font-body bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/login_bg.png')" }}
    >
      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md" />

      <Card className="relative z-10 w-full max-w-5xl md:max-w-6xl border border-white/20 bg-slate-900/75 backdrop-blur-2xl shadow-2xl rounded-3xl text-white overflow-hidden my-auto">
        <CardHeader className="text-center space-y-3 pb-5 border-b border-white/10 relative">
          {/* Top Return to Login Link */}
          <div className="absolute top-4 right-4 hidden sm:block">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-xs text-cyan-300 hover:text-cyan-200 hover:bg-white/10 font-bold gap-1 rounded-xl">
                <LogIn className="h-4 w-4" /> Existing Account? Sign In
              </Button>
            </Link>
          </div>

          <div className="flex justify-center mb-1">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 uppercase">
              UPshop Enterprise
            </h1>
          </div>

          {/* If viewing Welcome Slides (1, 2, 3) */}
          {welcomeSlide !== null ? (
            <div className="space-y-2">
              <CardTitle className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-wider flex items-center justify-center gap-2">
                <Sparkles className="h-6 w-6 text-cyan-400 animate-pulse" /> Welcome to UPshop Enterprise Console
              </CardTitle>
              <CardDescription className="font-medium text-slate-300 max-w-2xl mx-auto text-xs sm:text-sm">
                Discover the abilities, strengths, and advantages of managing your retail & wholesale enterprise with UPshop.
              </CardDescription>

              {/* Welcome Slides Indicator Pills */}
              <div className="flex items-center justify-center gap-2 pt-3 max-w-md mx-auto">
                {[
                  { num: 1, label: "Welcome & Speed" },
                  { num: 2, label: "All-In-One Power" },
                  { num: 3, label: "Why Trust UPshop" }
                ].map((s) => (
                  <button
                    key={s.num}
                    onClick={() => setWelcomeSlide(s.num)}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${welcomeSlide === s.num
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-400 text-white shadow-lg shadow-cyan-500/30 scale-105"
                        : "bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200"
                      }`}
                  >
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <CardTitle className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-wider flex items-center justify-center gap-2">
                <Sparkles className="h-6 w-6 text-cyan-400" /> Business Registration & Onboarding Wizard
              </CardTitle>
              <CardDescription className="font-medium text-slate-300 max-w-2xl mx-auto text-xs sm:text-sm">
                Initialize your business credentials, operating cash balance, initial stock inventory, and starting customer & supplier demands.
              </CardDescription>

              {/* Registration Step Progress Bar */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 pt-3 max-w-2xl mx-auto">
                {[
                  { num: 1, label: "1. Credentials" },
                  { num: 2, label: "2. Cash & Target" },
                  { num: 3, label: "3. Products" },
                  { num: 4, label: "4. Demands" },
                  { num: 5, label: "5. Confirm Launch" }
                ].map((s) => (
                  <div key={s.num} className="flex-1 flex flex-col items-center gap-1.5">
                    <div
                      className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center font-black text-xs sm:text-sm transition-all cursor-pointer ${step === s.num
                          ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white ring-4 ring-cyan-500/40 scale-110 shadow-lg shadow-cyan-500/50"
                          : step > s.num
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-800 text-slate-400 border border-white/10"
                        }`}
                      onClick={() => s.num < step && setStep(s.num)}
                    >
                      {step > s.num ? <CheckCircle2 className="h-5 w-5" /> : s.num}
                    </div>
                    <span className={`text-[11px] font-bold tracking-tight hidden md:block text-center ${step === s.num ? "text-cyan-300" : "text-slate-400"}`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-5 sm:p-8 md:p-10 space-y-6">
          {/* WELCOME SLIDE 1: Welcome & Core Application Strengths */}
          {welcomeSlide === 1 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-xl shadow-cyan-500/30 mb-2">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Welcome to UPshop Enterprise</h2>
                <p className="text-sm text-slate-300 max-w-xl mx-auto font-medium">
                  The smarter, faster way to run your retail business, manage stock inventory, and track financial statements in real-time.
                </p>
              </div>

              {/* 3 Core Strengths Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-slate-950/60 border border-cyan-500/30 rounded-2xl space-y-3 shadow-lg hover:border-cyan-400/60 transition-all">
                  <div className="h-12 w-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Zap className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-cyan-300">Lightning Fast Checkout</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Process sales in seconds with an intuitive Point of Sale interface designed for maximum speed, printed receipt generation, and multi-payment modes.
                  </p>
                </div>

                <div className="p-6 bg-slate-950/60 border border-sky-500/30 rounded-2xl space-y-3 shadow-lg hover:border-sky-400/60 transition-all">
                  <div className="h-12 w-12 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400">
                    <Package className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-sky-300">Smart Stock Inventory</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Real-time stock tracking across shop floor and warehouse, low-stock warnings, supplier intake restocks, and profit margin analysis.
                  </p>
                </div>

                <div className="p-6 bg-slate-950/60 border border-emerald-500/30 rounded-2xl space-y-3 shadow-lg hover:border-emerald-400/60 transition-all">
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-300">Clear Financial Statements</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Actionable real-time reports, cash inflow/outflow liquidity tracking, customer demand receivables, and supplier demand payables.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* WELCOME SLIDE 2: Everything You Need to Sell & Grow Smarter */}
          {welcomeSlide === 2 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl shadow-blue-500/30 mb-2">
                  <Layers className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Everything You Need to Sell & Grow Smarter</h2>
                <p className="text-sm text-slate-300 max-w-xl mx-auto font-medium">
                  Built for ambitious store owners who want complete power over sales, stock, ledgers, and staff without complexity.
                </p>
              </div>

              {/* 6 Capabilities Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                <div className="p-4 bg-slate-950/60 border border-white/10 rounded-2xl space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Seamless Payments</h4>
                  </div>
                  <p className="text-xs text-slate-300">Accept cash, mobile money, and credit sales with instant balance updates.</p>
                </div>

                <div className="p-4 bg-slate-950/60 border border-white/10 rounded-2xl space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg">
                      <Package className="h-5 w-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Inventory Control</h4>
                  </div>
                  <p className="text-xs text-slate-300">Track shop stock, warehouse stock, set low-stock alerts, and log restocks.</p>
                </div>

                <div className="p-4 bg-slate-950/60 border border-white/10 rounded-2xl space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Customer Demands</h4>
                  </div>
                  <p className="text-xs text-slate-300">Track credit sales, active customer demands, overdue debts, and payment logs.</p>
                </div>

                <div className="p-4 bg-slate-950/60 border border-white/10 rounded-2xl space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Supplier Demands</h4>
                  </div>
                  <p className="text-xs text-slate-300">Manage supplier liabilities, credit purchases, payout tracking, and due dates.</p>
                </div>

                <div className="p-4 bg-slate-950/60 border border-white/10 rounded-2xl space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Works Offline Anywhere</h4>
                  </div>
                  <p className="text-xs text-slate-300">Keep selling even when internet drops — data syncs automatically when reconnected.</p>
                </div>

                <div className="p-4 bg-slate-950/60 border border-white/10 rounded-2xl space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                      <Bot className="h-5 w-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white">JAHWI AI Co-Pilot</h4>
                  </div>
                  <p className="text-xs text-slate-300">Floating AI assistant for automated debt payouts, stock queries, and reports.</p>
                </div>
              </div>
            </div>
          )}

          {/* WELCOME SLIDE 3: Why Enterprises Trust UPshop */}
          {welcomeSlide === 3 && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-xl shadow-emerald-500/30 mb-2">
                  <ShieldCheck className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Why Enterprises Trust UPshop</h2>
                <p className="text-sm text-slate-300 max-w-xl mx-auto font-medium">
                  Join thousands of store owners who upgraded to UPshop and simplified their retail management.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
                {/* Left 3 items */}
                <div className="md:col-span-3 space-y-4">
                  <div className="p-4 bg-slate-950/60 border border-white/10 rounded-2xl flex items-start gap-4">
                    <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl mt-1">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">Bank-Level Security & Privacy</h4>
                      <p className="text-xs text-slate-300 mt-1">Your data and financial transactions are protected with encrypted local storage and secure server infrastructure.</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950/60 border border-white/10 rounded-2xl flex items-start gap-4">
                    <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl mt-1">
                      <Bot className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">Real-Time JAHWI AI Support</h4>
                      <p className="text-xs text-slate-300 mt-1">Intelligent co-pilot assistant ready to answer questions, handle settlements, and guide staff anytime.</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950/60 border border-white/10 rounded-2xl flex items-start gap-4">
                    <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl mt-1">
                      <Smartphone className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">Works on Any Device & OS</h4>
                      <p className="text-xs text-slate-300 mt-1">Use desktop (Windows Tauri app), tablets, web browsers, or phones. One account, consistent experience everywhere.</p>
                    </div>
                  </div>
                </div>

                {/* Right Trust Banner */}
                <div className="md:col-span-2 p-6 bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 rounded-3xl text-white shadow-2xl flex flex-col justify-between space-y-6">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-200 block">Trusted By</span>
                    <h3 className="text-3xl font-black mt-1">10,000+</h3>
                    <p className="text-xs font-semibold text-emerald-100 mt-0.5">Retailers & Wholesalers Worldwide</p>
                  </div>

                  <div className="space-y-2.5 text-xs font-bold border-t border-white/20 pt-4">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-200" /> Free updates forever
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-200" /> No hidden monthly fees
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-200" /> 99.9% uptime & offline resilience
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-200" /> Setup in under 5 minutes
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REGISTRATION WIZARD STEPS (1 to 5) */}
          {welcomeSlide === null && (
            <>
              {/* STEP 1: Account & Business Credentials */}
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="border-l-4 border-cyan-400 pl-4 py-1.5 bg-cyan-950/20 rounded-r-xl">
                    <h3 className="text-xl font-bold text-cyan-300">Step 1: Administrator & Business Credentials</h3>
                    <p className="text-xs text-slate-300 mt-0.5">Set up your business identity, location, and owner login account. Press <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-white/20 text-cyan-300 text-[10px] font-mono">ENTER</kbd> to jump to the next field.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 font-bold text-xs uppercase text-slate-200">
                        <User className="h-4 w-4 text-cyan-400" /> Admin / Agent Full Name *
                      </Label>
                      <Input
                        id="step1-fullName"
                        placeholder="e.g. John Doe"
                        className="h-12 border-white/20 bg-slate-950/60 text-white placeholder:text-slate-500 rounded-xl"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        onKeyDown={(e) => handleEnterNavigation(e, 'step1-businessName')}
                      />
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Info className="h-3 w-3 text-cyan-400" /> Official name of the business owner or main system manager.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 font-bold text-xs uppercase text-slate-200">
                        <Building className="h-4 w-4 text-cyan-400" /> Business Enterprise Name *
                      </Label>
                      <Input
                        id="step1-businessName"
                        placeholder="e.g. Acme Supermarket Ltd"
                        className="h-12 border-white/20 bg-slate-950/60 text-white placeholder:text-slate-500 rounded-xl"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        onKeyDown={(e) => handleEnterNavigation(e, 'step1-motto')}
                      />
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Info className="h-3 w-3 text-cyan-400" /> Registered store or shop name displayed on invoices and reports.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 font-bold text-xs uppercase text-slate-200">
                        <Quote className="h-4 w-4 text-cyan-400" /> Business Slogan / Motto
                      </Label>
                      <Input
                        id="step1-motto"
                        placeholder="e.g. Quality Products & Excellent Service"
                        className="h-12 border-white/20 bg-slate-950/60 text-white placeholder:text-slate-500 rounded-xl"
                        value={formData.motto}
                        onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
                        onKeyDown={(e) => handleEnterNavigation(e, 'step1-location')}
                      />
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Info className="h-3 w-3 text-cyan-400" /> Brand slogan printed at the top of POS receipts.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 font-bold text-xs uppercase text-slate-200">
                        <MapPin className="h-4 w-4 text-cyan-400" /> Business Location Address *
                      </Label>
                      <Input
                        id="step1-location"
                        placeholder="e.g. Kampala, Central Market Street"
                        className="h-12 border-white/20 bg-slate-950/60 text-white placeholder:text-slate-500 rounded-xl"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        onKeyDown={(e) => handleEnterNavigation(e, 'step1-email')}
                      />
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Info className="h-3 w-3 text-cyan-400" /> Physical location or city address of your store branch.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 font-bold text-xs uppercase text-slate-200">
                        <Mail className="h-4 w-4 text-cyan-400" /> Master Username / Email *
                      </Label>
                      <Input
                        id="step1-email"
                        placeholder="e.g. admin@acme.com"
                        className="h-12 border-white/20 bg-slate-950/60 text-white placeholder:text-slate-500 rounded-xl"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        onKeyDown={(e) => handleEnterNavigation(e, 'step1-password')}
                      />
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Info className="h-3 w-3 text-cyan-400" /> Your login username or email address to access UPshop.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 font-bold text-xs uppercase text-slate-200">
                        <Key className="h-4 w-4 text-cyan-400" /> Master Password *
                      </Label>
                      <Input
                        id="step1-password"
                        type="password"
                        placeholder="Create secure password"
                        className="h-12 border-white/20 bg-slate-950/60 text-white placeholder:text-slate-500 rounded-xl"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        onKeyDown={(e) => handleEnterNavigation(e, undefined, handleNextStep)}
                      />
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Info className="h-3 w-3 text-cyan-400" /> Press <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-white/20 text-cyan-300 text-[10px]">ENTER</kbd> to proceed to Step 2.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Operating Setup & Opening Liquidity */}
              {step === 2 && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="border-l-4 border-cyan-400 pl-4 py-1.5 bg-cyan-950/20 rounded-r-xl">
                    <h3 className="text-xl font-bold text-cyan-300">Step 2: Operating Period & Opening Cash at Hand</h3>
                    <p className="text-xs text-slate-300 mt-0.5">Configure reporting period mode and enter your physical cash balance on day 1.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 font-bold text-xs uppercase text-slate-200">
                        <Calendar className="h-4 w-4 text-cyan-400" /> Operational Period Tracking Mode
                      </Label>
                      <Select value={operationPeriodMode} onValueChange={(val: any) => setOperationPeriodMode(val)}>
                        <SelectTrigger id="step2-mode" className="h-12 border-white/20 bg-slate-950/60 text-white rounded-xl">
                          <SelectValue placeholder="Select Period Mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weeks">Week Mode (Week 1 to Week 52)</SelectItem>
                          <SelectItem value="months">Month Mode (January to December)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Info className="h-3 w-3 text-cyan-400" /> Choose whether performance reports group metrics by Weeks or Months.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 font-bold text-xs uppercase text-slate-200">
                        <Target className="h-4 w-4 text-cyan-400" /> Period Sales Target Goal (Shs)
                      </Label>
                      <Input
                        id="step2-target"
                        type="number"
                        placeholder="e.g. 5000000"
                        className="h-12 border-white/20 bg-slate-950/60 text-white placeholder:text-slate-500 rounded-xl font-mono font-bold"
                        value={revenueTarget}
                        onChange={(e) => setRevenueTarget(e.target.value)}
                        onKeyDown={(e) => handleEnterNavigation(e, 'step2-cash')}
                      />
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Info className="h-3 w-3 text-cyan-400" /> Optional revenue goal for your current period progress bar.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 p-6 bg-cyan-950/30 border border-cyan-500/40 rounded-2xl">
                    <Label className="flex items-center gap-2 font-black text-sm uppercase text-cyan-300">
                      <DollarSign className="h-5 w-5 text-emerald-400" /> Starting Cash at Hand / Opening Liquidity Balance (Shs)
                    </Label>
                    <p className="text-xs text-slate-300">
                      Enter your physical store cash or mobile money balance available in your register before joining UPshop. This sets your opening balance accurately in financial statements.
                    </p>
                    <Input
                      id="step2-cash"
                      type="number"
                      placeholder="Enter starting cash amount (e.g. 500000)"
                      className="h-14 border-cyan-400/50 bg-slate-950/80 text-emerald-400 text-xl font-black font-mono rounded-xl"
                      value={openingCash}
                      onChange={(e) => setOpeningCash(e.target.value)}
                      onKeyDown={(e) => handleEnterNavigation(e, undefined, handleNextStep)}
                    />
                    <p className="text-[11px] text-emerald-300 font-medium flex items-center gap-1">
                      <Info className="h-3 w-3 text-emerald-400" /> Press <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-white/20 text-cyan-300 text-[10px]">ENTER</kbd> to proceed to Step 3.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 3: Initial Inventory Products (Fast Table Layout) */}
              {step === 3 && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-cyan-400 pl-4 py-1.5 bg-cyan-950/20 rounded-r-xl">
                    <div>
                      <h3 className="text-xl font-bold text-cyan-300">Step 3: Initial Products Inventory (Fast Bulk Entry)</h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Quickly add existing shop stock rows. Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-white/20 text-cyan-300 text-[10px] font-mono">ENTER</kbd> in any cell to navigate to the next input or add a new row automatically!
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => handleAddProductRow(1)} size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs gap-1 rounded-xl">
                        <Plus className="h-3.5 w-3.5" /> +1 Row
                      </Button>
                      <Button onClick={() => handleAddProductRow(5)} size="sm" variant="outline" className="border-cyan-400/40 text-cyan-300 hover:bg-cyan-950 text-xs font-bold gap-1 rounded-xl">
                        <Plus className="h-3.5 w-3.5" /> +5 Rows
                      </Button>
                      <Button onClick={handleClearProducts} size="sm" variant="ghost" className="text-slate-400 hover:text-red-300 text-xs font-bold rounded-xl">
                        Clear
                      </Button>
                    </div>
                  </div>

                  {/* Fast Spreadsheet Table */}
                  <div className="border border-white/15 rounded-2xl overflow-hidden bg-slate-950/50 shadow-inner max-h-[380px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-slate-900 sticky top-0 z-10 border-b border-white/10">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-12 text-slate-400 font-bold text-[11px] uppercase">#</TableHead>
                          <TableHead className="font-bold text-[11px] uppercase text-cyan-300 min-w-[180px]">Product Name *</TableHead>
                          <TableHead className="font-bold text-[11px] uppercase text-slate-300 w-32">Category</TableHead>
                          <TableHead className="font-bold text-[11px] uppercase text-emerald-400 w-36">Selling Price (Shs)</TableHead>
                          <TableHead className="font-bold text-[11px] uppercase text-slate-300 w-36">Buying Price (Shs)</TableHead>
                          <TableHead className="font-bold text-[11px] uppercase text-cyan-400 w-28">Shop Stock</TableHead>
                          <TableHead className="font-bold text-[11px] uppercase text-sky-400 w-32">Warehouse Stock</TableHead>
                          <TableHead className="w-12 text-right font-bold text-[11px] uppercase">Del</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {initialProducts.map((p, rIdx) => (
                          <TableRow key={rIdx} className="hover:bg-white/5 border-b border-white/5">
                            <TableCell className="text-slate-500 font-mono text-xs font-bold">{rIdx + 1}</TableCell>
                            <TableCell>
                              <Input
                                id={`prod-input-${rIdx}-0`}
                                placeholder="e.g. bulb"
                                className="h-9 text-xs bg-slate-900/80 border-white/15 text-white placeholder:text-slate-600 rounded-lg"
                                value={p.name}
                                onChange={(e) => handleProductChange(rIdx, 'name', e.target.value)}
                                onKeyDown={(e) => handleKeyDownProduct(e, rIdx, 0)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                id={`prod-input-${rIdx}-1`}
                                placeholder="Groceries"
                                className="h-9 text-xs bg-slate-900/80 border-white/15 text-white placeholder:text-slate-600 rounded-lg"
                                value={p.category}
                                onChange={(e) => handleProductChange(rIdx, 'category', e.target.value)}
                                onKeyDown={(e) => handleKeyDownProduct(e, rIdx, 1)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                id={`prod-input-${rIdx}-2`}
                                type="number"
                                placeholder="4000"
                                className="h-9 text-xs bg-slate-900/80 border-white/15 text-emerald-400 font-mono font-bold placeholder:text-slate-600 rounded-lg"
                                value={p.price}
                                onChange={(e) => handleProductChange(rIdx, 'price', e.target.value)}
                                onKeyDown={(e) => handleKeyDownProduct(e, rIdx, 2)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                id={`prod-input-${rIdx}-3`}
                                type="number"
                                placeholder="3200"
                                className="h-9 text-xs bg-slate-900/80 border-white/15 text-slate-300 font-mono placeholder:text-slate-600 rounded-lg"
                                value={p.buyingPrice}
                                onChange={(e) => handleProductChange(rIdx, 'buyingPrice', e.target.value)}
                                onKeyDown={(e) => handleKeyDownProduct(e, rIdx, 3)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                id={`prod-input-${rIdx}-4`}
                                type="number"
                                placeholder="50"
                                className="h-9 text-xs bg-slate-900/80 border-white/15 text-cyan-300 font-mono font-bold placeholder:text-slate-600 rounded-lg"
                                value={p.shopStock}
                                onChange={(e) => handleProductChange(rIdx, 'shopStock', e.target.value)}
                                onKeyDown={(e) => handleKeyDownProduct(e, rIdx, 4)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                id={`prod-input-${rIdx}-5`}
                                type="number"
                                placeholder="100"
                                className="h-9 text-xs bg-slate-900/80 border-white/15 text-sky-300 font-mono font-bold placeholder:text-slate-600 rounded-lg"
                                value={p.warehouseStock}
                                onChange={(e) => handleProductChange(rIdx, 'warehouseStock', e.target.value)}
                                onKeyDown={(e) => handleKeyDownProduct(e, rIdx, 5)}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              {initialProducts.length > 1 && (
                                <button
                                  onClick={() => handleRemoveProductRow(rIdx)}
                                  className="text-slate-500 hover:text-red-400 transition-colors p-1"
                                  title="Delete Row"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <p className="text-xs text-slate-400 italic flex items-center justify-between">
                    <span>Tip: You can add as many product rows as needed or skip this step and add products later in Store Management.</span>
                    <span className="font-bold text-cyan-300">{initialProducts.filter(p => p.name.trim() !== '').length} Valid Products Ready</span>
                  </p>
                </div>
              )}

              {/* STEP 4: Customer Demands & Supplier Demands */}
              {step === 4 && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="border-l-4 border-cyan-400 pl-4 py-1.5 bg-cyan-950/20 rounded-r-xl">
                    <h3 className="text-xl font-bold text-cyan-300">Step 4: Existing Customer Demands & Supplier Demands (Optional)</h3>
                    <p className="text-xs text-slate-300 mt-0.5">Import active demands so they immediately appear in Debtors & Creditors ledgers. Press <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-white/20 text-cyan-300 text-[10px]">ENTER</kbd> to jump between fields.</p>
                  </div>

                  {/* Customer Demands (Receivables) */}
                  <div className="space-y-3 bg-slate-950/40 p-5 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-amber-400" />
                        <div>
                          <span className="text-sm font-bold uppercase text-amber-300 block">Existing Customer Demands (Accounts Receivable)</span>
                          <span className="text-[11px] text-slate-400">Demands against customers who owe your business money prior to joining UPshop.</span>
                        </div>
                      </div>
                      <Button onClick={handleAddDebtorRow} size="sm" variant="outline" className="h-8 text-xs border-amber-400/40 text-amber-300 hover:bg-amber-400/10 font-bold gap-1">
                        <Plus className="h-3.5 w-3.5" /> Add Customer Demand
                      </Button>
                    </div>

                    {initialDebtors.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">No active customer demands added. Click "Add Customer Demand" if customers owe you.</p>
                    ) : (
                      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-[11px] font-bold text-amber-300 uppercase px-1">
                          <span>Customer Name *</span>
                          <span>Demand Amount (Shs) *</span>
                          <span>Expected Date of Payment *</span>
                          <span className="text-right">Action</span>
                        </div>
                        {initialDebtors.map((d, idx) => (
                          <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                            <Input
                              id={`debtor-name-${idx}`}
                              placeholder="e.g. John Mukasa"
                              className="h-10 text-xs bg-slate-950 border-white/20 text-white"
                              value={d.customerName}
                              onChange={(e) => handleDebtorChange(idx, 'customerName', e.target.value)}
                              onKeyDown={(e) => handleEnterNavigation(e, `debtor-total-${idx}`)}
                            />
                            <Input
                              id={`debtor-total-${idx}`}
                              type="number"
                              placeholder="Demand Amount (Shs)"
                              className="h-10 text-xs bg-slate-950 border-white/20 font-mono text-amber-400 font-bold"
                              value={d.total}
                              onChange={(e) => handleDebtorChange(idx, 'total', e.target.value)}
                              onKeyDown={(e) => handleEnterNavigation(e, `debtor-date-${idx}`)}
                            />
                            <div className="space-y-1">
                              <Input
                                id={`debtor-date-${idx}`}
                                type="date"
                                className="h-10 text-xs bg-slate-950 border-white/20 text-white font-medium"
                                value={d.dueDate}
                                onChange={(e) => handleDebtorChange(idx, 'dueDate', e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    if (idx + 1 < initialDebtors.length) {
                                      document.getElementById(`debtor-name-${idx + 1}`)?.focus()
                                    } else {
                                      const supplierInput = document.getElementById('creditor-name-0')
                                      if (supplierInput) supplierInput.focus()
                                      else handleNextStep()
                                    }
                                  }
                                }}
                              />
                            </div>
                            <div className="flex items-center justify-end">
                              <button onClick={() => handleRemoveDebtorRow(idx)} className="text-slate-400 hover:text-red-400 p-2" title="Delete Row">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Supplier Demands (Payables) */}
                  <div className="space-y-3 bg-slate-950/40 p-5 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-rose-400" />
                        <div>
                          <span className="text-sm font-bold uppercase text-rose-300 block">Existing Supplier Demands (Accounts Payable)</span>
                          <span className="text-[11px] text-slate-400">Demands from suppliers whom your business owes money for past stock deliveries.</span>
                        </div>
                      </div>
                      <Button onClick={handleAddCreditorRow} size="sm" variant="outline" className="h-8 text-xs border-rose-400/40 text-rose-300 hover:bg-rose-400/10 font-bold gap-1">
                        <Plus className="h-3.5 w-3.5" /> Add Supplier Demand
                      </Button>
                    </div>

                    {initialCreditors.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">No active supplier demands added. Click "Add Supplier Demand" if suppliers demand payment.</p>
                    ) : (
                      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-[11px] font-bold text-rose-300 uppercase px-1">
                          <span>Supplier Name *</span>
                          <span>Product Delivered</span>
                          <span>Demanded Amount (Shs) *</span>
                          <span>Date of Supplier Payout *</span>
                          <span className="text-right">Action</span>
                        </div>
                        {initialCreditors.map((c, idx) => (
                          <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                            <Input
                              id={`creditor-name-${idx}`}
                              placeholder="Supplier Name"
                              className="h-10 text-xs bg-slate-950 border-white/20 text-white"
                              value={c.supplierName}
                              onChange={(e) => handleCreditorChange(idx, 'supplierName', e.target.value)}
                              onKeyDown={(e) => handleEnterNavigation(e, `creditor-product-${idx}`)}
                            />
                            <Input
                              id={`creditor-product-${idx}`}
                              placeholder="e.g. Cables"
                              className="h-10 text-xs bg-slate-950 border-white/20 text-white"
                              value={c.productName}
                              onChange={(e) => handleCreditorChange(idx, 'productName', e.target.value)}
                              onKeyDown={(e) => handleEnterNavigation(e, `creditor-total-${idx}`)}
                            />
                            <Input
                              id={`creditor-total-${idx}`}
                              type="number"
                              placeholder="Demanded Amount (Shs)"
                              className="h-10 text-xs bg-slate-950 border-white/20 font-mono text-rose-400 font-bold"
                              value={c.totalAmount}
                              onChange={(e) => handleCreditorChange(idx, 'totalAmount', e.target.value)}
                              onKeyDown={(e) => handleEnterNavigation(e, `creditor-date-${idx}`)}
                            />
                            <div className="space-y-1">
                              <Input
                                id={`creditor-date-${idx}`}
                                type="date"
                                className="h-10 text-xs bg-slate-950 border-white/20 text-white font-medium"
                                value={c.dueDate}
                                onChange={(e) => handleCreditorChange(idx, 'dueDate', e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    if (idx + 1 < initialCreditors.length) {
                                      document.getElementById(`creditor-name-${idx + 1}`)?.focus()
                                    } else {
                                      handleNextStep()
                                    }
                                  }
                                }}
                              />
                            </div>
                            <div className="flex items-center justify-end">
                              <button onClick={() => handleRemoveCreditorRow(idx)} className="text-slate-400 hover:text-red-400 p-2" title="Delete Row">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 5: Final Review & Launch */}
              {step === 5 && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="border-l-4 border-emerald-400 pl-4 py-1.5 bg-emerald-950/20 rounded-r-xl">
                    <h3 className="text-xl font-bold text-emerald-400">Step 5: Review & Confirm Business System Launch</h3>
                    <p className="text-xs text-slate-300 mt-0.5">Review your initial starting state configuration before launching your enterprise console.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="p-5 bg-slate-950/60 rounded-2xl border border-white/10 space-y-2">
                      <span className="text-xs font-bold uppercase text-slate-400 block">Enterprise Credentials</span>
                      <p className="text-base font-black text-white">{formData.businessName}</p>
                      <p className="text-xs text-slate-300 font-semibold">{formData.fullName} ({formData.email})</p>
                      <p className="text-xs text-slate-400">{formData.location} • {formData.motto || "No motto set"}</p>
                    </div>

                    <div className="p-5 bg-slate-950/60 rounded-2xl border border-white/10 space-y-2">
                      <span className="text-xs font-bold uppercase text-slate-400 block">Operations & Opening Liquidity</span>
                      <p className="text-base font-black text-emerald-400">Opening Cash: Shs {Number(openingCash || 0).toLocaleString()}</p>
                      <p className="text-xs text-slate-300 font-semibold">Mode: {operationPeriodMode === 'weeks' ? 'Week Mode (1..52)' : 'Month Mode (Jan..Dec)'}</p>
                      <p className="text-xs text-slate-400">Sales Goal Target: Shs {Number(revenueTarget || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-950/40 border border-blue-500/30 rounded-2xl text-center">
                      <span className="text-[11px] font-bold uppercase text-blue-300 block">Starting Products</span>
                      <span className="text-xl font-black text-blue-400">
                        {initialProducts.filter(p => p.name.trim() !== '').length} Items
                      </span>
                    </div>
                    <div className="p-4 bg-amber-950/40 border border-amber-500/30 rounded-2xl text-center">
                      <span className="text-[11px] font-bold uppercase text-amber-300 block">Customer Demands</span>
                      <span className="text-xl font-black text-amber-400">
                        Shs {initialDebtors.reduce((acc, d) => acc + Number(d.total || 0), 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-4 bg-rose-950/40 border border-rose-500/30 rounded-2xl text-center">
                      <span className="text-[11px] font-bold uppercase text-rose-300 block">Supplier Demands</span>
                      <span className="text-xl font-black text-rose-400">
                        Shs {initialCreditors.reduce((acc, c) => acc + Number(c.totalAmount || 0), 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-slate-950/60 border-t border-white/10">
          {/* Footer Controls for Welcome Slides */}
          {welcomeSlide !== null ? (
            <>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {welcomeSlide > 1 && (
                  <Button
                    type="button"
                    onClick={() => setWelcomeSlide(prev => Math.max(1, (prev || 1) - 1))}
                    className="h-11 px-6 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 font-bold rounded-xl shadow-md gap-2"
                  >
                    <ArrowLeft className="h-4 w-4 text-cyan-400" /> Previous Slide
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setWelcomeSlide(null)}
                  className="text-xs text-slate-400 hover:text-white font-bold"
                >
                  Skip Intro & Register Directly
                </Button>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                {welcomeSlide < 3 ? (
                  <Button
                    type="button"
                    onClick={() => setWelcomeSlide(prev => Math.min(3, (prev || 1) + 1))}
                    className="h-12 px-7 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-950/60 gap-2"
                  >
                    Next Slide <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setWelcomeSlide(null)}
                    className="h-12 px-8 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-base rounded-xl shadow-xl shadow-emerald-950/60 gap-2"
                  >
                    Get Started & Register Business <ArrowRight className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </>
          ) : (
            /* Footer Controls for Registration Wizard Steps */
            <>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  type="button"
                  onClick={step === 1 ? () => setWelcomeSlide(1) : handlePrevStep}
                  className="h-11 px-6 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 font-bold rounded-xl shadow-md gap-2"
                >
                  <ArrowLeft className="h-4 w-4 text-cyan-400" /> {step === 1 ? "Welcome Intro" : "Back"}
                </Button>

                {step > 1 && step < 5 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(prev => prev + 1)}
                    className="h-11 px-4 bg-slate-900/60 hover:bg-slate-800 text-cyan-300 border-cyan-500/30 font-bold rounded-xl text-xs hover:border-cyan-400"
                    title="Skip this setup step"
                  >
                    Skip Step →
                  </Button>
                )}

                <Link href="/login" className="sm:hidden">
                  <Button variant="ghost" size="sm" className="text-xs text-cyan-300 hover:text-white">
                    Existing Account? Sign In
                  </Button>
                </Link>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                <p className="text-xs text-slate-400 hidden lg:block">
                  Already have an account? <Link href="/login" className="text-cyan-400 font-bold hover:underline">Sign In</Link>
                </p>

                {step < 5 ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="h-12 px-7 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-950/60 gap-2"
                  >
                    Next Step <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={loading}
                    className="h-12 px-8 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-base rounded-xl shadow-xl shadow-emerald-950/60 gap-2"
                  >
                    {loading ? "Launching Enterprise..." : "Confirm & Launch System"}
                  </Button>
                )}
              </div>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
