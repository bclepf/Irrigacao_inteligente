import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart3, Droplets, LayoutDashboard, Loader2, Sprout } from "lucide-react";
import { useState } from "react";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import DeletePlantDialog from "@/components/DeletePlantDialog";
import PlantCard from "@/components/PlantCard";
import PlantFormDialog from "@/components/PlantFormDialog";
import PlantSelector from "@/components/PlantSelector";
import StatsBar from "@/components/StatsBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addPlant, deletePlant, fetchPlants, updatePlant, waterPlant } from "@/lib/api";
import type { Plant, PlantInput } from "@/lib/api";
import { toast } from "sonner";

const Index = () => {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [formOpen, setFormOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingPlant, setDeletingPlant] = useState<Plant | null>(null);

  const { data: plants, isLoading } = useQuery({
    queryKey: ["plants"],
    queryFn: fetchPlants,
    refetchInterval: 10000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["plants"] });

  const addMutation = useMutation({
    mutationFn: (input: PlantInput) => addPlant(input),
    onSuccess: (plant) => {
      invalidate();
      setFormOpen(false);
      setSelectedId(plant.id);
      toast.success(`"${plant.name}" adicionada com sucesso!`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<PlantInput> }) => updatePlant(id, input),
    onSuccess: (plant) => {
      invalidate();
      setFormOpen(false);
      setEditingPlant(null);
      toast.success(`"${plant.name}" atualizada!`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePlant(id),
    onSuccess: () => {
      invalidate();
      setDeleteOpen(false);
      if (selectedId === deletingPlant?.id) setSelectedId(null);
      toast.success(`"${deletingPlant?.name}" removida.`);
      setDeletingPlant(null);
    },
  });

  const waterMutation = useMutation({
    mutationFn: (id: number) => waterPlant(id),
    onSuccess: (plant) => {
      invalidate();
      toast.success(`"${plant.name}" irrigada com sucesso!`);
    },
  });

  const selectedPlant = plants?.find((plant) => plant.id === selectedId) ?? null;

  const handleOpenAdd = () => {
    setEditingPlant(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (plant: Plant) => {
    setEditingPlant(plant);
    setFormOpen(true);
  };

  const handleOpenDelete = (plant: Plant) => {
    setDeletingPlant(plant);
    setDeleteOpen(true);
  };

  const handleSave = (data: PlantInput) => {
    if (editingPlant) {
      updateMutation.mutate({ id: editingPlant.id, input: data });
      return;
    }

    addMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="w-full py-6 px-6 md:px-10 relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-2 left-[10%] w-24 h-24 rounded-full bg-primary-foreground/20 blur-2xl" />
          <div className="absolute bottom-0 right-[15%] w-32 h-32 rounded-full bg-primary-foreground/15 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-40 h-40 rounded-full bg-primary-foreground/10 blur-3xl -translate-x-1/2" />
        </div>
        <div className="max-w-6xl mx-auto flex items-center gap-3 relative z-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-primary-foreground/20 backdrop-blur-sm rounded-xl p-2.5"
          >
            <Droplets className="w-7 h-7 text-primary-foreground" />
          </motion.div>
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold text-primary-foreground tracking-tight">
              Dashboard de Irrigacao Inteligente
            </h1>
            <p className="text-primary-foreground/70 text-xs md:text-sm mt-0.5">
              Monitoramento em tempo real das suas plantas
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-10 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Carregando dados...</p>
          </div>
        ) : plants ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-6">
            <StatsBar plants={plants} />

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground">
                  {activeTab === "overview" ? "Visao operacional" : "Analises"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeTab === "overview"
                    ? "Acompanhe cada planta individualmente e tome acoes rapidas."
                    : "Veja tendencias, prioridades e comparativos prontos para futura integracao com API."}
                </p>
              </div>

              <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl bg-secondary p-1 md:w-auto md:inline-flex">
                <TabsTrigger value="overview" className="flex-1 gap-2 rounded-xl px-4 py-2 md:flex-none">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex-1 gap-2 rounded-xl px-4 py-2 md:flex-none">
                  <BarChart3 className="h-4 w-4" />
                  Analises
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
                <PlantSelector
                  plants={plants}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onAdd={handleOpenAdd}
                />

                {selectedPlant ? (
                  <PlantCard
                    plant={selectedPlant}
                    onEdit={handleOpenEdit}
                    onDelete={handleOpenDelete}
                    onWater={(plant) => waterMutation.mutate(plant.id)}
                  />
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-16 bg-card rounded-2xl border border-border shadow-card"
                  >
                    <div className="bg-secondary rounded-full p-4 mb-4">
                      <Sprout className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-muted-foreground text-sm text-center">
                      Selecione uma planta ao lado para
                      <br />
                      visualizar seus dados.
                    </p>
                  </motion.div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="mt-0">
              <AnalyticsDashboard plants={plants} />
            </TabsContent>
          </Tabs>
        ) : null}
      </main>

      <footer className="w-full py-4 text-center text-xs text-muted-foreground border-t border-border">
        Sistema de Irrigacao Inteligente &copy; {new Date().getFullYear()}
      </footer>

      <PlantFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingPlant(null);
        }}
        onSave={handleSave}
        plant={editingPlant}
        loading={addMutation.isPending || updateMutation.isPending}
      />
      <DeletePlantDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeletingPlant(null);
        }}
        onConfirm={() => deletingPlant && deleteMutation.mutate(deletingPlant.id)}
        plant={deletingPlant}
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default Index;
