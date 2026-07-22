"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CreatePostInput } from "@/types/network";
import type { FeedPost } from "@/types/network";
import { FeedComposer } from "@/components/network/feed/FeedComposer";
import { FeedPostCard } from "@/components/network/feed/FeedPostCard";
import { useTranslations } from "@/i18n/use-translations";

interface FeedListProps {
  initialPosts?: FeedPost[];
}

export function FeedList({ initialPosts = [] }: FeedListProps) {
  const { t } = useTranslations();
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [loading, setLoading] = useState(initialPosts.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const observerRef = useRef<HTMLDivElement>(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/feed", { credentials: "include" });
      const data = await res.json();
      if (res.ok && Array.isArray(data.posts)) {
        setPosts(data.posts);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const loadMore = useCallback(() => {
    if (loadingMore) return;
    setLoadingMore(true);
    setTimeout(() => {
      setPage((p) => p + 1);
      setLoadingMore(false);
    }, 800);
  }, [loadingMore]);

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && page < 3) loadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, page]);

  async function handlePublish(payload: CreatePostInput): Promise<boolean> {
    const res = await fetch("/api/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? t("network.feed.publishFailed"));
    }
    setPosts((prev) => [data.post as FeedPost, ...prev]);
    return true;
  }

  function handlePostUpdate(updated: FeedPost) {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  if (loading && posts.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
        {t("network.feedLoading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FeedComposer onPublish={handlePublish} />
      {!loading && posts.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center">
          <p className="text-sm font-medium text-[#0F172A]">{t("network.feed.emptyTitle")}</p>
          <p className="mt-1 text-sm text-slate-500">{t("network.feed.emptyBody")}</p>
        </div>
      )}
      {posts.slice(0, page * 5).map((post) => (
        <FeedPostCard key={post.id} post={post} onUpdate={handlePostUpdate} />
      ))}
      <div ref={observerRef} className="py-4 text-center">
        {loadingMore && (
          <div className="inline-flex items-center gap-2 text-sm text-slate-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#3B5998] border-t-transparent" />
            {t("network.feedLoadingMore")}
          </div>
        )}
        {page >= 3 && !loadingMore && (
          <p className="text-sm text-slate-400">{t("network.feedEnd")}</p>
        )}
      </div>
    </div>
  );
}
