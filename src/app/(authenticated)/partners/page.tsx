"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Handshake, Building2, Plus, Phone, Mail, MapPin, Search, Trash2, DollarSign, Calendar, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { printThermalReceipt } from "@/lib/print-receipt"

interface Partner {
  id: string
  name: string
  category: string
  contactPerson: string
  phone: string
  email: string
  location: string
}

export default function PartnersPage() {
  const { user, token } = useAuth()
  const { toast } = useToast()

  const [userProfile, setUserProfile] = useState<any>(null)
  const [partners, setPartners] = useState<Partner[]>([])
  const [creditors, setCreditors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [contactPerson, setContactPerson] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [location, setLocation] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  // Settlement modal state
  const [selectedCreditor, setSelectedCreditor] = useState<any>(null)
  const [settlementAmount, setSettlementAmount] = useState("")

  const fetchData = async () => {
    if (!token) return
    try {
      setLoading(true)

      const profileRes = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (profileRes.ok) setUserProfile(await profileRes.json())

      const partnersRes = await fetch('/api/partners', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (partnersRes.ok) {
        setPartners(await partnersRes.json())
      }

      const creditorsRes = await fetch('/api/creditors', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (creditorsRes.ok) {
        setCreditors(await creditorsRes.json())
      }
    } catch (e) {
      console.error('Failed to fetch partners/creditors:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const handleGlobalUpdate = () => fetchData()
    window.addEventListener('upshop_data_updated', handleGlobalUpdate)
    return () => window.removeEventListener('upshop_data_updated', handleGlobalUpdate)
  }, [token])

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !token) return

    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          category: category || "General Supplier",
          contactPerson: contactPerson || name,
          phone: phone || "+256 700 000 000",
          email: email || "supplier@partner.com",
          location: location || "Kampala"
        })
      })

      if (res.ok) {
        toast({ title: "Partner Registered", description: `Added ${name} to partners directory.` })
        setName("")
        setCategory("")
        setContactPerson("")
        setPhone("")
        setEmail("")
        setLocation("")
        fetchData()
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to register partner." })
    }
  }

  const handleDeletePartner = async (id: string) => {
    if (!token) return
    try {
      const res = await fetch('/api/partners', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id })
      })
      if (res.ok) {
        toast({ title: "Partner Removed", description: "Supplier partner removed successfully." })
        fetchData()
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to remove partner." })
    }
  }

  const handleSettlePayment = async () => {
    if (!selectedCreditor || !settlementAmount || !token) return
    const amt = Number(settlementAmount)
    if (amt <= 0) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a payment amount greater than zero." })
      return
    }

    try {
      const res = await fetch('/api/creditors/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          creditorId: selectedCreditor.id,
          amount: amt
        })
      })

      if (res.ok) {
        toast({ title: "Settlement Recorded", description: `Paid Shs ${amt.toLocaleString()} to ${selectedCreditor.supplierName}` })
        setSelectedCreditor(null)
        setSettlementAmount("")
        fetchData()
        window.dispatchEvent(new Event("upshop_data_updated"))
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to process settlement." })
    }
  }

  const filtered = partners.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.contactPerson && p.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="p-6 md:p-8 space-y-8 font-body max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-primary flex items-center gap-3">
          <Handshake className="h-8 w-8 text-accent" /> Business Partners & Creditor Settlements
        </h1>
        <p className="text-sm font-semibold text-muted-foreground mt-1">
          Vendor directory, supply chain contracts, and accounts payable settlements for {userProfile?.businessName || user?.businessName || "UPshop Enterprise"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Partner Form */}
        <Card className="lg:col-span-1 border-slate-200 shadow-lg bg-white rounded-2xl h-fit">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
              <Plus className="h-5 w-5 text-accent" /> Add Supplier Partner
            </CardTitle>
            <CardDescription className="text-xs">
              Register a new vendor or wholesale supplier
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleAddPartner}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Partner Company Name</Label>
                <Input 
                  placeholder="e.g. Apex Imports Ltd" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="h-11 border-slate-200" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Supply Category</Label>
                <Input 
                  placeholder="e.g. Beverages / Hardware" 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)} 
                  className="h-11 border-slate-200" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Primary Contact Person</Label>
                <Input 
                  placeholder="e.g. John Doe" 
                  value={contactPerson} 
                  onChange={(e) => setContactPerson(e.target.value)} 
                  className="h-11 border-slate-200" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Phone</Label>
                  <Input 
                    placeholder="+256 700..." 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    className="h-11 border-slate-200" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Email</Label>
                  <Input 
                    placeholder="email@vendor.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="h-11 border-slate-200" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Location Address</Label>
                <Input 
                  placeholder="e.g. Industrial Area" 
                  value={location} 
                  onChange={(e) => setLocation(e.target.value)} 
                  className="h-11 border-slate-200" 
                />
              </div>
              <Button type="submit" className="w-full h-12 text-base font-bold shadow-lg mt-2">
                Register Business Partner
              </Button>
            </CardContent>
          </form>
        </Card>

        {/* Partners Directory Table */}
        <Card className="lg:col-span-2 border-slate-200 shadow-lg bg-white rounded-2xl">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" /> Active Partners Directory
              </CardTitle>
              <CardDescription className="text-xs">{partners.length} supplier vendor(s) registered</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search partners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 border-slate-200 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm max-h-[350px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase">Company</TableHead>
                    <TableHead className="font-bold text-xs uppercase">Category</TableHead>
                    <TableHead className="font-bold text-xs uppercase">Contact Person</TableHead>
                    <TableHead className="font-bold text-xs uppercase">Phone / Email</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((partner) => (
                    <TableRow key={partner.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <p className="font-bold text-primary">{partner.name}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-2.5 w-2.5" /> {partner.location || "Uganda"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold">
                          {partner.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-slate-800">{partner.contactPerson}</TableCell>
                      <TableCell className="text-xs text-muted-foreground space-y-0.5">
                        <p className="flex items-center gap-1"><Phone className="h-3 w-3 text-emerald-600" /> {partner.phone}</p>
                        <p className="flex items-center gap-1"><Mail className="h-3 w-3 text-blue-600" /> {partner.email}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePartner(partner.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground italic text-xs">
                        No partners registered.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Creditors Accounts Payable & Settlement Panel */}
      <Card className="border-none shadow-xl bg-white rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-600 to-orange-700 text-white p-6">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-amber-200" />
            Creditor Accounts Payable & Settlements
          </CardTitle>
          <CardDescription className="text-amber-100">
            Manage supplier debt balances, pay off credit purchases, and keep track of accounts payable liabilities
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-xs uppercase">Supplier / Vendor</TableHead>
                  <TableHead className="font-bold text-xs uppercase">Product Purchased</TableHead>
                  <TableHead className="font-bold text-xs uppercase">Total Credit</TableHead>
                  <TableHead className="font-bold text-xs uppercase">Paid</TableHead>
                  <TableHead className="font-bold text-xs uppercase">Balance Owed</TableHead>
                  <TableHead className="font-bold text-xs uppercase">Due Date</TableHead>
                  <TableHead className="font-bold text-xs uppercase">Status</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditors.map((c) => {
                  const remaining = c.totalAmount - (c.amountPaid || 0)
                  const isSettled = c.status === 'settled' || remaining <= 0

                  return (
                    <TableRow key={c.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <p className="font-bold text-slate-900">{c.supplierName}</p>
                        <p className="text-[10px] text-slate-500 font-semibold">{c.supplierContact || 'No contact specified'}</p>
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-slate-800">
                        {c.productName} ({c.quantity} {c.unitType || 'pcs'})
                      </TableCell>
                      <TableCell className="font-mono font-bold text-xs">Shs {c.totalAmount?.toLocaleString()}</TableCell>
                      <TableCell className="font-mono font-bold text-xs text-emerald-600">Shs {(c.amountPaid || 0)?.toLocaleString()}</TableCell>
                      <TableCell className="font-mono font-bold text-xs text-amber-700">Shs {remaining?.toLocaleString()}</TableCell>
                      <TableCell className="text-xs font-semibold text-slate-600">
                        {c.dueDate ? new Date(c.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge className={isSettled ? "bg-green-100 text-green-700 font-bold text-[10px]" : "bg-amber-100 text-amber-800 font-bold text-[10px]"}>
                          {isSettled ? "Settled" : "Unpaid"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!isSettled ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedCreditor(c)
                              setSettlementAmount(String(remaining))
                            }}
                            className="h-8 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                          >
                            Settle Balance
                          </Button>
                        ) : (
                          <span className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1">
                            <CheckCircle2 className="h-4 w-4" /> Paid
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {creditors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground italic text-xs">
                      No creditor credit purchases recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Settle Creditor Modal */}
      {selectedCreditor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl border-none bg-white rounded-2xl overflow-hidden">
            <CardHeader className="bg-amber-600 text-white p-6">
              <CardTitle className="text-xl font-bold">Settle Supplier Balance</CardTitle>
              <CardDescription className="text-amber-100 font-semibold mt-1">
                Record payout towards {selectedCreditor.supplierName}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>Product Purchased:</span>
                  <span className="font-bold">{selectedCreditor.productName}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>Total Bill Amount:</span>
                  <span className="font-mono font-bold">Shs {selectedCreditor.totalAmount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold text-amber-900 border-t border-amber-200 pt-1 font-bold">
                  <span>Current Outstanding Owed:</span>
                  <span className="font-mono text-amber-700 text-sm">Shs {(selectedCreditor.totalAmount - (selectedCreditor.amountPaid || 0))?.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase text-slate-600">Payment Amount (Shs)</Label>
                <Input 
                  type="number"
                  value={settlementAmount}
                  onChange={(e) => setSettlementAmount(e.target.value)}
                  className="h-12 border-slate-200 text-lg font-bold font-mono"
                  placeholder="Enter amount paid"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setSelectedCreditor(null)}
                  className="flex-1 h-12 font-bold"
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={handleSettlePayment}
                  className="flex-1 h-12 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  Confirm Payout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

