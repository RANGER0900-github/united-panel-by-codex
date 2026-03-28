import React from "react";
import { PageTransition } from "@/components/page-transition";
import { useGetHostCapabilities, useGetHostInfo } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Cpu, Network, Box, RefreshCw, HardDrive, Terminal } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Host() {
  const queryClient = useQueryClient();
  const { data: caps, isFetching: isFetchingCaps, refetch: refetchCaps } = useGetHostCapabilities();
  const { data: info, isFetching: isFetchingInfo, refetch: refetchInfo } = useGetHostInfo();

  const handleRefresh = () => {
    refetchCaps();
    refetchInfo();
  };

  const isFetching = isFetchingCaps || isFetchingInfo;

  return (
    <PageTransition>
      <div className="space-y-8 pb-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground">Host Diagnostics</h1>
            <p className="text-muted-foreground mt-1">Deep system capabilities and compatibility analysis.</p>
          </div>
          
          <button 
            onClick={handleRefresh}
            disabled={isFetching}
            className="px-5 py-2.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(0,212,255,0.2)] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Run Diagnostics
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Card */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 glass-card rounded-2xl border border-primary/20 overflow-hidden relative"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />
            <div className="p-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Terminal className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-1 font-mono text-glow-cyan">{info?.hostname || 'unknown-host'}</h3>
              <p className="text-muted-foreground text-sm uppercase tracking-wider mb-6">Primary Node</p>

              <div className="space-y-4 text-sm">
                <InfoRow label="OS Distribution" value={info?.os} />
                <InfoRow label="Kernel Version" value={info?.kernel} />
                <InfoRow label="Architecture" value={info?.arch} />
                <div className="my-4 border-t border-white/5" />
                <InfoRow label="Physical Cores" value={info?.cpuCount?.toString()} />
                <InfoRow label="Total Memory" value={`${info ? (info.totalMemoryMb / 1024).toFixed(1) : 0} GB`} />
                <InfoRow label="Total Storage" value={`${info?.totalDiskGb} GB`} />
                <div className="my-4 border-t border-white/5" />
                <InfoRow label="Public IPv4" value={info?.publicIp || 'NAT/None'} isMonospace />
              </div>
            </div>
          </motion.div>

          {/* Capabilities Grid */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CapabilityCard 
                title="KVM Virtualization" 
                enabled={caps?.kvm || false} 
                icon={Cpu}
                desc="Hardware-accelerated full virtualization support for high-performance VMs."
                delay={0.1}
              />
              <CapabilityCard 
                title="Docker Engine" 
                enabled={caps?.docker || false} 
                icon={Box}
                desc="Native container runtime available for lightweight deployments."
                delay={0.2}
              />
              <CapabilityCard 
                title="SystemD Service Manager" 
                enabled={caps?.systemd || false} 
                icon={RefreshCw}
                desc="Modern init system required for reliable service management and logging."
                delay={0.3}
              />
              <CapabilityCard 
                title="Public IPv4 Allocation" 
                enabled={caps?.publicIpv4 || false} 
                icon={Network}
                desc="Direct internet routing capability without NAT layer."
                delay={0.4}
              />
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-card rounded-2xl p-6 border border-white/10"
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-secondary" /> Environment Topology
              </h3>
              
              <div className="flex flex-wrap gap-4">
                <TopologyBadge label="Host Mode" value={caps?.hostMode} color="bg-primary/20 text-primary border-primary/50" />
                <TopologyBadge label="Startup" value={caps?.startupMode} color="bg-secondary/20 text-secondary border-secondary/50" />
                <TopologyBadge label="Access" value={caps?.accessMode} color="bg-accent/20 text-accent border-accent/50" />
              </div>

              {caps?.mountPoints && caps.mountPoints.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Detected Mount Points</p>
                  <div className="flex flex-wrap gap-2">
                    {caps.mountPoints.map(mp => (
                      <span key={mp} className="px-2.5 py-1 rounded bg-black/50 border border-white/10 font-mono text-xs text-muted-foreground">
                        {mp}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

function InfoRow({ label, value, isMonospace }: { label: string, value?: string, isMonospace?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${isMonospace ? 'font-mono text-primary' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}

function CapabilityCard({ title, desc, enabled, icon: Icon, delay }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
      className={`glass-card rounded-xl p-5 border transition-colors ${enabled ? 'border-[#00ff88]/30 shadow-[inset_0_0_20px_rgba(0,255,136,0.05)]' : 'border-white/5 opacity-60'}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className={`p-2 rounded-lg ${enabled ? 'bg-[#00ff88]/10' : 'bg-white/5'}`}>
          <Icon className={`w-5 h-5 ${enabled ? 'text-[#00ff88]' : 'text-muted-foreground'}`} />
        </div>
        {enabled ? (
          <CheckCircle2 className="w-5 h-5 text-[#00ff88]" />
        ) : (
          <XCircle className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
      <h4 className={`font-semibold mb-1 ${enabled ? 'text-foreground' : 'text-muted-foreground'}`}>{title}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </motion.div>
  );
}

function TopologyBadge({ label, value, color }: { label: string, value?: string, color: string }) {
  if (!value) return null;
  return (
    <div className={`px-4 py-2 rounded-xl border ${color} bg-opacity-10 flex flex-col`}>
      <span className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">{label}</span>
      <span className="font-bold font-mono tracking-wide">{value.toUpperCase()}</span>
    </div>
  );
}
