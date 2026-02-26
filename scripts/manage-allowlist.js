// Playwright script: add or remove a user from the Spotify Developer Portal allowlist.
// Called by manage-allowlist.yml GitHub Action.
//
// The Spotify Developer Dashboard allowlist page is at:
//   https://developer.spotify.com/dashboard/{appId}/users-and-access
// The form accepts a Spotify account email address.

const { chromium } = require("@playwright/test");

const {
  ACTION,        // "add" | "remove"
  EMAIL,
  POD_ID,
  WEBHOOK_URL,
  WEBHOOK_SECRET,
  SPOTIFY_APP_ID,
  SPOTIFY_DEV_EMAIL,
  SPOTIFY_DEV_PASSWORD,
} = process.env;

const DASHBOARD_URL = `https://developer.spotify.com/dashboard/${SPOTIFY_APP_ID}/users-and-access`;

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

async function loginIfNeeded(page) {
  // If we're on a login page, authenticate
  if (page.url().includes("accounts.spotify.com")) {
    await page.fill("#login-username", SPOTIFY_DEV_EMAIL);
    await page.fill("#login-password", SPOTIFY_DEV_PASSWORD);
    await page.click("#login-button");
    await page.waitForURL("**/dashboard**", { timeout: 20000 });
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(DASHBOARD_URL);
    await loginIfNeeded(page);

    // Wait for the page to settle
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    if (ACTION === "add") {
      // Find "Add new user" button / input
      // The exact selector may vary — Playwright will try common patterns
      const addBtn = page.locator("button:has-text('Add new user'), button:has-text('Add user')").first();
      await addBtn.click();

      // Fill in the email field
      const emailInput = page.locator("input[type='email'], input[placeholder*='email' i], input[placeholder*='user' i]").first();
      await emailInput.fill(EMAIL);

      // Submit
      const submitBtn = page.locator("button:has-text('Add'), button[type='submit']").last();
      await submitBtn.click();

      // Wait briefly for confirmation
      await page.waitForTimeout(2000);

    } else if (ACTION === "remove") {
      // Find the row for this email and click its remove/delete button
      const row = page.locator(`tr:has-text("${EMAIL}"), li:has-text("${EMAIL}")`).first();
      await row.waitFor({ timeout: 10000 });

      const removeBtn = row.locator("button:has-text('Remove'), button:has-text('Delete'), button[aria-label*='remove' i], button[aria-label*='delete' i]").first();
      await removeBtn.click();

      // Confirm dialog if present
      const confirmBtn = page.locator("button:has-text('Confirm'), button:has-text('Yes'), button:has-text('Remove')").first();
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      await page.waitForTimeout(2000);
    }

    await sendWebhook({
      event: "allowlist_updated",
      podId: POD_ID,
      action: ACTION,
      email: EMAIL,
    });

    console.log(`Allowlist ${ACTION} for ${EMAIL} succeeded.`);
  } catch (err) {
    console.error(`Allowlist ${ACTION} for ${EMAIL} failed:`, err.message);
    // Take screenshot for debugging
    await page.screenshot({ path: "error-screenshot.png" }).catch(() => {});
    await sendWebhook({
      event: "allowlist_error",
      podId: POD_ID,
      action: ACTION,
      email: EMAIL,
      error: err.message,
    });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
