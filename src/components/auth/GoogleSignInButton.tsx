import { useState } from "react";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { mapAuthError } from "@/lib/auth/error-messages";

export function GoogleSignInButton({ disabled }: { disabled?: boolean }) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth/callback",
      });
      if (result.error) {
        toast.error(mapAuthError(result.error, "Google ile giriş başarısız oldu."));
        setLoading(false);
        return;
      }
      // If redirected, browser will navigate away. If tokens returned, AuthProvider picks it up.
      if (!result.redirected) {
        // session set by lovable.auth.setSession internally
        setLoading(false);
      }
    } catch (err) {
      toast.error(mapAuthError(err, "Google ile giriş başarısız oldu."));
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label="Google ile devam et"
    >
      <svg className="mr-2 size-4" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.11A6.61 6.61 0 0 1 5.48 12c0-.73.13-1.45.36-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.66-2.84Z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
          fill="#EA4335"
        />
      </svg>
      {loading ? "Google’a yönlendiriliyor…" : "Google ile devam et"}
    </Button>
  );
}
