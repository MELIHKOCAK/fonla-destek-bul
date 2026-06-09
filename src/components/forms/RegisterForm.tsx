import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useDemoSubmit } from "@/hooks/use-demo-submit";

const schema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Adınız en az 2 karakter olmalı.")
      .max(100, "Ad çok uzun."),
    email: z
      .string()
      .trim()
      .min(1, "E-posta gerekli.")
      .email("Geçerli bir e-posta adresi girin.")
      .max(255),
    password: z
      .string()
      .min(8, "Şifre en az 8 karakter olmalı.")
      .max(128, "Şifre çok uzun."),
    passwordConfirm: z.string(),
    accept: z.literal(true, { message: "Devam etmek için onaylamanız gerekir." }),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Şifreler eşleşmiyor.",
    path: ["passwordConfirm"],
  });

type FormValues = z.infer<typeof schema>;

export function RegisterForm() {
  const { submit, submitting } = useDemoSubmit("Demo aşaması — hesap işlemleri henüz etkin değil.");
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      passwordConfirm: "",
      accept: false as unknown as true,
    },
  });

  const accept = watch("accept");

  const onSubmit = handleSubmit(async () => {
    await submit();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="reg-fullname">Ad Soyad</Label>
        <Input
          id="reg-fullname"
          autoComplete="name"
          {...register("fullName")}
          aria-invalid={!!errors.fullName}
          aria-describedby={errors.fullName ? "reg-fullname-error" : undefined}
        />
        {errors.fullName ? (
          <p id="reg-fullname-error" className="text-xs text-destructive" role="alert">
            {errors.fullName.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="reg-email">E-posta</Label>
        <Input
          id="reg-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          {...register("email")}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "reg-email-error" : undefined}
        />
        {errors.email ? (
          <p id="reg-email-error" className="text-xs text-destructive" role="alert">
            {errors.email.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="reg-password">Şifre</Label>
        <Input
          id="reg-password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "reg-password-error" : undefined}
        />
        {errors.password ? (
          <p id="reg-password-error" className="text-xs text-destructive" role="alert">
            {errors.password.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="reg-password-confirm">Şifre tekrarı</Label>
        <Input
          id="reg-password-confirm"
          type="password"
          autoComplete="new-password"
          {...register("passwordConfirm")}
          aria-invalid={!!errors.passwordConfirm}
          aria-describedby={errors.passwordConfirm ? "reg-password-confirm-error" : undefined}
        />
        {errors.passwordConfirm ? (
          <p id="reg-password-confirm-error" className="text-xs text-destructive" role="alert">
            {errors.passwordConfirm.message}
          </p>
        ) : null}
      </div>
      <div className="flex items-start gap-2">
        <Checkbox
          id="reg-accept"
          checked={!!accept}
          onCheckedChange={(v) => setValue("accept", (v === true) as unknown as true)}
        />
        <Label htmlFor="reg-accept" className="text-xs font-normal leading-relaxed">
          <Link to="/terms" className="text-primary underline-offset-4 hover:underline">
            Kullanım Şartları
          </Link>{" "}
          ve{" "}
          <Link to="/privacy" className="text-primary underline-offset-4 hover:underline">
            Gizlilik Politikası
          </Link>
          'nı okudum ve kabul ediyorum.
        </Label>
      </div>
      {errors.accept ? (
        <p className="text-xs text-destructive" role="alert">
          {errors.accept.message}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "İşleniyor…" : "Kayıt ol"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Zaten hesabınız var mı?{" "}
        <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Giriş yapın
        </Link>
      </p>
    </form>
  );
}
