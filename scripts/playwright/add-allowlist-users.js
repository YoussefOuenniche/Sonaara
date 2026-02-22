// @ts-check
const { chromium } = require("@playwright/test");

const POD_ID = process.env.POD_ID;
const EMAILS = (process.env.EMAILS || "").split(",").map((e) => e.trim()).filter(Boolean);
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

async function postWebhook(body) {
  const res = await fetch(`${WEBHOOK_URL}/api/pods/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WEBHOOK_SECRET}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("Webhook POST failed:", res.status, text);
  }
}

(async () => {
  if (!EMAILS.length) {
    console.log("No emails to add.");
    await postWebhook({ event: "allowlist_updated", podId: POD_ID, emails: [] });
    return;
  }

  // Fetch decrypted session cookies from the app
  const cookiesRes = await fetch(`${WEBHOOK_URL}/api/pods/${POD_ID}/session-cookies`, {
    headers: { Authorization: `Bearer ${WEBHOOK_SECRET}` },
  });
  if (!cookiesRes.ok) {
    const text = await cookiesRes.text();
    console.error("Failed to fetch session cookies:", cookiesRes.status, text);
    await postWebhook({
      event: "pod_error",
      podId: POD_ID,
      message: `Could not fetch session cookies: ${cookiesRes.status}`,
    });
    process.exit(1);
  }
  const { sessionCookies } = await cookiesRes.json();
  const storageState = JSON.parse(sessionCookies);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState,
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    // Navigate to Spotify Developer Dashboard
    await page.goto("https://developer.spotify.com/dashboard", { waitUntil: "networkidle" });

    // Verify still logged in
    const isLoggedIn = await page
      .locator('a[href*="logout"], button:has-text("Log out")')
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!isLoggedIn) {
      throw new Error("Session expired — please re-authenticate from the pod admin panel");
    }

    // Navigate to the app users page — URL pattern varies by Spotify dashboard version
    // Try finding the app from the dashboard and navigating to its Users section
    const appLinks = page.locator('a[href*="/dashboard/"]');
    const appHref = await appLinks.first().getAttribute("href").catch(() => null);
    if (!appHref) throw new Error("Could not find app link on dashboard");

    const baseAppUrl = `https://developer.spotify.com${appHref.split("/").slice(0, 4).join("/")}`;
    await page.goto(`${baseAppUrl}/users`, { waitUntil: "networkidle" });

    // Add each email to the allowlist
    const addedEmails = [];
    for (const email of EMAILS) {
      try {
        // Look for an "Add user" button or email input field
        const addUserBtn = page
          .locator('button:has-text("Add user"), button:has-text("Add new user")')
          .first();
        if (await addUserBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await addUserBtn.click();
        }

        const emailInput = page
          .locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]')
          .first();
        await emailInput.waitFor({ timeout: 8000 });
        await emailInput.fill(email);

        // Some dashboards also require a display name
        const nameInput = page
          .locator('input[name*="name" i], input[placeholder*="name" i]')
          .first();
        if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nameInput.fill(email.split("@")[0]);
        }

        const submitBtn = page
          .locator('button[type="submit"], button:has-text("Add"), button:has-text("Save")')
          .first();
        await submitBtn.click();
        await page.waitForTimeout(1500);

        addedEmails.push(email);
        console.log(`Added ${email} to allowlist`);
      } catch (emailErr) {
        console.error(`Failed to add ${email}:`, emailErr);
      }
    }

    // Save updated session state
    const updatedStorageState = await context.storageState();
    const updatedSessionCookies = JSON.stringify(updatedStorageState);

    await postWebhook({
      event: "allowlist_updated",
      podId: POD_ID,
      emails: addedEmails,
      sessionCookies: updatedSessionCookies,
    });

    console.log(`Allowlist updated for pod ${POD_ID}. Added: ${addedEmails.join(", ")}`);
  } catch (err) {
    console.error("Script failed:", err);
    await postWebhook({
      event: "pod_error",
      podId: POD_ID,
      message: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
