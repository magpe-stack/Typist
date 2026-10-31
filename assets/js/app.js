
"use strict";

/* =========================================
   TYPIST — EDITOR DE TEXTO
   Aplicação principal
========================================= */

const STORAGE_KEY = "typist.documents.v1";
const ACTIVE_KEY = "typist.active.v1";
const THEME_KEY = "typist.theme.v1";

const editor = document.getElementById("editor");
const documentTitle = document.getElementById("documentTitle");
const documentList = document.getElementById("documentList");
const saveStatus = document.getElementById("saveStatus");
const fileInput = document.getElementById("fileInput");
const toast = document.getElementById("toast");

const fileMenuBtn = document.getElementById("fileMenuBtn");
const fileMenu = document.getElementById("fileMenu");

let documents = [];
let activeDocumentId = null;
let saveTimer = null;
let toastTimer = null;

/* =========================================
   UTILITÁRIOS
========================================= */

function generateId() {
  return "doc-" + Date.now() + "-" +
    Math.random().toString(36).slice(2, 9);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function escapeXML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;"
  })[char]);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function updateSaveStatus(message) {
  saveStatus.textContent = message;
}

function getActiveDocument() {
  return documents.find(doc => doc.id === activeDocumentId);
}

function getDefaultTitle() {
  return "Documento sem título";
}

/* =========================================
   MENU ARQUIVO
========================================= */

function openFileMenu() {
  fileMenu.hidden = false;
  fileMenuBtn.setAttribute("aria-expanded", "true");
}

function closeFileMenu() {
  fileMenu.hidden = true;
  fileMenuBtn.setAttribute("aria-expanded", "false");
}

function toggleFileMenu() {
  if (fileMenu.hidden) {
    openFileMenu();
  } else {
    closeFileMenu();
  }
}

fileMenuBtn.addEventListener("click", event => {
  event.stopPropagation();
  toggleFileMenu();
});

document.addEventListener("click", event => {
  if (
    !fileMenu.contains(event.target) &&
    !fileMenuBtn.contains(event.target)
  ) {
    closeFileMenu();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeFileMenu();
  }
});

fileMenu.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");

  if (!button) return;

  const action = button.dataset.action;

  closeFileMenu();

  switch (action) {
    case "new":
      createDocument();
      break;

    case "import":
      fileInput.click();
      break;

    case "export-txt":
      exportText();
      break;

    case "export-html":
      exportHTML();
      break;

    case "export-docx":
      exportDOCX();
      break;

    case "print":
      saveImmediately();
      window.print();
      break;
  }
});

/* =========================================
   ARMAZENAMENTO
========================================= */

function loadDocuments() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];

    documents = Array.isArray(parsed)
      ? parsed.filter(doc =>
          doc &&
          typeof doc.id === "string" &&
          typeof doc.title === "string" &&
          typeof doc.content === "string"
        )
      : [];

  } catch (error) {
    console.error("Erro ao carregar documentos:", error);
    documents = [];
    showToast("Não foi possível carregar os documentos.");
  }

  if (documents.length === 0) {
    createDocument(false);
    return;
  }

  const savedActiveId = localStorage.getItem(ACTIVE_KEY);

  activeDocumentId = documents.some(doc => doc.id === savedActiveId)
    ? savedActiveId
    : documents[0].id;

  renderDocuments();
  openDocument(activeDocumentId);
}

function persistDocuments() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    localStorage.setItem(ACTIVE_KEY, activeDocumentId || "");

    updateSaveStatus("Salvo");
    return true;

  } catch (error) {
    console.error("Erro ao salvar:", error);
    updateSaveStatus("Erro ao salvar");
    showToast("Armazenamento insuficiente ou indisponível.");
    return false;
  }
}

function scheduleSave() {
  updateSaveStatus("Salvando...");

  clearTimeout(saveTimer);

  saveTimer = setTimeout(() => {
    const doc = getActiveDocument();

    if (!doc) return;

    doc.title = documentTitle.value.trim() || getDefaultTitle();
    doc.content = editor.innerHTML;
    doc.updatedAt = new Date().toISOString();

    persistDocuments();
    renderDocuments();

  }, 400);
}

function saveImmediately() {
  clearTimeout(saveTimer);

  const doc = getActiveDocument();

  if (!doc) return;

  doc.title = documentTitle.value.trim() || getDefaultTitle();
  doc.content = editor.innerHTML;
  doc.updatedAt = new Date().toISOString();

  persistDocuments();
  renderDocuments();
}

/* =========================================
   DOCUMENTOS
========================================= */

function createDocument(showMessage = true) {
  const doc = {
    id: generateId(),
    title: getDefaultTitle(),
    content: "<p></p>",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  documents.unshift(doc);
  activeDocumentId = doc.id;

  persistDocuments();
  renderDocuments();
  openDocument(doc.id);

  if (showMessage) {
    editor.focus();
    showToast("Novo documento criado.");
  }
}

function openDocument(id) {
  const doc = documents.find(item => item.id === id);

  if (!doc) return;

  activeDocumentId = id;

  documentTitle.value = doc.title;
  editor.innerHTML = doc.content || "<p></p>";

  localStorage.setItem(ACTIVE_KEY, id);

  renderDocuments();
  updateStatistics();
  updateSaveStatus("Salvo");
}

function deleteDocument(id) {
  const doc = documents.find(item => item.id === id);

  if (!doc) return;

  const confirmed = confirm(
    `Deseja excluir o documento "${doc.title}"?`
  );

  if (!confirmed) return;

  clearTimeout(saveTimer);

  documents = documents.filter(item => item.id !== id);

  if (activeDocumentId === id) {
    if (documents.length > 0) {
      activeDocumentId = documents[0].id;
      persistDocuments();
      openDocument(activeDocumentId);
    } else {
      activeDocumentId = null;
      createDocument(false);
    }
  } else {
    persistDocuments();
  }

  renderDocuments();
  showToast("Documento excluído.");
}

function renderDocuments() {
  documentList.innerHTML = "";

  documents.forEach(doc => {
    const item = document.createElement("div");

    item.className = "document-item" +
      (doc.id === activeDocumentId ? " active" : "");

    const icon = document.createElement("span");
    icon.textContent = "▤";
    icon.setAttribute("aria-hidden", "true");

    const title = document.createElement("span");
    title.textContent = doc.title || getDefaultTitle();
    title.title = title.textContent;
    title.style.flex = "1";

    const deleteButton = document.createElement("button");

    deleteButton.type = "button";
    deleteButton.textContent = "×";
    deleteButton.title = "Excluir documento";
    deleteButton.setAttribute(
      "aria-label",
      "Excluir " + title.textContent
    );

    deleteButton.style.border = "0";
    deleteButton.style.background = "transparent";
    deleteButton.style.color = "inherit";
    deleteButton.style.fontSize = "18px";
    deleteButton.style.padding = "0 3px";
    deleteButton.style.cursor = "pointer";
    deleteButton.style.flexShrink = "0";

    item.append(icon, title, deleteButton);

    item.addEventListener("click", () => {
      const current = getActiveDocument();

      if (current) {
        current.title =
          documentTitle.value.trim() || getDefaultTitle();

        current.content = editor.innerHTML;
        current.updatedAt = new Date().toISOString();

        persistDocuments();
      }

      openDocument(doc.id);
    });

    deleteButton.addEventListener("click", event => {
      event.stopPropagation();
      deleteDocument(doc.id);
    });

    documentList.appendChild(item);
  });
}

/* =========================================
   ESTATÍSTICAS
========================================= */

function updateStatistics() {
  const text = editor.innerText || "";
  const trimmed = text.trim();

  const words = trimmed
    ? trimmed.split(/\s+/u).filter(Boolean).length
    : 0;

  const characters = text.length;

  const paragraphs = Array.from(editor.children)
    .filter(element => element.textContent.trim().length > 0)
    .length;

  const lines = text.length === 0
    ? 0
    : text.split(/\n/).length;

  document.getElementById("wordCount").textContent = words;
  document.getElementById("charCount").textContent = characters;
  document.getElementById("paragraphCount").textContent = paragraphs;
  document.getElementById("lineCount").textContent = lines;
}

/* =========================================
   FORMATAÇÃO
========================================= */

function executeCommand(command, value = null) {
  editor.focus();

  try {
    document.execCommand(command, false, value);
  } catch (error) {
    console.error("Comando de formatação:", error);
  }

  scheduleSave();
  updateStatistics();
}

document.querySelectorAll("[data-command]").forEach(button => {
  button.addEventListener("click", () => {
    executeCommand(button.dataset.command);
  });
});

document.getElementById("blockFormat").addEventListener("change", event => {
  executeCommand("formatBlock", event.target.value);
});

document.getElementById("fontFamily").addEventListener("change", event => {
  executeCommand("fontName", event.target.value);
});

document.getElementById("fontSize").addEventListener("change", event => {
  executeCommand("fontSize", event.target.value);
});

document.getElementById("textColor").addEventListener("input", event => {
  executeCommand("foreColor", event.target.value);
});

document.getElementById("highlightColor").addEventListener("input", event => {
  executeCommand("hiliteColor", event.target.value);
});

document.getElementById("clearFormatBtn").addEventListener("click", () => {
  executeCommand("removeFormat");
  showToast("Formatação removida.");
});

document.getElementById("undoBtn").addEventListener("click", () => {
  executeCommand("undo");
});

document.getElementById("redoBtn").addEventListener("click", () => {
  executeCommand("redo");
});

/* =========================================
   EDIÇÃO E SALVAMENTO
========================================= */

editor.addEventListener("input", () => {
  updateStatistics();
  scheduleSave();
});

documentTitle.addEventListener("input", scheduleSave);

documentTitle.addEventListener("blur", () => {
  documentTitle.value =
    documentTitle.value.trim() || getDefaultTitle();

  scheduleSave();
});

document.addEventListener("selectionchange", () => {
  if (!editor.contains(document.getSelection()?.anchorNode)) return;

  document.querySelectorAll("[data-command]").forEach(button => {
    try {
      button.classList.toggle(
        "active",
        document.queryCommandState(button.dataset.command)
      );
    } catch {
      button.classList.remove("active");
    }
  });
});

/* =========================================
   ATALHOS DE TECLADO
========================================= */

document.addEventListener("keydown", event => {
  const modifier = event.ctrlKey || event.metaKey;

  if (!modifier) return;

  const key = event.key.toLowerCase();

  if (key === "s") {
    event.preventDefault();
    saveImmediately();
  }

  if (key === "n" && !event.shiftKey) {
    event.preventDefault();
    closeFileMenu();
    createDocument();
  }
});

/* =========================================
   EXPORTAÇÃO — UTILITÁRIOS
========================================= */

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "documento";
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* =========================================
   EXPORTAÇÃO TXT
========================================= */

function exportText() {
  saveImmediately();

  const doc = getActiveDocument();

  if (!doc) return;

  const text = editor.innerText || "";

  downloadFile(
    slugify(doc.title) + ".txt",
    text,
    "text/plain;charset=utf-8"
  );

  showToast("Arquivo TXT exportado.");
}

/* =========================================
   EXPORTAÇÃO HTML
========================================= */

function exportHTML() {
  saveImmediately();

  const doc = getActiveDocument();

  if (!doc) return;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHTML(doc.title)}</title>
<style>
body {
  max-width: 850px;
  margin: 50px auto;
  padding: 0 25px;
  font-family: Arial, sans-serif;
  font-size: 16px;
  line-height: 1.75;
  color: #252a34;
}
</style>
</head>
<body>
${editor.innerHTML}
</body>
</html>`;

  downloadFile(
    slugify(doc.title) + ".html",
    html,
    "text/html;charset=utf-8"
  );

  showToast("Arquivo HTML exportado.");
}

/* =========================================
   DOCX — CONVERSÃO HTML PARA WORD
========================================= */

function getNodeStyles(element, inherited = {}) {
  const style = { ...inherited };

  if (!element || element.nodeType !== Node.ELEMENT_NODE) {
    return style;
  }

  const css = element.style || {};

  if (element.tagName === "B" || element.tagName === "STRONG") {
    style.bold = true;
  }

  if (element.tagName === "I" || element.tagName === "EM") {
    style.italic = true;
  }

  if (element.tagName === "U") {
    style.underline = true;
  }

  if (element.tagName === "S" || element.tagName === "STRIKE" ||
      element.tagName === "DEL") {
    style.strike = true;
  }

  if (element.tagName === "SUP") {
    style.superscript = true;
  }

  if (element.tagName === "SUB") {
    style.subscript = true;
  }

  if (element.tagName === "FONT" && element.getAttribute("color")) {
    style.color = element.getAttribute("color");
  }

  if (css.fontWeight === "bold" ||
      Number.parseInt(css.fontWeight, 10) >= 600) {
    style.bold = true;
  }

  if (css.fontStyle === "italic") {
    style.italic = true;
  }

  if (css.textDecorationLine.includes("underline") ||
      css.textDecoration.includes("underline")) {
    style.underline = true;
  }

  if (css.textDecorationLine.includes("line-through") ||
      css.textDecoration.includes("line-through")) {
    style.strike = true;
  }

  if (css.color) {
    style.color = css.color;
  }

  if (css.backgroundColor &&
      css.backgroundColor !== "transparent" &&
      css.backgroundColor !== "rgba(0, 0, 0, 0)") {
    style.highlight = css.backgroundColor;
  }

  if (css.fontFamily) {
    style.fontFamily = css.fontFamily;
  }

  if (css.fontSize) {
    style.fontSize = css.fontSize;
  }

  if (element.tagName === "FONT" && element.getAttribute("size")) {
    const fontSizes = {
      1: "10px",
      2: "13px",
      3: "16px",
      4: "18px",
      5: "24px",
      6: "32px",
      7: "48px"
    };

    style.fontSize =
      fontSizes[element.getAttribute("size")] || "16px";
  }

  return style;
}

function normalizeColor(value) {
  if (!value) return null;

  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);

  if (hex) {
    let color = hex[1];

    if (color.length === 3) {
      color = color.split("").map(c => c + c).join("");
    }

    return color.toUpperCase();
  }

  const rgb = value.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i
  );

  if (rgb) {
    return [rgb[1], rgb[2], rgb[3]]
      .map(number =>
        Number(number).toString(16).padStart(2, "0")
      )
      .join("")
      .toUpperCase();
  }

  const named = {
    black: "000000",
    white: "FFFFFF",
    red: "FF0000",
    blue: "0000FF",
    green: "008000",
    yellow: "FFFF00",
    orange: "FFA500",
    purple: "800080",
    gray: "808080",
    grey: "808080"
  };

  return named[value.toLowerCase()] || null;
}

function fontSizeToHalfPoints(value) {
  if (!value) return null;

  let pixels;

  if (value.endsWith("pt")) {
    return Math.max(2, Math.round(parseFloat(value) * 2));
  }

  if (value.endsWith("em")) {
    pixels = parseFloat(value) * 16;
  } else {
    pixels = parseFloat(value);
  }

  if (!Number.isFinite(pixels)) return null;

  return Math.max(2, Math.round(pixels * 1.5));
}

function createRunProperties(style) {
  const properties = [];

  if (style.bold) properties.push("<w:b/>");
  if (style.italic) properties.push("<w:i/>");

  if (style.underline) {
    properties.push('<w:u w:val="single"/>');
  }

  if (style.strike) {
    properties.push("<w:strike/>");
  }

  if (style.superscript) {
    properties.push('<w:vertAlign w:val="superscript"/>');
  }

  if (style.subscript) {
    properties.push('<w:vertAlign w:val="subscript"/>');
  }

  const color = normalizeColor(style.color);

  if (color) {
    properties.push(`<w:color w:val="${color}"/>`);
  }

  const highlight = normalizeColor(style.highlight);

  if (highlight) {
    properties.push(`<w:shd w:val="clear" w:fill="${highlight}"/>`);
  }

  if (style.fontFamily) {
    const family = escapeXML(
      style.fontFamily.split(",")[0].replace(/["']/g, "").trim()
    );

    properties.push(
      `<w:rFonts w:ascii="${family}" w:hAnsi="${family}"/>`
    );
  }

  const fontSize = fontSizeToHalfPoints(style.fontSize);

  if (fontSize) {
    properties.push(
      `<w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/>`
    );
  }

  return properties.length
    ? `<w:rPr>${properties.join("")}</w:rPr>`
    : "";
}

function createWordRun(text, style = {}) {
  if (!text) return "";

  const escaped = escapeXML(text);
  const preserve = /^\s|\s$| {2,}/.test(text)
    ? ' xml:space="preserve"'
    : "";

  return `<w:r>${createRunProperties(style)}<w:t${preserve}>${escaped}</w:t></w:r>`;
}

function convertInlineNodes(node, inheritedStyle = {}) {
  if (node.nodeType === Node.TEXT_NODE) {
    return createWordRun(node.nodeValue || "", inheritedStyle);
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const tag = node.tagName.toLowerCase();
  const style = getNodeStyles(node, inheritedStyle);

  if (tag === "br") {
    return "<w:r><w:br/></w:r>";
  }

  if (tag === "img") {
    return "";
  }

  return Array.from(node.childNodes)
    .map(child => convertInlineNodes(child, style))
    .join("");
}

function getParagraphProperties(element, options = {}) {
  const properties = [];

  const tag = element.tagName.toLowerCase();

  if (tag === "h1") {
    properties.push('<w:pStyle w:val="Heading1"/>');
  } else if (tag === "h2") {
    properties.push('<w:pStyle w:val="Heading2"/>');
  } else if (tag === "h3") {
    properties.push('<w:pStyle w:val="Heading3"/>');
  } else if (tag === "blockquote") {
    properties.push('<w:pStyle w:val="Quote"/>');
  }

  const align =
    element.style.textAlign ||
    element.getAttribute("align") ||
    "";

  const alignments = {
    left: "left",
    center: "center",
    right: "right",
    justify: "both"
  };

  if (alignments[align]) {
    properties.push(
      `<w:jc w:val="${alignments[align]}"/>`
    );
  }

  if (options.listType) {
    const numId = options.listType === "ordered" ? 2 : 1;

    properties.push(
      `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${numId}"/></w:numPr>`
    );
  }

  return properties.length
    ? `<w:pPr>${properties.join("")}</w:pPr>`
    : "";
}

function createWordParagraph(element, options = {}) {
  const properties = getParagraphProperties(element, options);

  const content = Array.from(element.childNodes)
    .map(node => convertInlineNodes(node))
    .join("");

  return `<w:p>${properties}${content || "<w:r><w:t></w:t></w:r>"}</w:p>`;
}

function convertListToWord(listElement, ordered = false) {
  const output = [];

  Array.from(listElement.children).forEach(item => {
    if (item.tagName.toLowerCase() !== "li") return;

    const directNodes = Array.from(item.childNodes)
      .filter(node =>
        node.nodeType === Node.TEXT_NODE ||
        (
          node.nodeType === Node.ELEMENT_NODE &&
          !["ul", "ol"].includes(node.tagName.toLowerCase())
        )
      );

    const content = directNodes
      .map(node => convertInlineNodes(node))
      .join("");

    output.push(
      `<w:p>${getParagraphProperties(
        item,
        { listType: ordered ? "ordered" : "bullet" }
      )}${content || "<w:r><w:t></w:t></w:r>"}</w:p>`
    );

    Array.from(item.children)
      .filter(child =>
        ["UL", "OL"].includes(child.tagName)
      )
      .forEach(nested => {
        output.push(...convertListToWord(
          nested,
          nested.tagName === "OL"
        ));
      });
  });

  return output;
}

function convertBlockToWord(element) {
  const tag = element.tagName.toLowerCase();

  if (tag === "ul") {
    return convertListToWord(element, false);
  }

  if (tag === "ol") {
    return convertListToWord(element, true);
  }

  if (["p", "h1", "h2", "h3", "blockquote"].includes(tag)) {
    return [createWordParagraph(element)];
  }

  if (tag === "div") {
    const children = Array.from(element.children);

    if (children.length === 0) {
      return [createWordParagraph(element)];
    }

    return children.flatMap(convertBlockToWord);
  }

  if (tag === "table") {
    return convertTableToWord(element);
  }

  return [createWordParagraph(element)];
}

function convertTableToWord(table) {
  const rows = Array.from(table.rows);

  const rowXML = rows.map(row => {
    const cells = Array.from(row.cells).map(cell => {
      const paragraphs = Array.from(cell.children)
        .flatMap(convertBlockToWord);

      const content = paragraphs.length
        ? paragraphs.join("")
        : createWordParagraph(cell);

      return `<w:tc><w:tcPr/><w:p/>${content}</w:tc>`;
    }).join("");

    return `<w:tr>${cells}</w:tr>`;
  }).join("");

  return [
    `<w:tbl>
      <w:tblPr>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:color="CCCCCC"/>
          <w:left w:val="single" w:sz="4" w:color="CCCCCC"/>
          <w:bottom w:val="single" w:sz="4" w:color="CCCCCC"/>
          <w:right w:val="single" w:sz="4" w:color="CCCCCC"/>
          <w:insideH w:val="single" w:sz="4" w:color="CCCCCC"/>
          <w:insideV w:val="single" w:sz="4" w:color="CCCCCC"/>
        </w:tblBorders>
      </w:tblPr>
      ${rowXML}
    </w:tbl>`
  ];
}

function createDocumentXML() {
  const body = Array.from(editor.children)
    .flatMap(convertBlockToWord)
    .join("");

  const content = body || "<w:p/>";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
 xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
 <w:body>
  ${content}
  <w:sectPr>
   <w:pgSz w:w="11906" w:h="16838"/>
   <w:pgMar
    w:top="1134"
    w:right="1134"
    w:bottom="1134"
    w:left="1134"
    w:header="708"
    w:footer="708"
    w:gutter="0"/>
  </w:sectPr>
 </w:body>
</w:document>`;
}

/* =========================================
   DOCX — ESTRUTURA DO WORD
========================================= */

function createStylesXML() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">

 <w:docDefaults>
  <w:rPrDefault>
   <w:rPr>
    <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
    <w:sz w:val="24"/>
   </w:rPr>
  </w:rPrDefault>
 </w:docDefaults>

 <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
  <w:name w:val="Normal"/>
  <w:pPr>
   <w:spacing w:after="200" w:line="360" w:lineRule="auto"/>
  </w:pPr>
 </w:style>

 <w:style w:type="paragraph" w:styleId="Heading1">
  <w:name w:val="heading 1"/>
  <w:basedOn w:val="Normal"/>
  <w:next w:val="Normal"/>
  <w:qFormat/>
  <w:rPr>
   <w:b/>
   <w:sz w:val="36"/>
   <w:color w:val="252A34"/>
  </w:rPr>
 </w:style>

 <w:style w:type="paragraph" w:styleId="Heading2">
  <w:name w:val="heading 2"/>
  <w:basedOn w:val="Normal"/>
  <w:next w:val="Normal"/>
  <w:qFormat/>
  <w:rPr>
   <w:b/>
   <w:sz w:val="30"/>
   <w:color w:val="252A34"/>
  </w:rPr>
 </w:style>

 <w:style w:type="paragraph" w:styleId="Heading3">
  <w:name w:val="heading 3"/>
  <w:basedOn w:val="Normal"/>
  <w:next w:val="Normal"/>
  <w:qFormat/>
  <w:rPr>
   <w:b/>
   <w:sz w:val="26"/>
  </w:rPr>
 </w:style>

 <w:style w:type="paragraph" w:styleId="Quote">
  <w:name w:val="Quote"/>
  <w:basedOn w:val="Normal"/>
  <w:pPr>
   <w:ind w:left="360"/>
  </w:pPr>
  <w:rPr>
   <w:i/>
   <w:color w:val="666666"/>
  </w:rPr>
 </w:style>

</w:styles>`;
}

function createNumberingXML() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">

 <w:abstractNum w:abstractNumId="0">
  <w:multiLevelType w:val="singleLevel"/>
  <w:lvl w:ilvl="0">
   <w:start w:val="1"/>
   <w:numFmt w:val="bullet"/>
   <w:lvlText w:val="•"/>
   <w:lvlJc w:val="left"/>
   <w:pPr>
    <w:ind w:left="720" w:hanging="360"/>
   </w:pPr>
   <w:rPr>
    <w:rFonts w:ascii="Symbol" w:hAnsi="Symbol"/>
   </w:rPr>
  </w:lvl>
 </w:abstractNum>

 <w:abstractNum w:abstractNumId="1">
  <w:multiLevelType w:val="singleLevel"/>
  <w:lvl w:ilvl="0">
   <w:start w:val="1"/>
   <w:numFmt w:val="decimal"/>
   <w:lvlText w:val="%1."/>
   <w:lvlJc w:val="left"/>
   <w:pPr>
    <w:ind w:left="720" w:hanging="360"/>
   </w:pPr>
  </w:lvl>
 </w:abstractNum>

 <w:num w:numId="1">
  <w:abstractNumId w:val="0"/>
 </w:num>

 <w:num w:numId="2">
  <w:abstractNumId w:val="1"/>
 </w:num>

</w:numbering>`;
}

function createContentTypesXML() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">

 <Default Extension="rels"
  ContentType="application/vnd.openxmlformats-package.relationships+xml"/>

 <Default Extension="xml" ContentType="application/xml"/>

 <Override PartName="/word/document.xml"
  ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>

 <Override PartName="/word/styles.xml"
  ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>

 <Override PartName="/word/numbering.xml"
  ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>

</Types>`;
}

function createRootRelationshipsXML() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">

 <Relationship
  Id="rId1"
  Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
  Target="word/document.xml"/>

</Relationships>`;
}

function createDocumentRelationshipsXML() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">

 <Relationship
  Id="rId1"
  Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"
  Target="styles.xml"/>

 <Relationship
  Id="rId2"
  Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering"
  Target="numbering.xml"/>

</Relationships>`;
}

/* =========================================
   DOCX — CRIAÇÃO DO ARQUIVO ZIP
   Implementação ZIP sem dependências externas
========================================= */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let n = 0; n < 256; n++) {
    let c = n;

    for (let k = 0; k < 8; k++) {
      c = (c & 1)
        ? 0xEDB88320 ^ (c >>> 1)
        : c >>> 1;
    }

    table[n] = c >>> 0;
  }

  return table;
})();

function calculateCRC32(bytes) {
  let crc = 0xFFFFFFFF;

  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function write16(view, offset, value) {
  view.setUint16(offset, value, true);
}

function write32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}

function createZipFile(files) {
  const encoder = new TextEncoder();

  const localParts = [];
  const centralParts = [];

  let localOffset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);

    const crc = calculateCRC32(data);

    const localHeader = new Uint8Array(30 + name.length);
    const localView = new DataView(localHeader.buffer);

    write32(localView, 0, 0x04034B50);
    write16(localView, 4, 20);
    write16(localView, 6, 0x0800);
    write16(localView, 8, 0);
    write16(localView, 10, 0);
    write16(localView, 12, 0);
    write32(localView, 14, crc);
    write32(localView, 18, data.length);
    write32(localView, 22, data.length);
    write16(localView, 26, name.length);
    write16(localView, 28, 0);

    localHeader.set(name, 30);

    localParts.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + name.length);
    const centralView = new DataView(centralHeader.buffer);

    write32(centralView, 0, 0x02014B50);
    write16(centralView, 4, 20);
    write16(centralView, 6, 20);
    write16(centralView, 8, 0x0800);
    write16(centralView, 10, 0);
    write16(centralView, 12, 0);
    write16(centralView, 14, 0);
    write32(centralView, 16, crc);
    write32(centralView, 20, data.length);
    write32(centralView, 24, data.length);
    write16(centralView, 28, name.length);
    write16(centralView, 30, 0);
    write16(centralView, 32, 0);
    write16(centralView, 34, 0);
    write16(centralView, 36, 0);
    write32(centralView, 38, 0);
    write32(centralView, 42, localOffset);

    centralHeader.set(name, 46);
    centralParts.push(centralHeader);

    localOffset += localHeader.length + data.length;
  }

  const centralSize = centralParts.reduce(
    (total, part) => total + part.length,
    0
  );

  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);

  write32(endView, 0, 0x06054B50);
  write16(endView, 4, 0);
  write16(endView, 6, 0);
  write16(endView, 8, files.length);
  write16(endView, 10, files.length);
  write32(endView, 12, centralSize);
  write32(endView, 16, localOffset);
  write16(endView, 20, 0);

  return new Blob(
    [...localParts, ...centralParts, endRecord],
    { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
  );
}

/* =========================================
   DOCX — EXPORTAÇÃO FINAL
========================================= */

async function exportDOCX() {
  saveImmediately();

  const doc = getActiveDocument();

  if (!doc) return;

  if (!window.TextEncoder || !window.Blob) {
    showToast("Seu navegador não oferece suporte à exportação DOCX.");
    return;
  }

  try {
    const files = [
      {
        name: "[Content_Types].xml",
        content: createContentTypesXML()
      },
      {
        name: "_rels/.rels",
        content: createRootRelationshipsXML()
      },
      {
        name: "word/document.xml",
        content: createDocumentXML()
      },
      {
        name: "word/styles.xml",
        content: createStylesXML()
      },
      {
        name: "word/numbering.xml",
        content: createNumberingXML()
      },
      {
        name: "word/_rels/document.xml.rels",
        content: createDocumentRelationshipsXML()
      }
    ];

    const blob = createZipFile(files);

    const filename = slugify(doc.title) + ".docx";
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 2000);

    showToast("Documento Word exportado com sucesso.");

  } catch (error) {
    console.error("Erro ao gerar DOCX:", error);
    showToast("Não foi possível gerar o documento Word.");
  }
}

/* =========================================
   IMPORTAÇÃO TXT E HTML
========================================= */

fileInput.addEventListener("change", async event => {
  const file = event.target.files?.[0];

  if (!file) return;

  try {
    const content = await file.text();
    let html = "";

    if (/\.txt$/i.test(file.name)) {
      html = content
        .split(/\r?\n/)
        .map(line => `<p>${escapeHTML(line) || "<br>"}</p>`)
        .join("");

    } else {
      const parser = new DOMParser();
      const parsed = parser.parseFromString(content, "text/html");

      parsed.querySelectorAll(
        "script, style, iframe, object, embed, form, link, meta, base"
      ).forEach(element => element.remove());

      parsed.querySelectorAll("*").forEach(element => {
        Array.from(element.attributes).forEach(attribute => {
          const name = attribute.name.toLowerCase();
          const value = attribute.value.trim();

          if (
            name.startsWith("on") ||
            name === "srcdoc" ||
            (
              ["href", "src", "xlink:href"].includes(name) &&
              /^\s*(javascript|vbscript|data):/i.test(value)
            )
          ) {
            element.removeAttribute(attribute.name);
          }
        });
      });

      html = parsed.body.innerHTML || "<p></p>";
    }

    const doc = {
      id: generateId(),
      title: file.name.replace(/\.(txt|html?)$/i, "") || getDefaultTitle(),
      content: html || "<p></p>",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    documents.unshift(doc);
    activeDocumentId = doc.id;

    if (persistDocuments()) {
      renderDocuments();
      openDocument(doc.id);
      showToast("Documento importado.");
    } else {
      documents = documents.filter(item => item.id !== doc.id);
      activeDocumentId = documents[0]?.id || null;
      renderDocuments();

      if (activeDocumentId) {
        openDocument(activeDocumentId);
      }
    }

  } catch (error) {
    console.error("Erro na importação:", error);
    showToast("Não foi possível importar o arquivo.");
  }

  fileInput.value = "";
});

/* =========================================
   TEMA
========================================= */

function applyTheme(theme) {
  const dark = theme === "dark";

  document.body.classList.toggle("dark", dark);

  document.documentElement.style.colorScheme =
    dark ? "dark" : "light";

  document.querySelector('meta[name="theme-color"]')
    .setAttribute("content", dark ? "#20242d" : "#f5f6f8");

  localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
}

document.getElementById("themeBtn").addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("dark")
    ? "light"
    : "dark";

  applyTheme(nextTheme);
});

/* =========================================
   SERVICE WORKER
========================================= */

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .catch(error => {
        console.error("Erro ao registrar Service Worker:", error);
      });
  });
}

/* =========================================
   INICIALIZAÇÃO
========================================= */

applyTheme(localStorage.getItem(THEME_KEY) || "light");

loadDocuments();
