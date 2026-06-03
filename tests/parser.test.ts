import { describe, expect, it } from "vitest";
import { extractFieldsFromRawText } from "@/lib/pdf-parse-trademark";

describe("trademark parser field extraction", () => {
  it("extracts key labels from normalized text", () => {
    const text = `
      Application Number: 2026/20052
      Filing Date: 2026-06-02
      Publication Date: 2026-06-03
      Proprietor: ACME BRANDS (PTY) LTD
      Class: 25
      Goods and Services: Clothing, footwear, headgear.
      Representation of Trade Mark: Word mark ACME.
    `;

    const fields = extractFieldsFromRawText(text);
    expect(fields.applicationNumber).toBe("2026/20052");
    expect(fields.filingDate).toBe("2026-06-02");
    expect(fields.publicationDate).toBe("2026-06-03");
    expect(fields.proprietor).toContain("ACME BRANDS");
    expect(fields.trademarkClass).toBe("25");
    expect(fields.goodsServices).toContain("Clothing");
    expect(fields.representationNote).toContain("Word mark");
  });
});
