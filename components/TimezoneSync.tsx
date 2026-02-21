"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function TimezoneSync() {
  const router = useRouter();

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const encoded = encodeURIComponent(tz);

    // Read the current cookie value
    const existing = document.cookie
      .split("; ")
      .find((row) => row.startsWith("sonaara_tz="))
      ?.split("=")[1];

    // Always write the cookie to keep it fresh
    document.cookie = `sonaara_tz=${encoded};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;

    // If the cookie was missing or wrong, trigger a server re-render so the
    // dashboard recalculates "yesterday" with the correct timezone
    if (!existing || decodeURIComponent(existing) !== tz) {
      router.refresh();
    }
  }, [router]);

  return null;
}
