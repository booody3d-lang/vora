#!/usr/bin/env node
/**
 * Production smoke tests for VORA deployments.
 * Usage: npm run smoke:production
 *        BASE_URL=https://vora-tau.vercel.app npm run smoke:production
 */
const BASE_URL = (process.env.BASE_URL ?? "https://vora-tau.vercel.app").replace(/\/$/, "");

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

async function fetchJson(path, init) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { response, json, text };
}

async function run() {
  console.log(`VORA production smoke tests → ${BASE_URL}\n`);

  try {
    const health = await fetchJson("/api/health");
    if (health.response.ok && health.json?.status) {
      pass("health", health.json.status);
    } else {
      fail("health", `HTTP ${health.response.status}`);
    }
  } catch (error) {
    fail("health", error instanceof Error ? error.message : String(error));
  }

  try {
    const auth = await fetchJson("/api/auth/config");
    if (auth.response.ok && auth.json?.authProvider === "supabase") {
      pass("auth/config", `supabaseConfigured=${auth.json.supabaseConfigured}`);
    } else {
      fail("auth/config", `HTTP ${auth.response.status}`);
    }
  } catch (error) {
    fail("auth/config", error instanceof Error ? error.message : String(error));
  }

  try {
    const plans = await fetchJson("/api/billing/plans");
    if (plans.response.ok && Array.isArray(plans.json?.plans)) {
      pass("billing/plans", `${plans.json.plans.length} plans, simulation=${plans.json.simulationMode}`);
    } else {
      fail("billing/plans", `HTTP ${plans.response.status}`);
    }
  } catch (error) {
    fail("billing/plans", error instanceof Error ? error.message : String(error));
  }

  try {
    const marketplace = await fetchJson("/api/marketplace/services");
    if (marketplace.response.ok && Array.isArray(marketplace.json?.services)) {
      pass("marketplace/services", `${marketplace.json.services.length} services (${marketplace.json.persistence})`);
    } else {
      fail("marketplace/services", `HTTP ${marketplace.response.status}`);
    }
  } catch (error) {
    fail("marketplace/services", error instanceof Error ? error.message : String(error));
  }

  for (const path of ["/", "/freelance", "/network", "/auth/login", "/auth/signup"]) {
    try {
      const page = await fetch(`${BASE_URL}${path}`, { redirect: "follow" });
      if (page.ok) {
        pass(`navigation ${path}`, `HTTP ${page.status}`);
      } else {
        fail(`navigation ${path}`, `HTTP ${page.status}`);
      }
    } catch (error) {
      fail(`navigation ${path}`, error instanceof Error ? error.message : String(error));
    }
  }

  try {
    const signup = await fetchJson("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", password: "short" }),
    });
    if (signup.response.status === 400) {
      pass("signup validation", "rejects invalid payload");
    } else {
      fail("signup validation", `expected 400, got ${signup.response.status}`);
    }
  } catch (error) {
    fail("signup validation", error instanceof Error ? error.message : String(error));
  }

  try {
    const otpEmail = await fetchJson("/api/auth/otp/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid", purpose: "login" }),
    });
    if (otpEmail.response.status === 400) {
      pass("email OTP validation", "rejects invalid email");
    } else {
      fail("email OTP validation", `expected 400, got ${otpEmail.response.status}`);
    }
  } catch (error) {
    fail("email OTP validation", error instanceof Error ? error.message : String(error));
  }

  try {
    const sitemap = await fetch(`${BASE_URL}/sitemap.xml`);
    if (sitemap.ok && (await sitemap.text()).includes("<urlset")) {
      pass("sitemap.xml", "reachable");
    } else {
      fail("sitemap.xml", `HTTP ${sitemap.status}`);
    }
  } catch (error) {
    fail("sitemap.xml", error instanceof Error ? error.message : String(error));
  }

  try {
    const robots = await fetch(`${BASE_URL}/robots.txt`);
    if (robots.ok && (await robots.text()).includes("Sitemap:")) {
      pass("robots.txt", "reachable");
    } else {
      fail("robots.txt", `HTTP ${robots.status}`);
    }
  } catch (error) {
    fail("robots.txt", error instanceof Error ? error.message : String(error));
  }

  console.log(`\n${tests.length - failed}/${tests.length} passed`);
  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
