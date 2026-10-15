import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiFailure, ENGINE_URL, EXTRACT_URL, _setSleep, evaluate, extractFile, getMeta } from "./client";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const status = (s: number, body: unknown = {}) => new Response(JSON.stringify(body), { status: s });

afterEach(() => vi.restoreAllMocks());
_setSleep(() => Promise.resolve());

describe("API client (AC-EVL-09)", () => {
  it("retries 429 twice then succeeds", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(status(429)).mockResolvedValueOnce(status(429)).mockResolvedValueOnce(ok({ metrics: {} }));
    await expect(evaluate({} as never)).resolves.toEqual({ metrics: {} });
    expect(f).toHaveBeenCalledTimes(3);
    expect(String(f.mock.calls[0]![0])).toBe(`${ENGINE_URL}/v1/evaluate`);
  });
  it("gives up after three retries with a busy message", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => Promise.resolve(status(503)));
    await expect(evaluate({} as never)).rejects.toMatchObject({ kind: "busy", userMessage: "Busy right now, please try again." });
  });
  it("422 carries the plain-English problems", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(status(422, { error: { code: "VALIDATION_FAILED", message: "m", problems: [{ field_label: "Costs", message: "x" }] } }));
    const e = (await evaluate({} as never).catch((x) => x)) as ApiFailure;
    expect(e.kind).toBe("invalid");
    expect(e.problems[0]!.field_label).toBe("Costs");
  });
  it("network failure is plain English", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    await expect(getMeta()).rejects.toMatchObject({ kind: "network" });
  });
  it("uploads go only to the extraction URL, without the file name", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok({ items: [] }));
    await extractFile(new Blob(["x"]), "txt");
    expect(String(f.mock.calls[0]![0])).toBe(`${EXTRACT_URL}/v1/extract`);
    const form = f.mock.calls[0]![1]!.body as FormData;
    expect((form.get("file") as File).name).toBe("upload.txt");
  });
});
