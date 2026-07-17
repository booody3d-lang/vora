"use client";

const VISITOR_SESSION_KEY = "vora_visitor_session";
const VISITOR_VIEWS_KEY = "vora_visitor_views";

export interface VisitorViews {
  profileViews: number;
  jobViews: number;
}

function getDefaultViews(): VisitorViews {
  return { profileViews: 0, jobViews: 0 };
}

export function getVisitorViews(): VisitorViews {
  if (typeof window === "undefined") return getDefaultViews();

  try {
    const raw = localStorage.getItem(VISITOR_VIEWS_KEY);
    if (!raw) return getDefaultViews();
    const parsed = JSON.parse(raw) as VisitorViews;
    return {
      profileViews: parsed.profileViews ?? 0,
      jobViews: parsed.jobViews ?? 0,
    };
  } catch {
    return getDefaultViews();
  }
}

export function incrementVisitorView(type: "profile" | "job"): VisitorViews {
  const current = getVisitorViews();
  const updated: VisitorViews = {
    profileViews: type === "profile" ? current.profileViews + 1 : current.profileViews,
    jobViews: type === "job" ? current.jobViews + 1 : current.jobViews,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(VISITOR_VIEWS_KEY, JSON.stringify(updated));
  }

  return updated;
}

export function getOrCreateVisitorSessionToken(): string {
  if (typeof window === "undefined") return "";

  let token = localStorage.getItem(VISITOR_SESSION_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(VISITOR_SESSION_KEY, token);
  }

  return token;
}

export function resetVisitorViews(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(VISITOR_VIEWS_KEY);
  }
}
