"use client"

import { useState, useMemo, useEffect } from "react"
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
  Trash2
} from "lucide-react"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function InventoryPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Edit Product states
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editData, setEditData] = useState<any>({
    name: "",
    category: "",
    buyingPrice: 0,
    price: 0,
    warehouseStock: 0,
    shopStock: 0,
    minStockLevel: 5
  })

  const fetchProducts = async () => {
    if (!token) return
    try {
      setLoading(true)
      const response = await fetch('/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [token])

  // Keydown event listener for Edit Modal
  useEffect(() => {
    if (!editingProduct) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        setEditingProduct(null)
        setConfirmDelete(false)
      } else if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault()
        handleSaveChanges()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [editingProduct, editData, token])

  const filteredInventory = products.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = useMemo(() => {
    return products.reduce((acc, p) => ({
      warehouse: acc.warehouse + (p.warehouseStock || 0),
      shop: acc.shop + (p.shopStock || 0),
      total: acc.total + 1
    }), { warehouse: 0, shop: 0, total: 0 })
  }, [products])

  const handleStartEdit = (product: any) => {
    setEditingProduct(product)
    setConfirmDelete(false)
    setEditData({
      name: product.name,
      category: product.category,
      buyingPrice: product.buyingPrice || 0,
      price: product.price,
      warehouseStock: product.warehouseStock,
      shopStock: product.shopStock,
      minStockLevel: product.minStockLevel || 5
    })
  }

  const handleSaveChanges = async () => {
    if (!editingProduct || !token) return
    
    if (!editData.name.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Product name is required." })
      return
    }

    try {
      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editData)
      })

      if (response.ok) {
        toast({ title: "Product Updated", description: `Successfully updated details for "${editData.name}".` })
        setEditingProduct(null)
        setConfirmDelete(false)
        fetchProducts()
      } else {
        throw new Error('Failed to update')
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Could not save product updates." })
    }
  }

  const handleDeleteProduct = async () => {
    if (!editingProduct || !token) return

    try {
      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        toast({ title: "Product Deleted", description: `Successfully deleted "${editingProduct.name}" from inventory.` })
        setEditingProduct(null)
        setConfirmDelete(false)
        fetchProducts()
      } else {
        throw new Error('Failed to delete product')
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete product." })
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
            <div className="text-3xl font-black text-slate-900 dark:text-slate-100">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-accent shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-extrabold uppercase text-slate-600 dark:text-slate-400">Warehouse/Store Products</CardTitle>
            <Warehouse className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900 dark:text-slate-100">{stats.warehouse.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-extrabold uppercase text-slate-600 dark:text-slate-400">Active Shop Stock</CardTitle>
            <Store className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900 dark:text-slate-100">{stats.shop.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md bg-white dark:bg-slate-900">
        <CardHeader className="pb-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Search by name or category..."
              className="pl-9 h-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
                <TableRow><TableCell colSpan={9} className="text-center py-10 font-bold text-slate-500">Loading inventory...</TableCell></TableRow>
              ) : filteredInventory.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-10 font-bold text-slate-500">No products found.</TableCell></TableRow>
              ) : filteredInventory.map((item: any) => (
                <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <TableCell>
                    <div className="relative h-12 w-12 rounded-lg overflow-hidden border shadow-sm">
                      <Image 
                        src={item.imageUrl || "https://picsum.photos/seed/placeholder/100/100"} 
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-extrabold text-xs text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 py-0.5 px-2">{item.category}</Badge>
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
                  <TableCell className="text-right font-black text-amber-800 dark:text-amber-300 font-mono text-sm">
                    Shs {(item.buyingPrice || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-black text-emerald-700 dark:text-emerald-400 font-mono text-base">
                    Shs {item.price.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleStartEdit(item)}
                      className="hover:text-primary hover:bg-slate-100 font-semibold gap-1.5 h-8 px-3"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Product Modal */}
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
                  <Label htmlFor="edit-name" className="font-bold">Product Name</Label>
                  <Input 
                    id="edit-name" 
                    value={editData.name} 
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })} 
                    className="border-slate-200 h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category" className="font-bold">Category</Label>
                  <Input 
                    id="edit-category" 
                    value={editData.category} 
                    onChange={(e) => setEditData({ ...editData, category: e.target.value })} 
                    className="border-slate-200 h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-buyingPrice" className="font-bold">Buying Price (Shs / pc)</Label>
                  <Input 
                    id="edit-buyingPrice" 
                    type="number"
                    value={editData.buyingPrice} 
                    onChange={(e) => setEditData({ ...editData, buyingPrice: Number(e.target.value) })} 
                    className="border-slate-200 h-11 font-mono font-bold text-amber-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-price" className="font-bold">Selling Price (Shs / pc)</Label>
                  <Input 
                    id="edit-price" 
                    type="number"
                    value={editData.price} 
                    onChange={(e) => setEditData({ ...editData, price: Number(e.target.value) })} 
                    className="border-slate-200 h-11 font-mono font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-minStock" className="font-bold">Min Stock Alert Level</Label>
                <Input 
                  id="edit-minStock" 
                  type="number"
                  value={editData.minStockLevel} 
                  onChange={(e) => setEditData({ ...editData, minStockLevel: Number(e.target.value) })} 
                  className="border-slate-200 h-11"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-whStock" className="font-bold">Warehouse/Store Products</Label>
                  <Input 
                    id="edit-whStock" 
                    type="number"
                    value={editData.warehouseStock} 
                    onChange={(e) => setEditData({ ...editData, warehouseStock: Number(e.target.value) })} 
                    className="border-slate-200 h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-shopStock" className="font-bold">Shop Floor Stock</Label>
                  <Input 
                    id="edit-shopStock" 
                    type="number"
                    value={editData.shopStock} 
                    onChange={(e) => setEditData({ ...editData, shopStock: Number(e.target.value) })} 
                    className="border-slate-200 h-11"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t pt-4">
              {confirmDelete ? (
                <div className="flex items-center gap-2 animate-in fade-in">
                  <span className="text-xs font-bold text-rose-600">Delete product?</span>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleDeleteProduct}
                    className="h-9 font-bold px-3 bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    Confirm Delete
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setConfirmDelete(false)}
                    className="h-9 font-semibold text-slate-500"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => setConfirmDelete(true)}
                  className="h-11 font-bold text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Product
                </Button>
              )}

              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => { setEditingProduct(null); setConfirmDelete(false); }}
                  className="h-11 font-bold border-slate-200"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveChanges} 
                  className="h-11 bg-primary text-white hover:bg-primary/95 font-bold px-6"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

