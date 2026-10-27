// 58mm or 80mm printer, remembered per till
"use client";

import { useState } from "react";

export type Paper = "58mm" | "80mm";

export function usePaperWidth() {
  const [paper, setPaper] = useState<Paper>(() => {
    try {
      const saved = localStorage.getItem("pos_paper");
      if (saved === "58mm" || saved === "80mm") return saved;
    } catch {
      /* storage can be blocked; the default is fine */
    }
    return "80mm";
  });
  const update = (p: Paper) => {
    setPaper(p);
    try {
      localStorage.setItem("pos_paper", p);
    } catch {
      /* ignore */
    }
  };
  return [paper, update] as const;
}
