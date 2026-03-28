import React, { useState, useCallback, memo } from "react";
import { PageTransition } from "@/components/page-transition";
import {
  useListInstances,
  useCreateInstance,
  useDeleteInstance,
  useStartInstance,
  useStopInstance,
  useRestartInstance,
  useGetHostCapabilities,
  getListInstancesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Play, Square, RotateCw, Trash2, Plus, Terminal, Cpu, MemoryStick,
  HardDrive, Copy, Check, Wifi, WifiOff, CloudLightning, ShieldAlert,
  Clock, Globe, Server, ChevronDown, ChevronUp, Key, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const OS_OPTIONS = [
  { value: "ubuntu-22.04", label: "Ubuntu 22.04 LTS" },
  { value: "ubuntu-20.04", label: "Ubuntu 20.04 LTS" },
  { value: "debian-12", label: "Debian 12" },
  { value: "debian-11", label: "Debian 11" },
  { value: "alpine-3.18", label: "Alpine 3.18" },
  { value: "centos-9", label: "CentOS Stream 9" },
  { value: "fedora-38", label: "Fedora 38" },
  { value: "arch-linux", label: "Arch Linux" },
];

const TIMEZONE_OPTIONS = [
  "UTC", "America/New_York", "America/Chicago", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Tokyo",
  "Asia/Singapore", "Asia/Kolkata", "Australia/Sydney",
];

export default function Instances() {
  const { data: instancesData, isLoading } = useListInstances({ query: { refetchInterval: 15000, staleTime: 10000 } });
  const { data: caps } = useGetHostCapabilities({ query: { staleTime: 60000 } });
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleCreateSuccess = useCallback(() => setIsCreateOpen(false), []);

  return (
    <PageTransition>
      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground">Instances</h1>
            <p className="text-muted-foreground mt-1">Deploy and manage virtual environments.</p>
          </div>
          <div className="flex items-center gap-3">
            {!caps?.publicIpv4 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs">
                <WifiOff className="w-3.5 h-3.5" />
                <span>No Public IPv4</span>
              </div>
            )}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <button className="px-6 py-3 rounded-xl font-semibold bg-primary text-primary-foreground shadow-[0_0_20px_rgba(0,212,255,0.35)] hover:shadow-[0_0_30px_rgba(0,212,255,0.55)] hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Deploy Instance
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[680px] glass-card border border-primary/30 p-0 overflow-hidden max-h-[90vh]">
                <CreateInstanceForm caps={caps} onSuccess={handleCreateSuccess} />
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card rounded-2xl h-72 bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : instancesData?.instances.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center border-dashed border-white/20">
            <Server className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-foreground">No instances deployed</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">Click "Deploy Instance" to provision your first virtual environment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {instancesData?.instances.map((instance: any) => (
                <InstanceCard key={instance.id} instance={instance} hostHasPublicIpv4={caps?.publicIpv4 ?? true} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

const InstanceCard = memo(function InstanceCard({ instance, hostHasPublicIpv4 }: { instance: any; hostHasPublicIpv4: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [sshCopied, setSshCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [cfLoading, setCfLoading] = useState(false);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListInstancesQueryKey() });
  }, [queryClient]);

  const showSuccess = useCallback((msg: string) => {
    toast({ title: "Success", description: msg });
    invalidate();
  }, [toast, invalidate]);

  const showError = useCallback((err: any) => {
    toast({ title: "Error", description: err?.message || "Action failed", variant: "destructive" });
  }, [toast]);

  const startMutation = useStartInstance({ mutation: { onSuccess: () => showSuccess("Instance starting…"), onError: showError } });
  const stopMutation = useStopInstance({ mutation: { onSuccess: () => showSuccess("Instance stopping…"), onError: showError } });
  const restartMutation = useRestartInstance({ mutation: { onSuccess: () => showSuccess("Instance restarting…"), onError: showError } });
  const deleteMutation = useDeleteInstance({ mutation: { onSuccess: () => showSuccess("Instance deleted"), onError: showError } });

  const isRunning = instance.status === "running";
  const isPending = instance.status === "starting" || instance.status === "stopping";
  const isError = instance.status === "error";
  const hasIp = !!instance.ipAddress;
  const hasPublicIp = hasIp && instance.hasPublicIpv4;
  const needsCfTunnel = !hasPublicIp && isRunning;

  const sshCommand = hasIp
    ? `ssh ${instance.sshUsername || 'root'}@${instance.ipAddress} -p ${instance.sshPort || 22}`
    : instance.cfTunnelUrl
    ? `# Use Cloudflare Tunnel: ${instance.cfTunnelUrl}`
    : `# No IP assigned — start instance first`;

  const handleCopySSH = useCallback(() => {
    navigator.clipboard.writeText(sshCommand);
    setSshCopied(true);
    setTimeout(() => setSshCopied(false), 2000);
  }, [sshCommand]);

  const handleCFTunnel = useCallback(async () => {
    setCfLoading(true);
    try {
      const res = await fetch(`/api/instances/${instance.id}/cf-tunnel`, { method: "POST" });
      const data = await res.json();
      if (data.tunnelUrl) {
        toast({ title: "Cloudflare Tunnel Activated", description: data.tunnelUrl });
        invalidate();
      }
    } catch {
      toast({ title: "Tunnel Failed", description: "Could not activate Cloudflare tunnel", variant: "destructive" });
    }
    setCfLoading(false);
  }, [instance.id, toast, invalidate]);

  const handleDelete = useCallback(() => {
    if (confirm(`Permanently destroy "${instance.name}"? This cannot be undone.`)) {
      deleteMutation.mutate({ id: instance.id });
    }
  }, [instance.id, instance.name, deleteMutation]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`glass-card rounded-2xl p-5 border flex flex-col gap-4 transition-colors duration-300 ${
        isRunning ? "border-primary/30 hover:border-primary/60" :
        isError ? "border-destructive/40" :
        "border-white/10 hover:border-white/25"
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-foreground truncate">{instance.name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground uppercase">{instance.type}</span>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-xs text-muted-foreground truncate">{instance.os}</span>
            {instance.hostname && instance.hostname !== instance.name && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span className="text-xs text-muted-foreground/60 font-mono truncate">{instance.hostname}</span>
              </>
            )}
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider shrink-0 ml-2 ${
          isRunning ? "bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20" :
          isPending ? "bg-[#ffb800]/10 text-[#ffb800] border border-[#ffb800]/20" :
          isError ? "bg-destructive/10 text-destructive border border-destructive/20" :
          "bg-white/5 text-muted-foreground border border-white/10"
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${
            isRunning ? "bg-[#00ff88] animate-pulse" :
            isPending ? "bg-[#ffb800] animate-pulse" :
            isError ? "bg-destructive" : "bg-muted-foreground"
          }`} />
          {instance.status}
        </div>
      </div>

      {/* Resource Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-background/50 rounded-xl p-2.5 border border-white/5 text-center">
          <Cpu className="w-3.5 h-3.5 mx-auto mb-1 text-primary" />
          <p className="font-mono font-bold text-sm">{instance.cpuCores} vCPU</p>
        </div>
        <div className="bg-background/50 rounded-xl p-2.5 border border-white/5 text-center">
          <MemoryStick className="w-3.5 h-3.5 mx-auto mb-1 text-secondary" />
          <p className="font-mono font-bold text-sm">{(instance.memoryMb / 1024).toFixed(1)} GB</p>
        </div>
        <div className="bg-background/50 rounded-xl p-2.5 border border-white/5 text-center">
          <HardDrive className="w-3.5 h-3.5 mx-auto mb-1 text-accent" />
          <p className="font-mono font-bold text-sm">{instance.diskGb} GB</p>
        </div>
      </div>

      {/* Network + SSH Row */}
      <div className="space-y-2">
        {/* IP Badge */}
        <div className="flex items-center gap-2">
          {hasIp ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/50 border border-white/5 text-xs font-mono text-muted-foreground">
              <Globe className="w-3 h-3 text-primary" />
              <span>{instance.ipAddress}</span>
              {!instance.hasPublicIpv4 && <span className="text-yellow-400/70 ml-1">(NAT)</span>}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/50 border border-white/5 text-xs text-muted-foreground/50">
              <WifiOff className="w-3 h-3" /> No IP
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/50 border border-white/5 text-xs font-mono text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{instance.timezone || 'UTC'}</span>
          </div>
          {instance.autoStart && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary">
              <RefreshCw className="w-3 h-3" /> Auto
            </div>
          )}
        </div>

        {/* SSH Command Box */}
        <div
          className="group flex items-center justify-between gap-2 p-2.5 bg-black/40 border border-white/5 hover:border-primary/30 rounded-xl cursor-pointer transition-all"
          onClick={handleCopySSH}
          title="Click to copy SSH command"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Terminal className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="font-mono text-xs text-muted-foreground truncate group-hover:text-foreground transition-colors">
              {sshCommand}
            </span>
          </div>
          <div className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
            {sshCopied ? <Check className="w-3.5 h-3.5 text-[#00ff88]" /> : <Copy className="w-3.5 h-3.5" />}
          </div>
        </div>

        {/* Cloudflare Tunnel — shown when no public IPv4 */}
        {needsCfTunnel && !instance.cfTunnelUrl && (
          <button
            onClick={handleCFTunnel}
            disabled={cfLoading}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-[#f48120]/10 text-[#f48120] border border-[#f48120]/25 hover:bg-[#f48120]/20 hover:border-[#f48120]/50 transition-all disabled:opacity-60"
          >
            <CloudLightning className={`w-3.5 h-3.5 ${cfLoading ? 'animate-pulse' : ''}`} />
            {cfLoading ? 'Activating Tunnel…' : 'Activate Cloudflare Tunnel'}
          </button>
        )}

        {instance.cfTunnelUrl && (
          <div className="flex items-center gap-2 p-2 bg-[#f48120]/5 border border-[#f48120]/20 rounded-xl">
            <CloudLightning className="w-3.5 h-3.5 text-[#f48120] shrink-0" />
            <span className="font-mono text-xs text-[#f48120] truncate">{instance.cfTunnelUrl}</span>
            <button
              onClick={() => { navigator.clipboard.writeText(instance.cfTunnelUrl); toast({ title: "Copied", description: "Tunnel URL copied" }); }}
              className="shrink-0 ml-auto text-[#f48120]/50 hover:text-[#f48120] transition-colors"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="flex gap-2">
          {!isRunning && !isPending && (
            <ActionBtn
              onClick={() => startMutation.mutate({ id: instance.id })}
              loading={startMutation.isPending}
              icon={<Play className="w-3.5 h-3.5 fill-current" />}
              color="green"
              title="Start"
            />
          )}
          {isRunning && (
            <ActionBtn
              onClick={() => stopMutation.mutate({ id: instance.id })}
              loading={stopMutation.isPending}
              icon={<Square className="w-3.5 h-3.5 fill-current" />}
              color="yellow"
              title="Stop"
            />
          )}
          {(isRunning || isError) && (
            <ActionBtn
              onClick={() => restartMutation.mutate({ id: instance.id })}
              loading={restartMutation.isPending}
              icon={<RotateCw className={`w-3.5 h-3.5 ${restartMutation.isPending ? 'animate-spin' : ''}`} />}
              color="cyan"
              title="Restart"
            />
          )}
          <button
            onClick={() => setShowDetails(v => !v)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all text-xs flex items-center gap-1"
            title="Details"
          >
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
        <ActionBtn
          onClick={handleDelete}
          loading={deleteMutation.isPending}
          icon={<Trash2 className="w-3.5 h-3.5" />}
          color="red"
          title="Delete"
        />
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-xs">
              <Detail label="ID" value={instance.id.slice(0, 12) + '…'} mono />
              <Detail label="SSH Port" value={instance.sshPort || '22'} mono />
              <Detail label="SSH User" value={instance.sshUsername || 'root'} mono />
              <Detail label="Created" value={new Date(instance.createdAt).toLocaleDateString()} />
              {instance.startedAt && <Detail label="Started" value={new Date(instance.startedAt).toLocaleTimeString()} />}
              <Detail label="Tags" value={instance.tags?.join(', ') || '—'} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

function ActionBtn({ onClick, loading, icon, color, title }: { onClick: () => void; loading?: boolean; icon: React.ReactNode; color: 'green' | 'yellow' | 'cyan' | 'red'; title: string }) {
  const colors = {
    green: "bg-[#00ff88]/10 text-[#00ff88] hover:bg-[#00ff88]/20 hover:shadow-[0_0_12px_rgba(0,255,136,0.25)]",
    yellow: "bg-[#ffb800]/10 text-[#ffb800] hover:bg-[#ffb800]/20 hover:shadow-[0_0_12px_rgba(255,184,0,0.25)]",
    cyan: "bg-primary/10 text-primary hover:bg-primary/20 hover:shadow-[0_0_12px_rgba(0,212,255,0.25)]",
    red: "bg-destructive/10 text-destructive hover:bg-destructive/20 hover:shadow-[0_0_12px_rgba(255,51,102,0.25)]",
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={title}
      className={`p-2 rounded-lg transition-all duration-150 disabled:opacity-40 ${colors[color]}`}
    >
      {icon}
    </button>
  );
}

function Detail({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="bg-background/30 rounded-lg px-2.5 py-2">
      <p className="text-muted-foreground/60 mb-0.5 uppercase tracking-wider text-[10px]">{label}</p>
      <p className={`text-foreground/80 truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-primary' : 'bg-white/10'}`}
      aria-label={label}
    >
      <span className={`inline-block w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 my-0.5 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function CreateInstanceForm({ caps, onSuccess }: { caps: any; onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "",
    type: "docker" as "kvm" | "docker" | "lxc",
    os: "ubuntu-22.04",
    cpuCores: 2,
    memoryMb: 2048,
    diskGb: 20,
    hasPublicIpv4: true,
    sshUsername: "root",
    sshKey: "",
    hostname: "",
    timezone: "UTC",
    autoStart: false,
    tags: "",
  });

  const set = useCallback(<K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(f => ({ ...f, [k]: v })), []);

  const createMutation = useCreateInstance({
    mutation: {
      onSuccess: () => {
        toast({ title: "Instance Provisioned", description: `${form.name} is being initialized.` });
        queryClient.invalidateQueries({ queryKey: getListInstancesQueryKey() });
        onSuccess();
      },
      onError: (err: any) => {
        toast({ title: "Provisioning Failed", description: err?.message || "Check constraints.", variant: "destructive" });
      }
    }
  });

  const isTypeSupported = useCallback((type: string) => {
    if (!caps) return true;
    if (type === "kvm") return caps.kvm;
    if (type === "docker") return caps.docker;
    return true;
  }, [caps]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTypeSupported(form.type)) return;
    createMutation.mutate({
      data: {
        name: form.name,
        type: form.type,
        os: form.os,
        cpuCores: form.cpuCores,
        memoryMb: form.memoryMb,
        diskGb: form.diskGb,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        // @ts-ignore extra fields
        hasPublicIpv4: form.hasPublicIpv4,
        sshUsername: form.sshUsername,
        hostname: form.hostname || form.name,
        timezone: form.timezone,
        autoStart: form.autoStart,
      }
    });
  };

  return (
    <div className="flex flex-col bg-background overflow-hidden">
      <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/10 bg-card/50 shrink-0">
        <DialogTitle className="text-xl font-display font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
          Deploy New Instance
        </DialogTitle>
        <p className="text-muted-foreground text-sm mt-1">Configure and provision a new virtual environment.</p>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-5">
        {/* Row 1: Name + Type */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Instance Name">
            <input
              required
              autoFocus
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="prod-web-01"
              className="form-input font-mono"
            />
          </FormField>
          <FormField label="Runtime Type">
            <select value={form.type} onChange={e => set("type", e.target.value as any)} className="form-input font-mono appearance-none">
              {(["kvm", "docker", "lxc"] as const).map(t => (
                <option key={t} value={t} disabled={!isTypeSupported(t)}>
                  {t.toUpperCase()} {!isTypeSupported(t) ? "(Not Supported)" : ""}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Row 2: OS + Hostname */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Operating System">
            <select value={form.os} onChange={e => set("os", e.target.value)} className="form-input appearance-none">
              {OS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FormField>
          <FormField label="Hostname (optional)">
            <input
              value={form.hostname}
              onChange={e => set("hostname", e.target.value)}
              placeholder={form.name || "my-server"}
              className="form-input font-mono"
            />
          </FormField>
        </div>

        {/* Row 3: SSH User + Timezone */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="SSH Username">
            <input
              value={form.sshUsername}
              onChange={e => set("sshUsername", e.target.value)}
              placeholder="root"
              className="form-input font-mono"
            />
          </FormField>
          <FormField label="Timezone">
            <select value={form.timezone} onChange={e => set("timezone", e.target.value)} className="form-input appearance-none">
              {TIMEZONE_OPTIONS.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </FormField>
        </div>

        {/* SSH Public Key */}
        <FormField label="SSH Public Key (optional)">
          <textarea
            value={form.sshKey}
            onChange={e => set("sshKey", e.target.value)}
            rows={2}
            placeholder="ssh-ed25519 AAAA... user@host"
            className="form-input font-mono resize-none text-xs"
          />
        </FormField>

        {/* Tags */}
        <FormField label="Tags (comma-separated)">
          <input
            value={form.tags}
            onChange={e => set("tags", e.target.value)}
            placeholder="production, web, api"
            className="form-input"
          />
        </FormField>

        {/* Resource Sliders */}
        <div className="space-y-4 border border-white/5 rounded-xl p-4 bg-background/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Resource Allocation</p>
          <Slider label="vCPU Cores" value={form.cpuCores} min={1} max={32} step={1} color="primary" display={`${form.cpuCores} Cores`} onChange={v => set("cpuCores", v)} />
          <Slider label="Memory (RAM)" value={form.memoryMb} min={128} max={32768} step={128} color="secondary" display={`${(form.memoryMb / 1024).toFixed(1)} GB`} onChange={v => set("memoryMb", v)} />
          <Slider label="Storage (Disk)" value={form.diskGb} min={5} max={500} step={5} color="accent" display={`${form.diskGb} GB`} onChange={v => set("diskGb", v)} />
        </div>

        {/* Toggles */}
        <div className="space-y-3 border border-white/5 rounded-xl p-4 bg-background/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Network & Boot Options</p>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" /> Public IPv4
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Assign a routable public IP address</p>
            </div>
            <Toggle checked={form.hasPublicIpv4} onChange={v => set("hasPublicIpv4", v)} label="Public IPv4" />
          </div>

          {!form.hasPublicIpv4 && (
            <div className="flex items-start gap-2 p-2.5 bg-[#f48120]/5 border border-[#f48120]/20 rounded-lg text-xs text-[#f48120]">
              <CloudLightning className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>No public IP — you can activate a Cloudflare Tunnel after deployment for external access.</span>
            </div>
          )}

          {!caps?.publicIpv4 && form.hasPublicIpv4 && (
            <div className="flex items-start gap-2 p-2.5 bg-yellow-500/5 border border-yellow-500/20 rounded-lg text-xs text-yellow-400">
              <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Host has no public IPv4 — the instance may not be externally reachable.</span>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <div>
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-secondary" /> Auto-start on Boot
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Start this instance automatically when host reboots</p>
            </div>
            <Toggle checked={form.autoStart} onChange={v => set("autoStart", v)} label="Auto-start" />
          </div>
        </div>

        {/* Type warning */}
        {!isTypeSupported(form.type) && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span><strong>{form.type.toUpperCase()}</strong> is not supported on this host. Select a different runtime type.</span>
          </div>
        )}

        <button
          type="submit"
          disabled={createMutation.isPending || !isTypeSupported(form.type)}
          className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-primary to-blue-500 text-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,212,255,0.35)] hover:shadow-[0_0_30px_rgba(0,212,255,0.55)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          {createMutation.isPending ? "Provisioning…" : "Deploy Environment"}
        </button>
      </form>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function Slider({ label, value, min, max, step, color, display, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  color: string; display: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className={`text-xs font-semibold uppercase tracking-wide text-${color}`}>{label}</span>
        <span className={`font-mono text-xs font-bold text-${color}`}>{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className={`w-full h-1.5 rounded-full appearance-none bg-white/10 accent-${color} cursor-pointer`}
      />
    </div>
  );
}
