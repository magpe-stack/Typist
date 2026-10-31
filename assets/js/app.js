
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

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
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
    deleteButton.setAttribute("aria-label", "Excluir " + title.textContent);
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
        current.title = documentTitle.value.trim() || getDefaultTitle();
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
  documentTitle.value = documentTitle.value.trim() || getDefaultTitle();
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
    createDocument();
  }
});

function saveImmediately() {
  clearTimeout(saveTimer);

  const doc = getActiveDocument();

  if (!doc) return;

  doc.title = documentTitle.value.trim() || getDefaultTitle();
  doc.content = editor.innerHTML;
  doc.updatedAt = new Date().toISOString();

  persistDocuments();
  renderDocuments();
  showToast("Documento salvo.");
}

/* =========================================
   EXPORTAÇÃO
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

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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

document.getElementById("exportTxtBtn")
  .addEventListener("click", exportText);

document.getElementById("exportHtmlBtn")
  .addEventListener("click", exportHTML);

document.getElementById("printBtn")
  .addEventListener("click", () => {
    saveImmediately();
    window.print();
  });

/* =========================================
   IMPORTAÇÃO
========================================= */

document.getElementById("importBtn")
  .addEventListener("click", () => fileInput.click());

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
      renderDocuments();
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

document.getElementById("newDocumentBtn")
  .addEventListener("click", () => createDocument());

document.getElementById("sidebarNewBtn")
  .addEventListener("click", () => createDocument());

/* =========================================
   SERVICE WORKER
========================================= */

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .catch(error => {
        console.error("Erro ao registrar o Service Worker:", error);
      });
  });
}

/* =========================================
   INICIALIZAÇÃO
========================================= */

applyTheme(localStorage.getItem(THEME_KEY) || "light");
loadDocuments();
