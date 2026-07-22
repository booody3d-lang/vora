"use client";

import { useState } from "react";
import type { CreatePostInput, FeedPost } from "@/types/network";
import { useTranslations } from "@/i18n/use-translations";

interface EditPostModalProps {
  post: FeedPost;
  onClose: () => void;
  onSaved: (post: FeedPost) => void;
}

export function EditPostModal({ post, onClose, onSaved }: EditPostModalProps) {
  const { t } = useTranslations();
  const [content, setContent] = useState(post.content ?? "");
  const [articleTitle, setArticleTitle] = useState(post.articleTitle ?? "");
  const [pollQuestion, setPollQuestion] = useState(post.pollQuestion ?? "");
  const [pollOptions, setPollOptions] = useState(
    post.pollOptions?.map((option) => option.text) ?? ["", ""]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");

    const payload: Partial<CreatePostInput> = {};

    if (post.type === "text" || post.type === "image" || post.type === "video") {
      payload.content = content.trim();
    }
    if (post.type === "article") {
      payload.content = content.trim();
      payload.articleTitle = articleTitle.trim();
    }
    if (post.type === "poll") {
      payload.content = content.trim() || undefined;
      payload.pollQuestion = pollQuestion.trim();
      const options = pollOptions.map((text) => text.trim()).filter(Boolean);
      if (options.length < 2) {
        setError(t("network.feed.edit.pollMinOptions"));
        setSaving(false);
        return;
      }
      payload.pollOptions = options.map((text, index) => ({
        text,
        votes: post.pollOptions?.[index]?.votes ?? 0,
      }));
    }

    try {
      const res = await fetch(`/api/feed/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("network.feed.edit.failed"));
        return;
      }
      onSaved(data.post as FeedPost);
      onClose();
    } catch {
      setError(t("network.feed.edit.failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t("common.cancel")}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-2xl">
        <h3 className="text-lg font-bold text-[#0F172A]">{t("network.feed.edit.title")}</h3>

        {(post.type === "text" ||
          post.type === "image" ||
          post.type === "video" ||
          post.type === "article" ||
          post.type === "poll") && (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder={t("network.feedSharePlaceholder")}
            className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        )}

        {post.type === "article" && (
          <input
            value={articleTitle}
            onChange={(e) => setArticleTitle(e.target.value)}
            placeholder={t("network.feed.articleTitlePlaceholder")}
            className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        )}

        {post.type === "poll" && (
          <div className="mt-3 space-y-2">
            <input
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder={t("network.feedPollPlaceholder")}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            {pollOptions.map((option, index) => (
              <input
                key={index}
                value={option}
                onChange={(e) => {
                  const next = [...pollOptions];
                  next[index] = e.target.value;
                  setPollOptions(next);
                }}
                placeholder={t("network.feed.pollOptionPlaceholder", { number: index + 1 })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            ))}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="rounded-lg bg-[#3B5998] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? t("common.saving") : t("network.feed.edit.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
