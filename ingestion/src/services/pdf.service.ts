import { PDFParse } from "pdf-parse";

export interface ParsedPdf {
  text: string;
  numPages: number;
}

export async function parsePdf(base64Data: string): Promise<ParsedPdf> {
  console.log(`[PDF] Parsing base64 data (${base64Data.length} chars)`);

  const buffer = Buffer.from(base64Data, "base64");
  console.log(`[PDF] Buffer size: ${buffer.length} bytes`);

  const parser = new PDFParse({ data: buffer });
  const info = await parser.getInfo();
  console.log(`[PDF] Loaded: ${info.total} pages`);

  const textResult = await parser.getText();
  console.log(`[PDF] Extracted ${textResult.text.length} characters`);

  return {
    text: textResult.text.trim(),
    numPages: info.total,
  };
}
