"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Database, 
  Download, 
  Search, 
  Users, 
  ShieldAlert, 
  RefreshCw,
  Copy,
  Check,
  Trash2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function DevDashboardPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Double check authorization: only dev-admin (fikmen) should view this page
  useEffect(() => {
    if (!token || !user) {
      router.push("/login")
      return
    }

    if (user.id !== "dev-admin" || user.email !== "fikmen") {
      toast({
        variant: "destructive",
        title: "Access Restricted",
        description: "This area is restricted to authorized systems developers only."
      })
      router.push("/dashboard")
      return
    }

    fetchUsers()
  }, [user, token, router])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/dev/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else {
        throw new Error('Failed to retrieve registered accounts.')
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (targetUserId: string, username: string) => {
    const newPwd = prompt(`Enter new plain-text password for agent "${username}":`)
    if (newPwd === null) return
    if (!newPwd.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Password cannot be empty." })
      return
    }

    try {
      const response = await fetch('/api/dev/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId, newPassword: newPwd })
      })

      if (response.ok) {
        toast({ title: "Account Updated", description: `Password for ${username} is now plain text.` })
        fetchUsers()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update password.")
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update Failed", description: err.message })
    }
  }

  const handleDeleteUser = async (targetUserId: string, username: string) => {
    if (targetUserId === "dev-admin") return
    
    const confirmDelete = confirm(
      `WARNING: Are you absolutely sure you want to delete the account "${username}"?\n\nThis will permanently delete this account and all its related products, sales logs, returns, stock movements, and configurations from the database.`
    )
    if (!confirmDelete) return

    try {
      const response = await fetch('/api/dev/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId })
      })

      if (response.ok) {
        toast({ title: "Account Deleted", description: `Successfully deleted "${username}" and all related data.` })
        fetchUsers()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete account.")
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Deletion Failed", description: err.message })
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast({
      title: "Copied to Clipboard",
      description: "Value successfully copied."
    })
    setTimeout(() => setCopiedId(null), 2000)
  }

  const downloadBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(users, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", `upshop_backup_accounts_${new Date().toISOString().split('T')[0]}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
    
    toast({
      title: "Backup Exported",
      description: "JSON Database Accounts file downloaded successfully."
    })
  }

  const filteredUsers = users.filter((u: any) => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.businessName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center gap-2">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        <span className="font-bold text-muted-foreground">Decrypting Credentials Database...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-body">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-red-950/10 p-6 rounded-2xl border border-red-500/20">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-red-600 flex items-center gap-2 tracking-tight">
            <ShieldAlert className="h-8 w-8 animate-pulse" />
            Developer Command Center
          </h1>
          <p className="text-muted-foreground text-sm font-semibold">
            System Database Administrator Console | Backup & Accounts Decryption Mode
          </p>
        </div>
        <Button 
          onClick={downloadBackup}
          className="bg-red-600 hover:bg-red-700 text-white font-black h-11 px-6 shadow-md flex items-center gap-2"
        >
          <Download className="h-5 w-5" /> Export DB Accounts Backup
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-black text-muted-foreground tracking-widest flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Total Userbases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-4xl font-black text-primary">{users.length}</span>
            <p className="text-xs font-bold text-muted-foreground mt-2 uppercase">Registered Business Accounts</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-black text-muted-foreground tracking-widest flex items-center gap-2">
              <Database className="h-4 w-4 text-red-600" />
              DB Registry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none font-bold px-3 py-1">
              Active Sync
            </Badge>
            <p className="text-xs font-bold text-muted-foreground mt-3.5 uppercase">Tauri & LocalStorage Decryption</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-black text-muted-foreground tracking-widest flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-600" />
              Dev Credentials Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-mono text-sm font-black text-red-600">BYPASS ENCRYPTIONS</span>
            <p className="text-xs font-bold text-muted-foreground mt-3.5 uppercase">Recoverable Account Passwords</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl bg-white overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <CardTitle className="text-lg font-black text-primary flex items-center gap-2">
              Registered Accounts Registry
            </CardTitle>
            <CardDescription className="font-medium text-muted-foreground">
              Detailed list containing user ids, full names, business profiles, and actual account passwords.
            </CardDescription>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Filter registered users..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 border-slate-200"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="font-black text-slate-800">User ID</TableHead>
                  <TableHead className="font-black text-slate-800">Username</TableHead>
                  <TableHead className="font-black text-slate-800">Full Name</TableHead>
                  <TableHead className="font-black text-slate-800">Business / Entity</TableHead>
                  <TableHead className="font-black text-slate-800">Location</TableHead>
                  <TableHead className="font-black text-slate-800">Actual Account Password</TableHead>
                  <TableHead className="font-black text-slate-800 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u: any) => (
                  <TableRow key={u.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono text-xs font-bold text-slate-600">
                      <div className="flex items-center gap-1">
                        <span>{u.id.slice(0, 8)}...</span>
                        <button 
                          onClick={() => copyToClipboard(u.id, `${u.id}-id`)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-800 transition-colors"
                        >
                          {copiedId === `${u.id}-id` ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-slate-800">{u.email}</TableCell>
                    <TableCell className="font-semibold text-slate-700">{u.fullName || 'N/A'}</TableCell>
                    <TableCell className="font-bold text-primary">{u.businessName || 'N/A'}</TableCell>
                    <TableCell className="font-medium text-slate-600">{u.location || 'N/A'}</TableCell>
                    <TableCell className="font-mono text-xs font-bold text-red-600 max-w-[240px]">
                      <div className="flex items-center gap-1.5 justify-between">
                        {u.passwordHash && u.passwordHash.startsWith('$2a$') ? (
                          <div className="flex flex-col gap-1">
                            <span className="truncate max-w-[120px] text-red-700/60" title={u.passwordHash}>{u.passwordHash}</span>
                            <span className="text-[9px] text-amber-600 font-sans uppercase font-bold animate-pulse">⚠️ BCrypt Hash</span>
                          </div>
                        ) : (
                          <span className="truncate max-w-[160px] text-green-600 font-black" title={u.passwordHash}>{u.passwordHash}</span>
                        )}
                        <div className="flex items-center gap-1 shrink-0">
                          <button 
                            onClick={() => copyToClipboard(u.passwordHash, `${u.id}-hash`)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-800 transition-colors"
                            title="Copy Password Value"
                          >
                            {copiedId === `${u.id}-hash` ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                          </button>
                          <Button 
                            onClick={() => handleResetPassword(u.id, u.email)}
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-slate-400 hover:text-primary hover:bg-slate-200"
                            title="Reset to Plain Text Password"
                          >
                            ✏️
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {u.id !== "dev-admin" && (
                        <Button 
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete Account & Data"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground italic">
                      No matching user accounts registered on this terminal.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
