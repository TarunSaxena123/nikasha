// Upload input checks and error messages (feature 04 design §1.2, §1.7).
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_CHARS = 20_000;
export const EXT: Record<string, "pdf" | "docx" | "txt"> = { pdf: "pdf", docx: "docx", txt: "txt" };

export const MESSAGES: Record<string, { text: string; next: "paste" | "retry" | "builder" | "shorter" }> = {
  UNSUPPORTED_FILE: { text: "This file type isn't supported.", next: "paste" },
  UNREADABLE_FILE: { text: "We couldn't read text from this file — it may be a scanned image or protected.", next: "paste" },
  EXTRACTION_FAILED: { text: "We couldn't read this strategy automatically.", next: "builder" },
  EXTRACTION_BUSY: { text: "The reading service is busy right now.", next: "retry" },
  PAYLOAD_TOO_LARGE: { text: "This is too large to send.", next: "shorter" },
  NETWORK: { text: "Couldn't reach Nikasha. Check your connection.", next: "retry" },
};

export function checkFile(file: { name: string; size: number }): string | null {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (!EXT[ext]) return "Please use a PDF, Word (.docx) or text file.";
  if (file.size > MAX_FILE_BYTES) return "This file is too large (max 4 MB).";
  return null;
}

