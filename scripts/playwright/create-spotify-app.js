// @ts-check
const { chromium } = require("@playwright/test");

const POD_ID = process.env.POD_ID;
const POD_NAME = process.env.POD_NAME;
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
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
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    // ── Login ────────────────────────────────────────────────────────────────
    await page.goto("https://developer.spotify.com/dashboard", {
      waitUntil: "networkidle",
    });

    // Click "Log in" if present (might already be on login page)
    const loginBtn = page.locator('a[href*="login"], button:has-text("Log in")').first();
    if (await loginBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await loginBtn.click();
    }

    // Spotify login form
    await page.waitForSelector("#login-username, input[name='username']", { timeout: 15000 });
    await page.fill("#login-username, input[name='username']", EMAIL);
    await page.fill("#login-password, input[name='password']", PASSWORD);
    await page.click("#login-button, button[type='submit']");

    // Wait for dashboard
    await page.waitForURL("**/dashboard**", { timeout: 20000 });

    // ── Create App ───────────────────────────────────────────────────────────
    await page.goto("https://developer.spotify.com/dashboard", { waitUntil: "networkidle" });

    const createBtn = page.locator('button:has-text("Create app"), a:has-text("Create app")').first();
    await createBtn.waitFor({ timeout: 10000 });
    await createBtn.click();

    // Fill app creation form
    await page.waitForSelector('input[name="appName"], input[id*="name" i]', { timeout: 10000 });
    const appName = `${POD_NAME} - Sonaara`;
    await page.fill('input[name="appName"], input[id*="name" i]', appName);

    // Description (required)
    const descField = page.locator('textarea[name="appDescription"], textarea[id*="description" i]').first();
    if (await descField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await descField.fill("Sonaara music social app pod");
    }

    // Redirect URI
    const redirectField = page
      .locator('input[name*="redirect" i], input[placeholder*="redirect" i]')
      .first();
    if (await redirectField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await redirectField.fill("https://sonaara.vercel.app/api/auth/callback");
      // Some UI requires pressing Enter or clicking Add
      await redirectField.press("Enter");
      const addBtn = page.locator('button:has-text("Add"), button:has-text("+")', ).first();
      if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addBtn.click();
      }
    }

    // Accept terms if checkbox visible
    const termsCheckbox = page.locator('input[type="checkbox"]').first();
    if (await termsCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await termsCheckbox.check();
    }

    // Submit
    const saveBtn = page.locator('button:has-text("Save"), button[type="submit"]:has-text("Create")').first();
    await saveBtn.click();

    // Wait for redirect to app page
    await page.waitForURL("**/dashboard/**", { timeout: 15000 });

    // ── Extract credentials ──────────────────────────────────────────────────
    const appUrl = page.url();
    // URL pattern: /dashboard/applications/{appId} or /dashboard/{appId}
    const appIdMatch = appUrl.match(/dashboard(?:\/applications)?\/([a-zA-Z0-9]+)/);
    const spotifyAppId = appIdMatch ? appIdMatch[1] : "";

    // Go to app settings to find clientId and reveal clientSecret
    const settingsUrl = appUrl.includes("/settings")
      ? appUrl
      : `${appUrl.replace(/\/$/, "")}/settings`;
    await page.goto(settingsUrl, { waitUntil: "networkidle" });

    // Client ID — usually visible as text
    let clientId = "";
    const clientIdEl = page
      .locator('[data-testid="client-id"], p:has-text("Client ID") + *, label:has-text("Client ID") ~ *')
      .first();
    if (await clientIdEl.isVisible({ timeout: 5000 }).catch(() => false)) {
      clientId = (await clientIdEl.textContent() || "").trim();
    }
    // Fallback: look for a copyable value near "Client ID"
    if (!clientId) {
      const allText = await page.content();
      const match = allText.match(/Client ID[^a-z0-9]*([a-f0-9]{32})/i);
      if (match) clientId = match[1];
    }

    // Reveal client secret
    const showSecretBtn = page
      .locator('button:has-text("View client secret"), button:has-text("Show client secret")')
      .first();
    await showSecretBtn.waitFor({ timeout: 10000 });
    await showSecretBtn.click();

    let clientSecret = "";
    await page.waitForTimeout(1000);
    const secretEl = page
      .locator('[data-testid="client-secret"], p:has-text("Client secret") + *, label:has-text("Client secret") ~ *')
      .first();
    if (await secretEl.isVisible({ timeout: 5000 }).catch(() => false)) {
      clientSecret = (await secretEl.textContent() || "").trim();
    }
    if (!clientSecret) {
      const allText = await page.content();
      const match = allText.match(/Client secret[^a-z0-9]*([a-f0-9]{32})/i);
      if (match) clientSecret = match[1];
    }

    if (!clientId || !clientSecret) {
      throw new Error(`Could not extract credentials. clientId=${clientId} secretLength=${clientSecret.length}`);
    }

    // Save Playwright session state (cookies + localStorage) for future allowlist updates
    const storageState = await context.storageState();
    const sessionCookies = JSON.stringify(storageState);

    await postWebhook({
      event: "pod_created",
      podId: POD_ID,
      clientId,
      clientSecret,
      spotifyAppId,
      sessionCookies,
    });

    console.log(`Pod ${POD_ID} created successfully. ClientId: ${clientId}`);
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
