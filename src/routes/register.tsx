import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { RegisterForm } from "@/components/forms/RegisterForm";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Kayıt ol — BeniFonla" },
      { name: "description", content: "BeniFonla'ya katılın ve toplulukla buluşun." },
      { name: "robots", content: "noindex, nofollow" },
      { name: "googlebot", content: "noindex, nofollow" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <AuthLayout title="Hesap oluştur" description="Topluluğa katılmak için bilgilerinizi girin.">
      <RegisterForm />
    </AuthLayout>
  );
}
