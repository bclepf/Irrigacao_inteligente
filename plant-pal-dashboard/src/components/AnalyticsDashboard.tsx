import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Activity, AlertTriangle, Droplets, Zap } from "lucide-react";
import type { Plant } from "@/lib/api";
import { buildAnalyticsSnapshot } from "@/lib/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface Props {
  plants: Plant[];
}

const chartConfig = {
  average: { label: "Umidade media", color: "hsl(152 45% 38%)" },
  ideal: { label: "Meta ideal", color: "hsl(36 60% 55%)" },
  humidity: { label: "Umidade atual", color: "hsl(152 45% 38%)" },
  target: { label: "Meta de umidade", color: "hsl(210 65% 50%)" },
  adequado: { label: "Adequado", color: "hsl(152 55% 42%)" },
  seco: { label: "Seco", color: "hsl(35 80% 52%)" },
  umido: { label: "Umido", color: "hsl(210 65% 50%)" },
} as const;

const statusTone: Record<string, string> = {
  Adequado: "text-status-adequate bg-status-adequate/10",
  Seco: "text-status-dry bg-status-dry/10",
};

const pieColors = ["hsl(152 55% 42%)", "hsl(35 80% 52%)", "hsl(210 65% 50%)"];

function getStatusTone(status: Plant["status"]) {
  if (status === "Adequado") return statusTone.Adequado;
  if (status === "Seco") return statusTone.Seco;
  return "text-status-wet bg-status-wet/10";
}

function formatStatus(status: Plant["status"]) {
  if (status === "Adequado" || status === "Seco") return status;
  return "Umido";
}

const AnalyticsDashboard = ({ plants }: Props) => {
  const analytics = useMemo(() => buildAnalyticsSnapshot(plants), [plants]);

  const summaryCards = [
    {
      icon: Droplets,
      label: "Media geral de umidade",
      value: `${analytics.summary.avgHumidity}%`,
      helper: "Leitura consolidada da rede de sensores",
    },
    {
      icon: Activity,
      label: "Plantas na faixa ideal",
      value: `${analytics.summary.inRangeRate}%`,
      helper: "Percentual pronto para virar KPI da API",
    },
    {
      icon: AlertTriangle,
      label: "Plantas criticas",
      value: analytics.summary.criticalCount,
      helper: "Prioridade para irrigacao ou verificacao",
    },
    {
      icon: Zap,
      label: "Acoes sugeridas hoje",
      value: analytics.summary.recommendedWaterings,
      helper: "Baseado em leituras abaixo do limite seguro",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((item) => (
          <Card key={item.label} className="rounded-2xl border-border/80 shadow-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{item.value}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{item.helper}</p>
                </div>
                <div className="rounded-xl bg-primary/10 p-3 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
        <Card className="rounded-2xl shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Tendencia de umidade</CardTitle>
            <CardDescription>
              Mock de evolucao semanal pronto para ser alimentado por historico da API.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[240px] w-full aspect-auto sm:h-[280px]">
              <AreaChart data={analytics.humidityTimeline}>
                <defs>
                  <linearGradient id="humidityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-average)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-average)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="average"
                  stroke="var(--color-average)"
                  fill="url(#humidityFill)"
                  strokeWidth={3}
                />
                <Area
                  type="monotone"
                  dataKey="ideal"
                  stroke="var(--color-ideal)"
                  fill="transparent"
                  strokeDasharray="6 6"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Distribuicao de status</CardTitle>
            <CardDescription>
              Distribuicao do estado atual das plantas monitoradas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[240px] w-full aspect-auto sm:h-[280px]">
              <PieChart>
                <Pie
                  data={analytics.statusBreakdown}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                >
                  {analytics.statusBreakdown.map((entry, index) => (
                    <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              </PieChart>
            </ChartContainer>
            <div className="mt-4 grid grid-cols-1 gap-2 text-center text-xs sm:grid-cols-3">
              {analytics.statusBreakdown.map((item, index) => (
                <div key={item.name} className="rounded-xl bg-secondary/60 px-3 py-2">
                  <div className="mx-auto mb-2 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pieColors[index] }} />
                  <p className="font-semibold text-foreground">{item.value}</p>
                  <p className="text-muted-foreground">{item.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <Card className="rounded-2xl shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Umidade por ambiente</CardTitle>
            <CardDescription>
              Comparativo entre a media atual e a meta ideal por ambiente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px] w-full aspect-auto sm:h-[300px]">
              <BarChart data={analytics.humidityByLocation} barGap={12}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="location" tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="humidity" fill="var(--color-humidity)" radius={[10, 10, 0, 0]} />
                <Bar dataKey="target" fill="var(--color-target)" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Prioridades operacionais</CardTitle>
            <CardDescription>
              Lista das plantas mais distantes da faixa ideal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.priorities.map((plant) => (
              <div key={plant.id} className="rounded-2xl border border-border bg-secondary/35 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{plant.name}</p>
                    <p className="text-xs text-muted-foreground">{plant.location}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusTone(plant.status)}`}>
                    {formatStatus(plant.status)}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                  <div className="rounded-xl bg-background px-3 py-2">
                    <p className="text-muted-foreground">Atual</p>
                    <p className="mt-1 font-semibold text-foreground">{plant.humidity}%</p>
                  </div>
                  <div className="rounded-xl bg-background px-3 py-2">
                    <p className="text-muted-foreground">Ideal</p>
                    <p className="mt-1 font-semibold text-foreground">{plant.targetRange}</p>
                  </div>
                  <div className="rounded-xl bg-background px-3 py-2">
                    <p className="text-muted-foreground">Desvio</p>
                    <p className="mt-1 font-semibold text-foreground">{plant.deviation} pts</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default AnalyticsDashboard;
