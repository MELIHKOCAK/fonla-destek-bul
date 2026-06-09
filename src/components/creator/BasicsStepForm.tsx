import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { basicsSchema, type BasicsValues } from "@/lib/campaigns/validation";
import { listActiveCategories, type CampaignRow, type CategoryRow } from "@/lib/campaigns/api";
import { WIZARD_STEPS } from "@/lib/campaigns/config";
import { useCampaignAutosave } from "./useCampaignAutosave";
import { WizardStepNav } from "./WizardStepNav";

interface Props {
  campaign: CampaignRow;
  onSaved: (next: CampaignRow) => void;
}

export function BasicsStepForm({ campaign, onSaved }: Props) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const { status, schedule, saveNow, errorMessage } = useCampaignAutosave({ campaign, onSaved });

  const form = useForm<BasicsValues>({
    resolver: zodResolver(basicsSchema),
    defaultValues: {
      title: campaign.title ?? "",
      short_description: campaign.short_description ?? "",
      category_id: campaign.category_id ?? "",
    },
    mode: "onChange",
  });
  const { register, watch, setValue, formState } = form;

  useEffect(() => {
    void listActiveCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const sub = watch((values, info) => {
      if (!info.name) return;
      const v = values as BasicsValues;
      schedule({ [info.name]: v[info.name as keyof BasicsValues] } as never);
    });
    return () => sub.unsubscribe();
  }, [watch, schedule]);

  useEffect(() => {
    if (errorMessage && status === "error") toast.error(errorMessage);
  }, [errorMessage, status]);

  const onNext = async () => {
    const ok = await form.trigger();
    if (!ok) return;
    await saveNow(form.getValues());
    const idx = WIZARD_STEPS.indexOf("basics");
    navigate({
      to: "/creator/campaigns/$campaignId/edit/$step",
      params: { campaignId: campaign.id, step: WIZARD_STEPS[idx + 1] },
    });
  };

  const categoryId = watch("category_id");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Kampanya başlığı</Label>
        <Input id="title" maxLength={80} {...register("title")} />
        {formState.errors.title && (
          <p className="text-sm text-destructive">{formState.errors.title.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="short_description">Kısa açıklama</Label>
        <Textarea id="short_description" rows={3} maxLength={200} {...register("short_description")} />
        <p className="text-xs text-muted-foreground">{watch("short_description")?.length ?? 0}/200</p>
        {formState.errors.short_description && (
          <p className="text-sm text-destructive">{formState.errors.short_description.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="category_id">Kategori</Label>
        <Select
          value={categoryId}
          onValueChange={(v) => setValue("category_id", v, { shouldValidate: true, shouldDirty: true })}
        >
          <SelectTrigger id="category_id">
            <SelectValue placeholder="Kategori seçin" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formState.errors.category_id && (
          <p className="text-sm text-destructive">{formState.errors.category_id.message}</p>
        )}
      </div>
      <WizardStepNav
        campaignId={campaign.id}
        currentStep="basics"
        saveStatus={status}
        onSaveAndNext={onNext}
        saving={status === "saving"}
      />
    </div>
  );
}
