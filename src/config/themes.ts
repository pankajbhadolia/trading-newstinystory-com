export const themeValues = ["corporate-light", "corporate-dark", "midnight-blue", "pink"] as const;
export type Theme = (typeof themeValues)[number];

const labels: Record<Theme, string> = {
  "corporate-light": "Corporate Light",
  "corporate-dark": "Corporate Dark",
  "midnight-blue": "Midnight Blue",
  pink: "Pink",
};

export const themes = themeValues.map((value) => ({ value, label: labels[value] }));

export function isTheme(value: string | null): value is Theme {
  return themes.some((theme) => theme.value === value);
}

export function resolveTheme(value: string | null | undefined): Theme {
  if (value && isTheme(value)) return value;
  if (value === "dark") return "corporate-dark";
  if (value === "blue") return "midnight-blue";
  return "corporate-light";
}
