export type TrademarkNumber = {
  year: number;
  sequence: number;
};

const TM_PATTERN = /^(\d{4})\/(\d{1,6})$/;

export function parseTrademarkNumber(value: string): TrademarkNumber {
  const match = TM_PATTERN.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid trademark number format: ${value}`);
  }

  return {
    year: Number(match[1]),
    sequence: Number(match[2])
  };
}

export function formatTrademarkNumber(tm: TrademarkNumber): string {
  return `${tm.year}/${tm.sequence}`;
}

export function toCipcPdfPathSegment(tm: TrademarkNumber): string {
  return `tm${tm.year}${tm.sequence}`;
}

export function incrementTrademarkNumber(tm: TrademarkNumber): TrademarkNumber {
  return {
    year: tm.year,
    sequence: tm.sequence + 1
  };
}
