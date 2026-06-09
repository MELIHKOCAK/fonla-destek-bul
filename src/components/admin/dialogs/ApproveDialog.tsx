import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { approveCampaign } from "@/lib/admin/api";
import { mapAdminError } from "@/lib/admin/errors";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  campaignId: string;
  lockVersion: number;
  canApprove: boolean;
  onDone: () => void;
}

export function ApproveDialog({ open, onOpenChange, campaignId, lockVersion, canApprove, onDone }: Props) {
  const [internalNote, setInternalNote] = useState("");
  const [creatorNote, setCreatorNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!confirmed) return;
    setSubmitting(true);
    try {
      await approveCampaign({
        campaignId,
        lockVersion,
        internalNote: internalNote.trim() || undefined,
        creatorNote: creatorNote.trim() || undefined,
      });
      toast.success("Kampanya onaylandı");
      onOpenChange(false);
      setInternalNote("");
      setCreatorNote("");
      setConfirmed(false);
      onDone();
    } catch (e) {
      toast.error(mapAdminError(e).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kampanyayı onayla</DialogTitle>
          <DialogDescription>
            Tüm zorunlu alanlar tamam olmalı. Başlangıç tarihi gelecekteyse kampanya planlanır, aksi halde anında yayına alınır.
          </DialogDescription>
        </DialogHeader>
        {!canApprove && (
          <p role="alert" className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-sm">
            Eksik alanlar olduğu için onay verilemez. Yan paneldeki "Eksik alanlar" listesini kontrol edin.
          </p>
        )}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="approve-internal">İç not (opsiyonel)</Label>
            <Textarea id="approve-internal" value={internalNote} onChange={(e) => setInternalNote(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="approve-creator">Creator'a not (opsiyonel)</Label>
            <Textarea id="approve-creator" value={creatorNote} onChange={(e) => setCreatorNote(e.target.value)} rows={3} />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            <span>İçerik, hedef, ödüller, riskler ve hukuki uyumu kontrol ettim.</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>İptal</Button>
          <Button onClick={handleSubmit} disabled={!confirmed || !canApprove || submitting}>
            {submitting ? "Onaylanıyor…" : "Onayla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
