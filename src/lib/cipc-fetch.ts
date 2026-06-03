import { toCipcPdfPathSegment, type TrademarkNumber } from "@/lib/trademark-number";

export const CIPC_PDF_BASE_URL = "https://efile.cipc.co.za/clientTemp/trademarks";

export type FetchPdfResult =
  | {
      status: "found";
      pdfUrl: string;
      contentType: string | null;
      buffer: Buffer;
    }
  | {
      status: "missing" | "invalid";
      pdfUrl: string;
      reason: string;
    };

export function buildTrademarkPdfUrl(tm: TrademarkNumber): string {
  return `${CIPC_PDF_BASE_URL}/${toCipcPdfPathSegment(tm)}.pdf`;
}

function looksLikePdf(contentType: string | null, body: Buffer): boolean {
  if (contentType?.toLowerCase().includes("pdf")) {
    return true;
  }
  return body.subarray(0, 5).toString("utf8") === "%PDF-";
}

export async function fetchTrademarkPdf(tm: TrademarkNumber): Promise<FetchPdfResult> {
  const pdfUrl = buildTrademarkPdfUrl(tm);
  const response = await fetch(pdfUrl, { method: "GET", cache: "no-store" });

  if (response.status === 404) {
    return { status: "missing", pdfUrl, reason: "404_not_found" };
  }

  if (!response.ok) {
    return {
      status: "invalid",
      pdfUrl,
      reason: `http_${response.status}`
    };
  }

  const contentType = response.headers.get("content-type");
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.byteLength === 0) {
    return { status: "missing", pdfUrl, reason: "empty_response" };
  }

  if (!looksLikePdf(contentType, buffer)) {
    return { status: "invalid", pdfUrl, reason: "not_pdf" };
  }

  return {
    status: "found",
    pdfUrl,
    contentType,
    buffer
  };
}
