export async function parsePdf(file: File): Promise<string> {
  // 동적 임포트 — 클라이언트 전용
  const pdfjsLib = await import('pdfjs-dist');

  // 워커 설정 (로컬 파일 사용)
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    let lastY: number | null = null;
    const lines: string[] = [];
    let currentLine = '';

    for (const item of textContent.items) {
      if (!('str' in item)) continue;
      const y = Math.round((item as { transform: number[] }).transform[5]);

      if (lastY !== null && Math.abs(y - lastY) > 5) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = item.str;
      } else {
        currentLine += item.str;
      }
      lastY = y;
    }
    if (currentLine.trim()) lines.push(currentLine.trim());

    const pageText = lines.join('\n').trim();
    if (pageText) pages.push(pageText);
  }

  if (pages.length === 0) throw new Error('PDF에서 텍스트를 추출할 수 없습니다 (스캔 이미지 PDF는 미지원)');

  return pages.join('\n\n');
}
