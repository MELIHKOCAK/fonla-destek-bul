import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { ForgotPasswordForm } from "@/components/forms/ForgotPasswordForm";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Şifremi unuttum — BeniFonla" },
      { name: "description", content: "Şifre sıfırlama bağlantısı isteyin." },
      { name: "robots", content: "noindex, nofollow" },
      { name: "googlebot", content: "noindex, nofollow" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  return (
    <AuthLayout title="Şifrenizi mi unuttunuz?" description="Size sıfırlama bağlantısı gönderelim.">
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
