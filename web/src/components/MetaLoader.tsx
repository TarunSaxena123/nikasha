"use client";
import { useEffect } from "react";
import { loadMeta } from "@/hooks/useMeta";

/** Loads /v1/meta once when the app starts (it carries no user content, so open pages may call it). */
export function MetaLoader() {
  useEffect(() => {
    void loadMeta();
  }, []);
  return null;
}
