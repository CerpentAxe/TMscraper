import { getSupabaseAdmin, storageBucket } from "@/lib/supabase";
import type { ImageExtractionResult, ParsedTrademarkRecord } from "@/lib/types";

const STATE_ID = "trademarks_daily";

export type IngestionState = {
  lastTmNumber: string | null;
  lastStatus: string;
  lastSummary: Record<string, unknown>;
};

export async function getIngestionState(): Promise<IngestionState> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ingestion_state")
    .select("last_tm_number,last_status,last_summary")
    .eq("id", STATE_ID)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    await supabase.from("ingestion_state").insert({ id: STATE_ID, last_status: "initialized" });
    return { lastTmNumber: null, lastStatus: "initialized", lastSummary: {} };
  }

  return {
    lastTmNumber: data.last_tm_number,
    lastStatus: data.last_status,
    lastSummary: (data.last_summary || {}) as Record<string, unknown>
  };
}

export async function markRunStarted(startFrom: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("ingestion_state").upsert(
    {
      id: STATE_ID,
      last_status: "running",
      last_run_started_at: new Date().toISOString(),
      last_summary: { startFrom }
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}

export async function markRunFinished(payload: { lastTmNumber: string | null; status: string; summary: Record<string, unknown> }) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("ingestion_state").upsert(
    {
      id: STATE_ID,
      last_tm_number: payload.lastTmNumber,
      last_status: payload.status,
      last_run_finished_at: new Date().toISOString(),
      last_summary: payload.summary
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}

export async function upsertTrademark(record: ParsedTrademarkRecord): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("trademarks")
    .upsert(
      {
        tm_number: record.tmNumber,
        year: record.year,
        sequence: record.sequence,
        application_number: record.applicationNumber,
        filing_date: record.filingDate,
        publication_date: record.publicationDate,
        proprietor: record.proprietor,
        trademark_class: record.trademarkClass,
        goods_services: record.goodsServices,
        representation_note: record.representationNote,
        pdf_url: record.pdfUrl,
        pdf_sha256: record.pdfSha256,
        parsed_fields: record.parsedFields,
        raw_text: record.rawText
      },
      { onConflict: "tm_number" }
    )
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function uploadTrademarkImage(tmNumber: string, image: ImageExtractionResult): Promise<string> {
  const supabase = getSupabaseAdmin();
  const ext = image.mimeType === "image/jpeg" ? "jpg" : "png";
  const timestamp = Date.now();
  const path = `${tmNumber.replace("/", "_")}/${timestamp}_p${image.sourcePage}.${ext}`;

  const { error } = await supabase.storage.from(storageBucket).upload(path, image.data, {
    contentType: image.mimeType,
    upsert: true
  });
  if (error) throw error;

  return path;
}

export async function upsertTrademarkImageRow(trademarkId: string, image: ImageExtractionResult, storagePath: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("trademark_images").upsert(
    {
      trademark_id: trademarkId,
      storage_bucket: storageBucket,
      storage_path: storagePath,
      mime_type: image.mimeType,
      width: image.width ?? null,
      height: image.height ?? null,
      byte_size: image.data.length,
      source_page: image.sourcePage
    },
    { onConflict: "storage_bucket,storage_path" }
  );
  if (error) throw error;
}
