"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { 
  Search, 
  Plus, 
  Filter, 
  ArrowUpDown, 
  Package, 
  Warehouse, 
  Store, 
  Edit2, 
  Sliders, 
  Trash2, 
  Tag, 
  Check, 
  X,
  Building2,
  DollarSign
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function InventoryPage() {
  const { token } = useAuth()
  const { toast } = useToast()

  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [editData, setEditData] = useState<any>({})
  const [selectedTypes, setSelectedTypes] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchProducts()
  }, [token])

  async function fetchProducts() {
    if (!token) return
    try {
      setLoading(true)
      const res = await fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setProducts(await res.json())
    } catch (e) {
      console.error(e)
    } finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return products.filter(p => !q || p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q) || (p.type || '').toLowerCase().includes(q))
  }, [products, searchTerm])

  const grouped = useMemo(() => {
    const m: Record<string, any[]> = {}
    for (const p of filtered) {
      const key = p.name
      if (!m[key]) m[key] = []
      m[key].push(p)
    }
    return Object.keys(m).map(name => ({ name, variants: m[name] }))
  }, [filtered])

  const handleSelectType = (productName: string, typeName: string) => {
    setSelectedTypes(prev => ({ ...prev, [productName]: typeName }))
    toast({ title: 'Type selected', description: `Showing ${typeName} for ${productName}` })
  }

  const startEdit = (product: any) => {
    setEditingProduct(product)
    setEditData({
      ...product,
      name: product.name || '',
      type: product.type || 'Standard',
      category: product.category || 'General',
      buyingPrice: product.buyingPrice ?? 0,
      price: product.price ?? 0,
      warehouseStock: product.warehouseStock ?? 0,
      shopStock: product.shopStock ?? 0,
      minStockLevel: product.minStockLevel ?? 5,
      piecesPerBox: product.piecesPerBox ?? 12,
      boxBuyingPrice: product.boxBuyingPrice ?? 0,
      boxSellingPrice: product.boxSellingPrice ?? 0,
      imageUrl: product.imageUrl || ''
    })
  }

  const saveEdit = async () => {
    if (!editingProduct || !token) return
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editData)
      })
      if (res.ok) {
        toast({ title: 'Saved', description: `Product ${editData.name} updated.` })
        setEditingProduct(null)
        fetchProducts()
      } else throw new Error('save failed')
    } catch (e) {
      console.error(e)
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save product.' })
    }
  }

  const deleteProduct = async (id: string) => {
    if (!token) return
    if (!window.confirm("Are you sure you want to delete this product item?")) return
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        toast({ title: 'Deleted', description: 'Product deleted successfully.' })
        setEditingProduct(null)
        fetchProducts()
      } else {
        throw new Error('Delete failed')
      }
    } catch (e) {
      console.error(e)
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete product.' })
    }
  }

  // Margin calculation for inspector
  const marginPerUnit = (Number(editData.price) || 0) - (Number(editData.buyingPrice) || 0)
  const marginPercent = Number(editData.price) > 0 
    ? Math.round((marginPerUnit / Number(editData.price)) * 100) 
    : 0

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Inventory Tracking</h1>
          <p className="text-muted-foreground font-medium">Full stock overview across Warehouse and Shop Floor.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" /> Filter
          </Button>
          <Button className="gap-2 bg-primary text-white hover:bg-primary/95" asChild>
            <Link href="/store">
              <Plus className="h-4 w-4" /> New Product
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-l-4 border-l-primary shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-extrabold uppercase text-slate-600 dark:text-slate-400">Total Products</CardTitle>
            <Package className="h-5 w-5 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900 dark:text-slate-100">{products.length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-accent shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-extrabold uppercase text-slate-600 dark:text-slate-400">Warehouse/Store Products</CardTitle>
            <Warehouse className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900 dark:text-slate-100">{products.reduce((s,p)=>s+(p.warehouseStock||0),0)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-extrabold uppercase text-slate-600 dark:text-slate-400">Active Shop Stock</CardTitle>
            <Store className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900 dark:text-slate-100">{products.reduce((s,p)=>s+(p.shopStock||0),0)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md bg-white dark:bg-slate-900">
        <CardHeader className="pb-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Search by name, category, or type..."
              className="pl-9 h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold shadow-inner"
              value={searchTerm}
              onChange={(e)=>setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-slate-100 dark:bg-slate-800">
                <TableHead className="w-[80px] font-black text-xs uppercase text-slate-700 dark:text-slate-300">Item</TableHead>
                <TableHead className="w-[180px] font-black text-xs uppercase text-slate-700 dark:text-slate-300">Product Name <ArrowUpDown className="inline ml-1 h-3.5 w-3.5" /></TableHead>
                <TableHead className="font-black text-xs uppercase text-slate-700 dark:text-slate-300">Category</TableHead>
                <TableHead className="font-black text-xs uppercase text-slate-700 dark:text-slate-300">Type</TableHead>
                <TableHead className="text-center font-black text-xs uppercase text-slate-700 dark:text-slate-300">Warehouse</TableHead>
                <TableHead className="text-center font-black text-xs uppercase text-slate-700 dark:text-slate-300">Shop Floor</TableHead>
                <TableHead className="font-black text-xs uppercase text-slate-700 dark:text-slate-300">Status</TableHead>
                <TableHead className="text-right font-black text-xs uppercase text-slate-700 dark:text-slate-300">Buying Price</TableHead>
                <TableHead className="text-right font-black text-xs uppercase text-slate-700 dark:text-slate-300">Selling Price</TableHead>
                <TableHead className="text-right font-black text-xs uppercase text-slate-700 dark:text-slate-300">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-10 font-bold text-slate-500">Loading inventory...</TableCell></TableRow>
              ) : grouped.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-10 font-bold text-slate-500">No products found.</TableCell></TableRow>
              ) : (
                grouped.map((group:any) => {
                  const sel = selectedTypes[group.name] || (group.variants[0].type || 'Standard')
                  const item = group.variants.find((v:any)=> (v.type||'Standard')===sel) || group.variants[0]
                  return (
                    <TableRow key={group.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <TableCell>
                        <div className="relative h-12 w-12 rounded-lg overflow-hidden border shadow-sm">
                          <Image src={item.imageUrl || 'https://picsum.photos/seed/placeholder/100/100'} alt={item.name} fill className="object-cover" />
                        </div>
                      </TableCell>
                      <TableCell className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-extrabold text-xs text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 py-0.5 px-2">{item.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <select value={sel} onChange={(e)=>handleSelectType(group.name, e.target.value)} className="h-9 rounded-md border border-slate-200 bg-slate-50 px-2 text-sm font-semibold">
                          {(Array.from(new Set(group.variants.map((v:any)=>v.type||'Standard'))) as string[]).map((t)=>(<option key={t} value={t}>{t}</option>))}
                        </select>
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-sm text-slate-800 dark:text-slate-200">{item.warehouseStock}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-sm text-slate-800 dark:text-slate-200">{item.shopStock}</TableCell>
                      <TableCell>
                        {item.shopStock <= (item.minStockLevel || 5) ? (
                          <Badge className="bg-amber-500 text-slate-950 font-black border-none px-2 py-0.5">Low Stock</Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold border-none px-2 py-0.5">Healthy</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-black text-amber-800 dark:text-amber-300 font-mono text-sm">Shs {(item.buyingPrice||0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-black text-emerald-700 dark:text-emerald-400 font-mono text-base">Shs {item.price?.toLocaleString?.() ?? item.price}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={()=>startEdit(item)} className="hover:text-primary hover:bg-slate-100 font-semibold gap-1.5 h-8 px-3"><Edit2 className="h-3.5 w-3.5"/> Edit</Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Product Inspector & Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <Card role="dialog" className="w-full max-w-2xl border-none shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95 duration-200 overflow-hidden my-8">
            <CardHeader className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary/20 rounded-lg text-primary-foreground border border-white/10">
                    <Sliders className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      Product Inspector
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-xs font-semibold">
                        {editData.type || "Standard"}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-slate-300 text-xs mt-0.5">
                      Inspect & modify product attributes, prices, stock allocations, and variation settings
                    </CardDescription>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setEditingProduct(null)}
                  className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Product Header summary & Profit preview banner */}
              <div className="flex flex-wrap items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 gap-3">
                <div className="flex items-center gap-3">
                  {editData.imageUrl ? (
                    <img src={editData.imageUrl} alt={editData.name} className="h-12 w-12 rounded-lg object-cover border" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                      <Package className="h-6 w-6 text-slate-500" />
                    </div>
                  )}
                  <div>
                    <div className="font-extrabold text-base text-slate-900 dark:text-slate-100">{editData.name || "Product Name"}</div>
                    <div className="text-xs font-medium text-slate-500">ID: {editingProduct.id}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Estimated Profit/Unit</span>
                    <span className={marginPerUnit >= 0 ? "text-emerald-600 dark:text-emerald-400 font-mono font-bold text-sm" : "text-rose-600 font-mono font-bold text-sm"}>
                      Shs {marginPerUnit.toLocaleString()} ({marginPercent}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 1: Basic Specifications */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-primary" /> General Specifications
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Product Name *</Label>
                    <Input 
                      value={editData.name || ''} 
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })} 
                      className="h-10 text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Product Type / Variation *</Label>
                    <Input 
                      value={editData.type || ''} 
                      onChange={(e) => setEditData({ ...editData, type: e.target.value })} 
                      placeholder="e.g. Standard, Pro, 600W"
                      className="h-10 text-xs font-bold text-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Category</Label>
                    <Input 
                      value={editData.category || ''} 
                      onChange={(e) => setEditData({ ...editData, category: e.target.value })} 
                      className="h-10 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Stock Allocations */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Warehouse className="h-3.5 w-3.5 text-amber-500" /> Stock Allocations & Low Stock Alerts
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Warehouse Stock (Units)</Label>
                    <Input 
                      type="number" 
                      value={editData.warehouseStock ?? ''} 
                      onChange={(e) => setEditData({ ...editData, warehouseStock: e.target.value === '' ? 0 : Number(e.target.value) })} 
                      className="h-10 text-xs font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Shop Floor Stock (Units)</Label>
                    <Input 
                      type="number" 
                      value={editData.shopStock ?? ''} 
                      onChange={(e) => setEditData({ ...editData, shopStock: e.target.value === '' ? 0 : Number(e.target.value) })} 
                      className="h-10 text-xs font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Low Stock Alert Threshold</Label>
                    <Input 
                      type="number" 
                      value={editData.minStockLevel ?? ''} 
                      onChange={(e) => setEditData({ ...editData, minStockLevel: e.target.value === '' ? 0 : Number(e.target.value) })} 
                      className="h-10 text-xs font-mono font-bold"
                      placeholder="e.g. 5"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Unit Pricing */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-500" /> Unit Pricing Structure
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Buying Unit Price (Cost, Shs)</Label>
                    <Input 
                      type="number" 
                      value={editData.buyingPrice ?? ''} 
                      onChange={(e) => setEditData({ ...editData, buyingPrice: e.target.value === '' ? 0 : Number(e.target.value) })} 
                      className="h-10 text-xs font-mono font-bold text-amber-700 dark:text-amber-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Selling Unit Price (Retail, Shs)</Label>
                    <Input 
                      type="number" 
                      value={editData.price ?? ''} 
                      onChange={(e) => setEditData({ ...editData, price: e.target.value === '' ? 0 : Number(e.target.value) })} 
                      className="h-10 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Box Packaging Configuration */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-indigo-500" /> Box / Packaging Configuration (Optional)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pieces Per Box</Label>
                    <Input 
                      type="number" 
                      value={editData.piecesPerBox ?? ''} 
                      onChange={(e) => setEditData({ ...editData, piecesPerBox: e.target.value === '' ? 0 : Number(e.target.value) })} 
                      placeholder="12"
                      className="h-10 text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Box Buying Price (Shs)</Label>
                    <Input 
                      type="number" 
                      value={editData.boxBuyingPrice ?? ''} 
                      onChange={(e) => setEditData({ ...editData, boxBuyingPrice: e.target.value === '' ? 0 : Number(e.target.value) })} 
                      placeholder="0"
                      className="h-10 text-xs font-mono font-bold text-amber-700 dark:text-amber-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Box Selling Price (Shs)</Label>
                    <Input 
                      type="number" 
                      value={editData.boxSellingPrice ?? ''} 
                      onChange={(e) => setEditData({ ...editData, boxSellingPrice: e.target.value === '' ? 0 : Number(e.target.value) })} 
                      placeholder="0"
                      className="h-10 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Image & Expiry */}
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Product Image URL</Label>
                    <Input 
                      value={editData.imageUrl || ''} 
                      onChange={(e) => setEditData({ ...editData, imageUrl: e.target.value })} 
                      placeholder="https://..."
                      className="h-10 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Expiry Date (Optional)</Label>
                    <Input 
                      type="date"
                      value={editData.expiryDate || ''} 
                      onChange={(e) => setEditData({ ...editData, expiryDate: e.target.value })} 
                      className="h-10 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t p-4 bg-slate-50 dark:bg-slate-800/40">
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => deleteProduct(editingProduct.id)} 
                className="h-10 font-bold gap-1.5 w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4" /> Delete Product
              </Button>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditingProduct(null)} 
                  className="h-10 font-bold px-4"
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={saveEdit} 
                  className="h-10 bg-primary text-white font-bold px-6 gap-1.5 shadow-md hover:bg-primary/90"
                >
                  <Check className="h-4 w-4" /> Save Changes
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
