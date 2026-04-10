"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "737879095116-1vmm3nhfjm6bfc5hius71fvvu8i8tv25.apps.googleusercontent.com";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (callback?: (notification: {
            isNotDisplayed: () => boolean;
            isSkippedMoment: () => boolean;
            isDismissedMoment: () => boolean;
            getMomentType: () => string;
          }) => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}

export function GoogleOneTap() {
  const { user, loading, signInWithGoogleCredential } = useAuth();
  const router = useRouter();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (loading || user || initializedRef.current) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google || user) return;
      initializedRef.current = true;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential: string }) => {
          try {
            await signInWithGoogleCredential(response.credential);
            router.push("/dashboard");
          } catch (err) {
            console.error("One Tap sign-in failed:", err);
          }
        },
        auto_select: true,
        cancel_on_tap_outside: true,
        itp_support: true,
        use_fedcm_for_prompt: true,
      });

      window.google.accounts.id.prompt();
    };

    document.head.appendChild(script);

    return () => {
      if (window.google) {
        try {
          window.google.accounts.id.cancel();
        } catch {
          // ignore
        }
      }
      initializedRef.current = false;
      const existing = document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]'
      );
      if (existing) existing.remove();
    };
  }, [loading, user, signInWithGoogleCredential, router]);

  return null;
}
