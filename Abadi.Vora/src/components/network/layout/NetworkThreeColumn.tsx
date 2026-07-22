interface NetworkThreeColumnProps {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
}

export function NetworkThreeColumn({ left, center, right }: NetworkThreeColumnProps) {
  return (
    <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-4 px-4 py-4 md:px-6 md:py-6 lg:grid-cols-12 lg:gap-6">
      <div className="hidden lg:col-span-3 lg:block">{left}</div>
      <div className="lg:col-span-6">{center}</div>
      <div className="hidden lg:col-span-3 lg:block">{right}</div>
      {/* Mobile: show sidebars below feed */}
      <div className="space-y-4 lg:hidden">
        {left}
        {right}
      </div>
    </div>
  );
}
