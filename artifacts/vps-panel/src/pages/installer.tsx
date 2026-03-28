import React, { useState } from "react";
import { PageTransition } from "@/components/page-transition";
import { Terminal, Copy, Check, ShieldAlert, Cpu } from "lucide-react";
import { motion } from "framer-motion";

export default function Installer() {
  const [copied, setCopied] = useState(false);
  const script = `curl -sSL ${window.location.origin}/install.sh | sudo bash`;

  const handleCopy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <header className="text-center space-y-4 mb-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(0,212,255,0.2)]"
          >
            <Terminal className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="text-4xl lg:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-secondary">
            Deploy Nexus Agent
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect a new bare-metal server or VPS to the Nexus control plane using our secure one-line installation script.
          </p>
        </header>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl border border-primary/30 overflow-hidden shadow-2xl"
        >
          <div className="bg-black/60 px-6 py-4 border-b border-white/10 flex justify-between items-center">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive/50" />
              <div className="w-3 h-3 rounded-full bg-[#ffb800]/50" />
              <div className="w-3 h-3 rounded-full bg-[#00ff88]/50" />
            </div>
            <span className="text-xs font-mono text-muted-foreground">root@server:~</span>
          </div>

          <div className="p-8 relative">
            <pre className="font-mono text-lg text-glow-cyan text-primary overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
              {script}
            </pre>

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-wider hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] hover:-translate-y-0.5 transition-all"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? "Copied to Clipboard" : "Copy Command"}
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-2xl p-6 border border-white/5"
          >
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-secondary">
              <Cpu className="w-5 h-5" /> System Requirements
            </h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#00ff88]" /> Ubuntu 22.04 / Debian 11+
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#00ff88]" /> SystemD Init System
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#00ff88]" /> Root / Sudo Access
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#00ff88]" /> Minimum 512MB RAM
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl p-6 border border-white/5 bg-destructive/5"
          >
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-destructive">
              <ShieldAlert className="w-5 h-5" /> Security Warning
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Running curl piped directly into bash executes the script immediately with root privileges. We recommend inspecting the script source before installation if you are deploying to a production environment.
            </p>
            <p className="text-xs font-mono text-destructive/80">
              SHA256: Inspect installer on host before execution.
            </p>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
