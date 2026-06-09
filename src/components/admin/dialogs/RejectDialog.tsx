import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { rejectCampaign } from "@/lib/admin/api";
import { REJECT_REASON_CODES, type RejectReasonCode, mapAdminError } from "@/lib/admin/errors";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  campaignId: string;
  lockVersion: number;
  onDone: () => void;
}

export function RejectDialog({ open, onOpenChange, campaignId, lockVersion, onDone }: Props) {
  const [code, setCode] = useState<RejectReasonCode | "">("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const noteValid = note.trim().length >= 10;
  const valid = code !== "" && noteValid;

  async function handleSubmit() {
    if (!valid) return;
    setSubmitting(true);
    try {
      await rejectCampaign({ campaignId, lockVersion, reasonCode: code as RejectReasonCode, creatorNote: note.trim() });
      toast.success("Kampanya reddedildi");
      onOpenChange(false);
      setCode("");
      setNote("");
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
          <DialogTitle>Kampanyayı reddet</DialogTitle>
          <DialogDescription>Bu işlem geri alınamaz; creator'a sebep gönderilir.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reject-code">Sebep kodu <span aria-hidden className="text-destructive">*</span></Label>
            <Select value={code} onValueChange={(v) => setCode(v as RejectReasonCode)}>
              <SelectTrigger id="reject-code"><SelectValue placeholder="Sebep seçin" /></SelectTrigger>
              <SelectContent>
                {REJECT_REASON_CODES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reject-note">Creator'a açıklama <span aria-hidden className="text-destructive">*</span></Label>
            <Textarea
              id="reject-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              required
              aria-invalid={!noteValid}
              placeholder="En az 10 karakter"
            />
            <p className="text-xs text-muted-foreground">{note.trim().length} / en az 10 karakter</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>İptal</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={!valid || submitting}>
            {submitting ? "Reddediliyor…" : "Reddet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
