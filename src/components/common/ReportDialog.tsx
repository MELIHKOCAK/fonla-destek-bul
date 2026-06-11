import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
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
import { REPORT_REASONS, submitCampaignReport, ReportApiError } from "@/lib/reports/api";
import { useAuth } from "@/hooks/use-auth";

const schema = z.object({
  reason: z.enum(["spam", "inappropriate", "policy", "fraud", "other"], {
    message: "Bir sebep seçin.",
  }),
  details: z
    .string()
    .trim()
    .min(10, "Lütfen en az 10 karakterle açıklayın.")
    .max(500, "En fazla 500 karakter olabilir."),
});

type FormValues = z.infer<typeof schema>;

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetLabel: string;
  campaignId: string;
}

export function ReportDialog({ open, onOpenChange, targetLabel, campaignId }: ReportDialogProps) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "spam", details: "" },
  });

  const reason = watch("reason");

  const onSubmit = handleSubmit(async (values) => {
    if (!user) {
      toast.error("Şikâyet göndermek için giriş yapın.");
      return;
    }
    setSubmitting(true);
    try {
      await submitCampaignReport({
        campaignId,
        reasonCode: values.reason,
        description: values.details,
      });
      toast.success("Şikâyetiniz alındı. Ekibimiz inceleyecektir.");
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ReportApiError ? err.message : "Şikâyet gönderilemedi.");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Şikâyet et</DialogTitle>
          <DialogDescription>
            {targetLabel} ile ilgili endişenizi paylaşın. Şikâyetler ekibimiz tarafından
            incelenir.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-reason">Sebep</Label>
            <Select
              value={reason}
              onValueChange={(v) => setValue("reason", v as FormValues["reason"])}
            >
              <SelectTrigger id="report-reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.reason ? (
              <p className="text-xs text-destructive" role="alert">
                {errors.reason.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-details">Açıklama</Label>
            <Textarea
              id="report-details"
              rows={4}
              {...register("details")}
              aria-invalid={!!errors.details}
              aria-describedby={errors.details ? "report-details-error" : undefined}
            />
            {errors.details ? (
              <p id="report-details-error" className="text-xs text-destructive" role="alert">
                {errors.details.message}
              </p>
            ) : null}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Vazgeç
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Gönderiliyor…" : "Şikâyeti gönder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
