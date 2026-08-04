import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 22, className, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true as const,
    ...rest,
  };
}

export function IconVideo(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M15 10.5V7.8c0-.9-.7-1.6-1.6-1.6H4.6C3.7 6.2 3 6.9 3 7.8v8.4c0 .9.7 1.6 1.6 1.6h8.8c.9 0 1.6-.7 1.6-1.6v-2.7l4.2 2.5c.7.4 1.6-.1 1.6-.9V9c0-.8-.9-1.3-1.6-.9L15 10.5z" />
    </svg>
  );
}

export function IconVideoOff(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M16.5 10.8 21 8.2c.6-.3 1.3.1 1.3.8v6c0 .7-.7 1.1-1.3.8l-4.5-2.6" />
      <path d="M3 3l18 18" />
      <path d="M10.2 6.2H5.5C4.1 6.2 3 7.3 3 8.7v6.6c0 1.4 1.1 2.5 2.5 2.5h7.3c.4 0 .8-.1 1.1-.3" />
    </svg>
  );
}

export function IconPhone(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8.2 4.8c.4-.4 1-.5 1.5-.3l2 1c.5.2.8.7.8 1.2v1.7c0 .4-.2.8-.5 1-.7.5-1 1.2-.8 2 .5 1.8 2 3.3 3.8 3.8.8.2 1.5-.1 2-.8.2-.3.6-.5 1-.5h1.7c.5 0 1 .3 1.2.8l1 2c.2.5.1 1.1-.3 1.5-1.2 1.2-3 1.7-4.7 1.2-3.7-1.1-6.8-4.2-7.9-7.9-.5-1.7 0-3.5 1.2-4.7z" />
    </svg>
  );
}

export function IconPhoneEnd(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5.2 10.8c2.8-1.4 5.9-1.8 8.9-1.2 1.7.3 3.3.9 4.7 1.8" />
      <path d="M4 14.2c.5-.8 1.4-1.2 2.3-1.1l1.5.2c.6.1 1.1.5 1.3 1.1l.5 1.3c.2.5.7.8 1.2.8h1.4c.5 0 1-.3 1.2-.8l.5-1.3c.2-.6.7-1 1.3-1.1l1.5-.2c.9-.1 1.8.3 2.3 1.1" />
    </svg>
  );
}

export function IconMic(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6.5 11a5.5 5.5 0 0 0 11 0" />
      <path d="M12 16.5V21" />
    </svg>
  );
}

export function IconMicOff(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 9V7a3 3 0 0 1 5.1-2.1" />
      <path d="M15 10.2V11a3 3 0 0 1-4.4 2.6" />
      <path d="M6.5 11a5.5 5.5 0 0 0 8.7 4.5" />
      <path d="M17.5 13.2A5.5 5.5 0 0 0 17.5 11" />
      <path d="M12 16.5V21" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export function IconSwap(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 7h11l-3-3" />
      <path d="M17 17H6l3 3" />
    </svg>
  );
}

/** Front / rear camera flip */
export function IconFlipCamera(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5v13A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4H8" />
      <path d="M9 4 12 2l3 2" />
      <path d="M8.5 12a3.5 3.5 0 1 0 6.2-2.2" />
      <path d="M15 9.5h2.5V7" />
    </svg>
  );
}

export function IconMinimize(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 14h6v6" />
      <path d="M20 10h-6V4" />
      <path d="M14 10l6-6" />
      <path d="M4 20l6-6" />
    </svg>
  );
}

export function IconExpand(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 3H3v6" />
      <path d="M15 21h6v-6" />
      <path d="M3 3l7 7" />
      <path d="M21 21l-7-7" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

export function IconAttach(props: IconProps) {
  return (
    <svg {...base({ size: 20, ...props })}>
      <path d="M16.5 7.5 9.2 14.8a3 3 0 1 1-4.2-4.2l8.1-8.1a4.5 4.5 0 0 1 6.4 6.4l-8.5 8.5a1.5 1.5 0 0 1-2.1-2.1l7.4-7.4" />
    </svg>
  );
}

export function IconSend(props: IconProps) {
  return (
    <svg {...base({ size: 20, ...props })}>
      <path d="M4 12 20 4l-5.5 16-3.2-6.3L4 12z" />
      <path d="M11.3 13.7 20 4" />
    </svg>
  );
}
