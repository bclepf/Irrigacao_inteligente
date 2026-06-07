import type { Plant } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  plant: Plant | null;
  loading?: boolean;
}

const DeletePlantDialog = ({ open, onClose, onConfirm, plant, loading }: Props) => (
  <AlertDialog open={open} onOpenChange={(value) => !value && onClose()}>
    <AlertDialogContent className="max-w-[calc(100vw-1.5rem)]">
      <AlertDialogHeader>
        <AlertDialogTitle>Excluir "{plant?.name}"?</AlertDialogTitle>
        <AlertDialogDescription>
          Essa acao nao pode ser desfeita. A planta sera removida permanentemente do sistema de monitoramento.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
        <AlertDialogCancel onClick={onClose} className="mt-0 w-full sm:w-auto">
          Cancelar
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          disabled={loading}
          className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
        >
          Excluir
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default DeletePlantDialog;
