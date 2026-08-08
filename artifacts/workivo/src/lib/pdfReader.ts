import {
  getDocument,
  GlobalWorkerOptions,
} from "pdfjs-dist/legacy/build/pdf.mjs";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();

  const pdf = await getDocument({
    data: new Uint8Array(buffer),
  }).promise;

  let text = "";

  for (let page = 1; page <= pdf.numPages; page++) {
    const pageData = await pdf.getPage(page);
    const content = await pageData.getTextContent();

    const pageText = content.items
      .map((item: any) => item.str || "")
      .join(" ");

    text += pageText + "\n";
  }

  return text.trim();
}
