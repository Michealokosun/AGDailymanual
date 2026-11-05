"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "evangel-push-prompt-dismissed-v2";

function needsIOSHomeScreen(): boolean {
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
  return (
    ios &&
    !window.matchMedia("(display-mode: standalone)").matches &&
    !standaloneNavigator.standalone
  );
}

function applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = window.atob(base64);
  const key = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) {
    key[index] = bytes.charCodeAt(index);
  }
  return key;
}

export function PushNotificationPrompt() {
  const [open, setOpen] = useState(false);
  const [iosInstallNeeded, setIosInstallNeeded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void fetch("/api/push/config", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Push notifications are not configured");
        return (await response.json()) as { publicKey?: unknown };
      })
      .then((config) => {
        if (active && typeof config.publicKey === "string") {
          setPublicKey(config.publicKey);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setConfigLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      return;
    }
    if (Notification.permission === "denied") return;

    const iosInstallNeeded = needsIOSHomeScreen();
    setIosInstallNeeded(iosInstallNeeded);
    if (iosInstallNeeded) {
      setOpen(true);
      return;
    }

    if (Notification.permission === "granted") {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => registration.pushManager.getSubscription())
        .then(async (subscription) => {
          if (subscription) {
            const response = await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(subscription),
            });
            if (response.ok) sessionStorage.setItem(DISMISSED_KEY, "true");
            else setOpen(true);
          } else {
            setOpen(true);
          }
        })
        .catch(() => setOpen(true));
      return;
    }

    setOpen(true);
  }, []);

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, "true");
    setOpen(false);
  }

  async function allowNotifications() {
    if (iosInstallNeeded) {
      setMessage(
        "In Safari, tap Share, choose Add to Home Screen, then open the app from its new icon to enable alerts.",
      );
      return;
    }
    if (!publicKey) {
      setMessage("Push notifications are not configured yet. Please try again later.");
      return;
    }

    setBusy(true);
    setMessage("");
    let createdSubscription = false;
    try {
      // Browsers require the permission request to follow this user tap directly.
      const permissionRequest =
        Notification.permission === "granted"
          ? Promise.resolve<NotificationPermission>("granted")
          : Notification.requestPermission();
      const permission = await permissionRequest;
      if (permission !== "granted") {
        setMessage(
          permission === "denied"
            ? "Notifications are blocked for this site in your browser settings."
            : "No permission was granted. You can choose Allow when you’re ready.",
        );
        setBusy(false);
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey(publicKey),
        }));
      createdSubscription = !existing;

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription),
      });
      if (!response.ok) {
        throw new Error("The app couldn’t save this device. Please try again later.");
      }

      sessionStorage.setItem(DISMISSED_KEY, "true");
      setOpen(false);
    } catch (error) {
      if (createdSubscription) {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        await subscription?.unsubscribe();
      }
      setMessage(
        error instanceof Error
          ? error.message
          : "Couldn’t enable notifications. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="push-prompt-anchor">
      <section
        className="push-prompt"
        role="region"
        aria-labelledby="push-prompt-title"
        aria-describedby="push-prompt-description"
      >
        <div className="push-prompt__heading">
          <div className="push-prompt__icon" aria-hidden="true">♧</div>
          <div>
            <p className="overline">NEW READING ALERTS</p>
            <h2 id="push-prompt-title">Stay updated</h2>
          </div>
          <button
            className="push-prompt__close"
            type="button"
            onClick={dismiss}
            aria-label="Dismiss notification prompt"
            disabled={busy}
          >
            ×
          </button>
        </div>
        <p id="push-prompt-description" className="push-prompt__copy">
          {iosInstallNeeded
            ? "Add this app to your Home Screen to receive new devotional alerts."
            : "Would you like to know when a new devotional is published?"}
        </p>
        {message && (
          <p className="push-prompt__message" role="status">
            {message}
          </p>
        )}
        <div className="push-prompt__actions">
          <button
            className="push-prompt__allow"
            type="button"
            onClick={allowNotifications}
            disabled={busy || (configLoading && !iosInstallNeeded)}
          >
            {busy
              ? "Enabling…"
              : iosInstallNeeded
                ? "How to enable"
                : configLoading
                  ? "Loading…"
                  : "Allow alerts"}
          </button>
          <button
            className="push-prompt__later"
            type="button"
            onClick={dismiss}
            disabled={busy}
          >
            Not now
          </button>
        </div>
        <p className="push-prompt__note">You can dismiss this and keep reading.</p>
      </section>
    </div>
  );
}
