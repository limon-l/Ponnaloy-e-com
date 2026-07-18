"use client";

import { useTheme as useNextTheme } from "next-themes";

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  return {
    theme: theme as "light" | "dark" | "system",
    resolvedTheme: (resolvedTheme as "light" | "dark") || "light",
    setTheme: (t: "light" | "dark" | "system") => setTheme(t),
  };
}
