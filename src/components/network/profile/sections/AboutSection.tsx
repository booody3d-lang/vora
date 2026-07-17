interface AboutSectionProps {
  about: string;
}

export function AboutSection({ about }: AboutSectionProps) {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">About</h3>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{about}</p>
    </div>
  );
}
