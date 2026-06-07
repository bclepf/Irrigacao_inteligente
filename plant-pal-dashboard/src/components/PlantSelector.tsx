import { useState } from "react";
import type { Plant } from "@/lib/api";
import { ChevronRight, Leaf, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  plants: Plant[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAdd: () => void;
}

function getStatusDot(status: Plant["status"]) {
  if (status === "Adequado") return "bg-status-adequate";
  if (status === "Seco") return "bg-status-dry";
  return "bg-status-wet";
}

const PlantSelector = ({ plants, selectedId, onSelect, onAdd }: Props) => {
  const [search, setSearch] = useState("");

  const filtered = plants.filter((plant) => plant.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Leaf className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Suas plantas</span>
        </div>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onAdd} title="Adicionar planta">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar planta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex max-h-[320px] flex-col overflow-y-auto md:max-h-[420px]">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma planta encontrada.</p>
        ) : (
          filtered.map((plant) => (
            <button
              key={plant.id}
              onClick={() => onSelect(plant.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-secondary/60",
                selectedId === plant.id && "border-l-[3px] border-primary bg-secondary",
              )}
            >
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background", getStatusDot(plant.status))} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{plant.name}</p>
                <p className="text-xs text-muted-foreground">
                  {plant.humidity}% - {plant.type}
                </p>
              </div>
              {selectedId === plant.id && <ChevronRight className="h-4 w-4 shrink-0 text-primary" />}
            </button>
          ))
        )}
      </div>

      <div className="border-t border-border p-3 md:hidden">
        <Button className="w-full gap-2" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Nova planta
        </Button>
      </div>
    </div>
  );
};

export default PlantSelector;
