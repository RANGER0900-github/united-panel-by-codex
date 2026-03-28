import React, { useState, useEffect, useRef } from "react";
import { PageTransition } from "@/components/page-transition";
import { useGetLogs, type GetLogsLevel } from "@workspace/api-client-react";
import { TerminalSquare, Download, Trash, Filter } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function Logs() {
  const [levelFilter, setLevelFilter] = useState<GetLogsLevel | "all">("all");
  const [search, setSearch] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  
  const { data, refetch } = useGetLogs(
    { limit: 200, level: levelFilter !== "all" ? levelFilter : undefined }, 
    { query: { refetchInterval: 2000 } }
  );

  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [data?.logs, autoScroll]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
    setAutoScroll(isBottom);
  };

  const filteredLogs = (data?.logs || []).filter(log => 
    log.message.toLowerCase().includes(search.toLowerCase()) || 
    log.source.toLowerCase().includes(search.toLowerCase())
  );

  const getLevelColor = (level: string) => {
    switch(level) {
      case 'error': return 'text-[#ff3366] font-bold';
      case 'warn': return 'text-[#ffb800]';
      case 'info': return 'text-primary';
      default: return 'text-muted-foreground';
    }
  };

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
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-card/50 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm font-mono focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <select 
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value as any)}
              className="bg-card/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
            >
              <option value="all">ALL LEVELS</option>
              <option value="info">INFO</option>
              <option value="warn">WARN</option>
              <option value="error">ERROR</option>
              <option value="debug">DEBUG</option>
            </select>
          </div>
        </header>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 glass-card rounded-xl border border-primary/20 overflow-hidden flex flex-col relative shadow-[0_0_30px_rgba(0,212,255,0.05)]"
        >
          {/* Terminal Header */}
          <div className="h-10 bg-black/60 border-b border-white/10 flex items-center justify-between px-4 shrink-0">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive/80" />
              <div className="w-3 h-3 rounded-full bg-[#ffb800]/80" />
              <div className="w-3 h-3 rounded-full bg-[#00ff88]/80" />
            </div>
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              /var/log/nexus/system.log
            </div>
            <div className="flex gap-3">
              <button onClick={() => refetch()} className="text-xs text-primary hover:text-primary-foreground hover:bg-primary px-2 rounded transition-colors font-mono uppercase">
                {autoScroll ? 'Following' : 'Paused'}
              </button>
            </div>
          </div>

          {/* Terminal Body */}
          <div 
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 bg-[#06060a]/90 p-4 overflow-y-auto font-mono text-sm leading-relaxed"
          >
            {filteredLogs.length === 0 ? (
              <div className="text-muted-foreground italic opacity-50">No logs match the current criteria...</div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="flex gap-4 hover:bg-white/5 py-0.5 px-2 rounded -mx-2 transition-colors">
                  <span className="text-muted-foreground/60 shrink-0 w-44">
                    {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS')}
                  </span>
                  <span className={`shrink-0 w-14 uppercase tracking-wider ${getLevelColor(log.level)}`}>
                    [{log.level}]
                  </span>
                  <span className="text-accent/80 shrink-0 w-32 truncate">
                    {log.source}
                  </span>
                  <span className="text-foreground/90 break-words whitespace-pre-wrap">
                    {log.message}
                  </span>
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
