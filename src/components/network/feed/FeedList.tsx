"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedPost, PostType } from "@/types/network";
import { FeedComposer } from "@/components/network/feed/FeedComposer";
import { FeedPostCard } from "@/components/network/feed/FeedPostCard";

interface FeedListProps {
  initialPosts: FeedPost[];
}

export function FeedList({ initialPosts }: FeedListProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const observerRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (loading) return;
    setLoading(true);
    setTimeout(() => {
      setPage((p) => p + 1);
      setLoading(false);
    }, 800);
  }, [loading]);

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

  function handlePublish(type: PostType, content: string) {
    const newPost: FeedPost = {
      id: `new-${Date.now()}`,
      type,
      author: {
        id: "user-1",
        slug: "alex-morgan",
        fullName: "Alex Morgan",
        headline: "Lead Product Designer",
        profilePhotoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
      },
      content,
      reactions: { like: 0, insightful: 0, support: 0, celebrate: 0 },
      commentCount: 0,
      shareCount: 0,
      isSaved: false,
      createdAt: new Date().toISOString(),
    };
    setPosts((prev) => [newPost, ...prev]);
  }

  return (
    <div className="space-y-4">
      <FeedComposer onPublish={handlePublish} />
      {posts.map((post) => (
        <FeedPostCard key={post.id} post={post} />
      ))}
      <div ref={observerRef} className="py-4 text-center">
        {loading && (
          <div className="inline-flex items-center gap-2 text-sm text-slate-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#3B5998] border-t-transparent" />
            Loading more...
          </div>
        )}
        {page >= 3 && !loading && (
          <p className="text-sm text-slate-400">You&apos;re all caught up</p>
        )}
      </div>
    </div>
  );
}
