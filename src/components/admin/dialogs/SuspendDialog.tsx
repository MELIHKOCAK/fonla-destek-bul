import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { suspendCampaign } from "@/lib/admin/api";
import { mapAdminError } from "@/lib/admin/errors";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  campaignId: string;
  lockVersion: number;
  onDone: () => void;
}

export function SuspendDialog({ open, onOpenChange, campaignId, lockVersion, onDone }: Props) {
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const valid = reason.trim().length >= 10;

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await suspendCampaign({ campaignId, lockVersion, reason: reason.trim() });
      toast.success("Kampanya askıya alındı");
      setConfirmOpen(false);
      onOpenChange(false);
      setReason("");
      onDone();
    } catch (e) {
      toast.error(mapAdminError(e).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kampanyayı askıya al</DialogTitle>
            <DialogDescription>Kampanya kamuya açık listelerden kalkar ve creator bilgilendirilir.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="suspend-reason">Sebep <span aria-hidden className="text-destructive">*</span></Label>
            <Textarea
              id="suspend-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
              aria-invalid={!valid}
              placeholder="En az 10 karakter"
            />
            <p className="text-xs text-muted-foreground">{reason.trim().length} / en az 10 karakter</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button variant="destructive" onClick={() => setConfirmOpen(true)} disabled={!valid}>Devam et</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem kampanyayı askıya alır; ödeme/sözleşme akışlarını etkileyebilir. Onaylıyor musunuz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={submitting}>
              {submitting ? "Askıya alınıyor…" : "Evet, askıya al"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
