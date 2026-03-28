import React, { useMemo, memo, useEffect, useState } from "react";
import { PageTransition } from "@/components/page-transition";
import { api, connectSocket } from "@/api/client";
import { Cpu, HardDrive, MemoryStick, Activity, Server, AlertTriangle, ShieldCheck } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [health, setHealth] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await api.get("/api/health");
        setHealth({ status: "ok", uptime: response.data?.data?.uptime });
      } catch (err) {
        console.error("Failed to load health", err);
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchHost = async () => {
      try {
        const response = await api.get("/api/host");
        setMetrics(response.data?.data);
      } catch (err) {
        console.error("Failed to load host metrics", err);
      }
    };
    fetchHost();
    const interval = setInterval(fetchHost, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchVps = async () => {
      try {
        const response = await api.get("/api/vps");
        setInstances(response.data?.data || []);
      } catch (err) {
        console.error("Failed to load instances", err);
      }
    };
    fetchVps();
    const interval = setInterval(fetchVps, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const socket = connectSocket();
    socket.on("metrics", (data: any) => {
      setMetrics(data);
      setHistory((prev) => [...prev, { ...data, timestamp: Date.now() }].slice(-60));
    });
    return () => socket.disconnect();
  }, []);

  const chartData = useMemo(() => {
    if (!history?.length) return [];
    return history.map(pt => ({
      ...pt,
      time: format(new Date(pt.timestamp), 'HH:mm')
    }));
  }, [history]);

  const runningInstances = useMemo(
    () => instances.filter(i => i.status === 'RUNNING').length || 0,
    [instances]
  );

  return (
    <PageTransition>
      <div className="space-y-8 pb-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground">Overview</h1>
            <p className="text-muted-foreground mt-1">Real-time telemetry and resource allocation.</p>
          </div>
          {health && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card neon-border rounded-xl px-5 py-3 flex items-center gap-3"
            >
              <div className={`w-3 h-3 rounded-full ${health.status === 'ok' ? 'bg-[#00ff88] shadow-[0_0_12px_#00ff88] animate-pulse' : 'bg-destructive shadow-[0_0_12px_#ff3366]'}`} />
              <div>
                <p className="text-sm font-medium text-foreground uppercase tracking-wider">Node Status</p>
                <p className="text-xs text-muted-foreground font-mono">
                  UPTIME: {health.uptime ? Math.floor(health.uptime / 3600) + 'H ' + Math.floor((health.uptime % 3600) / 60) + 'M' : '---'}
                </p>
              </div>
            </motion.div>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title="CPU Usage" value={`${metrics?.cpu_percent?.toFixed(1) ?? 0}%`} icon={Cpu} color="text-primary" progress={metrics?.cpu_percent ?? 0} delay={0.05} colorClass="bg-primary" />
          <MetricCard title="Memory Usage" value={`${((metrics?.ram_used_mb ?? 0) / Math.max(metrics?.ram_total_mb ?? 1, 1) * 100).toFixed(1)}%`} subtitle={`${metrics?.ram_used_mb ?? 0} / ${metrics?.ram_total_mb ?? 0} MB`} icon={MemoryStick} color="text-secondary" progress={((metrics?.ram_used_mb ?? 0) / Math.max(metrics?.ram_total_mb ?? 1, 1)) * 100} delay={0.1} colorClass="bg-secondary" />
          <MetricCard title="Disk Usage" value={`${((metrics?.disk_used_gb ?? 0) / Math.max(metrics?.disk_total_gb ?? 1, 1) * 100).toFixed(1)}%`} subtitle={`${metrics?.disk_used_gb ?? 0} / ${metrics?.disk_total_gb ?? 0} GB`} icon={HardDrive} color="text-accent" progress={((metrics?.disk_used_gb ?? 0) / Math.max(metrics?.disk_total_gb ?? 1, 1)) * 100} delay={0.15} colorClass="bg-accent" />
          <MetricCard title="Network Rx/Tx" value={`${((metrics?.net_rx_bps ?? 0) / 1048576).toFixed(2)} MB/s`} subtitle={`Tx: ${((metrics?.net_tx_bps ?? 0) / 1048576).toFixed(2)} MB/s`} icon={Activity} color="text-[#00ff88]" progress={0} delay={0.2} colorClass="bg-[#00ff88]" hideProgress />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="lg:col-span-2 glass-card rounded-2xl p-6 border border-white/5"
          >
            <div className="mb-6 flex justify-between items-center">
              <h3 className="text-xl font-semibold">Resource Telemetry</h3>
              <div className="flex gap-4 text-sm font-mono">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-primary/50 border border-primary" /> CPU
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-secondary/50 border border-secondary" /> RAM
                </div>
              </div>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(190 100% 50%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(190 100% 50%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(262 83% 58%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(262 83% 58%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#ffffff30" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#ffffff30" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(240 20% 5%)', borderColor: 'hsl(240 20% 15%)', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                    isAnimationActive={false}
                  />
                  <Area type="monotone" dataKey="cpuPercent" stroke="hsl(190 100% 50%)" fill="url(#colorCpu)" strokeWidth={2} isAnimationActive={false} dot={false} />
                  <Area type="monotone" dataKey="memoryPercent" stroke="hsl(262 83% 58%)" fill="url(#colorRam)" strokeWidth={2} isAnimationActive={false} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="glass-card rounded-2xl p-6 border border-white/5 flex flex-col gap-6"
          >
            <h3 className="text-xl font-semibold">Environment</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background/50 rounded-xl p-4 border border-white/5">
                <p className="text-muted-foreground text-sm font-medium">Total VPS</p>
                <p className="text-3xl font-bold font-mono mt-2">{instances.length ?? 0}</p>
              </div>
              <div className="bg-background/50 rounded-xl p-4 border border-primary/20 shadow-[inset_0_0_20px_rgba(0,212,255,0.05)]">
                <p className="text-primary text-sm font-medium">Running</p>
                <p className="text-3xl font-bold font-mono mt-2 text-glow-cyan">{runningInstances}</p>
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">System Alerts</h4>
              {health?.status === 'ok' ? (
                <div className="flex items-center justify-center h-28 flex-col text-muted-foreground gap-2">
                  <ShieldCheck className="w-8 h-8 opacity-40" />
                  <p className="text-sm">No active alerts. System stable.</p>
                </div>
              ) : (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive text-sm">Health Degraded</p>
                    <p className="text-xs text-muted-foreground mt-1">Check logs for details.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {instances.slice(0, 3).map(inst => (
                <div key={inst.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-sm font-mono text-foreground/80 truncate flex-1">{inst.name}</span>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ml-2 ${inst.status === 'RUNNING' ? 'bg-[#00ff88]' : 'bg-muted-foreground'}`} />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}

const MetricCard = memo(function MetricCard({ title, value, subtitle, icon: Icon, color, colorClass, progress, hideProgress = false, delay }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="glass-card neon-border rounded-2xl p-5 relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className={`w-16 h-16 ${color}`} />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <h3 className="font-medium text-muted-foreground text-sm uppercase tracking-wider">{title}</h3>
        </div>
        <p className={`text-3xl font-bold font-mono ${color}`}>{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1 font-mono">{subtitle}</p>}
        {!hideProgress && (
          <div className="w-full bg-background rounded-full h-1.5 mt-4 overflow-hidden border border-white/5">
            <div
              style={{ width: `${progress}%`, transition: 'width 1s ease-out' }}
              className={`h-full ${colorClass}`}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
});
