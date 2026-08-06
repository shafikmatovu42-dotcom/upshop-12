
"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth, useUser } from "@/lib/auth-context"
import { 
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { 
  LayoutDashboard, 
  Package, 
  Store, 
  ShoppingCart, 
  Bell, 
  RotateCcw, 
  Settings,
  LogOut,
  ChevronRight,
  Database,
  MapPin,
  Info,
  Users,
  FileText,
  Handshake,
  ShieldCheck
} from "lucide-react"

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Products", url: "/inventory", icon: Package },
  { title: "Store Management", url: "/store", icon: Store },
  { title: "Point of Sale", url: "/sales", icon: ShoppingCart },
  { title: "Reports & Accounts", url: "/reports", icon: FileText },
  { title: "Database", url: "/database", icon: Database },
  { title: "Partners", url: "/partners", icon: Handshake },
  { title: "Agents", url: "/agents", icon: Users },
  { title: "Business Management", url: "/notifications", icon: Bell },
  { title: "Returns", url: "/returns", icon: RotateCcw },
  { title: "About", url: "/about", icon: Info },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { logout, token } = useAuth()
  const { user } = useUser()
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    if (token && user) {
      const fetchProfile = async () => {
        try {
          const response = await fetch('/api/user/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (response.ok) {
            const profile = await response.json()
            setUserProfile(profile)
          }
        } catch (error) {
          console.error('Failed to fetch profile:', error)
        }
      }
      fetchProfile()
    }
  }, [token, user])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const isAdmin = !user?.role || user?.role === 'admin';

  const visibleItems = items.filter(item => {
    if (!isAdmin && (item.url === '/agents' || item.url === '/database' || item.url === '/reports' || item.url === '/partners')) {
      return false
    }
    return true
  })

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground shadow-lg">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-sidebar-foreground">UPSHOP</h1>
            <p className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-widest">
              {isAdmin ? "Admin Console" : "Agent Console"}
            </p>
          </div>
        </div>
        {userProfile && (
          <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl overflow-hidden border border-accent/30 shadow-sm shrink-0">
                <img 
                  src={userProfile.photoUrl || "https://picsum.photos/seed/agent/100/100"} 
                  alt="Agent" 
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black truncate text-accent">{userProfile.fullName}</p>
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/30 inline-block mt-0.5">
                  {user?.role === 'agent' ? 'Terminal Agent' : 'Business Admin'}
                </span>
              </div>
            </div>
            <SidebarSeparator className="bg-white/10 my-2" />
            <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest mb-1">Entity</p>
            <p className="text-sm font-bold truncate text-white">{userProfile.businessName}</p>
            <div className="flex items-center gap-1 text-[10px] opacity-60 mt-1">
              <MapPin className="h-2 w-2" />
              {userProfile.location}
            </div>
          </div>
        )}
      </SidebarHeader>
      <SidebarSeparator className="bg-sidebar-border/50" />
      <SidebarContent className="px-3 py-4">
        <SidebarMenu>
          {visibleItems.map((item) => (
            <SidebarMenuItem key={item.title} className="mb-1">
              <SidebarMenuButton asChild isActive={pathname === item.url} className="h-11 px-4 hover:bg-sidebar-accent transition-all duration-200">
                <Link href={item.url} className="flex items-center gap-3">
                  <item.icon className={`h-5 w-5 ${pathname === item.url ? 'text-accent' : 'text-sidebar-foreground/70'}`} />
                  <span className="font-medium">{item.title}</span>
                  {pathname === item.url && <ChevronRight className="ml-auto h-4 w-4 text-accent" />}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <SidebarSeparator className="mb-4 bg-sidebar-border/50" />
        <SidebarMenu>
          {user && user.email === 'fikmen' && user.id === 'dev-admin' && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="h-10 px-4 text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-colors" isActive={pathname === "/dev"}>
                <Link href="/dev" className="flex items-center gap-3 w-full">
                  <Database className={`h-5 w-5 ${pathname === "/dev" ? 'text-red-500' : 'text-red-400'}`} />
                  <span className="font-bold">Dev Command Center</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-10 px-4 hover:bg-sidebar-accent transition-colors" isActive={pathname === "/settings"}>
              <Link href="/settings" className="flex items-center gap-3 w-full">
                <Settings className={`h-5 w-5 ${pathname === "/settings" ? 'text-accent' : 'text-sidebar-foreground/70'}`} />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="h-10 px-4 text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-colors">
              <LogOut className="h-5 w-5" />
              <span>Exit System</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
