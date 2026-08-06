"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mail, Phone, Github } from "lucide-react"
import Image from "next/image"
import { useAppVersion } from "@/hooks/use-app-version"

export default function AboutPage() {
  const appVersion = useAppVersion()
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-primary">About UPshop Management</h1>
        <p className="text-muted-foreground font-medium">Learn more about our application and mission</p>
      </div>

      <Card className="border-none shadow-md">
        <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <CardTitle className="text-2xl">UPshop Management</CardTitle>
        </CardHeader>
        <CardContent className="pt-8 space-y-6">
          <p className="text-base leading-relaxed">
            UPshop Management is a modern business management solution designed to help entrepreneurs, retailers, and small-to-medium enterprises efficiently manage their daily business operations. The system provides a reliable, secure, and user-friendly platform that simplifies business processes, improves productivity, and supports better decision-making through organized data management.
          </p>
          <p className="text-base leading-relaxed text-muted-foreground">
            The application integrates essential business tools into one centralized system, allowing users to manage different aspects of their business with ease while maintaining accuracy and efficiency.
          </p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle>Key Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              "Dashboard Overview",
              "Inventory Management",
              "Store Management",
              "Point of Sale (POS)",
              "Sales Tracking",
              "Performance Analytics",
              "Business Intelligence & Targets",
              "Returns Management",
              "Operational Period Management",
              "Business Reporting",
              "Business Performance Monitoring"
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="font-medium text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle>Technology & Philosophy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            UPshop Management is built with a strong emphasis on:
          </p>
          <div className="grid gap-3">
            {[
              { title: "Speed", desc: "Lightning-fast performance for real-time operations" },
              { title: "Reliability", desc: "Dependable system with data persistence and backups" },
              { title: "Simplicity", desc: "Intuitive interface requiring minimal training" },
              { title: "Scalability", desc: "Grows with your business needs" }
            ].map((item) => (
              <div key={item.title} className="border-l-4 border-primary pl-4 py-2">
                <h4 className="font-bold text-primary">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-md bg-gradient-to-br from-accent/5 to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Developer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 bg-white/50 p-3 rounded-2xl border border-slate-100/50 w-fit">
            <div className="relative h-16 w-16 rounded-xl overflow-hidden border-2 border-primary/20 shadow-md">
              <Image 
                src="/developer_portrait.jpg" 
                alt="Matovu Shafik" 
                fill 
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Developer</p>
              <p className="text-xl font-black text-primary">Matovu Shafik</p>
            </div>
          </div>

          <p className="leading-relaxed">
            Designed and developed with the vision of delivering practical, affordable, and scalable digital solutions for businesses of all sizes. The mission is to empower entrepreneurs by providing modern technology that streamlines operations, enhances efficiency, and supports sustainable business growth.
          </p>

          <div className="space-y-3">
            <p className="text-sm font-bold text-muted-foreground mb-3">CONTACT INFORMATION</p>
            {[
              { icon: Phone, label: "Primary", value: "+256 709 889 228" },
              { icon: Phone, label: "Alternative", value: "+256 767 129 079" },
              { icon: Mail, label: "Email", value: "shafikmatovuv2@gmail.com" }
            ].map((contact) => (
              <div key={contact.value} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100">
                <contact.icon className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">{contact.label}</p>
                  <p className="font-medium">{contact.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-4">
              For technical support, software installation, customization, maintenance services, feature requests, system upgrades, partnership opportunities, or general business inquiries, please feel free to contact using any of the details above.
            </p>
            <p className="text-sm font-medium text-accent">
              Your feedback, suggestions, and recommendations are highly appreciated and play an important role in improving future versions of UPshop Management.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-md border-2 border-dashed border-primary/20">
        <CardContent className="pt-8 text-center space-y-4 flex flex-col items-center">
          <p className="text-sm font-medium text-muted-foreground">
            Thank you for choosing UPshop Management as your trusted business management solution.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-primary">System v{appVersion}</span>
          </div>
          <div className="relative h-44 w-44 rounded-2xl overflow-hidden border border-slate-100 shadow-xl bg-black mt-2">
            <Image 
              src="/fikmen_logo.png" 
              alt="FIKMEN M&S Logo" 
              fill 
              className="object-contain p-2"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
