
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Database, Lock } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [activeRole, setActiveRole] = useState<"admin" | "agent">("admin")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password, activeRole)
      router.push("/dashboard")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: error.message || "Invalid credentials. Please try again."
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="relative min-h-screen flex items-center justify-center p-4 font-body bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/login_bg.png')" }}
    >
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs" />
      <Card className="relative z-10 w-full max-w-md border border-white/20 bg-slate-900/40 backdrop-blur-xl shadow-2xl rounded-2xl text-white">
        <CardHeader className="text-center space-y-2 pb-4">
          <div className="flex justify-center mb-1">
            <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 uppercase">
              UPshop
            </h1>
          </div>
          <CardTitle className="text-xl font-extrabold text-slate-200 tracking-wider uppercase">
            {activeRole === "admin" ? "Admin Console Login" : "Agent Console Login"}
          </CardTitle>
          <div className="w-16 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 mx-auto rounded-full mt-1 mb-2" />
          
          {/* Role Toggle Selector */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-950/60 rounded-xl border border-white/10 mt-3">
            <button
              type="button"
              onClick={() => setActiveRole("admin")}
              className={`py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                activeRole === "admin"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Login as Admin
            </button>
            <button
              type="button"
              onClick={() => setActiveRole("agent")}
              className={`py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                activeRole === "agent"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Login as Agent
            </button>
          </div>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label htmlFor="username" className="font-bold text-xs uppercase tracking-wider text-slate-300">
                {activeRole === "admin" ? "Admin Username" : "Agent Username"}
              </Label>
              <Input 
                id="username" 
                placeholder={activeRole === "admin" ? "Enter Admin Username" : "Enter Agent Username"}
                className="h-12 border-white/20 bg-slate-950/50 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/50 rounded-xl"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold text-xs uppercase tracking-wider text-slate-300">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                className="h-12 border-white/20 bg-slate-950/50 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/50 rounded-xl"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-6 pt-6 pb-8">
            <Button className="w-full h-12 text-lg font-bold bg-blue-600/90 hover:bg-blue-600 text-white border border-white/20 shadow-lg shadow-blue-900/50 rounded-xl transition-all" type="submit" disabled={loading}>
              {loading ? "Authenticating..." : `LOGIN AS ${activeRole.toUpperCase()}`}
            </Button>
            {activeRole === "admin" && (
              <div className="text-center space-y-2 animate-in fade-in duration-200">
                <p className="text-sm font-medium text-slate-300">
                  First time here? <Link href="/signup" className="text-blue-400 font-bold hover:underline underline-offset-4 decoration-2">Register Business</Link>
                </p>
              </div>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
