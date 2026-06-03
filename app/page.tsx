import ManualRunForm from "./manual-run-form";

export default function HomePage() {
  return (
    <main style={{ display: "grid", gap: 12 }}>
      <h1>South Africa Trademark Scraper</h1>
      <p>
        Daily cron runs automatically on Vercel. Use this page to manually trigger ingestion with an optional
        start-number override.
      </p>
      <ManualRunForm />
    </main>
  );
}
