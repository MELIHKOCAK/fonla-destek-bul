import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { REVISION_ISSUE_OPTIONS, type RevisionIssueCode, mapAdminError } from "@/lib/admin/errors";
import { requestCampaignRevision } from "@/lib/admin/api";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  campaignId: string;
  lockVersion: number;
  onDone: () => void;
}

export function RequestRevisionDialog({ open, onOpenChange, campaignId, lockVersion, onDone }: Props) {
  const [note, setNote] = useState("");
  const [issues, setIssues] = useState<RevisionIssueCode[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const noteValid = note.trim().length >= 10;

  function toggle(code: RevisionIssueCode) {
    setIssues((prev) => (prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]));
  }

  async function handleSubmit() {
    if (!noteValid) return;
    setSubmitting(true);
    try {
      await requestCampaignRevision({ campaignId, lockVersion, creatorNote: note.trim(), issues });
      toast.success("Düzeltme isteği gönderildi");
      onOpenChange(false);
      setNote("");
      setIssues([]);
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
          <DialogTitle>Düzeltme iste</DialogTitle>
          <DialogDescription>Creator'a gönderilecek bir not ve eksiklik etiketleri seçin.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rev-note">Creator'a not <span aria-hidden className="text-destructive">*</span></Label>
            <Textarea
              id="rev-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Hangi alanlar nasıl düzeltilmeli? (≥10 karakter)"
              rows={5}
              required
              aria-invalid={!noteValid}
            />
            <p className="text-xs text-muted-foreground">{note.trim().length} / en az 10 karakter</p>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Konu etiketleri</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {REVISION_ISSUE_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={issues.includes(o.value)} onCheckedChange={() => toggle(o.value)} />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>İptal</Button>
          <Button onClick={handleSubmit} disabled={!noteValid || submitting}>
            {submitting ? "Gönderiliyor…" : "Gönder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
