"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  WISEMIND_ICON_ID: () => WISEMIND_ICON_ID,
  WISEMIND_OBSIDIAN_ICON: () => WISEMIND_OBSIDIAN_ICON,
  WISEMIND_VIEW_TYPE: () => WISEMIND_VIEW_TYPE,
  default: () => WiseMindObsidianPlugin2
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// assets/icons/wisemindai-logo.svg
var wisemindai_logo_default = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" aria-hidden="true">\n  <path fill="currentColor" d="M40 205h145c45 0 86 29 100 72l177 533c9 26 3 55-15 76l-93 109L40 205Z"/>\n  <path fill="currentColor" d="M398 200h151c47 0 89 31 102 76l178 535c8 25 2 53-15 73l-92 109L398 200Z"/>\n  <path fill="currentColor" d="M756 216c92-24 179 5 219 73 47 80 17 183-83 316L756 216Z"/>\n</svg>\n';

// src/markers.ts
var OBSIDIAN_MARKER_RE = /<!--\s*wisemind:source=obsidian\s+path="([^"]+)"\s+hash="([^"]+)"\s*-->/;
var WISEMIND_MARKER_RE = /<!--\s*wisemind:source=wisemind\s+type="([^"]+)"\s+id="([^"]+)"\s+hash="([^"]+)"\s*-->/;
var createObsidianSourceMarker = (item) => `<!-- wisemind:source=obsidian path="${escapeAttr(item.path)}" hash="${escapeAttr(item.contentHash)}" -->`;
var createWiseMindSourceMarker = (item) => `<!-- wisemind:source=wisemind type="${escapeAttr(item.sourceType)}" id="${escapeAttr(String(item.id))}" hash="${escapeAttr(item.contentHash)}" -->`;
var appendMarker = (markdown, marker) => {
  const cleaned = stripSourceMarkers(markdown).trimEnd();
  return `${cleaned}

${marker}`;
};
var stripSourceMarkers = (markdown) => markdown.replace(OBSIDIAN_MARKER_RE, "").replace(WISEMIND_MARKER_RE, "").trimEnd();
var findSourceMarker = (markdown) => {
  const obsidian = markdown.match(OBSIDIAN_MARKER_RE);
  if (obsidian) {
    return { source: "obsidian", path: unescapeAttr(obsidian[1]), hash: unescapeAttr(obsidian[2]) };
  }
  const wisemind = markdown.match(WISEMIND_MARKER_RE);
  if (wisemind) {
    return {
      source: "wisemind",
      type: unescapeAttr(wisemind[1]),
      id: unescapeAttr(wisemind[2]),
      hash: unescapeAttr(wisemind[3])
    };
  }
  return null;
};
var escapeAttr = (value) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
var unescapeAttr = (value) => value.replace(/&quot;/g, '"').replace(/&amp;/g, "&");

// src/importRunner.ts
var runObsidianToWiseMindImport = async (options) => {
  const result = emptyResult();
  const folderCache = /* @__PURE__ */ new Map();
  const knowledgeBaseCache = /* @__PURE__ */ new Map();
  const noteFolderRoots = options.noteFolderPaths?.length ? options.noteFolderPaths : [""];
  const documentFolderRoots = options.documentFolderPaths?.length ? options.documentFolderPaths : [""];
  const knowledgeBaseNames = options.knowledgeBaseNames?.length ? options.knowledgeBaseNames : [options.knowledgeBaseName || "Obsidian \u5BFC\u5165"];
  for (let index = 0; index < options.items.length; index += options.chunkSize || 10) {
    if (options.signal?.aborted)
      break;
    const chunk = options.items.slice(index, index + (options.chunkSize || 10));
    for (const item of chunk) {
      if (options.signal?.aborted)
        break;
      const marker = createObsidianSourceMarker(item);
      const markdown = appendMarker(item.markdown, marker);
      const sourcePath = item.absolutePath || item.path;
      try {
        if (options.targets.notes) {
          for (const rootPath of noteFolderRoots) {
            const folderId = await resolvePathFolder(
              rootPath,
              folderCache,
              options.api.resolveNoteFolder.bind(options.api)
            );
            const payload = {
              title: item.title,
              md: markdown,
              text: item.plainText,
              content: "",
              tags: item.tags,
              from_folder: normalizeRemoteId(folderId)
            };
            const existing = options.duplicatePolicy === "update" ? await findExistingNote(options.api, item.title, normalizeRemoteId(folderId)) : null;
            if (existing) {
              await options.api.updateNote(existing.id, payload);
              push(result, item.title, item.path, "updated", `\u5DF2\u8986\u76D6 WiseMindAI \u7B14\u8BB0${rootPath ? `\uFF1A${rootPath}` : ""}`);
            } else {
              await options.api.createNote(payload);
              push(result, item.title, item.path, "created", `\u5DF2\u5BFC\u5165\u4E3A WiseMindAI \u7B14\u8BB0${rootPath ? `\uFF1A${rootPath}` : ""}`);
            }
          }
        }
        if (options.targets.documents) {
          for (const rootPath of documentFolderRoots) {
            const folderId = await resolvePathFolder(
              rootPath,
              folderCache,
              options.api.resolveFileFolder.bind(options.api)
            );
            const folder = normalizeRemoteId(folderId);
            const payload = {
              name: item.title,
              type: "md",
              fileType: "md",
              filePath: sourcePath,
              content: markdown,
              note: `Imported from Obsidian: ${item.path}`,
              tags: item.tags,
              from_folder: folder
            };
            const existing = options.duplicatePolicy === "update" ? await findExistingDocument(options.api, item.title, folder) : null;
            if (existing) {
              await options.api.updateDocument(existing.id, payload);
              push(result, item.title, item.path, "updated", `\u5DF2\u8986\u76D6 WiseMindAI \u6587\u6863${rootPath ? `\uFF1A${rootPath}` : ""}`);
            } else {
              await options.api.createDocument(payload);
              push(result, item.title, item.path, "created", `\u5DF2\u5BFC\u5165\u4E3A WiseMindAI \u6587\u6863${rootPath ? `\uFF1A${rootPath}` : ""}`);
            }
          }
        }
        if (options.targets.knowledge) {
          for (const baseName of knowledgeBaseNames) {
            if (!knowledgeBaseCache.has(baseName)) {
              const base = await options.api.resolveKnowledgeBase(baseName, {
                icon: "\u{1F4DA}",
                desc: "\u4ECE Obsidian \u5BFC\u5165\u7684\u5185\u5BB9"
              });
              knowledgeBaseCache.set(baseName, base?.id ?? null);
            }
            const knowledgeBaseId = knowledgeBaseCache.get(baseName);
            const baseId = normalizeRemoteId(knowledgeBaseId);
            const payload = {
              knowledgeBaseId: normalizeRemoteId(knowledgeBaseId),
              title: item.title,
              content: markdown,
              summary: `Imported from Obsidian: ${item.path}`,
              fileUrl: sourcePath,
              fileType: "md",
              fileExt: "md",
              type: "input",
              sourceId: 0,
              size: item.size,
              loadingStatus: 0,
              embeddingStatus: 0
            };
            const existing = options.duplicatePolicy === "update" ? await findExistingKnowledgeDocument(options.api, item.title, baseId) : null;
            if (existing) {
              await options.api.updateKnowledgeDocument(existing.id, payload);
              push(result, item.title, item.path, "updated", `\u5DF2\u8986\u76D6 WiseMindAI \u77E5\u8BC6\u5E93\uFF1A${baseName}`);
            } else {
              await options.api.createKnowledgeDocument(payload);
              push(result, item.title, item.path, "created", `\u5DF2\u5BFC\u5165\u4E3A WiseMindAI \u77E5\u8BC6\u5E93\uFF1A${baseName}`);
            }
          }
        }
      } catch (error) {
        push(result, item.title, item.path, "failed", error?.message || "\u5BFC\u5165\u5931\u8D25");
      }
      options.onProgress?.(result);
    }
  }
  return result;
};
var normalizeRemoteId = (id) => id === null || id === void 0 || id === "" ? null : String(id);
var normalizeTitle = (value) => typeof value === "string" ? value.trim() : "";
var findExistingNote = async (api, title, folder) => {
  const items = await api.listNotes({ q: title, from_folder: folder ?? void 0, limit: 200 }).catch(() => []);
  return items.find((item) => normalizeTitle(item.title) === title);
};
var findExistingDocument = async (api, title, folder) => {
  const items = await api.listDocuments({ q: title, from_folder: folder ?? void 0, includeFolders: false, limit: 200 }).catch(() => []);
  return items.find((item) => normalizeTitle(item.name || item.title) === title);
};
var findExistingKnowledgeDocument = async (api, title, knowledgeBaseId) => {
  if (!knowledgeBaseId)
    return null;
  const items = await api.listKnowledgeDocuments(knowledgeBaseId, title).catch(() => []);
  return items.find((item) => normalizeTitle(item.title) === title);
};
var resolvePathFolder = async (folderPath, cache, resolver) => {
  if (!folderPath)
    return null;
  if (cache.has(folderPath))
    return cache.get(folderPath) ?? null;
  let parent = null;
  let currentPath = "";
  for (const name of folderPath.split("/").filter(Boolean)) {
    currentPath = currentPath ? `${currentPath}/${name}` : name;
    if (cache.has(currentPath)) {
      parent = cache.get(currentPath) ?? null;
      continue;
    }
    const folder = await resolver(name, parent);
    parent = folder?.id ?? folder?.data?.id ?? null;
    cache.set(currentPath, parent);
  }
  cache.set(folderPath, parent);
  return parent;
};
var emptyResult = () => ({ created: 0, updated: 0, skipped: 0, failed: 0, items: [] });
var push = (result, title, source, status, message) => {
  result[status] += 1;
  result.items.push({ title, source, status, message });
};

// src/quickActions.ts
var collectMarkdownFiles = (app, target) => {
  if (isMarkdownFile(target))
    return [target];
  const folderPath = target.path.endsWith("/") ? target.path : `${target.path}/`;
  return app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(folderPath));
};
var isMarkdownFile = (file) => "extension" in file && file.extension === "md";

// src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  apiBaseUrl: "http://127.0.0.1:38221",
  defaultTargets: { notes: true, documents: false, knowledge: true },
  defaultWiseMindSources: { notes: true, documents: true, knowledgeDocuments: true },
  contextMenuDefaults: {
    noteFolderPath: "",
    documentFolderPath: "",
    knowledgeBaseName: "Obsidian \u5BFC\u5165"
  },
  contextMenuRecents: {
    notes: [],
    documents: [],
    knowledge: []
  },
  syncPlans: [],
  syncHistory: [],
  defaultSyncPlanId: "",
  hasSeenTutorial: false,
  defaultKnowledgeBaseName: "Obsidian \u5BFC\u5165",
  defaultObsidianRootFolder: "WiseMindAI",
  duplicatePolicy: "update",
  maxFileSizeKb: 1024,
  ignorePatterns: [".obsidian/**", "**/.trash/**"],
  chunkSize: 10
};
var WiseMindSettingTab = class extends import_obsidian.PluginSettingTab {
  plugin;
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "WiseMindAI Obsidian \u8BBE\u7F6E" });
    new import_obsidian.Setting(containerEl).setName("WiseMindAI \u672C\u5730\u63A5\u53E3\u5730\u5740").setDesc("\u9ED8\u8BA4\u662F WiseMindAI Local API v2 \u5730\u5740\u3002").addText(
      (text) => text.setPlaceholder(DEFAULT_SETTINGS.apiBaseUrl).setValue(this.plugin.settings.apiBaseUrl).onChange(async (value) => {
        this.plugin.settings.apiBaseUrl = value.trim() || DEFAULT_SETTINGS.apiBaseUrl;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Obsidian \u5199\u5165\u6839\u76EE\u5F55").setDesc("WiseMindAI \u5185\u5BB9\u540C\u6B65\u5230 Obsidian \u65F6\uFF0C\u4F1A\u5199\u5165\u8FD9\u4E2A\u6839\u76EE\u5F55\u3002").addText(
      (text) => text.setPlaceholder(DEFAULT_SETTINGS.defaultObsidianRootFolder).setValue(this.plugin.settings.defaultObsidianRootFolder).onChange(async (value) => {
        this.plugin.settings.defaultObsidianRootFolder = value.trim() || DEFAULT_SETTINGS.defaultObsidianRootFolder;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u9ED8\u8BA4\u77E5\u8BC6\u5E93\u540D\u79F0").setDesc("Obsidian \u5185\u5BB9\u5BFC\u5165 WiseMindAI \u77E5\u8BC6\u5E93\u65F6\u4F7F\u7528\u3002").addText(
      (text) => text.setPlaceholder(DEFAULT_SETTINGS.defaultKnowledgeBaseName).setValue(this.plugin.settings.defaultKnowledgeBaseName).onChange(async (value) => {
        this.plugin.settings.defaultKnowledgeBaseName = value.trim() || DEFAULT_SETTINGS.defaultKnowledgeBaseName;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u91CD\u590D\u5185\u5BB9\u5904\u7406").setDesc("\u9ED8\u8BA4\u66F4\u65B0\u540C\u6765\u6E90\u5185\u5BB9\uFF0C\u907F\u514D\u91CD\u590D\u521B\u5EFA\u3002").addDropdown(
      (dropdown) => dropdown.addOption("skip", "\u8DF3\u8FC7").addOption("update", "\u66F4\u65B0").addOption("duplicate", "\u521B\u5EFA\u526F\u672C").setValue(this.plugin.settings.duplicatePolicy).onChange(async (value) => {
        this.plugin.settings.duplicatePolicy = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u6D4B\u8BD5 WiseMindAI \u8FDE\u63A5").setDesc("\u9700\u8981\u5148\u5728 WiseMindAI \u4E2D\u542F\u52A8\u672C\u5730\u63A5\u53E3\u3002").addButton(
      (button) => button.setButtonText("\u6D4B\u8BD5\u8FDE\u63A5").setCta().onClick(async () => {
        const ok = await this.plugin.testConnection();
        new import_obsidian.Notice(ok ? "WiseMindAI \u5DF2\u8FDE\u63A5" : "\u65E0\u6CD5\u8FDE\u63A5 WiseMindAI\uFF0C\u8BF7\u5148\u542F\u52A8 WiseMindAI \u672C\u5730\u63A5\u53E3");
      })
    );
  }
};

// src/statusBar.ts
var WiseMindStatusBar = class {
  el;
  constructor(el, onClick) {
    this.el = el;
    this.el.addClass("wisemind-bridge-status");
    this.el.onclick = onClick;
    this.setDisconnected();
  }
  setDisconnected() {
    this.el.setText("WiseMindAI \u672A\u8FDE\u63A5");
  }
  setConnected() {
    this.el.setText("WiseMindAI \u5DF2\u8FDE\u63A5");
  }
  setSyncing() {
    this.el.setText("WiseMindAI \u540C\u6B65\u4E2D...");
  }
  setResult(result) {
    this.el.setText(`\u5DF2\u540C\u6B65 ${result.created + result.updated + result.skipped} \u9879\uFF0C\u5931\u8D25 ${result.failed} \u9879`);
  }
};

// src/syncView.ts
var import_obsidian2 = require("obsidian");

// assets/icons/arrow-path.svg
var arrow_path_default = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">\n  <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />\n</svg>\n';

// assets/icons/bookmark-square.svg
var bookmark_square_default = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">\n  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H18A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6A2.25 2.25 0 0 1 6 3.75h1.5m9 0h-9" />\n</svg>\n';

// assets/icons/check-circle.svg
var check_circle_default = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">\n  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />\n</svg>\n';

// assets/icons/chevron-down.svg
var chevron_down_default = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">\n  <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />\n</svg>\n';

// assets/icons/chevron-right.svg
var chevron_right_default = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">\n  <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />\n</svg>\n';

// assets/icons/clock.svg
var clock_default = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">\n  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />\n</svg>\n';

// assets/icons/document.svg
var document_default = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">\n  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />\n</svg>\n';

// assets/icons/home.svg
var home_default = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">\n  <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />\n</svg>\n';

// assets/icons/knowledge.svg
var knowledge_default = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">\n  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />\n</svg>\n';

// assets/icons/markdown.svg
var markdown_default = '<svg t="1762960832356" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3563" width="128" height="128"><path d="M903.509333 256.682667L657.578667 10.752A36.494222 36.494222 0 0 0 631.751111 0H146.261333C126.008889 0 109.681778 16.355556 109.681778 36.579556v950.840888c0 20.224 16.355556 36.579556 36.579555 36.579556h731.420445c20.224 0 36.579556-16.355556 36.579555-36.579556V282.624c0-9.699556-3.896889-19.057778-10.752-25.941333z m-73.585777 42.752h-215.096889V84.337778l215.096889 215.096889z m2.048 642.275555H192V82.289778h345.144889v246.840889a48.014222 48.014222 0 0 0 48.014222 48.014222h246.840889v564.565333zM417.109333 476.785778a13.624889 13.624889 0 0 0-12.572444-8.220445h-39.992889a13.767111 13.767111 0 0 0-13.710222 13.710223v310.869333c0 7.537778 6.172444 13.710222 13.710222 13.710222h30.976a13.767111 13.767111 0 0 0 13.710222-13.710222v-201.016889l76.344889 171.633778a13.738667 13.738667 0 0 0 12.572445 8.135111h27.534222a13.937778 13.937778 0 0 0 12.572444-8.135111l76.344889-172.088889v201.472c0 7.537778 6.172444 13.710222 13.710222 13.710222h31.089778a13.767111 13.767111 0 0 0 13.710222-13.710222V482.275556a13.767111 13.767111 0 0 0-13.710222-13.710223h-39.651555a13.624889 13.624889 0 0 0-12.572445 8.248889l-94.976 218.282667-95.089778-218.311111z" fill="currentColor" p-id="3564"></path></svg>';

// assets/icons/note.svg
var note_default = '<?xml version="1.0" encoding="UTF-8"?><svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 6C8 4.89543 8.89543 4 10 4H38C39.1046 4 40 4.89543 40 6V42C40 43.1046 39.1046 44 38 44H10C8.89543 44 8 43.1046 8 42V6Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M16 4V44" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 12H32" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 20H32" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 4H22" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 44H22" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// assets/icons/pencil-square.svg
var pencil_square_default = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">\n  <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />\n</svg>\n';

// assets/icons/plus.svg
var plus_default = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">\n  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />\n</svg>\n\n';

// assets/icons/sync-to-obsidian.svg
var sync_to_obsidian_default = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">\n  <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />\n</svg>\n';

// assets/icons/sync-to-wisemind.svg
var sync_to_wisemind_default = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">\n  <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />\n</svg>\n';

// assets/icons/to-right.svg
var to_right_default = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">\n  <path stroke-linecap="round" stroke-linejoin="round" d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5" />\n</svg>\n';

// assets/icons/trash.svg
var trash_default = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">\n  <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M19.228 5.79 18.16 19.673A2.25 2.25 0 0 1 15.916 21H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />\n</svg>\n';

// assets/icons/x-mark.svg
var x_mark_default = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">\n  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />\n</svg>\n';

// src/text.ts
var hashText = async (text) => {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};
var markdownToPlainText = (markdown) => markdown.replace(/```[\s\S]*?```/g, " ").replace(/`([^`]+)`/g, "$1").replace(/!\[[^\]]*]\([^)]*\)/g, " ").replace(/\[([^\]]+)]\([^)]*\)/g, "$1").replace(/[#>*_\-~|]/g, " ").replace(/\s+/g, " ").trim();
var safeJsonParse = (value, fallback) => {
  if (typeof value !== "string")
    return value ?? fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};
var normalizeTags = (value) => {
  const parsed = typeof value === "string" ? safeJsonParse(value, value) : value;
  if (Array.isArray(parsed)) {
    return Array.from(
      new Set(
        parsed.map((item) => {
          if (typeof item === "string")
            return item;
          if (item && typeof item === "object" && "text" in item)
            return String(item.text);
          if (item && typeof item === "object" && "name" in item)
            return String(item.name);
          return "";
        }).map((item) => item.replace(/^#/, "").trim()).filter(Boolean)
      )
    );
  }
  if (typeof parsed === "string") {
    return parsed.split(/[,，\s]+/).map((item) => item.replace(/^#/, "").trim()).filter(Boolean);
  }
  return [];
};
var sanitizeFileName = (value, fallback) => {
  const text = (value || fallback).replace(/[\\/:"*?<>|]/g, "-").replace(/\s+/g, " ").trim();
  return text || fallback;
};
var quoteYamlString = (value) => JSON.stringify(value ?? "");

// src/vaultScanner.ts
var scanVault = async (app, options) => {
  const maxBytes = options.maxFileSizeKb * 1024;
  const files = app.vault.getMarkdownFiles().filter((file) => shouldIncludeFile(file, maxBytes, options));
  const items = await Promise.all(files.map((file) => readObsidianFile(app, file)));
  return items.sort((a, b) => a.path.localeCompare(b.path));
};
var readObsidianFile = async (app, file) => {
  const raw = await app.vault.cachedRead(file);
  const markdown = stripSourceMarkers(raw);
  const { frontmatter, body } = parseFrontmatter(markdown);
  const tags = Array.from(/* @__PURE__ */ new Set([...normalizeTags(frontmatter.tags), ...extractInlineTags(body)]));
  const title = titleFromMarkdown(markdown, file.basename);
  const folderPath = file.path.includes("/") ? file.path.split("/").slice(0, -1).join("/") : "";
  const contentHash = await hashText(markdown);
  return {
    path: file.path,
    absolutePath: resolveAbsolutePath(app, file.path),
    basename: file.basename,
    folderPath,
    title,
    markdown,
    plainText: markdownToPlainText(body),
    tags,
    frontmatter,
    modifiedAt: file.stat.mtime,
    size: file.stat.size,
    contentHash
  };
};
var resolveAbsolutePath = (app, path) => {
  const adapter = app.vault.adapter;
  const basePath = typeof adapter.getBasePath === "function" ? adapter.getBasePath() : "";
  return basePath ? `${String(basePath).replace(/\/+$/, "")}/${path}` : path;
};
var titleFromMarkdown = (markdown, fallback) => {
  const { frontmatter, body } = parseFrontmatter(markdown);
  const frontmatterTitle = typeof frontmatter.title === "string" ? frontmatter.title.trim() : "";
  if (frontmatterTitle)
    return frontmatterTitle;
  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || fallback || "\u672A\u547D\u540D\u7B14\u8BB0";
};
var extractInlineTags = (markdown) => {
  const tags = /* @__PURE__ */ new Set();
  const regex = /(^|\s)#([\p{L}\p{N}_/-]+)/gu;
  let match;
  while (match = regex.exec(markdown)) {
    const tag = match[2]?.replace(/^#/, "").trim();
    if (tag)
      tags.add(tag);
  }
  return Array.from(tags);
};
var parseFrontmatter = (markdown) => {
  if (!markdown.startsWith("---")) {
    return { frontmatter: {}, body: markdown };
  }
  const end = markdown.indexOf("\n---", 3);
  if (end === -1) {
    return { frontmatter: {}, body: markdown };
  }
  const raw = markdown.slice(3, end).trim();
  const body = markdown.slice(end + 4).replace(/^\r?\n/, "");
  const frontmatter = {};
  raw.split(/\r?\n/).forEach((line) => {
    const index = line.indexOf(":");
    if (index === -1)
      return;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (!key)
      return;
    if (value.startsWith("[") && value.endsWith("]")) {
      frontmatter[key] = value.slice(1, -1).split(",").map((item) => item.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
    } else {
      frontmatter[key] = value.replace(/^['"]|['"]$/g, "");
    }
  });
  return { frontmatter, body };
};
var shouldIncludeFile = (file, maxBytes, options) => {
  if (file.extension !== "md")
    return false;
  if (!file.path.toLowerCase().endsWith(".md"))
    return false;
  if (file.path.toLowerCase().endsWith(".canvas") || file.path.toLowerCase().endsWith(".base"))
    return false;
  if (file.stat.size > maxBytes)
    return false;
  if (options.folderPrefix && !file.path.startsWith(options.folderPrefix))
    return false;
  if (file.path.split("/").some((part) => part.startsWith(".") && part !== "."))
    return false;
  return !options.ignorePatterns.some((pattern) => matchSimplePattern(file.path, pattern));
};
var matchSimplePattern = (path, pattern) => {
  if (!pattern)
    return false;
  if (pattern.endsWith("/**"))
    return path.startsWith(pattern.slice(0, -3));
  if (pattern.startsWith("**/"))
    return path.includes(pattern.slice(3).replace("/**", ""));
  return path === pattern || path.startsWith(`${pattern}/`);
};

// src/wisemindApi.ts
var WiseMindApiError = class extends Error {
  status;
  constructor(message, status) {
    super(message);
    this.name = "WiseMindApiError";
    this.status = status;
  }
};
var WiseMindApiClient = class {
  baseUrl;
  fetchImpl;
  timeoutMs;
  constructor(baseUrl, fetchImpl = fetch.bind(globalThis), timeoutMs = 1e4) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }
  async health() {
    return this.request("/api/health");
  }
  async search(q, types) {
    const params = new URLSearchParams({ q });
    if (types?.length)
      params.set("types", types.join(","));
    return this.request(`/api/search?${params.toString()}`);
  }
  async listNotes(params = {}) {
    return this.getData(`/api/v2/notes${toQuery(params)}`);
  }
  async getNote(id) {
    return this.getData(`/api/v2/notes/${encodeURIComponent(String(id))}`);
  }
  async listNoteFolders() {
    return this.getData("/api/v2/note-folders");
  }
  async resolveNoteFolder(name, fromFolder) {
    return this.postData("/api/v2/note-folders/resolve", { name, from_folder: normalizeNullable(fromFolder) });
  }
  async createNote(payload) {
    return this.request("/api/v2/notes", { method: "POST", body: JSON.stringify(payload) });
  }
  async updateNote(id, payload) {
    return this.request(`/api/v2/notes/${encodeURIComponent(String(id))}`, { method: "PATCH", body: JSON.stringify(payload) });
  }
  async listDocuments(params = {}) {
    return this.getData(`/api/v2/files${toQuery(params)}`);
  }
  async getDocument(id) {
    return this.getData(`/api/v2/files/${encodeURIComponent(String(id))}`);
  }
  async listFileFolders() {
    return this.getData("/api/v2/file-folders");
  }
  async resolveFileFolder(name, fromFolder) {
    return this.postData("/api/v2/file-folders/resolve", { name, from_folder: normalizeNullable(fromFolder) });
  }
  async createDocument(payload) {
    return this.request("/api/v2/files", { method: "POST", body: JSON.stringify(payload) });
  }
  async updateDocument(id, payload) {
    return this.request(`/api/v2/files/${encodeURIComponent(String(id))}`, { method: "PATCH", body: JSON.stringify(payload) });
  }
  async upsertDocument(payload) {
    return this.postData("/api/v2/files/upsert", payload);
  }
  async listKnowledgeBases(params = {}) {
    return this.getData(`/api/v2/knowledge-bases${toQuery(params)}`);
  }
  async resolveKnowledgeBase(name, extra = {}) {
    return this.postData("/api/v2/knowledge-bases/resolve", { name, ...extra });
  }
  async listKnowledgeDocuments(knowledgeBaseId, q) {
    return this.getData(
      `/api/v2/knowledge-documents${toQuery({ knowledgeBaseId, q })}`
    );
  }
  async getKnowledgeDocument(id) {
    return this.getData(`/api/v2/knowledge-documents/${encodeURIComponent(String(id))}`);
  }
  async createKnowledgeDocument(payload) {
    return this.request("/api/v2/knowledge-documents", { method: "POST", body: JSON.stringify(payload) });
  }
  async updateKnowledgeDocument(id, payload) {
    return this.request(`/api/v2/knowledge-documents/${encodeURIComponent(String(id))}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  }
  async loadSnapshot() {
    const [notes, noteFolders, documents, documentFolders, knowledgeBases] = await Promise.all([
      this.listNotes({ includeFolders: true }),
      this.listNoteFolders(),
      this.listDocuments({ includeFolders: true, limit: 200 }),
      this.listFileFolders(),
      this.listKnowledgeBases()
    ]);
    const knowledgeDocumentsNested = await Promise.all(
      knowledgeBases.map((base) => this.listKnowledgeDocuments(base.id).catch(() => []))
    );
    return {
      notes,
      noteFolders,
      documents,
      documentFolders,
      knowledgeBases,
      knowledgeDocuments: knowledgeDocumentsNested.flat()
    };
  }
  async getData(path) {
    const response = await this.request(path);
    return response?.data ?? [];
  }
  async postData(path, body) {
    const response = await this.request(path, { method: "POST", body: JSON.stringify(body) });
    return response?.data ?? response;
  }
  async request(path, init = {}) {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...init.headers || {}
        },
        signal: controller.signal
      });
      const text = await response.text();
      let json = {};
      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
          throw new WiseMindApiError("WiseMindAI \u672C\u5730\u63A5\u53E3\u8FD4\u56DE\u4E86\u65E0\u6CD5\u89E3\u6790\u7684\u6570\u636E", response.status);
        }
      }
      if (!response.ok) {
        throw new WiseMindApiError(json?.error || json?.message || `WiseMindAI \u8BF7\u6C42\u5931\u8D25\uFF1A${response.status}`, response.status);
      }
      return json;
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new WiseMindApiError("\u8FDE\u63A5 WiseMindAI \u672C\u5730\u63A5\u53E3\u8D85\u65F6");
      }
      if (error instanceof WiseMindApiError) {
        throw error;
      }
      throw new WiseMindApiError(error?.message || "\u65E0\u6CD5\u8FDE\u63A5 WiseMindAI \u672C\u5730\u63A5\u53E3");
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }
};
var normalizeBaseUrl = (value) => {
  const trimmed = (value || "http://127.0.0.1:38221").trim();
  return trimmed.replace(/\/+$/, "");
};
var toQuery = (params) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== void 0 && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const text = query.toString();
  return text ? `?${text}` : "";
};
var normalizeNullable = (value) => {
  if (value === void 0 || value === null || value === "")
    return null;
  return String(value);
};

// src/wisemindSourceScanner.ts
var loadWiseMindSources = async (api, options) => {
  const snapshot = await api.loadSnapshot();
  const items = [];
  if (options.includeNotes) {
    for (const note of snapshot.notes.filter((item) => !item.is_folder)) {
      items.push(await normalizeWiseMindNote(note, snapshot.noteFolders));
    }
  }
  if (options.includeDocuments) {
    for (const doc of snapshot.documents.filter((item) => !item.is_folder && isMarkdownRecord(item))) {
      const detail = hasDocumentBody(doc) ? doc : await api.getDocument(doc.id).catch(() => doc);
      const normalized = await normalizeWiseMindDocument({ ...doc, ...detail }, snapshot.documentFolders);
      if (normalized.markdown.trim())
        items.push(normalized);
    }
  }
  if (options.includeKnowledgeDocuments) {
    for (const knowledgeDocument of snapshot.knowledgeDocuments.filter(isMarkdownRecord)) {
      const base = snapshot.knowledgeBases.find((item) => String(item.id) === String(knowledgeDocument.knowledgeBaseId));
      items.push(await normalizeWiseMindKnowledgeDocument(knowledgeDocument, base));
    }
  }
  return { snapshot, items };
};
var normalizeWiseMindNote = async (note, folders = []) => {
  const markdown = stripSourceMarkers(firstText(note.md, note.text, note.content));
  const title = firstText(note.title, note.fileName, `note-${note.id}`);
  const folderPath = resolveFolderPath(note.from_folder, folders);
  return {
    sourceType: "note",
    id: note.id,
    title,
    markdown,
    plainText: firstText(note.text, markdownToPlainText(markdown)),
    tags: normalizeTags(note.tags),
    folderPath,
    updatedAt: note.updated_at || note.lastModified,
    contentHash: await hashText(markdown),
    raw: note
  };
};
var normalizeWiseMindDocument = async (doc, folders = []) => {
  const markdown = stripSourceMarkers(firstText(doc.content, doc.md, doc.markdown, doc.note, doc.summary));
  const title = firstText(doc.name, doc.title, `document-${doc.id}`);
  const folderPath = resolveFolderPath(doc.from_folder, folders);
  return {
    sourceType: "document",
    id: doc.id,
    title,
    markdown,
    plainText: markdownToPlainText(markdown),
    tags: normalizeTags(doc.tags),
    folderPath,
    updatedAt: doc.updated_at || doc.lastModified,
    contentHash: await hashText(markdown),
    raw: doc
  };
};
var hasDocumentBody = (doc) => Boolean(firstText(doc?.content, doc?.md, doc?.markdown, doc?.note, doc?.summary));
var normalizeWiseMindKnowledgeDocument = async (doc, base) => {
  const markdown = stripSourceMarkers(firstText(doc.content, doc.summary));
  const knowledgeBaseName = firstText(base?.name, `knowledge-${doc.knowledgeBaseId}`);
  const title = firstText(doc.title, `knowledge-document-${doc.id}`);
  return {
    sourceType: "knowledge-document",
    id: doc.id,
    title,
    markdown,
    plainText: markdownToPlainText(markdown),
    tags: normalizeTags(doc.tags),
    folderPath: `Knowledge/${knowledgeBaseName}`,
    updatedAt: doc.updated_at,
    contentHash: await hashText(markdown),
    knowledgeBaseName,
    raw: doc
  };
};
var resolveFolderPath = (folderId, folders) => {
  if (folderId === void 0 || folderId === null || folderId === "")
    return "";
  const byId = new Map(folders.map((folder) => [String(folder.id), folder]));
  const names = [];
  let current = byId.get(String(folderId));
  const seen = /* @__PURE__ */ new Set();
  while (current && !seen.has(String(current.id))) {
    seen.add(String(current.id));
    names.unshift(current.name);
    current = current.from_folder ? byId.get(String(current.from_folder)) : void 0;
  }
  return names.join("/");
};
var isMarkdownRecord = (record) => {
  const values = [
    record?.type,
    record?.fileType,
    record?.file_type,
    record?.fileExt,
    record?.file_ext,
    record?.ext,
    record?.extension,
    record?.name,
    record?.title,
    record?.fileName,
    record?.filename,
    record?.filePath,
    record?.path,
    record?.md,
    record?.content
  ];
  return values.some((value) => {
    if (typeof value !== "string")
      return false;
    const normalized = value.trim().toLowerCase();
    return normalized === "md" || normalized === ".md" || normalized === "markdown" || normalized.endsWith(".md");
  });
};
var firstText = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim())
      return value.trim();
    if (typeof value === "number")
      return String(value);
  }
  return "";
};

// src/obsidianWriter.ts
var buildObsidianDestinationPath = (item, root, includeFolder = true) => {
  const safeRoot = trimSlashes(root);
  const safeTitle2 = sanitizeFileName(item.title, `${item.sourceType}-${item.id}`);
  const folder = includeFolder ? item.sourceType === "note" ? item.folderPath || "" : item.sourceType === "document" ? item.folderPath || "" : sanitizeFileName(item.knowledgeBaseName || "\u672A\u547D\u540D\u77E5\u8BC6\u5E93", "\u672A\u547D\u540D\u77E5\u8BC6\u5E93") : "";
  return normalizePath(`${safeRoot ? `${safeRoot}/` : ""}${folder}/${safeTitle2}.md`);
};
var buildObsidianFileContent = (item) => {
  const lines = [
    "---",
    `title: ${quoteYamlString(item.title)}`,
    `wisemind_source_type: ${item.sourceType}`,
    `wisemind_source_id: ${quoteYamlString(String(item.id))}`,
    item.knowledgeBaseName ? `wisemind_knowledge_base: ${quoteYamlString(item.knowledgeBaseName)}` : "",
    item.tags.length ? `tags: ${JSON.stringify(item.tags)}` : "",
    "---",
    "",
    item.markdown
  ].filter((line) => line !== "");
  return appendMarker(lines.join("\n"), createWiseMindSourceMarker(item));
};
var writeWiseMindItemToObsidian = async (app, item, root, policy, includeFolder = true) => {
  const targetPath = buildObsidianDestinationPath(item, root, includeFolder);
  const content = buildObsidianFileContent(item);
  const existingPath = await findExistingWiseMindFile(app, item, targetPath);
  if (existingPath) {
    const existingFile = app.vault.getAbstractFileByPath(existingPath);
    if (policy === "skip") {
      return { title: item.title, source: existingPath, status: "skipped", message: "\u5DF2\u5B58\u5728\u540C\u6765\u6E90\u6587\u4EF6" };
    }
    if (policy === "update" && existingFile) {
      await app.vault.modify(existingFile, content);
      return { title: item.title, source: existingPath, status: "updated" };
    }
  }
  const finalPath = policy === "duplicate" ? await nextAvailablePath(app, targetPath) : targetPath;
  await ensureFolder(app, finalPath.split("/").slice(0, -1).join("/"));
  await app.vault.create(finalPath, content);
  return { title: item.title, source: finalPath, status: "created" };
};
var ensureFolder = async (app, folderPath) => {
  const parts = folderPath.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (!app.vault.getAbstractFileByPath(current)) {
      await app.vault.createFolder(current);
    }
  }
};
var nextAvailablePath = async (app, path) => {
  if (!app.vault.getAbstractFileByPath(path))
    return path;
  const dot = path.lastIndexOf(".");
  const base = dot === -1 ? path : path.slice(0, dot);
  const ext = dot === -1 ? "" : path.slice(dot);
  let index = 2;
  let candidate = `${base} ${index}${ext}`;
  while (app.vault.getAbstractFileByPath(candidate)) {
    index += 1;
    candidate = `${base} ${index}${ext}`;
  }
  return candidate;
};
var findExistingWiseMindFile = async (app, item, fallbackPath) => {
  const fallback = app.vault.getAbstractFileByPath(fallbackPath);
  if (fallback)
    return fallbackPath;
  const files = app.vault.getMarkdownFiles();
  for (const file of files) {
    const content = await app.vault.cachedRead(file);
    const marker = findSourceMarker(content);
    if (marker?.source === "wisemind" && marker.type === item.sourceType && marker.id === String(item.id)) {
      return file.path;
    }
  }
  return "";
};
var trimSlashes = (value) => value.replace(/^\/+|\/+$/g, "");
var normalizePath = (value) => value.replace(/\/+/g, "/").replace(/\/\.md$/, ".md");

// src/wisemindToObsidianRunner.ts
var runWiseMindToObsidianImport = async (options) => {
  const result = emptyResult();
  const rootFolders = options.rootFolders?.length ? options.rootFolders : [options.rootFolder];
  for (let index = 0; index < options.items.length; index += options.chunkSize || 10) {
    if (options.signal?.aborted)
      break;
    const chunk = options.items.slice(index, index + (options.chunkSize || 10));
    for (const item of chunk) {
      if (options.signal?.aborted)
        break;
      try {
        for (const rootFolder of rootFolders) {
          const itemResult = await writeWiseMindItemToObsidian(
            options.app,
            item,
            rootFolder,
            options.duplicatePolicy,
            options.includeFolderStructure ?? true
          );
          push(result, itemResult.title, itemResult.source, itemResult.status, itemResult.message);
        }
      } catch (error) {
        push(result, item.title, `${item.sourceType}:${item.id}`, "failed", error?.message || "\u540C\u6B65\u5931\u8D25");
      }
      options.onProgress?.(result);
    }
  }
  return result;
};

// src/syncView.ts
var WiseMindBridgeView = class extends import_obsidian2.ItemView {
  plugin;
  obsidianItems = [];
  wiseMindItems = [];
  snapshot = null;
  direction = "to-wisemind";
  activeWiseMindCategory = "documents";
  expandedGroups = /* @__PURE__ */ new Set();
  selectedObsidian = /* @__PURE__ */ new Set();
  selectedWiseMind = /* @__PURE__ */ new Set();
  selectedWiseMindDestinations = /* @__PURE__ */ new Set();
  selectedObsidianTargetFolders = /* @__PURE__ */ new Set();
  pendingPlanName = "";
  wiseMindConnectionError = "";
  overwriteExisting = false;
  includeObsidianFolders = false;
  searches = {
    obsidianSource: "",
    wiseMindTarget: "",
    wiseMindSource: "",
    obsidianTarget: ""
  };
  importTargets;
  hasAppliedDefaultPlan = false;
  hasOpenedInitialTutorial = false;
  statsEl;
  tabsEl;
  planBarEl;
  toolbarEl;
  flowEl;
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.importTargets = targetSetFromSettings(plugin.settings.defaultTargets);
  }
  getViewType() {
    return WISEMIND_VIEW_TYPE;
  }
  getDisplayText() {
    return "WiseMindAI Obsidian";
  }
  getIcon() {
    return WISEMIND_ICON_ID;
  }
  async onOpen() {
    this.renderShell();
    await this.refresh();
    this.openTutorialOnFirstUse();
  }
  async onClose() {
    this.selectedObsidian.clear();
    this.selectedWiseMind.clear();
  }
  async refresh(preserveSelection = false) {
    this.setResult("\u6B63\u5728\u8BFB\u53D6\u6570\u636E...");
    const previous = this.captureSelection();
    const previousScroll = preserveSelection ? this.captureListScroll() : [];
    const previousExpandedGroups = new Set(this.expandedGroups);
    const [obsidianResult, wiseMindResult] = await Promise.allSettled([
      scanVault(this.app, {
        maxFileSizeKb: this.plugin.settings.maxFileSizeKb,
        ignorePatterns: this.plugin.settings.ignorePatterns
      }),
      loadWiseMindSources(this.plugin.api, {
        includeNotes: true,
        includeDocuments: true,
        includeKnowledgeDocuments: true
      })
    ]);
    if (obsidianResult.status === "fulfilled") {
      this.obsidianItems = obsidianResult.value;
    } else {
      this.obsidianItems = [];
    }
    if (wiseMindResult.status === "fulfilled") {
      this.wiseMindItems = wiseMindResult.value.items;
      this.snapshot = wiseMindResult.value.snapshot;
      this.wiseMindConnectionError = "";
      if (preserveSelection) {
        this.restoreSelection(previous);
      } else {
        this.selectedObsidian = new Set(this.obsidianItems.map((item) => item.path));
        this.selectedWiseMind = new Set(this.wiseMindItems.map((item) => sourceKey(item)));
        this.selectedWiseMindDestinations = new Set(this.getDefaultDestinationKeys());
        this.selectedObsidianTargetFolders = /* @__PURE__ */ new Set([this.plugin.settings.defaultObsidianRootFolder]);
      }
      this.plugin.statusBar.setConnected();
      this.setResult("\u6570\u636E\u5DF2\u5237\u65B0");
    } else {
      this.wiseMindItems = [];
      this.snapshot = null;
      this.wiseMindConnectionError = wiseMindResult.reason?.message || "\u65E0\u6CD5\u8FDE\u63A5 WiseMindAI \u672C\u5730\u63A5\u53E3";
      if (!preserveSelection) {
        this.selectedObsidian = new Set(this.obsidianItems.map((item) => item.path));
        this.selectedWiseMind.clear();
        this.selectedWiseMindDestinations.clear();
        this.selectedObsidianTargetFolders = /* @__PURE__ */ new Set([this.plugin.settings.defaultObsidianRootFolder]);
      } else {
        this.restoreSelection(previous);
        this.selectedWiseMind.clear();
        this.selectedWiseMindDestinations.clear();
      }
      this.plugin.statusBar.setDisconnected();
      this.setResult(this.wiseMindConnectionError);
    }
    if (obsidianResult.status === "rejected") {
      this.setResult(obsidianResult.reason?.message || "\u8BFB\u53D6 Obsidian \u4ED3\u5E93\u5931\u8D25");
    }
    try {
      const defaultExpandedGroups = [
        ...this.buildObsidianGroups().slice(0, 3).map((group) => group.id),
        ...this.buildWiseMindSourceGroups("documents").slice(0, 3).map((group) => group.id),
        ...this.buildWiseMindSourceGroups("notes").slice(0, 3).map((group) => group.id),
        ...this.buildWiseMindSourceGroups("knowledge").slice(0, 3).map((group) => group.id),
        ...this.buildDestinationGroups().map((group) => group.id)
      ];
      this.expandedGroups = preserveSelection ? /* @__PURE__ */ new Set([...defaultExpandedGroups, ...previousExpandedGroups]) : new Set(defaultExpandedGroups);
      if (!this.hasAppliedDefaultPlan) {
        this.applyDefaultPlan();
        this.hasAppliedDefaultPlan = true;
      }
      this.renderDynamic();
      if (preserveSelection)
        this.restoreListScroll(previousScroll);
    } catch (error) {
      this.setResult(error?.message || "\u8BFB\u53D6\u6570\u636E\u5931\u8D25");
    }
  }
  renderShell() {
    const root = this.contentEl;
    root.empty();
    root.addClass("wisemind-bridge-view");
    const header = root.createDiv({ cls: "wisemind-bridge-header" });
    header.appendChild(createInlineIcon(this.getIconSvg("wisemindai-logo.svg"), "WiseMindAI Obsidian", "wisemind-bridge-icon"));
    const titleWrap = header.createDiv();
    titleWrap.createEl("h2", { text: "WiseMindAI Obsidian" });
    titleWrap.createDiv({ cls: "wisemind-bridge-muted", text: "\u9009\u62E9\u65B9\u5411\u548C\u8303\u56F4\u540E\u6267\u884C\u540C\u6B65\u3002" });
    const headerActions = header.createDiv({ cls: "wisemind-bridge-header-actions" });
    headerActions.append(
      createTextButton("\u53F3\u952E\u83DC\u5355\u8BBE\u7F6E", () => void this.openContextMenuSettings(), this.getIconSvg("document.svg")),
      createTextButton("API \u8BBE\u7F6E", () => void this.openApiSettings(), this.getIconSvg("pencil-square.svg")),
      createTextButton("\u4F7F\u7528\u6559\u7A0B", () => void this.openTutorial(), this.getIconSvg("bookmark-square.svg")),
      createTextButton("\u6253\u5F00\u5B98\u7F51", () => {
        window.open("https://wisemindai.app", "_blank", "noopener,noreferrer");
      }, this.getIconSvg("home.svg"))
    );
    this.statsEl = root.createDiv({ cls: "wisemind-bridge-summary" });
    this.tabsEl = root.createDiv({ cls: "wisemind-bridge-direction-tabs" });
    this.planBarEl = root.createDiv({ cls: "wisemind-bridge-plan-bar" });
    this.toolbarEl = root.createDiv({ cls: "wisemind-bridge-toolbar" });
    this.flowEl = root.createDiv({ cls: "wisemind-bridge-flow" });
  }
  renderDynamic() {
    this.renderStats();
    this.renderDirectionTabs();
    this.renderPlanBar();
    this.renderToolbar();
    this.renderFlow();
  }
  renderStats() {
    if (!this.statsEl)
      return;
    const notes = this.snapshot?.notes.filter((item) => !item.is_folder).length || 0;
    const docs = this.snapshot?.documents.filter((item) => !item.is_folder && isMarkdownRecord(item)).length || 0;
    const markdownKnowledgeBaseIds = new Set(
      (this.snapshot?.knowledgeDocuments || []).filter(isMarkdownRecord).map((item) => String(item.knowledgeBaseId))
    );
    const bases = this.snapshot?.knowledgeBases.filter((item) => markdownKnowledgeBaseIds.has(String(item.id))).length || 0;
    this.statsEl.empty();
    this.statsEl.append(
      renderSummaryBlock("Obsidian \u5F53\u524D\u4ED3\u5E93", [
        { value: this.obsidianItems.length, label: "\u7BC7\u7B14\u8BB0" }
      ]),
      renderSummaryBlock("WiseMindAI \u672C\u5730\u6570\u636E\uFF08\u4EC5 Markdown \u6587\u6863\uFF09", [
        { value: notes, label: "\u7BC7\u7B14\u8BB0" },
        { value: docs, label: "\u4E2A\u6587\u6863" },
        { value: bases, label: "\u4E2A\u77E5\u8BC6\u5E93" }
      ])
    );
  }
  renderDirectionTabs() {
    if (!this.tabsEl)
      return;
    this.tabsEl.empty();
    this.tabsEl.append(
      this.renderDirectionTab("to-wisemind", "Obsidian -> WiseMindAI", this.getIconSvg("sync-to-wisemind.svg")),
      this.renderDirectionTab("to-obsidian", "WiseMindAI -> Obsidian", this.getIconSvg("sync-to-obsidian.svg"))
    );
  }
  renderDirectionTab(direction, text, icon) {
    const button = document.createElement("button");
    button.className = `wisemind-bridge-tab${this.direction === direction ? " is-active" : ""}`;
    button.append(createInlineIcon(icon, text), document.createTextNode(text));
    button.onclick = () => {
      this.direction = direction;
      this.renderDynamic();
    };
    return button;
  }
  renderToolbar() {
    if (!this.toolbarEl)
      return;
    this.toolbarEl.empty();
    this.toolbarEl.append(createButton("\u5237\u65B0\u6570\u636E", () => this.refresh(), "secondary", this.getIconSvg("arrow-path.svg")));
    this.toolbarEl.append(createButton("\u540C\u6B65\u5386\u53F2", () => this.openHistory(), "secondary", this.getIconSvg("clock.svg")));
    const hint = this.toolbarEl.createDiv({ cls: "wisemind-bridge-muted" });
    hint.setText(
      this.direction === "to-wisemind" ? `\u5DF2\u9009 ${this.selectedObsidian.size} \u7BC7 Obsidian \u7B14\u8BB0\uFF0C\u76EE\u6807\uFF1A${this.getSelectedTargetLabels()}` : `\u5DF2\u9009 ${this.getSelectedWiseMindForActiveCategory().length} \u6761 WiseMindAI \u5185\u5BB9\uFF0C\u76EE\u6807\uFF1A${this.selectedObsidianTargetFolders.size} \u4E2A\u6587\u4EF6\u5939`
    );
  }
  openApiSettings() {
    const overlay = this.createDialog("API \u8BBE\u7F6E");
    const modal = overlay.querySelector(".wisemind-bridge-dialog");
    const intro = modal.createDiv({ cls: "wisemind-bridge-tutorial-intro" });
    intro.createEl("strong", { text: "WiseMindAI \u672C\u5730\u63A5\u53E3\u5730\u5740" });
    intro.createEl("span", { text: "\u5982\u679C\u4F60\u4FEE\u6539\u8FC7 WiseMindAI \u672C\u5730\u63A5\u53E3\u5730\u5740\uFF0C\u53EF\u4EE5\u5728\u8FD9\u91CC\u8C03\u6574\u3002\u9ED8\u8BA4\u5730\u5740\u901A\u5E38\u4E0D\u9700\u8981\u6539\u3002" });
    intro.createEl("span", { text: "\u4F7F\u7528\u524D\u8BF7\u5728 WiseMindAI \u5DE6\u4E0B\u89D2\u6253\u5F00\u8BBE\u7F6E\uFF0C\u8FDB\u5165\u300C\u7CFB\u7EDF\u8BBE\u7F6E\u300D->\u300C\u672C\u5730 API \u670D\u52A1\u300D\uFF0C\u5F00\u542F\u670D\u52A1\u540E\u518D\u8FDE\u63A5\u3002" });
    const form = modal.createDiv({ cls: "wisemind-bridge-api-form" });
    const input = form.createEl("input", {
      cls: "wisemind-bridge-plan-name",
      attr: { placeholder: DEFAULT_SETTINGS.apiBaseUrl }
    });
    input.value = this.plugin.settings.apiBaseUrl || DEFAULT_SETTINGS.apiBaseUrl;
    const status = form.createDiv({ cls: "wisemind-bridge-muted", text: `\u5F53\u524D\uFF1A${this.plugin.settings.apiBaseUrl || DEFAULT_SETTINGS.apiBaseUrl}` });
    const getValidatedUrl = () => {
      const value = input.value.trim() || DEFAULT_SETTINGS.apiBaseUrl;
      const normalized = normalizeBaseUrl(value);
      const parsed = new URL(normalized);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("\u63A5\u53E3\u5730\u5740\u5FC5\u987B\u4EE5 http:// \u6216 https:// \u5F00\u5934");
      }
      return normalized;
    };
    const actions = modal.createDiv({ cls: "wisemind-bridge-dialog-actions" });
    actions.append(
      createTextButton("\u6D4B\u8BD5\u8FDE\u63A5", async () => {
        try {
          const url = getValidatedUrl();
          status.setText("\u6B63\u5728\u6D4B\u8BD5\u8FDE\u63A5...");
          await new WiseMindApiClient(url).health();
          status.setText(`\u8FDE\u63A5\u6210\u529F\uFF1A${url}`);
          new import_obsidian2.Notice("WiseMindAI \u5DF2\u8FDE\u63A5");
        } catch (error) {
          const message = error?.message || "\u65E0\u6CD5\u8FDE\u63A5 WiseMindAI";
          status.setText(message);
          new import_obsidian2.Notice(message);
        }
      }, this.getIconSvg("arrow-path.svg")),
      createTextButton("\u4FDD\u5B58", async () => {
        try {
          const url = getValidatedUrl();
          this.plugin.settings.apiBaseUrl = url;
          await this.plugin.saveSettings();
          status.setText(`\u5DF2\u4FDD\u5B58\uFF1A${url}`);
          new import_obsidian2.Notice("API \u8BBE\u7F6E\u5DF2\u4FDD\u5B58");
          overlay.remove();
          await this.refresh(true);
        } catch (error) {
          const message = error?.message || "\u63A5\u53E3\u5730\u5740\u4E0D\u6B63\u786E";
          status.setText(message);
          new import_obsidian2.Notice(message);
        }
      }, this.getIconSvg("check-circle.svg"))
    );
    window.requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }
  async openContextMenuSettings() {
    const overlay = this.createDialog("\u53F3\u952E\u83DC\u5355\u8BBE\u7F6E");
    const modal = overlay.querySelector(".wisemind-bridge-dialog");
    modal.addClass("wisemind-bridge-context-settings-dialog");
    const intro = modal.createDiv({ cls: "wisemind-bridge-tutorial-intro" });
    intro.createEl("strong", { text: "\u53F3\u952E\u53D1\u9001\u9ED8\u8BA4\u76EE\u6807" });
    intro.createEl("span", { text: "\u8BBE\u7F6E\u540E\uFF0C\u4ECE Obsidian \u53F3\u952E\u83DC\u5355\u53D1\u9001\u7B14\u8BB0\u3001\u6587\u6863\u6216\u77E5\u8BC6\u5E93\u65F6\uFF0C\u4F1A\u9ED8\u8BA4\u9009\u4E2D\u8FD9\u91CC\u7684\u76EE\u6807\u3002" });
    const status = modal.createDiv({ cls: "wisemind-bridge-muted", text: "\u6B63\u5728\u8BFB\u53D6 WiseMindAI \u76EE\u6807\u5217\u8868..." });
    let snapshot = this.snapshot;
    if (!snapshot) {
      try {
        snapshot = await this.plugin.api.loadSnapshot();
      } catch (error) {
        status.setText(error?.message || "\u8BFB\u53D6 WiseMindAI \u76EE\u6807\u5931\u8D25");
        return;
      }
    }
    status.setText("\u9009\u62E9\u6BCF\u4E2A\u53F3\u952E\u83DC\u5355\u7684\u9ED8\u8BA4\u76EE\u6807\u3002");
    const noteOptions = [
      { value: "", title: "\u6839\u76EE\u5F55" },
      ...this.getFolderLabels(snapshot.noteFolders || []).map((value) => ({ value, title: value }))
    ];
    const documentOptions = [
      { value: "", title: "\u6839\u76EE\u5F55" },
      ...this.getFolderLabels(snapshot.documentFolders || []).map((value) => ({ value, title: value }))
    ];
    const knowledgeOptions = (snapshot.knowledgeBases || []).map((item) => safeTitle(item.name, item.title, `\u77E5\u8BC6\u5E93 ${item.id}`)).filter(Boolean).sort((a, b) => a.localeCompare(b)).map((value) => ({ value, title: value }));
    let noteFolderPath = noteOptions.some((item) => item.value === this.plugin.settings.contextMenuDefaults.noteFolderPath) ? this.plugin.settings.contextMenuDefaults.noteFolderPath : "";
    let documentFolderPath = documentOptions.some((item) => item.value === this.plugin.settings.contextMenuDefaults.documentFolderPath) ? this.plugin.settings.contextMenuDefaults.documentFolderPath : "";
    let knowledgeBaseName = knowledgeOptions.some((item) => item.value === this.plugin.settings.contextMenuDefaults.knowledgeBaseName) ? this.plugin.settings.contextMenuDefaults.knowledgeBaseName : knowledgeOptions[0]?.value || this.plugin.settings.contextMenuDefaults.knowledgeBaseName || DEFAULT_SETTINGS.contextMenuDefaults.knowledgeBaseName;
    const content = modal.createDiv({ cls: "wisemind-bridge-context-settings" });
    content.append(
      renderSelectField({
        title: "\u53D1\u9001\u5230 WiseMindAI \u7B14\u8BB0",
        desc: "\u9ED8\u8BA4\u7B14\u8BB0\u6587\u4EF6\u5939",
        options: noteOptions,
        selected: noteFolderPath,
        onChange: (value) => {
          noteFolderPath = value;
        }
      }),
      renderSelectField({
        title: "\u53D1\u9001\u5230 WiseMindAI \u6587\u6863",
        desc: "\u9ED8\u8BA4\u6587\u6863\u6587\u4EF6\u5939",
        options: documentOptions,
        selected: documentFolderPath,
        onChange: (value) => {
          documentFolderPath = value;
        }
      }),
      renderSelectField({
        title: "\u53D1\u9001\u5230 WiseMindAI \u77E5\u8BC6\u5E93",
        desc: "\u9ED8\u8BA4\u77E5\u8BC6\u5E93",
        options: knowledgeOptions,
        selected: knowledgeBaseName,
        emptyText: "WiseMindAI \u91CC\u8FD8\u6CA1\u6709\u77E5\u8BC6\u5E93\u3002",
        onChange: (value) => {
          knowledgeBaseName = value;
        }
      })
    );
    const actions = modal.createDiv({ cls: "wisemind-bridge-dialog-actions" });
    actions.append(
      createTextButton("\u4FDD\u5B58", async () => {
        this.plugin.settings.contextMenuDefaults = {
          noteFolderPath,
          documentFolderPath,
          knowledgeBaseName
        };
        await this.plugin.saveSettings();
        new import_obsidian2.Notice("\u53F3\u952E\u83DC\u5355\u8BBE\u7F6E\u5DF2\u4FDD\u5B58");
        overlay.remove();
      }, this.getIconSvg("check-circle.svg"))
    );
  }
  async openTutorialOnFirstUse() {
    if (this.hasOpenedInitialTutorial || this.plugin.settings.hasSeenTutorial)
      return;
    this.hasOpenedInitialTutorial = true;
    this.plugin.settings.hasSeenTutorial = true;
    await this.plugin.saveSettings();
    window.requestAnimationFrame(() => this.openTutorial());
  }
  openTutorial() {
    const overlay = this.createDialog("WiseMindAI Obsidian \u4F7F\u7528\u6559\u7A0B");
    const modal = overlay.querySelector(".wisemind-bridge-dialog");
    modal.addClass("wisemind-bridge-tutorial-dialog");
    const tabs = modal.createDiv({ cls: "wisemind-bridge-category-tabs wisemind-bridge-tutorial-tabs" });
    const content = modal.createDiv({ cls: "wisemind-bridge-tutorial-content" });
    let activeTab = "quick";
    const tabItems = [
      { key: "quick", label: "\u5FEB\u901F\u4E0A\u624B" },
      { key: "features", label: "\u6838\u5FC3\u529F\u80FD" },
      { key: "settings", label: "\u914D\u7F6E\u9879" }
    ];
    const renderTutorialTabs = () => {
      tabs.empty();
      tabItems.forEach((item) => {
        const button = document.createElement("button");
        button.className = `wisemind-bridge-category-tab${activeTab === item.key ? " is-active" : ""}`;
        button.textContent = item.label;
        button.onclick = () => {
          activeTab = item.key;
          renderTutorialTabs();
          renderTutorialContent();
        };
        tabs.appendChild(button);
      });
    };
    const renderCard = (title, desc) => {
      const card = content.createDiv({ cls: "wisemind-bridge-tutorial-step" });
      card.createEl("strong", { text: title });
      card.createEl("span", { text: desc });
    };
    const renderBadges = (title, items) => {
      const wrap = content.createDiv({ cls: "wisemind-bridge-plan-summary" });
      const label = wrap.createEl("span", { cls: "wisemind-bridge-muted", text: title });
      label.style.fontWeight = "600";
      const badges = wrap.createDiv({ cls: "wisemind-bridge-badges" });
      items.forEach((text) => badges.createEl("span", { cls: "wisemind-bridge-badge-soft", text }));
    };
    const renderTutorialContent = () => {
      content.empty();
      if (activeTab === "quick") {
        const intro = content.createDiv({ cls: "wisemind-bridge-tutorial-intro" });
        intro.createEl("strong", { text: "\u4E09\u6B65\u5B8C\u6210\u4E00\u6B21\u540C\u6B65" });
        intro.createEl("span", { text: "\u5148\u542F\u52A8 WiseMindAI\uFF0C\u518D\u9009\u62E9\u540C\u6B65\u65B9\u5411\u548C\u5185\u5BB9\uFF0C\u6700\u540E\u70B9\u51FB\u6267\u884C\u540C\u6B65\u3002" });
        const steps = content.createDiv({ cls: "wisemind-bridge-tutorial-steps" });
        [
          ["1. \u9009\u62E9\u65B9\u5411", "Obsidian -> WiseMindAI \u662F\u5BFC\u5165\u5230 WiseMindAI\uFF1BWiseMindAI -> Obsidian \u662F\u5199\u56DE\u5F53\u524D\u4ED3\u5E93\u3002"],
          ["2. \u52FE\u9009\u5185\u5BB9\u548C\u76EE\u6807", "\u5DE6\u8FB9\u9009\u8981\u540C\u6B65\u7684\u5185\u5BB9\uFF0C\u53F3\u8FB9\u9009\u4FDD\u5B58\u4F4D\u7F6E\u3002\u6587\u4EF6\u5939\u524D\u7684\u590D\u9009\u6846\u53EF\u4EE5\u4E00\u952E\u5168\u9009\u3002"],
          ["3. \u70B9\u51FB\u6267\u884C\u540C\u6B65", "\u9700\u8981\u8986\u76D6\u65E7\u5185\u5BB9\u65F6\u52FE\u9009\u201C\u8986\u76D6\u5DF2\u6709\u201D\uFF1B\u4E0D\u786E\u5B9A\u65F6\u5148\u9009\u5C11\u91CF\u5185\u5BB9\u6D4B\u8BD5\u3002"]
        ].forEach(([title, desc]) => {
          const card = steps.createDiv({ cls: "wisemind-bridge-tutorial-step" });
          card.createEl("strong", { text: title });
          card.createEl("span", { text: desc });
        });
        renderBadges("\u4F7F\u7528\u524D\u786E\u8BA4", ["WiseMindAI \u5DF2\u542F\u52A8", "\u672C\u5730\u63A5\u53E3\u53EF\u8FDE\u63A5", "\u53EA\u540C\u6B65 Markdown \u5185\u5BB9"]);
        return;
      }
      if (activeTab === "features") {
        renderCard("\u53CC\u5411\u540C\u6B65", "\u652F\u6301\u628A Obsidian \u5F53\u524D\u4ED3\u5E93\u7684 Markdown \u5BFC\u5165 WiseMindAI\uFF0C\u4E5F\u652F\u6301\u628A WiseMindAI \u7684\u7B14\u8BB0\u3001\u6587\u6863\u3001\u77E5\u8BC6\u5E93\u540C\u6B65\u56DE Obsidian\u3002");
        renderCard("\u6587\u4EF6\u5939\u9009\u62E9", "\u6587\u4EF6\u5939\u53EF\u4EE5\u5C55\u5F00\u3001\u6536\u8D77\u3001\u641C\u7D22\u548C\u5168\u9009\uFF0C\u9002\u5408\u53EA\u540C\u6B65\u67D0\u51E0\u4E2A\u76EE\u5F55\u3002");
        renderCard("\u540C\u6B65\u65B9\u6848", "\u5E38\u7528\u540C\u6B65\u8303\u56F4\u53EF\u4EE5\u4FDD\u5B58\u4E3A\u65B9\u6848\uFF0C\u4E0B\u6B21\u6253\u5F00\u540E\u76F4\u63A5\u5E94\u7528\u65B9\u6848\u5E76\u6267\u884C\u3002");
        renderCard("\u540C\u6B65\u5386\u53F2", "\u53EF\u4EE5\u67E5\u770B\u6BCF\u6B21\u540C\u6B65\u7684\u65F6\u95F4\u3001\u65B9\u5411\u3001\u6765\u6E90\u6587\u4EF6\u5939\u3001\u76EE\u6807\u4F4D\u7F6E\u548C\u6587\u4EF6\u540D\u79F0\u3002");
        return;
      }
      renderCard("\u8986\u76D6\u5DF2\u6709", "\u5F00\u542F\u540E\uFF0C\u5982\u679C\u76EE\u6807\u4F4D\u7F6E\u5DF2\u7ECF\u6709\u540C\u540D\u5185\u5BB9\uFF0C\u4F1A\u8986\u76D6\u65E7\u5185\u5BB9\uFF1B\u5173\u95ED\u65F6\u4F1A\u5C3D\u91CF\u521B\u5EFA\u65B0\u6587\u4EF6\uFF0C\u907F\u514D\u8BEF\u8986\u76D6\u3002");
      renderCard("\u5305\u542B\u6587\u4EF6\u5939", "\u53EA\u5728 WiseMindAI -> Obsidian \u65F6\u51FA\u73B0\u3002\u5F00\u542F\u4F1A\u4FDD\u7559 WiseMindAI \u6587\u4EF6\u5939\u5C42\u7EA7\uFF0C\u5173\u95ED\u5219\u628A\u5185\u5BB9\u5E73\u94FA\u5199\u5165\u76EE\u6807\u6587\u4EF6\u5939\u3002");
      renderCard("\u5199\u5165 Obsidian \u76EE\u6807", "\u9009\u62E9 WiseMindAI \u5185\u5BB9\u540C\u6B65\u56DE Obsidian \u65F6\uFF0C\u53EF\u4EE5\u9009\u62E9\u4E00\u4E2A\u6216\u591A\u4E2A\u76EE\u6807\u6587\u4EF6\u5939\uFF0C\u4E5F\u53EF\u4EE5\u65B0\u5EFA\u6587\u4EF6\u5939\u3002");
      renderCard("\u540C\u6B65\u65B9\u6848\u9ED8\u8BA4\u503C", "\u53EF\u4EE5\u628A\u67D0\u4E2A\u65B9\u6848\u8BBE\u4E3A\u9ED8\u8BA4\u65B9\u6848\uFF0C\u63D2\u4EF6\u4E0B\u6B21\u6253\u5F00\u65F6\u4F1A\u81EA\u52A8\u5957\u7528\u3002");
    };
    renderTutorialTabs();
    renderTutorialContent();
    const actions = modal.createDiv({ cls: "wisemind-bridge-dialog-actions" });
    actions.appendChild(createTextButton("\u6211\u77E5\u9053\u4E86", () => overlay.remove(), this.getIconSvg("check-circle.svg")));
  }
  renderPlanBar() {
    if (!this.planBarEl)
      return;
    this.planBarEl.empty();
    const label = this.planBarEl.createDiv({ cls: "wisemind-bridge-plan-label" });
    label.createEl("strong", { text: "\u540C\u6B65\u65B9\u6848" });
    label.createEl("span", {
      cls: "wisemind-bridge-muted",
      text: this.getActivePlanName() ? `\u5F53\u524D\uFF1A${this.getActivePlanName()}` : "\u53EF\u4FDD\u5B58\u5F53\u524D\u9009\u62E9\uFF0C\u4E0B\u6B21\u76F4\u63A5\u5957\u7528\u3002"
    });
    const controls = this.planBarEl.createDiv({ cls: "wisemind-bridge-plan-controls" });
    controls.append(
      createTextButton("\u9009\u62E9\u65B9\u6848", () => this.openPlanPicker(), this.getIconSvg("bookmark-square.svg")),
      createTextButton("\u4FDD\u5B58\u65B0\u65B9\u6848", () => this.openSavePlanDialog(), this.getIconSvg("plus.svg"))
    );
    if (this.plugin.settings.defaultSyncPlanId) {
      controls.appendChild(createTextButton("\u53D6\u6D88\u9009\u4E2D\u65B9\u6848", async () => {
        this.plugin.settings.defaultSyncPlanId = "";
        await this.plugin.saveSettings();
        this.renderPlanBar();
        new import_obsidian2.Notice("\u5DF2\u53D6\u6D88\u9009\u4E2D\u540C\u6B65\u65B9\u6848");
      }, this.getIconSvg("x-mark.svg")));
    }
  }
  openPlanPicker() {
    const overlay = this.createDialog("\u9009\u62E9\u540C\u6B65\u65B9\u6848");
    const modal = overlay.querySelector(".wisemind-bridge-dialog");
    const plans = () => [...this.plugin.settings.syncPlans || []].sort((a, b) => b.updatedAt - a.updatedAt);
    let selectedId = this.plugin.settings.defaultSyncPlanId || plans()[0]?.id || "";
    const list = modal.createDiv({ cls: "wisemind-bridge-plan-list" });
    const renderList = () => {
      list.empty();
      if (!plans().length) {
        list.appendChild(renderEmpty("\u8FD8\u6CA1\u6709\u4FDD\u5B58\u8FC7\u540C\u6B65\u65B9\u6848\u3002"));
        return;
      }
      plans().forEach((plan) => {
        const row = list.createEl("label", { cls: "wisemind-bridge-plan-row" });
        const radio = row.createEl("input");
        radio.type = "radio";
        radio.name = "wisemind-sync-plan";
        radio.checked = plan.id === selectedId;
        radio.onchange = () => {
          selectedId = plan.id;
        };
        const text = row.createDiv({ cls: "wisemind-bridge-plan-row-text" });
        const title = text.createDiv({ cls: "wisemind-bridge-plan-title-line" });
        title.createEl("strong", { text: plan.name });
        if (plan.id === this.plugin.settings.defaultSyncPlanId) {
          title.createEl("span", { cls: "wisemind-bridge-badge-soft is-primary", text: "\u9ED8\u8BA4" });
        }
        text.createEl("span", {
          cls: "wisemind-bridge-muted",
          text: `${plan.direction === "to-wisemind" ? "Obsidian -> WiseMindAI" : "WiseMindAI -> Obsidian"} \xB7 ${formatDateTime(plan.updatedAt)}`
        });
        const actions = row.createDiv({ cls: "wisemind-bridge-plan-row-actions" });
        actions.append(
          createIconButton(createInlineIcon(this.getIconSvg("check-circle.svg"), "\u5E94\u7528"), "\u5E94\u7528", async () => {
            selectedId = plan.id;
            this.applyPlan(plan);
            this.plugin.settings.defaultSyncPlanId = plan.id;
            await this.plugin.saveSettings();
            overlay.remove();
            this.renderDynamic();
            this.setResult(`\u5DF2\u5957\u7528\u540C\u6B65\u65B9\u6848\uFF1A${plan.name}`);
          }),
          createIconButton(createInlineIcon(this.getIconSvg("pencil-square.svg"), "\u91CD\u547D\u540D"), "\u91CD\u547D\u540D", async () => {
            selectedId = plan.id;
            const name = window.prompt("\u8F93\u5165\u65B0\u7684\u65B9\u6848\u540D\u79F0", plan.name)?.trim();
            if (!name)
              return;
            plan.name = name;
            plan.updatedAt = Date.now();
            await this.plugin.saveSettings();
            this.renderPlanBar();
            renderList();
            new import_obsidian2.Notice("\u540C\u6B65\u65B9\u6848\u5DF2\u91CD\u547D\u540D");
          }),
          ...plan.id === this.plugin.settings.defaultSyncPlanId ? [] : [
            createIconButton(createInlineIcon(this.getIconSvg("bookmark-square.svg"), "\u8BBE\u4E3A\u9ED8\u8BA4"), "\u8BBE\u4E3A\u9ED8\u8BA4", async () => {
              selectedId = plan.id;
              this.plugin.settings.defaultSyncPlanId = plan.id;
              await this.plugin.saveSettings();
              this.renderPlanBar();
              renderList();
              new import_obsidian2.Notice("\u5DF2\u8BBE\u7F6E\u4E3A\u9ED8\u8BA4\u540C\u6B65\u65B9\u6848");
            })
          ],
          createIconButton(createInlineIcon(this.getIconSvg("trash.svg"), "\u5220\u9664"), "\u5220\u9664", async () => {
            selectedId = plan.id;
            if (!window.confirm(`\u786E\u5B9A\u5220\u9664\u540C\u6B65\u65B9\u6848\u300C${plan.name}\u300D\u5417\uFF1F`))
              return;
            this.plugin.settings.syncPlans = this.plugin.settings.syncPlans.filter((item) => item.id !== plan.id);
            if (this.plugin.settings.defaultSyncPlanId === plan.id)
              this.plugin.settings.defaultSyncPlanId = "";
            selectedId = this.plugin.settings.defaultSyncPlanId || this.plugin.settings.syncPlans[0]?.id || "";
            await this.plugin.saveSettings();
            this.renderPlanBar();
            renderList();
            new import_obsidian2.Notice("\u540C\u6B65\u65B9\u6848\u5DF2\u5220\u9664");
          })
        );
      });
    };
    renderList();
  }
  openSavePlanDialog() {
    const overlay = this.createDialog("\u4FDD\u5B58\u65B0\u65B9\u6848");
    const modal = overlay.querySelector(".wisemind-bridge-dialog");
    const summary = this.getCurrentPlanSummary();
    const summaryWrap = modal.createDiv({ cls: "wisemind-bridge-plan-summary" });
    summary.forEach((item) => {
      const row = summaryWrap.createDiv({ cls: "wisemind-bridge-summary-row" });
      row.createEl("span", { text: item.label });
      const badges = row.createDiv({ cls: "wisemind-bridge-badges" });
      const values = item.values.length ? item.values : [item.emptyText];
      values.forEach((value) => badges.createEl("span", { cls: "wisemind-bridge-badge-soft", text: value }));
    });
    const input = modal.createEl("input", {
      cls: "wisemind-bridge-plan-name",
      attr: { placeholder: "\u65B9\u6848\u540D\u79F0" }
    });
    input.value = this.pendingPlanName;
    input.oninput = () => {
      this.pendingPlanName = input.value;
    };
    window.requestAnimationFrame(() => input.focus());
    const actions = modal.createDiv({ cls: "wisemind-bridge-dialog-actions" });
    actions.appendChild(createTextButton("\u4FDD\u5B58", async () => {
      await this.saveCurrentAsPlan(input.value);
      overlay.remove();
    }, this.getIconSvg("check-circle.svg")));
  }
  openHistory() {
    const overlay = document.createElement("div");
    overlay.className = "wisemind-bridge-history-overlay";
    const modal = overlay.createDiv({ cls: "wisemind-bridge-history-modal" });
    const header = modal.createDiv({ cls: "wisemind-bridge-history-title" });
    header.createEl("h2", { text: "\u540C\u6B65\u5386\u53F2" });
    header.appendChild(createIconButton(createInlineIcon(this.getIconSvg("x-mark.svg"), "\u5173\u95ED"), "\u5173\u95ED", () => overlay.remove()));
    let activeDirection = "to-wisemind";
    let search = "";
    const tabs = modal.createDiv({ cls: "wisemind-bridge-direction-tabs wisemind-bridge-history-tabs" });
    const searchRow = modal.createDiv({ cls: "wisemind-bridge-history-tools" });
    const searchInput = searchRow.createEl("input", {
      cls: "wisemind-bridge-search",
      attr: { placeholder: "\u641C\u7D22\u6587\u4EF6\u3001\u6587\u4EF6\u5939\u6216\u76EE\u6807" }
    });
    searchRow.appendChild(createTextButton("\u6E05\u7A7A\u5386\u53F2", async () => {
      if (!window.confirm("\u786E\u5B9A\u6E05\u7A7A\u6240\u6709\u540C\u6B65\u5386\u53F2\u5417\uFF1F"))
        return;
      this.plugin.settings.syncHistory = [];
      await this.plugin.saveSettings();
      renderHistory();
      new import_obsidian2.Notice("\u540C\u6B65\u5386\u53F2\u5DF2\u6E05\u7A7A");
    }, this.getIconSvg("trash.svg")));
    const list = modal.createDiv({ cls: "wisemind-bridge-history-list-wrap" });
    const renderTabs = () => {
      tabs.empty();
      tabs.append(
        this.renderHistoryTab("to-wisemind", "Obsidian -> WiseMindAI", activeDirection, () => {
          activeDirection = "to-wisemind";
          renderHistory();
        }),
        this.renderHistoryTab("to-obsidian", "WiseMindAI -> Obsidian", activeDirection, () => {
          activeDirection = "to-obsidian";
          renderHistory();
        })
      );
    };
    const renderHistory = () => {
      renderTabs();
      list.empty();
      const keyword = search.trim().toLowerCase();
      const history = (this.plugin.settings.syncHistory || []).filter((item) => item.direction === activeDirection).filter((item) => !keyword || [
        item.sourceLabel,
        item.targetLabel,
        ...item.sourceFolders,
        ...item.targetFolders,
        ...item.itemTitles
      ].join(" ").toLowerCase().includes(keyword));
      if (!history.length) {
        list.appendChild(renderEmpty(keyword ? "\u6CA1\u6709\u5339\u914D\u7684\u540C\u6B65\u5386\u53F2\u3002" : "\u6682\u65E0\u540C\u6B65\u8BB0\u5F55\u3002"));
        return;
      }
      history.forEach((item) => {
        const card = modal.createDiv({ cls: "wisemind-bridge-history-card" });
        const cardHeader = card.createDiv({ cls: "wisemind-bridge-history-header" });
        cardHeader.createEl("strong", {
          text: item.direction === "to-wisemind" ? "Obsidian -> WiseMindAI" : "WiseMindAI -> Obsidian"
        });
        cardHeader.createEl("span", { text: formatDateTime(item.createdAt) });
        card.createDiv({
          cls: "wisemind-bridge-muted",
          text: `\u521B\u5EFA ${item.created}\uFF0C\u66F4\u65B0 ${item.updated}\uFF0C\u8DF3\u8FC7 ${item.skipped}\uFF0C\u5931\u8D25 ${item.failed}`
        });
        renderHistoryBadges(card, "\u6765\u6E90\u6587\u4EF6\u5939", item.sourceFolders);
        renderHistoryBadges(card, "\u76EE\u6807\u4F4D\u7F6E", item.targetFolders);
        renderHistoryBadges(card, "\u6587\u4EF6\u540D\u79F0", item.itemTitles);
        list.appendChild(card);
      });
    };
    searchInput.oninput = () => {
      search = searchInput.value;
      renderHistory();
      window.requestAnimationFrame(() => {
        searchInput.focus();
        searchInput.setSelectionRange(search.length, search.length);
      });
    };
    renderHistory();
    overlay.onclick = (event) => {
      if (event.target === overlay)
        overlay.remove();
    };
    this.contentEl.appendChild(overlay);
  }
  renderHistoryTab(direction, text, activeDirection, onClick) {
    const button = document.createElement("button");
    button.className = `wisemind-bridge-tab${activeDirection === direction ? " is-active" : ""}`;
    button.textContent = text;
    button.onclick = onClick;
    return button;
  }
  renderFlow() {
    if (!this.flowEl)
      return;
    this.flowEl.empty();
    if (this.direction === "to-wisemind") {
      this.renderObsidianToWiseMindFlow(this.flowEl);
    } else {
      this.renderWiseMindToObsidianFlow(this.flowEl);
    }
  }
  renderObsidianToWiseMindFlow(parent) {
    const sourcePanel = renderPanel({
      title: "Obsidian \u5F53\u524D\u4ED3\u5E93",
      desc: "\u9009\u62E9\u8981\u53D1\u9001\u7684 Markdown",
      countText: `\u5DF2\u9009 ${this.selectedObsidian.size} \u7BC7`,
      searchValue: this.searches.obsidianSource,
      searchPlaceholder: "\u641C\u7D22\u6587\u4EF6\u5939\u6216\u7B14\u8BB0",
      allSelected: this.getFilteredObsidianKeys().every((key) => this.selectedObsidian.has(key)) && this.getFilteredObsidianKeys().length > 0,
      onToggleAll: () => this.toggleObsidianSourceAll(),
      onSearch: (value) => {
        this.searches.obsidianSource = value;
        this.renderFlow();
        this.focusSearch("\u641C\u7D22\u6587\u4EF6\u5939\u6216\u7B14\u8BB0", value.length);
      }
    });
    const sourceList = sourcePanel.createDiv({ cls: "wisemind-bridge-list" });
    const obsidianGroups = this.getFilteredObsidianGroups();
    obsidianGroups.forEach((group) => {
      sourceList.appendChild(this.renderTreeGroup({
        group,
        selected: this.selectedObsidian,
        keyOf: (item) => item.path,
        titleOf: (item) => item.title,
        metaOf: (item) => item.path,
        showActions: false,
        onRender: () => {
          this.renderFlowPreservingScroll();
          this.renderToolbar();
        }
      }));
    });
    if (!obsidianGroups.length) {
      sourceList.appendChild(renderEmpty(this.obsidianItems.length ? "\u6CA1\u6709\u5339\u914D\u7684\u7B14\u8BB0\u3002" : "\u5F53\u524D Obsidian \u4ED3\u5E93\u91CC\u6CA1\u6709\u53EF\u540C\u6B65\u7684 Markdown \u7B14\u8BB0\u3002"));
    }
    const targetPanel = renderPanel({
      title: "\u4FDD\u5B58\u5230 WiseMindAI",
      desc: "\u9009\u62E9\u76EE\u6807\u6587\u4EF6\u5939\u6216\u77E5\u8BC6\u5E93",
      countText: `\u5DF2\u9009 ${this.selectedWiseMindDestinations.size} \u4E2A\u76EE\u6807`,
      searchValue: this.searches.wiseMindTarget,
      searchPlaceholder: "\u641C\u7D22\u76EE\u6807",
      allSelected: this.getFilteredDestinationKeys().every((key) => this.selectedWiseMindDestinations.has(key)) && this.getFilteredDestinationKeys().length > 0,
      onToggleAll: this.wiseMindConnectionError ? void 0 : () => this.toggleWiseMindTargetAll(),
      onSearch: (value) => {
        this.searches.wiseMindTarget = value;
        this.renderFlow();
        this.focusSearch("\u641C\u7D22\u76EE\u6807", value.length);
      }
    });
    const targetList = targetPanel.createDiv({ cls: "wisemind-bridge-list" });
    if (this.wiseMindConnectionError) {
      targetList.appendChild(renderWiseMindConnectionEmpty(this.wiseMindConnectionError, () => void this.refresh(true), this.getIconSvg("arrow-path.svg")));
    } else {
      const destinationGroups = this.getFilteredDestinationGroups();
      destinationGroups.forEach((group) => {
        targetList.appendChild(this.renderDestinationGroup(group));
      });
      if (!destinationGroups.length)
        targetList.appendChild(renderEmpty("\u6CA1\u6709\u53EF\u4FDD\u5B58\u7684\u4F4D\u7F6E\uFF0C\u8BF7\u5148\u5728 WiseMindAI \u521B\u5EFA\u6587\u6863\u6587\u4EF6\u5939\u3001\u7B14\u8BB0\u6587\u4EF6\u5939\u6216\u77E5\u8BC6\u5E93\u3002"));
    }
    parent.append(sourcePanel, renderArrow(this.getIconSvg("to-right.svg")), targetPanel, this.renderExecuteArea());
  }
  renderWiseMindToObsidianFlow(parent) {
    const sourcePanel = renderPanel({
      title: "WiseMindAI \u672C\u5730\u6570\u636E",
      desc: "\u9009\u62E9\u8981\u5199\u56DE\u7684\u5185\u5BB9",
      countText: `\u5DF2\u9009 ${this.getSelectedWiseMindForActiveCategory().length} \u4E2A`,
      searchValue: this.searches.wiseMindSource,
      searchPlaceholder: "\u641C\u7D22\u5185\u5BB9",
      allSelected: this.getFilteredWiseMindSourceKeys().every((key) => this.selectedWiseMind.has(key)) && this.getFilteredWiseMindSourceKeys().length > 0,
      onToggleAll: this.wiseMindConnectionError ? void 0 : () => this.toggleWiseMindSourceAll(),
      onSearch: (value) => {
        this.searches.wiseMindSource = value;
        this.renderFlow();
        this.focusSearch("\u641C\u7D22\u5185\u5BB9", value.length);
      }
    });
    sourcePanel.appendChild(this.renderWiseMindCategoryTabs());
    const sourceList = sourcePanel.createDiv({ cls: "wisemind-bridge-list" });
    const groups = this.getFilteredWiseMindSourceGroups();
    if (this.wiseMindConnectionError) {
      sourceList.appendChild(renderWiseMindConnectionEmpty(this.wiseMindConnectionError, () => void this.refresh(true), this.getIconSvg("arrow-path.svg")));
    } else if (!groups.length) {
      sourceList.appendChild(renderEmpty(this.searches.wiseMindSource ? "\u6CA1\u6709\u5339\u914D\u7684 WiseMindAI \u5185\u5BB9\u3002" : "\u5F53\u524D\u5206\u7C7B\u6CA1\u6709\u53EF\u540C\u6B65\u7684 Markdown \u5185\u5BB9\u3002"));
    } else {
      groups.forEach((group) => {
        sourceList.appendChild(this.renderTreeGroup({
          group,
          selected: this.selectedWiseMind,
          keyOf: sourceKey,
          titleOf: (item) => item.title,
          metaOf: (item) => item.sourceType === "knowledge-document" ? item.knowledgeBaseName || "\u77E5\u8BC6\u5E93" : sourceTypeLabel(item.sourceType),
          showActions: false,
          onRender: () => {
            this.renderFlowPreservingScroll();
            this.renderToolbar();
          }
        }));
      });
    }
    const targetPanel = renderPanel({
      title: "\u5199\u5165 Obsidian",
      desc: "\u9009\u62E9\u76EE\u6807\u6587\u4EF6\u5939",
      countText: `\u5DF2\u9009 ${this.selectedObsidianTargetFolders.size} \u4E2A\u6587\u4EF6\u5939`,
      searchValue: this.searches.obsidianTarget,
      searchPlaceholder: "\u641C\u7D22 Obsidian \u6587\u4EF6\u5939",
      allSelected: this.getFilteredObsidianTargetFolders().every((folder) => this.selectedObsidianTargetFolders.has(folder)) && this.getFilteredObsidianTargetFolders().length > 0,
      onToggleAll: () => this.toggleObsidianTargetAll(),
      onSearch: (value) => {
        this.searches.obsidianTarget = value;
        this.renderFlow();
        this.focusSearch("\u641C\u7D22 Obsidian \u6587\u4EF6\u5939", value.length);
      }
    });
    const targetList = targetPanel.createDiv({ cls: "wisemind-bridge-list wisemind-bridge-list-to-obsidian" });
    const createRow = targetList.createDiv({ cls: "wisemind-bridge-create-folder" });
    const input = createRow.createEl("input", {
      cls: "wisemind-bridge-search",
      attr: { placeholder: "\u65B0\u5EFA\u6587\u4EF6\u5939\u540D\u79F0" }
    });
    createRow.appendChild(createTextButton("\u521B\u5EFA", () => void this.createObsidianTargetFolder(input.value), this.getIconSvg("plus.svg")));
    const folders = this.getFilteredObsidianTargetFolders();
    folders.forEach((folder) => {
      targetList.appendChild(renderCheckRow({
        checked: this.selectedObsidianTargetFolders.has(folder),
        title: folder || "\u6839\u76EE\u5F55",
        meta: folder ? "\u6587\u4EF6\u5939" : "\u4ED3\u5E93\u6839\u76EE\u5F55",
        onChange: (checked) => {
          toggleSet(this.selectedObsidianTargetFolders, folder, checked);
          this.renderFlowPreservingScroll();
          this.renderToolbar();
        }
      }));
    });
    if (!folders.length)
      targetList.appendChild(renderEmpty("\u6CA1\u6709\u5339\u914D\u7684\u6587\u4EF6\u5939\u3002"));
    parent.append(sourcePanel, renderArrow(this.getIconSvg("to-right.svg")), targetPanel, this.renderExecuteArea());
  }
  renderWiseMindCategoryTabs() {
    const tabs = document.createElement("div");
    tabs.className = "wisemind-bridge-category-tabs";
    const items = [
      { value: "documents", label: "\u6587\u6863" },
      { value: "knowledge", label: "\u77E5\u8BC6\u5E93" },
      { value: "notes", label: "\u7B14\u8BB0" }
    ];
    items.forEach((item) => {
      const button = document.createElement("button");
      button.className = `wisemind-bridge-category-tab${this.activeWiseMindCategory === item.value ? " is-active" : ""}`;
      button.append(createInlineIcon(this.getIconSvg(categoryIcon(item.value)), item.label), document.createTextNode(item.label));
      button.onclick = () => {
        this.activeWiseMindCategory = item.value;
        this.searches.wiseMindSource = "";
        this.renderDynamic();
      };
      tabs.appendChild(button);
    });
    return tabs;
  }
  renderTreeGroup(params) {
    const wrapper = document.createElement("div");
    wrapper.className = "wisemind-bridge-tree-group";
    const expanded = this.expandedGroups.has(params.group.id);
    const groupKeys = params.group.items.map(params.keyOf);
    const selectedCount = groupKeys.filter((key) => params.selected.has(key)).length;
    const allSelected = selectedCount === groupKeys.length && groupKeys.length > 0;
    const header = document.createElement("div");
    header.className = "wisemind-bridge-tree-header";
    const expandButton = createIconButton(
      createInlineIcon(expanded ? this.getIconSvg("chevron-down.svg") : this.getIconSvg("chevron-right.svg"), expanded ? "\u6536\u8D77" : "\u5C55\u5F00"),
      expanded ? "\u6536\u8D77" : "\u5C55\u5F00",
      () => {
        if (expanded)
          this.expandedGroups.delete(params.group.id);
        else
          this.expandedGroups.add(params.group.id);
        params.onRender();
      }
    );
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = allSelected;
    checkbox.indeterminate = selectedCount > 0 && !allSelected;
    checkbox.onchange = () => {
      groupKeys.forEach((key) => toggleSet(params.selected, key, checkbox.checked));
      params.onRender();
    };
    const titleWrap = document.createElement("div");
    titleWrap.className = "wisemind-bridge-tree-title";
    titleWrap.createEl("strong", { text: params.group.title });
    const count = document.createElement("span");
    count.className = "wisemind-bridge-muted wisemind-bridge-tree-count";
    count.textContent = `\u5DF2\u9009 ${selectedCount}/${groupKeys.length}`;
    header.append(expandButton, checkbox, titleWrap, count);
    if (params.showActions !== false) {
      const groupActions = document.createElement("div");
      groupActions.className = "wisemind-bridge-group-actions";
      groupActions.append(
        createTextButton("\u5168\u9009", () => {
          groupKeys.forEach((key) => params.selected.add(key));
          params.onRender();
        }),
        createTextButton("\u53D6\u6D88", () => {
          groupKeys.forEach((key) => params.selected.delete(key));
          params.onRender();
        })
      );
      header.appendChild(groupActions);
    }
    wrapper.appendChild(header);
    if (expanded) {
      const children = wrapper.createDiv({ cls: "wisemind-bridge-tree-children" });
      if (!params.group.items.length) {
        children.appendChild(renderEmpty(params.group.emptyText || "\u6CA1\u6709\u53EF\u9009\u5185\u5BB9\u3002"));
      } else {
        params.group.items.forEach((item) => {
          const key = params.keyOf(item);
          children.appendChild(renderCheckRow({
            checked: params.selected.has(key),
            title: params.titleOf(item),
            meta: params.metaOf(item),
            onChange: (checked) => {
              toggleSet(params.selected, key, checked);
              params.onRender();
            }
          }));
        });
      }
    }
    return wrapper;
  }
  renderDestinationGroup(group) {
    const wrapper = document.createElement("div");
    wrapper.className = "wisemind-bridge-tree-group";
    const expanded = this.expandedGroups.has(group.id);
    const header = document.createElement("div");
    header.className = "wisemind-bridge-tree-header";
    const expandButton = createIconButton(
      createInlineIcon(expanded ? this.getIconSvg("chevron-down.svg") : this.getIconSvg("chevron-right.svg"), expanded ? "\u6536\u8D77" : "\u5C55\u5F00"),
      expanded ? "\u6536\u8D77" : "\u5C55\u5F00",
      () => {
        if (expanded)
          this.expandedGroups.delete(group.id);
        else
          this.expandedGroups.add(group.id);
        this.renderDynamic();
      }
    );
    const titleWrap = document.createElement("div");
    titleWrap.className = "wisemind-bridge-tree-title";
    titleWrap.createEl("strong", { text: group.title });
    titleWrap.createEl("span", { cls: "wisemind-bridge-muted", text: group.subtitle });
    header.append(expandButton, titleWrap);
    wrapper.appendChild(header);
    if (expanded) {
      const children = wrapper.createDiv({ cls: "wisemind-bridge-tree-children" });
      if (!group.children.length) {
        children.appendChild(renderEmpty(group.emptyText));
      } else {
        group.children.forEach((child) => {
          children.appendChild(renderCheckRow({
            checked: this.selectedWiseMindDestinations.has(child.key),
            title: child.title,
            meta: destinationTypeLabel(child.target),
            onChange: (checked) => {
              toggleSet(this.selectedWiseMindDestinations, child.key, checked);
              this.importTargets = this.getImportTargetsFromDestinations();
              this.renderFlowPreservingScroll();
              this.renderToolbar();
            }
          }));
        });
      }
    }
    return wrapper;
  }
  buildObsidianGroups() {
    const groups = /* @__PURE__ */ new Map();
    this.obsidianItems.forEach((item) => {
      const group = item.folderPath || "\u6839\u76EE\u5F55";
      groups.set(group, [...groups.get(group) || [], item]);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => sortRootFirst(a, b)).map(([folder, items]) => ({
      id: `obsidian:${folder}`,
      title: folder,
      subtitle: `${items.length} \u7BC7 Markdown`,
      items
    }));
  }
  buildDestinationGroups(search = "") {
    const documentFolders = ["", ...this.getFolderLabels(this.snapshot?.documentFolders || [])];
    const noteFolders = ["", ...this.getFolderLabels(this.snapshot?.noteFolders || [])];
    const knowledgeBases = (this.snapshot?.knowledgeBases || []).map((item) => safeTitle(item.name, item.title, `\u77E5\u8BC6\u5E93 ${item.id}`));
    const makeItems = (target, values) => values.map((value) => ({
      key: destinationKey(target, value),
      title: value || "\u6839\u76EE\u5F55",
      value,
      target
    })).filter((item) => matchesSearch(`${item.title} ${destinationTypeLabel(item.target)}`, search));
    const groups = [
      {
        id: "destination:documents",
        title: "\u6587\u6863",
        subtitle: `${documentFolders.length} \u4E2A\u6587\u4EF6\u5939`,
        target: "documents",
        children: makeItems("documents", documentFolders),
        emptyText: "\u6CA1\u6709\u5339\u914D\u7684\u6587\u6863\u6587\u4EF6\u5939\u3002"
      },
      {
        id: "destination:knowledge",
        title: "\u77E5\u8BC6\u5E93",
        subtitle: `${knowledgeBases.length} \u4E2A\u77E5\u8BC6\u5E93`,
        target: "knowledge",
        children: makeItems("knowledge", knowledgeBases),
        emptyText: "\u6CA1\u6709\u5339\u914D\u7684\u77E5\u8BC6\u5E93\u3002"
      },
      {
        id: "destination:notes",
        title: "\u7B14\u8BB0",
        subtitle: `${noteFolders.length} \u4E2A\u6587\u4EF6\u5939`,
        target: "notes",
        children: makeItems("notes", noteFolders),
        emptyText: "\u6CA1\u6709\u5339\u914D\u7684\u7B14\u8BB0\u6587\u4EF6\u5939\u3002"
      }
    ];
    return groups.filter((group) => !search.trim() || group.children.length);
  }
  buildWiseMindSourceGroups(category) {
    if (category === "knowledge") {
      const docs = this.wiseMindItems.filter((item) => item.sourceType === "knowledge-document");
      return (this.snapshot?.knowledgeBases || []).map((base) => {
        const title = safeTitle(base.name, base.title, `\u77E5\u8BC6\u5E93 ${base.id}`);
        const items = docs.filter((item) => String(item.raw?.knowledgeBaseId) === String(base.id));
        return {
          id: `wisemind:knowledge:${base.id}`,
          title,
          subtitle: `${items.length} \u7BC7 Markdown`,
          items,
          emptyText: "\u8FD9\u4E2A\u77E5\u8BC6\u5E93\u91CC\u6CA1\u6709 Markdown \u7B14\u8BB0\u3002"
        };
      }).sort((a, b) => a.title.localeCompare(b.title));
    }
    const sourceType = category === "documents" ? "document" : "note";
    const groups = /* @__PURE__ */ new Map();
    this.wiseMindItems.filter((item) => item.sourceType === sourceType).forEach((item) => {
      const group = item.folderPath || "\u672A\u5206\u7EC4";
      groups.set(group, [...groups.get(group) || [], item]);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => sortRootFirst(a === "\u672A\u5206\u7EC4" ? "\u6839\u76EE\u5F55" : a, b === "\u672A\u5206\u7EC4" ? "\u6839\u76EE\u5F55" : b)).map(([folder, items]) => ({
      id: `wisemind:${category}:${folder}`,
      title: folder,
      subtitle: `${items.length} \u6761\u5185\u5BB9`,
      items
    }));
  }
  getFolderLabels(folders) {
    return folders.map((folder) => resolveFolderPath(folder.id, folders) || folder.name).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }
  getFilteredObsidianGroups() {
    return filterGroups(this.buildObsidianGroups(), this.searches.obsidianSource, (item) => `${item.title} ${item.path}`);
  }
  getFilteredObsidianKeys() {
    return this.getFilteredObsidianGroups().flatMap((group) => group.items.map((item) => item.path));
  }
  getFilteredDestinationGroups() {
    return this.buildDestinationGroups(this.searches.wiseMindTarget);
  }
  getFilteredDestinationKeys() {
    return this.getFilteredDestinationGroups().flatMap((group) => group.children.map((item) => item.key));
  }
  getFilteredWiseMindSourceGroups() {
    return filterGroups(
      this.buildWiseMindSourceGroups(this.activeWiseMindCategory),
      this.searches.wiseMindSource,
      (item) => `${item.title} ${item.folderPath} ${item.knowledgeBaseName || ""}`
    );
  }
  getFilteredWiseMindSourceKeys() {
    return this.getFilteredWiseMindSourceGroups().flatMap((group) => group.items.map(sourceKey));
  }
  getFilteredObsidianTargetFolders() {
    return this.getObsidianFolders().filter((folder) => matchesSearch(folder || "\u6839\u76EE\u5F55", this.searches.obsidianTarget));
  }
  toggleObsidianSourceAll() {
    this.toggleKeys(this.selectedObsidian, this.getFilteredObsidianKeys());
  }
  toggleWiseMindTargetAll() {
    this.toggleKeys(this.selectedWiseMindDestinations, this.getFilteredDestinationKeys());
    this.importTargets = this.getImportTargetsFromDestinations();
  }
  toggleWiseMindSourceAll() {
    this.toggleKeys(this.selectedWiseMind, this.getFilteredWiseMindSourceKeys());
  }
  toggleObsidianTargetAll() {
    this.toggleKeys(this.selectedObsidianTargetFolders, this.getFilteredObsidianTargetFolders());
  }
  toggleKeys(set, keys) {
    if (!keys.length)
      return;
    const allSelected = keys.every((key) => set.has(key));
    keys.forEach((key) => {
      if (allSelected)
        set.delete(key);
      else
        set.add(key);
    });
    this.renderFlowPreservingScroll();
    this.renderToolbar();
  }
  renderFlowPreservingScroll() {
    if (!this.flowEl)
      return;
    const scrollTops = this.captureListScroll();
    this.renderFlow();
    this.restoreListScroll(scrollTops);
  }
  captureListScroll() {
    return Array.from(this.flowEl?.querySelectorAll(".wisemind-bridge-list") || []).map((item) => item.scrollTop);
  }
  restoreListScroll(scrollTops) {
    window.requestAnimationFrame(() => {
      Array.from(this.flowEl?.querySelectorAll(".wisemind-bridge-list") || []).forEach((item, index) => {
        item.scrollTop = scrollTops[index] || 0;
      });
    });
  }
  getActivePlanName() {
    return this.plugin.settings.syncPlans.find((plan) => plan.id === this.plugin.settings.defaultSyncPlanId)?.name || "";
  }
  getCurrentPlanSummary() {
    if (this.direction === "to-wisemind") {
      const items2 = this.obsidianItems.filter((item) => this.selectedObsidian.has(item.path));
      const destinations = this.getSelectedDestinations();
      return [
        { label: "\u540C\u6B65\u65B9\u5411", values: ["Obsidian -> WiseMindAI"], emptyText: "\u672A\u9009\u62E9\u65B9\u5411" },
        { label: "\u5DF2\u9009\u5185\u5BB9", values: summarizeValues(items2.map((item) => item.title)), emptyText: "\u672A\u9009\u62E9\u7B14\u8BB0" },
        { label: "\u6765\u6E90\u6587\u4EF6\u5939", values: summarizeValues(items2.map((item) => item.folderPath || "\u6839\u76EE\u5F55")), emptyText: "\u672A\u9009\u62E9\u6587\u4EF6\u5939" },
        { label: "\u4FDD\u5B58\u5230", values: summarizeValues(destinations.map((item) => `${destinationTypeLabel(item.target)}\uFF1A${item.title}`)), emptyText: "\u672A\u9009\u62E9\u76EE\u6807" }
      ];
    }
    const items = this.getSelectedWiseMindForActiveCategory();
    const folders = Array.from(this.selectedObsidianTargetFolders).map((folder) => folder || "\u6839\u76EE\u5F55");
    return [
      { label: "\u540C\u6B65\u65B9\u5411", values: ["WiseMindAI -> Obsidian"], emptyText: "\u672A\u9009\u62E9\u65B9\u5411" },
      { label: "\u5DF2\u9009\u5185\u5BB9", values: summarizeValues(items.map((item) => item.title)), emptyText: "\u672A\u9009\u62E9\u5185\u5BB9" },
      { label: "\u6765\u6E90\u5206\u7C7B", values: [categoryLabel(this.activeWiseMindCategory)], emptyText: "\u672A\u9009\u62E9\u5206\u7C7B" },
      { label: "\u5199\u5165\u6587\u4EF6\u5939", values: summarizeValues(folders), emptyText: "\u672A\u9009\u62E9\u6587\u4EF6\u5939" }
    ];
  }
  createDialog(title) {
    const overlay = document.createElement("div");
    overlay.className = "wisemind-bridge-history-overlay";
    const modal = overlay.createDiv({ cls: "wisemind-bridge-dialog" });
    const header = modal.createDiv({ cls: "wisemind-bridge-history-title" });
    header.createEl("h2", { text: title });
    header.appendChild(createIconButton(createInlineIcon(this.getIconSvg("x-mark.svg"), "\u5173\u95ED"), "\u5173\u95ED", () => overlay.remove()));
    overlay.onclick = (event) => {
      if (event.target === overlay)
        overlay.remove();
    };
    this.contentEl.appendChild(overlay);
    return overlay;
  }
  getSelectedTargetLabels() {
    const selected = Array.from(this.selectedWiseMindDestinations);
    return selected.length ? `${selected.length} \u4E2A\u76EE\u6807` : "\u672A\u9009\u62E9";
  }
  getSelectedWiseMindForActiveCategory() {
    return this.wiseMindItems.filter(
      (item) => this.selectedWiseMind.has(sourceKey(item)) && sourceMatchesCategory(item, this.activeWiseMindCategory)
    );
  }
  captureSelection() {
    return {
      obsidian: new Set(this.selectedObsidian),
      wiseMind: new Set(this.selectedWiseMind),
      wiseMindDestinations: new Set(this.selectedWiseMindDestinations),
      obsidianTargets: new Set(this.selectedObsidianTargetFolders)
    };
  }
  restoreSelection(selection) {
    const obsidianPaths = new Set(this.obsidianItems.map((item) => item.path));
    const wiseMindKeys = new Set(this.wiseMindItems.map(sourceKey));
    const destinationKeys = new Set(this.buildDestinationGroups().flatMap((group) => group.children.map((item) => item.key)));
    const obsidianFolders = new Set(this.getObsidianFolders());
    this.selectedObsidian = new Set(Array.from(selection.obsidian).filter((path) => obsidianPaths.has(path)));
    this.selectedWiseMind = new Set(Array.from(selection.wiseMind).filter((key) => wiseMindKeys.has(key)));
    this.selectedWiseMindDestinations = new Set(Array.from(selection.wiseMindDestinations).filter((key) => destinationKeys.has(key)));
    this.selectedObsidianTargetFolders = new Set(Array.from(selection.obsidianTargets).filter((folder) => obsidianFolders.has(folder)));
    if (!this.selectedWiseMindDestinations.size) {
      this.selectedWiseMindDestinations = new Set(this.getDefaultDestinationKeys());
    }
    if (!this.selectedObsidianTargetFolders.size) {
      this.selectedObsidianTargetFolders = /* @__PURE__ */ new Set([this.plugin.settings.defaultObsidianRootFolder]);
    }
  }
  getImportTargetsFromDestinations() {
    const targets = /* @__PURE__ */ new Set();
    this.getSelectedDestinations().forEach((item) => targets.add(item.target));
    return targets;
  }
  getSelectedDestinations() {
    return this.buildDestinationGroups().flatMap((group) => group.children).filter((item) => this.selectedWiseMindDestinations.has(item.key));
  }
  getDefaultDestinationKeys() {
    return this.buildDestinationGroups().flatMap((group) => {
      if (!this.importTargets.has(group.target))
        return [];
      if (group.target === "documents" || group.target === "notes") {
        return group.children.filter((item) => item.value === "").map((item) => item.key);
      }
      const preferred = group.children.find((item) => item.title === this.plugin.settings.defaultKnowledgeBaseName) || group.children[0];
      return preferred ? [preferred.key] : [];
    });
  }
  getObsidianFolders() {
    const folders = /* @__PURE__ */ new Set([""]);
    (this.app.vault.getAllLoadedFiles?.() || []).forEach((file) => {
      const item = file;
      if (item?.children && typeof item.path === "string" && item.path) {
        folders.add(item.path);
      }
    });
    this.obsidianItems.forEach((item) => {
      const parts = item.folderPath.split("/").filter(Boolean);
      parts.forEach((_, index) => folders.add(parts.slice(0, index + 1).join("/")));
    });
    if (this.plugin.settings.defaultObsidianRootFolder)
      folders.add(this.plugin.settings.defaultObsidianRootFolder);
    this.selectedObsidianTargetFolders.forEach((folder) => folders.add(folder));
    return Array.from(folders).sort(sortRootFirst);
  }
  async createObsidianTargetFolder(value) {
    const folder = value.trim().replace(/^\/+|\/+$/g, "");
    if (!folder) {
      new import_obsidian2.Notice("\u8BF7\u8F93\u5165\u6587\u4EF6\u5939\u540D\u79F0");
      return;
    }
    let current = "";
    for (const part of folder.split("/").filter(Boolean)) {
      current = current ? `${current}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(current)) {
        await this.app.vault.createFolder(current);
      }
    }
    this.selectedObsidianTargetFolders.add(folder);
    this.searches.obsidianTarget = "";
    this.renderDynamic();
    new import_obsidian2.Notice(`\u5DF2\u9009\u62E9\u6587\u4EF6\u5939\uFF1A${folder}`);
  }
  renderExecuteArea() {
    const footer = document.createElement("div");
    footer.className = "wisemind-bridge-execute";
    const overwrite = footer.createEl("label", { cls: "wisemind-bridge-overwrite-toggle" });
    const checkbox = overwrite.createEl("input");
    checkbox.type = "checkbox";
    checkbox.checked = this.overwriteExisting;
    checkbox.onchange = () => {
      this.overwriteExisting = checkbox.checked;
    };
    overwrite.createEl("span", { text: "\u8986\u76D6\u5DF2\u6709" });
    if (this.direction === "to-obsidian") {
      const includeFolders = footer.createEl("label", { cls: "wisemind-bridge-overwrite-toggle" });
      const includeCheckbox = includeFolders.createEl("input");
      includeCheckbox.type = "checkbox";
      includeCheckbox.checked = this.includeObsidianFolders;
      includeCheckbox.onchange = () => {
        this.includeObsidianFolders = includeCheckbox.checked;
      };
      includeFolders.createEl("span", { text: "\u5305\u542B\u6587\u4EF6\u5939" });
    }
    footer.appendChild(createButton("\u6267\u884C\u540C\u6B65", () => this.executeCurrentDirection(), "primary", this.getIconSvg("check-circle.svg")));
    return footer;
  }
  async saveCurrentAsPlan(name) {
    const trimmed = name.trim();
    if (!trimmed) {
      new import_obsidian2.Notice("\u8BF7\u8F93\u5165\u65B9\u6848\u540D\u79F0");
      return;
    }
    const plan = this.createPlan(trimmed);
    this.plugin.settings.syncPlans = [plan, ...this.plugin.settings.syncPlans];
    this.plugin.settings.defaultSyncPlanId = plan.id;
    this.pendingPlanName = "";
    await this.plugin.saveSettings();
    this.renderDynamic();
    this.setResult(`\u5DF2\u4FDD\u5B58\u540C\u6B65\u65B9\u6848\uFF1A${plan.name}`);
    new import_obsidian2.Notice("\u540C\u6B65\u65B9\u6848\u5DF2\u4FDD\u5B58");
  }
  async updateCurrentPlan() {
    const planId = this.plugin.settings.defaultSyncPlanId;
    const index = this.plugin.settings.syncPlans.findIndex((plan) => plan.id === planId);
    if (index === -1) {
      new import_obsidian2.Notice("\u8BF7\u5148\u9009\u62E9\u4E00\u4E2A\u8981\u66F4\u65B0\u7684\u540C\u6B65\u65B9\u6848");
      return;
    }
    const current = this.plugin.settings.syncPlans[index];
    const next = this.createPlan(current.name, current.id);
    this.plugin.settings.syncPlans = this.plugin.settings.syncPlans.map((plan) => plan.id === current.id ? next : plan);
    await this.plugin.saveSettings();
    this.renderDynamic();
    this.setResult(`\u5DF2\u66F4\u65B0\u540C\u6B65\u65B9\u6848\uFF1A${next.name}`);
    new import_obsidian2.Notice("\u540C\u6B65\u65B9\u6848\u5DF2\u66F4\u65B0");
  }
  async deleteCurrentPlan() {
    const planId = this.plugin.settings.defaultSyncPlanId;
    const plan = this.plugin.settings.syncPlans.find((item) => item.id === planId);
    if (!plan) {
      new import_obsidian2.Notice("\u8BF7\u5148\u9009\u62E9\u4E00\u4E2A\u8981\u5220\u9664\u7684\u540C\u6B65\u65B9\u6848");
      return;
    }
    if (!window.confirm(`\u786E\u5B9A\u5220\u9664\u540C\u6B65\u65B9\u6848\u300C${plan.name}\u300D\u5417\uFF1F`))
      return;
    this.plugin.settings.syncPlans = this.plugin.settings.syncPlans.filter((item) => item.id !== plan.id);
    this.plugin.settings.defaultSyncPlanId = "";
    await this.plugin.saveSettings();
    this.renderDynamic();
    this.setResult(`\u5DF2\u5220\u9664\u540C\u6B65\u65B9\u6848\uFF1A${plan.name}`);
  }
  createPlan(name, id = `plan-${Date.now()}`) {
    const obsidianGroups = this.buildObsidianGroups();
    const wiseMindGroups = this.buildWiseMindSourceGroups(this.activeWiseMindCategory);
    return {
      id,
      name,
      direction: this.direction,
      obsidianPaths: Array.from(this.selectedObsidian),
      obsidianFolders: getFullySelectedGroupIds(obsidianGroups, this.selectedObsidian, (item) => item.path),
      wiseMindDestinationKeys: Array.from(this.selectedWiseMindDestinations),
      obsidianTargetFolders: Array.from(this.selectedObsidianTargetFolders),
      obsidianTargetFolder: Array.from(this.selectedObsidianTargetFolders)[0] || "",
      wiseMindKeys: Array.from(this.selectedWiseMind),
      wiseMindGroupIds: getFullySelectedGroupIds(wiseMindGroups, this.selectedWiseMind, sourceKey),
      wiseMindCategory: this.activeWiseMindCategory,
      importTargets: {
        notes: this.importTargets.has("notes"),
        documents: this.importTargets.has("documents"),
        knowledge: this.importTargets.has("knowledge")
      },
      updatedAt: Date.now()
    };
  }
  applyDefaultPlan() {
    const plan = this.plugin.settings.syncPlans.find((item) => item.id === this.plugin.settings.defaultSyncPlanId);
    if (plan)
      this.applyPlan(plan);
  }
  applyPlan(plan) {
    this.direction = plan.direction;
    this.activeWiseMindCategory = plan.wiseMindCategory || "documents";
    this.importTargets = targetSetFromSettings(plan.importTargets);
    this.selectedWiseMindDestinations = new Set(plan.wiseMindDestinationKeys || []);
    if (!this.selectedWiseMindDestinations.size) {
      this.selectedWiseMindDestinations = new Set(this.getDefaultDestinationKeys());
    }
    this.selectedObsidianTargetFolders = new Set(
      plan.obsidianTargetFolders?.length ? plan.obsidianTargetFolders : [plan.obsidianTargetFolder ?? this.plugin.settings.defaultObsidianRootFolder]
    );
    const obsidianPaths = new Set(plan.obsidianPaths || []);
    this.buildObsidianGroups().forEach((group) => {
      if ((plan.obsidianFolders || []).includes(group.id)) {
        group.items.forEach((item) => obsidianPaths.add(item.path));
      }
    });
    this.selectedObsidian = new Set(this.obsidianItems.filter((item) => obsidianPaths.has(item.path)).map((item) => item.path));
    const wiseMindKeys = new Set(plan.wiseMindKeys || []);
    this.buildWiseMindSourceGroups(this.activeWiseMindCategory).forEach((group) => {
      if ((plan.wiseMindGroupIds || []).includes(group.id)) {
        group.items.forEach((item) => wiseMindKeys.add(sourceKey(item)));
      }
    });
    this.selectedWiseMind = new Set(this.wiseMindItems.filter((item) => wiseMindKeys.has(sourceKey(item))).map(sourceKey));
  }
  async executeCurrentDirection() {
    if (this.direction === "to-wisemind")
      await this.importToWiseMind();
    else
      await this.importToObsidian();
  }
  async importToWiseMind() {
    const items = uniqueByPath(this.obsidianItems.filter((item) => this.selectedObsidian.has(item.path)));
    const destinations = this.getSelectedDestinations();
    if (!items.length) {
      new import_obsidian2.Notice("\u8BF7\u5148\u5728\u5DE6\u4FA7\u9009\u62E9\u8981\u5BFC\u5165 WiseMindAI \u7684 Obsidian \u7B14\u8BB0\u6216\u6587\u4EF6\u5939");
      return;
    }
    if (!destinations.length) {
      new import_obsidian2.Notice("\u8BF7\u9009\u62E9 WiseMindAI \u76EE\u6807\u6587\u4EF6\u5939\u6216\u77E5\u8BC6\u5E93");
      return;
    }
    const noteFolderPaths = destinations.filter((item) => item.target === "notes").map((item) => item.value);
    const documentFolderPaths = destinations.filter((item) => item.target === "documents").map((item) => item.value);
    const knowledgeBaseNames = destinations.filter((item) => item.target === "knowledge").map((item) => item.value || this.plugin.settings.defaultKnowledgeBaseName);
    const targets = {
      notes: noteFolderPaths.length > 0,
      documents: documentFolderPaths.length > 0,
      knowledge: knowledgeBaseNames.length > 0
    };
    this.plugin.statusBar.setSyncing();
    const result = await runObsidianToWiseMindImport({
      items,
      api: this.plugin.api,
      targets,
      noteFolderPaths,
      documentFolderPaths,
      knowledgeBaseNames,
      duplicatePolicy: this.overwriteExisting ? "update" : "duplicate",
      knowledgeBaseName: this.plugin.settings.defaultKnowledgeBaseName,
      chunkSize: this.plugin.settings.chunkSize,
      onProgress: (progress) => this.setResult(formatResult(progress))
    });
    this.plugin.statusBar.setResult(result);
    this.setResult(formatResult(result));
    await this.recordHistory({
      direction: "to-wisemind",
      sourceLabel: "Obsidian \u5F53\u524D\u4ED3\u5E93",
      targetLabel: "WiseMindAI",
      sourceFolders: unique(items.map((item) => item.folderPath || "\u6839\u76EE\u5F55")),
      targetFolders: destinations.map((item) => `${destinationTypeLabel(item.target)}\uFF1A${item.title}`),
      itemTitles: items.map((item) => item.title),
      result
    });
    new import_obsidian2.Notice(`\u5BFC\u5165\u5B8C\u6210\uFF1A\u6210\u529F ${result.created + result.updated}\uFF0C\u5931\u8D25 ${result.failed}`);
    await this.refresh(true);
  }
  async importToObsidian() {
    const items = this.getSelectedWiseMindForActiveCategory();
    if (!items.length) {
      new import_obsidian2.Notice("\u8BF7\u5148\u5728\u5DE6\u4FA7\u9009\u62E9\u8981\u540C\u6B65\u5230 Obsidian \u7684 WiseMindAI \u5185\u5BB9\u6216\u6587\u4EF6\u5939");
      return;
    }
    const rootFolders = Array.from(this.selectedObsidianTargetFolders);
    if (!rootFolders.length) {
      new import_obsidian2.Notice("\u8BF7\u9009\u62E9 Obsidian \u76EE\u6807\u6587\u4EF6\u5939");
      return;
    }
    this.plugin.statusBar.setSyncing();
    const result = await runWiseMindToObsidianImport({
      app: this.app,
      items,
      rootFolder: rootFolders[0] || "",
      rootFolders,
      includeFolderStructure: this.includeObsidianFolders,
      duplicatePolicy: this.overwriteExisting ? "update" : "duplicate",
      chunkSize: this.plugin.settings.chunkSize,
      onProgress: (progress) => this.setResult(formatResult(progress))
    });
    this.plugin.statusBar.setResult(result);
    this.setResult(formatResult(result));
    await this.recordHistory({
      direction: "to-obsidian",
      sourceLabel: `WiseMindAI ${categoryLabel(this.activeWiseMindCategory)}`,
      targetLabel: "Obsidian \u5F53\u524D\u4ED3\u5E93",
      sourceFolders: unique(items.map((item) => item.sourceType === "knowledge-document" ? item.knowledgeBaseName || "\u77E5\u8BC6\u5E93" : item.folderPath || "\u672A\u5206\u7EC4")),
      targetFolders: rootFolders.map((folder) => folder || "\u6839\u76EE\u5F55"),
      itemTitles: items.map((item) => item.title),
      result
    });
    new import_obsidian2.Notice(`\u540C\u6B65\u5B8C\u6210\uFF1A\u6210\u529F ${result.created + result.updated}\uFF0C\u5931\u8D25 ${result.failed}`);
    await this.refresh(true);
  }
  async recordHistory(params) {
    const item = {
      id: `history-${Date.now()}`,
      createdAt: Date.now(),
      direction: params.direction,
      sourceLabel: params.sourceLabel,
      targetLabel: params.targetLabel,
      sourceFolders: unique(params.sourceFolders),
      targetFolders: unique(params.targetFolders),
      itemTitles: unique(params.itemTitles),
      created: params.result.created,
      updated: params.result.updated,
      skipped: params.result.skipped,
      failed: params.result.failed
    };
    this.plugin.settings.syncHistory = [item, ...this.plugin.settings.syncHistory || []].slice(0, 50);
    await this.plugin.saveSettings();
  }
  setResult(text) {
  }
  focusSearch(placeholder, caret) {
    window.requestAnimationFrame(() => {
      const input = Array.from(this.contentEl.querySelectorAll("input")).find((item) => item.getAttribute("placeholder") === placeholder);
      if (!input)
        return;
      input.focus();
      input.setSelectionRange(caret, caret);
    });
  }
  getIconSvg(name) {
    return ICONS[name] || "";
  }
};
var ICONS = {
  "wisemindai-logo.svg": wisemindai_logo_default,
  "document.svg": document_default,
  "home.svg": home_default,
  "knowledge.svg": knowledge_default,
  "markdown.svg": markdown_default,
  "note.svg": note_default,
  "sync-to-obsidian.svg": sync_to_obsidian_default,
  "sync-to-wisemind.svg": sync_to_wisemind_default,
  "to-right.svg": to_right_default,
  "chevron-down.svg": chevron_down_default,
  "chevron-right.svg": chevron_right_default,
  "arrow-path.svg": arrow_path_default,
  "bookmark-square.svg": bookmark_square_default,
  "check-circle.svg": check_circle_default,
  "clock.svg": clock_default,
  "pencil-square.svg": pencil_square_default,
  "plus.svg": plus_default,
  "trash.svg": trash_default,
  "x-mark.svg": x_mark_default
};
var renderSummaryBlock = (title, items) => {
  const block = document.createElement("div");
  block.className = "wisemind-bridge-summary-block";
  block.createEl("strong", { text: title });
  const metrics = block.createDiv({ cls: "wisemind-bridge-summary-metrics" });
  items.forEach((item) => {
    const metric = metrics.createDiv({ cls: "wisemind-bridge-summary-metric" });
    metric.createEl("span", { text: String(item.value) });
    metric.createEl("em", { text: item.label });
  });
  return block;
};
var renderPanel = (params) => {
  const panel = document.createElement("section");
  panel.className = "wisemind-bridge-panel";
  const header = panel.createDiv({ cls: "wisemind-bridge-panel-header" });
  const text = header.createDiv();
  text.createEl("strong", { text: params.title });
  text.createEl("span", { cls: "wisemind-bridge-muted", text: params.desc });
  const right = header.createDiv({ cls: "wisemind-bridge-panel-right" });
  if (params.countText) {
    right.createEl("span", { cls: "wisemind-bridge-panel-count", text: params.countText });
  }
  if (params.onToggleAll) {
    const actions = right.createDiv({ cls: "wisemind-bridge-group-actions" });
    actions.append(createTextButton(params.allSelected ? "\u6E05\u7A7A" : "\u5168\u9009", params.onToggleAll));
  }
  if (params.onSearch) {
    const search = panel.createEl("input", {
      cls: "wisemind-bridge-search",
      attr: { placeholder: params.searchPlaceholder || "\u641C\u7D22" }
    });
    search.value = params.searchValue || "";
    search.oninput = () => params.onSearch?.(search.value);
  }
  return panel;
};
var renderArrow = (icon) => {
  const arrow = document.createElement("div");
  arrow.className = "wisemind-bridge-arrow";
  arrow.appendChild(createInlineIcon(icon, "\u540C\u6B65\u65B9\u5411"));
  return arrow;
};
var renderCheckRow = (params) => {
  const row = document.createElement("label");
  row.className = "wisemind-bridge-row";
  const left = document.createElement("span");
  left.className = "wisemind-bridge-row-main";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = params.checked;
  checkbox.onchange = () => params.onChange(checkbox.checked);
  const title = document.createElement("span");
  title.className = "wisemind-bridge-row-title";
  title.textContent = params.title;
  left.append(checkbox, title);
  const meta = document.createElement("span");
  meta.className = "wisemind-bridge-muted wisemind-bridge-row-meta";
  meta.textContent = params.meta;
  row.append(left, meta);
  return row;
};
var renderSelectField = (params) => {
  const row = document.createElement("label");
  row.className = "wisemind-bridge-context-select-row";
  const header = row.createDiv({ cls: "wisemind-bridge-context-section-header" });
  header.createEl("strong", { text: params.title });
  header.createEl("span", { cls: "wisemind-bridge-muted", text: params.desc });
  if (!params.options.length) {
    row.createEl("span", { cls: "wisemind-bridge-muted", text: params.emptyText || "\u6CA1\u6709\u53EF\u9009\u62E9\u7684\u76EE\u6807\u3002" });
    return row;
  }
  const select = row.createEl("select", { cls: "wisemind-bridge-select" });
  params.options.forEach((option) => {
    const item = select.createEl("option", { text: option.title });
    item.value = option.value;
  });
  select.value = params.options.some((option) => option.value === params.selected) ? params.selected : params.options[0]?.value || "";
  select.onchange = () => params.onChange(select.value);
  params.onChange(select.value);
  return row;
};
var renderEmpty = (text) => {
  const empty = document.createElement("div");
  empty.className = "wisemind-bridge-empty";
  empty.textContent = text;
  return empty;
};
var renderWiseMindConnectionEmpty = (message, onRetry, retryIcon) => {
  const empty = document.createElement("div");
  empty.className = "wisemind-bridge-empty wisemind-bridge-connection-empty";
  empty.createEl("strong", { text: "\u672A\u8FDE\u63A5 WiseMindAI" });
  empty.createEl("p", { text: message || "\u8BF7\u5148\u542F\u52A8 WiseMindAI \u5E94\u7528\uFF0C\u5E76\u786E\u8BA4\u672C\u5730\u63A5\u53E3\u5DF2\u5F00\u542F\u3002" });
  empty.appendChild(createButton("\u91CD\u65B0\u8FDE\u63A5", onRetry, "secondary", retryIcon));
  const link = empty.createEl("a", {
    text: "\u524D\u5F80 wisemindai.app \u4E0B\u8F7D\u5B89\u88C5",
    attr: {
      href: "https://wisemindai.app",
      target: "_blank",
      rel: "noopener noreferrer"
    }
  });
  link.onclick = (event) => event.stopPropagation();
  empty.createEl("p", { text: "\u5B89\u88C5\u5E76\u542F\u52A8\u540E\uFF0C\u5728 WiseMindAI \u5DE6\u4E0B\u89D2\u6253\u5F00\u8BBE\u7F6E\uFF0C\u8FDB\u5165\u300C\u7CFB\u7EDF\u8BBE\u7F6E\u300D->\u300C\u672C\u5730 API \u670D\u52A1\u300D\uFF0C\u5F00\u542F\u670D\u52A1\u5373\u53EF\u8FDE\u63A5\u3002" });
  return empty;
};
var createButton = (text, onClick, kind, icon) => {
  const button = document.createElement("button");
  button.className = `wisemind-bridge-button is-${kind}`;
  if (icon)
    button.append(createInlineIcon(icon, text));
  button.append(document.createTextNode(text));
  button.onclick = () => void onClick();
  return button;
};
var createIconButton = (content, title, onClick) => {
  const button = document.createElement("button");
  button.className = "wisemind-bridge-icon-button";
  if (typeof content === "string") {
    button.textContent = content;
  } else {
    button.appendChild(content);
  }
  button.title = title;
  button.setAttribute("aria-label", title);
  button.onclick = (event) => {
    event.stopPropagation();
    void onClick();
  };
  return button;
};
var createTextButton = (text, onClick, icon, extraClass = "") => {
  const button = document.createElement("button");
  button.className = `wisemind-bridge-text-button${extraClass ? ` ${extraClass}` : ""}`;
  button.title = text;
  if (icon)
    button.append(createInlineIcon(icon, text));
  button.append(document.createTextNode(text));
  button.onclick = (event) => {
    event.stopPropagation();
    void onClick();
  };
  return button;
};
var createInlineIcon = (svg, label, cls = "") => {
  const icon = document.createElement("span");
  icon.className = `wisemind-bridge-inline-icon${cls ? ` ${cls}` : ""}`;
  icon.setAttribute("aria-label", label);
  icon.innerHTML = svg || "";
  return icon;
};
var categoryIcon = (category) => category === "documents" ? "document.svg" : category === "knowledge" ? "knowledge.svg" : "note.svg";
var getFullySelectedGroupIds = (groups, selected, keyOf) => groups.filter((group) => group.items.length > 0 && group.items.every((item) => selected.has(keyOf(item)))).map((group) => group.id);
var targetSetFromSettings = (settings) => {
  const targets = /* @__PURE__ */ new Set();
  if (settings.documents)
    targets.add("documents");
  if (settings.knowledge)
    targets.add("knowledge");
  if (settings.notes)
    targets.add("notes");
  if (!targets.size)
    targets.add("notes");
  return targets;
};
var renderHistoryBadges = (parent, title, items) => {
  const wrap = parent.createDiv({ cls: "wisemind-bridge-history-line" });
  wrap.createEl("span", { text: title });
  const badges = wrap.createDiv({ cls: "wisemind-bridge-badges" });
  const values = summarizeValues(items);
  (values.length ? values : ["\u65E0"]).forEach((value) => {
    badges.createEl("span", { cls: "wisemind-bridge-badge-soft", text: value });
  });
};
var safeTitle = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim())
      return value.trim();
    if (typeof value === "number")
      return String(value);
  }
  return "\u672A\u547D\u540D";
};
var unique = (items) => Array.from(new Set(items.filter(Boolean)));
var uniqueByPath = (items) => Array.from(new Map(items.map((item) => [item.path, item])).values());
var summarizeValues = (items) => {
  const values = unique(items);
  if (values.length <= 12)
    return values;
  return [...values.slice(0, 11), `\u7B49 ${values.length} \u9879`];
};
var categoryLabel = (category) => category === "documents" ? "\u6587\u6863" : category === "knowledge" ? "\u77E5\u8BC6\u5E93" : "\u7B14\u8BB0";
var formatDateTime = (value) => new Date(value).toLocaleString();
var sourceKey = (item) => `${item.sourceType}:${item.id}`;
var sourceMatchesCategory = (item, category) => category === "documents" ? item.sourceType === "document" : category === "knowledge" ? item.sourceType === "knowledge-document" : item.sourceType === "note";
var toggleSet = (set, key, checked) => checked ? set.add(key) : set.delete(key);
var sourceTypeLabel = (type) => type === "note" ? "\u7B14\u8BB0" : type === "document" ? "\u6587\u6863" : "\u77E5\u8BC6\u5E93";
var destinationTypeLabel = (type) => type === "notes" ? "\u7B14\u8BB0\u6587\u4EF6\u5939" : type === "documents" ? "\u6587\u6863\u6587\u4EF6\u5939" : "\u77E5\u8BC6\u5E93";
var destinationKey = (target, value) => `${target}:${value}`;
var matchesSearch = (value, search) => !search.trim() || value.toLowerCase().includes(search.trim().toLowerCase());
var filterGroups = (groups, search, textOf) => {
  if (!search.trim())
    return groups;
  return groups.map((group) => ({
    ...group,
    items: group.items.filter((item) => matchesSearch(`${group.title} ${group.subtitle} ${textOf(item)}`, search))
  })).filter((group) => group.items.length || matchesSearch(`${group.title} ${group.subtitle}`, search));
};
var sortRootFirst = (a, b) => {
  const rootNames = /* @__PURE__ */ new Set(["", "\u6839\u76EE\u5F55", "\u672A\u5206\u7EC4"]);
  const aRoot = rootNames.has(a);
  const bRoot = rootNames.has(b);
  if (aRoot && !bRoot)
    return -1;
  if (!aRoot && bRoot)
    return 1;
  return a.localeCompare(b);
};
var formatResult = (result) => `\u521B\u5EFA ${result.created}\uFF0C\u66F4\u65B0 ${result.updated}\uFF0C\u8DF3\u8FC7 ${result.skipped}\uFF0C\u5931\u8D25 ${result.failed}

${result.items.slice(-20).map((item) => `${item.status} \xB7 ${item.title}${item.message ? ` \xB7 ${item.message}` : ""}`).join("\n")}`;

// src/main.ts
var WISEMIND_VIEW_TYPE = "wisemindai-bridge-view";
var WISEMIND_ICON_ID = "wisemindai-logo";
var WISEMIND_OBSIDIAN_ICON = wisemindai_logo_default.replace(/^<svg[^>]*>/, '<g transform="scale(0.09765625)">').replace(/<\/svg>\s*$/, "</g>");
var WiseMindObsidianPlugin2 = class extends import_obsidian3.Plugin {
  settings = DEFAULT_SETTINGS;
  api = new WiseMindApiClient(DEFAULT_SETTINGS.apiBaseUrl);
  statusBar;
  async onload() {
    this.settings = { ...DEFAULT_SETTINGS, ...await this.loadData() || {} };
    this.settings.syncPlans = Array.isArray(this.settings.syncPlans) ? this.settings.syncPlans : [];
    this.settings.syncHistory = Array.isArray(this.settings.syncHistory) ? this.settings.syncHistory : [];
    this.settings.defaultSyncPlanId = this.settings.defaultSyncPlanId || "";
    this.settings.hasSeenTutorial = Boolean(this.settings.hasSeenTutorial);
    this.normalizeContextMenuSettings();
    this.api = new WiseMindApiClient(this.settings.apiBaseUrl);
    (0, import_obsidian3.addIcon)(WISEMIND_ICON_ID, WISEMIND_OBSIDIAN_ICON);
    this.addSettingTab(new WiseMindSettingTab(this.app, this));
    this.registerView(WISEMIND_VIEW_TYPE, (leaf) => new WiseMindBridgeView(leaf, this));
    this.statusBar = new WiseMindStatusBar(this.addStatusBarItem(), () => void this.activateView());
    const ribbonIcon = this.addRibbonIcon(WISEMIND_ICON_ID, "WiseMindAI Obsidian", () => void this.activateView());
    if (!ribbonIcon.querySelector("svg")) {
      ribbonIcon.innerHTML = wisemindai_logo_default;
    }
    this.registerCommands();
    this.registerMenus();
    void this.testConnection();
  }
  async onunload() {
  }
  async saveSettings() {
    this.api = new WiseMindApiClient(this.settings.apiBaseUrl);
    await this.saveData(this.settings);
  }
  async testConnection() {
    try {
      await this.api.health();
      this.statusBar?.setConnected();
      return true;
    } catch {
      this.statusBar?.setDisconnected();
      return false;
    }
  }
  async activateView() {
    const existing = this.app.workspace.getLeavesOfType(WISEMIND_VIEW_TYPE)[0];
    if (existing) {
      await this.app.workspace.revealLeaf(existing);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) {
      new import_obsidian3.Notice("\u65E0\u6CD5\u6253\u5F00 WiseMindAI Obsidian \u9875\u9762");
      return;
    }
    await leaf.setViewState({ type: WISEMIND_VIEW_TYPE, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }
  registerCommands() {
    this.addCommand({
      id: "open-wisemind-bridge",
      name: "WiseMindAI: \u6253\u5F00\u540C\u6B65\u63A7\u5236\u53F0",
      callback: () => void this.activateView()
    });
    this.addCommand({
      id: "send-current-note-to-wisemind",
      name: "WiseMindAI: \u53D1\u9001\u5F53\u524D\u7B14\u8BB0",
      callback: () => void this.sendActiveFileWithTarget("notes")
    });
    this.addCommand({
      id: "send-current-folder-to-wisemind",
      name: "WiseMindAI: \u53D1\u9001\u5F53\u524D\u6587\u4EF6\u5939",
      callback: () => void this.sendActiveFolder()
    });
    this.addCommand({
      id: "sync-wisemind-to-current-vault",
      name: "WiseMindAI: \u540C\u6B65 WiseMindAI \u6570\u636E\u5230\u5F53\u524D\u4ED3\u5E93",
      callback: () => void this.activateView()
    });
    this.addCommand({
      id: "test-wisemind-connection",
      name: "WiseMindAI: \u6D4B\u8BD5\u8FDE\u63A5",
      callback: async () => {
        const ok = await this.testConnection();
        new import_obsidian3.Notice(ok ? "WiseMindAI \u5DF2\u8FDE\u63A5" : "\u65E0\u6CD5\u8FDE\u63A5 WiseMindAI\uFF0C\u8BF7\u5148\u542F\u52A8 WiseMindAI \u672C\u5730\u63A5\u53E3");
      }
    });
  }
  registerMenus() {
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (isMarkdownFile(file)) {
          menu.addItem(
            (item) => item.setTitle("\u53D1\u9001\u5230 WiseMindAI \u7B14\u8BB0").setIcon(WISEMIND_ICON_ID).onClick(() => void this.sendFilesWithTarget([file], "notes"))
          );
          menu.addItem(
            (item) => item.setTitle("\u53D1\u9001\u5230 WiseMindAI \u6587\u6863").setIcon(WISEMIND_ICON_ID).onClick(() => void this.sendFilesWithTarget([file], "documents"))
          );
          menu.addItem(
            (item) => item.setTitle("\u53D1\u9001\u5230 WiseMindAI \u77E5\u8BC6\u5E93").setIcon(WISEMIND_ICON_ID).onClick(() => void this.sendFilesWithTarget([file], "knowledge"))
          );
          return;
        }
        const files = collectMarkdownFiles(this.app, file);
        if (files.length) {
          menu.addItem(
            (item) => item.setTitle("\u53D1\u9001\u6574\u4E2A\u6587\u4EF6\u5939\u5230 WiseMindAI \u7B14\u8BB0").setIcon(WISEMIND_ICON_ID).onClick(() => void this.sendFilesWithTarget(files, "notes"))
          );
          menu.addItem(
            (item) => item.setTitle("\u53D1\u9001\u6574\u4E2A\u6587\u4EF6\u5939\u5230 WiseMindAI \u6587\u6863").setIcon(WISEMIND_ICON_ID).onClick(() => void this.sendFilesWithTarget(files, "documents"))
          );
          menu.addItem(
            (item) => item.setTitle("\u53D1\u9001\u6574\u4E2A\u6587\u4EF6\u5939\u5230 WiseMindAI \u77E5\u8BC6\u5E93").setIcon(WISEMIND_ICON_ID).onClick(() => void this.sendFilesWithTarget(files, "knowledge"))
          );
        }
      })
    );
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) => {
        menu.addItem(
          (item) => item.setTitle("\u53D1\u9001\u5F53\u524D\u7B14\u8BB0\u5230 WiseMindAI \u7B14\u8BB0").setIcon(WISEMIND_ICON_ID).onClick(() => void this.sendFilesWithTarget(view.file ? [view.file] : [], "notes"))
        );
        menu.addItem(
          (item) => item.setTitle("\u53D1\u9001\u5F53\u524D\u7B14\u8BB0\u5230 WiseMindAI \u6587\u6863").setIcon(WISEMIND_ICON_ID).onClick(() => void this.sendFilesWithTarget(view.file ? [view.file] : [], "documents"))
        );
        menu.addItem(
          (item) => item.setTitle("\u53D1\u9001\u5F53\u524D\u7B14\u8BB0\u5230 WiseMindAI \u77E5\u8BC6\u5E93").setIcon(WISEMIND_ICON_ID).onClick(() => void this.sendFilesWithTarget(view.file ? [view.file] : [], "knowledge"))
        );
        const selectedText = editor.getSelection();
        if (selectedText.trim()) {
          menu.addItem(
            (item) => item.setTitle("\u53D1\u9001\u9009\u4E2D\u6587\u672C\u5230 WiseMindAI \u7B14\u8BB0").setIcon(WISEMIND_ICON_ID).onClick(() => void this.sendSelectedTextWithTarget(selectedText, view.file?.path || "\u5F53\u524D\u7B14\u8BB0"))
          );
        }
      })
    );
  }
  async sendActiveFileWithTarget(target) {
    const file = this.app.workspace.getActiveFile();
    await this.sendFilesWithTarget(file ? [file] : [], target);
  }
  async sendActiveFolder() {
    const active = this.app.workspace.getActiveFile();
    if (!active) {
      new import_obsidian3.Notice("\u6CA1\u6709\u5F53\u524D\u7B14\u8BB0");
      return;
    }
    const folder = active.path.includes("/") ? active.path.split("/").slice(0, -1).join("/") : "";
    const files = this.app.vault.getMarkdownFiles().filter((file) => folder ? file.path.startsWith(`${folder}/`) : !file.path.includes("/"));
    await this.sendFilesWithTarget(files, "notes");
  }
  async sendFilesWithTarget(files, target) {
    if (!files.length) {
      new import_obsidian3.Notice("\u6CA1\u6709\u53EF\u53D1\u9001\u7684 Markdown \u7B14\u8BB0");
      return;
    }
    const destination = await this.pickContextMenuDestination(target);
    if (!destination)
      return;
    await this.sendFiles(files, targetSelection(target), destination);
  }
  async sendFiles(files, targets, destination) {
    if (!files.length) {
      new import_obsidian3.Notice("\u6CA1\u6709\u53EF\u53D1\u9001\u7684 Markdown \u7B14\u8BB0");
      return;
    }
    const connected = await this.testConnection();
    if (!connected) {
      new import_obsidian3.Notice("\u65E0\u6CD5\u8FDE\u63A5 WiseMindAI\uFF0C\u8BF7\u5148\u542F\u52A8 WiseMindAI \u672C\u5730\u63A5\u53E3");
      return;
    }
    this.statusBar.setSyncing();
    const items = [];
    for (const file of files) {
      items.push(await readObsidianFile(this.app, file));
    }
    const result = await runObsidianToWiseMindImport({
      items,
      api: this.api,
      targets,
      noteFolderPaths: destination?.target === "notes" ? [destination.value] : void 0,
      documentFolderPaths: destination?.target === "documents" ? [destination.value] : void 0,
      knowledgeBaseNames: destination?.target === "knowledge" ? [destination.value || this.settings.contextMenuDefaults.knowledgeBaseName] : void 0,
      duplicatePolicy: this.settings.duplicatePolicy,
      knowledgeBaseName: this.settings.defaultKnowledgeBaseName,
      chunkSize: this.settings.chunkSize
    });
    this.statusBar.setResult(result);
    if (destination)
      await this.rememberContextMenuDestination(destination);
    new import_obsidian3.Notice(`\u53D1\u9001\u5B8C\u6210\uFF1A\u6210\u529F ${result.created + result.updated}\uFF0C\u5931\u8D25 ${result.failed}`);
  }
  async sendSelectedTextWithTarget(selectedText, sourcePath) {
    const destination = await this.pickContextMenuDestination("notes");
    if (!destination)
      return;
    await this.sendSelectedText(selectedText, sourcePath, destination);
  }
  async sendSelectedText(selectedText, sourcePath, destination) {
    const title = `${sourcePath.split("/").pop()?.replace(/\.md$/, "") || "\u9009\u4E2D\u6587\u672C"} \u6458\u5F55`;
    const connected = await this.testConnection();
    if (!connected) {
      new import_obsidian3.Notice("\u65E0\u6CD5\u8FDE\u63A5 WiseMindAI\uFF0C\u8BF7\u5148\u542F\u52A8 WiseMindAI \u672C\u5730\u63A5\u53E3");
      return;
    }
    this.statusBar.setSyncing();
    try {
      const item = {
        path: sourcePath,
        absolutePath: sourcePath,
        basename: title,
        folderPath: "",
        title,
        markdown: `${selectedText}

> \u6765\u6E90\uFF1A${sourcePath}`,
        plainText: selectedText,
        tags: ["obsidian", "\u6458\u5F55"],
        frontmatter: {},
        modifiedAt: Date.now(),
        size: selectedText.length,
        contentHash: `${Date.now()}`
      };
      await runObsidianToWiseMindImport({
        items: [item],
        api: this.api,
        targets: { notes: true, documents: false, knowledge: false },
        noteFolderPaths: [destination.value],
        duplicatePolicy: this.settings.duplicatePolicy,
        knowledgeBaseName: this.settings.defaultKnowledgeBaseName,
        chunkSize: this.settings.chunkSize
      });
      this.statusBar.setConnected();
      await this.rememberContextMenuDestination(destination);
      new import_obsidian3.Notice("\u9009\u4E2D\u6587\u672C\u5DF2\u53D1\u9001\u5230 WiseMindAI \u7B14\u8BB0");
    } catch (error) {
      this.statusBar.setConnected();
      new import_obsidian3.Notice(error?.message || "\u53D1\u9001\u5931\u8D25");
    }
  }
  normalizeContextMenuSettings() {
    this.settings.contextMenuDefaults = {
      ...DEFAULT_SETTINGS.contextMenuDefaults,
      ...this.settings.contextMenuDefaults || {}
    };
    this.settings.contextMenuDefaults.knowledgeBaseName = this.settings.contextMenuDefaults.knowledgeBaseName || this.settings.defaultKnowledgeBaseName || DEFAULT_SETTINGS.contextMenuDefaults.knowledgeBaseName;
    this.settings.contextMenuRecents = {
      notes: Array.isArray(this.settings.contextMenuRecents?.notes) ? this.settings.contextMenuRecents.notes : [],
      documents: Array.isArray(this.settings.contextMenuRecents?.documents) ? this.settings.contextMenuRecents.documents : [],
      knowledge: Array.isArray(this.settings.contextMenuRecents?.knowledge) ? this.settings.contextMenuRecents.knowledge : []
    };
  }
  async pickContextMenuDestination(target) {
    const connected = await this.testConnection();
    if (!connected) {
      new import_obsidian3.Notice("\u65E0\u6CD5\u8FDE\u63A5 WiseMindAI\uFF0C\u8BF7\u5148\u542F\u52A8 WiseMindAI \u672C\u5730\u63A5\u53E3");
      return null;
    }
    try {
      const options = await this.loadContextMenuOptions(target);
      if (!options.length) {
        new import_obsidian3.Notice(`WiseMindAI \u91CC\u8FD8\u6CA1\u6709\u53EF\u9009\u62E9\u7684${contextMenuTargetLabel(target)}`);
        return null;
      }
      return await this.openContextMenuDestinationDialog(target, options);
    } catch (error) {
      new import_obsidian3.Notice(error?.message || "\u8BFB\u53D6 WiseMindAI \u76EE\u6807\u5931\u8D25");
      return null;
    }
  }
  async loadContextMenuOptions(target) {
    if (target === "notes") {
      const folders = await this.api.listNoteFolders();
      return folderPathOptions(folders);
    }
    if (target === "documents") {
      const folders = await this.api.listFileFolders();
      return folderPathOptions(folders);
    }
    const bases = await this.api.listKnowledgeBases();
    return bases.map((item) => safeText(item?.name, item?.title, `\u77E5\u8BC6\u5E93 ${item?.id}`)).filter(Boolean).sort((a, b) => a.localeCompare(b)).map((value) => ({ value, title: value }));
  }
  openContextMenuDestinationDialog(target, options) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "wisemind-bridge-history-overlay";
      const modal = overlay.createDiv({ cls: "wisemind-bridge-dialog wisemind-bridge-context-dialog" });
      const header = modal.createDiv({ cls: "wisemind-bridge-history-title" });
      header.createEl("h2", { text: `\u9009\u62E9${contextMenuTargetLabel(target)}` });
      const closeButton = header.createEl("button", { cls: "wisemind-bridge-icon-button", text: "\xD7" });
      closeButton.title = "\u5173\u95ED";
      let settled = false;
      const finish = (value) => {
        if (settled)
          return;
        settled = true;
        overlay.remove();
        resolve(value);
      };
      closeButton.onclick = (event) => {
        event.stopPropagation();
        finish(null);
      };
      overlay.onclick = (event) => {
        if (event.target === overlay)
          finish(null);
      };
      const defaultValue = this.getContextMenuDefault(target);
      let selected = options.some((item) => item.value === defaultValue) ? defaultValue : options[0]?.value || "";
      const intro = modal.createDiv({ cls: "wisemind-bridge-tutorial-intro" });
      intro.createEl("strong", { text: `\u4FDD\u5B58\u5230${contextMenuTargetLabel(target)}` });
      intro.createEl("span", { text: `\u9ED8\u8BA4\u9009\u4E2D\uFF1A${labelForValue(selected)}` });
      const recents = this.getContextMenuRecents(target).filter((value) => options.some((option) => option.value === value));
      if (recents.length) {
        const recentWrap = modal.createDiv({ cls: "wisemind-bridge-context-recents" });
        recentWrap.createEl("span", { cls: "wisemind-bridge-muted", text: "\u6700\u8FD1\u4FDD\u5B58\u7684\u6587\u4EF6\u5939" });
        const badges = recentWrap.createDiv({ cls: "wisemind-bridge-badges" });
        recents.forEach((value) => {
          const badge = badges.createEl("button", { cls: "wisemind-bridge-badge-soft badge-soft", text: labelForValue(value) });
          badge.onclick = (event) => {
            event.preventDefault();
            selected = value;
            renderOptions();
          };
        });
      }
      const list = modal.createDiv({ cls: "wisemind-bridge-context-target-list" });
      const renderOptions = () => {
        list.empty();
        options.forEach((option) => {
          const row = list.createEl("label", { cls: "wisemind-bridge-row" });
          const left = row.createEl("span", { cls: "wisemind-bridge-row-main" });
          const radio = left.createEl("input");
          radio.type = "radio";
          radio.name = "wisemind-context-target";
          radio.checked = option.value === selected;
          radio.onchange = () => {
            selected = option.value;
          };
          left.createEl("span", { cls: "wisemind-bridge-row-title", text: option.title });
          row.createEl("span", { cls: "wisemind-bridge-muted wisemind-bridge-row-meta", text: contextMenuTargetLabel(target) });
        });
      };
      renderOptions();
      const actions = modal.createDiv({ cls: "wisemind-bridge-dialog-actions" });
      const cancel = actions.createEl("button", { cls: "wisemind-bridge-text-button", text: "\u53D6\u6D88" });
      cancel.onclick = () => finish(null);
      const confirm = actions.createEl("button", { cls: "wisemind-bridge-text-button", text: "\u53D1\u9001" });
      confirm.onclick = () => {
        const option = options.find((item) => item.value === selected) || options[0];
        finish(option ? { target, value: option.value, title: option.title } : null);
      };
      document.body.appendChild(overlay);
    });
  }
  getContextMenuDefault(target) {
    if (target === "notes")
      return this.settings.contextMenuDefaults.noteFolderPath || "";
    if (target === "documents")
      return this.settings.contextMenuDefaults.documentFolderPath || "";
    return this.settings.contextMenuDefaults.knowledgeBaseName || this.settings.defaultKnowledgeBaseName;
  }
  getContextMenuRecents(target) {
    return this.settings.contextMenuRecents[target] || [];
  }
  async rememberContextMenuDestination(destination) {
    const recents = this.getContextMenuRecents(destination.target);
    this.settings.contextMenuRecents[destination.target] = [
      destination.value,
      ...recents.filter((item) => item !== destination.value)
    ].slice(0, 10);
    await this.saveSettings();
  }
};
var targetSelection = (target) => ({
  notes: target === "notes",
  documents: target === "documents",
  knowledge: target === "knowledge"
});
var contextMenuTargetLabel = (target) => target === "notes" ? "\u7B14\u8BB0\u6587\u4EF6\u5939" : target === "documents" ? "\u6587\u6863\u6587\u4EF6\u5939" : "\u77E5\u8BC6\u5E93";
var labelForValue = (value) => value || "\u6839\u76EE\u5F55";
var safeText = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim())
      return value.trim();
    if (typeof value === "number")
      return String(value);
  }
  return "";
};
var folderPathOptions = (folders) => {
  const values = /* @__PURE__ */ new Set([""]);
  folders.forEach((folder) => {
    const path = resolveFolderPath(folder.id, folders) || folder.name;
    if (path)
      values.add(path);
  });
  return Array.from(values).sort(sortRootFirst2).map((value) => ({ value, title: labelForValue(value) }));
};
var sortRootFirst2 = (a, b) => {
  if (!a && b)
    return -1;
  if (a && !b)
    return 1;
  return a.localeCompare(b);
};
