/** Single stroke weight, single 24-box, no fills — so they read as one family. */
const box = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function IconMod() {
  return (
    <svg {...box}>
      <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z" />
      <path d="M12 12 4 7.5M12 12l8-4.5M12 12v9" />
    </svg>
  );
}

export function IconItem() {
  return (
    <svg {...box}>
      <path d="M4 8h16v12H4z" />
      <path d="M9 8V5h6v3" />
    </svg>
  );
}

export function IconBlock() {
  return (
    <svg {...box}>
      <path d="M4 6h16v12H4z" />
      <path d="M4 10h16M4 14h16M10 6v12M15 6v12" />
    </svg>
  );
}

export function IconTool() {
  return (
    <svg {...box}>
      <path d="M14.5 5.5 19 10l-8.5 8.5-4.5-4.5L14.5 5.5Z" />
      <path d="m5 19 1.5-1.5" />
    </svg>
  );
}

export function IconArmor() {
  return (
    <svg {...box}>
      <path d="M12 3 5 5.5V12c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V5.5L12 3Z" />
    </svg>
  );
}

export function IconRecipe() {
  return (
    <svg {...box}>
      <path d="M4 4h16v16H4z" />
      <path d="M9.33 4v16M14.67 4v16M4 9.33h16M4 14.67h16" />
    </svg>
  );
}

export function IconBuild() {
  return (
    <svg {...box}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  );
}

export function IconOre() {
  return (
    <svg {...box}>
      <path d="M4 6h16v12H4z" />
      <path d="m9 10 1.5 1.5L9 13l-1.5-1.5L9 10Z" />
      <path d="m15.5 13.5 1 1-1 1-1-1 1-1Z" />
    </svg>
  );
}

export function IconWarn() {
  return (
    <svg {...box}>
      <path d="M12 4 2.5 20h19L12 4Z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}

export function IconError() {
  return (
    <svg {...box}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </svg>
  );
}

export function IconOk() {
  return (
    <svg {...box}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  );
}

export function IconEmpty() {
  return (
    <svg {...box}>
      <path d="M4 7h16v13H4z" />
      <path d="M4 7l2-3h12l2 3" />
      <path d="M10 12h4" />
    </svg>
  );
}
