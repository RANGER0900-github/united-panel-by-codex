import React, { useEffect, useMemo, useState } from "react";
import { PageTransition } from "@/components/page-transition";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { api, connectSocket } from "@/api/client";
import { TechSelector } from "@/components/tech-selector";
import {
  Play, Square, RotateCw, Trash2, Plus, Server, Cpu, MemoryStick, HardDrive, Clock,
} from "lucide-react";

type Vps = {
  id: string;
  name: string;
  status: string;
  cpu: number;
  ram_mb: number;
  disk_gb: number;
  ip_address?: string | null;
  technology: string;
  image: string;
  expires_at?: number | null;
};

export default function Instances() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [vps, setVps] = useState<Vps[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchVps = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/api/vps");
      setVps(response.data?.data || []);
    } catch (err) {
      toast({ title: "Failed to load VPS", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVps();
    const interval = setInterval(fetchVps, 5000);
    const socket = connectSocket();
    socket.on("vps:update", (update: any) => {
      setVps((prev) => {
        const exists = prev.find((item) => item.id === update.id);
        if (!exists) return prev;
        return prev.map((item) => (item.id === update.id ? { ...item, ...update } : item));
      });
    });
    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  const handleCreateSuccess = () => {
    setIsCreateOpen(false);
    fetchVps();
  };

  return (
    <PageTransition>
      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground">Instances</h1>
            <p className="text-muted-foreground mt-1">Deploy and manage virtual environments.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <button className="px-6 py-3 rounded-xl font-semibold bg-primary text-primary-foreground shadow-[0_0_20px_rgba(0,212,255,0.35)] hover:shadow-[0_0_30px_rgba(0,212,255,0.55)] hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Deploy Instance
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[720px] glass-card border border-primary/30 p-0 overflow-hidden max-h-[90vh]">
              <DialogHeader className="px-6 pt-6 pb-2">
                <DialogTitle className="text-xl font-semibold">Create VPS</DialogTitle>
              </DialogHeader>
              <CreateVpsForm onSuccess={handleCreateSuccess} />
            </DialogContent>
          </Dialog>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card rounded-2xl h-72 bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : vps.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center border-dashed border-white/20">
            <Server className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No instances yet</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Create your first VPS to start managing compute resources.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {vps.map((instance) => (
              <VpsCard key={instance.id} instance={instance} onRefresh={fetchVps} />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

function VpsCard({ instance, onRefresh }: { instance: Vps; onRefresh: () => void }) {
  const { toast } = useToast();

  const statusConfig: Record<string, string> = {
    RUNNING: "bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20",
    STOPPED: "bg-white/5 text-muted-foreground border border-white/10",
    CREATING: "bg-[#ffb800]/10 text-[#ffb800] border border-[#ffb800]/20",
    REBOOTING: "bg-[#4f9cff]/10 text-[#4f9cff] border border-[#4f9cff]/20",
    FAILED: "bg-destructive/10 text-destructive border border-destructive/20",
    DELETING: "bg-[#f48120]/10 text-[#f48120] border border-[#f48120]/20",
    STOPPING: "bg-[#ffb800]/10 text-[#ffb800] border border-[#ffb800]/20",
  };

  const statusBadge = statusConfig[instance.status] || statusConfig.STOPPED;

  const handleAction = async (action: "start" | "stop" | "reboot") => {
    try {
      await api.post(`/api/vps/${instance.id}/${action}`);
      toast({ title: `VPS ${action} queued` });
      onRefresh();
    } catch (err: any) {
      toast({ title: err?.response?.data?.error || "Action failed", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${instance.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/vps/${instance.id}`);
      toast({ title: "VPS deleted" });
      onRefresh();
    } catch (err: any) {
      toast({ title: err?.response?.data?.error || "Delete failed", variant: "destructive" });
    }
  };

  const expiresIn = useMemo(() => {
    if (!instance.expires_at) return null;
    const ms = instance.expires_at * 1000 - Date.now();
    if (ms <= 0) return "Expired";
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }, [instance.expires_at]);

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-foreground truncate">{instance.name}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
            <span className="uppercase">{instance.technology}</span>
            <span className="text-muted-foreground/40">•</span>
            <span className="truncate">{instance.image}</span>
          </div>
        </div>
        <div data-status={instance.status} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider shrink-0 ml-2 ${statusBadge}`}>
          {instance.status}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary" />
          <span>{instance.cpu} vCPU</span>
        </div>
        <div className="flex items-center gap-2">
          <MemoryStick className="w-4 h-4 text-secondary" />
          <span>{instance.ram_mb} MB</span>
        </div>
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-accent" />
          <span>{instance.disk_gb} GB</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{instance.ip_address || "No IP assigned"}</span>
        {expiresIn && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Expires in {expiresIn}
          </span>
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t border-white/5">
        <Link
          href={`/vps/${instance.id}`}
          className="flex-1 py-2 rounded-lg border border-white/10 text-xs uppercase tracking-widest text-center hover:border-primary/30 hover:text-primary transition-colors"
        >
          Details
        </Link>
        {instance.status === "STOPPED" && (
          <button
            onClick={() => handleAction("start")}
            className="flex-1 py-2 rounded-lg border border-white/10 text-xs uppercase tracking-widest hover:border-primary/30 hover:text-primary transition-colors"
          >
            <Play className="w-4 h-4 inline mr-1" /> Start
          </button>
        )}
        {instance.status === "RUNNING" && (
          <>
            <button
              onClick={() => handleAction("stop")}
              className="flex-1 py-2 rounded-lg border border-white/10 text-xs uppercase tracking-widest hover:border-[#ffb800]/40 hover:text-[#ffb800] transition-colors"
            >
              <Square className="w-4 h-4 inline mr-1" /> Stop
            </button>
            <button
              onClick={() => handleAction("reboot")}
              className="flex-1 py-2 rounded-lg border border-white/10 text-xs uppercase tracking-widest hover:border-[#4f9cff]/40 hover:text-[#4f9cff] transition-colors"
            >
              <RotateCw className="w-4 h-4 inline mr-1" /> Reboot
            </button>
          </>
        )}
        <button
          onClick={handleDelete}
          className="flex-1 py-2 rounded-lg border border-destructive/30 text-xs uppercase tracking-widest text-destructive hover:border-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="w-4 h-4 inline mr-1" /> Delete
        </button>
      </div>
    </div>
  );
}

function CreateVpsForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [mounts, setMounts] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [name, setName] = useState("");
  const [cpu, setCpu] = useState(1);
  const [ram, setRam] = useState(256);
  const [disk, setDisk] = useState(2);
  const [image, setImage] = useState("");
  const [storagePath, setStoragePath] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [driversRes, imagesRes, storageRes] = await Promise.all([
          api.get("/api/drivers"),
          api.get("/api/images"),
          api.get("/api/storage"),
        ]);
        const driversList = driversRes.data?.data?.drivers || [];
        setDrivers(driversList);
        const recommended = driversList.find((d: any) => d.available)?.id || "";
        setSelectedDriver(recommended);
        setImages(imagesRes.data?.data?.images || []);
        const mountsList = storageRes.data?.data?.mounts || [];
        setMounts(mountsList);
        const recommendedMount = mountsList.find((m: any) => m.recommended)?.path || "";
        setStoragePath(recommendedMount);
      } catch (err) {
        toast({ title: "Failed to load options", variant: "destructive" });
      }
    };
    loadOptions();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/vps", {
        name,
        cpu,
        ram_mb: ram,
        disk_gb: disk,
        image,
        technology: selectedDriver,
        storage_path: storagePath,
        expires_at: expiresAt || null,
      });
      toast({ title: "VPS created successfully" });
      onSuccess();
    } catch (err: any) {
      toast({
        title: err?.response?.data?.error || "Failed to create VPS",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="px-6 pb-6 space-y-5 max-h-[70vh] overflow-y-auto pr-2" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">Name</label>
        <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">CPU</label>
          <input type="number" min={1} max={16} className="form-input" value={cpu} onChange={(e) => setCpu(Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">RAM (MB)</label>
          <input type="number" min={128} max={32768} className="form-input" value={ram} onChange={(e) => setRam(Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Disk (GB)</label>
          <input type="number" min={1} max={500} className="form-input" value={disk} onChange={(e) => setDisk(Number(e.target.value))} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">Image</label>
        <select className="form-input" value={image} onChange={(e) => setImage(e.target.value)} required>
          <option value="">Select image</option>
          {images.map((img) => (
            <option key={img.slug} value={img.slug}>
              {img.display_name} ({img.size_gb} GB)
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">Technology</label>
        <TechSelector drivers={drivers} selected={selectedDriver} onSelect={setSelectedDriver} />
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">Storage Path</label>
        <select className="form-input" value={storagePath} onChange={(e) => setStoragePath(e.target.value)} required>
          <option value="">Select storage</option>
          {mounts.map((m) => (
            <option key={m.path} value={m.path}>
              {m.path} — {m.free_gb} GB free{m.recommended ? " (RECOMMENDED)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">Expiry (optional)</label>
        <input type="datetime-local" className="form-input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl font-bold bg-primary text-primary-foreground shadow-[0_0_20px_rgba(0,212,255,0.35)] hover:bg-primary/90 transition-all disabled:opacity-50"
      >
        {loading ? "Provisioning…" : "Create VPS"}
      </button>
    </form>
  );
}
