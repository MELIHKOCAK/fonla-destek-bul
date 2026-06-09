import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCampaignDraft, listActiveCategories, type CategoryRow } from "@/lib/campaigns/api";
import { mapCampaignError } from "@/lib/campaigns/errors";

export const Route = createFileRoute("/_authenticated/creator/campaigns/new")({
  component: NewCampaignPage,
});

function NewCampaignPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inflightRef = useRef(false);

  useEffect(() => {
    listActiveCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inflightRef.current) return;
    if (title.trim().length < 5) {
      toast.error("Başlık en az 5 karakter olmalı.");
      return;
    }
    if (!categoryId) {
      toast.error("Kategori seçin.");
      return;
    }
    inflightRef.current = true;
    setSubmitting(true);
    try {
      const c = await createCampaignDraft({ categoryId, title: title.trim() });
      navigate({
        to: "/creator/campaigns/$campaignId/edit/$step",
        params: { campaignId: c.id, step: "basics" },
        replace: true,
      });
    } catch (err) {
      toast.error(mapCampaignError(err).message);
      inflightRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold">Yeni kampanya</h1>
        <p className="text-sm text-muted-foreground">Başlık ve kategori ile başlayın. Diğer alanları sonra doldurursunuz.</p>
      </header>
      <form onSubmit={onCreate} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Başlık</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            minLength={5}
            maxLength={80}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Kategori</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Seçin" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Oluşturuluyor…" : "Taslak oluştur"}
        </Button>
      </form>
    </div>
  );
}
