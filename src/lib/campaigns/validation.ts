import { z } from "zod";
import { CAMPAIGN_LIMITS } from "./config";

const L = CAMPAIGN_LIMITS;

export const basicsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(L.TITLE_MIN, `Başlık en az ${L.TITLE_MIN} karakter olmalı.`)
    .max(L.TITLE_MAX, `Başlık en fazla ${L.TITLE_MAX} karakter olmalı.`),
  short_description: z
    .string()
    .trim()
    .min(L.SHORT_DESC_MIN, `Kısa açıklama en az ${L.SHORT_DESC_MIN} karakter olmalı.`)
    .max(L.SHORT_DESC_MAX, `Kısa açıklama en fazla ${L.SHORT_DESC_MAX} karakter olmalı.`),
  category_id: z.string().uuid("Geçerli bir kategori seçin."),
});
export type BasicsValues = z.infer<typeof basicsSchema>;

export const fundingSchema = z
  .object({
    goal_amount_minor: z
      .number()
      .int()
      .min(L.GOAL_MINOR_MIN, `Hedef tutar en az ${L.GOAL_MINOR_MIN / 100} TL olmalı.`)
      .max(L.GOAL_MINOR_MAX, `Hedef tutar en fazla ${L.GOAL_MINOR_MAX / 100} TL olmalı.`),
    start_at: z.string().min(1, "Başlangıç tarihi gerekli."),
    end_at: z.string().min(1, "Bitiş tarihi gerekli."),
  })
  .superRefine((v, ctx) => {
    const s = new Date(v.start_at);
    const e = new Date(v.end_at);
    if (Number.isNaN(s.getTime())) {
      ctx.addIssue({ code: "custom", path: ["start_at"], message: "Geçerli bir tarih girin." });
      return;
    }
    if (Number.isNaN(e.getTime())) {
      ctx.addIssue({ code: "custom", path: ["end_at"], message: "Geçerli bir tarih girin." });
      return;
    }
    if (s.getTime() < Date.now() - 60_000) {
      ctx.addIssue({ code: "custom", path: ["start_at"], message: "Başlangıç tarihi geçmişte olamaz." });
    }
    if (e.getTime() <= s.getTime()) {
      ctx.addIssue({ code: "custom", path: ["end_at"], message: "Bitiş tarihi başlangıçtan sonra olmalı." });
      return;
    }
    const days = (e.getTime() - s.getTime()) / 86_400_000;
    if (days < L.DURATION_DAYS_MIN) {
      ctx.addIssue({ code: "custom", path: ["end_at"], message: `Kampanya en az ${L.DURATION_DAYS_MIN} gün olmalı.` });
    }
    if (days > L.DURATION_DAYS_MAX) {
      ctx.addIssue({ code: "custom", path: ["end_at"], message: `Kampanya en fazla ${L.DURATION_DAYS_MAX} gün olmalı.` });
    }
  });
export type FundingValues = z.infer<typeof fundingSchema>;

const textStep = (min: number, max: number, label: string) =>
  z.object({
    content: z
      .string()
      .trim()
      .min(min, `${label} en az ${min} karakter olmalı.`)
      .max(max, `${label} en fazla ${max} karakter olmalı.`),
  });

export const storySchema = textStep(L.STORY_MIN, L.STORY_MAX, "Hikâye");
export const fundsUsageSchema = textStep(L.FUNDS_USAGE_MIN, L.FUNDS_USAGE_MAX, "Fon kullanım planı");
export const timelineSchema = textStep(L.TIMELINE_MIN, L.TIMELINE_MAX, "Takvim");
export const risksSchema = textStep(L.RISKS_MIN, L.RISKS_MAX, "Riskler");

export const rewardTierSchema = z.object({
  title: z.string().trim().min(2).max(L.REWARD_TITLE_MAX),
  description: z.string().trim().max(L.REWARD_DESC_MAX).optional().nullable(),
  amount_minor: z.number().int().min(L.REWARD_AMOUNT_MIN_MINOR),
  quantity_limit: z.number().int().positive().nullable().optional(),
  estimated_delivery_date: z.string().nullable().optional(),
  shipping_required: z.boolean(),
});
export type RewardTierValues = z.infer<typeof rewardTierSchema>;
