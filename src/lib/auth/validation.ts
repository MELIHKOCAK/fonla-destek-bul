import { z } from "zod";
import { isReservedUsername } from "./reserved-usernames";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Kullanıcı adı en az 3 karakter olmalı.")
  .max(30, "Kullanıcı adı en fazla 30 karakter olmalı.")
  .regex(/^[a-z0-9_]+$/, "Sadece küçük harf, rakam ve alt çizgi kullanın.")
  .refine((v) => !isReservedUsername(v), "Bu kullanıcı adı rezerve edilmiştir.");

export const passwordSchema = z
  .string()
  .min(10, "Şifre en az 10 karakter olmalı.")
  .max(128, "Şifre çok uzun.")
  .regex(/[a-z]/, "En az bir küçük harf içermeli.")
  .regex(/[A-Z]/, "En az bir büyük harf içermeli.")
  .regex(/\d/, "En az bir rakam içermeli.");

export const emailSchema = z
  .string()
  .trim()
  .min(1, "E-posta gerekli.")
  .email("Geçerli bir e-posta adresi girin.")
  .max(255, "E-posta çok uzun.");

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Görünen ad en az 2 karakter olmalı.")
  .max(100, "Görünen ad çok uzun.");

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    passwordConfirmation: z.string(),
    displayName: displayNameSchema,
    username: usernameSchema,
    termsAccepted: z.literal(true, {
      message: "Devam etmek için kullanım koşullarını kabul edin.",
    }),
    marketingConsent: z.boolean(),
  })
  .refine((d) => d.password === d.passwordConfirmation, {
    message: "Şifreler eşleşmiyor.",
    path: ["passwordConfirmation"],
  });

export type RegisterValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Şifre gerekli.").max(128),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirmation, {
    message: "Şifreler eşleşmiyor.",
    path: ["passwordConfirmation"],
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const onboardingSchema = z.object({
  displayName: displayNameSchema,
  username: usernameSchema,
});
export type OnboardingValues = z.infer<typeof onboardingSchema>;

export const profileSchema = z.object({
  displayName: displayNameSchema,
  bio: z.string().trim().max(500, "Biyografi en fazla 500 karakter olabilir.").optional().or(z.literal("")),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  websiteUrl: z
    .string()
    .trim()
    .max(255)
    .url("Geçerli bir URL girin.")
    .optional()
    .or(z.literal("")),
  isPublic: z.boolean(),
});
export type ProfileValues = z.infer<typeof profileSchema>;
