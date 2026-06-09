import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { LoginForm } from "@/components/forms/LoginForm";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Giriş yap — BeniFonla" },
      { name: "description", content: "BeniFonla hesabınıza giriş yapın." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <AuthLayout title="Giriş yap" description="Hesabınızla devam edin.">
      <LoginForm />
    </AuthLayout>
  );
}
