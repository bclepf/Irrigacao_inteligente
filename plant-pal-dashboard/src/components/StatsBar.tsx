import type { Plant } from "@/lib/api";
import { Leaf, AlertTriangle, Droplets, Sun } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  plants: Plant[];
}

const StatsBar = ({ plants }: Props) => {
  const total = plants.length;
  const alerts = plants.filter((p) => p.status === "Seco").length;
  const healthy = plants.filter((p) => p.status === "Adequado").length;
  const avgHumidity = total ? Math.round(plants.reduce((sum, p) => sum + p.humidity, 0) / total) : 0;

  const stats = [
    { icon: Leaf, label: "Total de Plantas", value: total, iconClass: "text-primary bg-primary/10" },
    { icon: Sun, label: "Saudáveis", value: healthy, iconClass: "text-status-adequate bg-status-adequate/10" },
    { icon: AlertTriangle, label: "Precisam de Atenção", value: alerts, iconClass: "text-status-dry bg-status-dry/10" },
    { icon: Droplets, label: "Umidade Média", value: `${avgHumidity}%`, iconClass: "text-status-wet bg-status-wet/10" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          className="flex items-center gap-3 bg-card rounded-xl border border-border p-4 shadow-card hover:shadow-card-hover transition-shadow"
        >
          <div className={`rounded-lg p-2.5 ${s.iconClass}`}>
            <s.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground leading-none">{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default StatsBar;
