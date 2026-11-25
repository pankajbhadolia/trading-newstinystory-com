"use client";

import { useEffect, useRef } from "react";
import { Select } from "@/components/ui/input";
import { isTheme, resolveTheme, themes } from "@/config/themes";

const storageKey = "traders-command-centre-theme";

export function ThemeSelector() {
  const selectRef = useRef<HTMLSelectElement>(null);
  const errorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    function syncTheme() {
      try {
        const saved = resolveTheme(localStorage.getItem(storageKey));
        document.documentElement.dataset.theme = saved;
        if (selectRef.current) selectRef.current.value = saved;
      } catch {
        if (errorRef.current) errorRef.current.hidden = false;
      }
    }
    syncTheme();
    window.addEventListener("account-theme-change", syncTheme);
    return () => window.removeEventListener("account-theme-change", syncTheme);
  }, []);

  function changeTheme(value: string) {
    if (!isTheme(value)) return;
    document.documentElement.dataset.theme = value;
    try {
      localStorage.setItem(storageKey, value);
      if (errorRef.current) errorRef.current.hidden = true;
    } catch {
      if (errorRef.current) errorRef.current.hidden = false;
    }
  }

  return (
    <div className="theme-control">
      <label htmlFor="theme-selector">Theme</label>
      <Select id="theme-selector" ref={selectRef} defaultValue="corporate-light" onChange={(event) => changeTheme(event.target.value)} aria-label="Theme" aria-describedby="theme-storage-error">
        {themes.map((theme) => <option key={theme.value} value={theme.value}>{theme.label}</option>)}
      </Select>
      <span id="theme-storage-error" ref={errorRef} role="status" hidden>Theme preference could not be saved in this browser.</span>
    </div>
  );
}
