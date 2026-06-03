import { normalizeDateToIso } from "@/lib/date";
import { fetchTrademarkPdf, type FetchPdfResult } from "@/lib/cipc-fetch";
import {
  getIngestionState,
  markRunFinished,
  markRunStarted,
  upsertTrademark,
  uploadTrademarkImage,
  upsertTrademarkImageRow
} from "@/lib/db";
import { sha256Hex } from "@/lib/hash";
import { parseTrademarkPdf } from "@/lib/pdf-parse-trademark";
import {
  formatTrademarkNumber,
  incrementTrademarkNumber,
  parseTrademarkNumber,
  type TrademarkNumber
} from "@/lib/trademark-number";
import { extractRepresentationImages } from "@/lib/pdf-images";
import type { ImageExtractionResult, ParsedTrademarkRecord } from "@/lib/types";

export type RunIngestionParams = {
  startFrom?: string;
  maxItems?: number;
  fetchPdf?: (tm: TrademarkNumber) => Promise<FetchPdfResult>;
  resolveStartFrom?: (manualStartFrom?: string) => Promise<string>;
  markStarted?: (startFrom: string) => Promise<void>;
  markFinished?: (payload: { lastTmNumber: string | null; status: string; summary: Record<string, unknown> }) => Promise<void>;
  parsePdf?: typeof parseTrademarkPdf;
  extractImages?: (buffer: Buffer, pageCount: number) => Promise<ImageExtractionResult[]>;
  saveTrademark?: (record: ParsedTrademarkRecord) => Promise<string>;
  uploadImage?: (tmNumber: string, image: ImageExtractionResult) => Promise<string>;
  saveImageRow?: (trademarkId: string, image: ImageExtractionResult, storagePath: string) => Promise<void>;
};

export type RunIngestionSummary = {
  startFrom: string;
  lastProcessedTmNumber: string | null;
  stopReason: string;
  processed: number;
  skippedInvalid: number;
  imagesStored: number;
};

export async function resolveStartTrademarkNumber(manualStartFrom?: string): Promise<string> {
  if (manualStartFrom) {
    parseTrademarkNumber(manualStartFrom);
    return manualStartFrom;
  }

  const state = await getIngestionState();
  if (!state.lastTmNumber) {
    const currentYear = new Date().getUTCFullYear();
    return `${currentYear}/1`;
  }

  const next = incrementTrademarkNumber(parseTrademarkNumber(state.lastTmNumber));
  return formatTrademarkNumber(next);
}

function toRecordInput(params: {
  tmNumber: string;
  pdfUrl: string;
  pdfBuffer: Buffer;
  parsed: Awaited<ReturnType<typeof parseTrademarkPdf>>;
}): ParsedTrademarkRecord {
  const tm = parseTrademarkNumber(params.tmNumber);
  return {
    tmNumber: params.tmNumber,
    year: tm.year,
    sequence: tm.sequence,
    pdfUrl: params.pdfUrl,
    pdfSha256: sha256Hex(params.pdfBuffer),
    applicationNumber: params.parsed.fields.applicationNumber,
    filingDate: normalizeDateToIso(params.parsed.fields.filingDate),
    publicationDate: normalizeDateToIso(params.parsed.fields.publicationDate),
    proprietor: params.parsed.fields.proprietor,
    trademarkClass: params.parsed.fields.trademarkClass,
    goodsServices: params.parsed.fields.goodsServices,
    representationNote: params.parsed.fields.representationNote,
    parsedFields: params.parsed.parsedFields,
    rawText: params.parsed.rawText
  };
}

export async function runIngestion(params: RunIngestionParams = {}): Promise<RunIngestionSummary> {
  const resolveStartFrom = params.resolveStartFrom ?? resolveStartTrademarkNumber;
  const markStarted = params.markStarted ?? markRunStarted;
  const markFinished = params.markFinished ?? markRunFinished;
  const parsePdf = params.parsePdf ?? parseTrademarkPdf;
  const extractImages = params.extractImages ?? extractRepresentationImages;
  const saveTrademark = params.saveTrademark ?? upsertTrademark;
  const uploadImage = params.uploadImage ?? uploadTrademarkImage;
  const saveImageRow = params.saveImageRow ?? upsertTrademarkImageRow;

  const startFrom = await resolveStartFrom(params.startFrom);
  await markStarted(startFrom);

  const fetchPdf = params.fetchPdf ?? fetchTrademarkPdf;
  const maxItems = params.maxItems ?? 500;
  let current = parseTrademarkNumber(startFrom);
  let processed = 0;
  let skippedInvalid = 0;
  let imagesStored = 0;
  let stopReason = "max_items_reached";
  let lastProcessedTmNumber: string | null = null;

  while (processed < maxItems) {
    const tmNumber = formatTrademarkNumber(current);
    const fetchResult = await fetchPdf(current);

    if (fetchResult.status !== "found") {
      if (fetchResult.status === "missing") {
        stopReason = fetchResult.reason;
        break;
      }

      skippedInvalid += 1;
      current = incrementTrademarkNumber(current);
      continue;
    }

    const parsed = await parsePdf(fetchResult.buffer);
    const record = toRecordInput({
      tmNumber,
      pdfUrl: fetchResult.pdfUrl,
      pdfBuffer: fetchResult.buffer,
      parsed
    });

    const trademarkId = await saveTrademark(record);
    const images = await extractImages(fetchResult.buffer, parsed.pageCount);

    for (const image of images) {
      const storagePath = await uploadImage(tmNumber, image);
      await saveImageRow(trademarkId, image, storagePath);
      imagesStored += 1;
    }

    processed += 1;
    lastProcessedTmNumber = tmNumber;
    current = incrementTrademarkNumber(current);
  }

  const summary: RunIngestionSummary = {
    startFrom,
    lastProcessedTmNumber,
    stopReason,
    processed,
    skippedInvalid,
    imagesStored
  };

  await markFinished({
    lastTmNumber: lastProcessedTmNumber,
    status: "completed",
    summary
  });

  return summary;
}
