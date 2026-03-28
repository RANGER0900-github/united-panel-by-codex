import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { api } from "@/api/client";
import { PageTransition } from "@/components/page-transition";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Play, Square, RotateCw, Trash2 } from "lucide-react";

export default function VpsDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/vps/:id");
  const { toast } = useToast();
  const id = params?.id;
  const [vps, setVps] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<"stop" | "reboot" | "delete" | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchVps = async () => {
    const response = await api.get(`/api/vps/${id}`);
    setVps(response.data?.data);
  };

  const fetchLogs = async () => {
    const response = await api.get(`/api/vps/${id}/logs?lines=100`);
    setLogs(response.data?.data?.logs || []);
  };

  useEffect(() => {
    if (!id) return;
    fetchVps();
    fetchLogs();
  }, [id]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const expiresIn = useMemo(() => {
    if (!vps?.expires_at) return null;
    const ms = vps.expires_at * 1000 - Date.now();
    if (ms <= 0) return "Expired";
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }, [vps?.expires_at]);

  const statusBadge = (() => {
    const mapping: Record<string, string> = {
      RUNNING: "bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20",
      STOPPED: "bg-white/5 text-muted-foreground border border-white/10",
      CREATING: "bg-[#ffb800]/10 text-[#ffb800] border border-[#ffb800]/20",
      REBOOTING: "bg-[#4f9cff]/10 text-[#4f9cff] border border-[#4f9cff]/20",
      FAILED: "bg-destructive/10 text-destructive border border-destructive/20",
      DELETING: "bg-[#f48120]/10 text-[#f48120] border border-[#f48120]/20",
      STOPPING: "bg-[#ffb800]/10 text-[#ffb800] border border-[#ffb800]/20",
    };
    return mapping[vps?.status] || mapping.STOPPED;
  })();

  const handleAction = async (action: "start" | "stop" | "reboot") => {
    try {
      await api.post(`/api/vps/${id}/${action}`);
      toast({ title: `VPS ${action} queued` });
      fetchVps();
    } catch (err: any) {
      toast({ title: err?.response?.data?.error || "Action failed", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/api/vps/${id}`);
      toast({ title: "VPS deleted" });
      setLocation("/instances");
    } catch (err: any) {
      toast({ title: err?.response?.data?.error || "Delete failed", variant: "destructive" });
    }
  };

  if (!vps) {
    return (
      <PageTransition>
        <div className="glass-card rounded-2xl p-8 text-center">Loading…</div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{vps.name}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span data-status={vps.status} className={`px-3 py-1 rounded-full text-xs uppercase ${statusBadge}`}>{vps.status}</span>
              <span>{vps.ip_address || "No IP assigned"}</span>
              <span>{vps.technology}</span>
              <span>{vps.image}</span>
              {expiresIn && <span>Expires in {expiresIn}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            {vps.status === "STOPPED" && (
              <button
                onClick={() => handleAction("start")}
                className="px-4 py-2 rounded-lg border border-white/10 text-xs uppercase tracking-widest hover:border-primary/30 hover:text-primary transition-colors"
              >
                <Play className="w-4 h-4 inline mr-1" /> Start
              </button>
            )}
            {vps.status === "RUNNING" && (
              <>
                <button
                  onClick={() => setConfirmAction("stop")}
                  className="px-4 py-2 rounded-lg border border-white/10 text-xs uppercase tracking-widest hover:border-[#ffb800]/40 hover:text-[#ffb800] transition-colors"
                >
                  <Square className="w-4 h-4 inline mr-1" /> Stop
                </button>
                <button
                  onClick={() => setConfirmAction("reboot")}
                  className="px-4 py-2 rounded-lg border border-white/10 text-xs uppercase tracking-widest hover:border-[#4f9cff]/40 hover:text-[#4f9cff] transition-colors"
                >
                  <RotateCw className="w-4 h-4 inline mr-1" /> Reboot
                </button>
              </>
            )}
            <button
              onClick={() => setConfirmAction("delete")}
              className="px-4 py-2 rounded-lg border border-destructive/30 text-xs uppercase tracking-widest text-destructive hover:border-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-4 h-4 inline mr-1" /> Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="glass-card rounded-xl p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">CPU</div>
            <div className="text-2xl font-mono">{vps.cpu} vCPU</div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Memory</div>
            <div className="text-2xl font-mono">{vps.ram_mb} MB</div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Disk</div>
            <div className="text-2xl font-mono">{vps.disk_gb} GB</div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-primary/20">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Logs</div>
          <div className="bg-[#06060a]/90 p-3 rounded-lg h-64 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-muted-foreground">No logs available.</div>
            ) : (
              logs.map((line, idx) => (
                <div key={idx} className="whitespace-pre-wrap">
                  {line}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>

      <Dialog open={confirmAction === "stop"} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop {vps.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Running processes will be terminated.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <button className="px-4 py-2 rounded-lg border border-white/10" onClick={() => setConfirmAction(null)}>Cancel</button>
            <button
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground"
              onClick={() => {
                setConfirmAction(null);
                handleAction("stop");
              }}
            >
              Confirm
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmAction === "reboot"} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reboot {vps.name}?</DialogTitle>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <button className="px-4 py-2 rounded-lg border border-white/10" onClick={() => setConfirmAction(null)}>Cancel</button>
            <button
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground"
              onClick={() => {
                setConfirmAction(null);
                handleAction("reboot");
              }}
            >
              Confirm
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmAction === "delete"} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {vps.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Type <span className="font-mono text-foreground">{vps.name}</span> to confirm deletion.
          </p>
          <input
            className="form-input mt-3"
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
            placeholder="Type name to confirm"
          />
          <div className="flex justify-end gap-2 mt-4">
            <button className="px-4 py-2 rounded-lg border border-white/10" onClick={() => setConfirmAction(null)}>Cancel</button>
            <button
              className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground disabled:opacity-50"
              disabled={deleteInput !== vps.name}
              onClick={() => {
                setConfirmAction(null);
                handleDelete();
              }}
            >
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
