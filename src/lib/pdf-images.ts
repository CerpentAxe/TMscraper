import { PNG } from "pngjs";
import type { ImageExtractionResult } from "@/lib/types";

type PdfImageData = {
  width: number;
  height: number;
  kind: number;
  data: Uint8ClampedArray | Uint8Array;
};

function toPngBuffer(image: PdfImageData): Buffer | null {
  const { width, height, data } = image;
  if (!width || !height || !data?.length) {
    return null;
  }

  const pixelCount = width * height;
  const expectedRgbaLength = pixelCount * 4;
  const rgba = Buffer.alloc(expectedRgbaLength);

  if (data.length === expectedRgbaLength) {
    Buffer.from(data).copy(rgba);
  } else if (data.length === pixelCount * 3) {
    for (let src = 0, dst = 0; src < data.length; src += 3, dst += 4) {
      rgba[dst] = data[src];
      rgba[dst + 1] = data[src + 1];
      rgba[dst + 2] = data[src + 2];
      rgba[dst + 3] = 255;
    }
  } else if (data.length === pixelCount) {
    for (let src = 0, dst = 0; src < data.length; src += 1, dst += 4) {
      const value = data[src];
      rgba[dst] = value;
      rgba[dst + 1] = value;
      rgba[dst + 2] = value;
      rgba[dst + 3] = 255;
    }
  } else {
    return null;
  }

  const png = new PNG({ width, height });
  png.data = rgba;
  return PNG.sync.write(png);
}

async function getImageFromObj(page: any, objId: string): Promise<PdfImageData | null> {
  return await new Promise((resolve) => {
    try {
      page.objs.get(objId, (obj: PdfImageData) => resolve(obj ?? null));
    } catch {
      resolve(null);
    }
  });
}

export async function extractRepresentationImages(buffer: Buffer, pageCount: number): Promise<ImageExtractionResult[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  const ops = pdfjs.OPS;
  const imageOps = new Set([ops.paintImageXObject, ops.paintInlineImageXObject, ops.paintImageMaskXObject]);
  const results: ImageExtractionResult[] = [];
  const lastPageToInspect = Math.max(pageCount - 1, 1);

  for (let pageNo = 1; pageNo <= lastPageToInspect; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const operatorList = await page.getOperatorList();

    for (let i = 0; i < operatorList.fnArray.length; i += 1) {
      const op = operatorList.fnArray[i];
      if (!imageOps.has(op)) continue;

      const args = operatorList.argsArray[i];
      let imageData: PdfImageData | null = null;

      if (op === ops.paintImageXObject && typeof args?.[0] === "string") {
        imageData = await getImageFromObj(page, args[0]);
      } else if (args?.[0] && typeof args[0] === "object") {
        imageData = args[0] as PdfImageData;
      }

      if (!imageData || imageData.width < 40 || imageData.height < 40) {
        continue;
      }

      const pngBuffer = toPngBuffer(imageData);
      if (!pngBuffer) continue;

      results.push({
        data: pngBuffer,
        mimeType: "image/png",
        width: imageData.width,
        height: imageData.height,
        sourcePage: pageNo
      });
    }
  }

  return results;
}
