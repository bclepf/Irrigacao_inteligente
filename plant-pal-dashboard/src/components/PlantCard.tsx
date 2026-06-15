import { motion } from "framer-motion";
import type { Plant } from "@/lib/api";
import { CloudRain, Clock, Droplet, Droplets, Edit2, MapPin, Minus, Tag, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type VisualStatus = "Adequado" | "Seco" | "Umido";

const statusConfig: Record<
  VisualStatus,
  {
    className: string;
    label: string;
    Icon: typeof Minus;
  }
> = {
  Adequado: {
    className: "border border-status-adequate/30 bg-status-adequate/15 text-status-adequate",
    label: "Adequado",
    Icon: Minus,
  },
  Seco: {
    className: "border border-status-dry/30 bg-status-dry/15 text-status-dry",
    label: "Seco",
    Icon: TrendingDown,
  },
  Umido: {
    className: "border border-status-wet/30 bg-status-wet/15 text-status-wet",
    label: "Umido",
    Icon: TrendingUp,
  },
};

function normalizeStatus(status: Plant["status"]): VisualStatus {
  if (status === "Adequado") return "Adequado";
  if (status === "Seco") return "Seco";
  return "Umido";
}

function formatForecastTime(value: string | null) {
  if (!value) return "Sem chuva no horario";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace("T", " ");

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  plant: Plant;
  onEdit: (plant: Plant) => void;
  onDelete: (plant: Plant) => void;
  onWater: (plant: Plant) => void;
}

const PlantCard = ({ plant, onEdit, onDelete, onWater }: Props) => {
  const visualStatus = normalizeStatus(plant.status);
  const cfg = statusConfig[visualStatus];
  const inRange = plant.humidity >= plant.idealHumidity.min && plant.humidity <= plant.idealHumidity.max;

  return (
    <motion.div
      key={plant.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-card-hover"
    >
      <div
        className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pt-5 sm:pb-4"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div>
          <h2 className="text-xl font-display font-bold text-primary-foreground">{plant.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1 text-xs text-primary-foreground/70">
              <Tag className="h-3 w-3" /> {plant.type}
            </span>
            <span className="flex items-center gap-1 text-xs text-primary-foreground/70">
              <MapPin className="h-3 w-3" /> {plant.location}
            </span>
          </div>
        </div>

        <div className="self-start sm:self-auto">
          <span className={`flex items-center gap-1.5 rounded-full bg-primary-foreground/90 px-3 py-1 text-xs font-semibold ${cfg.className}`}>
            <cfg.Icon className="h-3 w-3" />
            {cfg.label}
          </span>
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        <div>
          <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Droplets className="h-4 w-4 text-primary" />
              Umidade atual
            </div>
            <span className="text-xs text-muted-foreground">
              Ideal: {plant.idealHumidity.min}-{plant.idealHumidity.max}%
            </span>
          </div>

          <div className="mb-3 flex flex-wrap items-end gap-2">
            <span className="text-3xl font-bold text-foreground sm:text-4xl">{plant.humidity}%</span>
            {inRange ? (
              <span className="mb-1.5 text-xs font-medium text-status-adequate">Dentro da faixa</span>
            ) : (
              <span className="mb-1.5 text-xs font-medium text-status-dry">Fora da faixa</span>
            )}
          </div>

          <div className="relative">
            <Progress value={plant.humidity} className="h-3 rounded-full bg-secondary" />
            <div className="absolute top-0 h-3 border-l-2 border-primary/40" style={{ left: `${plant.idealHumidity.min}%` }} />
            <div className="absolute top-0 h-3 border-r-2 border-primary/40" style={{ left: `${plant.idealHumidity.max}%` }} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2.5 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Ultima irrigacao: <span className="font-medium text-foreground">{plant.lastWatered}</span>
        </div>

        {plant.weather ? (
          <div
            className={`rounded-lg border px-3 py-3 text-sm ${
              plant.weather.shouldSkipWatering
                ? "border-status-wet/30 bg-status-wet/10 text-status-wet"
                : "border-border bg-secondary/50 text-muted-foreground"
            }`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-2">
                <CloudRain className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Previsao em Varginha</p>
                  <p className="text-xs">{plant.weather.reason}</p>
                </div>
              </div>
              <span className="rounded-full bg-background/80 px-2.5 py-1 text-xs font-medium">
                {plant.weather.forecastWindowHours}h futuras
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div className="rounded-md bg-background/70 px-2 py-2">
                <p className="text-muted-foreground">Prob. chuva</p>
                <p className="font-semibold text-foreground">{plant.weather.maxRainProbability}%</p>
              </div>
              <div className="rounded-md bg-background/70 px-2 py-2">
                <p className="text-muted-foreground">Chuva</p>
                <p className="font-semibold text-foreground">{plant.weather.expectedRainMm.toFixed(1)} mm</p>
              </div>
              <div className="rounded-md bg-background/70 px-2 py-2">
                <p className="text-muted-foreground">Umidade ar</p>
                <p className="font-semibold text-foreground">{plant.weather.maxAirHumidity}%</p>
              </div>
              <div className="rounded-md bg-background/70 px-2 py-2">
                <p className="text-muted-foreground">Prox. chuva</p>
                <p className="font-semibold text-foreground">{formatForecastTime(plant.weather.nextRainAt)}</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button className="w-full gap-2" onClick={() => onWater(plant)}>
            <Droplet className="h-4 w-4" />
            Irrigar
          </Button>
          <Button variant="outline" className="w-full gap-2" onClick={() => onEdit(plant)}>
            <Edit2 className="h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(plant)}
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default PlantCard;
