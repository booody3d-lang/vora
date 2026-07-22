"use client";

import { useCallback, useEffect, useState } from "react";
import type { CompanyPost } from "@/types/company";

export function CompanyPostsPanel() {
  const [posts, setPosts] = useState<CompanyPost[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/company/posts", { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setPosts((data.posts ?? []) as CompanyPost[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/company/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: content.trim(), type: "text" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to publish post");
      }

      setPosts((prev) => [data.post as CompanyPost, ...prev]);
      setContent("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to publish post");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(postId: string) {
    const res = await fetch(`/api/company/posts/${postId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      setPosts((prev) => prev.filter((post) => post.id !== postId));
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-[#0F172A]">Company Posts</h2>
      <p className="mt-1 text-xs text-slate-500">Share updates on your public company page.</p>

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-4 space-y-3">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={3}
          placeholder="Write an announcement for followers..."
          className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#3B5998]"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={!content.trim() || submitting}
          className="rounded-lg bg-[#3B5998] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Publishing…" : "Publish Post"}
        </button>
      </form>

      <div className="mt-5 space-y-3">
        {loading && <p className="text-sm text-slate-500">Loading posts…</p>}
        {!loading && posts.length === 0 && (
          <p className="text-sm text-slate-500">No posts yet. Job announcements are created automatically when you publish a job.</p>
        )}
        {posts.slice(0, 5).map((post) => (
          <div key={post.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {post.type.replace("_", " ")}
                </p>
                <p className="mt-1 text-sm text-slate-700">{post.content}</p>
                {post.jobTitle && (
                  <p className="mt-1 text-xs text-[#3B5998]">{post.jobTitle}</p>
                )}
              </div>
              {post.type === "text" && (
                <button
                  type="button"
                  onClick={() => void handleDelete(post.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
