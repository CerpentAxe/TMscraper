export type ParsedTrademarkPdf = {
  fields: {
    applicationNumber: string | null;
    filingDate: string | null;
    publicationDate: string | null;
    proprietor: string | null;
    trademarkClass: string | null;
    goodsServices: string | null;
    representationNote: string | null;
  };
  parsedFields: Record<string, string>;
  rawText: string;
  pageCount: number;
  extractedPageCount: number;
  pageTexts: string[];
};

function normalizeSpace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function extractByLabel(text: string, labels: string[]): string | null {
  const stopLabels = [
    "Application Number",
    "Application No",
    "Application",
    "Filing Date",
    "Date of Application",
    "Publication Date",
    "Advertised Date",
    "Proprietor",
    "Applicant",
    "Class",
    "International Class",
    "Goods and Services",
    "Specification",
    "Goods/Services",
    "Representation of Trade Mark",
    "Representation"
  ];
  const stopGroup = stopLabels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");

  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`${escaped}\\s*[:\\-]?\\s*(.+?)(?=\\s*(?:${stopGroup})\\s*[:\\-]|$)`, "is");
    const match = regex.exec(text);
    if (match?.[1]) {
      return normalizeSpace(match[1]);
    }
  }
  return null;
}

export function extractFieldsFromRawText(rawText: string): ParsedTrademarkPdf["fields"] {
  return {
    applicationNumber: extractByLabel(rawText, ["Application Number", "Application No", "Application"]),
    filingDate: extractByLabel(rawText, ["Filing Date", "Date of Application"]),
    publicationDate: extractByLabel(rawText, ["Publication Date", "Advertised Date"]),
    proprietor: extractByLabel(rawText, ["Proprietor", "Applicant"]),
    trademarkClass: extractByLabel(rawText, ["Class", "International Class"]),
    goodsServices: extractByLabel(rawText, ["Goods and Services", "Specification", "Goods/Services"]),
    representationNote: extractByLabel(rawText, ["Representation of Trade Mark", "Representation"])
  };
}

async function extractTextByPages(buffer: Buffer): Promise<{ pageTexts: string[]; pageCount: number }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  const lastPageToParse = Math.max(pageCount - 1, 1);
  const pageTexts: string[] = [];

  for (let pageNo = 1; pageNo <= lastPageToParse; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join(" ");
    pageTexts.push(normalizeSpace(text));
  }

  return { pageTexts, pageCount };
}

export async function parseTrademarkPdf(buffer: Buffer): Promise<ParsedTrademarkPdf> {
  const { pageTexts, pageCount } = await extractTextByPages(buffer);
  const rawText = pageTexts.join("\n");
  const fields = extractFieldsFromRawText(rawText);

  const parsedFields: Record<string, string> = {};
  if (fields.applicationNumber) parsedFields.applicationNumber = fields.applicationNumber;
  if (fields.filingDate) parsedFields.filingDate = fields.filingDate;
  if (fields.publicationDate) parsedFields.publicationDate = fields.publicationDate;
  if (fields.proprietor) parsedFields.proprietor = fields.proprietor;
  if (fields.trademarkClass) parsedFields.trademarkClass = fields.trademarkClass;
  if (fields.goodsServices) parsedFields.goodsServices = fields.goodsServices;
  if (fields.representationNote) parsedFields.representationNote = fields.representationNote;

  return {
    fields,
    parsedFields,
    rawText,
    pageCount,
    extractedPageCount: pageTexts.length,
    pageTexts
  };
}
