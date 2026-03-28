const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const baseURL = "http://localhost:5173";
const apiURL = "http://localhost:3000";
let authToken = "";

function getPassword() {
  const credsPath = path.resolve(__dirname, "..", "config", "credentials.txt");
  const raw = fs.readFileSync(credsPath, "utf8").trim();
  return raw.split(":")[1];
}

async function loginUi(page, password) {
  await page.goto(baseURL);
  await page.fill('input[placeholder="Username"]', "admin");
  await page.fill('input[placeholder="Password"]', password);
  await page.click('button:has-text("Sign In")');
  await page.waitForFunction(() => localStorage.getItem("vpspanel_token"));
  await page.waitForURL((url) => !url.pathname.endsWith("/login"));
}

async function loginWithToken(page) {
  await page.addInitScript((token) => {
    localStorage.setItem("vpspanel_token", token);
  }, authToken);
  await page.goto(baseURL);
}

async function ensureVpsExists(request, name) {
  const password = getPassword();
  const loginRes = await request.post(`${apiURL}/api/auth/login`, {
    data: { username: "admin", password },
  });
  const token = (await loginRes.json()).data.token;
  const headers = { Authorization: `Bearer ${token}` };
  const listRes = await request.get(`${apiURL}/api/vps`, { headers });
  const vpsList = (await listRes.json()).data || [];
  const existing = vpsList.find((vps) => vps.name === name);
  if (existing) return existing.id;

  const createRes = await request.post(`${apiURL}/api/vps`, {
    headers,
    data: {
      name,
      cpu: 1,
      ram_mb: 256,
      disk_gb: 2,
      image: "ubuntu-24.04",
      technology: "lxc",
    },
  });
  const created = (await createRes.json()).data;
  const id = created?.id;
  if (!id) throw new Error("Failed to create VPS via API");

  for (let i = 0; i < 15; i += 1) {
    await new Promise((r) => setTimeout(r, 2000));
    const getRes = await request.get(`${apiURL}/api/vps/${id}`, { headers });
    if (getRes.ok()) {
      const status = (await getRes.json()).data?.status;
      if (status === "RUNNING") break;
    }
  }

  return id;
}

test.describe.serial("VPS Panel E2E", () => {
  test.beforeAll(async ({ request }) => {
    const password = getPassword();
    const loginRes = await request.post(`${apiURL}/api/auth/login`, {
      data: { username: "admin", password },
    });
    const token = (await loginRes.json()).data.token;
    authToken = token;
    const vpsRes = await request.get(`${apiURL}/api/vps`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const vpsList = (await vpsRes.json()).data || [];
    for (const vps of vpsList) {
      await request.delete(`${apiURL}/api/vps/${vps.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });

  test("B01 login form visible", async ({ page }) => {
    await page.goto(baseURL);
    await expect(page.locator('input[placeholder="Username"]')).toBeVisible();
    await page.screenshot({ path: "screenshots/01_login.png", fullPage: true });
  });

  test("B02 wrong credentials error", async ({ page }) => {
    await page.goto(baseURL);
    await page.fill('input[placeholder="Username"]', "admin");
    await page.fill('input[placeholder="Password"]', "wrong");
    await page.click('button:has-text("Sign In")');
    const error = page.locator("text=Invalid credentials");
    await expect(error).toBeVisible();
    await expect(error).not.toHaveText(/undefined/i);
  });

  test("B03 correct credentials and dashboard", async ({ page }) => {
    const password = getPassword();
    await loginUi(page, password);
    await expect(page.locator("text=Overview")).toBeVisible();
    await page.screenshot({ path: "screenshots/02_dashboard.png", fullPage: true });
  });

  test("B04 dashboard live data", async ({ page }) => {
    const password = getPassword();
    await loginUi(page, password);
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent("body");
    const match = bodyText.match(/(\d+(?:\.\d+)?)%/);
    expect(match).not.toBeNull();
    const value = Number(match[1]);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
    expect(bodyText).not.toMatch(/undefined|NaN/);
    await page.screenshot({ path: "screenshots/03_metrics.png", fullPage: true });
  });

  test("B05 VPS list empty state", async ({ page }) => {
    await loginWithToken(page);
    await page.goto(`${baseURL}/instances`);
    await expect(page.locator("text=No instances yet")).toBeVisible();
    await page.screenshot({ path: "screenshots/04_empty_state.png", fullPage: true });
  });

  test("B06 create VPS modal and tech selector", async ({ page }) => {
    await loginWithToken(page);
    await page.goto(`${baseURL}/instances`);
    await page.click('button:has-text("Deploy Instance")');
    await expect(page.getByRole("heading", { name: "Create VPS" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Technology" })).toBeVisible();
    await page.click('button[aria-label="Details"]');
    await expect(page.getByRole("button", { name: "Close" }).first()).toBeVisible();
    await page.screenshot({ path: "screenshots/05_tech_selector.png", fullPage: true });
  });

  test("B07 create VPS and RUNNING status", async ({ page }) => {
    await loginWithToken(page);
    await page.goto(`${baseURL}/instances`);
    await page.click('button:has-text("Deploy Instance")');
    await expect(page.getByRole("heading", { name: "Create VPS" })).toBeVisible();
    const form = page.locator("form");
    await form.locator('input.form-input').first().fill("playwright-vps");
    await form.locator('input[type="number"]').nth(0).fill("1");
    await form.locator('input[type="number"]').nth(1).fill("256");
    await form.locator('input[type="number"]').nth(2).fill("2");
    const imageSelect = page.locator("select").nth(0);
    await imageSelect.locator("option").nth(1).waitFor({ state: "attached" });
    await imageSelect.selectOption({ index: 1 });
    await page.waitForSelector("table tbody tr");
    await page.click("table tbody tr >> nth=0");
    const storageSelect = page.locator("select").nth(1);
    await storageSelect.locator("option").nth(1).waitFor({ state: "attached" });
    await storageSelect.selectOption({ index: 1 });
    await page.click('button:has-text("Create VPS")');
    await page.waitForSelector('[data-status="RUNNING"]', { timeout: 30000 });
    await page.screenshot({ path: "screenshots/06_vps_running.png", fullPage: true });
  });

  test("B08 VPS detail page", async ({ page, request }) => {
    await ensureVpsExists(request, "playwright-vps");
    await loginWithToken(page);
    await page.goto(`${baseURL}/instances`);
    await page.click('a:has-text("Details")');
    await expect(page.getByText("CPU", { exact: true })).toBeVisible();
    await expect(page.locator('[data-status="RUNNING"]')).toBeVisible();
    await page.screenshot({ path: "screenshots/07_vps_detail.png", fullPage: true });
  });

  test("B09 stop VPS", async ({ page, request }) => {
    await ensureVpsExists(request, "playwright-vps");
    await loginWithToken(page);
    await page.goto(`${baseURL}/instances`);
    await page.click('a:has-text("Details")');
    await page.click('button:has-text("Stop")');
    await page.click('button:has-text("Confirm")');
    await page.waitForSelector('[data-status="STOPPED"]', { timeout: 15000 });
    await page.screenshot({ path: "screenshots/08_stopped.png", fullPage: true });
  });

  test("B10 delete VPS", async ({ page, request }) => {
    await ensureVpsExists(request, "playwright-vps");
    await loginWithToken(page);
    await page.goto(`${baseURL}/instances`);
    await page.click('a:has-text("Details")');
    await page.click('button:has-text("Delete")');
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder("Type name to confirm").fill("playwright-vps");
    await dialog.getByRole("button", { name: "Delete" }).click();
    await expect(page.locator("text=No instances yet")).toBeVisible();
    await page.screenshot({ path: "screenshots/09_deleted.png", fullPage: true });
  });

  test("B11 mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginWithToken(page);
    await page.goto(`${baseURL}/instances`);
    const hasOverflow = await page.evaluate(
      () => document.body.scrollWidth > window.innerWidth,
    );
    expect(hasOverflow).toBe(false);
    await page.screenshot({ path: "screenshots/10_mobile.png", fullPage: true });
  });

  test("B12 zero console errors", async ({ page }) => {
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await loginWithToken(page);
    await page.goto(`${baseURL}/instances`);
    await page.click('button:has-text("Deploy Instance")');
    await expect(page.getByRole("heading", { name: "Create VPS" })).toBeVisible();
    const form = page.locator("form");
    await form.locator('input.form-input').first().fill("pw-console-vps");
    await form.locator('input[type="number"]').nth(0).fill("1");
    await form.locator('input[type="number"]').nth(1).fill("256");
    await form.locator('input[type="number"]').nth(2).fill("2");
    const imageSelect = page.locator("select").nth(0);
    await imageSelect.locator("option").nth(1).waitFor({ state: "attached" });
    await imageSelect.selectOption({ index: 1 });
    await page.waitForSelector("table tbody tr");
    await page.click("table tbody tr >> nth=0");
    const storageSelect = page.locator("select").nth(1);
    await storageSelect.locator("option").nth(1).waitFor({ state: "attached" });
    await storageSelect.selectOption({ index: 1 });
    await page.click('button:has-text("Create VPS")');
    await page.waitForSelector('[data-status="RUNNING"]', { timeout: 30000 });
    await page.click('a:has-text("Details")');
    await page.click('button:has-text("Delete")');
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder("Type name to confirm").fill("pw-console-vps");
    await dialog.getByRole("button", { name: "Delete" }).click();

    expect(errors).toEqual([]);
  });
});
