"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "737879095116-1vmm3nhfjm6bfc5hius71fvvu8i8tv25.apps.googleusercontent.com";

const GSI_SCRIPT_URL = "https://accounts.google.com/gsi/client";

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
            getNotDisplayedReason: () => string;
            getSkippedReason: () => string;
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
  const signingInRef = useRef(false);

  const initializeOneTap = useCallback(() => {
    if (!window.google || initializedRef.current || signingInRef.current) return;
    initializedRef.current = true;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response: { credential: string }) => {
        if (signingInRef.current) return;
        signingInRef.current = true;
        try {
          await signInWithGoogleCredential(response.credential);
          router.push("/dashboard");
        } catch (err) {
          console.error("One Tap sign-in failed:", err);
          signingInRef.current = false;
        }
      },
      // Let user choose which account to sign in with
      auto_select: false,
      cancel_on_tap_outside: true,
      itp_support: true,
      // Disable FedCM — causes inconsistent prompt display across browsers
    });

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed()) {
        console.debug("One Tap not displayed:", notification.getNotDisplayedReason());
      }
      if (notification.isSkippedMoment()) {
        console.debug("One Tap skipped:", notification.getSkippedReason());
      }
    });
  }, [signInWithGoogleCredential, router]);

  useEffect(() => {
    if (loading || user) return;

    // If GSI script is already loaded, initialize directly
    if (window.google?.accounts?.id) {
      initializeOneTap();
      return;
    }

    // Check if script tag already exists (from a previous mount)
    const existingScript = document.querySelector(`script[src="${GSI_SCRIPT_URL}"]`);
    if (existingScript) {
      // Script tag exists but may still be loading
      existingScript.addEventListener("load", initializeOneTap);
      return;
    }

    const script = document.createElement("script");
    script.src = GSI_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = initializeOneTap;
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
    };
  }, [loading, user, initializeOneTap]);

  return null;
}
