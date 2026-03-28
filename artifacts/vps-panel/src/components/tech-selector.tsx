import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HelpCircle, CheckCircle2 } from "lucide-react";

type Driver = {
  id: string;
  name: string;
  available: boolean;
  security_level?: string;
  performance?: string;
  ram_overhead_mb?: number;
  needs_kvm?: boolean;
  best_for?: string;
  description?: string;
};

const securityBadge = (level?: string) => {
  switch ((level || "").toLowerCase()) {
    case "very high":
      return "bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30";
    case "high":
      return "bg-teal-500/10 text-teal-300 border border-teal-500/30";
    case "medium":
      return "bg-yellow-500/10 text-yellow-300 border border-yellow-500/30";
    default:
      return "bg-white/5 text-muted-foreground border border-white/10";
  }
};

export function TechSelector({
  drivers,
  selected,
  onSelect,
}: {
  drivers: Driver[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const [detailId, setDetailId] = useState<string | null>(null);

  const recommendedId = useMemo(() => {
    const available = drivers.find((d) => d.available);
    return available?.id;
  }, [drivers]);

  const detailDriver = drivers.find((d) => d.id === detailId);

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-white/10 rounded-xl overflow-hidden">
          <thead className="bg-white/5 text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="text-left p-3">Technology</th>
              <th className="text-left p-3">Security</th>
              <th className="text-left p-3">Performance</th>
              <th className="text-left p-3">RAM Overhead</th>
              <th className="text-left p-3">Needs KVM</th>
              <th className="text-left p-3">Best For</th>
              <th className="text-left p-3"></th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => {
              const isSelected = selected === driver.id;
              return (
                <tr
                  key={driver.id}
                  onClick={() => onSelect(driver.id)}
                  className={`cursor-pointer border-t border-white/5 ${
                    isSelected ? "bg-primary/10" : "hover:bg-white/5"
                  }`}
                >
                  <td className="p-3 font-semibold uppercase">
                    <div className="flex items-center gap-2">
                      {driver.name}
                      {recommendedId === driver.id && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                          Recommended
                        </span>
                      )}
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-[10px] uppercase ${securityBadge(driver.security_level)}`}>
                      {driver.security_level || "unknown"}
                    </span>
                  </td>
                  <td className="p-3">{driver.performance || "standard"}</td>
                  <td className="p-3">{driver.ram_overhead_mb ?? 0} MB</td>
                  <td className="p-3">{driver.needs_kvm ? "Yes" : "No"}</td>
                  <td className="p-3">{driver.best_for || "-"}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailId(driver.id);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Details"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {detailDriver && (
          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            className="absolute right-0 top-full mt-3 w-full sm:w-96 glass-card border border-primary/30 rounded-xl p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold uppercase">{detailDriver.name}</h4>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setDetailId(null)}
              >
                Close
              </button>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {detailDriver.description || "No description available."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
