import React from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Server, Cpu, TerminalSquare, Code, Activity, ShieldCheck } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { clearToken } from "@/api/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/instances", label: "Instances", icon: Server },
  { href: "/host", label: "Host System", icon: Cpu },
  { href: "/logs", label: "Live Logs", icon: TerminalSquare },
  { href: "/installer", label: "Installer", icon: Code },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    clearToken();
    setLocation("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      {/* Background Image Layer */}
      <div 
        className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-cover bg-center bg-no-repeat mix-blend-screen"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/cyber-bg.png)` }}
      />
      
      {/* Gradient overlays for depth */}
      <div className="absolute top-0 left-[20%] w-[40vw] h-[30vh] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-[10%] w-[30vw] h-[40vh] bg-secondary/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-20 w-64 border-r border-white/10 bg-sidebar/80 backdrop-blur-2xl flex flex-col shadow-2xl"
      >
        <div className="h-20 flex items-center px-6 border-b border-white/10">
          <Activity className="w-8 h-8 text-primary mr-3 animate-pulse" />
          <h1 className="text-xl font-display font-bold tracking-wider text-glow-cyan text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
            NEXUS<span className="text-foreground">.VPS</span>
          </h1>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          <div className="mb-4 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Main Navigation
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative",
                  isActive 
                    ? "bg-primary/10 text-primary shadow-[0_0_15px_rgba(0,212,255,0.15)]" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="sidebar-active" 
                    className="absolute inset-0 rounded-xl border border-primary/30"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon className={cn("w-5 h-5 relative z-10 transition-colors", isActive ? "text-primary" : "group-hover:text-foreground")} />
                <span className="font-medium relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/10">
          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#00ff88] shadow-[0_0_10px_#00ff88] animate-pulse" />
            <div className="text-sm">
              <p className="font-medium text-foreground">System Online</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">PING: 14ms</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-4 w-full py-2 rounded-lg text-xs uppercase tracking-widest border border-white/10 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:shadow-[0_0_10px_rgba(0,212,255,0.2)] transition-all"
          >
            Logout
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 relative z-10 overflow-y-auto overflow-x-hidden scroll-smooth">
        <div className="min-h-full p-8 lg:p-10">
          <AnimatePresence mode="wait">
            {children}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
