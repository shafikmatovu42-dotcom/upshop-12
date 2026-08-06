"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Users, UserPlus, Trash2, Key, ShieldCheck, Search, RefreshCw, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface Agent {
  id: string
  adminId: string
  username: string
  passwordHash: string
  fullName: string
  status: string
  createdAt: string
}

export default function AgentsPage() {
  const { token, user } = useAuth()
  const { toast } = useToast()

  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Form states
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchAgents = async () => {
    if (!token) return
    setLoading(true)
    try {
      const response = await fetch('/api/agents', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setAgents(data)
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to load agents list." })
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [token])

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !username || !password) return
    setSubmitting(true)

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fullName, username, password })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to create agent')
      }

      toast({
        title: "Agent Account Created",
        description: `Agent ${fullName} (${username}) successfully registered.`
      })

      setFullName("")
      setUsername("")
      setPassword("")
      fetchAgents()
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: err.message
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteAgent = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete agent ${name}?`)) return

    try {
      const response = await fetch('/api/agents', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id })
      })

      if (response.ok) {
        toast({ title: "Agent Removed", description: `${name} has been removed.` })
        fetchAgents()
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to remove agent." })
    }
  }

  const filteredAgents = agents.filter(a => 
    a.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 md:p-8 space-y-8 font-body max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary flex items-center gap-3">
            <Users className="h-8 w-8 text-accent" /> Agent Management
          </h1>
          <p className="text-sm font-semibold text-muted-foreground mt-1">
            Register and manage business terminal agents for {user?.businessName || "UPshop Enterprise"}
          </p>
        </div>
        <Button onClick={fetchAgents} variant="outline" size="sm" className="gap-2 self-start md:self-auto">
          <RefreshCw className="h-4 w-4" /> Refresh List
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Agent Form */}
        <Card className="lg:col-span-1 border-slate-200 shadow-lg bg-white rounded-2xl h-fit">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-primary">
              <UserPlus className="h-5 w-5 text-accent" /> Create New Agent
            </CardTitle>
            <CardDescription className="text-xs">
              Set credentials to authorize an employee on your store terminals
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleCreateAgent}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agentName" className="text-xs font-bold uppercase text-muted-foreground">
                  Agent Full Name
                </Label>
                <Input
                  id="agentName"
                  placeholder="e.g. Sarah Jenkins"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-11 border-slate-200"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentUsername" className="text-xs font-bold uppercase text-muted-foreground">
                  Username
                </Label>
                <Input
                  id="agentUsername"
                  placeholder="e.g. sjenkins"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 border-slate-200"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentPassword" className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                  <Key className="h-3 w-3" /> Password
                </Label>
                <Input
                  id="agentPassword"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 border-slate-200"
                  required
                />
              </div>

              <Button type="submit" className="w-full h-12 text-base font-bold gap-2 mt-2 shadow-lg" disabled={submitting}>
                <UserCheck className="h-5 w-5" />
                {submitting ? "Registering..." : "Authorize Agent"}
              </Button>
            </CardContent>
          </form>
        </Card>

        {/* Agents Directory */}
        <Card className="lg:col-span-2 border-slate-200 shadow-lg bg-white rounded-2xl">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" /> Authorized Business Agents
              </CardTitle>
              <CardDescription className="text-xs">
                {agents.length} active agent account(s) registered
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 border-slate-200 text-xs"
              />
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="p-8 text-center text-muted-foreground font-medium">Loading registered agents...</div>
            ) : filteredAgents.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground space-y-2">
                <p className="font-bold">No agents registered yet.</p>
                <p className="text-xs">Use the form on the left to add your first employee agent account.</p>
              </div>
            ) : (
              <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-xs uppercase">Agent Name</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Username</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Status</TableHead>
                      <TableHead className="font-bold text-xs uppercase">Registered On</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgents.map((agent) => (
                      <TableRow key={agent.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-bold text-primary">{agent.fullName}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-700">{agent.username}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
                            {agent.status || 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(agent.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAgent(agent.id, agent.fullName)}
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Delete Agent Account"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
