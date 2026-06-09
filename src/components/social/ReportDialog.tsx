import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReportTarget } from "@/hooks/social/use-comments";
import type { ReportReasonCode } from "@/lib/social/api";

const REASONS: ReadonlyArray<{ value: ReportReasonCode; label: string }> = [
  { value: "spam", label: "Spam veya yanıltıcı içerik" },
  { value: "inappropriate", label: "Uygunsuz içerik" },
  { value: "policy", label: "Topluluk kuralları ihlali" },
  { value: "fraud", label: "Dolandırıcılık şüphesi" },
  { value: "other", label: "Diğer" },
];

const schema = z.object({
  reason: z.enum(["spam", "inappropriate", "policy", "fraud", "other"]),
  description: z
    .string()
    .trim()
    .min(10, "Lütfen en az 10 karakterle açıklayın.")
    .max(500, "En fazla 500 karakter olabilir."),
});

type FormValues = z.infer<typeof schema>;

export type ReportTarget =
  | { kind: "campaign"; campaignId: string; label: string }
  | { kind: "comment"; commentId: string; label: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ReportTarget | null;
}

export function ReportDialog({ open, onOpenChange, target }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const m = useReportTarget();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "spam", description: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (!target) return;
    setSubmitting(true);
    try {
      await m.mutateAsync({
        campaignId: target.kind === "campaign" ? target.campaignId : null,
        commentId: target.kind === "comment" ? target.commentId : null,
        reasonCode: values.reason,
        description: values.description,
      });
      form.reset();
      onOpenChange(false);
    } catch {
      // toast already handled in hook
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Şikâyet bildir</DialogTitle>
          <DialogDescription>
            {target ? `Hedef: ${target.label}` : null} — Şikâyetiniz moderatör ekibine
            iletilir. Kampanya sahibi şikâyetinizi göremez.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-reason">Sebep</Label>
            <Select
              value={form.watch("reason")}
              onValueChange={(v) => form.setValue("reason", v as ReportReasonCode)}
            >
              <SelectTrigger id="report-reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-description">Açıklama</Label>
            <Textarea
              id="report-description"
              rows={4}
              maxLength={500}
              minLength={10}
              {...form.register("description")}
              aria-invalid={!!form.formState.errors.description}
              aria-describedby={
                form.formState.errors.description ? "report-description-error" : undefined
              }
            />
            {form.formState.errors.description ? (
              <p id="report-description-error" className="text-xs text-destructive">
                {form.formState.errors.description.message}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Vazgeç
            </Button>
            <Button type="submit" disabled={submitting || !target}>
              Gönder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
