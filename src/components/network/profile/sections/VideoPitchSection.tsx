interface VideoPitchSectionProps {
  videoUrl?: string;
}

export function VideoPitchSection({ videoUrl }: VideoPitchSectionProps) {
  if (!videoUrl) {
    return (
      <p className="text-sm text-slate-400">No video introduction uploaded yet.</p>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
        Video Pitch <span className="font-normal normal-case">(max 2 min)</span>
      </h3>
      <div className="mt-3 overflow-hidden rounded-xl bg-black">
        <video
          src={videoUrl}
          controls
          className="w-full"
          style={{ maxHeight: 400 }}
        >
          Your browser does not support video playback.
        </video>
      </div>
    </div>
  );
}
