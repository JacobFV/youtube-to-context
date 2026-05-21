/* ------------------------------------------------------------------ *
 * Saved conversations — a localStorage-backed store of past analyses.  *
 *                                                                      *
 * Each completed analysis can be saved and later re-opened from the    *
 * homepage. The whole result payload (frame data URLs, artifact ZIP)   *
 * is kept so a saved conversation re-renders without another API call. *
 * That payload is large, so writes degrade gracefully: when the        *
 * browser quota is hit we evict the oldest entries and retry, and      *
 * surface a typed error if even a lone entry will not fit.             *
 * ------------------------------------------------------------------ */

import type { AnalyzeResult } from "./result-types";

const STORAGE_KEY = "yt2ctx.saved-conversations.v1";

/** A past analysis as it lives on the homepage list. */
export type SavedConversation = {
  /** Storage identity — the analysis job id; re-saving an id replaces it. */
  id: string;
  /** Epoch ms the conversation was saved. */
  savedAt: number;
  /** Pre-computed list fields, so the homepage need not crack open `result`. */
  videoId: string | null;
  title: string;
  uploader?: string;
  sourceUrl: string;
  durationSeconds: number;
  frameCount: number;
  /** The full payload, sufficient to re-render the result view offline. */
  result: AnalyzeResult;
};

/** Thrown by {@link saveConversation} when the entry cannot fit in storage. */
export class SavedConversationQuotaError extends Error {
  constructor() {
    super("Browser storage is full — could not save this conversation.");
    this.name = "SavedConversationQuotaError";
  }
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

function readRaw(): SavedConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Keep only entries that still look like conversations.
    return parsed.filter(
      (entry): entry is SavedConversation =>
        !!entry &&
        typeof entry.id === "string" &&
        typeof entry.savedAt === "number" &&
        !!entry.result
    );
  } catch {
    return [];
  }
}

function writeRaw(list: SavedConversation[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** Every saved conversation, newest first. Safe to call during SSR (returns []). */
export function loadConversations(): SavedConversation[] {
  return readRaw().sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * Persist a completed analysis. Re-saving the same job id replaces the prior
 * entry. When storage is full the oldest *other* conversations are evicted one
 * at a time and the write retried; if the entry alone will not fit, throws
 * {@link SavedConversationQuotaError} and leaves existing data untouched.
 */
export function saveConversation(
  result: AnalyzeResult,
  videoId: string | null
): SavedConversation {
  const entry: SavedConversation = {
    id: result.id,
    savedAt: Date.now(),
    videoId,
    title: result.metadata.title?.trim() || "Untitled video",
    uploader: result.metadata.uploader,
    sourceUrl: result.sourceUrl,
    durationSeconds: result.metadata.durationSeconds,
    frameCount: result.frames.length,
    result
  };

  // Newest first, with any prior copy of this id dropped.
  let list = [entry, ...readRaw().filter((c) => c.id !== entry.id)].sort(
    (a, b) => b.savedAt - a.savedAt
  );

  for (;;) {
    try {
      writeRaw(list);
      return entry;
    } catch (error) {
      if (!isQuotaError(error)) throw error;
      // The entry we are saving is the newest, so it sits at the front;
      // evict the oldest. If it is the only one left, it simply will not fit.
      if (list.length <= 1) throw new SavedConversationQuotaError();
      list = list.slice(0, -1);
    }
  }
}

/** Delete one conversation by id; returns the remaining list, newest first. */
export function deleteConversation(id: string): SavedConversation[] {
  const list = readRaw().filter((c) => c.id !== id);
  try {
    writeRaw(list);
  } catch {
    // A delete only shrinks storage; ignore any write hiccup.
  }
  return list.sort((a, b) => b.savedAt - a.savedAt);
}
