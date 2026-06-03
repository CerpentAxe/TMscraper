import { describe, expect, it, vi } from "vitest";
import { runIngestion } from "@/lib/ingest-runner";
import type { FetchPdfResult } from "@/lib/cipc-fetch";

function found(pdfUrl: string): FetchPdfResult {
  return {
    status: "found",
    pdfUrl,
    contentType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 sample")
  };
}

describe("runIngestion stop behavior", () => {
  it("stops when the next item is missing", async () => {
    const fetchPdf = vi
      .fn()
      .mockResolvedValueOnce(found("https://efile.cipc.co.za/clientTemp/trademarks/tm202620052.pdf"))
      .mockResolvedValueOnce({
        status: "missing",
        pdfUrl: "https://efile.cipc.co.za/clientTemp/trademarks/tm202620053.pdf",
        reason: "404_not_found"
      } as FetchPdfResult);

    const markStarted = vi.fn(async () => undefined);
    const markFinished = vi.fn(async () => undefined);
    const saveTrademark = vi.fn(async () => "tm-id-1");
    const parsePdf = vi.fn(async () => ({
      fields: {
        applicationNumber: "2026/20052",
        filingDate: "2026-06-02",
        publicationDate: "2026-06-03",
        proprietor: "Test Owner",
        trademarkClass: "25",
        goodsServices: "Test goods",
        representationNote: "Representation"
      },
      parsedFields: {},
      rawText: "sample",
      pageCount: 2,
      extractedPageCount: 1,
      pageTexts: ["sample"]
    }));

    const summary = await runIngestion({
      startFrom: "2026/20052",
      fetchPdf,
      markStarted,
      markFinished,
      saveTrademark,
      parsePdf,
      extractImages: async () => [],
      uploadImage: async () => "path",
      saveImageRow: async () => undefined
    });

    expect(summary.processed).toBe(1);
    expect(summary.stopReason).toBe("404_not_found");
    expect(summary.lastProcessedTmNumber).toBe("2026/20052");
    expect(saveTrademark).toHaveBeenCalledTimes(1);
    expect(markFinished).toHaveBeenCalledTimes(1);
  });
});
