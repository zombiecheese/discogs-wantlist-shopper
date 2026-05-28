import type { CSSProperties } from "react";
import type { DiscogsWantlistItem } from "./types";

export type GenreThemeKey =
  | "rock"
  | "electronic"
  | "jazz"
  | "funk-soul"
  | "hip-hop"
  | "pop"
  | "reggae"
  | "blues"
  | "folk"
  | "latin"
  | "classical"
  | "stage-screen";

type GenreTheme = {
  key: GenreThemeKey;
  label: string;
  mood: string;
  badge: string;
  palette: {
    bg: string;
    bgSoft: string;
    panel: string;
    panelStrong: string;
    line: string;
    lineStrong: string;
    text: string;
    muted: string;
    accent: string;
    accentStrong: string;
    paper: string;
    danger: string;
    highlight?: string;
    glow?: string;
  };
  typography: {
    display: string;
    body: string;
    weight: number;
    letterSpacing: string;
  };
  roundness: {
    lg: string;
    md: string;
    sm: string;
    pill: string;
  };
  shadows: {
    soft: string;
    strong: string;
  };
};

type GenrePresentation = {
  key: GenreThemeKey;
  label: string;
  glyph: string;
  spine: string;
};

const themes: Record<GenreThemeKey, GenreTheme> = {
  rock: {
    key: "rock",
    label: "Rock",
    mood: "Smoke, leather, back-room amp hum.",
    badge: "Backroom rock stack",
    palette: {
      bg: "#0a0704",
      bgSoft: "#1a0f08",
      panel: "rgba(20, 12, 8, 0.92)",
      panelStrong: "rgba(35, 20, 12, 0.97)",
      line: "rgba(198, 152, 104, 0.2)",
      lineStrong: "rgba(198, 152, 104, 0.38)",
      text: "#f9e8d4",
      muted: "#c9a975",
      accent: "#e8944d",
      accentStrong: "#c41f0d",
      paper: "#e8cda6",
      danger: "#f26548",
      highlight: "#ff6b35",
      glow: "rgba(232, 148, 77, 0.25)",
    },
    typography: {
      display: '"Bebas Neue", "Impact", sans-serif',
      body: '"Cormorant Garamond", serif',
      weight: 700,
      letterSpacing: "0.06em",
    },
    roundness: {
      lg: "16px",
      md: "12px",
      sm: "8px",
      pill: "999px",
    },
    shadows: {
      soft: "0 12px 32px rgba(0, 0, 0, 0.4)",
      strong: "0 20px 48px rgba(196, 31, 13, 0.25)",
    },
  },
  electronic: {
    key: "electronic",
    label: "Electronic",
    mood: "Warehouse lights, smoked acrylic, vinyl static.",
    badge: "Machine pulse rack",
    palette: {
      bg: "#080b10",
      bgSoft: "#141820",
      panel: "rgba(12, 16, 24, 0.91)",
      panelStrong: "rgba(20, 28, 40, 0.96)",
      line: "rgba(100, 180, 220, 0.2)",
      lineStrong: "rgba(100, 180, 220, 0.4)",
      text: "#e0ecf8",
      muted: "#8ba8c9",
      accent: "#4dd9ff",
      accentStrong: "#0099dd",
      paper: "#b8d9f0",
      danger: "#ff6b7a",
      highlight: "#00ffff",
      glow: "rgba(77, 217, 255, 0.3)",
    },
    typography: {
      display: '"IBM Plex Mono", monospace',
      body: '"Courier New", monospace',
      weight: 600,
      letterSpacing: "0.05em",
    },
    roundness: {
      lg: "8px",
      md: "6px",
      sm: "4px",
      pill: "999px",
    },
    shadows: {
      soft: "0 8px 24px rgba(0, 0, 0, 0.5)",
      strong: "0 16px 40px rgba(77, 217, 255, 0.2)",
    },
  },
  jazz: {
    key: "jazz",
    label: "Jazz",
    mood: "Midnight blue, brass lamps, bourbon-stained sleeves.",
    badge: "Blue note corner",
    palette: {
      bg: "#0d0a14",
      bgSoft: "#1a1828",
      panel: "rgba(15, 14, 28, 0.92)",
      panelStrong: "rgba(25, 23, 42, 0.96)",
      line: "rgba(183, 145, 86, 0.2)",
      lineStrong: "rgba(183, 145, 86, 0.38)",
      text: "#f0e6d8",
      muted: "#c4a88a",
      accent: "#d9b366",
      accentStrong: "#5a7aad",
      paper: "#e5d4ba",
      danger: "#e07a7a",
      highlight: "#e8c547",
      glow: "rgba(217, 179, 102, 0.25)",
    },
    typography: {
      display: '"Playfair Display", serif',
      body: '"Crimson Text", serif',
      weight: 500,
      letterSpacing: "0.03em",
    },
    roundness: {
      lg: "20px",
      md: "14px",
      sm: "10px",
      pill: "999px",
    },
    shadows: {
      soft: "0 14px 36px rgba(0, 0, 0, 0.45)",
      strong: "0 22px 56px rgba(90, 122, 173, 0.2)",
    },
  },
  "funk-soul": {
    key: "funk-soul",
    label: "Funk / Soul",
    mood: "Velvet midnight, neon venue glow, satin grooves.",
    badge: "Velvet soul bin",
    palette: {
      bg: "#12080f",
      bgSoft: "#24122d",
      panel: "rgba(24, 10, 28, 0.92)",
      panelStrong: "rgba(40, 16, 48, 0.96)",
      line: "rgba(220, 120, 180, 0.2)",
      lineStrong: "rgba(220, 120, 180, 0.4)",
      text: "#f8dde8",
      muted: "#d4a0b8",
      accent: "#ef6ba8",
      accentStrong: "#b5286d",
      paper: "#f0d4e4",
      danger: "#ff7a8f",
      highlight: "#ff1493",
      glow: "rgba(239, 107, 168, 0.28)",
    },
    typography: {
      display: '"Fredoka One", sans-serif',
      body: '"Poppins", sans-serif',
      weight: 600,
      letterSpacing: "0.04em",
    },
    roundness: {
      lg: "24px",
      md: "16px",
      sm: "12px",
      pill: "999px",
    },
    shadows: {
      soft: "0 16px 40px rgba(0, 0, 0, 0.4)",
      strong: "0 24px 52px rgba(181, 40, 109, 0.25)",
    },
  },
  "hip-hop": {
    key: "hip-hop",
    label: "Hip Hop",
    mood: "Concrete dusk, gold foil stickers, battle-worn jackets.",
    badge: "Concrete rhyme shelf",
    palette: {
      bg: "#0f0d0b",
      bgSoft: "#23201a",
      panel: "rgba(24, 20, 16, 0.93)",
      panelStrong: "rgba(40, 33, 26, 0.97)",
      line: "rgba(214, 180, 90, 0.2)",
      lineStrong: "rgba(214, 180, 90, 0.38)",
      text: "#f5e4c8",
      muted: "#c4ad7a",
      accent: "#f4d566",
      accentStrong: "#c68d1f",
      paper: "#fef3d7",
      danger: "#ff8855",
      highlight: "#ffd700",
      glow: "rgba(244, 213, 102, 0.28)",
    },
    typography: {
      display: '"Bebas Neue", sans-serif',
      body: '"Roboto", sans-serif',
      weight: 700,
      letterSpacing: "0.08em",
    },
    roundness: {
      lg: "12px",
      md: "8px",
      sm: "6px",
      pill: "999px",
    },
    shadows: {
      soft: "0 12px 32px rgba(0, 0, 0, 0.5)",
      strong: "0 20px 48px rgba(198, 141, 31, 0.25)",
    },
  },
  pop: {
    key: "pop",
    label: "Pop",
    mood: "Neon poster ink aged by time and club smoke.",
    badge: "Poster-pop wall",
    palette: {
      bg: "#150a0d",
      bgSoft: "#2f1620",
      panel: "rgba(30, 12, 22, 0.92)",
      panelStrong: "rgba(48, 20, 35, 0.96)",
      line: "rgba(245, 120, 100, 0.2)",
      lineStrong: "rgba(245, 120, 100, 0.4)",
      text: "#ffe0d8",
      muted: "#d8a8a0",
      accent: "#ff6b7a",
      accentStrong: "#d41f5f",
      paper: "#ffd4ca",
      danger: "#ff5555",
      highlight: "#ff00ff",
      glow: "rgba(255, 107, 122, 0.3)",
    },
    typography: {
      display: '"Paytone One", sans-serif',
      body: '"Quicksand", sans-serif',
      weight: 600,
      letterSpacing: "0.02em",
    },
    roundness: {
      lg: "28px",
      md: "18px",
      sm: "14px",
      pill: "999px",
    },
    shadows: {
      soft: "0 14px 36px rgba(0, 0, 0, 0.4)",
      strong: "0 24px 56px rgba(212, 31, 95, 0.22)",
    },
  },
  reggae: {
    key: "reggae",
    label: "Reggae",
    mood: "Dub cellar warmth, oak crates, faded speaker cloth.",
    badge: "Dub pressure rack",
    palette: {
      bg: "#0d0d07",
      bgSoft: "#1a1f0f",
      panel: "rgba(18, 20, 10, 0.91)",
      panelStrong: "rgba(30, 35, 18, 0.95)",
      line: "rgba(180, 160, 70, 0.2)",
      lineStrong: "rgba(180, 160, 70, 0.38)",
      text: "#ebe3c8",
      muted: "#b6a878",
      accent: "#c8a838",
      accentStrong: "#6b7f2a",
      paper: "#dfd4a0",
      danger: "#d96b4a",
      highlight: "#ffdd00",
      glow: "rgba(200, 168, 56, 0.24)",
    },
    typography: {
      display: '"Righteous", sans-serif',
      body: '"Open Sans", sans-serif',
      weight: 500,
      letterSpacing: "0.04em",
    },
    roundness: {
      lg: "22px",
      md: "14px",
      sm: "10px",
      pill: "999px",
    },
    shadows: {
      soft: "0 12px 30px rgba(0, 0, 0, 0.45)",
      strong: "0 20px 44px rgba(107, 127, 42, 0.2)",
    },
  },
  blues: {
    key: "blues",
    label: "Blues",
    mood: "Indigo haze, club ashtrays, whiskey-ring sleeves.",
    badge: "After-hours blues",
    palette: {
      bg: "#0c0f18",
      bgSoft: "#18212f",
      panel: "rgba(14, 18, 28, 0.92)",
      panelStrong: "rgba(24, 30, 44, 0.96)",
      line: "rgba(160, 130, 80, 0.2)",
      lineStrong: "rgba(160, 130, 80, 0.38)",
      text: "#e8dfd2",
      muted: "#a89878",
      accent: "#b8956a",
      accentStrong: "#5a7aad",
      paper: "#d8cbb8",
      danger: "#d97575",
      highlight: "#8bc5d9",
      glow: "rgba(184, 149, 106, 0.24)",
    },
    typography: {
      display: '"Bodoni Moda", serif',
      body: '"Lora", serif',
      weight: 500,
      letterSpacing: "0.03em",
    },
    roundness: {
      lg: "20px",
      md: "14px",
      sm: "10px",
      pill: "999px",
    },
    shadows: {
      soft: "0 14px 36px rgba(0, 0, 0, 0.45)",
      strong: "0 22px 52px rgba(90, 122, 173, 0.18)",
    },
  },
  folk: {
    key: "folk",
    label: "Folk, World, & Country",
    mood: "Cedar shelves, worn denim, coffee-stained paper inners.",
    badge: "Barnwood folk stack",
    palette: {
      bg: "#0f0a06",
      bgSoft: "#21180f",
      panel: "rgba(24, 16, 10, 0.92)",
      panelStrong: "rgba(38, 26, 18, 0.96)",
      line: "rgba(165, 120, 75, 0.2)",
      lineStrong: "rgba(165, 120, 75, 0.38)",
      text: "#f0e8d8",
      muted: "#b89870",
      accent: "#c9956b",
      accentStrong: "#7a5a35",
      paper: "#e0cdb2",
      danger: "#d97a65",
      highlight: "#d4a574",
      glow: "rgba(201, 149, 107, 0.22)",
    },
    typography: {
      display: '"Merriweather", serif',
      body: '"Lora", serif',
      weight: 400,
      letterSpacing: "0.02em",
    },
    roundness: {
      lg: "22px",
      md: "15px",
      sm: "11px",
      pill: "999px",
    },
    shadows: {
      soft: "0 13px 34px rgba(0, 0, 0, 0.42)",
      strong: "0 21px 50px rgba(122, 90, 53, 0.2)",
    },
  },
  latin: {
    key: "latin",
    label: "Latin",
    mood: "Terracotta walls, brass trim, dancefloor dust on wax.",
    badge: "Terracotta salsa bin",
    palette: {
      bg: "#140806",
      bgSoft: "#2d1408",
      panel: "rgba(30, 12, 8, 0.93)",
      panelStrong: "rgba(48, 20, 14, 0.97)",
      line: "rgba(230, 130, 70, 0.2)",
      lineStrong: "rgba(230, 130, 70, 0.4)",
      text: "#f8e0cc",
      muted: "#d4a070",
      accent: "#f49845",
      accentStrong: "#b8451a",
      paper: "#f0d9b8",
      danger: "#ff7a5a",
      highlight: "#ffaa44",
      glow: "rgba(244, 152, 69, 0.26)",
    },
    typography: {
      display: '"Fredoka", sans-serif',
      body: '"DM Sans", sans-serif',
      weight: 600,
      letterSpacing: "0.03em",
    },
    roundness: {
      lg: "24px",
      md: "16px",
      sm: "12px",
      pill: "999px",
    },
    shadows: {
      soft: "0 14px 36px rgba(0, 0, 0, 0.45)",
      strong: "0 24px 52px rgba(184, 69, 26, 0.24)",
    },
  },
  classical: {
    key: "classical",
    label: "Classical",
    mood: "Velvet hall curtains, gilt frames, library hush.",
    badge: "Velvet archive shelf",
    palette: {
      bg: "#0f0a0d",
      bgSoft: "#1d1117",
      panel: "rgba(20, 12, 16, 0.92)",
      panelStrong: "rgba(32, 20, 28, 0.96)",
      line: "rgba(180, 140, 100, 0.2)",
      lineStrong: "rgba(180, 140, 100, 0.38)",
      text: "#f5e6d8",
      muted: "#c8a890",
      accent: "#d4a378",
      accentStrong: "#8b4a5a",
      paper: "#e8d4c0",
      danger: "#d98a7a",
      highlight: "#e8b8a0",
      glow: "rgba(212, 163, 120, 0.22)",
    },
    typography: {
      display: '"Trajan Pro", serif',
      body: '"Crimson Text", serif',
      weight: 400,
      letterSpacing: "0.04em",
    },
    roundness: {
      lg: "18px",
      md: "12px",
      sm: "8px",
      pill: "999px",
    },
    shadows: {
      soft: "0 12px 32px rgba(0, 0, 0, 0.45)",
      strong: "0 20px 48px rgba(139, 74, 90, 0.18)",
    },
  },
  "stage-screen": {
    key: "stage-screen",
    label: "Stage & Screen",
    mood: "Noir cinema lobby, marquis glow, soundtrack dust.",
    badge: "Marquee soundtrack vault",
    palette: {
      bg: "#0a0908",
      bgSoft: "#1a1515",
      panel: "rgba(18, 14, 12, 0.93)",
      panelStrong: "rgba(32, 26, 22, 0.97)",
      line: "rgba(190, 150, 95, 0.2)",
      lineStrong: "rgba(190, 150, 95, 0.38)",
      text: "#f2e8dd",
      muted: "#b8a090",
      accent: "#d4a874",
      accentStrong: "#8b5a3a",
      paper: "#e8d8c8",
      danger: "#dc8070",
      highlight: "#f0cc99",
      glow: "rgba(212, 168, 116, 0.24)",
    },
    typography: {
      display: '"Orbitron", sans-serif',
      body: '"Lora", serif',
      weight: 500,
      letterSpacing: "0.04em",
    },
    roundness: {
      lg: "20px",
      md: "13px",
      sm: "9px",
      pill: "999px",
    },
    shadows: {
      soft: "0 12px 32px rgba(0, 0, 0, 0.5)",
      strong: "0 20px 48px rgba(139, 90, 58, 0.2)",
    },
  },
};

export const themeOptions: Array<{ key: GenreThemeKey; label: string }> = [
  { key: "rock", label: "Rock" },
  { key: "electronic", label: "Electronic" },
  { key: "jazz", label: "Jazz" },
  { key: "funk-soul", label: "Funk / Soul" },
  { key: "hip-hop", label: "Hip Hop" },
  { key: "pop", label: "Pop" },
  { key: "reggae", label: "Reggae" },
  { key: "blues", label: "Blues" },
  { key: "folk", label: "Folk, World, & Country" },
  { key: "latin", label: "Latin" },
  { key: "classical", label: "Classical" },
  { key: "stage-screen", label: "Stage & Screen" },
];

const genreAliasMap: Record<string, GenreThemeKey> = {
  rock: "rock",
  electronic: "electronic",
  jazz: "jazz",
  "funk / soul": "funk-soul",
  "funk/soul": "funk-soul",
  "hip hop": "hip-hop",
  "hip-hop": "hip-hop",
  pop: "pop",
  reggae: "reggae",
  blues: "blues",
  folk: "folk",
  "folk, world, & country": "folk",
  latin: "latin",
  classical: "classical",
  "stage & screen": "stage-screen",
};

const genrePresentationMap: Record<GenreThemeKey, GenrePresentation> = {
  rock: { key: "rock", label: "Rock", glyph: "AMP", spine: "linear-gradient(180deg, #d08942, #7e2615)" },
  electronic: { key: "electronic", label: "Electronic", glyph: "SYN", spine: "linear-gradient(180deg, #6b9fb0, #2d4c5c)" },
  jazz: { key: "jazz", label: "Jazz", glyph: "JAZ", spine: "linear-gradient(180deg, #cfa86b, #314969)" },
  "funk-soul": { key: "funk-soul", label: "Funk / Soul", glyph: "SOUL", spine: "linear-gradient(180deg, #d78d57, #7b2947)" },
  "hip-hop": { key: "hip-hop", label: "Hip Hop", glyph: "MC", spine: "linear-gradient(180deg, #cfad58, #57311f)" },
  pop: { key: "pop", label: "Pop", glyph: "POP", spine: "linear-gradient(180deg, #df8a61, #8d3142)" },
  reggae: { key: "reggae", label: "Reggae", glyph: "DUB", spine: "linear-gradient(180deg, #c79d42, #40532c)" },
  blues: { key: "blues", label: "Blues", glyph: "BLU", spine: "linear-gradient(180deg, #c28f51, #35516d)" },
  folk: { key: "folk", label: "Folk", glyph: "FOLK", spine: "linear-gradient(180deg, #bf8b53, #5b4a2b)" },
  latin: { key: "latin", label: "Latin", glyph: "LAT", spine: "linear-gradient(180deg, #d98545, #7f2f1b)" },
  classical: { key: "classical", label: "Classical", glyph: "OP", spine: "linear-gradient(180deg, #c9965d, #57223c)" },
  "stage-screen": { key: "stage-screen", label: "Stage & Screen", glyph: "OST", spine: "linear-gradient(180deg, #cf9959, #5f2f26)" },
};

function normalizeGenreName(value: string): GenreThemeKey | null {
  return genreAliasMap[value.trim().toLowerCase()] ?? null;
}

export function getPrimaryGenreKey(item: DiscogsWantlistItem): GenreThemeKey | null {
  for (const genre of item.genres) {
    const normalized = normalizeGenreName(genre);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function getThemeSummary(wantlist: DiscogsWantlistItem[]) {
  const counts = new Map<GenreThemeKey, number>();

  for (const item of wantlist) {
    const genre = getPrimaryGenreKey(item);
    if (!genre) {
      continue;
    }

    counts.set(genre, (counts.get(genre) ?? 0) + 1);
  }

  const dominantEntry = [...counts.entries()].sort((left, right) => right[1] - left[1])[0];
  const dominantTheme = dominantEntry ? themes[dominantEntry[0]] : themes.rock;
  const dominantCount = dominantEntry?.[1] ?? 0;

  return {
    theme: dominantTheme,
    dominantCount,
    totalTagged: [...counts.values()].reduce((sum, value) => sum + value, 0),
  };
}

export function getThemeByKey(key: GenreThemeKey) {
  return themes[key];
}

export function getThemeVariables(theme: GenreTheme): CSSProperties {
  return {
    "--bg": theme.palette.bg,
    "--bg-soft": theme.palette.bgSoft,
    "--panel": theme.palette.panel,
    "--panel-strong": theme.palette.panelStrong,
    "--line": theme.palette.line,
    "--line-strong": theme.palette.lineStrong,
    "--text": theme.palette.text,
    "--muted": theme.palette.muted,
    "--accent": theme.palette.accent,
    "--accent-strong": theme.palette.accentStrong,
    "--paper": theme.palette.paper,
    "--danger": theme.palette.danger,
    "--highlight": theme.palette.highlight || theme.palette.accent,
    "--glow": theme.palette.glow || "rgba(208, 137, 66, 0.25)",
    "--font-display": theme.typography.display,
    "--font-body": theme.typography.body,
    "--font-weight": theme.typography.weight.toString(),
    "--letter-spacing": theme.typography.letterSpacing,
    "--radius-lg": theme.roundness.lg,
    "--radius-md": theme.roundness.md,
    "--radius-sm": theme.roundness.sm,
    "--radius-pill": theme.roundness.pill,
    "--shadow-soft": theme.shadows.soft,
    "--shadow-strong": theme.shadows.strong,
  } as CSSProperties;
}

export function getGenrePresentation(item: DiscogsWantlistItem | undefined) {
  const key = item ? getPrimaryGenreKey(item) : null;

  if (!key) {
    return {
      key: "rock" as GenreThemeKey,
      label: "Unknown",
      glyph: "VINYL",
      spine: "linear-gradient(180deg, #8e6745, #3d271a)",
    };
  }

  return genrePresentationMap[key];
}