export type ImageExtractionResult = {
  data: Buffer;
  mimeType: string;
  width?: number;
  height?: number;
  sourcePage: number;
};

export type ParsedTrademarkRecord = {
  tmNumber: string;
  year: number;
  sequence: number;
  pdfUrl: string;
  pdfSha256: string;
  applicationNumber: string | null;
  filingDate: string | null;
  publicationDate: string | null;
  proprietor: string | null;
  trademarkClass: string | null;
  goodsServices: string | null;
  representationNote: string | null;
  parsedFields: Record<string, string>;
  rawText: string;
};
