import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { ResetPasswordForm } from "@/components/forms/ResetPasswordForm";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Şifre belirle — BeniFonla" },
      { name: "description", content: "Yeni şifrenizi belirleyin." },
      { name: "robots", content: "noindex, nofollow" },
      { name: "googlebot", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  return (
    <AuthLayout title="Yeni şifre belirle" description="Hesabınız için yeni bir şifre oluşturun.">
      <ResetPasswordForm />
    </AuthLayout>
  );
}
