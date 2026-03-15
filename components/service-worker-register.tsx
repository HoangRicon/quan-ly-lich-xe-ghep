"use client";

import { useEffect, useState } from "react";

export default function ServiceWorkerRegistration() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      const baseUrl = isLocalhost 
        ? `${window.location.protocol}//${window.location.host}` 
        : window.location.origin;

      navigator.serviceWorker
        .register(`${baseUrl}/sw.js`)
        .then((registration) => {
          console.log("Service Worker registered:", registration.scope);
          setError(null);
        })
        .catch((err) => {
          console.error("Service Worker registration failed:", err);
          setError(err.message);
        });
    } else {
      console.warn("Service Workers not supported");
    }
  }, []);

  return null;
}
