#!/usr/bin/env node
/**
 * Verify key company and network routes return 200 or expected redirects (not 404).
 * Usage:
 *   npm run verify:company-routes
 *   BASE_URL=http://localhost:3000 npm run verify:company-routes
 */
const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const COMPANY_SLUG = process.env.COMPANY_SLUG ?? "albakkar";

const tests = [];
let failed = 0;

function pass(name, detail) {
  tests.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail) {
  tests.push({ name, ok: false, detail });
  failed += 1;
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

/**
 * @param {string} path
 * @param {{ expectStatus?: number | number[], allowRedirect?: boolean, label?: string }} [opts]
 */
async function checkRoute(path, opts = {}) {
  const label = opts.label ?? path;
  const expectStatus = opts.expectStatus ?? 200;
  const allowed = Array.isArray(expectStatus) ? expectStatus : [expectStatus];

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      redirect: opts.allowRedirect ? "follow" : "manual",
    });

    if (allowed.includes(res.status)) {
      pass(label, `HTTP ${res.status}`);
      return;
    }

    if (opts.allowRedirect && res.status >= 300 && res.status < 400) {
      pass(label, `redirect HTTP ${res.status} → ${res.headers.get("location") ?? "?"}`);
      return;
    }

    fail(label, `HTTP ${res.status} (expected ${allowed.join("|")})`);
  } catch (error) {
    fail(label, error instanceof Error ? error.message : String(error));
  }
}

async function checkApi(path, opts = {}) {
  const label = opts.label ?? path;
  try {
    const res = await fetch(`${BASE_URL}${path}`);
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (opts.expectStatus && !opts.expectStatus.includes(res.status)) {
      fail(label, `HTTP ${res.status}`);
      return;
    }

    if (path.includes("/api/company/") && !path.endsWith("/me")) {
      if (res.status === 200 && json?.company?.slug) {
        pass(label, `company=${json.company.name} slug=${json.company.slug}`);
      } else if (res.status === 404) {
        fail(label, "company not found (404)");
      } else {
        fail(label, `HTTP ${res.status}`);
      }
      return;
    }

    if (res.ok) {
      pass(label, `HTTP ${res.status}`);
    } else {
      fail(label, `HTTP ${res.status}`);
    }
  } catch (error) {
    fail(label, error instanceof Error ? error.message : String(error));
  }
}

async function run() {
  console.log(`VORA company route verification → ${BASE_URL}\n`);

  // Public company page (must NOT 404)
  await checkRoute(`/network/company/${COMPANY_SLUG}`, { expectStatus: 200 });
  await checkRoute(`/company/${COMPANY_SLUG}`, { expectStatus: [200, 307, 308], allowRedirect: true });

  // Company API
  await checkApi(`/api/company/${COMPANY_SLUG}`, { expectStatus: [200] });

  // Company dashboard (auth required → redirect to login)
  for (const path of [
    "/company/dashboard",
    "/company/dashboard/settings",
    "/company/dashboard/jobs",
    "/company/dashboard/jobs/new",
    "/company/dashboard/analytics",
  ]) {
    await checkRoute(path, {
      expectStatus: [200, 307, 308],
      allowRedirect: true,
      label: `${path} (auth gate)`,
    });
  }

  // Network routes company users need
  await checkRoute("/network/messages", {
    expectStatus: [200, 307, 308],
    allowRedirect: true,
    label: "/network/messages (auth gate)",
  });

  // Company redirect sources (should redirect, not 404)
  for (const [path, expectRedirect] of [
    ["/network", "/company/dashboard"],
    ["/network/jobs", "/company/dashboard/jobs"],
  ]) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, { redirect: "manual" });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location") ?? "";
        if (loc.includes(expectRedirect)) {
          pass(`${path} redirect`, `→ ${loc}`);
        } else {
          pass(`${path} redirect`, `HTTP ${res.status} → ${loc || "?"}`);
        }
      } else if (res.status === 200) {
        pass(`${path}`, "HTTP 200 (unauthenticated — no redirect expected)");
      } else {
        fail(`${path}`, `HTTP ${res.status}`);
      }
    } catch (error) {
      fail(`${path}`, error instanceof Error ? error.message : String(error));
    }
  }

  console.log(`\n${tests.length - failed}/${tests.length} passed`);
  if (failed > 0) process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
