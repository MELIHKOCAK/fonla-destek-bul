import { createFileRoute } from "@tanstack/react-router";
import { Container } from "@/components/common/Container";
import { OnboardingForm } from "@/components/forms/OnboardingForm";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Hoş geldin — BeniFonla" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  return (
    <Container className="py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 space-y-1.5 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Profilini tamamla</h1>
          <p className="text-sm text-muted-foreground">
            BeniFonla'da kullanılacak adınızı ve benzersiz kullanıcı adınızı seçin.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <OnboardingForm />
        </div>
      </div>
    </Container>
  );
}
