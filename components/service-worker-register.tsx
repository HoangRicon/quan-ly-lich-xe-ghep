"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      const baseUrl = isLocalhost
        ? `${window.location.protocol}//${window.location.host}`
        : window.location.origin;

      navigator.serviceWorker
        .register(`${baseUrl}/sw.js`)
        .then((registration) => {
          console.log("Service Worker registered:", registration.scope);
        })
        .catch((err) => {
          console.warn("Service Worker registration failed:", err.message);
        });
    }
  }, []);

  return null;
}
