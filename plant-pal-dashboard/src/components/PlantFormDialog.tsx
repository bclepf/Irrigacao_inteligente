import { useEffect, useState } from "react";
import type { Plant, PlantInput } from "@/lib/api";

import { useQuery } from "@tanstack/react-query";
import { getLiveSensorValue } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Save } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: PlantInput) => void;
  plant?: Plant | null;
  loading?: boolean;
}

const plantTypes = ["Ornamental", "Flor", "Suculenta", "Erva", "Frutifera", "Trepadeira"];
const locations = ["Sala de Estar", "Quarto", "Cozinha", "Escritorio", "Varanda", "Jardim", "Banheiro"];

const PlantFormDialog = ({ open, onClose, onSave, plant, loading }: Props) => {
  const [name, setName] = useState("");
  const [type, setType] = useState("Ornamental");
  const [location, setLocation] = useState("Sala de Estar");
  const [humidity, setHumidity] = useState(50);
  const [idealMin, setIdealMin] = useState(40);
  const [idealMax, setIdealMax] = useState(70);
  const [lastWatered, setLastWatered] = useState("Agora mesmo");
  const [wateringDuration, setWateringDuration] = useState(15); // NOVO ESTADO: Padrão 15s

  const { data: sensor } = useQuery({
    queryKey: ["liveSensorForm"],
    queryFn: getLiveSensorValue,
    refetchInterval: 2000, 
  });

  useEffect(() => {
    if (plant) {
      setName(plant.name);
      setType(plant.type);
      setLocation(plant.location);
      setHumidity(plant.humidity);
      setIdealMin(plant.idealHumidity.min);
      setIdealMax(plant.idealHumidity.max);
      setLastWatered(plant.lastWatered);
      setWateringDuration(plant.wateringDuration || 15); 
      return;
    }

    setName("");
    setType("Ornamental");
    setLocation("Sala de Estar");
    setHumidity(50);
    setIdealMin(40);
    setIdealMax(70);
    setLastWatered("Agora mesmo");
    setWateringDuration(15); // Reseta para o padrão
  }, [plant, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      type,
      location,
      humidity,
      idealHumidity: { min: idealMin, max: idealMax },
      lastWatered,
      wateringDuration, // INCLUINDO O TEMPO NO SALVAMENTO
    });
  };

  const isEdit = !!plant;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-primary" />
            {isEdit ? "Editar planta" : "Nova planta"}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? "Atualize as informacoes da planta." : "Preencha os dados para adicionar uma nova planta."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Nome da planta</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Samambaia" required />
            </div>

            <div>
              <Label htmlFor="type">Tipo</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {plantTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="location">Local</Label>
              <select
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {locations.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-secondary/50 p-4 rounded-lg flex flex-col items-center justify-center border border-border mt-2">
              <span className="text-sm text-muted-foreground mb-1 text-center">
                Leitura do sensor em tempo real:
              </span>
              <div className="text-4xl font-display font-bold text-primary transition-all">
                {sensor ? `${sensor.porcentagem}%` : "--%"}
              </div>
            </div>

            <div>
              <Label>Faixa ideal (%)</Label>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mt-1">
                <Input type="number" min={0} max={100} value={idealMin} onChange={(e) => setIdealMin(Number(e.target.value))} className="w-full" />
                <span className="text-sm text-muted-foreground">-</span>
                <Input type="number" min={0} max={100} value={idealMax} onChange={(e) => setIdealMax(Number(e.target.value))} className="w-full" />
              </div>
            </div>

            {/* SELETOR DE TEMPO DE IRRIGAÇÃO OCUPANDO AS DUAS COLUNAS */}
            <div className="sm:col-span-2">
              <Label htmlFor="wateringDuration">Tempo de Irrigação (Válvula Aberta)</Label>
              <select
                id="wateringDuration"
                value={wateringDuration}
                onChange={(e) => setWateringDuration(Number(e.target.value))}
                className="flex h-10 w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value={1}>1 segundo</option>
                <option value={2}>2 segundos</option>
                <option value={3}>3 segundos</option>
                <option value={4}>4 segundos</option>
                <option value={5}>5 segundos</option>
                <option value={6}>6 segundos</option>
                <option value={7}>7 segundos</option>
                <option value={8}>8 segundos</option>
                <option value={9}>9 segundos</option>
                <option value={10}>10 segundos</option>
                <option value={15}>Gotejamento (15 segundos)</option>
              </select>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row mt-6">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !name.trim()} className="w-full gap-2 sm:w-auto">
              <Save className="h-4 w-4" />
              {isEdit ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PlantFormDialog;