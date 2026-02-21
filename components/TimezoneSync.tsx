"use client";

import { useEffect } from "react";

export function TimezoneSync() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    document.cookie = `sonaara_tz=${encodeURIComponent(tz)};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
  }, []);
  return null;
}
