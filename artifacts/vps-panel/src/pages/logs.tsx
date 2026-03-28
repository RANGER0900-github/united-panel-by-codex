import React, { useEffect, useRef, useState } from "react";
import { PageTransition } from "@/components/page-transition";
import { api } from "@/api/client";
import { TerminalSquare, Filter } from "lucide-react";
import { motion } from "framer-motion";

export default function Logs() {
  const [vps, setVps] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchVps = async () => {
      const response = await api.get("/api/vps");
      const list = response.data?.data || [];
      setVps(list);
      if (!selectedId && list.length > 0) {
        setSelectedId(list[0].id);
      }
    };
    fetchVps();
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const fetchLogs = async () => {
      const response = await api.get(`/api/vps/${selectedId}/logs?lines=200`);
      setLogs(response.data?.data?.logs || []);
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [selectedId]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const filteredLogs = logs.filter((log) => log.toLowerCase().includes(search.toLowerCase()));

  return (
    <PageTransition>
      <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 shrink-0">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground flex items-center gap-3">
              <TerminalSquare className="w-8 h-8 text-primary" /> System Logs
            </h1>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Grep logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-card/50 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm font-mono focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="bg-card/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
            >
              {vps.length === 0 && <option value="">No VPS available</option>}
              {vps.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 glass-card rounded-xl border border-primary/20 overflow-hidden flex flex-col relative shadow-[0_0_30px_rgba(0,212,255,0.05)]"
        >
          <div className="h-10 bg-black/60 border-b border-white/10 flex items-center justify-between px-4 shrink-0">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive/80" />
              <div className="w-3 h-3 rounded-full bg-[#ffb800]/80" />
              <div className="w-3 h-3 rounded-full bg-[#00ff88]/80" />
            </div>
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              /var/log/vpspanel/{selectedId || "instance"}.log
            </div>
            <div />
          </div>

          <div
            ref={containerRef}
            className="flex-1 bg-[#06060a]/90 p-4 overflow-y-auto font-mono text-sm leading-relaxed"
          >
            {filteredLogs.length === 0 ? (
              <div className="text-muted-foreground italic opacity-50">No logs match the current criteria...</div>
            ) : (
              filteredLogs.map((log, idx) => (
                <div key={idx} className="hover:bg-white/5 py-0.5 px-2 rounded -mx-2 transition-colors">
                  {log}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
