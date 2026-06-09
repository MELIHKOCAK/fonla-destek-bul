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

const REASONS = [
  { value: "spam", label: "Spam veya yanıltıcı içerik" },
  { value: "fraud", label: "Dolandırıcılık şüphesi" },
  { value: "copyright", label: "Telif hakkı ihlali" },
  { value: "hate", label: "Nefret söylemi veya taciz" },
  { value: "other", label: "Diğer" },
] as const;

const schema = z.object({
  reason: z.enum(["spam", "fraud", "copyright", "hate", "other"], {
    message: "Bir sebep seçin.",
  }),
  details: z
    .string()
    .trim()
    .min(10, "Lütfen en az 10 karakterle açıklayın.")
    .max(1000, "En fazla 1000 karakter olabilir."),
});

type FormValues = z.infer<typeof schema>;

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetLabel: string;
}

export function ReportDialog({ open, onOpenChange, targetLabel }: ReportDialogProps) {
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

  const onSubmit = handleSubmit(async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 300));
    setSubmitting(false);
    toast.success("Şikâyetiniz alındı (demo). Gerçek inceleme süreci henüz aktif değil.");
    reset();
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Şikâyet et</DialogTitle>
          <DialogDescription>
            {targetLabel} ile ilgili endişenizi paylaşın. Demo aşamasında gerçek bir aksiyon
            alınmaz.
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
                {REASONS.map((r) => (
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
              {submitting ? "Gönderiliyor…" : "Gönder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
