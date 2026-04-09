import JSZip from 'jszip';

export async function parseEpub(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);

  // 1. container.xml에서 OPF 경로 찾기
  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) throw new Error('EPUB 파일이 손상되었습니다 (container.xml 없음)');

  const opfPath = containerXml.match(/full-path="([^"]+\.opf)"/)?.[1];
  if (!opfPath) throw new Error('EPUB 파일이 손상되었습니다 (OPF 경로 없음)');

  // 2. OPF 파일 파싱
  const opfContent = await zip.file(opfPath)?.async('text');
  if (!opfContent) throw new Error('EPUB 파일이 손상되었습니다 (OPF 없음)');

  const parser = new DOMParser();
  const opfDoc = parser.parseFromString(opfContent, 'application/xml');
  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  // 3. manifest에서 id → href 매핑
  const manifest: Record<string, string> = {};
  opfDoc.querySelectorAll('manifest item').forEach((item) => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href) manifest[id] = href;
  });

  // 4. spine 순서로 읽기 순서 결정
  const spineIds = Array.from(opfDoc.querySelectorAll('spine itemref'))
    .map((ref) => ref.getAttribute('idref'))
    .filter((id): id is string => !!id);

  // 5. 각 챕터 HTML에서 텍스트 추출
  const chapters: string[] = [];

  for (const idref of spineIds) {
    const href = manifest[idref];
    if (!href) continue;

    // href에 쿼리스트링/앵커 제거
    const cleanHref = href.split('#')[0].split('?')[0];
    const fullPath = opfDir + cleanHref;

    const htmlContent = await zip.file(fullPath)?.async('text');
    if (!htmlContent) continue;

    const doc = parser.parseFromString(htmlContent, 'text/html');

    // 불필요한 태그 제거
    doc.querySelectorAll('script, style, nav, aside').forEach((el) => el.remove());

    const body = doc.body;
    if (!body) continue;

    // 줄바꿈이 의미있게 처리되도록 블록 요소에 개행 추가
    body.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, br').forEach((el) => {
      el.after(document.createTextNode('\n'));
    });

    const text = (body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim();
    if (text) chapters.push(text);
  }

  if (chapters.length === 0) throw new Error('EPUB에서 텍스트를 추출할 수 없습니다');

  return chapters.join('\n\n');
}
