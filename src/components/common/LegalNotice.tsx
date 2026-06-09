import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function LegalNotice() {
  return (
    <Alert className="border-warning/40 bg-warning/10">
      <AlertTriangle className="size-4 text-warning-foreground" aria-hidden="true" />
      <AlertTitle>Taslak metin</AlertTitle>
      <AlertDescription>
        Bu sayfa bir taslaktır ve hukuki inceleme gerektirir. Yayına geçmeden önce konusunda
        yetkin bir hukuk danışmanı tarafından gözden geçirilmelidir.
      </AlertDescription>
    </Alert>
  );
}
