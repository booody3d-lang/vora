"use client";

import { useState } from "react";
import type { PollOption } from "@/types/network";
import { cn } from "@/lib/utils";

interface PollDisplayProps {
  question: string;
  options: PollOption[];
  expiresAt?: string;
  onVote?: (index: number) => void;
}

export function PollDisplay({ question, options, expiresAt, onVote }: PollDisplayProps) {
  const [votedIndex, setVotedIndex] = useState<number | null>(null);
  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);

  function handleVote(index: number) {
    if (votedIndex !== null) return;
    setVotedIndex(index);
    onVote?.(index);
  }

  const hasVoted = votedIndex !== null;
  const displayOptions = hasVoted
    ? options.map((o, i) =>
        i === votedIndex ? { ...o, votes: o.votes + 1 } : o
      )
    : options;
  const displayTotal = hasVoted ? totalVotes + 1 : totalVotes;

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="font-semibold text-[#0F172A]">{question}</p>
      {expiresAt && (
        <p className="mt-1 text-[10px] text-slate-400">
          Poll ends {new Date(expiresAt).toLocaleDateString()}
        </p>
      )}
      <ul className="mt-3 space-y-2">
        {displayOptions.map((option, index) => {
          const pct = displayTotal > 0 ? Math.round((option.votes / displayTotal) * 100) : 0;
          return (
            <li key={index}>
              <button
                type="button"
                onClick={() => handleVote(index)}
                disabled={hasVoted}
                className={cn(
                  "relative w-full overflow-hidden rounded-lg border px-3 py-2.5 text-left text-sm transition-all",
                  hasVoted
                    ? "cursor-default border-slate-200"
                    : "border-slate-200 hover:border-[#3B5998] hover:bg-white",
                  votedIndex === index && "border-[#3B5998] bg-[#3B5998]/5"
                )}
              >
                {hasVoted && (
                  <div
                    className="absolute inset-y-0 left-0 bg-[#3B5998]/15 transition-all duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                )}
                <span className="relative flex items-center justify-between">
                  <span className="font-medium text-[#0F172A]">{option.text}</span>
                  {hasVoted && (
                    <span className="text-xs font-semibold text-[#3B5998]">{pct}%</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-slate-400">
        {displayTotal.toLocaleString()} vote{displayTotal !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
