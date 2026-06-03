import { describe, expect, it } from "vitest";
import {
  formatTrademarkNumber,
  incrementTrademarkNumber,
  parseTrademarkNumber,
  toCipcPdfPathSegment
} from "@/lib/trademark-number";

describe("trademark number helpers", () => {
  it("parses and formats yyyy/number values", () => {
    const parsed = parseTrademarkNumber("2026/20052");
    expect(parsed).toEqual({ year: 2026, sequence: 20052 });
    expect(formatTrademarkNumber(parsed)).toBe("2026/20052");
  });

  it("builds cipc path segment correctly", () => {
    const segment = toCipcPdfPathSegment({ year: 2026, sequence: 20052 });
    expect(segment).toBe("tm202620052");
  });

  it("increments the sequence", () => {
    expect(incrementTrademarkNumber({ year: 2026, sequence: 20052 })).toEqual({
      year: 2026,
      sequence: 20053
    });
  });
});
