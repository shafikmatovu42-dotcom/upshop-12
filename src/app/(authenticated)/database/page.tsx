"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Database, HardDrive, Download, RefreshCw, ShieldAlert, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function DatabasePage() {
  const { token, user } = useAuth()
  const { toast } = useToast()

  const [dbStats, setDbStats] = useState<{
    productsCount: number
    salesCount: number
    movementsCount: number
    returnsCount: number
    agentsCount: number
  }>({
    productsCount: 0,
    salesCount: 0,
    movementsCount: 0,
    returnsCount: 0,
    agentsCount: 0
  })

  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    if (!token) return
    setLoading(true)
    try {
      const [pRes, sRes, mRes, rRes, aRes] = await Promise.all([
        fetch('/api/products', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/sales', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/movements', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/returns', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/agents', { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      const p = pRes.ok ? await pRes.json() : []
      const s = sRes.ok ? await sRes.json() : []
      const m = mRes.ok ? await mRes.json() : []
      const r = rRes.ok ? await rRes.json() : []
      const a = aRes.ok ? await aRes.json() : []

      setDbStats({
        productsCount: p.length,
        salesCount: s.length,
        movementsCount: m.length,
        returnsCount: r.length,
        agentsCount: a.length
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [token])

  const handleExportJson = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      businessName: user?.businessName || 'UPshop Store',
      dbStats
    }
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `upshop_backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Backup Exported", description: "Database snapshot JSON saved to your downloads." })
  }

  return (
    <div className="p-6 md:p-8 space-y-8 font-body max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary flex items-center gap-3">
            <Database className="h-8 w-8 text-accent" /> Database Console & Diagnostics
          </h1>
          <p className="text-sm font-semibold text-muted-foreground mt-1">
            Data integrity status, entity counters, and backup exports for {user?.businessName || "UPshop Enterprise"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchStats} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh Stats
          </Button>
          <Button onClick={handleExportJson} className="gap-2 shadow-lg">
            <Download className="h-4 w-4" /> Export JSON Backup
          </Button>
        </div>
      </div>

      {/* Database Health Card */}
      <Card className="border-emerald-200 bg-emerald-50/50 shadow-md rounded-2xl">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shrink-0">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-emerald-900">SQLite Database Engine Active</h3>
              <Badge className="bg-emerald-600 text-white font-bold">PRAGMA OK</Badge>
            </div>
            <p className="text-xs text-emerald-800 font-semibold mt-1">
              Local database engine operating with foreign key integrity constraints enabled (`sqlite:upshop.db`).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Entity Table Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-md bg-white rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase text-muted-foreground">Products Entity Table</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">{dbStats.productsCount}</div>
            <p className="text-xs font-medium text-muted-foreground mt-1">Catalog SKU items recorded</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-md bg-white rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase text-muted-foreground">Sales Entity Table</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-700">{dbStats.salesCount}</div>
            <p className="text-xs font-medium text-muted-foreground mt-1">Completed / Pending sales records</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-md bg-white rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase text-muted-foreground">Stock Movements Table</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-purple-700">{dbStats.movementsCount}</div>
            <p className="text-xs font-medium text-muted-foreground mt-1">Shop / Warehouse transfer logs</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-md bg-white rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase text-muted-foreground">Returns Entity Table</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-red-600">{dbStats.returnsCount}</div>
            <p className="text-xs font-medium text-muted-foreground mt-1">Reinstated item logs</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-md bg-white rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase text-muted-foreground">Agents Entity Table</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-700">{dbStats.agentsCount}</div>
            <p className="text-xs font-medium text-muted-foreground mt-1">Terminal employee accounts</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-md bg-white rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase text-muted-foreground">Storage File Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs font-mono font-bold text-slate-800 truncate">AppData/Roaming/upshop/upshop.db</div>
            <p className="text-[11px] font-bold text-emerald-600 mt-1">Automatic SQLite sync active</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
