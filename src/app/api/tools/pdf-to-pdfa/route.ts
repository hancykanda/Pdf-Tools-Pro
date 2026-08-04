import { NextRequest } from 'next/server';
import { PDFDocument, PDFName } from 'pdf-lib';
import { base64ToBytes, bytesToBase64 } from '@/lib/pdfUtils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file } = body;

    if (!file) {
      return Response.json({ error: 'PDF file is required' }, { status: 400 });
    }

    const bytes = base64ToBytes(file);
    const pdfDoc = await PDFDocument.load(bytes);

    pdfDoc.setTitle(pdfDoc.getTitle() || 'PDF/A Document');
    pdfDoc.setAuthor(pdfDoc.getAuthor() || 'pdf-tools');
    pdfDoc.setSubject(pdfDoc.getSubject() || 'PDF/A-1b Archival Document');
    pdfDoc.setKeywords(['PDF/A', 'archival', '1b']);
    pdfDoc.setCreator(pdfDoc.getCreator() || 'pdf-tools PDF to PDF/A');
    pdfDoc.setProducer('pdf-tools PDF to PDF/A Converter');
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());

    pdfDoc.catalog.set(
      PDFName.of('MarkInfo'),
      pdfDoc.context.obj({
        Type: PDFName.of('MarkInfo'),
        Marked: true,
      })
    );

    const xmp = buildPdfaXmp(pdfDoc);
    const xmpRef = pdfDoc.context.register(
      pdfDoc.context.stream(xmp, {
        Type: PDFName.of('Metadata'),
        Subtype: PDFName.of('XML'),
      })
    );
    pdfDoc.catalog.set(PDFName.of('Metadata'), xmpRef);

    const out = await pdfDoc.save();
    const dataUrl = bytesToBase64(out);

    return Response.json({ dataUrl, filename: 'document.pdfa.pdf', pageCount: pdfDoc.getPageCount() });
  } catch (error) {
    console.error('PDF to PDF/A error:', error);
    return Response.json({ error: 'Failed to convert PDF to PDF/A' }, { status: 500 });
  }
}

function buildPdfaXmp(pdfDoc: PDFDocument): string {
  const now = new Date().toISOString();
  const title = escapeXml(pdfDoc.getTitle() || 'PDF/A Document');
  const creator = escapeXml(pdfDoc.getCreator() || 'pdf-tools');
  const bom = String.fromCharCode(0xfeff);

  return `${bom}<?xpacket begin="${bom}" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="pdf-tools PDF to PDF/A">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/">
   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${title}</rdf:li></rdf:Alt></dc:title>
   <dc:creator><rdf:Seq><rdf:li>${creator}</rdf:li></rdf:Seq></dc:creator>
   <dc:subject><rdf:Bag><rdf:li>PDF/A</rdf:li><rdf:li>archival</rdf:li><rdf:li>1b</rdf:li></rdf:Bag></dc:subject>
   <xmp:CreateDate>${now}</xmp:CreateDate>
   <xmp:ModifyDate>${now}</xmp:ModifyDate>
   <xmp:MetadataDate>${now}</xmp:MetadataDate>
   <pdfaid:pdfaVersion>PDF/A-1</pdfaid:pdfaVersion>
   <pdfaid:pdfaLevel>b</pdfaid:pdfaLevel>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
