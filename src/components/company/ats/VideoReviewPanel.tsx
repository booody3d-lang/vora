"use client";

import { useState } from "react";
import Link from "next/link";
import type { ApplicantCard, InternalNote } from "@/types/company";
import { getAtsUrl } from "@/lib/company/mock-data";

interface VideoReviewPanelProps {
  applicant: ApplicantCard;
  jobId: string;
  initialNotes: InternalNote[];
}

export function VideoReviewPanel({
  applicant,
  jobId,
  initialNotes,
}: VideoReviewPanelProps) {
  const [rating, setRating] = useState(applicant.hrRating ?? 0);
  const [notes, setNotes] = useState(initialNotes);
  const [newNote, setNewNote] = useState("");
  const [savingRating, setSavingRating] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveRating(star: number) {
    setRating(star);
    setSavingRating(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/company/jobs/${jobId}/applications/${applicant.applicationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ hrRating: star }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save rating");
      }
    } catch (persistError) {
      setRating(applicant.hrRating ?? 0);
      setError(
        persistError instanceof Error ? persistError.message : "Failed to save rating"
      );
    } finally {
      setSavingRating(false);
    }
  }

  async function addNote() {
    if (!newNote.trim()) return;

    setSavingNote(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/company/jobs/${jobId}/applications/${applicant.applicationId}/notes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content: newNote.trim() }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to add note");
      }

      setNotes((prev) => [...prev, data.note as InternalNote]);
      setNewNote("");
    } catch (persistError) {
      setError(
        persistError instanceof Error ? persistError.message : "Failed to add note"
      );
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-[#0F172A]">Video Introduction Pitch</h2>
        {applicant.videoPitchUrl ? (
          <div className="mt-3 overflow-hidden rounded-lg bg-black">
            <video
              src={applicant.videoPitchUrl}
              controls
              className="w-full"
              style={{ maxHeight: 360 }}
            >
              Your browser does not support video playback.
            </video>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-400">No video pitch submitted.</p>
        )}
        <Link
          href={getAtsUrl(jobId)}
          className="mt-4 inline-block text-xs font-medium text-[#3B5998] hover:underline"
        >
          ← Back to ATS Board
        </Link>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-4">
            <img
              src={applicant.profilePhotoUrl}
              alt=""
              className="h-16 w-16 rounded-full border border-slate-200"
            />
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">{applicant.fullName}</h2>
              <p className="text-sm text-slate-500">{applicant.headline}</p>
              <p className="mt-1 text-xs text-slate-400">
                Professional Score:{" "}
                <strong className="text-[#3B5998]">{applicant.professionalScore}%</strong>
              </p>
              <div className="mt-2 flex gap-2">
                <a
                  href={applicant.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                >
                  Download Resume
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-[#0F172A]">HR Score Sheet</h3>
          <p className="mt-1 text-xs text-slate-400">Rate this applicant (1–5 stars)</p>
          <div className="mt-3 flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => void saveRating(star)}
                disabled={savingRating}
                className="text-2xl transition-transform hover:scale-110 disabled:opacity-50"
              >
                {star <= rating ? "★" : "☆"}
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              Rated {rating}/5 — saved internally (invisible to candidate)
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-[#0F172A]">
            Internal Notes
            <span className="ml-2 text-[10px] font-normal text-slate-400">(Private — team only)</span>
          </h3>
          <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto">
            {notes.map((note) => (
              <li key={note.id} className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold text-slate-400">{note.authorName}</p>
                <p className="text-sm text-slate-700">{note.content}</p>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add internal note for your team..."
              rows={2}
              className="flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#3B5998]"
            />
            <button
              type="button"
              onClick={() => void addNote()}
              disabled={!newNote.trim() || savingNote}
              className="shrink-0 self-end rounded-lg bg-[#3B5998] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {savingNote ? "Saving…" : "Add"}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
