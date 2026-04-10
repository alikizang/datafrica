"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export function AntiScrape() {
  const { user } = useAuth();
  const [devToolsOpen, setDevToolsOpen] = useState(false);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    // Admins are exempt from all anti-scrape protections
    if (isAdmin) return;

    // Block right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Block keyboard shortcuts for dev tools and copy
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I / Cmd+Shift+I (Inspector)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "I") {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+J / Cmd+Shift+J (Console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "J") {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+C / Cmd+Shift+C (Element picker)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "C") {
        e.preventDefault();
        return false;
      }
      // Ctrl+U / Cmd+U (View source)
      if ((e.ctrlKey || e.metaKey) && e.key === "u") {
        e.preventDefault();
        return false;
      }
      // Ctrl+S / Cmd+S (Save page)
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        return false;
      }
      // Ctrl+C / Cmd+C (Copy) on body (not input/textarea)
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        const target = e.target as HTMLElement;
        const tagName = target.tagName.toLowerCase();
        if (tagName !== "input" && tagName !== "textarea") {
          e.preventDefault();
          return false;
        }
      }
      // Ctrl+A / Cmd+A (Select all)
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        const target = e.target as HTMLElement;
        const tagName = target.tagName.toLowerCase();
        if (tagName !== "input" && tagName !== "textarea") {
          e.preventDefault();
          return false;
        }
      }
    };

    // Block drag
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Block copy event
    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      if (tagName !== "input" && tagName !== "textarea") {
        e.preventDefault();
        return false;
      }
    };

    // DevTools detection using window size (desktop only - mobile has false positives)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    const checkDevTools = () => {
      if (isMobile) return;
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;

      if (widthDiff || heightDiff) {
        if (!devToolsOpen) {
          setDevToolsOpen(true);
        }
      }
    };

    const detectConsole = () => {
      if (isMobile) return;
      const element = new Image();
      Object.defineProperty(element, "id", {
        get: function () {
          setDevToolsOpen(true);
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (console as any).log("%c", element);
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("copy", handleCopy);

    const devtoolsCheckInterval = setInterval(() => {
      checkDevTools();
      detectConsole();
    }, 1000);

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        navigator.clipboard.writeText("");
      }
    };
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("keyup", handleKeyUp);
      clearInterval(devtoolsCheckInterval);
    };
  }, [devToolsOpen, isAdmin]);

  // Handle close action - reload the page
  const handleClose = () => {
    setDevToolsOpen(false);
    window.location.reload();
  };

  // Admins never see the overlay
  if (isAdmin || !devToolsOpen) return null;

  return (
    <div className="devtools-overlay">
      <div className="text-center max-w-md px-6">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">
          Developer Tools Detected
        </h2>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          For security reasons, this platform cannot be accessed while developer tools are open.
          Please close your developer tools and click the button below to continue.
        </p>
        <button
          onClick={handleClose}
          className="px-8 py-3 bg-primary text-primary-foreground font-medium rounded-full hover:bg-primary/90 transition-colors"
        >
          Close & Reload Page
        </button>
      </div>
    </div>
  );
}
