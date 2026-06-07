import type { Plant } from "@/lib/api";

export interface AnalyticsSummary {
  avgHumidity: number;
  inRangeRate: number;
  criticalCount: number;
  recommendedWaterings: number;
}

export interface HumidityTimelinePoint {
  day: string;
  average: number;
  ideal: number;
}

export interface LocationAnalyticsPoint {
  location: string;
  humidity: number;
  target: number;
}

export interface StatusAnalyticsPoint {
  name: string;
  value: number;
}

export interface PriorityPlant {
  id: number;
  name: string;
  location: string;
  humidity: number;
  targetRange: string;
  status: Plant["status"];
  deviation: number;
}

export interface AnalyticsSnapshot {
  summary: AnalyticsSummary;
  humidityTimeline: HumidityTimelinePoint[];
  humidityByLocation: LocationAnalyticsPoint[];
  statusBreakdown: StatusAnalyticsPoint[];
  priorities: PriorityPlant[];
}

const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

function round(value: number) {
  return Math.round(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getTargetHumidity(plant: Plant) {
  return (plant.idealHumidity.min + plant.idealHumidity.max) / 2;
}

function isWetStatus(status: Plant["status"]) {
  return status !== "Adequado" && status !== "Seco";
}

export function buildAnalyticsSnapshot(plants: Plant[]): AnalyticsSnapshot {
  const total = plants.length;
  const avgHumidity = total
    ? round(plants.reduce((sum, plant) => sum + plant.humidity, 0) / total)
    : 0;
  const inRangeCount = plants.filter((plant) => {
    return plant.humidity >= plant.idealHumidity.min && plant.humidity <= plant.idealHumidity.max;
  }).length;
  const criticalCount = plants.filter((plant) => plant.status === "Seco").length;

  const summary: AnalyticsSummary = {
    avgHumidity,
    inRangeRate: total ? round((inRangeCount / total) * 100) : 0,
    criticalCount,
    recommendedWaterings: plants.filter((plant) => plant.humidity < plant.idealHumidity.min + 5).length,
  };

  const humidityTimeline = WEEK_DAYS.map((day, index) => {
    const variation = (index - 3) * 2;
    const idealAverage = total
      ? round(plants.reduce((sum, plant) => sum + getTargetHumidity(plant), 0) / total)
      : 0;

    return {
      day,
      average: clamp(avgHumidity + variation, 0, 100),
      ideal: clamp(idealAverage, 0, 100),
    };
  });

  const locationMap = new Map<string, { totalHumidity: number; totalTarget: number; count: number }>();
  plants.forEach((plant) => {
    const current = locationMap.get(plant.location) ?? { totalHumidity: 0, totalTarget: 0, count: 0 };
    current.totalHumidity += plant.humidity;
    current.totalTarget += getTargetHumidity(plant);
    current.count += 1;
    locationMap.set(plant.location, current);
  });

  const humidityByLocation = Array.from(locationMap.entries()).map(([location, values]) => ({
    location,
    humidity: round(values.totalHumidity / values.count),
    target: round(values.totalTarget / values.count),
  }));

  const statusBreakdown: StatusAnalyticsPoint[] = [
    { name: "Adequado", value: plants.filter((plant) => plant.status === "Adequado").length },
    { name: "Seco", value: plants.filter((plant) => plant.status === "Seco").length },
    { name: "Umido", value: plants.filter((plant) => isWetStatus(plant.status)).length },
  ];

  const priorities = plants
    .map((plant) => {
      const target = getTargetHumidity(plant);
      return {
        id: plant.id,
        name: plant.name,
        location: plant.location,
        humidity: plant.humidity,
        targetRange: `${plant.idealHumidity.min}-${plant.idealHumidity.max}%`,
        status: plant.status,
        deviation: Math.abs(round(plant.humidity - target)),
      };
    })
    .sort((a, b) => b.deviation - a.deviation)
    .slice(0, 4);

  return {
    summary,
    humidityTimeline,
    humidityByLocation,
    statusBreakdown,
    priorities,
  };
}
