import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarUploader } from "@/components/forms/AvatarUploader";
import { ProfileForm } from "@/components/forms/ProfileForm";

export const Route = createFileRoute("/_authenticated/settings/profile")({
  head: () => ({ meta: [{ title: "Profil ayarları — BeniFonla" }] }),
  component: SettingsProfilePage,
});

function SettingsProfilePage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Avatar</CardTitle>
          <CardDescription>Toplulukta görünecek profil fotoğrafın.</CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUploader />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Genel bilgiler</CardTitle>
          <CardDescription>İsim, bio ve iletişim bilgilerin.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm />
        </CardContent>
      </Card>
    </div>
  );
}
