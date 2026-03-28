import React, { useEffect, useState } from "react";
import { PageTransition } from "@/components/page-transition";
import { api } from "@/api/client";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Cpu, HardDrive, Network, RefreshCw, Server } from "lucide-react";

export default function Host() {
  const [metrics, setMetrics] = useState<any>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [mounts, setMounts] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  const load = async () => {
    setIsFetching(true);
    try {
      const [hostRes, driversRes, storageRes] = await Promise.all([
        api.get("/api/host"),
        api.get("/api/drivers"),
        api.get("/api/storage"),
      ]);
      setMetrics(hostRes.data?.data);
      setDrivers(driversRes.data?.data?.drivers || []);
      setMounts(storageRes.data?.data?.mounts || []);
    } catch (err) {
      console.error("Failed to load host info", err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <PageTransition>
      <div className="space-y-8 pb-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground">Host Diagnostics</h1>
            <p className="text-muted-foreground mt-1">Resource profile and driver availability.</p>
          </div>
          <button
            onClick={load}
            disabled={isFetching}
            className="px-5 py-2.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(0,212,255,0.2)] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            Run Diagnostics
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 glass-card rounded-2xl border border-primary/20 overflow-hidden relative"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />
            <div className="p-6 space-y-4 text-sm">
              <InfoRow label="CPU Usage" value={`${metrics?.cpu_percent?.toFixed(1) ?? 0}%`} />
              <InfoRow label="RAM Used" value={`${metrics?.ram_used_mb ?? 0} MB`} />
              <InfoRow label="RAM Total" value={`${metrics?.ram_total_mb ?? 0} MB`} />
              <InfoRow label="Disk Used" value={`${metrics?.disk_used_gb ?? 0} GB`} />
              <InfoRow label="Disk Total" value={`${metrics?.disk_total_gb ?? 0} GB`} />
              <InfoRow label="Network RX" value={`${((metrics?.net_rx_bps ?? 0) / 1048576).toFixed(2)} MB/s`} />
              <InfoRow label="Network TX" value={`${((metrics?.net_tx_bps ?? 0) / 1048576).toFixed(2)} MB/s`} />
            </div>
          </motion.div>

          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {drivers.map((driver) => (
                <CapabilityCard
                  key={driver.id}
                  title={`${driver.name.toUpperCase()} Driver`}
                  enabled={driver.available}
                  icon={driver.name === "lxc" ? Cpu : driver.name === "gvisor" ? Server : Network}
                  desc={driver.best_for || "Driver availability"}
                />
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card rounded-2xl p-6 border border-white/10"
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-secondary" /> Mount Points
              </h3>
              <div className="flex flex-wrap gap-2">
                {mounts.length === 0 && (
                  <span className="text-xs text-muted-foreground">No mounts detected.</span>
                )}
                {mounts.map((mp) => (
                  <span key={mp.path} className="px-2.5 py-1 rounded bg-black/50 border border-white/10 font-mono text-xs text-muted-foreground">
                    {mp.path}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

function InfoRow({ label, value }: { label: string, value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function CapabilityCard({ title, desc, enabled, icon: Icon }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass-card rounded-xl p-5 border transition-colors ${enabled ? "border-[#00ff88]/30 shadow-[inset_0_0_20px_rgba(0,255,136,0.05)]" : "border-white/5 opacity-60"}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className={`p-2 rounded-lg ${enabled ? "bg-[#00ff88]/10" : "bg-white/5"}`}>
          <Icon className={`w-5 h-5 ${enabled ? "text-[#00ff88]" : "text-muted-foreground"}`} />
        </div>
        {enabled ? (
          <CheckCircle2 className="w-5 h-5 text-[#00ff88]" />
        ) : (
          <XCircle className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
      <h4 className={`font-semibold mb-1 ${enabled ? "text-foreground" : "text-muted-foreground"}`}>{title}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </motion.div>
  );
}
