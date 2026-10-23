/**
 * A Word document (.docx), built by hand: the handful of XML parts Word
 * needs, zipped. Enough for a thesis and a reference list — headings,
 * paragraphs, bullets, italics, page breaks, a contents field and page
 * numbers — in Times New Roman 12 pt at 1.5 line spacing on A4, with a
 * 1.5-inch left margin for binding (the common Indian university format).
 *
 * Kannada, Hindi and other Indian scripts are Word's "complex script" text;
 * they are set in Nirmala UI, which Windows and Word ship with.
 */
const { zip } = require('./zip');

// Inside <w:pPr> and <w:rPr> Word wants the elements in the schema's order
// (spacing before ind before jc; b before i before color before sz) and calls
// the file damaged otherwise — the builders below keep that order.
// XML 1.0 refuses most control characters; a stray one pasted from a PDF
// would make Word call the whole file corrupt.
const xml = (s) => String(s ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A run of text: { text, bold, italic, size (pt), color }. Line breaks inside become <w:br/>. */
const run = (r) => {
    const o = typeof r === 'string' ? { text: r } : r;
    const props = [
        o.bold ? '<w:b/><w:bCs/>' : '',
        o.italic ? '<w:i/><w:iCs/>' : '',
        o.color ? `<w:color w:val="${o.color}"/>` : '',
        o.size ? `<w:sz w:val="${Math.round(o.size * 2)}"/><w:szCs w:val="${Math.round(o.size * 2)}"/>` : ''
    ].join('');
    const parts = String(o.text ?? '').split('\n').map((t) => `<w:t xml:space="preserve">${xml(t)}</w:t>`);
    return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}${parts.join('<w:br/>')}</w:r>`;
};

/**
 * A paragraph. `runs` is a string or a list of runs; options: style
 * ('Title', 'Heading1', 'Heading2', 'ListBullet', 'Subtle'…), align
 * ('center', 'both', 'left', 'right'), pageBreakBefore, keepNext,
 * hanging (twips, for a reference list), spaceAfter (twips).
 */
const paragraph = (runs, o = {}) => {
    const list = Array.isArray(runs) ? runs : [runs];
    const props = [
        o.style ? `<w:pStyle w:val="${o.style}"/>` : '',
        o.keepNext ? '<w:keepNext/>' : '',
        o.pageBreakBefore ? '<w:pageBreakBefore/>' : '',
        o.style === 'ListBullet' ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>' : '',
        o.spaceAfter !== undefined || o.spaceBefore !== undefined ? `<w:spacing${o.spaceBefore !== undefined ? ` w:before="${o.spaceBefore}"` : ''}${o.spaceAfter !== undefined ? ` w:after="${o.spaceAfter}"` : ''}/>` : '',
        o.hanging ? `<w:ind w:left="${o.hanging}" w:hanging="${o.hanging}"/>` : '',
        o.align ? `<w:jc w:val="${o.align}"/>` : ''
    ].join('');
    return `<w:p>${props ? `<w:pPr>${props}</w:pPr>` : ''}${list.map(run).join('')}</w:p>`;
};

const pageBreak = () => '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

/**
 * A table of contents Word fills in: right-click → Update Field adds the
 * page numbers. Until then it shows `entries` (the chapter titles).
 */
const contentsField = (entries) => {
    const lines = entries.length ? entries : [''];
    return lines.map((text, i) => {
        const begin = i === 0 ? '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-2" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>' : '';
        const end = i === lines.length - 1 ? '<w:r><w:fldChar w:fldCharType="end"/></w:r>' : '';
        return `<w:p><w:pPr><w:pStyle w:val="TOC1"/></w:pPr>${begin}${run(text)}${end}</w:p>`;
    }).join('');
};

const FONT = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Nirmala UI"/>';

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr>${FONT}<w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-IN"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="360" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="1200" w:after="480" w:line="276" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="40"/><w:szCs w:val="40"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="360"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="80"/><w:ind w:left="720" w:hanging="360"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtle"><w:name w:val="Subtle"/><w:basedOn w:val="Normal"/><w:rPr><w:i/><w:iCs/><w:color w:val="4B5563"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="TOC1"><w:name w:val="toc 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="8306"/></w:tabs><w:spacing w:after="100"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="TOC2"><w:name w:val="toc 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="8306"/></w:tabs><w:spacing w:after="80"/><w:ind w:left="440"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/><w:jc w:val="center"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>
</w:styles>`;

const NUMBERING = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`;

const FOOTER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:pStyle w:val="Footer"/></w:pPr><w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>`;

/**
 * The document: { title, author, body: [paragraph XML], pageNumbers,
 * firstPageNumbered }. Resolves to a Buffer ready to send as a .docx.
 */
const buildDocx = ({ title = '', author = '', body = [], pageNumbers = true, firstPageNumbered = false }) => {
    const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    const section = `<w:sectPr>${pageNumbers ? '<w:footerReference w:type="default" r:id="rIdFooter"/>' : ''}<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="2160" w:header="720" w:footer="720" w:gutter="0"/>${pageNumbers && !firstPageNumbered ? '<w:titlePg/>' : ''}</w:sectPr>`;
    const files = [
        { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>` },
        { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>` },
        { name: 'docProps/core.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${xml(title)}</dc:title><dc:creator>${xml(author)}</dc:creator>
<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>` },
        { name: 'word/_rels/document.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
<Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>` },
        { name: 'word/styles.xml', data: STYLES },
        { name: 'word/numbering.xml', data: NUMBERING },
        { name: 'word/footer1.xml', data: FOOTER },
        { name: 'word/document.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body.join('')}${section}</w:body></w:document>` }
    ];
    return zip(files);
};

module.exports = { buildDocx, paragraph, run, pageBreak, contentsField, xml };
