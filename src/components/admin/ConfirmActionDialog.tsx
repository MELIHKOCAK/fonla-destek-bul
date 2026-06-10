import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export interface ConfirmActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  /** Mark irreversible. Forces type-to-confirm. */
  destructive?: boolean;
  /** Word user must type to confirm a destructive action. Defaults to "ONAYLA". */
  typeToConfirm?: string;
  /** Label of confirm button. */
  confirmLabel?: string;
  /** Min length for reason. 0 = optional. */
  reasonMinLength?: number;
  loading?: boolean;
  error?: string | null;
  onConfirm: (reason: string) => Promise<void> | void;
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  destructive = false,
  typeToConfirm = "ONAYLA",
  confirmLabel = "Onayla",
  reasonMinLength = 10,
  loading = false,
  error,
  onConfirm,
}: ConfirmActionDialogProps) {
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");

  const reasonOk = reason.trim().length >= reasonMinLength;
  const typeOk = !destructive || typed.trim() === typeToConfirm;
  const canConfirm = reasonOk && typeOk && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConfirm) return;
    await onConfirm(reason.trim());
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!loading) {
          if (!o) {
            setReason("");
            setTyped("");
          }
          onOpenChange(o);
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div>{description}</div>
          </DialogDescription>
        </DialogHeader>

        {destructive && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" aria-hidden />
            <AlertDescription>
              Bu işlem geri alınamaz. Devam etmek için aşağıya{" "}
              <code className="font-mono font-semibold">{typeToConfirm}</code> yazın.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="confirm-reason">
              Gerekçe {reasonMinLength > 0 && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="confirm-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              required={reasonMinLength > 0}
              disabled={loading}
              placeholder="Bu işlemi neden yapıyorsunuz? (denetim günlüğüne yazılacak)"
              aria-describedby="confirm-reason-help"
            />
            <p id="confirm-reason-help" className="text-xs text-muted-foreground">
              En az {reasonMinLength} karakter — denetim günlüğüne kaydedilecek.
            </p>
          </div>

          {destructive && (
            <div className="space-y-1.5">
              <Label htmlFor="confirm-type">Onay kelimesini yazın</Label>
              <Input
                id="confirm-type"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                disabled={loading}
                placeholder={typeToConfirm}
              />
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Vazgeç
            </Button>
            <Button
              type="submit"
              variant={destructive ? "destructive" : "default"}
              disabled={!canConfirm}
            >
              {loading ? "İşleniyor…" : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
