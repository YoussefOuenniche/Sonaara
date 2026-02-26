// Playwright script: log into Spotify Developer Portal and capture the session.
// Called by capture-portal-session.yml GitHub Action.

const { chromium } = require("@playwright/test");
const crypto = require("crypto");

const {
  POD_ID,
  WEBHOOK_URL,
  WEBHOOK_SECRET,
  SPOTIFY_DEV_EMAIL,
  SPOTIFY_DEV_PASSWORD,
} = process.env;

async function sendWebhook(payload) {
  const res = await fetch(`${WEBHOOK_URL}/api/pod/allowlist-result`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WEBHOOK_SECRET}`,
    },
    body: JSON.stringify(payload),
  });
  console.log("Webhook response:", res.status);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to Spotify developer portal
    await page.goto("https://developer.spotify.com/dashboard");

    // Click login if not already logged in
    const loginBtn = page.locator("a[href*='login'], button:has-text('Log in')").first();
    if (await loginBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await loginBtn.click();
    }

    // accounts.spotify.com login form
    await page.waitForURL("**/login**", { timeout: 15000 });
    await page.fill("#login-username", SPOTIFY_DEV_EMAIL);
    await page.fill("#login-password", SPOTIFY_DEV_PASSWORD);
    await page.click("#login-button");

    // Wait for redirect back to developer portal
    await page.waitForURL("**/dashboard**", { timeout: 20000 });

    // Save storage state (cookies + localStorage)
    const storageState = await context.storageState();
    const sessionJson = JSON.stringify(storageState);

    await sendWebhook({
      event: "session_captured",
      podId: POD_ID,
      sessionState: sessionJson,
    });

    console.log("Session captured successfully.");
  } catch (err) {
    console.error("Session capture failed:", err.message);
    await sendWebhook({
      event: "session_error",
      podId: POD_ID,
      error: err.message,
    });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
