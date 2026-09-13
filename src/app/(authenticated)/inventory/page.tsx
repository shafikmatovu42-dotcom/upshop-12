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
import { Search, Plus, Filter, ArrowUpDown, Package, Warehouse, Store, Edit2 } from "lucide-react"
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
    setEditData({ ...product })
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

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card role="dialog" className="w-full max-w-lg border-none shadow-2xl bg-white p-6 animate-in zoom-in-95 duration-200">
            <CardHeader className="p-0 pb-4 border-b">
              <CardTitle className="text-xl font-bold text-primary">Edit Product Details</CardTitle>
              <CardDescription className="text-slate-500 font-semibold mt-1">Modify inventory settings or remove this item</CardDescription>
            </CardHeader>
            <div className="py-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold">Product Name</Label>
                  <Input value={editData.name || ''} onChange={(e)=>setEditData({...editData, name: e.target.value})} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Category</Label>
                  <Input value={editData.category || ''} onChange={(e)=>setEditData({...editData, category: e.target.value})} className="h-11" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold">Buying Price</Label>
                  <Input type="number" value={editData.buyingPrice ?? ''} onChange={(e)=>setEditData({...editData, buyingPrice: e.target.value === '' ? 0 : Number(e.target.value)})} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Selling Price</Label>
                  <Input type="number" value={editData.price ?? ''} onChange={(e)=>setEditData({...editData, price: e.target.value === '' ? 0 : Number(e.target.value)})} className="h-11" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" size="sm" onClick={()=>setEditingProduct(null)} className="h-9">Cancel</Button>
              <Button size="sm" onClick={saveEdit} className="h-9 bg-primary text-white">Save</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
