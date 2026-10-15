// The single API client (REQ-PRV-23): strategies go only to the engine, uploads only to the
// extraction function. Nothing is sent to the site's own origin. Busy responses (429/503) are
// retried with backoff 1 s, 2 s, 4 s (architecture.md §3.3), then reported as "busy".
import type {
  EvaluateRequest,
  ExtractionResult,
  MetaResponse,
  Problem,
  Report,
  SuggestionPlanRequest,
  SuggestionPlanResponse,
} from "./types";

export const ENGINE_URL = (process.env.NEXT_PUBLIC_ENGINE_URL ?? "http://localhost:8000").replace(/\/$/, "");
export const EXTRACT_URL = (process.env.NEXT_PUBLIC_EXTRACT_URL ?? "http://localhost:8001").replace(/\/$/, "");
export const BACKOFF_MS = [1000, 2000, 4000];

export type FailureKind = "busy" | "invalid" | "failed" | "network" | "aborted";

export class ApiFailure extends Error {
  constructor(
    public kind: FailureKind,
    public status: number,
    public code: string | null,
    public userMessage: string,
    public problems: Problem[] = [],
  ) {
    super(kind);
  }
}

let sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new ApiFailure("aborted", 0, null, ""));
    });
  });

/** Tests replace the backoff wait. */
export function _setSleep(fn: typeof sleep): void {
  sleep = fn;
}

const GENERIC = "Something went wrong. Please try again.";
const UNREACHABLE = "Nikasha's evaluation service isn't responding. Please try again in a minute.";
const BUSY = "Busy right now, please try again.";

async function call<T>(url: string, init: RequestInit, signal?: AbortSignal, unreachable = UNREACHABLE): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { ...init, signal, credentials: "omit", referrerPolicy: "no-referrer" });
    } catch {
      if (signal?.aborted) throw new ApiFailure("aborted", 0, null, "");
      throw new ApiFailure("network", 0, null, unreachable);
    }
    if (res.status === 429 || res.status === 503) {
      if (attempt < BACKOFF_MS.length) {
        await sleep(BACKOFF_MS[attempt]!, signal);
        continue;
      }
      throw new ApiFailure("busy", res.status, "BUSY", BUSY);
    }
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (res.ok) return body as T;
    const err = (body as { error?: { code?: string; message?: string; problems?: Problem[] } } | null)?.error;
    if (res.status === 422 || res.status === 413 || res.status === 415) {
      throw new ApiFailure("invalid", res.status, err?.code ?? null, err?.message ?? GENERIC, err?.problems ?? []);
    }
    throw new ApiFailure("failed", res.status, err?.code ?? null, err?.message ?? GENERIC);
  }
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export function getMeta(signal?: AbortSignal): Promise<MetaResponse> {
  return call<MetaResponse>(`${ENGINE_URL}/v1/meta`, { method: "GET" }, signal);
}

export function evaluate(request: EvaluateRequest, signal?: AbortSignal): Promise<Report> {
  return call<Report>(`${ENGINE_URL}/v1/evaluate`, json(request), signal);
}

export function planSuggestions(request: SuggestionPlanRequest, signal?: AbortSignal): Promise<SuggestionPlanResponse> {
  return call<SuggestionPlanResponse>(`${ENGINE_URL}/v1/suggestions/plan`, json(request), signal);
}

const EXTRACT_UNREACHABLE = "The service that reads documents isn't responding. Please try again in a minute.";

export function extractText(text: string, signal?: AbortSignal): Promise<ExtractionResult> {
  return call<ExtractionResult>(`${EXTRACT_URL}/v1/extract`, json({ text }), signal, EXTRACT_UNREACHABLE);
}

export function extractFile(file: Blob, ext: "pdf" | "docx" | "txt", signal?: AbortSignal): Promise<ExtractionResult> {
  const form = new FormData();
  // The user's file name is never sent: only a fixed name with the file type (REQ-PRV-24).
  form.append("file", file, `upload.${ext}`);
  return call<ExtractionResult>(`${EXTRACT_URL}/v1/extract`, { method: "POST", body: form }, signal, EXTRACT_UNREACHABLE);
}
