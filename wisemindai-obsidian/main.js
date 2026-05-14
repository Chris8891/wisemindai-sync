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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAiYXNzZXRzL2ljb25zL3dpc2VtaW5kYWktbG9nby5zdmciLCAic3JjL21hcmtlcnMudHMiLCAic3JjL2ltcG9ydFJ1bm5lci50cyIsICJzcmMvcXVpY2tBY3Rpb25zLnRzIiwgInNyYy9zZXR0aW5ncy50cyIsICJzcmMvc3RhdHVzQmFyLnRzIiwgInNyYy9zeW5jVmlldy50cyIsICJhc3NldHMvaWNvbnMvYXJyb3ctcGF0aC5zdmciLCAiYXNzZXRzL2ljb25zL2Jvb2ttYXJrLXNxdWFyZS5zdmciLCAiYXNzZXRzL2ljb25zL2NoZWNrLWNpcmNsZS5zdmciLCAiYXNzZXRzL2ljb25zL2NoZXZyb24tZG93bi5zdmciLCAiYXNzZXRzL2ljb25zL2NoZXZyb24tcmlnaHQuc3ZnIiwgImFzc2V0cy9pY29ucy9jbG9jay5zdmciLCAiYXNzZXRzL2ljb25zL2RvY3VtZW50LnN2ZyIsICJhc3NldHMvaWNvbnMvaG9tZS5zdmciLCAiYXNzZXRzL2ljb25zL2tub3dsZWRnZS5zdmciLCAiYXNzZXRzL2ljb25zL21hcmtkb3duLnN2ZyIsICJhc3NldHMvaWNvbnMvbm90ZS5zdmciLCAiYXNzZXRzL2ljb25zL3BlbmNpbC1zcXVhcmUuc3ZnIiwgImFzc2V0cy9pY29ucy9wbHVzLnN2ZyIsICJhc3NldHMvaWNvbnMvc3luYy10by1vYnNpZGlhbi5zdmciLCAiYXNzZXRzL2ljb25zL3N5bmMtdG8td2lzZW1pbmQuc3ZnIiwgImFzc2V0cy9pY29ucy90by1yaWdodC5zdmciLCAiYXNzZXRzL2ljb25zL3RyYXNoLnN2ZyIsICJhc3NldHMvaWNvbnMveC1tYXJrLnN2ZyIsICJzcmMvdGV4dC50cyIsICJzcmMvdmF1bHRTY2FubmVyLnRzIiwgInNyYy93aXNlbWluZEFwaS50cyIsICJzcmMvd2lzZW1pbmRTb3VyY2VTY2FubmVyLnRzIiwgInNyYy9vYnNpZGlhbldyaXRlci50cyIsICJzcmMvd2lzZW1pbmRUb09ic2lkaWFuUnVubmVyLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBhZGRJY29uLCBOb3RpY2UsIFBsdWdpbiwgVEFic3RyYWN0RmlsZSB9IGZyb20gJ29ic2lkaWFuJztcblxuaW1wb3J0IHdpc2VNaW5kTG9nb0ljb24gZnJvbSAnLi4vYXNzZXRzL2ljb25zL3dpc2VtaW5kYWktbG9nby5zdmcnO1xuXG5pbXBvcnQgeyBydW5PYnNpZGlhblRvV2lzZU1pbmRJbXBvcnQgfSBmcm9tICcuL2ltcG9ydFJ1bm5lcic7XG5pbXBvcnQgeyBjb2xsZWN0TWFya2Rvd25GaWxlcywgaXNNYXJrZG93bkZpbGUgfSBmcm9tICcuL3F1aWNrQWN0aW9ucyc7XG5pbXBvcnQgeyBERUZBVUxUX1NFVFRJTkdTLCBXaXNlTWluZEltcG9ydFNldHRpbmdzLCBXaXNlTWluZFNldHRpbmdUYWIgfSBmcm9tICcuL3NldHRpbmdzJztcbmltcG9ydCB7IFdpc2VNaW5kU3RhdHVzQmFyIH0gZnJvbSAnLi9zdGF0dXNCYXInO1xuaW1wb3J0IHsgV2lzZU1pbmRCcmlkZ2VWaWV3IH0gZnJvbSAnLi9zeW5jVmlldyc7XG5pbXBvcnQgdHlwZSB7IEltcG9ydFRhcmdldFNlbGVjdGlvbiwgT2JzaWRpYW5Tb3VyY2VJdGVtLCBXaXNlTWluZEZvbGRlciB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgcmVhZE9ic2lkaWFuRmlsZSB9IGZyb20gJy4vdmF1bHRTY2FubmVyJztcbmltcG9ydCB7IFdpc2VNaW5kQXBpQ2xpZW50IH0gZnJvbSAnLi93aXNlbWluZEFwaSc7XG5pbXBvcnQgeyByZXNvbHZlRm9sZGVyUGF0aCB9IGZyb20gJy4vd2lzZW1pbmRTb3VyY2VTY2FubmVyJztcblxuZXhwb3J0IGNvbnN0IFdJU0VNSU5EX1ZJRVdfVFlQRSA9ICd3aXNlbWluZGFpLWJyaWRnZS12aWV3JztcbmV4cG9ydCBjb25zdCBXSVNFTUlORF9JQ09OX0lEID0gJ3dpc2VtaW5kYWktbG9nbyc7XG5leHBvcnQgY29uc3QgV0lTRU1JTkRfT0JTSURJQU5fSUNPTiA9IHdpc2VNaW5kTG9nb0ljb25cbiAgLnJlcGxhY2UoL148c3ZnW14+XSo+LywgJzxnIHRyYW5zZm9ybT1cInNjYWxlKDAuMDk3NjU2MjUpXCI+JylcbiAgLnJlcGxhY2UoLzxcXC9zdmc+XFxzKiQvLCAnPC9nPicpO1xuXG50eXBlIENvbnRleHRNZW51VGFyZ2V0ID0ga2V5b2YgSW1wb3J0VGFyZ2V0U2VsZWN0aW9uO1xudHlwZSBDb250ZXh0TWVudURlc3RpbmF0aW9uID0ge1xuICB0YXJnZXQ6IENvbnRleHRNZW51VGFyZ2V0O1xuICB2YWx1ZTogc3RyaW5nO1xuICB0aXRsZTogc3RyaW5nO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgV2lzZU1pbmRPYnNpZGlhblBsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHNldHRpbmdzOiBXaXNlTWluZEltcG9ydFNldHRpbmdzID0gREVGQVVMVF9TRVRUSU5HUztcbiAgYXBpOiBXaXNlTWluZEFwaUNsaWVudCA9IG5ldyBXaXNlTWluZEFwaUNsaWVudChERUZBVUxUX1NFVFRJTkdTLmFwaUJhc2VVcmwpO1xuICBzdGF0dXNCYXIhOiBXaXNlTWluZFN0YXR1c0JhcjtcblxuICBhc3luYyBvbmxvYWQoKSB7XG4gICAgdGhpcy5zZXR0aW5ncyA9IHsgLi4uREVGQVVMVF9TRVRUSU5HUywgLi4uKChhd2FpdCB0aGlzLmxvYWREYXRhKCkpIGFzIFBhcnRpYWw8V2lzZU1pbmRJbXBvcnRTZXR0aW5ncz4gfHwge30pIH07XG4gICAgdGhpcy5zZXR0aW5ncy5zeW5jUGxhbnMgPSBBcnJheS5pc0FycmF5KHRoaXMuc2V0dGluZ3Muc3luY1BsYW5zKSA/IHRoaXMuc2V0dGluZ3Muc3luY1BsYW5zIDogW107XG4gICAgdGhpcy5zZXR0aW5ncy5zeW5jSGlzdG9yeSA9IEFycmF5LmlzQXJyYXkodGhpcy5zZXR0aW5ncy5zeW5jSGlzdG9yeSkgPyB0aGlzLnNldHRpbmdzLnN5bmNIaXN0b3J5IDogW107XG4gICAgdGhpcy5zZXR0aW5ncy5kZWZhdWx0U3luY1BsYW5JZCA9IHRoaXMuc2V0dGluZ3MuZGVmYXVsdFN5bmNQbGFuSWQgfHwgJyc7XG4gICAgdGhpcy5zZXR0aW5ncy5oYXNTZWVuVHV0b3JpYWwgPSBCb29sZWFuKHRoaXMuc2V0dGluZ3MuaGFzU2VlblR1dG9yaWFsKTtcbiAgICB0aGlzLm5vcm1hbGl6ZUNvbnRleHRNZW51U2V0dGluZ3MoKTtcbiAgICB0aGlzLmFwaSA9IG5ldyBXaXNlTWluZEFwaUNsaWVudCh0aGlzLnNldHRpbmdzLmFwaUJhc2VVcmwpO1xuXG4gICAgYWRkSWNvbihXSVNFTUlORF9JQ09OX0lELCBXSVNFTUlORF9PQlNJRElBTl9JQ09OKTtcbiAgICB0aGlzLmFkZFNldHRpbmdUYWIobmV3IFdpc2VNaW5kU2V0dGluZ1RhYih0aGlzLmFwcCwgdGhpcykpO1xuICAgIHRoaXMucmVnaXN0ZXJWaWV3KFdJU0VNSU5EX1ZJRVdfVFlQRSwgbGVhZiA9PiBuZXcgV2lzZU1pbmRCcmlkZ2VWaWV3KGxlYWYsIHRoaXMpKTtcbiAgICB0aGlzLnN0YXR1c0JhciA9IG5ldyBXaXNlTWluZFN0YXR1c0Jhcih0aGlzLmFkZFN0YXR1c0Jhckl0ZW0oKSwgKCkgPT4gdm9pZCB0aGlzLmFjdGl2YXRlVmlldygpKTtcblxuICAgIGNvbnN0IHJpYmJvbkljb24gPSB0aGlzLmFkZFJpYmJvbkljb24oV0lTRU1JTkRfSUNPTl9JRCwgJ1dpc2VNaW5kQUkgT2JzaWRpYW4nLCAoKSA9PiB2b2lkIHRoaXMuYWN0aXZhdGVWaWV3KCkpO1xuICAgIGlmICghcmliYm9uSWNvbi5xdWVyeVNlbGVjdG9yKCdzdmcnKSkge1xuICAgICAgcmliYm9uSWNvbi5pbm5lckhUTUwgPSB3aXNlTWluZExvZ29JY29uO1xuICAgIH1cbiAgICB0aGlzLnJlZ2lzdGVyQ29tbWFuZHMoKTtcbiAgICB0aGlzLnJlZ2lzdGVyTWVudXMoKTtcblxuICAgIHZvaWQgdGhpcy50ZXN0Q29ubmVjdGlvbigpO1xuICB9XG5cbiAgYXN5bmMgb251bmxvYWQoKSB7XG4gICAgLy8gT2JzaWRpYW4gXHU0RjFBXHU2RTA1XHU3NDA2XHU2Q0U4XHU1MThDXHU0RThCXHU0RUY2XHU1NDhDXHU4OUM2XHU1NkZFXHVGRjBDXHU4RkQ5XHU5MUNDXHU0RTBEXHU5NzAwXHU4OTgxXHU5ODlEXHU1OTE2XHU1OTA0XHU3NDA2XHUzMDAyXG4gIH1cblxuICBhc3luYyBzYXZlU2V0dGluZ3MoKSB7XG4gICAgdGhpcy5hcGkgPSBuZXcgV2lzZU1pbmRBcGlDbGllbnQodGhpcy5zZXR0aW5ncy5hcGlCYXNlVXJsKTtcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xuICB9XG5cbiAgYXN5bmMgdGVzdENvbm5lY3Rpb24oKSB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuYXBpLmhlYWx0aCgpO1xuICAgICAgdGhpcy5zdGF0dXNCYXI/LnNldENvbm5lY3RlZCgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCB7XG4gICAgICB0aGlzLnN0YXR1c0Jhcj8uc2V0RGlzY29ubmVjdGVkKCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgYWN0aXZhdGVWaWV3KCkge1xuICAgIGNvbnN0IGV4aXN0aW5nID0gdGhpcy5hcHAud29ya3NwYWNlLmdldExlYXZlc09mVHlwZShXSVNFTUlORF9WSUVXX1RZUEUpWzBdO1xuICAgIGlmIChleGlzdGluZykge1xuICAgICAgYXdhaXQgdGhpcy5hcHAud29ya3NwYWNlLnJldmVhbExlYWYoZXhpc3RpbmcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBsZWFmID0gdGhpcy5hcHAud29ya3NwYWNlLmdldFJpZ2h0TGVhZihmYWxzZSk7XG4gICAgaWYgKCFsZWFmKSB7XG4gICAgICBuZXcgTm90aWNlKCdcdTY1RTBcdTZDRDVcdTYyNTNcdTVGMDAgV2lzZU1pbmRBSSBPYnNpZGlhbiBcdTk4NzVcdTk3NjInKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYXdhaXQgbGVhZi5zZXRWaWV3U3RhdGUoeyB0eXBlOiBXSVNFTUlORF9WSUVXX1RZUEUsIGFjdGl2ZTogdHJ1ZSB9KTtcbiAgICBhd2FpdCB0aGlzLmFwcC53b3Jrc3BhY2UucmV2ZWFsTGVhZihsZWFmKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVnaXN0ZXJDb21tYW5kcygpIHtcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6ICdvcGVuLXdpc2VtaW5kLWJyaWRnZScsXG4gICAgICBuYW1lOiAnV2lzZU1pbmRBSTogXHU2MjUzXHU1RjAwXHU1NDBDXHU2QjY1XHU2M0E3XHU1MjM2XHU1M0YwJyxcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMuYWN0aXZhdGVWaWV3KCksXG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6ICdzZW5kLWN1cnJlbnQtbm90ZS10by13aXNlbWluZCcsXG4gICAgICBuYW1lOiAnV2lzZU1pbmRBSTogXHU1M0QxXHU5MDAxXHU1RjUzXHU1MjREXHU3QjE0XHU4QkIwJyxcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMuc2VuZEFjdGl2ZUZpbGVXaXRoVGFyZ2V0KCdub3RlcycpLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnc2VuZC1jdXJyZW50LWZvbGRlci10by13aXNlbWluZCcsXG4gICAgICBuYW1lOiAnV2lzZU1pbmRBSTogXHU1M0QxXHU5MDAxXHU1RjUzXHU1MjREXHU2NTg3XHU0RUY2XHU1OTM5JyxcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMuc2VuZEFjdGl2ZUZvbGRlcigpLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnc3luYy13aXNlbWluZC10by1jdXJyZW50LXZhdWx0JyxcbiAgICAgIG5hbWU6ICdXaXNlTWluZEFJOiBcdTU0MENcdTZCNjUgV2lzZU1pbmRBSSBcdTY1NzBcdTYzNkVcdTUyMzBcdTVGNTNcdTUyNERcdTRFRDNcdTVFOTMnLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5hY3RpdmF0ZVZpZXcoKSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogJ3Rlc3Qtd2lzZW1pbmQtY29ubmVjdGlvbicsXG4gICAgICBuYW1lOiAnV2lzZU1pbmRBSTogXHU2RDRCXHU4QkQ1XHU4RkRFXHU2M0E1JyxcbiAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICAgIGNvbnN0IG9rID0gYXdhaXQgdGhpcy50ZXN0Q29ubmVjdGlvbigpO1xuICAgICAgICBuZXcgTm90aWNlKG9rID8gJ1dpc2VNaW5kQUkgXHU1REYyXHU4RkRFXHU2M0E1JyA6ICdcdTY1RTBcdTZDRDVcdThGREVcdTYzQTUgV2lzZU1pbmRBSVx1RkYwQ1x1OEJGN1x1NTE0OFx1NTQyRlx1NTJBOCBXaXNlTWluZEFJIFx1NjcyQ1x1NTczMFx1NjNBNVx1NTNFMycpO1xuICAgICAgfSxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVnaXN0ZXJNZW51cygpIHtcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQoXG4gICAgICB0aGlzLmFwcC53b3Jrc3BhY2Uub24oJ2ZpbGUtbWVudScsIChtZW51LCBmaWxlKSA9PiB7XG4gICAgICAgIGlmIChpc01hcmtkb3duRmlsZShmaWxlKSkge1xuICAgICAgICAgIG1lbnUuYWRkSXRlbShpdGVtID0+XG4gICAgICAgICAgICBpdGVtXG4gICAgICAgICAgICAgIC5zZXRUaXRsZSgnXHU1M0QxXHU5MDAxXHU1MjMwIFdpc2VNaW5kQUkgXHU3QjE0XHU4QkIwJylcbiAgICAgICAgICAgICAgLnNldEljb24oV0lTRU1JTkRfSUNPTl9JRClcbiAgICAgICAgICAgICAgLm9uQ2xpY2soKCkgPT4gdm9pZCB0aGlzLnNlbmRGaWxlc1dpdGhUYXJnZXQoW2ZpbGVdLCAnbm90ZXMnKSksXG4gICAgICAgICAgKTtcbiAgICAgICAgICBtZW51LmFkZEl0ZW0oaXRlbSA9PlxuICAgICAgICAgICAgaXRlbVxuICAgICAgICAgICAgICAuc2V0VGl0bGUoJ1x1NTNEMVx1OTAwMVx1NTIzMCBXaXNlTWluZEFJIFx1NjU4N1x1Njg2MycpXG4gICAgICAgICAgICAgIC5zZXRJY29uKFdJU0VNSU5EX0lDT05fSUQpXG4gICAgICAgICAgICAgIC5vbkNsaWNrKCgpID0+IHZvaWQgdGhpcy5zZW5kRmlsZXNXaXRoVGFyZ2V0KFtmaWxlXSwgJ2RvY3VtZW50cycpKSxcbiAgICAgICAgICApO1xuICAgICAgICAgIG1lbnUuYWRkSXRlbShpdGVtID0+XG4gICAgICAgICAgICBpdGVtXG4gICAgICAgICAgICAgIC5zZXRUaXRsZSgnXHU1M0QxXHU5MDAxXHU1MjMwIFdpc2VNaW5kQUkgXHU3N0U1XHU4QkM2XHU1RTkzJylcbiAgICAgICAgICAgICAgLnNldEljb24oV0lTRU1JTkRfSUNPTl9JRClcbiAgICAgICAgICAgICAgLm9uQ2xpY2soKCkgPT4gdm9pZCB0aGlzLnNlbmRGaWxlc1dpdGhUYXJnZXQoW2ZpbGVdLCAna25vd2xlZGdlJykpLFxuICAgICAgICAgICk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZmlsZXMgPSBjb2xsZWN0TWFya2Rvd25GaWxlcyh0aGlzLmFwcCwgZmlsZSBhcyBUQWJzdHJhY3RGaWxlKTtcbiAgICAgICAgaWYgKGZpbGVzLmxlbmd0aCkge1xuICAgICAgICAgIG1lbnUuYWRkSXRlbShpdGVtID0+XG4gICAgICAgICAgICBpdGVtXG4gICAgICAgICAgICAgIC5zZXRUaXRsZSgnXHU1M0QxXHU5MDAxXHU2NTc0XHU0RTJBXHU2NTg3XHU0RUY2XHU1OTM5XHU1MjMwIFdpc2VNaW5kQUkgXHU3QjE0XHU4QkIwJylcbiAgICAgICAgICAgICAgLnNldEljb24oV0lTRU1JTkRfSUNPTl9JRClcbiAgICAgICAgICAgICAgLm9uQ2xpY2soKCkgPT4gdm9pZCB0aGlzLnNlbmRGaWxlc1dpdGhUYXJnZXQoZmlsZXMsICdub3RlcycpKSxcbiAgICAgICAgICApO1xuICAgICAgICAgIG1lbnUuYWRkSXRlbShpdGVtID0+XG4gICAgICAgICAgICBpdGVtXG4gICAgICAgICAgICAgIC5zZXRUaXRsZSgnXHU1M0QxXHU5MDAxXHU2NTc0XHU0RTJBXHU2NTg3XHU0RUY2XHU1OTM5XHU1MjMwIFdpc2VNaW5kQUkgXHU2NTg3XHU2ODYzJylcbiAgICAgICAgICAgICAgLnNldEljb24oV0lTRU1JTkRfSUNPTl9JRClcbiAgICAgICAgICAgICAgLm9uQ2xpY2soKCkgPT4gdm9pZCB0aGlzLnNlbmRGaWxlc1dpdGhUYXJnZXQoZmlsZXMsICdkb2N1bWVudHMnKSksXG4gICAgICAgICAgKTtcbiAgICAgICAgICBtZW51LmFkZEl0ZW0oaXRlbSA9PlxuICAgICAgICAgICAgaXRlbVxuICAgICAgICAgICAgICAuc2V0VGl0bGUoJ1x1NTNEMVx1OTAwMVx1NjU3NFx1NEUyQVx1NjU4N1x1NEVGNlx1NTkzOVx1NTIzMCBXaXNlTWluZEFJIFx1NzdFNVx1OEJDNlx1NUU5MycpXG4gICAgICAgICAgICAgIC5zZXRJY29uKFdJU0VNSU5EX0lDT05fSUQpXG4gICAgICAgICAgICAgIC5vbkNsaWNrKCgpID0+IHZvaWQgdGhpcy5zZW5kRmlsZXNXaXRoVGFyZ2V0KGZpbGVzLCAna25vd2xlZGdlJykpLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICk7XG5cbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQoXG4gICAgICB0aGlzLmFwcC53b3Jrc3BhY2Uub24oJ2VkaXRvci1tZW51JywgKG1lbnUsIGVkaXRvciwgdmlldykgPT4ge1xuICAgICAgICBtZW51LmFkZEl0ZW0oaXRlbSA9PlxuICAgICAgICAgIGl0ZW1cbiAgICAgICAgICAgIC5zZXRUaXRsZSgnXHU1M0QxXHU5MDAxXHU1RjUzXHU1MjREXHU3QjE0XHU4QkIwXHU1MjMwIFdpc2VNaW5kQUkgXHU3QjE0XHU4QkIwJylcbiAgICAgICAgICAgIC5zZXRJY29uKFdJU0VNSU5EX0lDT05fSUQpXG4gICAgICAgICAgICAub25DbGljaygoKSA9PiB2b2lkIHRoaXMuc2VuZEZpbGVzV2l0aFRhcmdldCh2aWV3LmZpbGUgPyBbdmlldy5maWxlXSA6IFtdLCAnbm90ZXMnKSksXG4gICAgICAgICk7XG4gICAgICAgIG1lbnUuYWRkSXRlbShpdGVtID0+XG4gICAgICAgICAgaXRlbVxuICAgICAgICAgICAgLnNldFRpdGxlKCdcdTUzRDFcdTkwMDFcdTVGNTNcdTUyNERcdTdCMTRcdThCQjBcdTUyMzAgV2lzZU1pbmRBSSBcdTY1ODdcdTY4NjMnKVxuICAgICAgICAgICAgLnNldEljb24oV0lTRU1JTkRfSUNPTl9JRClcbiAgICAgICAgICAgIC5vbkNsaWNrKCgpID0+IHZvaWQgdGhpcy5zZW5kRmlsZXNXaXRoVGFyZ2V0KHZpZXcuZmlsZSA/IFt2aWV3LmZpbGVdIDogW10sICdkb2N1bWVudHMnKSksXG4gICAgICAgICk7XG4gICAgICAgIG1lbnUuYWRkSXRlbShpdGVtID0+XG4gICAgICAgICAgaXRlbVxuICAgICAgICAgICAgLnNldFRpdGxlKCdcdTUzRDFcdTkwMDFcdTVGNTNcdTUyNERcdTdCMTRcdThCQjBcdTUyMzAgV2lzZU1pbmRBSSBcdTc3RTVcdThCQzZcdTVFOTMnKVxuICAgICAgICAgICAgLnNldEljb24oV0lTRU1JTkRfSUNPTl9JRClcbiAgICAgICAgICAgIC5vbkNsaWNrKCgpID0+IHZvaWQgdGhpcy5zZW5kRmlsZXNXaXRoVGFyZ2V0KHZpZXcuZmlsZSA/IFt2aWV3LmZpbGVdIDogW10sICdrbm93bGVkZ2UnKSksXG4gICAgICAgICk7XG4gICAgICAgIGNvbnN0IHNlbGVjdGVkVGV4dCA9IGVkaXRvci5nZXRTZWxlY3Rpb24oKTtcbiAgICAgICAgaWYgKHNlbGVjdGVkVGV4dC50cmltKCkpIHtcbiAgICAgICAgICBtZW51LmFkZEl0ZW0oaXRlbSA9PlxuICAgICAgICAgICAgaXRlbVxuICAgICAgICAgICAgICAuc2V0VGl0bGUoJ1x1NTNEMVx1OTAwMVx1OTAwOVx1NEUyRFx1NjU4N1x1NjcyQ1x1NTIzMCBXaXNlTWluZEFJIFx1N0IxNFx1OEJCMCcpXG4gICAgICAgICAgICAgIC5zZXRJY29uKFdJU0VNSU5EX0lDT05fSUQpXG4gICAgICAgICAgICAgIC5vbkNsaWNrKCgpID0+IHZvaWQgdGhpcy5zZW5kU2VsZWN0ZWRUZXh0V2l0aFRhcmdldChzZWxlY3RlZFRleHQsIHZpZXcuZmlsZT8ucGF0aCB8fCAnXHU1RjUzXHU1MjREXHU3QjE0XHU4QkIwJykpLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHNlbmRBY3RpdmVGaWxlV2l0aFRhcmdldCh0YXJnZXQ6IENvbnRleHRNZW51VGFyZ2V0KSB7XG4gICAgY29uc3QgZmlsZSA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk7XG4gICAgYXdhaXQgdGhpcy5zZW5kRmlsZXNXaXRoVGFyZ2V0KGZpbGUgPyBbZmlsZV0gOiBbXSwgdGFyZ2V0KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc2VuZEFjdGl2ZUZvbGRlcigpIHtcbiAgICBjb25zdCBhY3RpdmUgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpO1xuICAgIGlmICghYWN0aXZlKSB7XG4gICAgICBuZXcgTm90aWNlKCdcdTZDQTFcdTY3MDlcdTVGNTNcdTUyNERcdTdCMTRcdThCQjAnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZm9sZGVyID0gYWN0aXZlLnBhdGguaW5jbHVkZXMoJy8nKSA/IGFjdGl2ZS5wYXRoLnNwbGl0KCcvJykuc2xpY2UoMCwgLTEpLmpvaW4oJy8nKSA6ICcnO1xuICAgIGNvbnN0IGZpbGVzID0gdGhpcy5hcHAudmF1bHQuZ2V0TWFya2Rvd25GaWxlcygpLmZpbHRlcihmaWxlID0+IChmb2xkZXIgPyBmaWxlLnBhdGguc3RhcnRzV2l0aChgJHtmb2xkZXJ9L2ApIDogIWZpbGUucGF0aC5pbmNsdWRlcygnLycpKSk7XG4gICAgYXdhaXQgdGhpcy5zZW5kRmlsZXNXaXRoVGFyZ2V0KGZpbGVzLCAnbm90ZXMnKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc2VuZEZpbGVzV2l0aFRhcmdldChmaWxlczogYW55W10sIHRhcmdldDogQ29udGV4dE1lbnVUYXJnZXQpIHtcbiAgICBpZiAoIWZpbGVzLmxlbmd0aCkge1xuICAgICAgbmV3IE5vdGljZSgnXHU2Q0ExXHU2NzA5XHU1M0VGXHU1M0QxXHU5MDAxXHU3Njg0IE1hcmtkb3duIFx1N0IxNFx1OEJCMCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBkZXN0aW5hdGlvbiA9IGF3YWl0IHRoaXMucGlja0NvbnRleHRNZW51RGVzdGluYXRpb24odGFyZ2V0KTtcbiAgICBpZiAoIWRlc3RpbmF0aW9uKSByZXR1cm47XG4gICAgYXdhaXQgdGhpcy5zZW5kRmlsZXMoZmlsZXMsIHRhcmdldFNlbGVjdGlvbih0YXJnZXQpLCBkZXN0aW5hdGlvbik7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHNlbmRGaWxlcyhmaWxlczogYW55W10sIHRhcmdldHM6IEltcG9ydFRhcmdldFNlbGVjdGlvbiwgZGVzdGluYXRpb24/OiBDb250ZXh0TWVudURlc3RpbmF0aW9uKSB7XG4gICAgaWYgKCFmaWxlcy5sZW5ndGgpIHtcbiAgICAgIG5ldyBOb3RpY2UoJ1x1NkNBMVx1NjcwOVx1NTNFRlx1NTNEMVx1OTAwMVx1NzY4NCBNYXJrZG93biBcdTdCMTRcdThCQjAnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjb25uZWN0ZWQgPSBhd2FpdCB0aGlzLnRlc3RDb25uZWN0aW9uKCk7XG4gICAgaWYgKCFjb25uZWN0ZWQpIHtcbiAgICAgIG5ldyBOb3RpY2UoJ1x1NjVFMFx1NkNENVx1OEZERVx1NjNBNSBXaXNlTWluZEFJXHVGRjBDXHU4QkY3XHU1MTQ4XHU1NDJGXHU1MkE4IFdpc2VNaW5kQUkgXHU2NzJDXHU1NzMwXHU2M0E1XHU1M0UzJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5zdGF0dXNCYXIuc2V0U3luY2luZygpO1xuICAgIGNvbnN0IGl0ZW1zOiBPYnNpZGlhblNvdXJjZUl0ZW1bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgICAgaXRlbXMucHVzaChhd2FpdCByZWFkT2JzaWRpYW5GaWxlKHRoaXMuYXBwLCBmaWxlKSk7XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHJ1bk9ic2lkaWFuVG9XaXNlTWluZEltcG9ydCh7XG4gICAgICBpdGVtcyxcbiAgICAgIGFwaTogdGhpcy5hcGksXG4gICAgICB0YXJnZXRzLFxuICAgICAgbm90ZUZvbGRlclBhdGhzOiBkZXN0aW5hdGlvbj8udGFyZ2V0ID09PSAnbm90ZXMnID8gW2Rlc3RpbmF0aW9uLnZhbHVlXSA6IHVuZGVmaW5lZCxcbiAgICAgIGRvY3VtZW50Rm9sZGVyUGF0aHM6IGRlc3RpbmF0aW9uPy50YXJnZXQgPT09ICdkb2N1bWVudHMnID8gW2Rlc3RpbmF0aW9uLnZhbHVlXSA6IHVuZGVmaW5lZCxcbiAgICAgIGtub3dsZWRnZUJhc2VOYW1lczogZGVzdGluYXRpb24/LnRhcmdldCA9PT0gJ2tub3dsZWRnZScgPyBbZGVzdGluYXRpb24udmFsdWUgfHwgdGhpcy5zZXR0aW5ncy5jb250ZXh0TWVudURlZmF1bHRzLmtub3dsZWRnZUJhc2VOYW1lXSA6IHVuZGVmaW5lZCxcbiAgICAgIGR1cGxpY2F0ZVBvbGljeTogdGhpcy5zZXR0aW5ncy5kdXBsaWNhdGVQb2xpY3ksXG4gICAgICBrbm93bGVkZ2VCYXNlTmFtZTogdGhpcy5zZXR0aW5ncy5kZWZhdWx0S25vd2xlZGdlQmFzZU5hbWUsXG4gICAgICBjaHVua1NpemU6IHRoaXMuc2V0dGluZ3MuY2h1bmtTaXplLFxuICAgIH0pO1xuICAgIHRoaXMuc3RhdHVzQmFyLnNldFJlc3VsdChyZXN1bHQpO1xuICAgIGlmIChkZXN0aW5hdGlvbikgYXdhaXQgdGhpcy5yZW1lbWJlckNvbnRleHRNZW51RGVzdGluYXRpb24oZGVzdGluYXRpb24pO1xuICAgIG5ldyBOb3RpY2UoYFx1NTNEMVx1OTAwMVx1NUI4Q1x1NjIxMFx1RkYxQVx1NjIxMFx1NTI5RiAke3Jlc3VsdC5jcmVhdGVkICsgcmVzdWx0LnVwZGF0ZWR9XHVGRjBDXHU1OTMxXHU4RDI1ICR7cmVzdWx0LmZhaWxlZH1gKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc2VuZFNlbGVjdGVkVGV4dFdpdGhUYXJnZXQoc2VsZWN0ZWRUZXh0OiBzdHJpbmcsIHNvdXJjZVBhdGg6IHN0cmluZykge1xuICAgIGNvbnN0IGRlc3RpbmF0aW9uID0gYXdhaXQgdGhpcy5waWNrQ29udGV4dE1lbnVEZXN0aW5hdGlvbignbm90ZXMnKTtcbiAgICBpZiAoIWRlc3RpbmF0aW9uKSByZXR1cm47XG4gICAgYXdhaXQgdGhpcy5zZW5kU2VsZWN0ZWRUZXh0KHNlbGVjdGVkVGV4dCwgc291cmNlUGF0aCwgZGVzdGluYXRpb24pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBzZW5kU2VsZWN0ZWRUZXh0KHNlbGVjdGVkVGV4dDogc3RyaW5nLCBzb3VyY2VQYXRoOiBzdHJpbmcsIGRlc3RpbmF0aW9uOiBDb250ZXh0TWVudURlc3RpbmF0aW9uKSB7XG4gICAgY29uc3QgdGl0bGUgPSBgJHtzb3VyY2VQYXRoLnNwbGl0KCcvJykucG9wKCk/LnJlcGxhY2UoL1xcLm1kJC8sICcnKSB8fCAnXHU5MDA5XHU0RTJEXHU2NTg3XHU2NzJDJ30gXHU2NDU4XHU1RjU1YDtcbiAgICBjb25zdCBjb25uZWN0ZWQgPSBhd2FpdCB0aGlzLnRlc3RDb25uZWN0aW9uKCk7XG4gICAgaWYgKCFjb25uZWN0ZWQpIHtcbiAgICAgIG5ldyBOb3RpY2UoJ1x1NjVFMFx1NkNENVx1OEZERVx1NjNBNSBXaXNlTWluZEFJXHVGRjBDXHU4QkY3XHU1MTQ4XHU1NDJGXHU1MkE4IFdpc2VNaW5kQUkgXHU2NzJDXHU1NzMwXHU2M0E1XHU1M0UzJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5zdGF0dXNCYXIuc2V0U3luY2luZygpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBpdGVtOiBPYnNpZGlhblNvdXJjZUl0ZW0gPSB7XG4gICAgICAgIHBhdGg6IHNvdXJjZVBhdGgsXG4gICAgICAgIGFic29sdXRlUGF0aDogc291cmNlUGF0aCxcbiAgICAgICAgYmFzZW5hbWU6IHRpdGxlLFxuICAgICAgICBmb2xkZXJQYXRoOiAnJyxcbiAgICAgICAgdGl0bGUsXG4gICAgICAgIG1hcmtkb3duOiBgJHtzZWxlY3RlZFRleHR9XFxuXFxuPiBcdTY3NjVcdTZFOTBcdUZGMUEke3NvdXJjZVBhdGh9YCxcbiAgICAgICAgcGxhaW5UZXh0OiBzZWxlY3RlZFRleHQsXG4gICAgICAgIHRhZ3M6IFsnb2JzaWRpYW4nLCAnXHU2NDU4XHU1RjU1J10sXG4gICAgICAgIGZyb250bWF0dGVyOiB7fSxcbiAgICAgICAgbW9kaWZpZWRBdDogRGF0ZS5ub3coKSxcbiAgICAgICAgc2l6ZTogc2VsZWN0ZWRUZXh0Lmxlbmd0aCxcbiAgICAgICAgY29udGVudEhhc2g6IGAke0RhdGUubm93KCl9YCxcbiAgICAgIH07XG4gICAgICBhd2FpdCBydW5PYnNpZGlhblRvV2lzZU1pbmRJbXBvcnQoe1xuICAgICAgICBpdGVtczogW2l0ZW1dLFxuICAgICAgICBhcGk6IHRoaXMuYXBpLFxuICAgICAgICB0YXJnZXRzOiB7IG5vdGVzOiB0cnVlLCBkb2N1bWVudHM6IGZhbHNlLCBrbm93bGVkZ2U6IGZhbHNlIH0sXG4gICAgICAgIG5vdGVGb2xkZXJQYXRoczogW2Rlc3RpbmF0aW9uLnZhbHVlXSxcbiAgICAgICAgZHVwbGljYXRlUG9saWN5OiB0aGlzLnNldHRpbmdzLmR1cGxpY2F0ZVBvbGljeSxcbiAgICAgICAga25vd2xlZGdlQmFzZU5hbWU6IHRoaXMuc2V0dGluZ3MuZGVmYXVsdEtub3dsZWRnZUJhc2VOYW1lLFxuICAgICAgICBjaHVua1NpemU6IHRoaXMuc2V0dGluZ3MuY2h1bmtTaXplLFxuICAgICAgfSk7XG4gICAgICB0aGlzLnN0YXR1c0Jhci5zZXRDb25uZWN0ZWQoKTtcbiAgICAgIGF3YWl0IHRoaXMucmVtZW1iZXJDb250ZXh0TWVudURlc3RpbmF0aW9uKGRlc3RpbmF0aW9uKTtcbiAgICAgIG5ldyBOb3RpY2UoJ1x1OTAwOVx1NEUyRFx1NjU4N1x1NjcyQ1x1NURGMlx1NTNEMVx1OTAwMVx1NTIzMCBXaXNlTWluZEFJIFx1N0IxNFx1OEJCMCcpO1xuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIHRoaXMuc3RhdHVzQmFyLnNldENvbm5lY3RlZCgpO1xuICAgICAgbmV3IE5vdGljZShlcnJvcj8ubWVzc2FnZSB8fCAnXHU1M0QxXHU5MDAxXHU1OTMxXHU4RDI1Jyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBub3JtYWxpemVDb250ZXh0TWVudVNldHRpbmdzKCkge1xuICAgIHRoaXMuc2V0dGluZ3MuY29udGV4dE1lbnVEZWZhdWx0cyA9IHtcbiAgICAgIC4uLkRFRkFVTFRfU0VUVElOR1MuY29udGV4dE1lbnVEZWZhdWx0cyxcbiAgICAgIC4uLih0aGlzLnNldHRpbmdzLmNvbnRleHRNZW51RGVmYXVsdHMgfHwge30pLFxuICAgIH07XG4gICAgdGhpcy5zZXR0aW5ncy5jb250ZXh0TWVudURlZmF1bHRzLmtub3dsZWRnZUJhc2VOYW1lID1cbiAgICAgIHRoaXMuc2V0dGluZ3MuY29udGV4dE1lbnVEZWZhdWx0cy5rbm93bGVkZ2VCYXNlTmFtZVxuICAgICAgfHwgdGhpcy5zZXR0aW5ncy5kZWZhdWx0S25vd2xlZGdlQmFzZU5hbWVcbiAgICAgIHx8IERFRkFVTFRfU0VUVElOR1MuY29udGV4dE1lbnVEZWZhdWx0cy5rbm93bGVkZ2VCYXNlTmFtZTtcbiAgICB0aGlzLnNldHRpbmdzLmNvbnRleHRNZW51UmVjZW50cyA9IHtcbiAgICAgIG5vdGVzOiBBcnJheS5pc0FycmF5KHRoaXMuc2V0dGluZ3MuY29udGV4dE1lbnVSZWNlbnRzPy5ub3RlcykgPyB0aGlzLnNldHRpbmdzLmNvbnRleHRNZW51UmVjZW50cy5ub3RlcyA6IFtdLFxuICAgICAgZG9jdW1lbnRzOiBBcnJheS5pc0FycmF5KHRoaXMuc2V0dGluZ3MuY29udGV4dE1lbnVSZWNlbnRzPy5kb2N1bWVudHMpID8gdGhpcy5zZXR0aW5ncy5jb250ZXh0TWVudVJlY2VudHMuZG9jdW1lbnRzIDogW10sXG4gICAgICBrbm93bGVkZ2U6IEFycmF5LmlzQXJyYXkodGhpcy5zZXR0aW5ncy5jb250ZXh0TWVudVJlY2VudHM/Lmtub3dsZWRnZSkgPyB0aGlzLnNldHRpbmdzLmNvbnRleHRNZW51UmVjZW50cy5rbm93bGVkZ2UgOiBbXSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBwaWNrQ29udGV4dE1lbnVEZXN0aW5hdGlvbih0YXJnZXQ6IENvbnRleHRNZW51VGFyZ2V0KTogUHJvbWlzZTxDb250ZXh0TWVudURlc3RpbmF0aW9uIHwgbnVsbD4ge1xuICAgIGNvbnN0IGNvbm5lY3RlZCA9IGF3YWl0IHRoaXMudGVzdENvbm5lY3Rpb24oKTtcbiAgICBpZiAoIWNvbm5lY3RlZCkge1xuICAgICAgbmV3IE5vdGljZSgnXHU2NUUwXHU2Q0Q1XHU4RkRFXHU2M0E1IFdpc2VNaW5kQUlcdUZGMENcdThCRjdcdTUxNDhcdTU0MkZcdTUyQTggV2lzZU1pbmRBSSBcdTY3MkNcdTU3MzBcdTYzQTVcdTUzRTMnKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBvcHRpb25zID0gYXdhaXQgdGhpcy5sb2FkQ29udGV4dE1lbnVPcHRpb25zKHRhcmdldCk7XG4gICAgICBpZiAoIW9wdGlvbnMubGVuZ3RoKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYFdpc2VNaW5kQUkgXHU5MUNDXHU4RkQ4XHU2Q0ExXHU2NzA5XHU1M0VGXHU5MDA5XHU2MkU5XHU3Njg0JHtjb250ZXh0TWVudVRhcmdldExhYmVsKHRhcmdldCl9YCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMub3BlbkNvbnRleHRNZW51RGVzdGluYXRpb25EaWFsb2codGFyZ2V0LCBvcHRpb25zKTtcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICBuZXcgTm90aWNlKGVycm9yPy5tZXNzYWdlIHx8ICdcdThCRkJcdTUzRDYgV2lzZU1pbmRBSSBcdTc2RUVcdTY4MDdcdTU5MzFcdThEMjUnKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbG9hZENvbnRleHRNZW51T3B0aW9ucyh0YXJnZXQ6IENvbnRleHRNZW51VGFyZ2V0KSB7XG4gICAgaWYgKHRhcmdldCA9PT0gJ25vdGVzJykge1xuICAgICAgY29uc3QgZm9sZGVycyA9IGF3YWl0IHRoaXMuYXBpLmxpc3ROb3RlRm9sZGVycygpO1xuICAgICAgcmV0dXJuIGZvbGRlclBhdGhPcHRpb25zKGZvbGRlcnMpO1xuICAgIH1cbiAgICBpZiAodGFyZ2V0ID09PSAnZG9jdW1lbnRzJykge1xuICAgICAgY29uc3QgZm9sZGVycyA9IGF3YWl0IHRoaXMuYXBpLmxpc3RGaWxlRm9sZGVycygpO1xuICAgICAgcmV0dXJuIGZvbGRlclBhdGhPcHRpb25zKGZvbGRlcnMpO1xuICAgIH1cbiAgICBjb25zdCBiYXNlcyA9IGF3YWl0IHRoaXMuYXBpLmxpc3RLbm93bGVkZ2VCYXNlcygpO1xuICAgIHJldHVybiBiYXNlc1xuICAgICAgLm1hcChpdGVtID0+IHNhZmVUZXh0KGl0ZW0/Lm5hbWUsIGl0ZW0/LnRpdGxlLCBgXHU3N0U1XHU4QkM2XHU1RTkzICR7aXRlbT8uaWR9YCkpXG4gICAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgICAuc29ydCgoYSwgYikgPT4gYS5sb2NhbGVDb21wYXJlKGIpKVxuICAgICAgLm1hcCh2YWx1ZSA9PiAoeyB2YWx1ZSwgdGl0bGU6IHZhbHVlIH0pKTtcbiAgfVxuXG4gIHByaXZhdGUgb3BlbkNvbnRleHRNZW51RGVzdGluYXRpb25EaWFsb2coXG4gICAgdGFyZ2V0OiBDb250ZXh0TWVudVRhcmdldCxcbiAgICBvcHRpb25zOiBBcnJheTx7IHZhbHVlOiBzdHJpbmc7IHRpdGxlOiBzdHJpbmcgfT4sXG4gICk6IFByb21pc2U8Q29udGV4dE1lbnVEZXN0aW5hdGlvbiB8IG51bGw+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICBjb25zdCBvdmVybGF5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBvdmVybGF5LmNsYXNzTmFtZSA9ICd3aXNlbWluZC1icmlkZ2UtaGlzdG9yeS1vdmVybGF5JztcbiAgICAgIGNvbnN0IG1vZGFsID0gb3ZlcmxheS5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtZGlhbG9nIHdpc2VtaW5kLWJyaWRnZS1jb250ZXh0LWRpYWxvZycgfSk7XG4gICAgICBjb25zdCBoZWFkZXIgPSBtb2RhbC5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtaGlzdG9yeS10aXRsZScgfSk7XG4gICAgICBoZWFkZXIuY3JlYXRlRWwoJ2gyJywgeyB0ZXh0OiBgXHU5MDA5XHU2MkU5JHtjb250ZXh0TWVudVRhcmdldExhYmVsKHRhcmdldCl9YCB9KTtcbiAgICAgIGNvbnN0IGNsb3NlQnV0dG9uID0gaGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1pY29uLWJ1dHRvbicsIHRleHQ6ICdcdTAwRDcnIH0pO1xuICAgICAgY2xvc2VCdXR0b24udGl0bGUgPSAnXHU1MTczXHU5NUVEJztcblxuICAgICAgbGV0IHNldHRsZWQgPSBmYWxzZTtcbiAgICAgIGNvbnN0IGZpbmlzaCA9ICh2YWx1ZTogQ29udGV4dE1lbnVEZXN0aW5hdGlvbiB8IG51bGwpID0+IHtcbiAgICAgICAgaWYgKHNldHRsZWQpIHJldHVybjtcbiAgICAgICAgc2V0dGxlZCA9IHRydWU7XG4gICAgICAgIG92ZXJsYXkucmVtb3ZlKCk7XG4gICAgICAgIHJlc29sdmUodmFsdWUpO1xuICAgICAgfTtcbiAgICAgIGNsb3NlQnV0dG9uLm9uY2xpY2sgPSBldmVudCA9PiB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBmaW5pc2gobnVsbCk7XG4gICAgICB9O1xuICAgICAgb3ZlcmxheS5vbmNsaWNrID0gZXZlbnQgPT4ge1xuICAgICAgICBpZiAoZXZlbnQudGFyZ2V0ID09PSBvdmVybGF5KSBmaW5pc2gobnVsbCk7XG4gICAgICB9O1xuXG4gICAgICBjb25zdCBkZWZhdWx0VmFsdWUgPSB0aGlzLmdldENvbnRleHRNZW51RGVmYXVsdCh0YXJnZXQpO1xuICAgICAgbGV0IHNlbGVjdGVkID0gb3B0aW9ucy5zb21lKGl0ZW0gPT4gaXRlbS52YWx1ZSA9PT0gZGVmYXVsdFZhbHVlKVxuICAgICAgICA/IGRlZmF1bHRWYWx1ZVxuICAgICAgICA6IG9wdGlvbnNbMF0/LnZhbHVlIHx8ICcnO1xuXG4gICAgICBjb25zdCBpbnRybyA9IG1vZGFsLmNyZWF0ZURpdih7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS10dXRvcmlhbC1pbnRybycgfSk7XG4gICAgICBpbnRyby5jcmVhdGVFbCgnc3Ryb25nJywgeyB0ZXh0OiBgXHU0RkREXHU1QjU4XHU1MjMwJHtjb250ZXh0TWVudVRhcmdldExhYmVsKHRhcmdldCl9YCB9KTtcbiAgICAgIGludHJvLmNyZWF0ZUVsKCdzcGFuJywgeyB0ZXh0OiBgXHU5RUQ4XHU4QkE0XHU5MDA5XHU0RTJEXHVGRjFBJHtsYWJlbEZvclZhbHVlKHNlbGVjdGVkKX1gIH0pO1xuXG4gICAgICBjb25zdCByZWNlbnRzID0gdGhpcy5nZXRDb250ZXh0TWVudVJlY2VudHModGFyZ2V0KS5maWx0ZXIodmFsdWUgPT4gb3B0aW9ucy5zb21lKG9wdGlvbiA9PiBvcHRpb24udmFsdWUgPT09IHZhbHVlKSk7XG4gICAgICBpZiAocmVjZW50cy5sZW5ndGgpIHtcbiAgICAgICAgY29uc3QgcmVjZW50V3JhcCA9IG1vZGFsLmNyZWF0ZURpdih7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1jb250ZXh0LXJlY2VudHMnIH0pO1xuICAgICAgICByZWNlbnRXcmFwLmNyZWF0ZUVsKCdzcGFuJywgeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtbXV0ZWQnLCB0ZXh0OiAnXHU2NzAwXHU4RkQxXHU0RkREXHU1QjU4XHU3Njg0XHU2NTg3XHU0RUY2XHU1OTM5JyB9KTtcbiAgICAgICAgY29uc3QgYmFkZ2VzID0gcmVjZW50V3JhcC5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtYmFkZ2VzJyB9KTtcbiAgICAgICAgcmVjZW50cy5mb3JFYWNoKHZhbHVlID0+IHtcbiAgICAgICAgICBjb25zdCBiYWRnZSA9IGJhZGdlcy5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtYmFkZ2Utc29mdCBiYWRnZS1zb2Z0JywgdGV4dDogbGFiZWxGb3JWYWx1ZSh2YWx1ZSkgfSk7XG4gICAgICAgICAgYmFkZ2Uub25jbGljayA9IGV2ZW50ID0+IHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBzZWxlY3RlZCA9IHZhbHVlO1xuICAgICAgICAgICAgcmVuZGVyT3B0aW9ucygpO1xuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBsaXN0ID0gbW9kYWwuY3JlYXRlRGl2KHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLWNvbnRleHQtdGFyZ2V0LWxpc3QnIH0pO1xuICAgICAgY29uc3QgcmVuZGVyT3B0aW9ucyA9ICgpID0+IHtcbiAgICAgICAgbGlzdC5lbXB0eSgpO1xuICAgICAgICBvcHRpb25zLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgICAgICBjb25zdCByb3cgPSBsaXN0LmNyZWF0ZUVsKCdsYWJlbCcsIHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLXJvdycgfSk7XG4gICAgICAgICAgY29uc3QgbGVmdCA9IHJvdy5jcmVhdGVFbCgnc3BhbicsIHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLXJvdy1tYWluJyB9KTtcbiAgICAgICAgICBjb25zdCByYWRpbyA9IGxlZnQuY3JlYXRlRWwoJ2lucHV0Jyk7XG4gICAgICAgICAgcmFkaW8udHlwZSA9ICdyYWRpbyc7XG4gICAgICAgICAgcmFkaW8ubmFtZSA9ICd3aXNlbWluZC1jb250ZXh0LXRhcmdldCc7XG4gICAgICAgICAgcmFkaW8uY2hlY2tlZCA9IG9wdGlvbi52YWx1ZSA9PT0gc2VsZWN0ZWQ7XG4gICAgICAgICAgcmFkaW8ub25jaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICBzZWxlY3RlZCA9IG9wdGlvbi52YWx1ZTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIGxlZnQuY3JlYXRlRWwoJ3NwYW4nLCB7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1yb3ctdGl0bGUnLCB0ZXh0OiBvcHRpb24udGl0bGUgfSk7XG4gICAgICAgICAgcm93LmNyZWF0ZUVsKCdzcGFuJywgeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtbXV0ZWQgd2lzZW1pbmQtYnJpZGdlLXJvdy1tZXRhJywgdGV4dDogY29udGV4dE1lbnVUYXJnZXRMYWJlbCh0YXJnZXQpIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgICByZW5kZXJPcHRpb25zKCk7XG5cbiAgICAgIGNvbnN0IGFjdGlvbnMgPSBtb2RhbC5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtZGlhbG9nLWFjdGlvbnMnIH0pO1xuICAgICAgY29uc3QgY2FuY2VsID0gYWN0aW9ucy5jcmVhdGVFbCgnYnV0dG9uJywgeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtdGV4dC1idXR0b24nLCB0ZXh0OiAnXHU1M0Q2XHU2RDg4JyB9KTtcbiAgICAgIGNhbmNlbC5vbmNsaWNrID0gKCkgPT4gZmluaXNoKG51bGwpO1xuICAgICAgY29uc3QgY29uZmlybSA9IGFjdGlvbnMuY3JlYXRlRWwoJ2J1dHRvbicsIHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLXRleHQtYnV0dG9uJywgdGV4dDogJ1x1NTNEMVx1OTAwMScgfSk7XG4gICAgICBjb25maXJtLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgIGNvbnN0IG9wdGlvbiA9IG9wdGlvbnMuZmluZChpdGVtID0+IGl0ZW0udmFsdWUgPT09IHNlbGVjdGVkKSB8fCBvcHRpb25zWzBdO1xuICAgICAgICBmaW5pc2gob3B0aW9uID8geyB0YXJnZXQsIHZhbHVlOiBvcHRpb24udmFsdWUsIHRpdGxlOiBvcHRpb24udGl0bGUgfSA6IG51bGwpO1xuICAgICAgfTtcblxuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChvdmVybGF5KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q29udGV4dE1lbnVEZWZhdWx0KHRhcmdldDogQ29udGV4dE1lbnVUYXJnZXQpIHtcbiAgICBpZiAodGFyZ2V0ID09PSAnbm90ZXMnKSByZXR1cm4gdGhpcy5zZXR0aW5ncy5jb250ZXh0TWVudURlZmF1bHRzLm5vdGVGb2xkZXJQYXRoIHx8ICcnO1xuICAgIGlmICh0YXJnZXQgPT09ICdkb2N1bWVudHMnKSByZXR1cm4gdGhpcy5zZXR0aW5ncy5jb250ZXh0TWVudURlZmF1bHRzLmRvY3VtZW50Rm9sZGVyUGF0aCB8fCAnJztcbiAgICByZXR1cm4gdGhpcy5zZXR0aW5ncy5jb250ZXh0TWVudURlZmF1bHRzLmtub3dsZWRnZUJhc2VOYW1lIHx8IHRoaXMuc2V0dGluZ3MuZGVmYXVsdEtub3dsZWRnZUJhc2VOYW1lO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRDb250ZXh0TWVudVJlY2VudHModGFyZ2V0OiBDb250ZXh0TWVudVRhcmdldCkge1xuICAgIHJldHVybiB0aGlzLnNldHRpbmdzLmNvbnRleHRNZW51UmVjZW50c1t0YXJnZXRdIHx8IFtdO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyByZW1lbWJlckNvbnRleHRNZW51RGVzdGluYXRpb24oZGVzdGluYXRpb246IENvbnRleHRNZW51RGVzdGluYXRpb24pIHtcbiAgICBjb25zdCByZWNlbnRzID0gdGhpcy5nZXRDb250ZXh0TWVudVJlY2VudHMoZGVzdGluYXRpb24udGFyZ2V0KTtcbiAgICB0aGlzLnNldHRpbmdzLmNvbnRleHRNZW51UmVjZW50c1tkZXN0aW5hdGlvbi50YXJnZXRdID0gW1xuICAgICAgZGVzdGluYXRpb24udmFsdWUsXG4gICAgICAuLi5yZWNlbnRzLmZpbHRlcihpdGVtID0+IGl0ZW0gIT09IGRlc3RpbmF0aW9uLnZhbHVlKSxcbiAgICBdLnNsaWNlKDAsIDEwKTtcbiAgICBhd2FpdCB0aGlzLnNhdmVTZXR0aW5ncygpO1xuICB9XG59XG5cbmNvbnN0IHRhcmdldFNlbGVjdGlvbiA9ICh0YXJnZXQ6IENvbnRleHRNZW51VGFyZ2V0KTogSW1wb3J0VGFyZ2V0U2VsZWN0aW9uID0+ICh7XG4gIG5vdGVzOiB0YXJnZXQgPT09ICdub3RlcycsXG4gIGRvY3VtZW50czogdGFyZ2V0ID09PSAnZG9jdW1lbnRzJyxcbiAga25vd2xlZGdlOiB0YXJnZXQgPT09ICdrbm93bGVkZ2UnLFxufSk7XG5cbmNvbnN0IGNvbnRleHRNZW51VGFyZ2V0TGFiZWwgPSAodGFyZ2V0OiBDb250ZXh0TWVudVRhcmdldCkgPT5cbiAgdGFyZ2V0ID09PSAnbm90ZXMnID8gJ1x1N0IxNFx1OEJCMFx1NjU4N1x1NEVGNlx1NTkzOScgOiB0YXJnZXQgPT09ICdkb2N1bWVudHMnID8gJ1x1NjU4N1x1Njg2M1x1NjU4N1x1NEVGNlx1NTkzOScgOiAnXHU3N0U1XHU4QkM2XHU1RTkzJztcblxuY29uc3QgbGFiZWxGb3JWYWx1ZSA9ICh2YWx1ZTogc3RyaW5nKSA9PiB2YWx1ZSB8fCAnXHU2ODM5XHU3NkVFXHU1RjU1JztcblxuY29uc3Qgc2FmZVRleHQgPSAoLi4udmFsdWVzOiB1bmtub3duW10pID0+IHtcbiAgZm9yIChjb25zdCB2YWx1ZSBvZiB2YWx1ZXMpIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyAmJiB2YWx1ZS50cmltKCkpIHJldHVybiB2YWx1ZS50cmltKCk7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHJldHVybiBTdHJpbmcodmFsdWUpO1xuICB9XG4gIHJldHVybiAnJztcbn07XG5cbmNvbnN0IGZvbGRlclBhdGhPcHRpb25zID0gKGZvbGRlcnM6IFdpc2VNaW5kRm9sZGVyW10pID0+IHtcbiAgY29uc3QgdmFsdWVzID0gbmV3IFNldDxzdHJpbmc+KFsnJ10pO1xuICBmb2xkZXJzLmZvckVhY2goZm9sZGVyID0+IHtcbiAgICBjb25zdCBwYXRoID0gcmVzb2x2ZUZvbGRlclBhdGgoZm9sZGVyLmlkLCBmb2xkZXJzKSB8fCBmb2xkZXIubmFtZTtcbiAgICBpZiAocGF0aCkgdmFsdWVzLmFkZChwYXRoKTtcbiAgfSk7XG4gIHJldHVybiBBcnJheS5mcm9tKHZhbHVlcylcbiAgICAuc29ydChzb3J0Um9vdEZpcnN0KVxuICAgIC5tYXAodmFsdWUgPT4gKHsgdmFsdWUsIHRpdGxlOiBsYWJlbEZvclZhbHVlKHZhbHVlKSB9KSk7XG59O1xuXG5jb25zdCBzb3J0Um9vdEZpcnN0ID0gKGE6IHN0cmluZywgYjogc3RyaW5nKSA9PiB7XG4gIGlmICghYSAmJiBiKSByZXR1cm4gLTE7XG4gIGlmIChhICYmICFiKSByZXR1cm4gMTtcbiAgcmV0dXJuIGEubG9jYWxlQ29tcGFyZShiKTtcbn07XG4iLCAiPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIjAgMCAxMDI0IDEwMjRcIiBhcmlhLWhpZGRlbj1cInRydWVcIj5cbiAgPHBhdGggZmlsbD1cImN1cnJlbnRDb2xvclwiIGQ9XCJNNDAgMjA1aDE0NWM0NSAwIDg2IDI5IDEwMCA3MmwxNzcgNTMzYzkgMjYgMyA1NS0xNSA3NmwtOTMgMTA5TDQwIDIwNVpcIi8+XG4gIDxwYXRoIGZpbGw9XCJjdXJyZW50Q29sb3JcIiBkPVwiTTM5OCAyMDBoMTUxYzQ3IDAgODkgMzEgMTAyIDc2bDE3OCA1MzVjOCAyNSAyIDUzLTE1IDczbC05MiAxMDlMMzk4IDIwMFpcIi8+XG4gIDxwYXRoIGZpbGw9XCJjdXJyZW50Q29sb3JcIiBkPVwiTTc1NiAyMTZjOTItMjQgMTc5IDUgMjE5IDczIDQ3IDgwIDE3IDE4My04MyAzMTZMNzU2IDIxNlpcIi8+XG48L3N2Zz5cbiIsICJpbXBvcnQgdHlwZSB7IER1cGxpY2F0ZVBvbGljeSwgT2JzaWRpYW5Tb3VyY2VJdGVtLCBXaXNlTWluZFNvdXJjZUl0ZW0sIFdpc2VNaW5kU291cmNlVHlwZSB9IGZyb20gJy4vdHlwZXMnO1xuXG5jb25zdCBPQlNJRElBTl9NQVJLRVJfUkUgPSAvPCEtLVxccyp3aXNlbWluZDpzb3VyY2U9b2JzaWRpYW5cXHMrcGF0aD1cIihbXlwiXSspXCJcXHMraGFzaD1cIihbXlwiXSspXCJcXHMqLS0+LztcbmNvbnN0IFdJU0VNSU5EX01BUktFUl9SRSA9IC88IS0tXFxzKndpc2VtaW5kOnNvdXJjZT13aXNlbWluZFxccyt0eXBlPVwiKFteXCJdKylcIlxccytpZD1cIihbXlwiXSspXCJcXHMraGFzaD1cIihbXlwiXSspXCJcXHMqLS0+LztcblxuZXhwb3J0IHR5cGUgUGFyc2VkU291cmNlTWFya2VyID1cbiAgfCB7IHNvdXJjZTogJ29ic2lkaWFuJzsgcGF0aDogc3RyaW5nOyBoYXNoOiBzdHJpbmcgfVxuICB8IHsgc291cmNlOiAnd2lzZW1pbmQnOyB0eXBlOiBXaXNlTWluZFNvdXJjZVR5cGU7IGlkOiBzdHJpbmc7IGhhc2g6IHN0cmluZyB9O1xuXG5leHBvcnQgY29uc3QgY3JlYXRlT2JzaWRpYW5Tb3VyY2VNYXJrZXIgPSAoaXRlbTogUGljazxPYnNpZGlhblNvdXJjZUl0ZW0sICdwYXRoJyB8ICdjb250ZW50SGFzaCc+KSA9PlxuICBgPCEtLSB3aXNlbWluZDpzb3VyY2U9b2JzaWRpYW4gcGF0aD1cIiR7ZXNjYXBlQXR0cihpdGVtLnBhdGgpfVwiIGhhc2g9XCIke2VzY2FwZUF0dHIoaXRlbS5jb250ZW50SGFzaCl9XCIgLS0+YDtcblxuZXhwb3J0IGNvbnN0IGNyZWF0ZVdpc2VNaW5kU291cmNlTWFya2VyID0gKGl0ZW06IFBpY2s8V2lzZU1pbmRTb3VyY2VJdGVtLCAnc291cmNlVHlwZScgfCAnaWQnIHwgJ2NvbnRlbnRIYXNoJz4pID0+XG4gIGA8IS0tIHdpc2VtaW5kOnNvdXJjZT13aXNlbWluZCB0eXBlPVwiJHtlc2NhcGVBdHRyKGl0ZW0uc291cmNlVHlwZSl9XCIgaWQ9XCIke2VzY2FwZUF0dHIoU3RyaW5nKGl0ZW0uaWQpKX1cIiBoYXNoPVwiJHtlc2NhcGVBdHRyKGl0ZW0uY29udGVudEhhc2gpfVwiIC0tPmA7XG5cbmV4cG9ydCBjb25zdCBhcHBlbmRNYXJrZXIgPSAobWFya2Rvd246IHN0cmluZywgbWFya2VyOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgY2xlYW5lZCA9IHN0cmlwU291cmNlTWFya2VycyhtYXJrZG93bikudHJpbUVuZCgpO1xuICByZXR1cm4gYCR7Y2xlYW5lZH1cXG5cXG4ke21hcmtlcn1gO1xufTtcblxuZXhwb3J0IGNvbnN0IHN0cmlwU291cmNlTWFya2VycyA9IChtYXJrZG93bjogc3RyaW5nKSA9PlxuICBtYXJrZG93bi5yZXBsYWNlKE9CU0lESUFOX01BUktFUl9SRSwgJycpLnJlcGxhY2UoV0lTRU1JTkRfTUFSS0VSX1JFLCAnJykudHJpbUVuZCgpO1xuXG5leHBvcnQgY29uc3QgZmluZFNvdXJjZU1hcmtlciA9IChtYXJrZG93bjogc3RyaW5nKTogUGFyc2VkU291cmNlTWFya2VyIHwgbnVsbCA9PiB7XG4gIGNvbnN0IG9ic2lkaWFuID0gbWFya2Rvd24ubWF0Y2goT0JTSURJQU5fTUFSS0VSX1JFKTtcbiAgaWYgKG9ic2lkaWFuKSB7XG4gICAgcmV0dXJuIHsgc291cmNlOiAnb2JzaWRpYW4nLCBwYXRoOiB1bmVzY2FwZUF0dHIob2JzaWRpYW5bMV0pLCBoYXNoOiB1bmVzY2FwZUF0dHIob2JzaWRpYW5bMl0pIH07XG4gIH1cblxuICBjb25zdCB3aXNlbWluZCA9IG1hcmtkb3duLm1hdGNoKFdJU0VNSU5EX01BUktFUl9SRSk7XG4gIGlmICh3aXNlbWluZCkge1xuICAgIHJldHVybiB7XG4gICAgICBzb3VyY2U6ICd3aXNlbWluZCcsXG4gICAgICB0eXBlOiB1bmVzY2FwZUF0dHIod2lzZW1pbmRbMV0pIGFzIFdpc2VNaW5kU291cmNlVHlwZSxcbiAgICAgIGlkOiB1bmVzY2FwZUF0dHIod2lzZW1pbmRbMl0pLFxuICAgICAgaGFzaDogdW5lc2NhcGVBdHRyKHdpc2VtaW5kWzNdKSxcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59O1xuXG5leHBvcnQgY29uc3QgcGxhbkR1cGxpY2F0ZUFjdGlvbiA9IChwYXJhbXM6IHtcbiAgZXhpc3RpbmdIYXNoPzogc3RyaW5nIHwgbnVsbDtcbiAgaW5jb21pbmdIYXNoOiBzdHJpbmc7XG4gIHBvbGljeTogRHVwbGljYXRlUG9saWN5O1xufSk6ICdjcmVhdGUnIHwgJ3VwZGF0ZScgfCAnc2tpcCcgPT4ge1xuICBpZiAoIXBhcmFtcy5leGlzdGluZ0hhc2gpIHJldHVybiAnY3JlYXRlJztcbiAgaWYgKHBhcmFtcy5wb2xpY3kgPT09ICdkdXBsaWNhdGUnKSByZXR1cm4gJ2NyZWF0ZSc7XG4gIGlmIChwYXJhbXMucG9saWN5ID09PSAnc2tpcCcpIHJldHVybiAnc2tpcCc7XG4gIHJldHVybiBwYXJhbXMuZXhpc3RpbmdIYXNoID09PSBwYXJhbXMuaW5jb21pbmdIYXNoID8gJ3NraXAnIDogJ3VwZGF0ZSc7XG59O1xuXG5jb25zdCBlc2NhcGVBdHRyID0gKHZhbHVlOiBzdHJpbmcpID0+IHZhbHVlLnJlcGxhY2UoLyYvZywgJyZhbXA7JykucmVwbGFjZSgvXCIvZywgJyZxdW90OycpO1xuY29uc3QgdW5lc2NhcGVBdHRyID0gKHZhbHVlOiBzdHJpbmcpID0+IHZhbHVlLnJlcGxhY2UoLyZxdW90Oy9nLCAnXCInKS5yZXBsYWNlKC8mYW1wOy9nLCAnJicpO1xuIiwgImltcG9ydCB7IGFwcGVuZE1hcmtlciwgY3JlYXRlT2JzaWRpYW5Tb3VyY2VNYXJrZXIgfSBmcm9tICcuL21hcmtlcnMnO1xuaW1wb3J0IHR5cGUgeyBCcmlkZ2VSdW5SZXN1bHQsIER1cGxpY2F0ZVBvbGljeSwgSW1wb3J0VGFyZ2V0U2VsZWN0aW9uLE9ic2lkaWFuU291cmNlSXRlbSB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHR5cGUgeyBXaXNlTWluZEFwaUNsaWVudCB9IGZyb20gJy4vd2lzZW1pbmRBcGknO1xuXG5leHBvcnQgdHlwZSBPYnNpZGlhblRvV2lzZU1pbmRPcHRpb25zID0ge1xuICBpdGVtczogT2JzaWRpYW5Tb3VyY2VJdGVtW107XG4gIGFwaTogV2lzZU1pbmRBcGlDbGllbnQ7XG4gIHRhcmdldHM6IEltcG9ydFRhcmdldFNlbGVjdGlvbjtcbiAgbm90ZUZvbGRlclBhdGhzPzogc3RyaW5nW107XG4gIGRvY3VtZW50Rm9sZGVyUGF0aHM/OiBzdHJpbmdbXTtcbiAga25vd2xlZGdlQmFzZU5hbWVzPzogc3RyaW5nW107XG4gIGR1cGxpY2F0ZVBvbGljeTogRHVwbGljYXRlUG9saWN5O1xuICBrbm93bGVkZ2VCYXNlTmFtZTogc3RyaW5nO1xuICBjaHVua1NpemU6IG51bWJlcjtcbiAgc2lnbmFsPzogQWJvcnRTaWduYWw7XG4gIG9uUHJvZ3Jlc3M/OiAocmVzdWx0OiBCcmlkZ2VSdW5SZXN1bHQpID0+IHZvaWQ7XG59O1xuXG5leHBvcnQgY29uc3QgcnVuT2JzaWRpYW5Ub1dpc2VNaW5kSW1wb3J0ID0gYXN5bmMgKG9wdGlvbnM6IE9ic2lkaWFuVG9XaXNlTWluZE9wdGlvbnMpOiBQcm9taXNlPEJyaWRnZVJ1blJlc3VsdD4gPT4ge1xuICBjb25zdCByZXN1bHQgPSBlbXB0eVJlc3VsdCgpO1xuICBjb25zdCBmb2xkZXJDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmcgfCBudW1iZXIgfCBudWxsPigpO1xuICBjb25zdCBrbm93bGVkZ2VCYXNlQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyIHwgc3RyaW5nIHwgbnVsbD4oKTtcbiAgY29uc3Qgbm90ZUZvbGRlclJvb3RzID0gb3B0aW9ucy5ub3RlRm9sZGVyUGF0aHM/Lmxlbmd0aCA/IG9wdGlvbnMubm90ZUZvbGRlclBhdGhzIDogWycnXTtcbiAgY29uc3QgZG9jdW1lbnRGb2xkZXJSb290cyA9IG9wdGlvbnMuZG9jdW1lbnRGb2xkZXJQYXRocz8ubGVuZ3RoID8gb3B0aW9ucy5kb2N1bWVudEZvbGRlclBhdGhzIDogWycnXTtcbiAgY29uc3Qga25vd2xlZGdlQmFzZU5hbWVzID0gb3B0aW9ucy5rbm93bGVkZ2VCYXNlTmFtZXM/Lmxlbmd0aFxuICAgID8gb3B0aW9ucy5rbm93bGVkZ2VCYXNlTmFtZXNcbiAgICA6IFtvcHRpb25zLmtub3dsZWRnZUJhc2VOYW1lIHx8ICdPYnNpZGlhbiBcdTVCRkNcdTUxNjUnXTtcblxuICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgb3B0aW9ucy5pdGVtcy5sZW5ndGg7IGluZGV4ICs9IG9wdGlvbnMuY2h1bmtTaXplIHx8IDEwKSB7XG4gICAgaWYgKG9wdGlvbnMuc2lnbmFsPy5hYm9ydGVkKSBicmVhaztcbiAgICBjb25zdCBjaHVuayA9IG9wdGlvbnMuaXRlbXMuc2xpY2UoaW5kZXgsIGluZGV4ICsgKG9wdGlvbnMuY2h1bmtTaXplIHx8IDEwKSk7XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIGNodW5rKSB7XG4gICAgICBpZiAob3B0aW9ucy5zaWduYWw/LmFib3J0ZWQpIGJyZWFrO1xuICAgICAgY29uc3QgbWFya2VyID0gY3JlYXRlT2JzaWRpYW5Tb3VyY2VNYXJrZXIoaXRlbSk7XG4gICAgICBjb25zdCBtYXJrZG93biA9IGFwcGVuZE1hcmtlcihpdGVtLm1hcmtkb3duLCBtYXJrZXIpO1xuICAgICAgY29uc3Qgc291cmNlUGF0aCA9IGl0ZW0uYWJzb2x1dGVQYXRoIHx8IGl0ZW0ucGF0aDtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmIChvcHRpb25zLnRhcmdldHMubm90ZXMpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IHJvb3RQYXRoIG9mIG5vdGVGb2xkZXJSb290cykge1xuICAgICAgICAgICAgY29uc3QgZm9sZGVySWQgPSBhd2FpdCByZXNvbHZlUGF0aEZvbGRlcihcbiAgICAgICAgICAgICAgcm9vdFBhdGgsXG4gICAgICAgICAgICAgIGZvbGRlckNhY2hlLFxuICAgICAgICAgICAgICBvcHRpb25zLmFwaS5yZXNvbHZlTm90ZUZvbGRlci5iaW5kKG9wdGlvbnMuYXBpKSxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBjb25zdCBwYXlsb2FkID0ge1xuICAgICAgICAgICAgICB0aXRsZTogaXRlbS50aXRsZSxcbiAgICAgICAgICAgICAgbWQ6IG1hcmtkb3duLFxuICAgICAgICAgICAgICB0ZXh0OiBpdGVtLnBsYWluVGV4dCxcbiAgICAgICAgICAgICAgY29udGVudDogJycsXG4gICAgICAgICAgICAgIHRhZ3M6IGl0ZW0udGFncyxcbiAgICAgICAgICAgICAgZnJvbV9mb2xkZXI6IG5vcm1hbGl6ZVJlbW90ZUlkKGZvbGRlcklkKSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb25zdCBleGlzdGluZyA9IG9wdGlvbnMuZHVwbGljYXRlUG9saWN5ID09PSAndXBkYXRlJ1xuICAgICAgICAgICAgICA/IGF3YWl0IGZpbmRFeGlzdGluZ05vdGUob3B0aW9ucy5hcGksIGl0ZW0udGl0bGUsIG5vcm1hbGl6ZVJlbW90ZUlkKGZvbGRlcklkKSlcbiAgICAgICAgICAgICAgOiBudWxsO1xuICAgICAgICAgICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICAgICAgICAgIGF3YWl0IG9wdGlvbnMuYXBpLnVwZGF0ZU5vdGUoZXhpc3RpbmcuaWQsIHBheWxvYWQpO1xuICAgICAgICAgICAgICBwdXNoKHJlc3VsdCwgaXRlbS50aXRsZSwgaXRlbS5wYXRoLCAndXBkYXRlZCcsIGBcdTVERjJcdTg5ODZcdTc2RDYgV2lzZU1pbmRBSSBcdTdCMTRcdThCQjAke3Jvb3RQYXRoID8gYFx1RkYxQSR7cm9vdFBhdGh9YCA6ICcnfWApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgYXdhaXQgb3B0aW9ucy5hcGkuY3JlYXRlTm90ZShwYXlsb2FkKTtcbiAgICAgICAgICAgICAgcHVzaChyZXN1bHQsIGl0ZW0udGl0bGUsIGl0ZW0ucGF0aCwgJ2NyZWF0ZWQnLCBgXHU1REYyXHU1QkZDXHU1MTY1XHU0RTNBIFdpc2VNaW5kQUkgXHU3QjE0XHU4QkIwJHtyb290UGF0aCA/IGBcdUZGMUEke3Jvb3RQYXRofWAgOiAnJ31gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy50YXJnZXRzLmRvY3VtZW50cykge1xuICAgICAgICAgIGZvciAoY29uc3Qgcm9vdFBhdGggb2YgZG9jdW1lbnRGb2xkZXJSb290cykge1xuICAgICAgICAgICAgY29uc3QgZm9sZGVySWQgPSBhd2FpdCByZXNvbHZlUGF0aEZvbGRlcihcbiAgICAgICAgICAgICAgcm9vdFBhdGgsXG4gICAgICAgICAgICAgIGZvbGRlckNhY2hlLFxuICAgICAgICAgICAgICBvcHRpb25zLmFwaS5yZXNvbHZlRmlsZUZvbGRlci5iaW5kKG9wdGlvbnMuYXBpKSxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBjb25zdCBmb2xkZXIgPSBub3JtYWxpemVSZW1vdGVJZChmb2xkZXJJZCk7XG4gICAgICAgICAgICBjb25zdCBwYXlsb2FkID0ge1xuICAgICAgICAgICAgICBuYW1lOiBpdGVtLnRpdGxlLFxuICAgICAgICAgICAgICB0eXBlOiAnbWQnLFxuICAgICAgICAgICAgICBmaWxlVHlwZTogJ21kJyxcbiAgICAgICAgICAgICAgZmlsZVBhdGg6IHNvdXJjZVBhdGgsXG4gICAgICAgICAgICAgIGNvbnRlbnQ6IG1hcmtkb3duLFxuICAgICAgICAgICAgICBub3RlOiBgSW1wb3J0ZWQgZnJvbSBPYnNpZGlhbjogJHtpdGVtLnBhdGh9YCxcbiAgICAgICAgICAgICAgdGFnczogaXRlbS50YWdzLFxuICAgICAgICAgICAgICBmcm9tX2ZvbGRlcjogZm9sZGVyLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nID0gb3B0aW9ucy5kdXBsaWNhdGVQb2xpY3kgPT09ICd1cGRhdGUnXG4gICAgICAgICAgICAgID8gYXdhaXQgZmluZEV4aXN0aW5nRG9jdW1lbnQob3B0aW9ucy5hcGksIGl0ZW0udGl0bGUsIGZvbGRlcilcbiAgICAgICAgICAgICAgOiBudWxsO1xuICAgICAgICAgICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICAgICAgICAgIGF3YWl0IG9wdGlvbnMuYXBpLnVwZGF0ZURvY3VtZW50KGV4aXN0aW5nLmlkLCBwYXlsb2FkKTtcbiAgICAgICAgICAgICAgcHVzaChyZXN1bHQsIGl0ZW0udGl0bGUsIGl0ZW0ucGF0aCwgJ3VwZGF0ZWQnLCBgXHU1REYyXHU4OTg2XHU3NkQ2IFdpc2VNaW5kQUkgXHU2NTg3XHU2ODYzJHtyb290UGF0aCA/IGBcdUZGMUEke3Jvb3RQYXRofWAgOiAnJ31gKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGF3YWl0IG9wdGlvbnMuYXBpLmNyZWF0ZURvY3VtZW50KHBheWxvYWQpO1xuICAgICAgICAgICAgICBwdXNoKHJlc3VsdCwgaXRlbS50aXRsZSwgaXRlbS5wYXRoLCAnY3JlYXRlZCcsIGBcdTVERjJcdTVCRkNcdTUxNjVcdTRFM0EgV2lzZU1pbmRBSSBcdTY1ODdcdTY4NjMke3Jvb3RQYXRoID8gYFx1RkYxQSR7cm9vdFBhdGh9YCA6ICcnfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLnRhcmdldHMua25vd2xlZGdlKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBiYXNlTmFtZSBvZiBrbm93bGVkZ2VCYXNlTmFtZXMpIHtcbiAgICAgICAgICAgIGlmICgha25vd2xlZGdlQmFzZUNhY2hlLmhhcyhiYXNlTmFtZSkpIHtcbiAgICAgICAgICAgICAgY29uc3QgYmFzZTogYW55ID0gYXdhaXQgb3B0aW9ucy5hcGkucmVzb2x2ZUtub3dsZWRnZUJhc2UoYmFzZU5hbWUsIHtcbiAgICAgICAgICAgICAgICBpY29uOiAnXHVEODNEXHVEQ0RBJyxcbiAgICAgICAgICAgICAgICBkZXNjOiAnXHU0RUNFIE9ic2lkaWFuIFx1NUJGQ1x1NTE2NVx1NzY4NFx1NTE4NVx1NUJCOScsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBrbm93bGVkZ2VCYXNlQ2FjaGUuc2V0KGJhc2VOYW1lLCBiYXNlPy5pZCA/PyBudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGtub3dsZWRnZUJhc2VJZCA9IGtub3dsZWRnZUJhc2VDYWNoZS5nZXQoYmFzZU5hbWUpO1xuICAgICAgICAgICAgY29uc3QgYmFzZUlkID0gbm9ybWFsaXplUmVtb3RlSWQoa25vd2xlZGdlQmFzZUlkKTtcbiAgICAgICAgICAgIGNvbnN0IHBheWxvYWQgPSB7XG4gICAgICAgICAgICAgIGtub3dsZWRnZUJhc2VJZDogbm9ybWFsaXplUmVtb3RlSWQoa25vd2xlZGdlQmFzZUlkKSxcbiAgICAgICAgICAgICAgdGl0bGU6IGl0ZW0udGl0bGUsXG4gICAgICAgICAgICAgIGNvbnRlbnQ6IG1hcmtkb3duLFxuICAgICAgICAgICAgICBzdW1tYXJ5OiBgSW1wb3J0ZWQgZnJvbSBPYnNpZGlhbjogJHtpdGVtLnBhdGh9YCxcbiAgICAgICAgICAgICAgZmlsZVVybDogc291cmNlUGF0aCxcbiAgICAgICAgICAgICAgZmlsZVR5cGU6ICdtZCcsXG4gICAgICAgICAgICAgIGZpbGVFeHQ6ICdtZCcsXG4gICAgICAgICAgICAgIHR5cGU6ICdpbnB1dCcsXG4gICAgICAgICAgICAgIHNvdXJjZUlkOiAwLFxuICAgICAgICAgICAgICBzaXplOiBpdGVtLnNpemUsXG4gICAgICAgICAgICAgIGxvYWRpbmdTdGF0dXM6IDAsXG4gICAgICAgICAgICAgIGVtYmVkZGluZ1N0YXR1czogMCxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb25zdCBleGlzdGluZyA9IG9wdGlvbnMuZHVwbGljYXRlUG9saWN5ID09PSAndXBkYXRlJ1xuICAgICAgICAgICAgICA/IGF3YWl0IGZpbmRFeGlzdGluZ0tub3dsZWRnZURvY3VtZW50KG9wdGlvbnMuYXBpLCBpdGVtLnRpdGxlLCBiYXNlSWQpXG4gICAgICAgICAgICAgIDogbnVsbDtcbiAgICAgICAgICAgIGlmIChleGlzdGluZykge1xuICAgICAgICAgICAgICBhd2FpdCBvcHRpb25zLmFwaS51cGRhdGVLbm93bGVkZ2VEb2N1bWVudChleGlzdGluZy5pZCwgcGF5bG9hZCk7XG4gICAgICAgICAgICAgIHB1c2gocmVzdWx0LCBpdGVtLnRpdGxlLCBpdGVtLnBhdGgsICd1cGRhdGVkJywgYFx1NURGMlx1ODk4Nlx1NzZENiBXaXNlTWluZEFJIFx1NzdFNVx1OEJDNlx1NUU5M1x1RkYxQSR7YmFzZU5hbWV9YCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBhd2FpdCBvcHRpb25zLmFwaS5jcmVhdGVLbm93bGVkZ2VEb2N1bWVudChwYXlsb2FkKTtcbiAgICAgICAgICAgICAgcHVzaChyZXN1bHQsIGl0ZW0udGl0bGUsIGl0ZW0ucGF0aCwgJ2NyZWF0ZWQnLCBgXHU1REYyXHU1QkZDXHU1MTY1XHU0RTNBIFdpc2VNaW5kQUkgXHU3N0U1XHU4QkM2XHU1RTkzXHVGRjFBJHtiYXNlTmFtZX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgcHVzaChyZXN1bHQsIGl0ZW0udGl0bGUsIGl0ZW0ucGF0aCwgJ2ZhaWxlZCcsIGVycm9yPy5tZXNzYWdlIHx8ICdcdTVCRkNcdTUxNjVcdTU5MzFcdThEMjUnKTtcbiAgICAgIH1cbiAgICAgIG9wdGlvbnMub25Qcm9ncmVzcz8uKHJlc3VsdCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbmNvbnN0IG5vcm1hbGl6ZVJlbW90ZUlkID0gKGlkOiBzdHJpbmcgfCBudW1iZXIgfCBudWxsIHwgdW5kZWZpbmVkKSA9PiBpZCA9PT0gbnVsbCB8fCBpZCA9PT0gdW5kZWZpbmVkIHx8IGlkID09PSAnJyA/IG51bGwgOiBTdHJpbmcoaWQpO1xuY29uc3Qgbm9ybWFsaXplVGl0bGUgPSAodmFsdWU6IHVua25vd24pID0+IHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgPyB2YWx1ZS50cmltKCkgOiAnJztcblxuY29uc3QgZmluZEV4aXN0aW5nTm90ZSA9IGFzeW5jIChhcGk6IFdpc2VNaW5kQXBpQ2xpZW50LCB0aXRsZTogc3RyaW5nLCBmb2xkZXI6IHN0cmluZyB8IG51bGwpID0+IHtcbiAgY29uc3QgaXRlbXMgPSBhd2FpdCBhcGkubGlzdE5vdGVzKHsgcTogdGl0bGUsIGZyb21fZm9sZGVyOiBmb2xkZXIgPz8gdW5kZWZpbmVkLCBsaW1pdDogMjAwIH0pLmNhdGNoKCgpID0+IFtdKTtcbiAgcmV0dXJuIGl0ZW1zLmZpbmQoaXRlbSA9PiBub3JtYWxpemVUaXRsZShpdGVtLnRpdGxlKSA9PT0gdGl0bGUpO1xufTtcblxuY29uc3QgZmluZEV4aXN0aW5nRG9jdW1lbnQgPSBhc3luYyAoYXBpOiBXaXNlTWluZEFwaUNsaWVudCwgdGl0bGU6IHN0cmluZywgZm9sZGVyOiBzdHJpbmcgfCBudWxsKSA9PiB7XG4gIGNvbnN0IGl0ZW1zID0gYXdhaXQgYXBpLmxpc3REb2N1bWVudHMoeyBxOiB0aXRsZSwgZnJvbV9mb2xkZXI6IGZvbGRlciA/PyB1bmRlZmluZWQsIGluY2x1ZGVGb2xkZXJzOiBmYWxzZSwgbGltaXQ6IDIwMCB9KS5jYXRjaCgoKSA9PiBbXSk7XG4gIHJldHVybiBpdGVtcy5maW5kKGl0ZW0gPT4gbm9ybWFsaXplVGl0bGUoaXRlbS5uYW1lIHx8IGl0ZW0udGl0bGUpID09PSB0aXRsZSk7XG59O1xuXG5jb25zdCBmaW5kRXhpc3RpbmdLbm93bGVkZ2VEb2N1bWVudCA9IGFzeW5jIChhcGk6IFdpc2VNaW5kQXBpQ2xpZW50LCB0aXRsZTogc3RyaW5nLCBrbm93bGVkZ2VCYXNlSWQ6IHN0cmluZyB8IG51bGwpID0+IHtcbiAgaWYgKCFrbm93bGVkZ2VCYXNlSWQpIHJldHVybiBudWxsO1xuICBjb25zdCBpdGVtcyA9IGF3YWl0IGFwaS5saXN0S25vd2xlZGdlRG9jdW1lbnRzKGtub3dsZWRnZUJhc2VJZCwgdGl0bGUpLmNhdGNoKCgpID0+IFtdKTtcbiAgcmV0dXJuIGl0ZW1zLmZpbmQoaXRlbSA9PiBub3JtYWxpemVUaXRsZShpdGVtLnRpdGxlKSA9PT0gdGl0bGUpO1xufTtcblxuY29uc3QgcmVzb2x2ZVBhdGhGb2xkZXIgPSBhc3luYyAoXG4gIGZvbGRlclBhdGg6IHN0cmluZyxcbiAgY2FjaGU6IE1hcDxzdHJpbmcsIHN0cmluZyB8IG51bWJlciB8IG51bGw+LFxuICByZXNvbHZlcjogKG5hbWU6IHN0cmluZywgcGFyZW50Pzogc3RyaW5nIHwgbnVtYmVyIHwgbnVsbCkgPT4gUHJvbWlzZTxhbnk+LFxuKSA9PiB7XG4gIGlmICghZm9sZGVyUGF0aCkgcmV0dXJuIG51bGw7XG4gIGlmIChjYWNoZS5oYXMoZm9sZGVyUGF0aCkpIHJldHVybiBjYWNoZS5nZXQoZm9sZGVyUGF0aCkgPz8gbnVsbDtcbiAgbGV0IHBhcmVudDogc3RyaW5nIHwgbnVtYmVyIHwgbnVsbCA9IG51bGw7XG4gIGxldCBjdXJyZW50UGF0aCA9ICcnO1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgZm9sZGVyUGF0aC5zcGxpdCgnLycpLmZpbHRlcihCb29sZWFuKSkge1xuICAgIGN1cnJlbnRQYXRoID0gY3VycmVudFBhdGggPyBgJHtjdXJyZW50UGF0aH0vJHtuYW1lfWAgOiBuYW1lO1xuICAgIGlmIChjYWNoZS5oYXMoY3VycmVudFBhdGgpKSB7XG4gICAgICBwYXJlbnQgPSBjYWNoZS5nZXQoY3VycmVudFBhdGgpID8/IG51bGw7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgZm9sZGVyID0gYXdhaXQgcmVzb2x2ZXIobmFtZSwgcGFyZW50KTtcbiAgICBwYXJlbnQgPSBmb2xkZXI/LmlkID8/IGZvbGRlcj8uZGF0YT8uaWQgPz8gbnVsbDtcbiAgICBjYWNoZS5zZXQoY3VycmVudFBhdGgsIHBhcmVudCk7XG4gIH1cbiAgY2FjaGUuc2V0KGZvbGRlclBhdGgsIHBhcmVudCk7XG4gIHJldHVybiBwYXJlbnQ7XG59O1xuXG5leHBvcnQgY29uc3QgZW1wdHlSZXN1bHQgPSAoKTogQnJpZGdlUnVuUmVzdWx0ID0+ICh7IGNyZWF0ZWQ6IDAsIHVwZGF0ZWQ6IDAsIHNraXBwZWQ6IDAsIGZhaWxlZDogMCwgaXRlbXM6IFtdIH0pO1xuXG5leHBvcnQgY29uc3QgcHVzaCA9IChcbiAgcmVzdWx0OiBCcmlkZ2VSdW5SZXN1bHQsXG4gIHRpdGxlOiBzdHJpbmcsXG4gIHNvdXJjZTogc3RyaW5nLFxuICBzdGF0dXM6ICdjcmVhdGVkJyB8ICd1cGRhdGVkJyB8ICdza2lwcGVkJyB8ICdmYWlsZWQnLFxuICBtZXNzYWdlPzogc3RyaW5nLFxuKSA9PiB7XG4gIHJlc3VsdFtzdGF0dXNdICs9IDE7XG4gIHJlc3VsdC5pdGVtcy5wdXNoKHsgdGl0bGUsIHNvdXJjZSwgc3RhdHVzLCBtZXNzYWdlIH0pO1xufTtcbiIsICJpbXBvcnQgdHlwZSB7IEFwcCwgVEFic3RyYWN0RmlsZSwgVEZpbGUgfSBmcm9tICdvYnNpZGlhbic7XG5cbmltcG9ydCB0eXBlIHsgSW1wb3J0VGFyZ2V0U2VsZWN0aW9uIH0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCB0eXBlIFF1aWNrQWN0aW9uID1cbiAgfCAnc2VuZC1jdXJyZW50LW5vdGUnXG4gIHwgJ3NlbmQtY3VycmVudC1mb2xkZXInXG4gIHwgJ3NlbmQtc2VsZWN0ZWQtdGV4dCdcbiAgfCAnc2VuZC1maWxlLXRvLW5vdGUnXG4gIHwgJ3NlbmQtZmlsZS10by1kb2N1bWVudCdcbiAgfCAnc2VuZC1maWxlLXRvLWtub3dsZWRnZSc7XG5cbmV4cG9ydCB0eXBlIFF1aWNrQWN0aW9uUGxhbiA9IHtcbiAgYWN0aW9uOiBRdWlja0FjdGlvbjtcbiAgc2NvcGU6ICdmaWxlJyB8ICdmb2xkZXInIHwgJ3NlbGVjdGlvbic7XG4gIHBhdGhzOiBzdHJpbmdbXTtcbiAgc2VsZWN0ZWRUZXh0Pzogc3RyaW5nO1xuICB0YXJnZXREZWZhdWx0czogSW1wb3J0VGFyZ2V0U2VsZWN0aW9uO1xufTtcblxuZXhwb3J0IGNvbnN0IGJ1aWxkUXVpY2tBY3Rpb25QbGFuID0gKHBhcmFtczoge1xuICBhY3Rpb246IFF1aWNrQWN0aW9uO1xuICBmaWxlPzogUGljazxURmlsZSwgJ3BhdGgnIHwgJ2Jhc2VuYW1lJz4gfCBudWxsO1xuICBmb2xkZXJGaWxlcz86IEFycmF5PFBpY2s8VEZpbGUsICdwYXRoJz4+O1xuICBzZWxlY3RlZFRleHQ/OiBzdHJpbmc7XG59KTogUXVpY2tBY3Rpb25QbGFuID0+IHtcbiAgY29uc3QgdGFyZ2V0RGVmYXVsdHMgPSB0YXJnZXRzRm9yQWN0aW9uKHBhcmFtcy5hY3Rpb24pO1xuICBpZiAocGFyYW1zLmFjdGlvbiA9PT0gJ3NlbmQtc2VsZWN0ZWQtdGV4dCcpIHtcbiAgICByZXR1cm4ge1xuICAgICAgYWN0aW9uOiBwYXJhbXMuYWN0aW9uLFxuICAgICAgc2NvcGU6ICdzZWxlY3Rpb24nLFxuICAgICAgcGF0aHM6IHBhcmFtcy5maWxlID8gW3BhcmFtcy5maWxlLnBhdGhdIDogW10sXG4gICAgICBzZWxlY3RlZFRleHQ6IHBhcmFtcy5zZWxlY3RlZFRleHQgfHwgJycsXG4gICAgICB0YXJnZXREZWZhdWx0cyxcbiAgICB9O1xuICB9XG5cbiAgaWYgKHBhcmFtcy5hY3Rpb24gPT09ICdzZW5kLWN1cnJlbnQtZm9sZGVyJykge1xuICAgIHJldHVybiB7XG4gICAgICBhY3Rpb246IHBhcmFtcy5hY3Rpb24sXG4gICAgICBzY29wZTogJ2ZvbGRlcicsXG4gICAgICBwYXRoczogKHBhcmFtcy5mb2xkZXJGaWxlcyB8fCBbXSkubWFwKGZpbGUgPT4gZmlsZS5wYXRoKSxcbiAgICAgIHRhcmdldERlZmF1bHRzLFxuICAgIH07XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGFjdGlvbjogcGFyYW1zLmFjdGlvbixcbiAgICBzY29wZTogJ2ZpbGUnLFxuICAgIHBhdGhzOiBwYXJhbXMuZmlsZSA/IFtwYXJhbXMuZmlsZS5wYXRoXSA6IFtdLFxuICAgIHRhcmdldERlZmF1bHRzLFxuICB9O1xufTtcblxuZXhwb3J0IGNvbnN0IGNvbGxlY3RNYXJrZG93bkZpbGVzID0gKGFwcDogQXBwLCB0YXJnZXQ6IFRBYnN0cmFjdEZpbGUpOiBURmlsZVtdID0+IHtcbiAgaWYgKGlzTWFya2Rvd25GaWxlKHRhcmdldCkpIHJldHVybiBbdGFyZ2V0XTtcbiAgY29uc3QgZm9sZGVyUGF0aCA9IHRhcmdldC5wYXRoLmVuZHNXaXRoKCcvJykgPyB0YXJnZXQucGF0aCA6IGAke3RhcmdldC5wYXRofS9gO1xuICByZXR1cm4gYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKS5maWx0ZXIoZmlsZSA9PiBmaWxlLnBhdGguc3RhcnRzV2l0aChmb2xkZXJQYXRoKSk7XG59O1xuXG5leHBvcnQgY29uc3QgaXNNYXJrZG93bkZpbGUgPSAoZmlsZTogVEFic3RyYWN0RmlsZSk6IGZpbGUgaXMgVEZpbGUgPT5cbiAgJ2V4dGVuc2lvbicgaW4gZmlsZSAmJiAoZmlsZSBhcyBURmlsZSkuZXh0ZW5zaW9uID09PSAnbWQnO1xuXG5jb25zdCB0YXJnZXRzRm9yQWN0aW9uID0gKGFjdGlvbjogUXVpY2tBY3Rpb24pOiBJbXBvcnRUYXJnZXRTZWxlY3Rpb24gPT4ge1xuICBpZiAoYWN0aW9uID09PSAnc2VuZC1maWxlLXRvLWRvY3VtZW50JykgcmV0dXJuIHsgbm90ZXM6IGZhbHNlLCBkb2N1bWVudHM6IHRydWUsIGtub3dsZWRnZTogZmFsc2UgfTtcbiAgaWYgKGFjdGlvbiA9PT0gJ3NlbmQtZmlsZS10by1rbm93bGVkZ2UnKSByZXR1cm4geyBub3RlczogZmFsc2UsIGRvY3VtZW50czogZmFsc2UsIGtub3dsZWRnZTogdHJ1ZSB9O1xuICByZXR1cm4geyBub3RlczogdHJ1ZSwgZG9jdW1lbnRzOiBmYWxzZSwga25vd2xlZGdlOiBmYWxzZSB9O1xufTtcbiIsICJpbXBvcnQgeyBBcHAsIE5vdGljZSwgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZyB9IGZyb20gJ29ic2lkaWFuJztcblxuaW1wb3J0IHR5cGUgV2lzZU1pbmRPYnNpZGlhblBsdWdpbiBmcm9tICcuL21haW4nO1xuaW1wb3J0IHR5cGUgeyBEdXBsaWNhdGVQb2xpY3ksIFdpc2VNaW5kSW1wb3J0U2V0dGluZ3MgfSBmcm9tICcuL3R5cGVzJztcblxuZXhwb3J0IHR5cGUgeyBXaXNlTWluZEltcG9ydFNldHRpbmdzIH0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NFVFRJTkdTOiBXaXNlTWluZEltcG9ydFNldHRpbmdzID0ge1xuICBhcGlCYXNlVXJsOiAnaHR0cDovLzEyNy4wLjAuMTozODIyMScsXG4gIGRlZmF1bHRUYXJnZXRzOiB7IG5vdGVzOiB0cnVlLCBkb2N1bWVudHM6IGZhbHNlLCBrbm93bGVkZ2U6IHRydWUgfSxcbiAgZGVmYXVsdFdpc2VNaW5kU291cmNlczogeyBub3RlczogdHJ1ZSwgZG9jdW1lbnRzOiB0cnVlLCBrbm93bGVkZ2VEb2N1bWVudHM6IHRydWUgfSxcbiAgY29udGV4dE1lbnVEZWZhdWx0czoge1xuICAgIG5vdGVGb2xkZXJQYXRoOiAnJyxcbiAgICBkb2N1bWVudEZvbGRlclBhdGg6ICcnLFxuICAgIGtub3dsZWRnZUJhc2VOYW1lOiAnT2JzaWRpYW4gXHU1QkZDXHU1MTY1JyxcbiAgfSxcbiAgY29udGV4dE1lbnVSZWNlbnRzOiB7XG4gICAgbm90ZXM6IFtdLFxuICAgIGRvY3VtZW50czogW10sXG4gICAga25vd2xlZGdlOiBbXSxcbiAgfSxcbiAgc3luY1BsYW5zOiBbXSxcbiAgc3luY0hpc3Rvcnk6IFtdLFxuICBkZWZhdWx0U3luY1BsYW5JZDogJycsXG4gIGhhc1NlZW5UdXRvcmlhbDogZmFsc2UsXG4gIGRlZmF1bHRLbm93bGVkZ2VCYXNlTmFtZTogJ09ic2lkaWFuIFx1NUJGQ1x1NTE2NScsXG4gIGRlZmF1bHRPYnNpZGlhblJvb3RGb2xkZXI6ICdXaXNlTWluZEFJJyxcbiAgZHVwbGljYXRlUG9saWN5OiAndXBkYXRlJyxcbiAgbWF4RmlsZVNpemVLYjogMTAyNCxcbiAgaWdub3JlUGF0dGVybnM6IFsnLm9ic2lkaWFuLyoqJywgJyoqLy50cmFzaC8qKiddLFxuICBjaHVua1NpemU6IDEwLFxufTtcblxuZXhwb3J0IGNsYXNzIFdpc2VNaW5kU2V0dGluZ1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICBwbHVnaW46IFdpc2VNaW5kT2JzaWRpYW5QbHVnaW47XG5cbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogV2lzZU1pbmRPYnNpZGlhblBsdWdpbikge1xuICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcbiAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgfVxuXG4gIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcbiAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMicsIHsgdGV4dDogJ1dpc2VNaW5kQUkgT2JzaWRpYW4gXHU4QkJFXHU3RjZFJyB9KTtcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1dpc2VNaW5kQUkgXHU2NzJDXHU1NzMwXHU2M0E1XHU1M0UzXHU1NzMwXHU1NzQwJylcbiAgICAgIC5zZXREZXNjKCdcdTlFRDhcdThCQTRcdTY2MkYgV2lzZU1pbmRBSSBMb2NhbCBBUEkgdjIgXHU1NzMwXHU1NzQwXHUzMDAyJylcbiAgICAgIC5hZGRUZXh0KHRleHQgPT5cbiAgICAgICAgdGV4dFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcihERUZBVUxUX1NFVFRJTkdTLmFwaUJhc2VVcmwpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmFwaUJhc2VVcmwpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHZhbHVlID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmFwaUJhc2VVcmwgPSB2YWx1ZS50cmltKCkgfHwgREVGQVVMVF9TRVRUSU5HUy5hcGlCYXNlVXJsO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgfSksXG4gICAgICApO1xuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnT2JzaWRpYW4gXHU1MTk5XHU1MTY1XHU2ODM5XHU3NkVFXHU1RjU1JylcbiAgICAgIC5zZXREZXNjKCdXaXNlTWluZEFJIFx1NTE4NVx1NUJCOVx1NTQwQ1x1NkI2NVx1NTIzMCBPYnNpZGlhbiBcdTY1RjZcdUZGMENcdTRGMUFcdTUxOTlcdTUxNjVcdThGRDlcdTRFMkFcdTY4MzlcdTc2RUVcdTVGNTVcdTMwMDInKVxuICAgICAgLmFkZFRleHQodGV4dCA9PlxuICAgICAgICB0ZXh0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKERFRkFVTFRfU0VUVElOR1MuZGVmYXVsdE9ic2lkaWFuUm9vdEZvbGRlcilcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdE9ic2lkaWFuUm9vdEZvbGRlcilcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdmFsdWUgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdE9ic2lkaWFuUm9vdEZvbGRlciA9IHZhbHVlLnRyaW0oKSB8fCBERUZBVUxUX1NFVFRJTkdTLmRlZmF1bHRPYnNpZGlhblJvb3RGb2xkZXI7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB9KSxcbiAgICAgICk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKCdcdTlFRDhcdThCQTRcdTc3RTVcdThCQzZcdTVFOTNcdTU0MERcdTc5RjAnKVxuICAgICAgLnNldERlc2MoJ09ic2lkaWFuIFx1NTE4NVx1NUJCOVx1NUJGQ1x1NTE2NSBXaXNlTWluZEFJIFx1NzdFNVx1OEJDNlx1NUU5M1x1NjVGNlx1NEY3Rlx1NzUyOFx1MzAwMicpXG4gICAgICAuYWRkVGV4dCh0ZXh0ID0+XG4gICAgICAgIHRleHRcbiAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoREVGQVVMVF9TRVRUSU5HUy5kZWZhdWx0S25vd2xlZGdlQmFzZU5hbWUpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRLbm93bGVkZ2VCYXNlTmFtZSlcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdmFsdWUgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdEtub3dsZWRnZUJhc2VOYW1lID0gdmFsdWUudHJpbSgpIHx8IERFRkFVTFRfU0VUVElOR1MuZGVmYXVsdEtub3dsZWRnZUJhc2VOYW1lO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgfSksXG4gICAgICApO1xuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSgnXHU5MUNEXHU1OTBEXHU1MTg1XHU1QkI5XHU1OTA0XHU3NDA2JylcbiAgICAgIC5zZXREZXNjKCdcdTlFRDhcdThCQTRcdTY2RjRcdTY1QjBcdTU0MENcdTY3NjVcdTZFOTBcdTUxODVcdTVCQjlcdUZGMENcdTkwN0ZcdTUxNERcdTkxQ0RcdTU5MERcdTUyMUJcdTVFRkFcdTMwMDInKVxuICAgICAgLmFkZERyb3Bkb3duKGRyb3Bkb3duID0+XG4gICAgICAgIGRyb3Bkb3duXG4gICAgICAgICAgLmFkZE9wdGlvbignc2tpcCcsICdcdThERjNcdThGQzcnKVxuICAgICAgICAgIC5hZGRPcHRpb24oJ3VwZGF0ZScsICdcdTY2RjRcdTY1QjAnKVxuICAgICAgICAgIC5hZGRPcHRpb24oJ2R1cGxpY2F0ZScsICdcdTUyMUJcdTVFRkFcdTUyNkZcdTY3MkMnKVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kdXBsaWNhdGVQb2xpY3kpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHZhbHVlID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmR1cGxpY2F0ZVBvbGljeSA9IHZhbHVlIGFzIER1cGxpY2F0ZVBvbGljeTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIH0pLFxuICAgICAgKTtcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoJ1x1NkQ0Qlx1OEJENSBXaXNlTWluZEFJIFx1OEZERVx1NjNBNScpXG4gICAgICAuc2V0RGVzYygnXHU5NzAwXHU4OTgxXHU1MTQ4XHU1NzI4IFdpc2VNaW5kQUkgXHU0RTJEXHU1NDJGXHU1MkE4XHU2NzJDXHU1NzMwXHU2M0E1XHU1M0UzXHUzMDAyJylcbiAgICAgIC5hZGRCdXR0b24oYnV0dG9uID0+XG4gICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KCdcdTZENEJcdThCRDVcdThGREVcdTYzQTUnKS5zZXRDdGEoKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICBjb25zdCBvayA9IGF3YWl0IHRoaXMucGx1Z2luLnRlc3RDb25uZWN0aW9uKCk7XG4gICAgICAgICAgbmV3IE5vdGljZShvayA/ICdXaXNlTWluZEFJIFx1NURGMlx1OEZERVx1NjNBNScgOiAnXHU2NUUwXHU2Q0Q1XHU4RkRFXHU2M0E1IFdpc2VNaW5kQUlcdUZGMENcdThCRjdcdTUxNDhcdTU0MkZcdTUyQTggV2lzZU1pbmRBSSBcdTY3MkNcdTU3MzBcdTYzQTVcdTUzRTMnKTtcbiAgICAgICAgfSksXG4gICAgICApO1xuICB9XG59XG4iLCAiaW1wb3J0IHR5cGUgeyBCcmlkZ2VSdW5SZXN1bHQgfSBmcm9tICcuL3R5cGVzJztcblxuZXhwb3J0IGNsYXNzIFdpc2VNaW5kU3RhdHVzQmFyIHtcbiAgcHJpdmF0ZSBlbDogSFRNTEVsZW1lbnQ7XG5cbiAgY29uc3RydWN0b3IoZWw6IEhUTUxFbGVtZW50LCBvbkNsaWNrOiAoKSA9PiB2b2lkKSB7XG4gICAgdGhpcy5lbCA9IGVsO1xuICAgIHRoaXMuZWwuYWRkQ2xhc3MoJ3dpc2VtaW5kLWJyaWRnZS1zdGF0dXMnKTtcbiAgICB0aGlzLmVsLm9uY2xpY2sgPSBvbkNsaWNrO1xuICAgIHRoaXMuc2V0RGlzY29ubmVjdGVkKCk7XG4gIH1cblxuICBzZXREaXNjb25uZWN0ZWQoKSB7XG4gICAgdGhpcy5lbC5zZXRUZXh0KCdXaXNlTWluZEFJIFx1NjcyQVx1OEZERVx1NjNBNScpO1xuICB9XG5cbiAgc2V0Q29ubmVjdGVkKCkge1xuICAgIHRoaXMuZWwuc2V0VGV4dCgnV2lzZU1pbmRBSSBcdTVERjJcdThGREVcdTYzQTUnKTtcbiAgfVxuXG4gIHNldFN5bmNpbmcoKSB7XG4gICAgdGhpcy5lbC5zZXRUZXh0KCdXaXNlTWluZEFJIFx1NTQwQ1x1NkI2NVx1NEUyRC4uLicpO1xuICB9XG5cbiAgc2V0UmVzdWx0KHJlc3VsdDogQnJpZGdlUnVuUmVzdWx0KSB7XG4gICAgdGhpcy5lbC5zZXRUZXh0KGBcdTVERjJcdTU0MENcdTZCNjUgJHtyZXN1bHQuY3JlYXRlZCArIHJlc3VsdC51cGRhdGVkICsgcmVzdWx0LnNraXBwZWR9IFx1OTg3OVx1RkYwQ1x1NTkzMVx1OEQyNSAke3Jlc3VsdC5mYWlsZWR9IFx1OTg3OWApO1xuICB9XG59XG4iLCAiaW1wb3J0IHsgSXRlbVZpZXcsIE5vdGljZSwgV29ya3NwYWNlTGVhZiB9IGZyb20gJ29ic2lkaWFuJztcblxuaW1wb3J0IGFycm93UGF0aEljb24gZnJvbSAnLi4vYXNzZXRzL2ljb25zL2Fycm93LXBhdGguc3ZnJztcbmltcG9ydCBib29rbWFya1NxdWFyZUljb24gZnJvbSAnLi4vYXNzZXRzL2ljb25zL2Jvb2ttYXJrLXNxdWFyZS5zdmcnO1xuaW1wb3J0IGNoZWNrQ2lyY2xlSWNvbiBmcm9tICcuLi9hc3NldHMvaWNvbnMvY2hlY2stY2lyY2xlLnN2Zyc7XG5pbXBvcnQgY2hldnJvbkRvd25JY29uIGZyb20gJy4uL2Fzc2V0cy9pY29ucy9jaGV2cm9uLWRvd24uc3ZnJztcbmltcG9ydCBjaGV2cm9uUmlnaHRJY29uIGZyb20gJy4uL2Fzc2V0cy9pY29ucy9jaGV2cm9uLXJpZ2h0LnN2Zyc7XG5pbXBvcnQgY2xvY2tJY29uIGZyb20gJy4uL2Fzc2V0cy9pY29ucy9jbG9jay5zdmcnO1xuaW1wb3J0IGRvY3VtZW50SWNvbiBmcm9tICcuLi9hc3NldHMvaWNvbnMvZG9jdW1lbnQuc3ZnJztcbmltcG9ydCBob21lSWNvbiBmcm9tICcuLi9hc3NldHMvaWNvbnMvaG9tZS5zdmcnO1xuaW1wb3J0IGtub3dsZWRnZUljb24gZnJvbSAnLi4vYXNzZXRzL2ljb25zL2tub3dsZWRnZS5zdmcnO1xuaW1wb3J0IG1hcmtkb3duSWNvbiBmcm9tICcuLi9hc3NldHMvaWNvbnMvbWFya2Rvd24uc3ZnJztcbmltcG9ydCBub3RlSWNvbiBmcm9tICcuLi9hc3NldHMvaWNvbnMvbm90ZS5zdmcnO1xuaW1wb3J0IHBlbmNpbFNxdWFyZUljb24gZnJvbSAnLi4vYXNzZXRzL2ljb25zL3BlbmNpbC1zcXVhcmUuc3ZnJztcbmltcG9ydCBwbHVzSWNvbiBmcm9tICcuLi9hc3NldHMvaWNvbnMvcGx1cy5zdmcnO1xuaW1wb3J0IHN5bmNUb09ic2lkaWFuSWNvbiBmcm9tICcuLi9hc3NldHMvaWNvbnMvc3luYy10by1vYnNpZGlhbi5zdmcnO1xuaW1wb3J0IHN5bmNUb1dpc2VNaW5kSWNvbiBmcm9tICcuLi9hc3NldHMvaWNvbnMvc3luYy10by13aXNlbWluZC5zdmcnO1xuaW1wb3J0IHRvUmlnaHRJY29uIGZyb20gJy4uL2Fzc2V0cy9pY29ucy90by1yaWdodC5zdmcnO1xuaW1wb3J0IHRyYXNoSWNvbiBmcm9tICcuLi9hc3NldHMvaWNvbnMvdHJhc2guc3ZnJztcbmltcG9ydCB3aXNlTWluZExvZ29JY29uIGZyb20gJy4uL2Fzc2V0cy9pY29ucy93aXNlbWluZGFpLWxvZ28uc3ZnJztcbmltcG9ydCB4TWFya0ljb24gZnJvbSAnLi4vYXNzZXRzL2ljb25zL3gtbWFyay5zdmcnO1xuXG5pbXBvcnQgeyBydW5PYnNpZGlhblRvV2lzZU1pbmRJbXBvcnQgfSBmcm9tICcuL2ltcG9ydFJ1bm5lcic7XG5pbXBvcnQgV2lzZU1pbmRPYnNpZGlhblBsdWdpbiwgeyBXSVNFTUlORF9JQ09OX0lELCBXSVNFTUlORF9WSUVXX1RZUEUgfSBmcm9tICcuL21haW4nO1xuaW1wb3J0IHsgREVGQVVMVF9TRVRUSU5HUyB9IGZyb20gJy4vc2V0dGluZ3MnO1xuaW1wb3J0IHR5cGUge1xuICBCcmlkZ2VSdW5SZXN1bHQsXG4gIEJyaWRnZVN5bmNIaXN0b3J5SXRlbSxcbiAgQnJpZGdlU3luY1BsYW4sXG4gIEltcG9ydFRhcmdldFNlbGVjdGlvbixcbiAgT2JzaWRpYW5Tb3VyY2VJdGVtLFxuICBXaXNlTWluZEZvbGRlcixcbiAgV2lzZU1pbmRTbmFwc2hvdCxcbiAgV2lzZU1pbmRTb3VyY2VJdGVtLFxuICBXaXNlTWluZFNvdXJjZVR5cGUsXG59IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgc2NhblZhdWx0IH0gZnJvbSAnLi92YXVsdFNjYW5uZXInO1xuaW1wb3J0IHsgbm9ybWFsaXplQmFzZVVybCwgV2lzZU1pbmRBcGlDbGllbnQgfSBmcm9tICcuL3dpc2VtaW5kQXBpJztcbmltcG9ydCB7IGlzTWFya2Rvd25SZWNvcmQsIGxvYWRXaXNlTWluZFNvdXJjZXMsIHJlc29sdmVGb2xkZXJQYXRoIH0gZnJvbSAnLi93aXNlbWluZFNvdXJjZVNjYW5uZXInO1xuaW1wb3J0IHsgcnVuV2lzZU1pbmRUb09ic2lkaWFuSW1wb3J0IH0gZnJvbSAnLi93aXNlbWluZFRvT2JzaWRpYW5SdW5uZXInO1xuXG50eXBlIERpcmVjdGlvbiA9ICd0by13aXNlbWluZCcgfCAndG8tb2JzaWRpYW4nO1xudHlwZSBXaXNlTWluZENhdGVnb3J5ID0gJ2RvY3VtZW50cycgfCAna25vd2xlZGdlJyB8ICdub3Rlcyc7XG50eXBlIFdpc2VNaW5kVGFyZ2V0ID0ga2V5b2YgSW1wb3J0VGFyZ2V0U2VsZWN0aW9uO1xuXG50eXBlIFRyZWVHcm91cDxUPiA9IHtcbiAgaWQ6IHN0cmluZztcbiAgdGl0bGU6IHN0cmluZztcbiAgc3VidGl0bGU6IHN0cmluZztcbiAgaXRlbXM6IFRbXTtcbiAgZW1wdHlUZXh0Pzogc3RyaW5nO1xufTtcblxudHlwZSBEZXN0aW5hdGlvbkdyb3VwID0ge1xuICBpZDogc3RyaW5nO1xuICB0aXRsZTogc3RyaW5nO1xuICBzdWJ0aXRsZTogc3RyaW5nO1xuICB0YXJnZXQ6IFdpc2VNaW5kVGFyZ2V0O1xuICBjaGlsZHJlbjogRGVzdGluYXRpb25JdGVtW107XG4gIGVtcHR5VGV4dDogc3RyaW5nO1xufTtcblxudHlwZSBEZXN0aW5hdGlvbkl0ZW0gPSB7XG4gIGtleTogc3RyaW5nO1xuICB0aXRsZTogc3RyaW5nO1xuICB2YWx1ZTogc3RyaW5nO1xuICB0YXJnZXQ6IFdpc2VNaW5kVGFyZ2V0O1xufTtcblxuZXhwb3J0IGNsYXNzIFdpc2VNaW5kQnJpZGdlVmlldyBleHRlbmRzIEl0ZW1WaWV3IHtcbiAgcHJpdmF0ZSBwbHVnaW46IFdpc2VNaW5kT2JzaWRpYW5QbHVnaW47XG4gIHByaXZhdGUgb2JzaWRpYW5JdGVtczogT2JzaWRpYW5Tb3VyY2VJdGVtW10gPSBbXTtcbiAgcHJpdmF0ZSB3aXNlTWluZEl0ZW1zOiBXaXNlTWluZFNvdXJjZUl0ZW1bXSA9IFtdO1xuICBwcml2YXRlIHNuYXBzaG90OiBXaXNlTWluZFNuYXBzaG90IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgZGlyZWN0aW9uOiBEaXJlY3Rpb24gPSAndG8td2lzZW1pbmQnO1xuICBwcml2YXRlIGFjdGl2ZVdpc2VNaW5kQ2F0ZWdvcnk6IFdpc2VNaW5kQ2F0ZWdvcnkgPSAnZG9jdW1lbnRzJztcbiAgcHJpdmF0ZSBleHBhbmRlZEdyb3VwcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBwcml2YXRlIHNlbGVjdGVkT2JzaWRpYW4gPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgcHJpdmF0ZSBzZWxlY3RlZFdpc2VNaW5kID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIHByaXZhdGUgc2VsZWN0ZWRXaXNlTWluZERlc3RpbmF0aW9ucyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBwcml2YXRlIHNlbGVjdGVkT2JzaWRpYW5UYXJnZXRGb2xkZXJzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIHByaXZhdGUgcGVuZGluZ1BsYW5OYW1lID0gJyc7XG4gIHByaXZhdGUgd2lzZU1pbmRDb25uZWN0aW9uRXJyb3IgPSAnJztcbiAgcHJpdmF0ZSBvdmVyd3JpdGVFeGlzdGluZyA9IGZhbHNlO1xuICBwcml2YXRlIGluY2x1ZGVPYnNpZGlhbkZvbGRlcnMgPSBmYWxzZTtcbiAgcHJpdmF0ZSBzZWFyY2hlczogUmVjb3JkPCdvYnNpZGlhblNvdXJjZScgfCAnd2lzZU1pbmRUYXJnZXQnIHwgJ3dpc2VNaW5kU291cmNlJyB8ICdvYnNpZGlhblRhcmdldCcsIHN0cmluZz4gPSB7XG4gICAgb2JzaWRpYW5Tb3VyY2U6ICcnLFxuICAgIHdpc2VNaW5kVGFyZ2V0OiAnJyxcbiAgICB3aXNlTWluZFNvdXJjZTogJycsXG4gICAgb2JzaWRpYW5UYXJnZXQ6ICcnLFxuICB9O1xuICBwcml2YXRlIGltcG9ydFRhcmdldHM6IFNldDxXaXNlTWluZFRhcmdldD47XG4gIHByaXZhdGUgaGFzQXBwbGllZERlZmF1bHRQbGFuID0gZmFsc2U7XG4gIHByaXZhdGUgaGFzT3BlbmVkSW5pdGlhbFR1dG9yaWFsID0gZmFsc2U7XG4gIHByaXZhdGUgc3RhdHNFbD86IEhUTUxFbGVtZW50O1xuICBwcml2YXRlIHRhYnNFbD86IEhUTUxFbGVtZW50O1xuICBwcml2YXRlIHBsYW5CYXJFbD86IEhUTUxFbGVtZW50O1xuICBwcml2YXRlIHRvb2xiYXJFbD86IEhUTUxFbGVtZW50O1xuICBwcml2YXRlIGZsb3dFbD86IEhUTUxFbGVtZW50O1xuXG4gIGNvbnN0cnVjdG9yKGxlYWY6IFdvcmtzcGFjZUxlYWYsIHBsdWdpbjogV2lzZU1pbmRPYnNpZGlhblBsdWdpbikge1xuICAgIHN1cGVyKGxlYWYpO1xuICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgIHRoaXMuaW1wb3J0VGFyZ2V0cyA9IHRhcmdldFNldEZyb21TZXR0aW5ncyhwbHVnaW4uc2V0dGluZ3MuZGVmYXVsdFRhcmdldHMpO1xuICB9XG5cbiAgZ2V0Vmlld1R5cGUoKSB7XG4gICAgcmV0dXJuIFdJU0VNSU5EX1ZJRVdfVFlQRTtcbiAgfVxuXG4gIGdldERpc3BsYXlUZXh0KCkge1xuICAgIHJldHVybiAnV2lzZU1pbmRBSSBPYnNpZGlhbic7XG4gIH1cblxuICBnZXRJY29uKCkge1xuICAgIHJldHVybiBXSVNFTUlORF9JQ09OX0lEO1xuICB9XG5cbiAgYXN5bmMgb25PcGVuKCkge1xuICAgIHRoaXMucmVuZGVyU2hlbGwoKTtcbiAgICBhd2FpdCB0aGlzLnJlZnJlc2goKTtcbiAgICB0aGlzLm9wZW5UdXRvcmlhbE9uRmlyc3RVc2UoKTtcbiAgfVxuXG4gIGFzeW5jIG9uQ2xvc2UoKSB7XG4gICAgdGhpcy5zZWxlY3RlZE9ic2lkaWFuLmNsZWFyKCk7XG4gICAgdGhpcy5zZWxlY3RlZFdpc2VNaW5kLmNsZWFyKCk7XG4gIH1cblxuICBhc3luYyByZWZyZXNoKHByZXNlcnZlU2VsZWN0aW9uID0gZmFsc2UpIHtcbiAgICB0aGlzLnNldFJlc3VsdCgnXHU2QjYzXHU1NzI4XHU4QkZCXHU1M0Q2XHU2NTcwXHU2MzZFLi4uJyk7XG4gICAgY29uc3QgcHJldmlvdXMgPSB0aGlzLmNhcHR1cmVTZWxlY3Rpb24oKTtcbiAgICBjb25zdCBwcmV2aW91c1Njcm9sbCA9IHByZXNlcnZlU2VsZWN0aW9uID8gdGhpcy5jYXB0dXJlTGlzdFNjcm9sbCgpIDogW107XG4gICAgY29uc3QgcHJldmlvdXNFeHBhbmRlZEdyb3VwcyA9IG5ldyBTZXQodGhpcy5leHBhbmRlZEdyb3Vwcyk7XG4gICAgY29uc3QgW29ic2lkaWFuUmVzdWx0LCB3aXNlTWluZFJlc3VsdF0gPSBhd2FpdCBQcm9taXNlLmFsbFNldHRsZWQoW1xuICAgICAgc2NhblZhdWx0KHRoaXMuYXBwLCB7XG4gICAgICAgIG1heEZpbGVTaXplS2I6IHRoaXMucGx1Z2luLnNldHRpbmdzLm1heEZpbGVTaXplS2IsXG4gICAgICAgIGlnbm9yZVBhdHRlcm5zOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5pZ25vcmVQYXR0ZXJucyxcbiAgICAgIH0pLFxuICAgICAgbG9hZFdpc2VNaW5kU291cmNlcyh0aGlzLnBsdWdpbi5hcGksIHtcbiAgICAgICAgaW5jbHVkZU5vdGVzOiB0cnVlLFxuICAgICAgICBpbmNsdWRlRG9jdW1lbnRzOiB0cnVlLFxuICAgICAgICBpbmNsdWRlS25vd2xlZGdlRG9jdW1lbnRzOiB0cnVlLFxuICAgICAgfSksXG4gICAgXSk7XG5cbiAgICBpZiAob2JzaWRpYW5SZXN1bHQuc3RhdHVzID09PSAnZnVsZmlsbGVkJykge1xuICAgICAgdGhpcy5vYnNpZGlhbkl0ZW1zID0gb2JzaWRpYW5SZXN1bHQudmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub2JzaWRpYW5JdGVtcyA9IFtdO1xuICAgIH1cblxuICAgIGlmICh3aXNlTWluZFJlc3VsdC5zdGF0dXMgPT09ICdmdWxmaWxsZWQnKSB7XG4gICAgICB0aGlzLndpc2VNaW5kSXRlbXMgPSB3aXNlTWluZFJlc3VsdC52YWx1ZS5pdGVtcztcbiAgICAgIHRoaXMuc25hcHNob3QgPSB3aXNlTWluZFJlc3VsdC52YWx1ZS5zbmFwc2hvdDtcbiAgICAgIHRoaXMud2lzZU1pbmRDb25uZWN0aW9uRXJyb3IgPSAnJztcbiAgICAgIGlmIChwcmVzZXJ2ZVNlbGVjdGlvbikge1xuICAgICAgICB0aGlzLnJlc3RvcmVTZWxlY3Rpb24ocHJldmlvdXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zZWxlY3RlZE9ic2lkaWFuID0gbmV3IFNldCh0aGlzLm9ic2lkaWFuSXRlbXMubWFwKGl0ZW0gPT4gaXRlbS5wYXRoKSk7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRXaXNlTWluZCA9IG5ldyBTZXQodGhpcy53aXNlTWluZEl0ZW1zLm1hcChpdGVtID0+IHNvdXJjZUtleShpdGVtKSkpO1xuICAgICAgICB0aGlzLnNlbGVjdGVkV2lzZU1pbmREZXN0aW5hdGlvbnMgPSBuZXcgU2V0KHRoaXMuZ2V0RGVmYXVsdERlc3RpbmF0aW9uS2V5cygpKTtcbiAgICAgICAgdGhpcy5zZWxlY3RlZE9ic2lkaWFuVGFyZ2V0Rm9sZGVycyA9IG5ldyBTZXQoW3RoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRPYnNpZGlhblJvb3RGb2xkZXJdKTtcbiAgICAgIH1cbiAgICAgIHRoaXMucGx1Z2luLnN0YXR1c0Jhci5zZXRDb25uZWN0ZWQoKTtcbiAgICAgIHRoaXMuc2V0UmVzdWx0KCdcdTY1NzBcdTYzNkVcdTVERjJcdTUyMzdcdTY1QjAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy53aXNlTWluZEl0ZW1zID0gW107XG4gICAgICB0aGlzLnNuYXBzaG90ID0gbnVsbDtcbiAgICAgIHRoaXMud2lzZU1pbmRDb25uZWN0aW9uRXJyb3IgPSB3aXNlTWluZFJlc3VsdC5yZWFzb24/Lm1lc3NhZ2UgfHwgJ1x1NjVFMFx1NkNENVx1OEZERVx1NjNBNSBXaXNlTWluZEFJIFx1NjcyQ1x1NTczMFx1NjNBNVx1NTNFMyc7XG4gICAgICBpZiAoIXByZXNlcnZlU2VsZWN0aW9uKSB7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRPYnNpZGlhbiA9IG5ldyBTZXQodGhpcy5vYnNpZGlhbkl0ZW1zLm1hcChpdGVtID0+IGl0ZW0ucGF0aCkpO1xuICAgICAgICB0aGlzLnNlbGVjdGVkV2lzZU1pbmQuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5zZWxlY3RlZFdpc2VNaW5kRGVzdGluYXRpb25zLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRPYnNpZGlhblRhcmdldEZvbGRlcnMgPSBuZXcgU2V0KFt0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWZhdWx0T2JzaWRpYW5Sb290Rm9sZGVyXSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnJlc3RvcmVTZWxlY3Rpb24ocHJldmlvdXMpO1xuICAgICAgICB0aGlzLnNlbGVjdGVkV2lzZU1pbmQuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5zZWxlY3RlZFdpc2VNaW5kRGVzdGluYXRpb25zLmNsZWFyKCk7XG4gICAgICB9XG4gICAgICB0aGlzLnBsdWdpbi5zdGF0dXNCYXIuc2V0RGlzY29ubmVjdGVkKCk7XG4gICAgICB0aGlzLnNldFJlc3VsdCh0aGlzLndpc2VNaW5kQ29ubmVjdGlvbkVycm9yKTtcbiAgICB9XG5cbiAgICBpZiAob2JzaWRpYW5SZXN1bHQuc3RhdHVzID09PSAncmVqZWN0ZWQnKSB7XG4gICAgICB0aGlzLnNldFJlc3VsdChvYnNpZGlhblJlc3VsdC5yZWFzb24/Lm1lc3NhZ2UgfHwgJ1x1OEJGQlx1NTNENiBPYnNpZGlhbiBcdTRFRDNcdTVFOTNcdTU5MzFcdThEMjUnKTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgZGVmYXVsdEV4cGFuZGVkR3JvdXBzID0gW1xuICAgICAgICAuLi50aGlzLmJ1aWxkT2JzaWRpYW5Hcm91cHMoKS5zbGljZSgwLCAzKS5tYXAoZ3JvdXAgPT4gZ3JvdXAuaWQpLFxuICAgICAgICAuLi50aGlzLmJ1aWxkV2lzZU1pbmRTb3VyY2VHcm91cHMoJ2RvY3VtZW50cycpLnNsaWNlKDAsIDMpLm1hcChncm91cCA9PiBncm91cC5pZCksXG4gICAgICAgIC4uLnRoaXMuYnVpbGRXaXNlTWluZFNvdXJjZUdyb3Vwcygnbm90ZXMnKS5zbGljZSgwLCAzKS5tYXAoZ3JvdXAgPT4gZ3JvdXAuaWQpLFxuICAgICAgICAuLi50aGlzLmJ1aWxkV2lzZU1pbmRTb3VyY2VHcm91cHMoJ2tub3dsZWRnZScpLnNsaWNlKDAsIDMpLm1hcChncm91cCA9PiBncm91cC5pZCksXG4gICAgICAgIC4uLnRoaXMuYnVpbGREZXN0aW5hdGlvbkdyb3VwcygpLm1hcChncm91cCA9PiBncm91cC5pZCksXG4gICAgICBdO1xuICAgICAgdGhpcy5leHBhbmRlZEdyb3VwcyA9IHByZXNlcnZlU2VsZWN0aW9uXG4gICAgICAgID8gbmV3IFNldChbLi4uZGVmYXVsdEV4cGFuZGVkR3JvdXBzLCAuLi5wcmV2aW91c0V4cGFuZGVkR3JvdXBzXSlcbiAgICAgICAgOiBuZXcgU2V0KGRlZmF1bHRFeHBhbmRlZEdyb3Vwcyk7XG4gICAgICBpZiAoIXRoaXMuaGFzQXBwbGllZERlZmF1bHRQbGFuKSB7XG4gICAgICAgIHRoaXMuYXBwbHlEZWZhdWx0UGxhbigpO1xuICAgICAgICB0aGlzLmhhc0FwcGxpZWREZWZhdWx0UGxhbiA9IHRydWU7XG4gICAgICB9XG4gICAgICB0aGlzLnJlbmRlckR5bmFtaWMoKTtcbiAgICAgIGlmIChwcmVzZXJ2ZVNlbGVjdGlvbikgdGhpcy5yZXN0b3JlTGlzdFNjcm9sbChwcmV2aW91c1Njcm9sbCk7XG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgdGhpcy5zZXRSZXN1bHQoZXJyb3I/Lm1lc3NhZ2UgfHwgJ1x1OEJGQlx1NTNENlx1NjU3MFx1NjM2RVx1NTkzMVx1OEQyNScpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyU2hlbGwoKSB7XG4gICAgY29uc3Qgcm9vdCA9IHRoaXMuY29udGVudEVsO1xuICAgIHJvb3QuZW1wdHkoKTtcbiAgICByb290LmFkZENsYXNzKCd3aXNlbWluZC1icmlkZ2UtdmlldycpO1xuXG4gICAgY29uc3QgaGVhZGVyID0gcm9vdC5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtaGVhZGVyJyB9KTtcbiAgICBoZWFkZXIuYXBwZW5kQ2hpbGQoY3JlYXRlSW5saW5lSWNvbih0aGlzLmdldEljb25TdmcoJ3dpc2VtaW5kYWktbG9nby5zdmcnKSwgJ1dpc2VNaW5kQUkgT2JzaWRpYW4nLCAnd2lzZW1pbmQtYnJpZGdlLWljb24nKSk7XG4gICAgY29uc3QgdGl0bGVXcmFwID0gaGVhZGVyLmNyZWF0ZURpdigpO1xuICAgIHRpdGxlV3JhcC5jcmVhdGVFbCgnaDInLCB7IHRleHQ6ICdXaXNlTWluZEFJIE9ic2lkaWFuJyB9KTtcbiAgICB0aXRsZVdyYXAuY3JlYXRlRGl2KHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLW11dGVkJywgdGV4dDogJ1x1OTAwOVx1NjJFOVx1NjVCOVx1NTQxMVx1NTQ4Q1x1ODMwM1x1NTZGNFx1NTQwRVx1NjI2N1x1ODg0Q1x1NTQwQ1x1NkI2NVx1MzAwMicgfSk7XG4gICAgY29uc3QgaGVhZGVyQWN0aW9ucyA9IGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtaGVhZGVyLWFjdGlvbnMnIH0pO1xuICAgIGhlYWRlckFjdGlvbnMuYXBwZW5kKFxuICAgICAgY3JlYXRlVGV4dEJ1dHRvbignXHU1M0YzXHU5NTJFXHU4M0RDXHU1MzU1XHU4QkJFXHU3RjZFJywgKCkgPT4gdm9pZCB0aGlzLm9wZW5Db250ZXh0TWVudVNldHRpbmdzKCksIHRoaXMuZ2V0SWNvblN2ZygnZG9jdW1lbnQuc3ZnJykpLFxuICAgICAgY3JlYXRlVGV4dEJ1dHRvbignQVBJIFx1OEJCRVx1N0Y2RScsICgpID0+IHZvaWQgdGhpcy5vcGVuQXBpU2V0dGluZ3MoKSwgdGhpcy5nZXRJY29uU3ZnKCdwZW5jaWwtc3F1YXJlLnN2ZycpKSxcbiAgICAgIGNyZWF0ZVRleHRCdXR0b24oJ1x1NEY3Rlx1NzUyOFx1NjU1OVx1N0EwQicsICgpID0+IHZvaWQgdGhpcy5vcGVuVHV0b3JpYWwoKSwgdGhpcy5nZXRJY29uU3ZnKCdib29rbWFyay1zcXVhcmUuc3ZnJykpLFxuICAgICAgY3JlYXRlVGV4dEJ1dHRvbignXHU2MjUzXHU1RjAwXHU1Qjk4XHU3RjUxJywgKCkgPT4ge1xuICAgICAgICB3aW5kb3cub3BlbignaHR0cHM6Ly93aXNlbWluZGFpLmFwcCcsICdfYmxhbmsnLCAnbm9vcGVuZXIsbm9yZWZlcnJlcicpO1xuICAgICAgfSwgdGhpcy5nZXRJY29uU3ZnKCdob21lLnN2ZycpKSxcbiAgICApO1xuXG4gICAgdGhpcy5zdGF0c0VsID0gcm9vdC5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2Utc3VtbWFyeScgfSk7XG4gICAgdGhpcy50YWJzRWwgPSByb290LmNyZWF0ZURpdih7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1kaXJlY3Rpb24tdGFicycgfSk7XG4gICAgdGhpcy5wbGFuQmFyRWwgPSByb290LmNyZWF0ZURpdih7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1wbGFuLWJhcicgfSk7XG4gICAgdGhpcy50b29sYmFyRWwgPSByb290LmNyZWF0ZURpdih7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS10b29sYmFyJyB9KTtcbiAgICB0aGlzLmZsb3dFbCA9IHJvb3QuY3JlYXRlRGl2KHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLWZsb3cnIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJEeW5hbWljKCkge1xuICAgIHRoaXMucmVuZGVyU3RhdHMoKTtcbiAgICB0aGlzLnJlbmRlckRpcmVjdGlvblRhYnMoKTtcbiAgICB0aGlzLnJlbmRlclBsYW5CYXIoKTtcbiAgICB0aGlzLnJlbmRlclRvb2xiYXIoKTtcbiAgICB0aGlzLnJlbmRlckZsb3coKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyU3RhdHMoKSB7XG4gICAgaWYgKCF0aGlzLnN0YXRzRWwpIHJldHVybjtcbiAgICBjb25zdCBub3RlcyA9IHRoaXMuc25hcHNob3Q/Lm5vdGVzLmZpbHRlcihpdGVtID0+ICFpdGVtLmlzX2ZvbGRlcikubGVuZ3RoIHx8IDA7XG4gICAgY29uc3QgZG9jcyA9IHRoaXMuc25hcHNob3Q/LmRvY3VtZW50cy5maWx0ZXIoaXRlbSA9PiAhaXRlbS5pc19mb2xkZXIgJiYgaXNNYXJrZG93blJlY29yZChpdGVtKSkubGVuZ3RoIHx8IDA7XG4gICAgY29uc3QgbWFya2Rvd25Lbm93bGVkZ2VCYXNlSWRzID0gbmV3IFNldChcbiAgICAgICh0aGlzLnNuYXBzaG90Py5rbm93bGVkZ2VEb2N1bWVudHMgfHwgW10pXG4gICAgICAgIC5maWx0ZXIoaXNNYXJrZG93blJlY29yZClcbiAgICAgICAgLm1hcChpdGVtID0+IFN0cmluZyhpdGVtLmtub3dsZWRnZUJhc2VJZCkpLFxuICAgICk7XG4gICAgY29uc3QgYmFzZXMgPSB0aGlzLnNuYXBzaG90Py5rbm93bGVkZ2VCYXNlc1xuICAgICAgLmZpbHRlcihpdGVtID0+IG1hcmtkb3duS25vd2xlZGdlQmFzZUlkcy5oYXMoU3RyaW5nKGl0ZW0uaWQpKSlcbiAgICAgIC5sZW5ndGggfHwgMDtcblxuICAgIHRoaXMuc3RhdHNFbC5lbXB0eSgpO1xuICAgIHRoaXMuc3RhdHNFbC5hcHBlbmQoXG4gICAgICByZW5kZXJTdW1tYXJ5QmxvY2soJ09ic2lkaWFuIFx1NUY1M1x1NTI0RFx1NEVEM1x1NUU5MycsIFtcbiAgICAgICAgeyB2YWx1ZTogdGhpcy5vYnNpZGlhbkl0ZW1zLmxlbmd0aCwgbGFiZWw6ICdcdTdCQzdcdTdCMTRcdThCQjAnIH0sXG4gICAgICBdKSxcbiAgICAgIHJlbmRlclN1bW1hcnlCbG9jaygnV2lzZU1pbmRBSSBcdTY3MkNcdTU3MzBcdTY1NzBcdTYzNkVcdUZGMDhcdTRFQzUgTWFya2Rvd24gXHU2NTg3XHU2ODYzXHVGRjA5JywgW1xuICAgICAgICB7IHZhbHVlOiBub3RlcywgbGFiZWw6ICdcdTdCQzdcdTdCMTRcdThCQjAnIH0sXG4gICAgICAgIHsgdmFsdWU6IGRvY3MsIGxhYmVsOiAnXHU0RTJBXHU2NTg3XHU2ODYzJyB9LFxuICAgICAgICB7IHZhbHVlOiBiYXNlcywgbGFiZWw6ICdcdTRFMkFcdTc3RTVcdThCQzZcdTVFOTMnIH0sXG4gICAgICBdKSxcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJEaXJlY3Rpb25UYWJzKCkge1xuICAgIGlmICghdGhpcy50YWJzRWwpIHJldHVybjtcbiAgICB0aGlzLnRhYnNFbC5lbXB0eSgpO1xuICAgIHRoaXMudGFic0VsLmFwcGVuZChcbiAgICAgIHRoaXMucmVuZGVyRGlyZWN0aW9uVGFiKCd0by13aXNlbWluZCcsICdPYnNpZGlhbiAtPiBXaXNlTWluZEFJJywgdGhpcy5nZXRJY29uU3ZnKCdzeW5jLXRvLXdpc2VtaW5kLnN2ZycpKSxcbiAgICAgIHRoaXMucmVuZGVyRGlyZWN0aW9uVGFiKCd0by1vYnNpZGlhbicsICdXaXNlTWluZEFJIC0+IE9ic2lkaWFuJywgdGhpcy5nZXRJY29uU3ZnKCdzeW5jLXRvLW9ic2lkaWFuLnN2ZycpKSxcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJEaXJlY3Rpb25UYWIoZGlyZWN0aW9uOiBEaXJlY3Rpb24sIHRleHQ6IHN0cmluZywgaWNvbjogc3RyaW5nKSB7XG4gICAgY29uc3QgYnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG4gICAgYnV0dG9uLmNsYXNzTmFtZSA9IGB3aXNlbWluZC1icmlkZ2UtdGFiJHt0aGlzLmRpcmVjdGlvbiA9PT0gZGlyZWN0aW9uID8gJyBpcy1hY3RpdmUnIDogJyd9YDtcbiAgICBidXR0b24uYXBwZW5kKGNyZWF0ZUlubGluZUljb24oaWNvbiwgdGV4dCksIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHRleHQpKTtcbiAgICBidXR0b24ub25jbGljayA9ICgpID0+IHtcbiAgICAgIHRoaXMuZGlyZWN0aW9uID0gZGlyZWN0aW9uO1xuICAgICAgdGhpcy5yZW5kZXJEeW5hbWljKCk7XG4gICAgfTtcbiAgICByZXR1cm4gYnV0dG9uO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJUb29sYmFyKCkge1xuICAgIGlmICghdGhpcy50b29sYmFyRWwpIHJldHVybjtcbiAgICB0aGlzLnRvb2xiYXJFbC5lbXB0eSgpO1xuICAgIHRoaXMudG9vbGJhckVsLmFwcGVuZChjcmVhdGVCdXR0b24oJ1x1NTIzN1x1NjVCMFx1NjU3MFx1NjM2RScsICgpID0+IHRoaXMucmVmcmVzaCgpLCAnc2Vjb25kYXJ5JywgdGhpcy5nZXRJY29uU3ZnKCdhcnJvdy1wYXRoLnN2ZycpKSk7XG4gICAgdGhpcy50b29sYmFyRWwuYXBwZW5kKGNyZWF0ZUJ1dHRvbignXHU1NDBDXHU2QjY1XHU1Mzg2XHU1M0YyJywgKCkgPT4gdGhpcy5vcGVuSGlzdG9yeSgpLCAnc2Vjb25kYXJ5JywgdGhpcy5nZXRJY29uU3ZnKCdjbG9jay5zdmcnKSkpO1xuICAgIGNvbnN0IGhpbnQgPSB0aGlzLnRvb2xiYXJFbC5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtbXV0ZWQnIH0pO1xuICAgIGhpbnQuc2V0VGV4dChcbiAgICAgIHRoaXMuZGlyZWN0aW9uID09PSAndG8td2lzZW1pbmQnXG4gICAgICAgID8gYFx1NURGMlx1OTAwOSAke3RoaXMuc2VsZWN0ZWRPYnNpZGlhbi5zaXplfSBcdTdCQzcgT2JzaWRpYW4gXHU3QjE0XHU4QkIwXHVGRjBDXHU3NkVFXHU2ODA3XHVGRjFBJHt0aGlzLmdldFNlbGVjdGVkVGFyZ2V0TGFiZWxzKCl9YFxuICAgICAgICA6IGBcdTVERjJcdTkwMDkgJHt0aGlzLmdldFNlbGVjdGVkV2lzZU1pbmRGb3JBY3RpdmVDYXRlZ29yeSgpLmxlbmd0aH0gXHU2NzYxIFdpc2VNaW5kQUkgXHU1MTg1XHU1QkI5XHVGRjBDXHU3NkVFXHU2ODA3XHVGRjFBJHt0aGlzLnNlbGVjdGVkT2JzaWRpYW5UYXJnZXRGb2xkZXJzLnNpemV9IFx1NEUyQVx1NjU4N1x1NEVGNlx1NTkzOWAsXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgb3BlbkFwaVNldHRpbmdzKCkge1xuICAgIGNvbnN0IG92ZXJsYXkgPSB0aGlzLmNyZWF0ZURpYWxvZygnQVBJIFx1OEJCRVx1N0Y2RScpO1xuICAgIGNvbnN0IG1vZGFsID0gb3ZlcmxheS5xdWVyeVNlbGVjdG9yKCcud2lzZW1pbmQtYnJpZGdlLWRpYWxvZycpIGFzIEhUTUxFbGVtZW50O1xuXG4gICAgY29uc3QgaW50cm8gPSBtb2RhbC5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtdHV0b3JpYWwtaW50cm8nIH0pO1xuICAgIGludHJvLmNyZWF0ZUVsKCdzdHJvbmcnLCB7IHRleHQ6ICdXaXNlTWluZEFJIFx1NjcyQ1x1NTczMFx1NjNBNVx1NTNFM1x1NTczMFx1NTc0MCcgfSk7XG4gICAgaW50cm8uY3JlYXRlRWwoJ3NwYW4nLCB7IHRleHQ6ICdcdTU5ODJcdTY3OUNcdTRGNjBcdTRGRUVcdTY1MzlcdThGQzcgV2lzZU1pbmRBSSBcdTY3MkNcdTU3MzBcdTYzQTVcdTUzRTNcdTU3MzBcdTU3NDBcdUZGMENcdTUzRUZcdTRFRTVcdTU3MjhcdThGRDlcdTkxQ0NcdThDMDNcdTY1NzRcdTMwMDJcdTlFRDhcdThCQTRcdTU3MzBcdTU3NDBcdTkwMUFcdTVFMzhcdTRFMERcdTk3MDBcdTg5ODFcdTY1MzlcdTMwMDInIH0pO1xuICAgIGludHJvLmNyZWF0ZUVsKCdzcGFuJywgeyB0ZXh0OiAnXHU0RjdGXHU3NTI4XHU1MjREXHU4QkY3XHU1NzI4IFdpc2VNaW5kQUkgXHU1REU2XHU0RTBCXHU4OUQyXHU2MjUzXHU1RjAwXHU4QkJFXHU3RjZFXHVGRjBDXHU4RkRCXHU1MTY1XHUzMDBDXHU3Q0ZCXHU3RURGXHU4QkJFXHU3RjZFXHUzMDBELT5cdTMwMENcdTY3MkNcdTU3MzAgQVBJIFx1NjcwRFx1NTJBMVx1MzAwRFx1RkYwQ1x1NUYwMFx1NTQyRlx1NjcwRFx1NTJBMVx1NTQwRVx1NTE4RFx1OEZERVx1NjNBNVx1MzAwMicgfSk7XG5cbiAgICBjb25zdCBmb3JtID0gbW9kYWwuY3JlYXRlRGl2KHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLWFwaS1mb3JtJyB9KTtcbiAgICBjb25zdCBpbnB1dCA9IGZvcm0uY3JlYXRlRWwoJ2lucHV0Jywge1xuICAgICAgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLXBsYW4tbmFtZScsXG4gICAgICBhdHRyOiB7IHBsYWNlaG9sZGVyOiBERUZBVUxUX1NFVFRJTkdTLmFwaUJhc2VVcmwgfSxcbiAgICB9KTtcbiAgICBpbnB1dC52YWx1ZSA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmFwaUJhc2VVcmwgfHwgREVGQVVMVF9TRVRUSU5HUy5hcGlCYXNlVXJsO1xuICAgIGNvbnN0IHN0YXR1cyA9IGZvcm0uY3JlYXRlRGl2KHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLW11dGVkJywgdGV4dDogYFx1NUY1M1x1NTI0RFx1RkYxQSR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuYXBpQmFzZVVybCB8fCBERUZBVUxUX1NFVFRJTkdTLmFwaUJhc2VVcmx9YCB9KTtcblxuICAgIGNvbnN0IGdldFZhbGlkYXRlZFVybCA9ICgpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gaW5wdXQudmFsdWUudHJpbSgpIHx8IERFRkFVTFRfU0VUVElOR1MuYXBpQmFzZVVybDtcbiAgICAgIGNvbnN0IG5vcm1hbGl6ZWQgPSBub3JtYWxpemVCYXNlVXJsKHZhbHVlKTtcbiAgICAgIGNvbnN0IHBhcnNlZCA9IG5ldyBVUkwobm9ybWFsaXplZCk7XG4gICAgICBpZiAoIVsnaHR0cDonLCAnaHR0cHM6J10uaW5jbHVkZXMocGFyc2VkLnByb3RvY29sKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1x1NjNBNVx1NTNFM1x1NTczMFx1NTc0MFx1NUZDNVx1OTg3Qlx1NEVFNSBodHRwOi8vIFx1NjIxNiBodHRwczovLyBcdTVGMDBcdTU5MzQnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBub3JtYWxpemVkO1xuICAgIH07XG5cbiAgICBjb25zdCBhY3Rpb25zID0gbW9kYWwuY3JlYXRlRGl2KHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLWRpYWxvZy1hY3Rpb25zJyB9KTtcbiAgICBhY3Rpb25zLmFwcGVuZChcbiAgICAgIGNyZWF0ZVRleHRCdXR0b24oJ1x1NkQ0Qlx1OEJENVx1OEZERVx1NjNBNScsIGFzeW5jICgpID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCB1cmwgPSBnZXRWYWxpZGF0ZWRVcmwoKTtcbiAgICAgICAgICBzdGF0dXMuc2V0VGV4dCgnXHU2QjYzXHU1NzI4XHU2RDRCXHU4QkQ1XHU4RkRFXHU2M0E1Li4uJyk7XG4gICAgICAgICAgYXdhaXQgbmV3IFdpc2VNaW5kQXBpQ2xpZW50KHVybCkuaGVhbHRoKCk7XG4gICAgICAgICAgc3RhdHVzLnNldFRleHQoYFx1OEZERVx1NjNBNVx1NjIxMFx1NTI5Rlx1RkYxQSR7dXJsfWApO1xuICAgICAgICAgIG5ldyBOb3RpY2UoJ1dpc2VNaW5kQUkgXHU1REYyXHU4RkRFXHU2M0E1Jyk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICBjb25zdCBtZXNzYWdlID0gZXJyb3I/Lm1lc3NhZ2UgfHwgJ1x1NjVFMFx1NkNENVx1OEZERVx1NjNBNSBXaXNlTWluZEFJJztcbiAgICAgICAgICBzdGF0dXMuc2V0VGV4dChtZXNzYWdlKTtcbiAgICAgICAgICBuZXcgTm90aWNlKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICB9LCB0aGlzLmdldEljb25TdmcoJ2Fycm93LXBhdGguc3ZnJykpLFxuICAgICAgY3JlYXRlVGV4dEJ1dHRvbignXHU0RkREXHU1QjU4JywgYXN5bmMgKCkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHVybCA9IGdldFZhbGlkYXRlZFVybCgpO1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmFwaUJhc2VVcmwgPSB1cmw7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgc3RhdHVzLnNldFRleHQoYFx1NURGMlx1NEZERFx1NUI1OFx1RkYxQSR7dXJsfWApO1xuICAgICAgICAgIG5ldyBOb3RpY2UoJ0FQSSBcdThCQkVcdTdGNkVcdTVERjJcdTRGRERcdTVCNTgnKTtcbiAgICAgICAgICBvdmVybGF5LnJlbW92ZSgpO1xuICAgICAgICAgIGF3YWl0IHRoaXMucmVmcmVzaCh0cnVlKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvcj8ubWVzc2FnZSB8fCAnXHU2M0E1XHU1M0UzXHU1NzMwXHU1NzQwXHU0RTBEXHU2QjYzXHU3ODZFJztcbiAgICAgICAgICBzdGF0dXMuc2V0VGV4dChtZXNzYWdlKTtcbiAgICAgICAgICBuZXcgTm90aWNlKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICB9LCB0aGlzLmdldEljb25TdmcoJ2NoZWNrLWNpcmNsZS5zdmcnKSksXG4gICAgKTtcblxuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgaW5wdXQuZm9jdXMoKTtcbiAgICAgIGlucHV0LnNlbGVjdCgpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBvcGVuQ29udGV4dE1lbnVTZXR0aW5ncygpIHtcbiAgICBjb25zdCBvdmVybGF5ID0gdGhpcy5jcmVhdGVEaWFsb2coJ1x1NTNGM1x1OTUyRVx1ODNEQ1x1NTM1NVx1OEJCRVx1N0Y2RScpO1xuICAgIGNvbnN0IG1vZGFsID0gb3ZlcmxheS5xdWVyeVNlbGVjdG9yKCcud2lzZW1pbmQtYnJpZGdlLWRpYWxvZycpIGFzIEhUTUxFbGVtZW50O1xuICAgIG1vZGFsLmFkZENsYXNzKCd3aXNlbWluZC1icmlkZ2UtY29udGV4dC1zZXR0aW5ncy1kaWFsb2cnKTtcblxuICAgIGNvbnN0IGludHJvID0gbW9kYWwuY3JlYXRlRGl2KHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLXR1dG9yaWFsLWludHJvJyB9KTtcbiAgICBpbnRyby5jcmVhdGVFbCgnc3Ryb25nJywgeyB0ZXh0OiAnXHU1M0YzXHU5NTJFXHU1M0QxXHU5MDAxXHU5RUQ4XHU4QkE0XHU3NkVFXHU2ODA3JyB9KTtcbiAgICBpbnRyby5jcmVhdGVFbCgnc3BhbicsIHsgdGV4dDogJ1x1OEJCRVx1N0Y2RVx1NTQwRVx1RkYwQ1x1NEVDRSBPYnNpZGlhbiBcdTUzRjNcdTk1MkVcdTgzRENcdTUzNTVcdTUzRDFcdTkwMDFcdTdCMTRcdThCQjBcdTMwMDFcdTY1ODdcdTY4NjNcdTYyMTZcdTc3RTVcdThCQzZcdTVFOTNcdTY1RjZcdUZGMENcdTRGMUFcdTlFRDhcdThCQTRcdTkwMDlcdTRFMkRcdThGRDlcdTkxQ0NcdTc2ODRcdTc2RUVcdTY4MDdcdTMwMDInIH0pO1xuXG4gICAgY29uc3Qgc3RhdHVzID0gbW9kYWwuY3JlYXRlRGl2KHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLW11dGVkJywgdGV4dDogJ1x1NkI2M1x1NTcyOFx1OEJGQlx1NTNENiBXaXNlTWluZEFJIFx1NzZFRVx1NjgwN1x1NTIxN1x1ODg2OC4uLicgfSk7XG4gICAgbGV0IHNuYXBzaG90ID0gdGhpcy5zbmFwc2hvdDtcbiAgICBpZiAoIXNuYXBzaG90KSB7XG4gICAgICB0cnkge1xuICAgICAgICBzbmFwc2hvdCA9IGF3YWl0IHRoaXMucGx1Z2luLmFwaS5sb2FkU25hcHNob3QoKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgc3RhdHVzLnNldFRleHQoZXJyb3I/Lm1lc3NhZ2UgfHwgJ1x1OEJGQlx1NTNENiBXaXNlTWluZEFJIFx1NzZFRVx1NjgwN1x1NTkzMVx1OEQyNScpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgc3RhdHVzLnNldFRleHQoJ1x1OTAwOVx1NjJFOVx1NkJDRlx1NEUyQVx1NTNGM1x1OTUyRVx1ODNEQ1x1NTM1NVx1NzY4NFx1OUVEOFx1OEJBNFx1NzZFRVx1NjgwN1x1MzAwMicpO1xuICAgIGNvbnN0IG5vdGVPcHRpb25zID0gW1xuICAgICAgeyB2YWx1ZTogJycsIHRpdGxlOiAnXHU2ODM5XHU3NkVFXHU1RjU1JyB9LFxuICAgICAgLi4udGhpcy5nZXRGb2xkZXJMYWJlbHMoc25hcHNob3Qubm90ZUZvbGRlcnMgfHwgW10pLm1hcCh2YWx1ZSA9PiAoeyB2YWx1ZSwgdGl0bGU6IHZhbHVlIH0pKSxcbiAgICBdO1xuICAgIGNvbnN0IGRvY3VtZW50T3B0aW9ucyA9IFtcbiAgICAgIHsgdmFsdWU6ICcnLCB0aXRsZTogJ1x1NjgzOVx1NzZFRVx1NUY1NScgfSxcbiAgICAgIC4uLnRoaXMuZ2V0Rm9sZGVyTGFiZWxzKHNuYXBzaG90LmRvY3VtZW50Rm9sZGVycyB8fCBbXSkubWFwKHZhbHVlID0+ICh7IHZhbHVlLCB0aXRsZTogdmFsdWUgfSkpLFxuICAgIF07XG4gICAgY29uc3Qga25vd2xlZGdlT3B0aW9ucyA9IChzbmFwc2hvdC5rbm93bGVkZ2VCYXNlcyB8fCBbXSlcbiAgICAgIC5tYXAoaXRlbSA9PiBzYWZlVGl0bGUoaXRlbS5uYW1lLCBpdGVtLnRpdGxlLCBgXHU3N0U1XHU4QkM2XHU1RTkzICR7aXRlbS5pZH1gKSlcbiAgICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAgIC5zb3J0KChhLCBiKSA9PiBhLmxvY2FsZUNvbXBhcmUoYikpXG4gICAgICAubWFwKHZhbHVlID0+ICh7IHZhbHVlLCB0aXRsZTogdmFsdWUgfSkpO1xuXG4gICAgbGV0IG5vdGVGb2xkZXJQYXRoID0gbm90ZU9wdGlvbnMuc29tZShpdGVtID0+IGl0ZW0udmFsdWUgPT09IHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbnRleHRNZW51RGVmYXVsdHMubm90ZUZvbGRlclBhdGgpXG4gICAgICA/IHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbnRleHRNZW51RGVmYXVsdHMubm90ZUZvbGRlclBhdGhcbiAgICAgIDogJyc7XG4gICAgbGV0IGRvY3VtZW50Rm9sZGVyUGF0aCA9IGRvY3VtZW50T3B0aW9ucy5zb21lKGl0ZW0gPT4gaXRlbS52YWx1ZSA9PT0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuY29udGV4dE1lbnVEZWZhdWx0cy5kb2N1bWVudEZvbGRlclBhdGgpXG4gICAgICA/IHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbnRleHRNZW51RGVmYXVsdHMuZG9jdW1lbnRGb2xkZXJQYXRoXG4gICAgICA6ICcnO1xuICAgIGxldCBrbm93bGVkZ2VCYXNlTmFtZSA9IGtub3dsZWRnZU9wdGlvbnMuc29tZShpdGVtID0+IGl0ZW0udmFsdWUgPT09IHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbnRleHRNZW51RGVmYXVsdHMua25vd2xlZGdlQmFzZU5hbWUpXG4gICAgICA/IHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbnRleHRNZW51RGVmYXVsdHMua25vd2xlZGdlQmFzZU5hbWVcbiAgICAgIDoga25vd2xlZGdlT3B0aW9uc1swXT8udmFsdWUgfHwgdGhpcy5wbHVnaW4uc2V0dGluZ3MuY29udGV4dE1lbnVEZWZhdWx0cy5rbm93bGVkZ2VCYXNlTmFtZSB8fCBERUZBVUxUX1NFVFRJTkdTLmNvbnRleHRNZW51RGVmYXVsdHMua25vd2xlZGdlQmFzZU5hbWU7XG5cbiAgICBjb25zdCBjb250ZW50ID0gbW9kYWwuY3JlYXRlRGl2KHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLWNvbnRleHQtc2V0dGluZ3MnIH0pO1xuICAgIGNvbnRlbnQuYXBwZW5kKFxuICAgICAgcmVuZGVyU2VsZWN0RmllbGQoe1xuICAgICAgICB0aXRsZTogJ1x1NTNEMVx1OTAwMVx1NTIzMCBXaXNlTWluZEFJIFx1N0IxNFx1OEJCMCcsXG4gICAgICAgIGRlc2M6ICdcdTlFRDhcdThCQTRcdTdCMTRcdThCQjBcdTY1ODdcdTRFRjZcdTU5MzknLFxuICAgICAgICBvcHRpb25zOiBub3RlT3B0aW9ucyxcbiAgICAgICAgc2VsZWN0ZWQ6IG5vdGVGb2xkZXJQYXRoLFxuICAgICAgICBvbkNoYW5nZTogdmFsdWUgPT4ge1xuICAgICAgICAgIG5vdGVGb2xkZXJQYXRoID0gdmFsdWU7XG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICAgIHJlbmRlclNlbGVjdEZpZWxkKHtcbiAgICAgICAgdGl0bGU6ICdcdTUzRDFcdTkwMDFcdTUyMzAgV2lzZU1pbmRBSSBcdTY1ODdcdTY4NjMnLFxuICAgICAgICBkZXNjOiAnXHU5RUQ4XHU4QkE0XHU2NTg3XHU2ODYzXHU2NTg3XHU0RUY2XHU1OTM5JyxcbiAgICAgICAgb3B0aW9uczogZG9jdW1lbnRPcHRpb25zLFxuICAgICAgICBzZWxlY3RlZDogZG9jdW1lbnRGb2xkZXJQYXRoLFxuICAgICAgICBvbkNoYW5nZTogdmFsdWUgPT4ge1xuICAgICAgICAgIGRvY3VtZW50Rm9sZGVyUGF0aCA9IHZhbHVlO1xuICAgICAgICB9LFxuICAgICAgfSksXG4gICAgICByZW5kZXJTZWxlY3RGaWVsZCh7XG4gICAgICAgIHRpdGxlOiAnXHU1M0QxXHU5MDAxXHU1MjMwIFdpc2VNaW5kQUkgXHU3N0U1XHU4QkM2XHU1RTkzJyxcbiAgICAgICAgZGVzYzogJ1x1OUVEOFx1OEJBNFx1NzdFNVx1OEJDNlx1NUU5MycsXG4gICAgICAgIG9wdGlvbnM6IGtub3dsZWRnZU9wdGlvbnMsXG4gICAgICAgIHNlbGVjdGVkOiBrbm93bGVkZ2VCYXNlTmFtZSxcbiAgICAgICAgZW1wdHlUZXh0OiAnV2lzZU1pbmRBSSBcdTkxQ0NcdThGRDhcdTZDQTFcdTY3MDlcdTc3RTVcdThCQzZcdTVFOTNcdTMwMDInLFxuICAgICAgICBvbkNoYW5nZTogdmFsdWUgPT4ge1xuICAgICAgICAgIGtub3dsZWRnZUJhc2VOYW1lID0gdmFsdWU7XG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICApO1xuXG4gICAgY29uc3QgYWN0aW9ucyA9IG1vZGFsLmNyZWF0ZURpdih7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1kaWFsb2ctYWN0aW9ucycgfSk7XG4gICAgYWN0aW9ucy5hcHBlbmQoXG4gICAgICBjcmVhdGVUZXh0QnV0dG9uKCdcdTRGRERcdTVCNTgnLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbnRleHRNZW51RGVmYXVsdHMgPSB7XG4gICAgICAgICAgbm90ZUZvbGRlclBhdGgsXG4gICAgICAgICAgZG9jdW1lbnRGb2xkZXJQYXRoLFxuICAgICAgICAgIGtub3dsZWRnZUJhc2VOYW1lLFxuICAgICAgICB9O1xuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgbmV3IE5vdGljZSgnXHU1M0YzXHU5NTJFXHU4M0RDXHU1MzU1XHU4QkJFXHU3RjZFXHU1REYyXHU0RkREXHU1QjU4Jyk7XG4gICAgICAgIG92ZXJsYXkucmVtb3ZlKCk7XG4gICAgICB9LCB0aGlzLmdldEljb25TdmcoJ2NoZWNrLWNpcmNsZS5zdmcnKSksXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgb3BlblR1dG9yaWFsT25GaXJzdFVzZSgpIHtcbiAgICBpZiAodGhpcy5oYXNPcGVuZWRJbml0aWFsVHV0b3JpYWwgfHwgdGhpcy5wbHVnaW4uc2V0dGluZ3MuaGFzU2VlblR1dG9yaWFsKSByZXR1cm47XG4gICAgdGhpcy5oYXNPcGVuZWRJbml0aWFsVHV0b3JpYWwgPSB0cnVlO1xuICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmhhc1NlZW5UdXRvcmlhbCA9IHRydWU7XG4gICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aGlzLm9wZW5UdXRvcmlhbCgpKTtcbiAgfVxuXG4gIHByaXZhdGUgb3BlblR1dG9yaWFsKCkge1xuICAgIGNvbnN0IG92ZXJsYXkgPSB0aGlzLmNyZWF0ZURpYWxvZygnV2lzZU1pbmRBSSBPYnNpZGlhbiBcdTRGN0ZcdTc1MjhcdTY1NTlcdTdBMEInKTtcbiAgICBjb25zdCBtb2RhbCA9IG92ZXJsYXkucXVlcnlTZWxlY3RvcignLndpc2VtaW5kLWJyaWRnZS1kaWFsb2cnKSBhcyBIVE1MRWxlbWVudDtcbiAgICBtb2RhbC5hZGRDbGFzcygnd2lzZW1pbmQtYnJpZGdlLXR1dG9yaWFsLWRpYWxvZycpO1xuXG4gICAgY29uc3QgdGFicyA9IG1vZGFsLmNyZWF0ZURpdih7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1jYXRlZ29yeS10YWJzIHdpc2VtaW5kLWJyaWRnZS10dXRvcmlhbC10YWJzJyB9KTtcbiAgICBjb25zdCBjb250ZW50ID0gbW9kYWwuY3JlYXRlRGl2KHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLXR1dG9yaWFsLWNvbnRlbnQnIH0pO1xuICAgIHR5cGUgVHV0b3JpYWxUYWIgPSAncXVpY2snIHwgJ2ZlYXR1cmVzJyB8ICdzZXR0aW5ncyc7XG4gICAgbGV0IGFjdGl2ZVRhYjogVHV0b3JpYWxUYWIgPSAncXVpY2snO1xuICAgIGNvbnN0IHRhYkl0ZW1zOiBBcnJheTx7IGtleTogVHV0b3JpYWxUYWI7IGxhYmVsOiBzdHJpbmcgfT4gPSBbXG4gICAgICB7IGtleTogJ3F1aWNrJywgbGFiZWw6ICdcdTVGRUJcdTkwMUZcdTRFMEFcdTYyNEInIH0sXG4gICAgICB7IGtleTogJ2ZlYXR1cmVzJywgbGFiZWw6ICdcdTY4MzhcdTVGQzNcdTUyOUZcdTgwRkQnIH0sXG4gICAgICB7IGtleTogJ3NldHRpbmdzJywgbGFiZWw6ICdcdTkxNERcdTdGNkVcdTk4NzknIH0sXG4gICAgXTtcblxuICAgIGNvbnN0IHJlbmRlclR1dG9yaWFsVGFicyA9ICgpID0+IHtcbiAgICAgIHRhYnMuZW1wdHkoKTtcbiAgICAgIHRhYkl0ZW1zLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgIGNvbnN0IGJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuICAgICAgICBidXR0b24uY2xhc3NOYW1lID0gYHdpc2VtaW5kLWJyaWRnZS1jYXRlZ29yeS10YWIke2FjdGl2ZVRhYiA9PT0gaXRlbS5rZXkgPyAnIGlzLWFjdGl2ZScgOiAnJ31gO1xuICAgICAgICBidXR0b24udGV4dENvbnRlbnQgPSBpdGVtLmxhYmVsO1xuICAgICAgICBidXR0b24ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICBhY3RpdmVUYWIgPSBpdGVtLmtleTtcbiAgICAgICAgICByZW5kZXJUdXRvcmlhbFRhYnMoKTtcbiAgICAgICAgICByZW5kZXJUdXRvcmlhbENvbnRlbnQoKTtcbiAgICAgICAgfTtcbiAgICAgICAgdGFicy5hcHBlbmRDaGlsZChidXR0b24pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIGNvbnN0IHJlbmRlckNhcmQgPSAodGl0bGU6IHN0cmluZywgZGVzYzogc3RyaW5nKSA9PiB7XG4gICAgICBjb25zdCBjYXJkID0gY29udGVudC5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtdHV0b3JpYWwtc3RlcCcgfSk7XG4gICAgICBjYXJkLmNyZWF0ZUVsKCdzdHJvbmcnLCB7IHRleHQ6IHRpdGxlIH0pO1xuICAgICAgY2FyZC5jcmVhdGVFbCgnc3BhbicsIHsgdGV4dDogZGVzYyB9KTtcbiAgICB9O1xuXG4gICAgY29uc3QgcmVuZGVyQmFkZ2VzID0gKHRpdGxlOiBzdHJpbmcsIGl0ZW1zOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgY29uc3Qgd3JhcCA9IGNvbnRlbnQuY3JlYXRlRGl2KHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLXBsYW4tc3VtbWFyeScgfSk7XG4gICAgICBjb25zdCBsYWJlbCA9IHdyYXAuY3JlYXRlRWwoJ3NwYW4nLCB7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1tdXRlZCcsIHRleHQ6IHRpdGxlIH0pO1xuICAgICAgbGFiZWwuc3R5bGUuZm9udFdlaWdodCA9ICc2MDAnO1xuICAgICAgY29uc3QgYmFkZ2VzID0gd3JhcC5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtYmFkZ2VzJyB9KTtcbiAgICAgIGl0ZW1zLmZvckVhY2godGV4dCA9PiBiYWRnZXMuY3JlYXRlRWwoJ3NwYW4nLCB7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1iYWRnZS1zb2Z0JywgdGV4dCB9KSk7XG4gICAgfTtcblxuICAgIGNvbnN0IHJlbmRlclR1dG9yaWFsQ29udGVudCA9ICgpID0+IHtcbiAgICAgIGNvbnRlbnQuZW1wdHkoKTtcbiAgICAgIGlmIChhY3RpdmVUYWIgPT09ICdxdWljaycpIHtcbiAgICAgICAgY29uc3QgaW50cm8gPSBjb250ZW50LmNyZWF0ZURpdih7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS10dXRvcmlhbC1pbnRybycgfSk7XG4gICAgICAgIGludHJvLmNyZWF0ZUVsKCdzdHJvbmcnLCB7IHRleHQ6ICdcdTRFMDlcdTZCNjVcdTVCOENcdTYyMTBcdTRFMDBcdTZCMjFcdTU0MENcdTZCNjUnIH0pO1xuICAgICAgICBpbnRyby5jcmVhdGVFbCgnc3BhbicsIHsgdGV4dDogJ1x1NTE0OFx1NTQyRlx1NTJBOCBXaXNlTWluZEFJXHVGRjBDXHU1MThEXHU5MDA5XHU2MkU5XHU1NDBDXHU2QjY1XHU2NUI5XHU1NDExXHU1NDhDXHU1MTg1XHU1QkI5XHVGRjBDXHU2NzAwXHU1NDBFXHU3MEI5XHU1MUZCXHU2MjY3XHU4ODRDXHU1NDBDXHU2QjY1XHUzMDAyJyB9KTtcbiAgICAgICAgY29uc3Qgc3RlcHMgPSBjb250ZW50LmNyZWF0ZURpdih7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS10dXRvcmlhbC1zdGVwcycgfSk7XG4gICAgICAgIFtcbiAgICAgICAgICBbJzEuIFx1OTAwOVx1NjJFOVx1NjVCOVx1NTQxMScsICdPYnNpZGlhbiAtPiBXaXNlTWluZEFJIFx1NjYyRlx1NUJGQ1x1NTE2NVx1NTIzMCBXaXNlTWluZEFJXHVGRjFCV2lzZU1pbmRBSSAtPiBPYnNpZGlhbiBcdTY2MkZcdTUxOTlcdTU2REVcdTVGNTNcdTUyNERcdTRFRDNcdTVFOTNcdTMwMDInXSxcbiAgICAgICAgICBbJzIuIFx1NTJGRVx1OTAwOVx1NTE4NVx1NUJCOVx1NTQ4Q1x1NzZFRVx1NjgwNycsICdcdTVERTZcdThGQjlcdTkwMDlcdTg5ODFcdTU0MENcdTZCNjVcdTc2ODRcdTUxODVcdTVCQjlcdUZGMENcdTUzRjNcdThGQjlcdTkwMDlcdTRGRERcdTVCNThcdTRGNERcdTdGNkVcdTMwMDJcdTY1ODdcdTRFRjZcdTU5MzlcdTUyNERcdTc2ODRcdTU5MERcdTkwMDlcdTY4NDZcdTUzRUZcdTRFRTVcdTRFMDBcdTk1MkVcdTUxNjhcdTkwMDlcdTMwMDInXSxcbiAgICAgICAgICBbJzMuIFx1NzBCOVx1NTFGQlx1NjI2N1x1ODg0Q1x1NTQwQ1x1NkI2NScsICdcdTk3MDBcdTg5ODFcdTg5ODZcdTc2RDZcdTY1RTdcdTUxODVcdTVCQjlcdTY1RjZcdTUyRkVcdTkwMDlcdTIwMUNcdTg5ODZcdTc2RDZcdTVERjJcdTY3MDlcdTIwMURcdUZGMUJcdTRFMERcdTc4NkVcdTVCOUFcdTY1RjZcdTUxNDhcdTkwMDlcdTVDMTFcdTkxQ0ZcdTUxODVcdTVCQjlcdTZENEJcdThCRDVcdTMwMDInXSxcbiAgICAgICAgXS5mb3JFYWNoKChbdGl0bGUsIGRlc2NdKSA9PiB7XG4gICAgICAgICAgY29uc3QgY2FyZCA9IHN0ZXBzLmNyZWF0ZURpdih7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS10dXRvcmlhbC1zdGVwJyB9KTtcbiAgICAgICAgICBjYXJkLmNyZWF0ZUVsKCdzdHJvbmcnLCB7IHRleHQ6IHRpdGxlIH0pO1xuICAgICAgICAgIGNhcmQuY3JlYXRlRWwoJ3NwYW4nLCB7IHRleHQ6IGRlc2MgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZW5kZXJCYWRnZXMoJ1x1NEY3Rlx1NzUyOFx1NTI0RFx1Nzg2RVx1OEJBNCcsIFsnV2lzZU1pbmRBSSBcdTVERjJcdTU0MkZcdTUyQTgnLCAnXHU2NzJDXHU1NzMwXHU2M0E1XHU1M0UzXHU1M0VGXHU4RkRFXHU2M0E1JywgJ1x1NTNFQVx1NTQwQ1x1NkI2NSBNYXJrZG93biBcdTUxODVcdTVCQjknXSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKGFjdGl2ZVRhYiA9PT0gJ2ZlYXR1cmVzJykge1xuICAgICAgICByZW5kZXJDYXJkKCdcdTUzQ0NcdTU0MTFcdTU0MENcdTZCNjUnLCAnXHU2NTJGXHU2MzAxXHU2MjhBIE9ic2lkaWFuIFx1NUY1M1x1NTI0RFx1NEVEM1x1NUU5M1x1NzY4NCBNYXJrZG93biBcdTVCRkNcdTUxNjUgV2lzZU1pbmRBSVx1RkYwQ1x1NEU1Rlx1NjUyRlx1NjMwMVx1NjI4QSBXaXNlTWluZEFJIFx1NzY4NFx1N0IxNFx1OEJCMFx1MzAwMVx1NjU4N1x1Njg2M1x1MzAwMVx1NzdFNVx1OEJDNlx1NUU5M1x1NTQwQ1x1NkI2NVx1NTZERSBPYnNpZGlhblx1MzAwMicpO1xuICAgICAgICByZW5kZXJDYXJkKCdcdTY1ODdcdTRFRjZcdTU5MzlcdTkwMDlcdTYyRTknLCAnXHU2NTg3XHU0RUY2XHU1OTM5XHU1M0VGXHU0RUU1XHU1QzU1XHU1RjAwXHUzMDAxXHU2NTM2XHU4RDc3XHUzMDAxXHU2NDFDXHU3RDIyXHU1NDhDXHU1MTY4XHU5MDA5XHVGRjBDXHU5MDAyXHU1NDA4XHU1M0VBXHU1NDBDXHU2QjY1XHU2N0QwXHU1MUUwXHU0RTJBXHU3NkVFXHU1RjU1XHUzMDAyJyk7XG4gICAgICAgIHJlbmRlckNhcmQoJ1x1NTQwQ1x1NkI2NVx1NjVCOVx1Njg0OCcsICdcdTVFMzhcdTc1MjhcdTU0MENcdTZCNjVcdTgzMDNcdTU2RjRcdTUzRUZcdTRFRTVcdTRGRERcdTVCNThcdTRFM0FcdTY1QjlcdTY4NDhcdUZGMENcdTRFMEJcdTZCMjFcdTYyNTNcdTVGMDBcdTU0MEVcdTc2RjRcdTYzQTVcdTVFOTRcdTc1MjhcdTY1QjlcdTY4NDhcdTVFNzZcdTYyNjdcdTg4NENcdTMwMDInKTtcbiAgICAgICAgcmVuZGVyQ2FyZCgnXHU1NDBDXHU2QjY1XHU1Mzg2XHU1M0YyJywgJ1x1NTNFRlx1NEVFNVx1NjdFNVx1NzcwQlx1NkJDRlx1NkIyMVx1NTQwQ1x1NkI2NVx1NzY4NFx1NjVGNlx1OTVGNFx1MzAwMVx1NjVCOVx1NTQxMVx1MzAwMVx1Njc2NVx1NkU5MFx1NjU4N1x1NEVGNlx1NTkzOVx1MzAwMVx1NzZFRVx1NjgwN1x1NEY0RFx1N0Y2RVx1NTQ4Q1x1NjU4N1x1NEVGNlx1NTQwRFx1NzlGMFx1MzAwMicpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHJlbmRlckNhcmQoJ1x1ODk4Nlx1NzZENlx1NURGMlx1NjcwOScsICdcdTVGMDBcdTU0MkZcdTU0MEVcdUZGMENcdTU5ODJcdTY3OUNcdTc2RUVcdTY4MDdcdTRGNERcdTdGNkVcdTVERjJcdTdFQ0ZcdTY3MDlcdTU0MENcdTU0MERcdTUxODVcdTVCQjlcdUZGMENcdTRGMUFcdTg5ODZcdTc2RDZcdTY1RTdcdTUxODVcdTVCQjlcdUZGMUJcdTUxNzNcdTk1RURcdTY1RjZcdTRGMUFcdTVDM0RcdTkxQ0ZcdTUyMUJcdTVFRkFcdTY1QjBcdTY1ODdcdTRFRjZcdUZGMENcdTkwN0ZcdTUxNERcdThCRUZcdTg5ODZcdTc2RDZcdTMwMDInKTtcbiAgICAgIHJlbmRlckNhcmQoJ1x1NTMwNVx1NTQyQlx1NjU4N1x1NEVGNlx1NTkzOScsICdcdTUzRUFcdTU3MjggV2lzZU1pbmRBSSAtPiBPYnNpZGlhbiBcdTY1RjZcdTUxRkFcdTczQjBcdTMwMDJcdTVGMDBcdTU0MkZcdTRGMUFcdTRGRERcdTc1NTkgV2lzZU1pbmRBSSBcdTY1ODdcdTRFRjZcdTU5MzlcdTVDNDJcdTdFQTdcdUZGMENcdTUxNzNcdTk1RURcdTUyMTlcdTYyOEFcdTUxODVcdTVCQjlcdTVFNzNcdTk0RkFcdTUxOTlcdTUxNjVcdTc2RUVcdTY4MDdcdTY1ODdcdTRFRjZcdTU5MzlcdTMwMDInKTtcbiAgICAgIHJlbmRlckNhcmQoJ1x1NTE5OVx1NTE2NSBPYnNpZGlhbiBcdTc2RUVcdTY4MDcnLCAnXHU5MDA5XHU2MkU5IFdpc2VNaW5kQUkgXHU1MTg1XHU1QkI5XHU1NDBDXHU2QjY1XHU1NkRFIE9ic2lkaWFuIFx1NjVGNlx1RkYwQ1x1NTNFRlx1NEVFNVx1OTAwOVx1NjJFOVx1NEUwMFx1NEUyQVx1NjIxNlx1NTkxQVx1NEUyQVx1NzZFRVx1NjgwN1x1NjU4N1x1NEVGNlx1NTkzOVx1RkYwQ1x1NEU1Rlx1NTNFRlx1NEVFNVx1NjVCMFx1NUVGQVx1NjU4N1x1NEVGNlx1NTkzOVx1MzAwMicpO1xuICAgICAgcmVuZGVyQ2FyZCgnXHU1NDBDXHU2QjY1XHU2NUI5XHU2ODQ4XHU5RUQ4XHU4QkE0XHU1MDNDJywgJ1x1NTNFRlx1NEVFNVx1NjI4QVx1NjdEMFx1NEUyQVx1NjVCOVx1Njg0OFx1OEJCRVx1NEUzQVx1OUVEOFx1OEJBNFx1NjVCOVx1Njg0OFx1RkYwQ1x1NjNEMlx1NEVGNlx1NEUwQlx1NkIyMVx1NjI1M1x1NUYwMFx1NjVGNlx1NEYxQVx1ODFFQVx1NTJBOFx1NTk1N1x1NzUyOFx1MzAwMicpO1xuICAgIH07XG5cbiAgICByZW5kZXJUdXRvcmlhbFRhYnMoKTtcbiAgICByZW5kZXJUdXRvcmlhbENvbnRlbnQoKTtcblxuICAgIGNvbnN0IGFjdGlvbnMgPSBtb2RhbC5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtZGlhbG9nLWFjdGlvbnMnIH0pO1xuICAgIGFjdGlvbnMuYXBwZW5kQ2hpbGQoY3JlYXRlVGV4dEJ1dHRvbignXHU2MjExXHU3N0U1XHU5MDUzXHU0RTg2JywgKCkgPT4gb3ZlcmxheS5yZW1vdmUoKSwgdGhpcy5nZXRJY29uU3ZnKCdjaGVjay1jaXJjbGUuc3ZnJykpKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyUGxhbkJhcigpIHtcbiAgICBpZiAoIXRoaXMucGxhbkJhckVsKSByZXR1cm47XG4gICAgdGhpcy5wbGFuQmFyRWwuZW1wdHkoKTtcblxuICAgIGNvbnN0IGxhYmVsID0gdGhpcy5wbGFuQmFyRWwuY3JlYXRlRGl2KHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLXBsYW4tbGFiZWwnIH0pO1xuICAgIGxhYmVsLmNyZWF0ZUVsKCdzdHJvbmcnLCB7IHRleHQ6ICdcdTU0MENcdTZCNjVcdTY1QjlcdTY4NDgnIH0pO1xuICAgIGxhYmVsLmNyZWF0ZUVsKCdzcGFuJywge1xuICAgICAgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLW11dGVkJyxcbiAgICAgIHRleHQ6IHRoaXMuZ2V0QWN0aXZlUGxhbk5hbWUoKSA/IGBcdTVGNTNcdTUyNERcdUZGMUEke3RoaXMuZ2V0QWN0aXZlUGxhbk5hbWUoKX1gIDogJ1x1NTNFRlx1NEZERFx1NUI1OFx1NUY1M1x1NTI0RFx1OTAwOVx1NjJFOVx1RkYwQ1x1NEUwQlx1NkIyMVx1NzZGNFx1NjNBNVx1NTk1N1x1NzUyOFx1MzAwMicsXG4gICAgfSk7XG5cbiAgICBjb25zdCBjb250cm9scyA9IHRoaXMucGxhbkJhckVsLmNyZWF0ZURpdih7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1wbGFuLWNvbnRyb2xzJyB9KTtcbiAgICBjb250cm9scy5hcHBlbmQoXG4gICAgICBjcmVhdGVUZXh0QnV0dG9uKCdcdTkwMDlcdTYyRTlcdTY1QjlcdTY4NDgnLCAoKSA9PiB0aGlzLm9wZW5QbGFuUGlja2VyKCksIHRoaXMuZ2V0SWNvblN2ZygnYm9va21hcmstc3F1YXJlLnN2ZycpKSxcbiAgICAgIGNyZWF0ZVRleHRCdXR0b24oJ1x1NEZERFx1NUI1OFx1NjVCMFx1NjVCOVx1Njg0OCcsICgpID0+IHRoaXMub3BlblNhdmVQbGFuRGlhbG9nKCksIHRoaXMuZ2V0SWNvblN2ZygncGx1cy5zdmcnKSksXG4gICAgKTtcbiAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdFN5bmNQbGFuSWQpIHtcbiAgICAgIGNvbnRyb2xzLmFwcGVuZENoaWxkKGNyZWF0ZVRleHRCdXR0b24oJ1x1NTNENlx1NkQ4OFx1OTAwOVx1NEUyRFx1NjVCOVx1Njg0OCcsIGFzeW5jICgpID0+IHtcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdFN5bmNQbGFuSWQgPSAnJztcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIHRoaXMucmVuZGVyUGxhbkJhcigpO1xuICAgICAgICBuZXcgTm90aWNlKCdcdTVERjJcdTUzRDZcdTZEODhcdTkwMDlcdTRFMkRcdTU0MENcdTZCNjVcdTY1QjlcdTY4NDgnKTtcbiAgICAgIH0sIHRoaXMuZ2V0SWNvblN2ZygneC1tYXJrLnN2ZycpKSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBvcGVuUGxhblBpY2tlcigpIHtcbiAgICBjb25zdCBvdmVybGF5ID0gdGhpcy5jcmVhdGVEaWFsb2coJ1x1OTAwOVx1NjJFOVx1NTQwQ1x1NkI2NVx1NjVCOVx1Njg0OCcpO1xuICAgIGNvbnN0IG1vZGFsID0gb3ZlcmxheS5xdWVyeVNlbGVjdG9yKCcud2lzZW1pbmQtYnJpZGdlLWRpYWxvZycpIGFzIEhUTUxFbGVtZW50O1xuICAgIGNvbnN0IHBsYW5zID0gKCkgPT4gWy4uLih0aGlzLnBsdWdpbi5zZXR0aW5ncy5zeW5jUGxhbnMgfHwgW10pXS5zb3J0KChhLCBiKSA9PiBiLnVwZGF0ZWRBdCAtIGEudXBkYXRlZEF0KTtcbiAgICBsZXQgc2VsZWN0ZWRJZCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRTeW5jUGxhbklkIHx8IHBsYW5zKClbMF0/LmlkIHx8ICcnO1xuXG4gICAgY29uc3QgbGlzdCA9IG1vZGFsLmNyZWF0ZURpdih7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1wbGFuLWxpc3QnIH0pO1xuICAgIGNvbnN0IHJlbmRlckxpc3QgPSAoKSA9PiB7XG4gICAgICBsaXN0LmVtcHR5KCk7XG4gICAgICBpZiAoIXBsYW5zKCkubGVuZ3RoKSB7XG4gICAgICAgIGxpc3QuYXBwZW5kQ2hpbGQocmVuZGVyRW1wdHkoJ1x1OEZEOFx1NkNBMVx1NjcwOVx1NEZERFx1NUI1OFx1OEZDN1x1NTQwQ1x1NkI2NVx1NjVCOVx1Njg0OFx1MzAwMicpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgcGxhbnMoKS5mb3JFYWNoKHBsYW4gPT4ge1xuICAgICAgICBjb25zdCByb3cgPSBsaXN0LmNyZWF0ZUVsKCdsYWJlbCcsIHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLXBsYW4tcm93JyB9KTtcbiAgICAgICAgY29uc3QgcmFkaW8gPSByb3cuY3JlYXRlRWwoJ2lucHV0Jyk7XG4gICAgICAgIHJhZGlvLnR5cGUgPSAncmFkaW8nO1xuICAgICAgICByYWRpby5uYW1lID0gJ3dpc2VtaW5kLXN5bmMtcGxhbic7XG4gICAgICAgIHJhZGlvLmNoZWNrZWQgPSBwbGFuLmlkID09PSBzZWxlY3RlZElkO1xuICAgICAgICByYWRpby5vbmNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICBzZWxlY3RlZElkID0gcGxhbi5pZDtcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgdGV4dCA9IHJvdy5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtcGxhbi1yb3ctdGV4dCcgfSk7XG4gICAgICAgIGNvbnN0IHRpdGxlID0gdGV4dC5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtcGxhbi10aXRsZS1saW5lJyB9KTtcbiAgICAgICAgdGl0bGUuY3JlYXRlRWwoJ3N0cm9uZycsIHsgdGV4dDogcGxhbi5uYW1lIH0pO1xuICAgICAgICBpZiAocGxhbi5pZCA9PT0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdFN5bmNQbGFuSWQpIHtcbiAgICAgICAgICB0aXRsZS5jcmVhdGVFbCgnc3BhbicsIHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLWJhZGdlLXNvZnQgaXMtcHJpbWFyeScsIHRleHQ6ICdcdTlFRDhcdThCQTQnIH0pO1xuICAgICAgICB9XG4gICAgICAgIHRleHQuY3JlYXRlRWwoJ3NwYW4nLCB7XG4gICAgICAgICAgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLW11dGVkJyxcbiAgICAgICAgICB0ZXh0OiBgJHtwbGFuLmRpcmVjdGlvbiA9PT0gJ3RvLXdpc2VtaW5kJyA/ICdPYnNpZGlhbiAtPiBXaXNlTWluZEFJJyA6ICdXaXNlTWluZEFJIC0+IE9ic2lkaWFuJ30gXHUwMEI3ICR7Zm9ybWF0RGF0ZVRpbWUocGxhbi51cGRhdGVkQXQpfWAsXG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCBhY3Rpb25zID0gcm93LmNyZWF0ZURpdih7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1wbGFuLXJvdy1hY3Rpb25zJyB9KTtcbiAgICAgICAgYWN0aW9ucy5hcHBlbmQoXG4gICAgICAgICAgY3JlYXRlSWNvbkJ1dHRvbihjcmVhdGVJbmxpbmVJY29uKHRoaXMuZ2V0SWNvblN2ZygnY2hlY2stY2lyY2xlLnN2ZycpLCAnXHU1RTk0XHU3NTI4JyksICdcdTVFOTRcdTc1MjgnLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBzZWxlY3RlZElkID0gcGxhbi5pZDtcbiAgICAgICAgICAgIHRoaXMuYXBwbHlQbGFuKHBsYW4pO1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdFN5bmNQbGFuSWQgPSBwbGFuLmlkO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICBvdmVybGF5LnJlbW92ZSgpO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJEeW5hbWljKCk7XG4gICAgICAgICAgICB0aGlzLnNldFJlc3VsdChgXHU1REYyXHU1OTU3XHU3NTI4XHU1NDBDXHU2QjY1XHU2NUI5XHU2ODQ4XHVGRjFBJHtwbGFuLm5hbWV9YCk7XG4gICAgICAgICAgfSksXG4gICAgICAgICAgY3JlYXRlSWNvbkJ1dHRvbihjcmVhdGVJbmxpbmVJY29uKHRoaXMuZ2V0SWNvblN2ZygncGVuY2lsLXNxdWFyZS5zdmcnKSwgJ1x1OTFDRFx1NTQ3RFx1NTQwRCcpLCAnXHU5MUNEXHU1NDdEXHU1NDBEJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgc2VsZWN0ZWRJZCA9IHBsYW4uaWQ7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gd2luZG93LnByb21wdCgnXHU4RjkzXHU1MTY1XHU2NUIwXHU3Njg0XHU2NUI5XHU2ODQ4XHU1NDBEXHU3OUYwJywgcGxhbi5uYW1lKT8udHJpbSgpO1xuICAgICAgICAgICAgaWYgKCFuYW1lKSByZXR1cm47XG4gICAgICAgICAgICBwbGFuLm5hbWUgPSBuYW1lO1xuICAgICAgICAgICAgcGxhbi51cGRhdGVkQXQgPSBEYXRlLm5vdygpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICB0aGlzLnJlbmRlclBsYW5CYXIoKTtcbiAgICAgICAgICAgIHJlbmRlckxpc3QoKTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoJ1x1NTQwQ1x1NkI2NVx1NjVCOVx1Njg0OFx1NURGMlx1OTFDRFx1NTQ3RFx1NTQwRCcpO1xuICAgICAgICAgIH0pLFxuICAgICAgICAgIC4uLihwbGFuLmlkID09PSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWZhdWx0U3luY1BsYW5JZCA/IFtdIDogW1xuICAgICAgICAgICAgY3JlYXRlSWNvbkJ1dHRvbihjcmVhdGVJbmxpbmVJY29uKHRoaXMuZ2V0SWNvblN2ZygnYm9va21hcmstc3F1YXJlLnN2ZycpLCAnXHU4QkJFXHU0RTNBXHU5RUQ4XHU4QkE0JyksICdcdThCQkVcdTRFM0FcdTlFRDhcdThCQTQnLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgIHNlbGVjdGVkSWQgPSBwbGFuLmlkO1xuICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWZhdWx0U3luY1BsYW5JZCA9IHBsYW4uaWQ7XG4gICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICB0aGlzLnJlbmRlclBsYW5CYXIoKTtcbiAgICAgICAgICAgICAgcmVuZGVyTGlzdCgpO1xuICAgICAgICAgICAgICBuZXcgTm90aWNlKCdcdTVERjJcdThCQkVcdTdGNkVcdTRFM0FcdTlFRDhcdThCQTRcdTU0MENcdTZCNjVcdTY1QjlcdTY4NDgnKTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgIF0pLFxuICAgICAgICAgIGNyZWF0ZUljb25CdXR0b24oY3JlYXRlSW5saW5lSWNvbih0aGlzLmdldEljb25TdmcoJ3RyYXNoLnN2ZycpLCAnXHU1MjIwXHU5NjY0JyksICdcdTUyMjBcdTk2NjQnLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBzZWxlY3RlZElkID0gcGxhbi5pZDtcbiAgICAgICAgICAgIGlmICghd2luZG93LmNvbmZpcm0oYFx1Nzg2RVx1NUI5QVx1NTIyMFx1OTY2NFx1NTQwQ1x1NkI2NVx1NjVCOVx1Njg0OFx1MzAwQyR7cGxhbi5uYW1lfVx1MzAwRFx1NTQxN1x1RkYxRmApKSByZXR1cm47XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zeW5jUGxhbnMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zeW5jUGxhbnMuZmlsdGVyKGl0ZW0gPT4gaXRlbS5pZCAhPT0gcGxhbi5pZCk7XG4gICAgICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdFN5bmNQbGFuSWQgPT09IHBsYW4uaWQpIHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRTeW5jUGxhbklkID0gJyc7XG4gICAgICAgICAgICBzZWxlY3RlZElkID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdFN5bmNQbGFuSWQgfHwgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc3luY1BsYW5zWzBdPy5pZCB8fCAnJztcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJQbGFuQmFyKCk7XG4gICAgICAgICAgICByZW5kZXJMaXN0KCk7XG4gICAgICAgICAgICBuZXcgTm90aWNlKCdcdTU0MENcdTZCNjVcdTY1QjlcdTY4NDhcdTVERjJcdTUyMjBcdTk2NjQnKTtcbiAgICAgICAgICB9KSxcbiAgICAgICAgKTtcbiAgICAgIH0pO1xuICAgIH07XG4gICAgcmVuZGVyTGlzdCgpO1xuICB9XG5cbiAgcHJpdmF0ZSBvcGVuU2F2ZVBsYW5EaWFsb2coKSB7XG4gICAgY29uc3Qgb3ZlcmxheSA9IHRoaXMuY3JlYXRlRGlhbG9nKCdcdTRGRERcdTVCNThcdTY1QjBcdTY1QjlcdTY4NDgnKTtcbiAgICBjb25zdCBtb2RhbCA9IG92ZXJsYXkucXVlcnlTZWxlY3RvcignLndpc2VtaW5kLWJyaWRnZS1kaWFsb2cnKSBhcyBIVE1MRWxlbWVudDtcbiAgICBjb25zdCBzdW1tYXJ5ID0gdGhpcy5nZXRDdXJyZW50UGxhblN1bW1hcnkoKTtcbiAgICBjb25zdCBzdW1tYXJ5V3JhcCA9IG1vZGFsLmNyZWF0ZURpdih7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1wbGFuLXN1bW1hcnknIH0pO1xuICAgIHN1bW1hcnkuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgIGNvbnN0IHJvdyA9IHN1bW1hcnlXcmFwLmNyZWF0ZURpdih7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1zdW1tYXJ5LXJvdycgfSk7XG4gICAgICByb3cuY3JlYXRlRWwoJ3NwYW4nLCB7IHRleHQ6IGl0ZW0ubGFiZWwgfSk7XG4gICAgICBjb25zdCBiYWRnZXMgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLWJhZGdlcycgfSk7XG4gICAgICBjb25zdCB2YWx1ZXMgPSBpdGVtLnZhbHVlcy5sZW5ndGggPyBpdGVtLnZhbHVlcyA6IFtpdGVtLmVtcHR5VGV4dF07XG4gICAgICB2YWx1ZXMuZm9yRWFjaCh2YWx1ZSA9PiBiYWRnZXMuY3JlYXRlRWwoJ3NwYW4nLCB7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1iYWRnZS1zb2Z0JywgdGV4dDogdmFsdWUgfSkpO1xuICAgIH0pO1xuXG4gICAgY29uc3QgaW5wdXQgPSBtb2RhbC5jcmVhdGVFbCgnaW5wdXQnLCB7XG4gICAgICBjbHM6ICd3aXNlbWluZC1icmlkZ2UtcGxhbi1uYW1lJyxcbiAgICAgIGF0dHI6IHsgcGxhY2Vob2xkZXI6ICdcdTY1QjlcdTY4NDhcdTU0MERcdTc5RjAnIH0sXG4gICAgfSk7XG4gICAgaW5wdXQudmFsdWUgPSB0aGlzLnBlbmRpbmdQbGFuTmFtZTtcbiAgICBpbnB1dC5vbmlucHV0ID0gKCkgPT4ge1xuICAgICAgdGhpcy5wZW5kaW5nUGxhbk5hbWUgPSBpbnB1dC52YWx1ZTtcbiAgICB9O1xuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gaW5wdXQuZm9jdXMoKSk7XG5cbiAgICBjb25zdCBhY3Rpb25zID0gbW9kYWwuY3JlYXRlRGl2KHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLWRpYWxvZy1hY3Rpb25zJyB9KTtcbiAgICBhY3Rpb25zLmFwcGVuZENoaWxkKGNyZWF0ZVRleHRCdXR0b24oJ1x1NEZERFx1NUI1OCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IHRoaXMuc2F2ZUN1cnJlbnRBc1BsYW4oaW5wdXQudmFsdWUpO1xuICAgICAgb3ZlcmxheS5yZW1vdmUoKTtcbiAgICB9LCB0aGlzLmdldEljb25TdmcoJ2NoZWNrLWNpcmNsZS5zdmcnKSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBvcGVuSGlzdG9yeSgpIHtcbiAgICBjb25zdCBvdmVybGF5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgb3ZlcmxheS5jbGFzc05hbWUgPSAnd2lzZW1pbmQtYnJpZGdlLWhpc3Rvcnktb3ZlcmxheSc7XG4gICAgY29uc3QgbW9kYWwgPSBvdmVybGF5LmNyZWF0ZURpdih7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1oaXN0b3J5LW1vZGFsJyB9KTtcbiAgICBjb25zdCBoZWFkZXIgPSBtb2RhbC5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtaGlzdG9yeS10aXRsZScgfSk7XG4gICAgaGVhZGVyLmNyZWF0ZUVsKCdoMicsIHsgdGV4dDogJ1x1NTQwQ1x1NkI2NVx1NTM4Nlx1NTNGMicgfSk7XG4gICAgaGVhZGVyLmFwcGVuZENoaWxkKGNyZWF0ZUljb25CdXR0b24oY3JlYXRlSW5saW5lSWNvbih0aGlzLmdldEljb25TdmcoJ3gtbWFyay5zdmcnKSwgJ1x1NTE3M1x1OTVFRCcpLCAnXHU1MTczXHU5NUVEJywgKCkgPT4gb3ZlcmxheS5yZW1vdmUoKSkpO1xuXG4gICAgbGV0IGFjdGl2ZURpcmVjdGlvbjogRGlyZWN0aW9uID0gJ3RvLXdpc2VtaW5kJztcbiAgICBsZXQgc2VhcmNoID0gJyc7XG4gICAgY29uc3QgdGFicyA9IG1vZGFsLmNyZWF0ZURpdih7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1kaXJlY3Rpb24tdGFicyB3aXNlbWluZC1icmlkZ2UtaGlzdG9yeS10YWJzJyB9KTtcbiAgICBjb25zdCBzZWFyY2hSb3cgPSBtb2RhbC5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtaGlzdG9yeS10b29scycgfSk7XG4gICAgY29uc3Qgc2VhcmNoSW5wdXQgPSBzZWFyY2hSb3cuY3JlYXRlRWwoJ2lucHV0Jywge1xuICAgICAgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLXNlYXJjaCcsXG4gICAgICBhdHRyOiB7IHBsYWNlaG9sZGVyOiAnXHU2NDFDXHU3RDIyXHU2NTg3XHU0RUY2XHUzMDAxXHU2NTg3XHU0RUY2XHU1OTM5XHU2MjE2XHU3NkVFXHU2ODA3JyB9LFxuICAgIH0pO1xuICAgIHNlYXJjaFJvdy5hcHBlbmRDaGlsZChjcmVhdGVUZXh0QnV0dG9uKCdcdTZFMDVcdTdBN0FcdTUzODZcdTUzRjInLCBhc3luYyAoKSA9PiB7XG4gICAgICBpZiAoIXdpbmRvdy5jb25maXJtKCdcdTc4NkVcdTVCOUFcdTZFMDVcdTdBN0FcdTYyNDBcdTY3MDlcdTU0MENcdTZCNjVcdTUzODZcdTUzRjJcdTU0MTdcdUZGMUYnKSkgcmV0dXJuO1xuICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc3luY0hpc3RvcnkgPSBbXTtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgcmVuZGVySGlzdG9yeSgpO1xuICAgICAgbmV3IE5vdGljZSgnXHU1NDBDXHU2QjY1XHU1Mzg2XHU1M0YyXHU1REYyXHU2RTA1XHU3QTdBJyk7XG4gICAgfSwgdGhpcy5nZXRJY29uU3ZnKCd0cmFzaC5zdmcnKSkpO1xuICAgIGNvbnN0IGxpc3QgPSBtb2RhbC5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtaGlzdG9yeS1saXN0LXdyYXAnIH0pO1xuXG4gICAgY29uc3QgcmVuZGVyVGFicyA9ICgpID0+IHtcbiAgICAgIHRhYnMuZW1wdHkoKTtcbiAgICAgIHRhYnMuYXBwZW5kKFxuICAgICAgICB0aGlzLnJlbmRlckhpc3RvcnlUYWIoJ3RvLXdpc2VtaW5kJywgJ09ic2lkaWFuIC0+IFdpc2VNaW5kQUknLCBhY3RpdmVEaXJlY3Rpb24sICgpID0+IHtcbiAgICAgICAgICBhY3RpdmVEaXJlY3Rpb24gPSAndG8td2lzZW1pbmQnO1xuICAgICAgICAgIHJlbmRlckhpc3RvcnkoKTtcbiAgICAgICAgfSksXG4gICAgICAgIHRoaXMucmVuZGVySGlzdG9yeVRhYigndG8tb2JzaWRpYW4nLCAnV2lzZU1pbmRBSSAtPiBPYnNpZGlhbicsIGFjdGl2ZURpcmVjdGlvbiwgKCkgPT4ge1xuICAgICAgICAgIGFjdGl2ZURpcmVjdGlvbiA9ICd0by1vYnNpZGlhbic7XG4gICAgICAgICAgcmVuZGVySGlzdG9yeSgpO1xuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgfTtcblxuICAgIGNvbnN0IHJlbmRlckhpc3RvcnkgPSAoKSA9PiB7XG4gICAgICByZW5kZXJUYWJzKCk7XG4gICAgICBsaXN0LmVtcHR5KCk7XG4gICAgICBjb25zdCBrZXl3b3JkID0gc2VhcmNoLnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgY29uc3QgaGlzdG9yeSA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5zeW5jSGlzdG9yeSB8fCBbXSlcbiAgICAgICAgLmZpbHRlcihpdGVtID0+IGl0ZW0uZGlyZWN0aW9uID09PSBhY3RpdmVEaXJlY3Rpb24pXG4gICAgICAgIC5maWx0ZXIoaXRlbSA9PiAha2V5d29yZCB8fCBbXG4gICAgICAgICAgaXRlbS5zb3VyY2VMYWJlbCxcbiAgICAgICAgICBpdGVtLnRhcmdldExhYmVsLFxuICAgICAgICAgIC4uLml0ZW0uc291cmNlRm9sZGVycyxcbiAgICAgICAgICAuLi5pdGVtLnRhcmdldEZvbGRlcnMsXG4gICAgICAgICAgLi4uaXRlbS5pdGVtVGl0bGVzLFxuICAgICAgICBdLmpvaW4oJyAnKS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGtleXdvcmQpKTtcblxuICAgICAgaWYgKCFoaXN0b3J5Lmxlbmd0aCkge1xuICAgICAgICBsaXN0LmFwcGVuZENoaWxkKHJlbmRlckVtcHR5KGtleXdvcmQgPyAnXHU2Q0ExXHU2NzA5XHU1MzM5XHU5MTREXHU3Njg0XHU1NDBDXHU2QjY1XHU1Mzg2XHU1M0YyXHUzMDAyJyA6ICdcdTY2ODJcdTY1RTBcdTU0MENcdTZCNjVcdThCQjBcdTVGNTVcdTMwMDInKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaGlzdG9yeS5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICBjb25zdCBjYXJkID0gbW9kYWwuY3JlYXRlRGl2KHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLWhpc3RvcnktY2FyZCcgfSk7XG4gICAgICAgIGNvbnN0IGNhcmRIZWFkZXIgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1oaXN0b3J5LWhlYWRlcicgfSk7XG4gICAgICAgIGNhcmRIZWFkZXIuY3JlYXRlRWwoJ3N0cm9uZycsIHtcbiAgICAgICAgICB0ZXh0OiBpdGVtLmRpcmVjdGlvbiA9PT0gJ3RvLXdpc2VtaW5kJyA/ICdPYnNpZGlhbiAtPiBXaXNlTWluZEFJJyA6ICdXaXNlTWluZEFJIC0+IE9ic2lkaWFuJyxcbiAgICAgICAgfSk7XG4gICAgICAgIGNhcmRIZWFkZXIuY3JlYXRlRWwoJ3NwYW4nLCB7IHRleHQ6IGZvcm1hdERhdGVUaW1lKGl0ZW0uY3JlYXRlZEF0KSB9KTtcbiAgICAgICAgY2FyZC5jcmVhdGVEaXYoe1xuICAgICAgICAgIGNsczogJ3dpc2VtaW5kLWJyaWRnZS1tdXRlZCcsXG4gICAgICAgICAgdGV4dDogYFx1NTIxQlx1NUVGQSAke2l0ZW0uY3JlYXRlZH1cdUZGMENcdTY2RjRcdTY1QjAgJHtpdGVtLnVwZGF0ZWR9XHVGRjBDXHU4REYzXHU4RkM3ICR7aXRlbS5za2lwcGVkfVx1RkYwQ1x1NTkzMVx1OEQyNSAke2l0ZW0uZmFpbGVkfWAsXG4gICAgICAgIH0pO1xuICAgICAgICByZW5kZXJIaXN0b3J5QmFkZ2VzKGNhcmQsICdcdTY3NjVcdTZFOTBcdTY1ODdcdTRFRjZcdTU5MzknLCBpdGVtLnNvdXJjZUZvbGRlcnMpO1xuICAgICAgICByZW5kZXJIaXN0b3J5QmFkZ2VzKGNhcmQsICdcdTc2RUVcdTY4MDdcdTRGNERcdTdGNkUnLCBpdGVtLnRhcmdldEZvbGRlcnMpO1xuICAgICAgICByZW5kZXJIaXN0b3J5QmFkZ2VzKGNhcmQsICdcdTY1ODdcdTRFRjZcdTU0MERcdTc5RjAnLCBpdGVtLml0ZW1UaXRsZXMpO1xuICAgICAgICBsaXN0LmFwcGVuZENoaWxkKGNhcmQpO1xuICAgICAgfSk7XG4gICAgfTtcbiAgICBzZWFyY2hJbnB1dC5vbmlucHV0ID0gKCkgPT4ge1xuICAgICAgc2VhcmNoID0gc2VhcmNoSW5wdXQudmFsdWU7XG4gICAgICByZW5kZXJIaXN0b3J5KCk7XG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgICAgc2VhcmNoSW5wdXQuZm9jdXMoKTtcbiAgICAgICAgc2VhcmNoSW5wdXQuc2V0U2VsZWN0aW9uUmFuZ2Uoc2VhcmNoLmxlbmd0aCwgc2VhcmNoLmxlbmd0aCk7XG4gICAgICB9KTtcbiAgICB9O1xuICAgIHJlbmRlckhpc3RvcnkoKTtcbiAgICBvdmVybGF5Lm9uY2xpY2sgPSBldmVudCA9PiB7XG4gICAgICBpZiAoZXZlbnQudGFyZ2V0ID09PSBvdmVybGF5KSBvdmVybGF5LnJlbW92ZSgpO1xuICAgIH07XG4gICAgdGhpcy5jb250ZW50RWwuYXBwZW5kQ2hpbGQob3ZlcmxheSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckhpc3RvcnlUYWIoZGlyZWN0aW9uOiBEaXJlY3Rpb24sIHRleHQ6IHN0cmluZywgYWN0aXZlRGlyZWN0aW9uOiBEaXJlY3Rpb24sIG9uQ2xpY2s6ICgpID0+IHZvaWQpIHtcbiAgICBjb25zdCBidXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcbiAgICBidXR0b24uY2xhc3NOYW1lID0gYHdpc2VtaW5kLWJyaWRnZS10YWIke2FjdGl2ZURpcmVjdGlvbiA9PT0gZGlyZWN0aW9uID8gJyBpcy1hY3RpdmUnIDogJyd9YDtcbiAgICBidXR0b24udGV4dENvbnRlbnQgPSB0ZXh0O1xuICAgIGJ1dHRvbi5vbmNsaWNrID0gb25DbGljaztcbiAgICByZXR1cm4gYnV0dG9uO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJGbG93KCkge1xuICAgIGlmICghdGhpcy5mbG93RWwpIHJldHVybjtcbiAgICB0aGlzLmZsb3dFbC5lbXB0eSgpO1xuICAgIGlmICh0aGlzLmRpcmVjdGlvbiA9PT0gJ3RvLXdpc2VtaW5kJykge1xuICAgICAgdGhpcy5yZW5kZXJPYnNpZGlhblRvV2lzZU1pbmRGbG93KHRoaXMuZmxvd0VsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yZW5kZXJXaXNlTWluZFRvT2JzaWRpYW5GbG93KHRoaXMuZmxvd0VsKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlbmRlck9ic2lkaWFuVG9XaXNlTWluZEZsb3cocGFyZW50OiBIVE1MRWxlbWVudCkge1xuICAgIGNvbnN0IHNvdXJjZVBhbmVsID0gcmVuZGVyUGFuZWwoe1xuICAgICAgdGl0bGU6ICdPYnNpZGlhbiBcdTVGNTNcdTUyNERcdTRFRDNcdTVFOTMnLFxuICAgICAgZGVzYzogJ1x1OTAwOVx1NjJFOVx1ODk4MVx1NTNEMVx1OTAwMVx1NzY4NCBNYXJrZG93bicsXG4gICAgICBjb3VudFRleHQ6IGBcdTVERjJcdTkwMDkgJHt0aGlzLnNlbGVjdGVkT2JzaWRpYW4uc2l6ZX0gXHU3QkM3YCxcbiAgICAgIHNlYXJjaFZhbHVlOiB0aGlzLnNlYXJjaGVzLm9ic2lkaWFuU291cmNlLFxuICAgICAgc2VhcmNoUGxhY2Vob2xkZXI6ICdcdTY0MUNcdTdEMjJcdTY1ODdcdTRFRjZcdTU5MzlcdTYyMTZcdTdCMTRcdThCQjAnLFxuICAgICAgYWxsU2VsZWN0ZWQ6IHRoaXMuZ2V0RmlsdGVyZWRPYnNpZGlhbktleXMoKS5ldmVyeShrZXkgPT4gdGhpcy5zZWxlY3RlZE9ic2lkaWFuLmhhcyhrZXkpKSAmJiB0aGlzLmdldEZpbHRlcmVkT2JzaWRpYW5LZXlzKCkubGVuZ3RoID4gMCxcbiAgICAgIG9uVG9nZ2xlQWxsOiAoKSA9PiB0aGlzLnRvZ2dsZU9ic2lkaWFuU291cmNlQWxsKCksXG4gICAgICBvblNlYXJjaDogdmFsdWUgPT4ge1xuICAgICAgICB0aGlzLnNlYXJjaGVzLm9ic2lkaWFuU291cmNlID0gdmFsdWU7XG4gICAgICAgIHRoaXMucmVuZGVyRmxvdygpO1xuICAgICAgICB0aGlzLmZvY3VzU2VhcmNoKCdcdTY0MUNcdTdEMjJcdTY1ODdcdTRFRjZcdTU5MzlcdTYyMTZcdTdCMTRcdThCQjAnLCB2YWx1ZS5sZW5ndGgpO1xuICAgICAgfSxcbiAgICB9KTtcbiAgICBjb25zdCBzb3VyY2VMaXN0ID0gc291cmNlUGFuZWwuY3JlYXRlRGl2KHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLWxpc3QnIH0pO1xuICAgIGNvbnN0IG9ic2lkaWFuR3JvdXBzID0gdGhpcy5nZXRGaWx0ZXJlZE9ic2lkaWFuR3JvdXBzKCk7XG4gICAgb2JzaWRpYW5Hcm91cHMuZm9yRWFjaChncm91cCA9PiB7XG4gICAgICBzb3VyY2VMaXN0LmFwcGVuZENoaWxkKHRoaXMucmVuZGVyVHJlZUdyb3VwKHtcbiAgICAgICAgZ3JvdXAsXG4gICAgICAgIHNlbGVjdGVkOiB0aGlzLnNlbGVjdGVkT2JzaWRpYW4sXG4gICAgICAgIGtleU9mOiBpdGVtID0+IGl0ZW0ucGF0aCxcbiAgICAgICAgdGl0bGVPZjogaXRlbSA9PiBpdGVtLnRpdGxlLFxuICAgICAgICBtZXRhT2Y6IGl0ZW0gPT4gaXRlbS5wYXRoLFxuICAgICAgICBzaG93QWN0aW9uczogZmFsc2UsXG4gICAgICAgIG9uUmVuZGVyOiAoKSA9PiB7XG4gICAgICAgICAgdGhpcy5yZW5kZXJGbG93UHJlc2VydmluZ1Njcm9sbCgpO1xuICAgICAgICAgIHRoaXMucmVuZGVyVG9vbGJhcigpO1xuICAgICAgICB9LFxuICAgICAgfSkpO1xuICAgIH0pO1xuICAgIGlmICghb2JzaWRpYW5Hcm91cHMubGVuZ3RoKSB7XG4gICAgICBzb3VyY2VMaXN0LmFwcGVuZENoaWxkKHJlbmRlckVtcHR5KHRoaXMub2JzaWRpYW5JdGVtcy5sZW5ndGggPyAnXHU2Q0ExXHU2NzA5XHU1MzM5XHU5MTREXHU3Njg0XHU3QjE0XHU4QkIwXHUzMDAyJyA6ICdcdTVGNTNcdTUyNEQgT2JzaWRpYW4gXHU0RUQzXHU1RTkzXHU5MUNDXHU2Q0ExXHU2NzA5XHU1M0VGXHU1NDBDXHU2QjY1XHU3Njg0IE1hcmtkb3duIFx1N0IxNFx1OEJCMFx1MzAwMicpKTtcbiAgICB9XG5cbiAgICBjb25zdCB0YXJnZXRQYW5lbCA9IHJlbmRlclBhbmVsKHtcbiAgICAgIHRpdGxlOiAnXHU0RkREXHU1QjU4XHU1MjMwIFdpc2VNaW5kQUknLFxuICAgICAgZGVzYzogJ1x1OTAwOVx1NjJFOVx1NzZFRVx1NjgwN1x1NjU4N1x1NEVGNlx1NTkzOVx1NjIxNlx1NzdFNVx1OEJDNlx1NUU5MycsXG4gICAgICBjb3VudFRleHQ6IGBcdTVERjJcdTkwMDkgJHt0aGlzLnNlbGVjdGVkV2lzZU1pbmREZXN0aW5hdGlvbnMuc2l6ZX0gXHU0RTJBXHU3NkVFXHU2ODA3YCxcbiAgICAgIHNlYXJjaFZhbHVlOiB0aGlzLnNlYXJjaGVzLndpc2VNaW5kVGFyZ2V0LFxuICAgICAgc2VhcmNoUGxhY2Vob2xkZXI6ICdcdTY0MUNcdTdEMjJcdTc2RUVcdTY4MDcnLFxuICAgICAgYWxsU2VsZWN0ZWQ6IHRoaXMuZ2V0RmlsdGVyZWREZXN0aW5hdGlvbktleXMoKS5ldmVyeShrZXkgPT4gdGhpcy5zZWxlY3RlZFdpc2VNaW5kRGVzdGluYXRpb25zLmhhcyhrZXkpKSAmJiB0aGlzLmdldEZpbHRlcmVkRGVzdGluYXRpb25LZXlzKCkubGVuZ3RoID4gMCxcbiAgICAgIG9uVG9nZ2xlQWxsOiB0aGlzLndpc2VNaW5kQ29ubmVjdGlvbkVycm9yID8gdW5kZWZpbmVkIDogKCkgPT4gdGhpcy50b2dnbGVXaXNlTWluZFRhcmdldEFsbCgpLFxuICAgICAgb25TZWFyY2g6IHZhbHVlID0+IHtcbiAgICAgICAgdGhpcy5zZWFyY2hlcy53aXNlTWluZFRhcmdldCA9IHZhbHVlO1xuICAgICAgICB0aGlzLnJlbmRlckZsb3coKTtcbiAgICAgICAgdGhpcy5mb2N1c1NlYXJjaCgnXHU2NDFDXHU3RDIyXHU3NkVFXHU2ODA3JywgdmFsdWUubGVuZ3RoKTtcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgY29uc3QgdGFyZ2V0TGlzdCA9IHRhcmdldFBhbmVsLmNyZWF0ZURpdih7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1saXN0JyB9KTtcbiAgICBpZiAodGhpcy53aXNlTWluZENvbm5lY3Rpb25FcnJvcikge1xuICAgICAgdGFyZ2V0TGlzdC5hcHBlbmRDaGlsZChyZW5kZXJXaXNlTWluZENvbm5lY3Rpb25FbXB0eSh0aGlzLndpc2VNaW5kQ29ubmVjdGlvbkVycm9yLCAoKSA9PiB2b2lkIHRoaXMucmVmcmVzaCh0cnVlKSwgdGhpcy5nZXRJY29uU3ZnKCdhcnJvdy1wYXRoLnN2ZycpKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGRlc3RpbmF0aW9uR3JvdXBzID0gdGhpcy5nZXRGaWx0ZXJlZERlc3RpbmF0aW9uR3JvdXBzKCk7XG4gICAgICBkZXN0aW5hdGlvbkdyb3Vwcy5mb3JFYWNoKGdyb3VwID0+IHtcbiAgICAgICAgdGFyZ2V0TGlzdC5hcHBlbmRDaGlsZCh0aGlzLnJlbmRlckRlc3RpbmF0aW9uR3JvdXAoZ3JvdXApKTtcbiAgICAgIH0pO1xuICAgICAgaWYgKCFkZXN0aW5hdGlvbkdyb3Vwcy5sZW5ndGgpIHRhcmdldExpc3QuYXBwZW5kQ2hpbGQocmVuZGVyRW1wdHkoJ1x1NkNBMVx1NjcwOVx1NTNFRlx1NEZERFx1NUI1OFx1NzY4NFx1NEY0RFx1N0Y2RVx1RkYwQ1x1OEJGN1x1NTE0OFx1NTcyOCBXaXNlTWluZEFJIFx1NTIxQlx1NUVGQVx1NjU4N1x1Njg2M1x1NjU4N1x1NEVGNlx1NTkzOVx1MzAwMVx1N0IxNFx1OEJCMFx1NjU4N1x1NEVGNlx1NTkzOVx1NjIxNlx1NzdFNVx1OEJDNlx1NUU5M1x1MzAwMicpKTtcbiAgICB9XG5cbiAgICBwYXJlbnQuYXBwZW5kKHNvdXJjZVBhbmVsLCByZW5kZXJBcnJvdyh0aGlzLmdldEljb25TdmcoJ3RvLXJpZ2h0LnN2ZycpKSwgdGFyZ2V0UGFuZWwsIHRoaXMucmVuZGVyRXhlY3V0ZUFyZWEoKSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlcldpc2VNaW5kVG9PYnNpZGlhbkZsb3cocGFyZW50OiBIVE1MRWxlbWVudCkge1xuICAgIGNvbnN0IHNvdXJjZVBhbmVsID0gcmVuZGVyUGFuZWwoe1xuICAgICAgdGl0bGU6ICdXaXNlTWluZEFJIFx1NjcyQ1x1NTczMFx1NjU3MFx1NjM2RScsXG4gICAgICBkZXNjOiAnXHU5MDA5XHU2MkU5XHU4OTgxXHU1MTk5XHU1NkRFXHU3Njg0XHU1MTg1XHU1QkI5JyxcbiAgICAgIGNvdW50VGV4dDogYFx1NURGMlx1OTAwOSAke3RoaXMuZ2V0U2VsZWN0ZWRXaXNlTWluZEZvckFjdGl2ZUNhdGVnb3J5KCkubGVuZ3RofSBcdTRFMkFgLFxuICAgICAgc2VhcmNoVmFsdWU6IHRoaXMuc2VhcmNoZXMud2lzZU1pbmRTb3VyY2UsXG4gICAgICBzZWFyY2hQbGFjZWhvbGRlcjogJ1x1NjQxQ1x1N0QyMlx1NTE4NVx1NUJCOScsXG4gICAgICBhbGxTZWxlY3RlZDogdGhpcy5nZXRGaWx0ZXJlZFdpc2VNaW5kU291cmNlS2V5cygpLmV2ZXJ5KGtleSA9PiB0aGlzLnNlbGVjdGVkV2lzZU1pbmQuaGFzKGtleSkpICYmIHRoaXMuZ2V0RmlsdGVyZWRXaXNlTWluZFNvdXJjZUtleXMoKS5sZW5ndGggPiAwLFxuICAgICAgb25Ub2dnbGVBbGw6IHRoaXMud2lzZU1pbmRDb25uZWN0aW9uRXJyb3IgPyB1bmRlZmluZWQgOiAoKSA9PiB0aGlzLnRvZ2dsZVdpc2VNaW5kU291cmNlQWxsKCksXG4gICAgICBvblNlYXJjaDogdmFsdWUgPT4ge1xuICAgICAgICB0aGlzLnNlYXJjaGVzLndpc2VNaW5kU291cmNlID0gdmFsdWU7XG4gICAgICAgIHRoaXMucmVuZGVyRmxvdygpO1xuICAgICAgICB0aGlzLmZvY3VzU2VhcmNoKCdcdTY0MUNcdTdEMjJcdTUxODVcdTVCQjknLCB2YWx1ZS5sZW5ndGgpO1xuICAgICAgfSxcbiAgICB9KTtcbiAgICBzb3VyY2VQYW5lbC5hcHBlbmRDaGlsZCh0aGlzLnJlbmRlcldpc2VNaW5kQ2F0ZWdvcnlUYWJzKCkpO1xuICAgIGNvbnN0IHNvdXJjZUxpc3QgPSBzb3VyY2VQYW5lbC5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtbGlzdCcgfSk7XG4gICAgY29uc3QgZ3JvdXBzID0gdGhpcy5nZXRGaWx0ZXJlZFdpc2VNaW5kU291cmNlR3JvdXBzKCk7XG4gICAgaWYgKHRoaXMud2lzZU1pbmRDb25uZWN0aW9uRXJyb3IpIHtcbiAgICAgIHNvdXJjZUxpc3QuYXBwZW5kQ2hpbGQocmVuZGVyV2lzZU1pbmRDb25uZWN0aW9uRW1wdHkodGhpcy53aXNlTWluZENvbm5lY3Rpb25FcnJvciwgKCkgPT4gdm9pZCB0aGlzLnJlZnJlc2godHJ1ZSksIHRoaXMuZ2V0SWNvblN2ZygnYXJyb3ctcGF0aC5zdmcnKSkpO1xuICAgIH0gZWxzZSBpZiAoIWdyb3Vwcy5sZW5ndGgpIHtcbiAgICAgIHNvdXJjZUxpc3QuYXBwZW5kQ2hpbGQocmVuZGVyRW1wdHkodGhpcy5zZWFyY2hlcy53aXNlTWluZFNvdXJjZSA/ICdcdTZDQTFcdTY3MDlcdTUzMzlcdTkxNERcdTc2ODQgV2lzZU1pbmRBSSBcdTUxODVcdTVCQjlcdTMwMDInIDogJ1x1NUY1M1x1NTI0RFx1NTIwNlx1N0M3Qlx1NkNBMVx1NjcwOVx1NTNFRlx1NTQwQ1x1NkI2NVx1NzY4NCBNYXJrZG93biBcdTUxODVcdTVCQjlcdTMwMDInKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGdyb3Vwcy5mb3JFYWNoKGdyb3VwID0+IHtcbiAgICAgICAgc291cmNlTGlzdC5hcHBlbmRDaGlsZCh0aGlzLnJlbmRlclRyZWVHcm91cCh7XG4gICAgICAgICAgZ3JvdXAsXG4gICAgICAgICAgc2VsZWN0ZWQ6IHRoaXMuc2VsZWN0ZWRXaXNlTWluZCxcbiAgICAgICAgICBrZXlPZjogc291cmNlS2V5LFxuICAgICAgICAgIHRpdGxlT2Y6IGl0ZW0gPT4gaXRlbS50aXRsZSxcbiAgICAgICAgICBtZXRhT2Y6IGl0ZW0gPT4gaXRlbS5zb3VyY2VUeXBlID09PSAna25vd2xlZGdlLWRvY3VtZW50JyA/IGl0ZW0ua25vd2xlZGdlQmFzZU5hbWUgfHwgJ1x1NzdFNVx1OEJDNlx1NUU5MycgOiBzb3VyY2VUeXBlTGFiZWwoaXRlbS5zb3VyY2VUeXBlKSxcbiAgICAgICAgICBzaG93QWN0aW9uczogZmFsc2UsXG4gICAgICAgICAgb25SZW5kZXI6ICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyRmxvd1ByZXNlcnZpbmdTY3JvbGwoKTtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyVG9vbGJhcigpO1xuICAgICAgICAgIH0sXG4gICAgICAgIH0pKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IHRhcmdldFBhbmVsID0gcmVuZGVyUGFuZWwoe1xuICAgICAgdGl0bGU6ICdcdTUxOTlcdTUxNjUgT2JzaWRpYW4nLFxuICAgICAgZGVzYzogJ1x1OTAwOVx1NjJFOVx1NzZFRVx1NjgwN1x1NjU4N1x1NEVGNlx1NTkzOScsXG4gICAgICBjb3VudFRleHQ6IGBcdTVERjJcdTkwMDkgJHt0aGlzLnNlbGVjdGVkT2JzaWRpYW5UYXJnZXRGb2xkZXJzLnNpemV9IFx1NEUyQVx1NjU4N1x1NEVGNlx1NTkzOWAsXG4gICAgICBzZWFyY2hWYWx1ZTogdGhpcy5zZWFyY2hlcy5vYnNpZGlhblRhcmdldCxcbiAgICAgIHNlYXJjaFBsYWNlaG9sZGVyOiAnXHU2NDFDXHU3RDIyIE9ic2lkaWFuIFx1NjU4N1x1NEVGNlx1NTkzOScsXG4gICAgICBhbGxTZWxlY3RlZDogdGhpcy5nZXRGaWx0ZXJlZE9ic2lkaWFuVGFyZ2V0Rm9sZGVycygpLmV2ZXJ5KGZvbGRlciA9PiB0aGlzLnNlbGVjdGVkT2JzaWRpYW5UYXJnZXRGb2xkZXJzLmhhcyhmb2xkZXIpKSAmJiB0aGlzLmdldEZpbHRlcmVkT2JzaWRpYW5UYXJnZXRGb2xkZXJzKCkubGVuZ3RoID4gMCxcbiAgICAgIG9uVG9nZ2xlQWxsOiAoKSA9PiB0aGlzLnRvZ2dsZU9ic2lkaWFuVGFyZ2V0QWxsKCksXG4gICAgICBvblNlYXJjaDogdmFsdWUgPT4ge1xuICAgICAgICB0aGlzLnNlYXJjaGVzLm9ic2lkaWFuVGFyZ2V0ID0gdmFsdWU7XG4gICAgICAgIHRoaXMucmVuZGVyRmxvdygpO1xuICAgICAgICB0aGlzLmZvY3VzU2VhcmNoKCdcdTY0MUNcdTdEMjIgT2JzaWRpYW4gXHU2NTg3XHU0RUY2XHU1OTM5JywgdmFsdWUubGVuZ3RoKTtcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgY29uc3QgdGFyZ2V0TGlzdCA9IHRhcmdldFBhbmVsLmNyZWF0ZURpdih7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1saXN0IHdpc2VtaW5kLWJyaWRnZS1saXN0LXRvLW9ic2lkaWFuJyB9KTtcbiAgICBjb25zdCBjcmVhdGVSb3cgPSB0YXJnZXRMaXN0LmNyZWF0ZURpdih7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1jcmVhdGUtZm9sZGVyJyB9KTtcbiAgICBjb25zdCBpbnB1dCA9IGNyZWF0ZVJvdy5jcmVhdGVFbCgnaW5wdXQnLCB7XG4gICAgICBjbHM6ICd3aXNlbWluZC1icmlkZ2Utc2VhcmNoJyxcbiAgICAgIGF0dHI6IHsgcGxhY2Vob2xkZXI6ICdcdTY1QjBcdTVFRkFcdTY1ODdcdTRFRjZcdTU5MzlcdTU0MERcdTc5RjAnIH0sXG4gICAgfSk7XG4gICAgY3JlYXRlUm93LmFwcGVuZENoaWxkKGNyZWF0ZVRleHRCdXR0b24oJ1x1NTIxQlx1NUVGQScsICgpID0+IHZvaWQgdGhpcy5jcmVhdGVPYnNpZGlhblRhcmdldEZvbGRlcihpbnB1dC52YWx1ZSksIHRoaXMuZ2V0SWNvblN2ZygncGx1cy5zdmcnKSkpO1xuICAgIGNvbnN0IGZvbGRlcnMgPSB0aGlzLmdldEZpbHRlcmVkT2JzaWRpYW5UYXJnZXRGb2xkZXJzKCk7XG4gICAgZm9sZGVycy5mb3JFYWNoKGZvbGRlciA9PiB7XG4gICAgICB0YXJnZXRMaXN0LmFwcGVuZENoaWxkKHJlbmRlckNoZWNrUm93KHtcbiAgICAgICAgY2hlY2tlZDogdGhpcy5zZWxlY3RlZE9ic2lkaWFuVGFyZ2V0Rm9sZGVycy5oYXMoZm9sZGVyKSxcbiAgICAgICAgdGl0bGU6IGZvbGRlciB8fCAnXHU2ODM5XHU3NkVFXHU1RjU1JyxcbiAgICAgICAgbWV0YTogZm9sZGVyID8gJ1x1NjU4N1x1NEVGNlx1NTkzOScgOiAnXHU0RUQzXHU1RTkzXHU2ODM5XHU3NkVFXHU1RjU1JyxcbiAgICAgICAgb25DaGFuZ2U6IGNoZWNrZWQgPT4ge1xuICAgICAgICAgIHRvZ2dsZVNldCh0aGlzLnNlbGVjdGVkT2JzaWRpYW5UYXJnZXRGb2xkZXJzLCBmb2xkZXIsIGNoZWNrZWQpO1xuICAgICAgICAgIHRoaXMucmVuZGVyRmxvd1ByZXNlcnZpbmdTY3JvbGwoKTtcbiAgICAgICAgICB0aGlzLnJlbmRlclRvb2xiYXIoKTtcbiAgICAgICAgfSxcbiAgICAgIH0pKTtcbiAgICB9KTtcbiAgICBpZiAoIWZvbGRlcnMubGVuZ3RoKSB0YXJnZXRMaXN0LmFwcGVuZENoaWxkKHJlbmRlckVtcHR5KCdcdTZDQTFcdTY3MDlcdTUzMzlcdTkxNERcdTc2ODRcdTY1ODdcdTRFRjZcdTU5MzlcdTMwMDInKSk7XG5cbiAgICBwYXJlbnQuYXBwZW5kKHNvdXJjZVBhbmVsLCByZW5kZXJBcnJvdyh0aGlzLmdldEljb25TdmcoJ3RvLXJpZ2h0LnN2ZycpKSwgdGFyZ2V0UGFuZWwsIHRoaXMucmVuZGVyRXhlY3V0ZUFyZWEoKSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlcldpc2VNaW5kQ2F0ZWdvcnlUYWJzKCkge1xuICAgIGNvbnN0IHRhYnMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0YWJzLmNsYXNzTmFtZSA9ICd3aXNlbWluZC1icmlkZ2UtY2F0ZWdvcnktdGFicyc7XG4gICAgY29uc3QgaXRlbXM6IEFycmF5PHsgdmFsdWU6IFdpc2VNaW5kQ2F0ZWdvcnk7IGxhYmVsOiBzdHJpbmcgfT4gPSBbXG4gICAgICB7IHZhbHVlOiAnZG9jdW1lbnRzJywgbGFiZWw6ICdcdTY1ODdcdTY4NjMnIH0sXG4gICAgICB7IHZhbHVlOiAna25vd2xlZGdlJywgbGFiZWw6ICdcdTc3RTVcdThCQzZcdTVFOTMnIH0sXG4gICAgICB7IHZhbHVlOiAnbm90ZXMnLCBsYWJlbDogJ1x1N0IxNFx1OEJCMCcgfSxcbiAgICBdO1xuICAgIGl0ZW1zLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICBjb25zdCBidXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcbiAgICAgIGJ1dHRvbi5jbGFzc05hbWUgPSBgd2lzZW1pbmQtYnJpZGdlLWNhdGVnb3J5LXRhYiR7dGhpcy5hY3RpdmVXaXNlTWluZENhdGVnb3J5ID09PSBpdGVtLnZhbHVlID8gJyBpcy1hY3RpdmUnIDogJyd9YDtcbiAgICAgIGJ1dHRvbi5hcHBlbmQoY3JlYXRlSW5saW5lSWNvbih0aGlzLmdldEljb25TdmcoY2F0ZWdvcnlJY29uKGl0ZW0udmFsdWUpKSwgaXRlbS5sYWJlbCksIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGl0ZW0ubGFiZWwpKTtcbiAgICAgIGJ1dHRvbi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICB0aGlzLmFjdGl2ZVdpc2VNaW5kQ2F0ZWdvcnkgPSBpdGVtLnZhbHVlO1xuICAgICAgICB0aGlzLnNlYXJjaGVzLndpc2VNaW5kU291cmNlID0gJyc7XG4gICAgICAgIHRoaXMucmVuZGVyRHluYW1pYygpO1xuICAgICAgfTtcbiAgICAgIHRhYnMuYXBwZW5kQ2hpbGQoYnV0dG9uKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGFicztcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyVHJlZUdyb3VwPFQ+KHBhcmFtczoge1xuICAgIGdyb3VwOiBUcmVlR3JvdXA8VD47XG4gICAgc2VsZWN0ZWQ6IFNldDxzdHJpbmc+O1xuICAgIGtleU9mOiAoaXRlbTogVCkgPT4gc3RyaW5nO1xuICAgIHRpdGxlT2Y6IChpdGVtOiBUKSA9PiBzdHJpbmc7XG4gICAgbWV0YU9mOiAoaXRlbTogVCkgPT4gc3RyaW5nO1xuICAgIHNob3dBY3Rpb25zPzogYm9vbGVhbjtcbiAgICBvblJlbmRlcjogKCkgPT4gdm9pZDtcbiAgfSkge1xuICAgIGNvbnN0IHdyYXBwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB3cmFwcGVyLmNsYXNzTmFtZSA9ICd3aXNlbWluZC1icmlkZ2UtdHJlZS1ncm91cCc7XG4gICAgY29uc3QgZXhwYW5kZWQgPSB0aGlzLmV4cGFuZGVkR3JvdXBzLmhhcyhwYXJhbXMuZ3JvdXAuaWQpO1xuICAgIGNvbnN0IGdyb3VwS2V5cyA9IHBhcmFtcy5ncm91cC5pdGVtcy5tYXAocGFyYW1zLmtleU9mKTtcbiAgICBjb25zdCBzZWxlY3RlZENvdW50ID0gZ3JvdXBLZXlzLmZpbHRlcihrZXkgPT4gcGFyYW1zLnNlbGVjdGVkLmhhcyhrZXkpKS5sZW5ndGg7XG4gICAgY29uc3QgYWxsU2VsZWN0ZWQgPSBzZWxlY3RlZENvdW50ID09PSBncm91cEtleXMubGVuZ3RoICYmIGdyb3VwS2V5cy5sZW5ndGggPiAwO1xuXG4gICAgY29uc3QgaGVhZGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgaGVhZGVyLmNsYXNzTmFtZSA9ICd3aXNlbWluZC1icmlkZ2UtdHJlZS1oZWFkZXInO1xuXG4gICAgY29uc3QgZXhwYW5kQnV0dG9uID0gY3JlYXRlSWNvbkJ1dHRvbihcbiAgICAgIGNyZWF0ZUlubGluZUljb24oZXhwYW5kZWQgPyB0aGlzLmdldEljb25TdmcoJ2NoZXZyb24tZG93bi5zdmcnKSA6IHRoaXMuZ2V0SWNvblN2ZygnY2hldnJvbi1yaWdodC5zdmcnKSwgZXhwYW5kZWQgPyAnXHU2NTM2XHU4RDc3JyA6ICdcdTVDNTVcdTVGMDAnKSxcbiAgICAgIGV4cGFuZGVkID8gJ1x1NjUzNlx1OEQ3NycgOiAnXHU1QzU1XHU1RjAwJyxcbiAgICAgICgpID0+IHtcbiAgICAgIGlmIChleHBhbmRlZCkgdGhpcy5leHBhbmRlZEdyb3Vwcy5kZWxldGUocGFyYW1zLmdyb3VwLmlkKTtcbiAgICAgIGVsc2UgdGhpcy5leHBhbmRlZEdyb3Vwcy5hZGQocGFyYW1zLmdyb3VwLmlkKTtcbiAgICAgIHBhcmFtcy5vblJlbmRlcigpO1xuICAgICAgfSk7XG5cbiAgICBjb25zdCBjaGVja2JveCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgY2hlY2tib3gudHlwZSA9ICdjaGVja2JveCc7XG4gICAgY2hlY2tib3guY2hlY2tlZCA9IGFsbFNlbGVjdGVkO1xuICAgIGNoZWNrYm94LmluZGV0ZXJtaW5hdGUgPSBzZWxlY3RlZENvdW50ID4gMCAmJiAhYWxsU2VsZWN0ZWQ7XG4gICAgY2hlY2tib3gub25jaGFuZ2UgPSAoKSA9PiB7XG4gICAgICBncm91cEtleXMuZm9yRWFjaChrZXkgPT4gdG9nZ2xlU2V0KHBhcmFtcy5zZWxlY3RlZCwga2V5LCBjaGVja2JveC5jaGVja2VkKSk7XG4gICAgICBwYXJhbXMub25SZW5kZXIoKTtcbiAgICB9O1xuXG4gICAgY29uc3QgdGl0bGVXcmFwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGl0bGVXcmFwLmNsYXNzTmFtZSA9ICd3aXNlbWluZC1icmlkZ2UtdHJlZS10aXRsZSc7XG4gICAgdGl0bGVXcmFwLmNyZWF0ZUVsKCdzdHJvbmcnLCB7IHRleHQ6IHBhcmFtcy5ncm91cC50aXRsZSB9KTtcbiAgICBjb25zdCBjb3VudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICBjb3VudC5jbGFzc05hbWUgPSAnd2lzZW1pbmQtYnJpZGdlLW11dGVkIHdpc2VtaW5kLWJyaWRnZS10cmVlLWNvdW50JztcbiAgICBjb3VudC50ZXh0Q29udGVudCA9IGBcdTVERjJcdTkwMDkgJHtzZWxlY3RlZENvdW50fS8ke2dyb3VwS2V5cy5sZW5ndGh9YDtcblxuICAgIGhlYWRlci5hcHBlbmQoZXhwYW5kQnV0dG9uLCBjaGVja2JveCwgdGl0bGVXcmFwLCBjb3VudCk7XG4gICAgaWYgKHBhcmFtcy5zaG93QWN0aW9ucyAhPT0gZmFsc2UpIHtcbiAgICAgIGNvbnN0IGdyb3VwQWN0aW9ucyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgZ3JvdXBBY3Rpb25zLmNsYXNzTmFtZSA9ICd3aXNlbWluZC1icmlkZ2UtZ3JvdXAtYWN0aW9ucyc7XG4gICAgICBncm91cEFjdGlvbnMuYXBwZW5kKFxuICAgICAgICBjcmVhdGVUZXh0QnV0dG9uKCdcdTUxNjhcdTkwMDknLCAoKSA9PiB7XG4gICAgICAgICAgZ3JvdXBLZXlzLmZvckVhY2goa2V5ID0+IHBhcmFtcy5zZWxlY3RlZC5hZGQoa2V5KSk7XG4gICAgICAgICAgcGFyYW1zLm9uUmVuZGVyKCk7XG4gICAgICAgIH0pLFxuICAgICAgICBjcmVhdGVUZXh0QnV0dG9uKCdcdTUzRDZcdTZEODgnLCAoKSA9PiB7XG4gICAgICAgICAgZ3JvdXBLZXlzLmZvckVhY2goa2V5ID0+IHBhcmFtcy5zZWxlY3RlZC5kZWxldGUoa2V5KSk7XG4gICAgICAgICAgcGFyYW1zLm9uUmVuZGVyKCk7XG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICAgIGhlYWRlci5hcHBlbmRDaGlsZChncm91cEFjdGlvbnMpO1xuICAgIH1cbiAgICB3cmFwcGVyLmFwcGVuZENoaWxkKGhlYWRlcik7XG5cbiAgICBpZiAoZXhwYW5kZWQpIHtcbiAgICAgIGNvbnN0IGNoaWxkcmVuID0gd3JhcHBlci5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtdHJlZS1jaGlsZHJlbicgfSk7XG4gICAgICBpZiAoIXBhcmFtcy5ncm91cC5pdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgY2hpbGRyZW4uYXBwZW5kQ2hpbGQocmVuZGVyRW1wdHkocGFyYW1zLmdyb3VwLmVtcHR5VGV4dCB8fCAnXHU2Q0ExXHU2NzA5XHU1M0VGXHU5MDA5XHU1MTg1XHU1QkI5XHUzMDAyJykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyYW1zLmdyb3VwLml0ZW1zLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgY29uc3Qga2V5ID0gcGFyYW1zLmtleU9mKGl0ZW0pO1xuICAgICAgICAgIGNoaWxkcmVuLmFwcGVuZENoaWxkKHJlbmRlckNoZWNrUm93KHtcbiAgICAgICAgICAgIGNoZWNrZWQ6IHBhcmFtcy5zZWxlY3RlZC5oYXMoa2V5KSxcbiAgICAgICAgICAgIHRpdGxlOiBwYXJhbXMudGl0bGVPZihpdGVtKSxcbiAgICAgICAgICAgIG1ldGE6IHBhcmFtcy5tZXRhT2YoaXRlbSksXG4gICAgICAgICAgICBvbkNoYW5nZTogY2hlY2tlZCA9PiB7XG4gICAgICAgICAgICAgIHRvZ2dsZVNldChwYXJhbXMuc2VsZWN0ZWQsIGtleSwgY2hlY2tlZCk7XG4gICAgICAgICAgICAgIHBhcmFtcy5vblJlbmRlcigpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB3cmFwcGVyO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJEZXN0aW5hdGlvbkdyb3VwKGdyb3VwOiBEZXN0aW5hdGlvbkdyb3VwKSB7XG4gICAgY29uc3Qgd3JhcHBlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHdyYXBwZXIuY2xhc3NOYW1lID0gJ3dpc2VtaW5kLWJyaWRnZS10cmVlLWdyb3VwJztcbiAgICBjb25zdCBleHBhbmRlZCA9IHRoaXMuZXhwYW5kZWRHcm91cHMuaGFzKGdyb3VwLmlkKTtcblxuICAgIGNvbnN0IGhlYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGhlYWRlci5jbGFzc05hbWUgPSAnd2lzZW1pbmQtYnJpZGdlLXRyZWUtaGVhZGVyJztcblxuICAgIGNvbnN0IGV4cGFuZEJ1dHRvbiA9IGNyZWF0ZUljb25CdXR0b24oXG4gICAgICBjcmVhdGVJbmxpbmVJY29uKGV4cGFuZGVkID8gdGhpcy5nZXRJY29uU3ZnKCdjaGV2cm9uLWRvd24uc3ZnJykgOiB0aGlzLmdldEljb25TdmcoJ2NoZXZyb24tcmlnaHQuc3ZnJyksIGV4cGFuZGVkID8gJ1x1NjUzNlx1OEQ3NycgOiAnXHU1QzU1XHU1RjAwJyksXG4gICAgICBleHBhbmRlZCA/ICdcdTY1MzZcdThENzcnIDogJ1x1NUM1NVx1NUYwMCcsXG4gICAgICAoKSA9PiB7XG4gICAgICBpZiAoZXhwYW5kZWQpIHRoaXMuZXhwYW5kZWRHcm91cHMuZGVsZXRlKGdyb3VwLmlkKTtcbiAgICAgIGVsc2UgdGhpcy5leHBhbmRlZEdyb3Vwcy5hZGQoZ3JvdXAuaWQpO1xuICAgICAgdGhpcy5yZW5kZXJEeW5hbWljKCk7XG4gICAgICB9KTtcblxuICAgIGNvbnN0IHRpdGxlV3JhcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRpdGxlV3JhcC5jbGFzc05hbWUgPSAnd2lzZW1pbmQtYnJpZGdlLXRyZWUtdGl0bGUnO1xuICAgIHRpdGxlV3JhcC5jcmVhdGVFbCgnc3Ryb25nJywgeyB0ZXh0OiBncm91cC50aXRsZSB9KTtcbiAgICB0aXRsZVdyYXAuY3JlYXRlRWwoJ3NwYW4nLCB7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1tdXRlZCcsIHRleHQ6IGdyb3VwLnN1YnRpdGxlIH0pO1xuXG4gICAgaGVhZGVyLmFwcGVuZChleHBhbmRCdXR0b24sIHRpdGxlV3JhcCk7XG4gICAgd3JhcHBlci5hcHBlbmRDaGlsZChoZWFkZXIpO1xuXG4gICAgaWYgKGV4cGFuZGVkKSB7XG4gICAgICBjb25zdCBjaGlsZHJlbiA9IHdyYXBwZXIuY3JlYXRlRGl2KHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLXRyZWUtY2hpbGRyZW4nIH0pO1xuICAgICAgaWYgKCFncm91cC5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgY2hpbGRyZW4uYXBwZW5kQ2hpbGQocmVuZGVyRW1wdHkoZ3JvdXAuZW1wdHlUZXh0KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBncm91cC5jaGlsZHJlbi5mb3JFYWNoKGNoaWxkID0+IHtcbiAgICAgICAgICBjaGlsZHJlbi5hcHBlbmRDaGlsZChyZW5kZXJDaGVja1Jvdyh7XG4gICAgICAgICAgICBjaGVja2VkOiB0aGlzLnNlbGVjdGVkV2lzZU1pbmREZXN0aW5hdGlvbnMuaGFzKGNoaWxkLmtleSksXG4gICAgICAgICAgICB0aXRsZTogY2hpbGQudGl0bGUsXG4gICAgICAgICAgICBtZXRhOiBkZXN0aW5hdGlvblR5cGVMYWJlbChjaGlsZC50YXJnZXQpLFxuICAgICAgICAgICAgb25DaGFuZ2U6IGNoZWNrZWQgPT4ge1xuICAgICAgICAgICAgICB0b2dnbGVTZXQodGhpcy5zZWxlY3RlZFdpc2VNaW5kRGVzdGluYXRpb25zLCBjaGlsZC5rZXksIGNoZWNrZWQpO1xuICAgICAgICAgICAgICB0aGlzLmltcG9ydFRhcmdldHMgPSB0aGlzLmdldEltcG9ydFRhcmdldHNGcm9tRGVzdGluYXRpb25zKCk7XG4gICAgICAgICAgICAgIHRoaXMucmVuZGVyRmxvd1ByZXNlcnZpbmdTY3JvbGwoKTtcbiAgICAgICAgICAgICAgdGhpcy5yZW5kZXJUb29sYmFyKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0pKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHdyYXBwZXI7XG4gIH1cblxuICBwcml2YXRlIGJ1aWxkT2JzaWRpYW5Hcm91cHMoKTogVHJlZUdyb3VwPE9ic2lkaWFuU291cmNlSXRlbT5bXSB7XG4gICAgY29uc3QgZ3JvdXBzID0gbmV3IE1hcDxzdHJpbmcsIE9ic2lkaWFuU291cmNlSXRlbVtdPigpO1xuICAgIHRoaXMub2JzaWRpYW5JdGVtcy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgY29uc3QgZ3JvdXAgPSBpdGVtLmZvbGRlclBhdGggfHwgJ1x1NjgzOVx1NzZFRVx1NUY1NSc7XG4gICAgICBncm91cHMuc2V0KGdyb3VwLCBbLi4uKGdyb3Vwcy5nZXQoZ3JvdXApIHx8IFtdKSwgaXRlbV0pO1xuICAgIH0pO1xuICAgIHJldHVybiBBcnJheS5mcm9tKGdyb3Vwcy5lbnRyaWVzKCkpXG4gICAgICAuc29ydCgoW2FdLCBbYl0pID0+IHNvcnRSb290Rmlyc3QoYSwgYikpXG4gICAgICAubWFwKChbZm9sZGVyLCBpdGVtc10pID0+ICh7XG4gICAgICAgIGlkOiBgb2JzaWRpYW46JHtmb2xkZXJ9YCxcbiAgICAgICAgdGl0bGU6IGZvbGRlcixcbiAgICAgICAgc3VidGl0bGU6IGAke2l0ZW1zLmxlbmd0aH0gXHU3QkM3IE1hcmtkb3duYCxcbiAgICAgICAgaXRlbXMsXG4gICAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIGJ1aWxkRGVzdGluYXRpb25Hcm91cHMoc2VhcmNoID0gJycpOiBEZXN0aW5hdGlvbkdyb3VwW10ge1xuICAgIGNvbnN0IGRvY3VtZW50Rm9sZGVycyA9IFsnJywgLi4udGhpcy5nZXRGb2xkZXJMYWJlbHModGhpcy5zbmFwc2hvdD8uZG9jdW1lbnRGb2xkZXJzIHx8IFtdKV07XG4gICAgY29uc3Qgbm90ZUZvbGRlcnMgPSBbJycsIC4uLnRoaXMuZ2V0Rm9sZGVyTGFiZWxzKHRoaXMuc25hcHNob3Q/Lm5vdGVGb2xkZXJzIHx8IFtdKV07XG4gICAgY29uc3Qga25vd2xlZGdlQmFzZXMgPSAodGhpcy5zbmFwc2hvdD8ua25vd2xlZGdlQmFzZXMgfHwgW10pLm1hcChpdGVtID0+IHNhZmVUaXRsZShpdGVtLm5hbWUsIGl0ZW0udGl0bGUsIGBcdTc3RTVcdThCQzZcdTVFOTMgJHtpdGVtLmlkfWApKTtcbiAgICBjb25zdCBtYWtlSXRlbXMgPSAodGFyZ2V0OiBXaXNlTWluZFRhcmdldCwgdmFsdWVzOiBzdHJpbmdbXSkgPT4gdmFsdWVzXG4gICAgICAubWFwKHZhbHVlID0+ICh7XG4gICAgICAgIGtleTogZGVzdGluYXRpb25LZXkodGFyZ2V0LCB2YWx1ZSksXG4gICAgICAgIHRpdGxlOiB2YWx1ZSB8fCAnXHU2ODM5XHU3NkVFXHU1RjU1JyxcbiAgICAgICAgdmFsdWUsXG4gICAgICAgIHRhcmdldCxcbiAgICAgIH0pKVxuICAgICAgLmZpbHRlcihpdGVtID0+IG1hdGNoZXNTZWFyY2goYCR7aXRlbS50aXRsZX0gJHtkZXN0aW5hdGlvblR5cGVMYWJlbChpdGVtLnRhcmdldCl9YCwgc2VhcmNoKSk7XG5cbiAgICBjb25zdCBncm91cHM6IERlc3RpbmF0aW9uR3JvdXBbXSA9IFtcbiAgICAgIHtcbiAgICAgICAgaWQ6ICdkZXN0aW5hdGlvbjpkb2N1bWVudHMnLFxuICAgICAgICB0aXRsZTogJ1x1NjU4N1x1Njg2MycsXG4gICAgICAgIHN1YnRpdGxlOiBgJHtkb2N1bWVudEZvbGRlcnMubGVuZ3RofSBcdTRFMkFcdTY1ODdcdTRFRjZcdTU5MzlgLFxuICAgICAgICB0YXJnZXQ6ICdkb2N1bWVudHMnLFxuICAgICAgICBjaGlsZHJlbjogbWFrZUl0ZW1zKCdkb2N1bWVudHMnLCBkb2N1bWVudEZvbGRlcnMpLFxuICAgICAgICBlbXB0eVRleHQ6ICdcdTZDQTFcdTY3MDlcdTUzMzlcdTkxNERcdTc2ODRcdTY1ODdcdTY4NjNcdTY1ODdcdTRFRjZcdTU5MzlcdTMwMDInLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgaWQ6ICdkZXN0aW5hdGlvbjprbm93bGVkZ2UnLFxuICAgICAgICB0aXRsZTogJ1x1NzdFNVx1OEJDNlx1NUU5MycsXG4gICAgICAgIHN1YnRpdGxlOiBgJHtrbm93bGVkZ2VCYXNlcy5sZW5ndGh9IFx1NEUyQVx1NzdFNVx1OEJDNlx1NUU5M2AsXG4gICAgICAgIHRhcmdldDogJ2tub3dsZWRnZScsXG4gICAgICAgIGNoaWxkcmVuOiBtYWtlSXRlbXMoJ2tub3dsZWRnZScsIGtub3dsZWRnZUJhc2VzKSxcbiAgICAgICAgZW1wdHlUZXh0OiAnXHU2Q0ExXHU2NzA5XHU1MzM5XHU5MTREXHU3Njg0XHU3N0U1XHU4QkM2XHU1RTkzXHUzMDAyJyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGlkOiAnZGVzdGluYXRpb246bm90ZXMnLFxuICAgICAgICB0aXRsZTogJ1x1N0IxNFx1OEJCMCcsXG4gICAgICAgIHN1YnRpdGxlOiBgJHtub3RlRm9sZGVycy5sZW5ndGh9IFx1NEUyQVx1NjU4N1x1NEVGNlx1NTkzOWAsXG4gICAgICAgIHRhcmdldDogJ25vdGVzJyxcbiAgICAgICAgY2hpbGRyZW46IG1ha2VJdGVtcygnbm90ZXMnLCBub3RlRm9sZGVycyksXG4gICAgICAgIGVtcHR5VGV4dDogJ1x1NkNBMVx1NjcwOVx1NTMzOVx1OTE0RFx1NzY4NFx1N0IxNFx1OEJCMFx1NjU4N1x1NEVGNlx1NTkzOVx1MzAwMicsXG4gICAgICB9LFxuICAgIF07XG4gICAgcmV0dXJuIGdyb3Vwcy5maWx0ZXIoZ3JvdXAgPT4gIXNlYXJjaC50cmltKCkgfHwgZ3JvdXAuY2hpbGRyZW4ubGVuZ3RoKTtcbiAgfVxuXG4gIHByaXZhdGUgYnVpbGRXaXNlTWluZFNvdXJjZUdyb3VwcyhjYXRlZ29yeTogV2lzZU1pbmRDYXRlZ29yeSk6IFRyZWVHcm91cDxXaXNlTWluZFNvdXJjZUl0ZW0+W10ge1xuICAgIGlmIChjYXRlZ29yeSA9PT0gJ2tub3dsZWRnZScpIHtcbiAgICAgIGNvbnN0IGRvY3MgPSB0aGlzLndpc2VNaW5kSXRlbXMuZmlsdGVyKGl0ZW0gPT4gaXRlbS5zb3VyY2VUeXBlID09PSAna25vd2xlZGdlLWRvY3VtZW50Jyk7XG4gICAgICByZXR1cm4gKHRoaXMuc25hcHNob3Q/Lmtub3dsZWRnZUJhc2VzIHx8IFtdKVxuICAgICAgICAubWFwKGJhc2UgPT4ge1xuICAgICAgICAgIGNvbnN0IHRpdGxlID0gc2FmZVRpdGxlKGJhc2UubmFtZSwgYmFzZS50aXRsZSwgYFx1NzdFNVx1OEJDNlx1NUU5MyAke2Jhc2UuaWR9YCk7XG4gICAgICAgICAgY29uc3QgaXRlbXMgPSBkb2NzLmZpbHRlcihpdGVtID0+IFN0cmluZyhpdGVtLnJhdz8ua25vd2xlZGdlQmFzZUlkKSA9PT0gU3RyaW5nKGJhc2UuaWQpKTtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaWQ6IGB3aXNlbWluZDprbm93bGVkZ2U6JHtiYXNlLmlkfWAsXG4gICAgICAgICAgICB0aXRsZSxcbiAgICAgICAgICAgIHN1YnRpdGxlOiBgJHtpdGVtcy5sZW5ndGh9IFx1N0JDNyBNYXJrZG93bmAsXG4gICAgICAgICAgICBpdGVtcyxcbiAgICAgICAgICAgIGVtcHR5VGV4dDogJ1x1OEZEOVx1NEUyQVx1NzdFNVx1OEJDNlx1NUU5M1x1OTFDQ1x1NkNBMVx1NjcwOSBNYXJrZG93biBcdTdCMTRcdThCQjBcdTMwMDInLFxuICAgICAgICAgIH07XG4gICAgICAgIH0pXG4gICAgICAgIC5zb3J0KChhLCBiKSA9PiBhLnRpdGxlLmxvY2FsZUNvbXBhcmUoYi50aXRsZSkpO1xuICAgIH1cblxuICAgIGNvbnN0IHNvdXJjZVR5cGU6IFdpc2VNaW5kU291cmNlVHlwZSA9IGNhdGVnb3J5ID09PSAnZG9jdW1lbnRzJyA/ICdkb2N1bWVudCcgOiAnbm90ZSc7XG4gICAgY29uc3QgZ3JvdXBzID0gbmV3IE1hcDxzdHJpbmcsIFdpc2VNaW5kU291cmNlSXRlbVtdPigpO1xuICAgIHRoaXMud2lzZU1pbmRJdGVtc1xuICAgICAgLmZpbHRlcihpdGVtID0+IGl0ZW0uc291cmNlVHlwZSA9PT0gc291cmNlVHlwZSlcbiAgICAgIC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICBjb25zdCBncm91cCA9IGl0ZW0uZm9sZGVyUGF0aCB8fCAnXHU2NzJBXHU1MjA2XHU3RUM0JztcbiAgICAgICAgZ3JvdXBzLnNldChncm91cCwgWy4uLihncm91cHMuZ2V0KGdyb3VwKSB8fCBbXSksIGl0ZW1dKTtcbiAgICAgIH0pO1xuXG4gICAgcmV0dXJuIEFycmF5LmZyb20oZ3JvdXBzLmVudHJpZXMoKSlcbiAgICAgIC5zb3J0KChbYV0sIFtiXSkgPT4gc29ydFJvb3RGaXJzdChhID09PSAnXHU2NzJBXHU1MjA2XHU3RUM0JyA/ICdcdTY4MzlcdTc2RUVcdTVGNTUnIDogYSwgYiA9PT0gJ1x1NjcyQVx1NTIwNlx1N0VDNCcgPyAnXHU2ODM5XHU3NkVFXHU1RjU1JyA6IGIpKVxuICAgICAgLm1hcCgoW2ZvbGRlciwgaXRlbXNdKSA9PiAoe1xuICAgICAgICBpZDogYHdpc2VtaW5kOiR7Y2F0ZWdvcnl9OiR7Zm9sZGVyfWAsXG4gICAgICAgIHRpdGxlOiBmb2xkZXIsXG4gICAgICAgIHN1YnRpdGxlOiBgJHtpdGVtcy5sZW5ndGh9IFx1Njc2MVx1NTE4NVx1NUJCOWAsXG4gICAgICAgIGl0ZW1zLFxuICAgICAgfSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRGb2xkZXJMYWJlbHMoZm9sZGVyczogV2lzZU1pbmRGb2xkZXJbXSkge1xuICAgIHJldHVybiBmb2xkZXJzXG4gICAgICAubWFwKGZvbGRlciA9PiByZXNvbHZlRm9sZGVyUGF0aChmb2xkZXIuaWQsIGZvbGRlcnMpIHx8IGZvbGRlci5uYW1lKVxuICAgICAgLmZpbHRlcihCb29sZWFuKVxuICAgICAgLnNvcnQoKGEsIGIpID0+IGEubG9jYWxlQ29tcGFyZShiKSk7XG4gIH1cblxuICBwcml2YXRlIGdldEZpbHRlcmVkT2JzaWRpYW5Hcm91cHMoKSB7XG4gICAgcmV0dXJuIGZpbHRlckdyb3Vwcyh0aGlzLmJ1aWxkT2JzaWRpYW5Hcm91cHMoKSwgdGhpcy5zZWFyY2hlcy5vYnNpZGlhblNvdXJjZSwgaXRlbSA9PiBgJHtpdGVtLnRpdGxlfSAke2l0ZW0ucGF0aH1gKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RmlsdGVyZWRPYnNpZGlhbktleXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0RmlsdGVyZWRPYnNpZGlhbkdyb3VwcygpLmZsYXRNYXAoZ3JvdXAgPT4gZ3JvdXAuaXRlbXMubWFwKGl0ZW0gPT4gaXRlbS5wYXRoKSk7XG4gIH1cblxuICBwcml2YXRlIGdldEZpbHRlcmVkRGVzdGluYXRpb25Hcm91cHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuYnVpbGREZXN0aW5hdGlvbkdyb3Vwcyh0aGlzLnNlYXJjaGVzLndpc2VNaW5kVGFyZ2V0KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RmlsdGVyZWREZXN0aW5hdGlvbktleXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0RmlsdGVyZWREZXN0aW5hdGlvbkdyb3VwcygpLmZsYXRNYXAoZ3JvdXAgPT4gZ3JvdXAuY2hpbGRyZW4ubWFwKGl0ZW0gPT4gaXRlbS5rZXkpKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RmlsdGVyZWRXaXNlTWluZFNvdXJjZUdyb3VwcygpIHtcbiAgICByZXR1cm4gZmlsdGVyR3JvdXBzKFxuICAgICAgdGhpcy5idWlsZFdpc2VNaW5kU291cmNlR3JvdXBzKHRoaXMuYWN0aXZlV2lzZU1pbmRDYXRlZ29yeSksXG4gICAgICB0aGlzLnNlYXJjaGVzLndpc2VNaW5kU291cmNlLFxuICAgICAgaXRlbSA9PiBgJHtpdGVtLnRpdGxlfSAke2l0ZW0uZm9sZGVyUGF0aH0gJHtpdGVtLmtub3dsZWRnZUJhc2VOYW1lIHx8ICcnfWAsXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RmlsdGVyZWRXaXNlTWluZFNvdXJjZUtleXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0RmlsdGVyZWRXaXNlTWluZFNvdXJjZUdyb3VwcygpLmZsYXRNYXAoZ3JvdXAgPT4gZ3JvdXAuaXRlbXMubWFwKHNvdXJjZUtleSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRGaWx0ZXJlZE9ic2lkaWFuVGFyZ2V0Rm9sZGVycygpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRPYnNpZGlhbkZvbGRlcnMoKS5maWx0ZXIoZm9sZGVyID0+IG1hdGNoZXNTZWFyY2goZm9sZGVyIHx8ICdcdTY4MzlcdTc2RUVcdTVGNTUnLCB0aGlzLnNlYXJjaGVzLm9ic2lkaWFuVGFyZ2V0KSk7XG4gIH1cblxuICBwcml2YXRlIHRvZ2dsZU9ic2lkaWFuU291cmNlQWxsKCkge1xuICAgIHRoaXMudG9nZ2xlS2V5cyh0aGlzLnNlbGVjdGVkT2JzaWRpYW4sIHRoaXMuZ2V0RmlsdGVyZWRPYnNpZGlhbktleXMoKSk7XG4gIH1cblxuICBwcml2YXRlIHRvZ2dsZVdpc2VNaW5kVGFyZ2V0QWxsKCkge1xuICAgIHRoaXMudG9nZ2xlS2V5cyh0aGlzLnNlbGVjdGVkV2lzZU1pbmREZXN0aW5hdGlvbnMsIHRoaXMuZ2V0RmlsdGVyZWREZXN0aW5hdGlvbktleXMoKSk7XG4gICAgdGhpcy5pbXBvcnRUYXJnZXRzID0gdGhpcy5nZXRJbXBvcnRUYXJnZXRzRnJvbURlc3RpbmF0aW9ucygpO1xuICB9XG5cbiAgcHJpdmF0ZSB0b2dnbGVXaXNlTWluZFNvdXJjZUFsbCgpIHtcbiAgICB0aGlzLnRvZ2dsZUtleXModGhpcy5zZWxlY3RlZFdpc2VNaW5kLCB0aGlzLmdldEZpbHRlcmVkV2lzZU1pbmRTb3VyY2VLZXlzKCkpO1xuICB9XG5cbiAgcHJpdmF0ZSB0b2dnbGVPYnNpZGlhblRhcmdldEFsbCgpIHtcbiAgICB0aGlzLnRvZ2dsZUtleXModGhpcy5zZWxlY3RlZE9ic2lkaWFuVGFyZ2V0Rm9sZGVycywgdGhpcy5nZXRGaWx0ZXJlZE9ic2lkaWFuVGFyZ2V0Rm9sZGVycygpKTtcbiAgfVxuXG4gIHByaXZhdGUgdG9nZ2xlS2V5cyhzZXQ6IFNldDxzdHJpbmc+LCBrZXlzOiBzdHJpbmdbXSkge1xuICAgIGlmICgha2V5cy5sZW5ndGgpIHJldHVybjtcbiAgICBjb25zdCBhbGxTZWxlY3RlZCA9IGtleXMuZXZlcnkoa2V5ID0+IHNldC5oYXMoa2V5KSk7XG4gICAga2V5cy5mb3JFYWNoKGtleSA9PiB7XG4gICAgICBpZiAoYWxsU2VsZWN0ZWQpIHNldC5kZWxldGUoa2V5KTtcbiAgICAgIGVsc2Ugc2V0LmFkZChrZXkpO1xuICAgIH0pO1xuICAgIHRoaXMucmVuZGVyRmxvd1ByZXNlcnZpbmdTY3JvbGwoKTtcbiAgICB0aGlzLnJlbmRlclRvb2xiYXIoKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyRmxvd1ByZXNlcnZpbmdTY3JvbGwoKSB7XG4gICAgaWYgKCF0aGlzLmZsb3dFbCkgcmV0dXJuO1xuICAgIGNvbnN0IHNjcm9sbFRvcHMgPSB0aGlzLmNhcHR1cmVMaXN0U2Nyb2xsKCk7XG4gICAgdGhpcy5yZW5kZXJGbG93KCk7XG4gICAgdGhpcy5yZXN0b3JlTGlzdFNjcm9sbChzY3JvbGxUb3BzKTtcbiAgfVxuXG4gIHByaXZhdGUgY2FwdHVyZUxpc3RTY3JvbGwoKSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5mbG93RWw/LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KCcud2lzZW1pbmQtYnJpZGdlLWxpc3QnKSB8fCBbXSlcbiAgICAgIC5tYXAoaXRlbSA9PiBpdGVtLnNjcm9sbFRvcCk7XG4gIH1cblxuICBwcml2YXRlIHJlc3RvcmVMaXN0U2Nyb2xsKHNjcm9sbFRvcHM6IG51bWJlcltdKSB7XG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICBBcnJheS5mcm9tKHRoaXMuZmxvd0VsPy5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PignLndpc2VtaW5kLWJyaWRnZS1saXN0JykgfHwgW10pXG4gICAgICAgIC5mb3JFYWNoKChpdGVtLCBpbmRleCkgPT4ge1xuICAgICAgICAgIGl0ZW0uc2Nyb2xsVG9wID0gc2Nyb2xsVG9wc1tpbmRleF0gfHwgMDtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGdldEFjdGl2ZVBsYW5OYW1lKCkge1xuICAgIHJldHVybiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zeW5jUGxhbnMuZmluZChwbGFuID0+IHBsYW4uaWQgPT09IHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRTeW5jUGxhbklkKT8ubmFtZSB8fCAnJztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q3VycmVudFBsYW5TdW1tYXJ5KCkge1xuICAgIGlmICh0aGlzLmRpcmVjdGlvbiA9PT0gJ3RvLXdpc2VtaW5kJykge1xuICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLm9ic2lkaWFuSXRlbXMuZmlsdGVyKGl0ZW0gPT4gdGhpcy5zZWxlY3RlZE9ic2lkaWFuLmhhcyhpdGVtLnBhdGgpKTtcbiAgICAgIGNvbnN0IGRlc3RpbmF0aW9ucyA9IHRoaXMuZ2V0U2VsZWN0ZWREZXN0aW5hdGlvbnMoKTtcbiAgICAgIHJldHVybiBbXG4gICAgICAgIHsgbGFiZWw6ICdcdTU0MENcdTZCNjVcdTY1QjlcdTU0MTEnLCB2YWx1ZXM6IFsnT2JzaWRpYW4gLT4gV2lzZU1pbmRBSSddLCBlbXB0eVRleHQ6ICdcdTY3MkFcdTkwMDlcdTYyRTlcdTY1QjlcdTU0MTEnIH0sXG4gICAgICAgIHsgbGFiZWw6ICdcdTVERjJcdTkwMDlcdTUxODVcdTVCQjknLCB2YWx1ZXM6IHN1bW1hcml6ZVZhbHVlcyhpdGVtcy5tYXAoaXRlbSA9PiBpdGVtLnRpdGxlKSksIGVtcHR5VGV4dDogJ1x1NjcyQVx1OTAwOVx1NjJFOVx1N0IxNFx1OEJCMCcgfSxcbiAgICAgICAgeyBsYWJlbDogJ1x1Njc2NVx1NkU5MFx1NjU4N1x1NEVGNlx1NTkzOScsIHZhbHVlczogc3VtbWFyaXplVmFsdWVzKGl0ZW1zLm1hcChpdGVtID0+IGl0ZW0uZm9sZGVyUGF0aCB8fCAnXHU2ODM5XHU3NkVFXHU1RjU1JykpLCBlbXB0eVRleHQ6ICdcdTY3MkFcdTkwMDlcdTYyRTlcdTY1ODdcdTRFRjZcdTU5MzknIH0sXG4gICAgICAgIHsgbGFiZWw6ICdcdTRGRERcdTVCNThcdTUyMzAnLCB2YWx1ZXM6IHN1bW1hcml6ZVZhbHVlcyhkZXN0aW5hdGlvbnMubWFwKGl0ZW0gPT4gYCR7ZGVzdGluYXRpb25UeXBlTGFiZWwoaXRlbS50YXJnZXQpfVx1RkYxQSR7aXRlbS50aXRsZX1gKSksIGVtcHR5VGV4dDogJ1x1NjcyQVx1OTAwOVx1NjJFOVx1NzZFRVx1NjgwNycgfSxcbiAgICAgIF07XG4gICAgfVxuXG4gICAgY29uc3QgaXRlbXMgPSB0aGlzLmdldFNlbGVjdGVkV2lzZU1pbmRGb3JBY3RpdmVDYXRlZ29yeSgpO1xuICAgIGNvbnN0IGZvbGRlcnMgPSBBcnJheS5mcm9tKHRoaXMuc2VsZWN0ZWRPYnNpZGlhblRhcmdldEZvbGRlcnMpLm1hcChmb2xkZXIgPT4gZm9sZGVyIHx8ICdcdTY4MzlcdTc2RUVcdTVGNTUnKTtcbiAgICByZXR1cm4gW1xuICAgICAgeyBsYWJlbDogJ1x1NTQwQ1x1NkI2NVx1NjVCOVx1NTQxMScsIHZhbHVlczogWydXaXNlTWluZEFJIC0+IE9ic2lkaWFuJ10sIGVtcHR5VGV4dDogJ1x1NjcyQVx1OTAwOVx1NjJFOVx1NjVCOVx1NTQxMScgfSxcbiAgICAgIHsgbGFiZWw6ICdcdTVERjJcdTkwMDlcdTUxODVcdTVCQjknLCB2YWx1ZXM6IHN1bW1hcml6ZVZhbHVlcyhpdGVtcy5tYXAoaXRlbSA9PiBpdGVtLnRpdGxlKSksIGVtcHR5VGV4dDogJ1x1NjcyQVx1OTAwOVx1NjJFOVx1NTE4NVx1NUJCOScgfSxcbiAgICAgIHsgbGFiZWw6ICdcdTY3NjVcdTZFOTBcdTUyMDZcdTdDN0InLCB2YWx1ZXM6IFtjYXRlZ29yeUxhYmVsKHRoaXMuYWN0aXZlV2lzZU1pbmRDYXRlZ29yeSldLCBlbXB0eVRleHQ6ICdcdTY3MkFcdTkwMDlcdTYyRTlcdTUyMDZcdTdDN0InIH0sXG4gICAgICB7IGxhYmVsOiAnXHU1MTk5XHU1MTY1XHU2NTg3XHU0RUY2XHU1OTM5JywgdmFsdWVzOiBzdW1tYXJpemVWYWx1ZXMoZm9sZGVycyksIGVtcHR5VGV4dDogJ1x1NjcyQVx1OTAwOVx1NjJFOVx1NjU4N1x1NEVGNlx1NTkzOScgfSxcbiAgICBdO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVEaWFsb2codGl0bGU6IHN0cmluZykge1xuICAgIGNvbnN0IG92ZXJsYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBvdmVybGF5LmNsYXNzTmFtZSA9ICd3aXNlbWluZC1icmlkZ2UtaGlzdG9yeS1vdmVybGF5JztcbiAgICBjb25zdCBtb2RhbCA9IG92ZXJsYXkuY3JlYXRlRGl2KHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLWRpYWxvZycgfSk7XG4gICAgY29uc3QgaGVhZGVyID0gbW9kYWwuY3JlYXRlRGl2KHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLWhpc3RvcnktdGl0bGUnIH0pO1xuICAgIGhlYWRlci5jcmVhdGVFbCgnaDInLCB7IHRleHQ6IHRpdGxlIH0pO1xuICAgIGhlYWRlci5hcHBlbmRDaGlsZChjcmVhdGVJY29uQnV0dG9uKGNyZWF0ZUlubGluZUljb24odGhpcy5nZXRJY29uU3ZnKCd4LW1hcmsuc3ZnJyksICdcdTUxNzNcdTk1RUQnKSwgJ1x1NTE3M1x1OTVFRCcsICgpID0+IG92ZXJsYXkucmVtb3ZlKCkpKTtcbiAgICBvdmVybGF5Lm9uY2xpY2sgPSBldmVudCA9PiB7XG4gICAgICBpZiAoZXZlbnQudGFyZ2V0ID09PSBvdmVybGF5KSBvdmVybGF5LnJlbW92ZSgpO1xuICAgIH07XG4gICAgdGhpcy5jb250ZW50RWwuYXBwZW5kQ2hpbGQob3ZlcmxheSk7XG4gICAgcmV0dXJuIG92ZXJsYXk7XG4gIH1cblxuICBwcml2YXRlIGdldFNlbGVjdGVkVGFyZ2V0TGFiZWxzKCkge1xuICAgIGNvbnN0IHNlbGVjdGVkID0gQXJyYXkuZnJvbSh0aGlzLnNlbGVjdGVkV2lzZU1pbmREZXN0aW5hdGlvbnMpO1xuICAgIHJldHVybiBzZWxlY3RlZC5sZW5ndGggPyBgJHtzZWxlY3RlZC5sZW5ndGh9IFx1NEUyQVx1NzZFRVx1NjgwN2AgOiAnXHU2NzJBXHU5MDA5XHU2MkU5JztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U2VsZWN0ZWRXaXNlTWluZEZvckFjdGl2ZUNhdGVnb3J5KCkge1xuICAgIHJldHVybiB0aGlzLndpc2VNaW5kSXRlbXMuZmlsdGVyKGl0ZW0gPT5cbiAgICAgIHRoaXMuc2VsZWN0ZWRXaXNlTWluZC5oYXMoc291cmNlS2V5KGl0ZW0pKSAmJiBzb3VyY2VNYXRjaGVzQ2F0ZWdvcnkoaXRlbSwgdGhpcy5hY3RpdmVXaXNlTWluZENhdGVnb3J5KSxcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBjYXB0dXJlU2VsZWN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICBvYnNpZGlhbjogbmV3IFNldCh0aGlzLnNlbGVjdGVkT2JzaWRpYW4pLFxuICAgICAgd2lzZU1pbmQ6IG5ldyBTZXQodGhpcy5zZWxlY3RlZFdpc2VNaW5kKSxcbiAgICAgIHdpc2VNaW5kRGVzdGluYXRpb25zOiBuZXcgU2V0KHRoaXMuc2VsZWN0ZWRXaXNlTWluZERlc3RpbmF0aW9ucyksXG4gICAgICBvYnNpZGlhblRhcmdldHM6IG5ldyBTZXQodGhpcy5zZWxlY3RlZE9ic2lkaWFuVGFyZ2V0Rm9sZGVycyksXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzdG9yZVNlbGVjdGlvbihzZWxlY3Rpb246IFJldHVyblR5cGU8V2lzZU1pbmRCcmlkZ2VWaWV3WydjYXB0dXJlU2VsZWN0aW9uJ10+KSB7XG4gICAgY29uc3Qgb2JzaWRpYW5QYXRocyA9IG5ldyBTZXQodGhpcy5vYnNpZGlhbkl0ZW1zLm1hcChpdGVtID0+IGl0ZW0ucGF0aCkpO1xuICAgIGNvbnN0IHdpc2VNaW5kS2V5cyA9IG5ldyBTZXQodGhpcy53aXNlTWluZEl0ZW1zLm1hcChzb3VyY2VLZXkpKTtcbiAgICBjb25zdCBkZXN0aW5hdGlvbktleXMgPSBuZXcgU2V0KHRoaXMuYnVpbGREZXN0aW5hdGlvbkdyb3VwcygpLmZsYXRNYXAoZ3JvdXAgPT4gZ3JvdXAuY2hpbGRyZW4ubWFwKGl0ZW0gPT4gaXRlbS5rZXkpKSk7XG4gICAgY29uc3Qgb2JzaWRpYW5Gb2xkZXJzID0gbmV3IFNldCh0aGlzLmdldE9ic2lkaWFuRm9sZGVycygpKTtcblxuICAgIHRoaXMuc2VsZWN0ZWRPYnNpZGlhbiA9IG5ldyBTZXQoQXJyYXkuZnJvbShzZWxlY3Rpb24ub2JzaWRpYW4pLmZpbHRlcihwYXRoID0+IG9ic2lkaWFuUGF0aHMuaGFzKHBhdGgpKSk7XG4gICAgdGhpcy5zZWxlY3RlZFdpc2VNaW5kID0gbmV3IFNldChBcnJheS5mcm9tKHNlbGVjdGlvbi53aXNlTWluZCkuZmlsdGVyKGtleSA9PiB3aXNlTWluZEtleXMuaGFzKGtleSkpKTtcbiAgICB0aGlzLnNlbGVjdGVkV2lzZU1pbmREZXN0aW5hdGlvbnMgPSBuZXcgU2V0KEFycmF5LmZyb20oc2VsZWN0aW9uLndpc2VNaW5kRGVzdGluYXRpb25zKS5maWx0ZXIoa2V5ID0+IGRlc3RpbmF0aW9uS2V5cy5oYXMoa2V5KSkpO1xuICAgIHRoaXMuc2VsZWN0ZWRPYnNpZGlhblRhcmdldEZvbGRlcnMgPSBuZXcgU2V0KEFycmF5LmZyb20oc2VsZWN0aW9uLm9ic2lkaWFuVGFyZ2V0cykuZmlsdGVyKGZvbGRlciA9PiBvYnNpZGlhbkZvbGRlcnMuaGFzKGZvbGRlcikpKTtcblxuICAgIGlmICghdGhpcy5zZWxlY3RlZFdpc2VNaW5kRGVzdGluYXRpb25zLnNpemUpIHtcbiAgICAgIHRoaXMuc2VsZWN0ZWRXaXNlTWluZERlc3RpbmF0aW9ucyA9IG5ldyBTZXQodGhpcy5nZXREZWZhdWx0RGVzdGluYXRpb25LZXlzKCkpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuc2VsZWN0ZWRPYnNpZGlhblRhcmdldEZvbGRlcnMuc2l6ZSkge1xuICAgICAgdGhpcy5zZWxlY3RlZE9ic2lkaWFuVGFyZ2V0Rm9sZGVycyA9IG5ldyBTZXQoW3RoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRPYnNpZGlhblJvb3RGb2xkZXJdKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldEltcG9ydFRhcmdldHNGcm9tRGVzdGluYXRpb25zKCkge1xuICAgIGNvbnN0IHRhcmdldHMgPSBuZXcgU2V0PFdpc2VNaW5kVGFyZ2V0PigpO1xuICAgIHRoaXMuZ2V0U2VsZWN0ZWREZXN0aW5hdGlvbnMoKS5mb3JFYWNoKGl0ZW0gPT4gdGFyZ2V0cy5hZGQoaXRlbS50YXJnZXQpKTtcbiAgICByZXR1cm4gdGFyZ2V0cztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U2VsZWN0ZWREZXN0aW5hdGlvbnMoKSB7XG4gICAgcmV0dXJuIHRoaXMuYnVpbGREZXN0aW5hdGlvbkdyb3VwcygpXG4gICAgICAuZmxhdE1hcChncm91cCA9PiBncm91cC5jaGlsZHJlbilcbiAgICAgIC5maWx0ZXIoaXRlbSA9PiB0aGlzLnNlbGVjdGVkV2lzZU1pbmREZXN0aW5hdGlvbnMuaGFzKGl0ZW0ua2V5KSk7XG4gIH1cblxuICBwcml2YXRlIGdldERlZmF1bHREZXN0aW5hdGlvbktleXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuYnVpbGREZXN0aW5hdGlvbkdyb3VwcygpLmZsYXRNYXAoZ3JvdXAgPT4ge1xuICAgICAgaWYgKCF0aGlzLmltcG9ydFRhcmdldHMuaGFzKGdyb3VwLnRhcmdldCkpIHJldHVybiBbXTtcbiAgICAgIGlmIChncm91cC50YXJnZXQgPT09ICdkb2N1bWVudHMnIHx8IGdyb3VwLnRhcmdldCA9PT0gJ25vdGVzJykge1xuICAgICAgICByZXR1cm4gZ3JvdXAuY2hpbGRyZW4uZmlsdGVyKGl0ZW0gPT4gaXRlbS52YWx1ZSA9PT0gJycpLm1hcChpdGVtID0+IGl0ZW0ua2V5KTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHByZWZlcnJlZCA9IGdyb3VwLmNoaWxkcmVuLmZpbmQoaXRlbSA9PiBpdGVtLnRpdGxlID09PSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWZhdWx0S25vd2xlZGdlQmFzZU5hbWUpIHx8IGdyb3VwLmNoaWxkcmVuWzBdO1xuICAgICAgcmV0dXJuIHByZWZlcnJlZCA/IFtwcmVmZXJyZWQua2V5XSA6IFtdO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRPYnNpZGlhbkZvbGRlcnMoKSB7XG4gICAgY29uc3QgZm9sZGVycyA9IG5ldyBTZXQ8c3RyaW5nPihbJyddKTtcbiAgICAoKHRoaXMuYXBwLnZhdWx0IGFzIGFueSkuZ2V0QWxsTG9hZGVkRmlsZXM/LigpIHx8IFtdKS5mb3JFYWNoKChmaWxlOiBhbnkpID0+IHtcbiAgICAgIGNvbnN0IGl0ZW0gPSBmaWxlIGFzIGFueTtcbiAgICAgIGlmIChpdGVtPy5jaGlsZHJlbiAmJiB0eXBlb2YgaXRlbS5wYXRoID09PSAnc3RyaW5nJyAmJiBpdGVtLnBhdGgpIHtcbiAgICAgICAgZm9sZGVycy5hZGQoaXRlbS5wYXRoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLm9ic2lkaWFuSXRlbXMuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgIGNvbnN0IHBhcnRzID0gaXRlbS5mb2xkZXJQYXRoLnNwbGl0KCcvJykuZmlsdGVyKEJvb2xlYW4pO1xuICAgICAgcGFydHMuZm9yRWFjaCgoXywgaW5kZXgpID0+IGZvbGRlcnMuYWRkKHBhcnRzLnNsaWNlKDAsIGluZGV4ICsgMSkuam9pbignLycpKSk7XG4gICAgfSk7XG4gICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRPYnNpZGlhblJvb3RGb2xkZXIpIGZvbGRlcnMuYWRkKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRPYnNpZGlhblJvb3RGb2xkZXIpO1xuICAgIHRoaXMuc2VsZWN0ZWRPYnNpZGlhblRhcmdldEZvbGRlcnMuZm9yRWFjaChmb2xkZXIgPT4gZm9sZGVycy5hZGQoZm9sZGVyKSk7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oZm9sZGVycykuc29ydChzb3J0Um9vdEZpcnN0KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY3JlYXRlT2JzaWRpYW5UYXJnZXRGb2xkZXIodmFsdWU6IHN0cmluZykge1xuICAgIGNvbnN0IGZvbGRlciA9IHZhbHVlLnRyaW0oKS5yZXBsYWNlKC9eXFwvK3xcXC8rJC9nLCAnJyk7XG4gICAgaWYgKCFmb2xkZXIpIHtcbiAgICAgIG5ldyBOb3RpY2UoJ1x1OEJGN1x1OEY5M1x1NTE2NVx1NjU4N1x1NEVGNlx1NTkzOVx1NTQwRFx1NzlGMCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsZXQgY3VycmVudCA9ICcnO1xuICAgIGZvciAoY29uc3QgcGFydCBvZiBmb2xkZXIuc3BsaXQoJy8nKS5maWx0ZXIoQm9vbGVhbikpIHtcbiAgICAgIGN1cnJlbnQgPSBjdXJyZW50ID8gYCR7Y3VycmVudH0vJHtwYXJ0fWAgOiBwYXJ0O1xuICAgICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoY3VycmVudCkpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKGN1cnJlbnQpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnNlbGVjdGVkT2JzaWRpYW5UYXJnZXRGb2xkZXJzLmFkZChmb2xkZXIpO1xuICAgIHRoaXMuc2VhcmNoZXMub2JzaWRpYW5UYXJnZXQgPSAnJztcbiAgICB0aGlzLnJlbmRlckR5bmFtaWMoKTtcbiAgICBuZXcgTm90aWNlKGBcdTVERjJcdTkwMDlcdTYyRTlcdTY1ODdcdTRFRjZcdTU5MzlcdUZGMUEke2ZvbGRlcn1gKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyRXhlY3V0ZUFyZWEoKSB7XG4gICAgY29uc3QgZm9vdGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZm9vdGVyLmNsYXNzTmFtZSA9ICd3aXNlbWluZC1icmlkZ2UtZXhlY3V0ZSc7XG4gICAgY29uc3Qgb3ZlcndyaXRlID0gZm9vdGVyLmNyZWF0ZUVsKCdsYWJlbCcsIHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLW92ZXJ3cml0ZS10b2dnbGUnIH0pO1xuICAgIGNvbnN0IGNoZWNrYm94ID0gb3ZlcndyaXRlLmNyZWF0ZUVsKCdpbnB1dCcpO1xuICAgIGNoZWNrYm94LnR5cGUgPSAnY2hlY2tib3gnO1xuICAgIGNoZWNrYm94LmNoZWNrZWQgPSB0aGlzLm92ZXJ3cml0ZUV4aXN0aW5nO1xuICAgIGNoZWNrYm94Lm9uY2hhbmdlID0gKCkgPT4ge1xuICAgICAgdGhpcy5vdmVyd3JpdGVFeGlzdGluZyA9IGNoZWNrYm94LmNoZWNrZWQ7XG4gICAgfTtcbiAgICBvdmVyd3JpdGUuY3JlYXRlRWwoJ3NwYW4nLCB7IHRleHQ6ICdcdTg5ODZcdTc2RDZcdTVERjJcdTY3MDknIH0pO1xuICAgIGlmICh0aGlzLmRpcmVjdGlvbiA9PT0gJ3RvLW9ic2lkaWFuJykge1xuICAgICAgY29uc3QgaW5jbHVkZUZvbGRlcnMgPSBmb290ZXIuY3JlYXRlRWwoJ2xhYmVsJywgeyBjbHM6ICd3aXNlbWluZC1icmlkZ2Utb3ZlcndyaXRlLXRvZ2dsZScgfSk7XG4gICAgICBjb25zdCBpbmNsdWRlQ2hlY2tib3ggPSBpbmNsdWRlRm9sZGVycy5jcmVhdGVFbCgnaW5wdXQnKTtcbiAgICAgIGluY2x1ZGVDaGVja2JveC50eXBlID0gJ2NoZWNrYm94JztcbiAgICAgIGluY2x1ZGVDaGVja2JveC5jaGVja2VkID0gdGhpcy5pbmNsdWRlT2JzaWRpYW5Gb2xkZXJzO1xuICAgICAgaW5jbHVkZUNoZWNrYm94Lm9uY2hhbmdlID0gKCkgPT4ge1xuICAgICAgICB0aGlzLmluY2x1ZGVPYnNpZGlhbkZvbGRlcnMgPSBpbmNsdWRlQ2hlY2tib3guY2hlY2tlZDtcbiAgICAgIH07XG4gICAgICBpbmNsdWRlRm9sZGVycy5jcmVhdGVFbCgnc3BhbicsIHsgdGV4dDogJ1x1NTMwNVx1NTQyQlx1NjU4N1x1NEVGNlx1NTkzOScgfSk7XG4gICAgfVxuICAgIGZvb3Rlci5hcHBlbmRDaGlsZChjcmVhdGVCdXR0b24oJ1x1NjI2N1x1ODg0Q1x1NTQwQ1x1NkI2NScsICgpID0+IHRoaXMuZXhlY3V0ZUN1cnJlbnREaXJlY3Rpb24oKSwgJ3ByaW1hcnknLCB0aGlzLmdldEljb25TdmcoJ2NoZWNrLWNpcmNsZS5zdmcnKSkpO1xuICAgIHJldHVybiBmb290ZXI7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHNhdmVDdXJyZW50QXNQbGFuKG5hbWU6IHN0cmluZykge1xuICAgIGNvbnN0IHRyaW1tZWQgPSBuYW1lLnRyaW0oKTtcbiAgICBpZiAoIXRyaW1tZWQpIHtcbiAgICAgIG5ldyBOb3RpY2UoJ1x1OEJGN1x1OEY5M1x1NTE2NVx1NjVCOVx1Njg0OFx1NTQwRFx1NzlGMCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHBsYW4gPSB0aGlzLmNyZWF0ZVBsYW4odHJpbW1lZCk7XG4gICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc3luY1BsYW5zID0gW3BsYW4sIC4uLnRoaXMucGx1Z2luLnNldHRpbmdzLnN5bmNQbGFuc107XG4gICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdFN5bmNQbGFuSWQgPSBwbGFuLmlkO1xuICAgIHRoaXMucGVuZGluZ1BsYW5OYW1lID0gJyc7XG4gICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgdGhpcy5yZW5kZXJEeW5hbWljKCk7XG4gICAgdGhpcy5zZXRSZXN1bHQoYFx1NURGMlx1NEZERFx1NUI1OFx1NTQwQ1x1NkI2NVx1NjVCOVx1Njg0OFx1RkYxQSR7cGxhbi5uYW1lfWApO1xuICAgIG5ldyBOb3RpY2UoJ1x1NTQwQ1x1NkI2NVx1NjVCOVx1Njg0OFx1NURGMlx1NEZERFx1NUI1OCcpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyB1cGRhdGVDdXJyZW50UGxhbigpIHtcbiAgICBjb25zdCBwbGFuSWQgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWZhdWx0U3luY1BsYW5JZDtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnN5bmNQbGFucy5maW5kSW5kZXgocGxhbiA9PiBwbGFuLmlkID09PSBwbGFuSWQpO1xuICAgIGlmIChpbmRleCA9PT0gLTEpIHtcbiAgICAgIG5ldyBOb3RpY2UoJ1x1OEJGN1x1NTE0OFx1OTAwOVx1NjJFOVx1NEUwMFx1NEUyQVx1ODk4MVx1NjZGNFx1NjVCMFx1NzY4NFx1NTQwQ1x1NkI2NVx1NjVCOVx1Njg0OCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGN1cnJlbnQgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zeW5jUGxhbnNbaW5kZXhdO1xuICAgIGNvbnN0IG5leHQgPSB0aGlzLmNyZWF0ZVBsYW4oY3VycmVudC5uYW1lLCBjdXJyZW50LmlkKTtcbiAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zeW5jUGxhbnMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zeW5jUGxhbnMubWFwKHBsYW4gPT4gcGxhbi5pZCA9PT0gY3VycmVudC5pZCA/IG5leHQgOiBwbGFuKTtcbiAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICB0aGlzLnJlbmRlckR5bmFtaWMoKTtcbiAgICB0aGlzLnNldFJlc3VsdChgXHU1REYyXHU2NkY0XHU2NUIwXHU1NDBDXHU2QjY1XHU2NUI5XHU2ODQ4XHVGRjFBJHtuZXh0Lm5hbWV9YCk7XG4gICAgbmV3IE5vdGljZSgnXHU1NDBDXHU2QjY1XHU2NUI5XHU2ODQ4XHU1REYyXHU2NkY0XHU2NUIwJyk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGRlbGV0ZUN1cnJlbnRQbGFuKCkge1xuICAgIGNvbnN0IHBsYW5JZCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRTeW5jUGxhbklkO1xuICAgIGNvbnN0IHBsYW4gPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zeW5jUGxhbnMuZmluZChpdGVtID0+IGl0ZW0uaWQgPT09IHBsYW5JZCk7XG4gICAgaWYgKCFwbGFuKSB7XG4gICAgICBuZXcgTm90aWNlKCdcdThCRjdcdTUxNDhcdTkwMDlcdTYyRTlcdTRFMDBcdTRFMkFcdTg5ODFcdTUyMjBcdTk2NjRcdTc2ODRcdTU0MENcdTZCNjVcdTY1QjlcdTY4NDgnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCF3aW5kb3cuY29uZmlybShgXHU3ODZFXHU1QjlBXHU1MjIwXHU5NjY0XHU1NDBDXHU2QjY1XHU2NUI5XHU2ODQ4XHUzMDBDJHtwbGFuLm5hbWV9XHUzMDBEXHU1NDE3XHVGRjFGYCkpIHJldHVybjtcblxuICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnN5bmNQbGFucyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnN5bmNQbGFucy5maWx0ZXIoaXRlbSA9PiBpdGVtLmlkICE9PSBwbGFuLmlkKTtcbiAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWZhdWx0U3luY1BsYW5JZCA9ICcnO1xuICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgIHRoaXMucmVuZGVyRHluYW1pYygpO1xuICAgIHRoaXMuc2V0UmVzdWx0KGBcdTVERjJcdTUyMjBcdTk2NjRcdTU0MENcdTZCNjVcdTY1QjlcdTY4NDhcdUZGMUEke3BsYW4ubmFtZX1gKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlUGxhbihuYW1lOiBzdHJpbmcsIGlkID0gYHBsYW4tJHtEYXRlLm5vdygpfWApOiBCcmlkZ2VTeW5jUGxhbiB7XG4gICAgY29uc3Qgb2JzaWRpYW5Hcm91cHMgPSB0aGlzLmJ1aWxkT2JzaWRpYW5Hcm91cHMoKTtcbiAgICBjb25zdCB3aXNlTWluZEdyb3VwcyA9IHRoaXMuYnVpbGRXaXNlTWluZFNvdXJjZUdyb3Vwcyh0aGlzLmFjdGl2ZVdpc2VNaW5kQ2F0ZWdvcnkpO1xuICAgIHJldHVybiB7XG4gICAgICBpZCxcbiAgICAgIG5hbWUsXG4gICAgICBkaXJlY3Rpb246IHRoaXMuZGlyZWN0aW9uLFxuICAgICAgb2JzaWRpYW5QYXRoczogQXJyYXkuZnJvbSh0aGlzLnNlbGVjdGVkT2JzaWRpYW4pLFxuICAgICAgb2JzaWRpYW5Gb2xkZXJzOiBnZXRGdWxseVNlbGVjdGVkR3JvdXBJZHMob2JzaWRpYW5Hcm91cHMsIHRoaXMuc2VsZWN0ZWRPYnNpZGlhbiwgaXRlbSA9PiBpdGVtLnBhdGgpLFxuICAgICAgd2lzZU1pbmREZXN0aW5hdGlvbktleXM6IEFycmF5LmZyb20odGhpcy5zZWxlY3RlZFdpc2VNaW5kRGVzdGluYXRpb25zKSxcbiAgICAgIG9ic2lkaWFuVGFyZ2V0Rm9sZGVyczogQXJyYXkuZnJvbSh0aGlzLnNlbGVjdGVkT2JzaWRpYW5UYXJnZXRGb2xkZXJzKSxcbiAgICAgIG9ic2lkaWFuVGFyZ2V0Rm9sZGVyOiBBcnJheS5mcm9tKHRoaXMuc2VsZWN0ZWRPYnNpZGlhblRhcmdldEZvbGRlcnMpWzBdIHx8ICcnLFxuICAgICAgd2lzZU1pbmRLZXlzOiBBcnJheS5mcm9tKHRoaXMuc2VsZWN0ZWRXaXNlTWluZCksXG4gICAgICB3aXNlTWluZEdyb3VwSWRzOiBnZXRGdWxseVNlbGVjdGVkR3JvdXBJZHMod2lzZU1pbmRHcm91cHMsIHRoaXMuc2VsZWN0ZWRXaXNlTWluZCwgc291cmNlS2V5KSxcbiAgICAgIHdpc2VNaW5kQ2F0ZWdvcnk6IHRoaXMuYWN0aXZlV2lzZU1pbmRDYXRlZ29yeSxcbiAgICAgIGltcG9ydFRhcmdldHM6IHtcbiAgICAgICAgbm90ZXM6IHRoaXMuaW1wb3J0VGFyZ2V0cy5oYXMoJ25vdGVzJyksXG4gICAgICAgIGRvY3VtZW50czogdGhpcy5pbXBvcnRUYXJnZXRzLmhhcygnZG9jdW1lbnRzJyksXG4gICAgICAgIGtub3dsZWRnZTogdGhpcy5pbXBvcnRUYXJnZXRzLmhhcygna25vd2xlZGdlJyksXG4gICAgICB9LFxuICAgICAgdXBkYXRlZEF0OiBEYXRlLm5vdygpLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGFwcGx5RGVmYXVsdFBsYW4oKSB7XG4gICAgY29uc3QgcGxhbiA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnN5bmNQbGFucy5maW5kKGl0ZW0gPT4gaXRlbS5pZCA9PT0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdFN5bmNQbGFuSWQpO1xuICAgIGlmIChwbGFuKSB0aGlzLmFwcGx5UGxhbihwbGFuKTtcbiAgfVxuXG4gIHByaXZhdGUgYXBwbHlQbGFuKHBsYW46IEJyaWRnZVN5bmNQbGFuKSB7XG4gICAgdGhpcy5kaXJlY3Rpb24gPSBwbGFuLmRpcmVjdGlvbjtcbiAgICB0aGlzLmFjdGl2ZVdpc2VNaW5kQ2F0ZWdvcnkgPSBwbGFuLndpc2VNaW5kQ2F0ZWdvcnkgfHwgJ2RvY3VtZW50cyc7XG4gICAgdGhpcy5pbXBvcnRUYXJnZXRzID0gdGFyZ2V0U2V0RnJvbVNldHRpbmdzKHBsYW4uaW1wb3J0VGFyZ2V0cyk7XG4gICAgdGhpcy5zZWxlY3RlZFdpc2VNaW5kRGVzdGluYXRpb25zID0gbmV3IFNldChwbGFuLndpc2VNaW5kRGVzdGluYXRpb25LZXlzIHx8IFtdKTtcbiAgICBpZiAoIXRoaXMuc2VsZWN0ZWRXaXNlTWluZERlc3RpbmF0aW9ucy5zaXplKSB7XG4gICAgICB0aGlzLnNlbGVjdGVkV2lzZU1pbmREZXN0aW5hdGlvbnMgPSBuZXcgU2V0KHRoaXMuZ2V0RGVmYXVsdERlc3RpbmF0aW9uS2V5cygpKTtcbiAgICB9XG4gICAgdGhpcy5zZWxlY3RlZE9ic2lkaWFuVGFyZ2V0Rm9sZGVycyA9IG5ldyBTZXQoXG4gICAgICBwbGFuLm9ic2lkaWFuVGFyZ2V0Rm9sZGVycz8ubGVuZ3RoXG4gICAgICAgID8gcGxhbi5vYnNpZGlhblRhcmdldEZvbGRlcnNcbiAgICAgICAgOiBbcGxhbi5vYnNpZGlhblRhcmdldEZvbGRlciA/PyB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWZhdWx0T2JzaWRpYW5Sb290Rm9sZGVyXSxcbiAgICApO1xuXG4gICAgY29uc3Qgb2JzaWRpYW5QYXRocyA9IG5ldyBTZXQocGxhbi5vYnNpZGlhblBhdGhzIHx8IFtdKTtcbiAgICB0aGlzLmJ1aWxkT2JzaWRpYW5Hcm91cHMoKS5mb3JFYWNoKGdyb3VwID0+IHtcbiAgICAgIGlmICgocGxhbi5vYnNpZGlhbkZvbGRlcnMgfHwgW10pLmluY2x1ZGVzKGdyb3VwLmlkKSkge1xuICAgICAgICBncm91cC5pdGVtcy5mb3JFYWNoKGl0ZW0gPT4gb2JzaWRpYW5QYXRocy5hZGQoaXRlbS5wYXRoKSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5zZWxlY3RlZE9ic2lkaWFuID0gbmV3IFNldCh0aGlzLm9ic2lkaWFuSXRlbXMuZmlsdGVyKGl0ZW0gPT4gb2JzaWRpYW5QYXRocy5oYXMoaXRlbS5wYXRoKSkubWFwKGl0ZW0gPT4gaXRlbS5wYXRoKSk7XG5cbiAgICBjb25zdCB3aXNlTWluZEtleXMgPSBuZXcgU2V0KHBsYW4ud2lzZU1pbmRLZXlzIHx8IFtdKTtcbiAgICB0aGlzLmJ1aWxkV2lzZU1pbmRTb3VyY2VHcm91cHModGhpcy5hY3RpdmVXaXNlTWluZENhdGVnb3J5KS5mb3JFYWNoKGdyb3VwID0+IHtcbiAgICAgIGlmICgocGxhbi53aXNlTWluZEdyb3VwSWRzIHx8IFtdKS5pbmNsdWRlcyhncm91cC5pZCkpIHtcbiAgICAgICAgZ3JvdXAuaXRlbXMuZm9yRWFjaChpdGVtID0+IHdpc2VNaW5kS2V5cy5hZGQoc291cmNlS2V5KGl0ZW0pKSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5zZWxlY3RlZFdpc2VNaW5kID0gbmV3IFNldCh0aGlzLndpc2VNaW5kSXRlbXMuZmlsdGVyKGl0ZW0gPT4gd2lzZU1pbmRLZXlzLmhhcyhzb3VyY2VLZXkoaXRlbSkpKS5tYXAoc291cmNlS2V5KSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVDdXJyZW50RGlyZWN0aW9uKCkge1xuICAgIGlmICh0aGlzLmRpcmVjdGlvbiA9PT0gJ3RvLXdpc2VtaW5kJykgYXdhaXQgdGhpcy5pbXBvcnRUb1dpc2VNaW5kKCk7XG4gICAgZWxzZSBhd2FpdCB0aGlzLmltcG9ydFRvT2JzaWRpYW4oKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaW1wb3J0VG9XaXNlTWluZCgpIHtcbiAgICBjb25zdCBpdGVtcyA9IHVuaXF1ZUJ5UGF0aCh0aGlzLm9ic2lkaWFuSXRlbXMuZmlsdGVyKGl0ZW0gPT4gdGhpcy5zZWxlY3RlZE9ic2lkaWFuLmhhcyhpdGVtLnBhdGgpKSk7XG4gICAgY29uc3QgZGVzdGluYXRpb25zID0gdGhpcy5nZXRTZWxlY3RlZERlc3RpbmF0aW9ucygpO1xuICAgIGlmICghaXRlbXMubGVuZ3RoKSB7XG4gICAgICBuZXcgTm90aWNlKCdcdThCRjdcdTUxNDhcdTU3MjhcdTVERTZcdTRGQTdcdTkwMDlcdTYyRTlcdTg5ODFcdTVCRkNcdTUxNjUgV2lzZU1pbmRBSSBcdTc2ODQgT2JzaWRpYW4gXHU3QjE0XHU4QkIwXHU2MjE2XHU2NTg3XHU0RUY2XHU1OTM5Jyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghZGVzdGluYXRpb25zLmxlbmd0aCkge1xuICAgICAgbmV3IE5vdGljZSgnXHU4QkY3XHU5MDA5XHU2MkU5IFdpc2VNaW5kQUkgXHU3NkVFXHU2ODA3XHU2NTg3XHU0RUY2XHU1OTM5XHU2MjE2XHU3N0U1XHU4QkM2XHU1RTkzJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IG5vdGVGb2xkZXJQYXRocyA9IGRlc3RpbmF0aW9ucy5maWx0ZXIoaXRlbSA9PiBpdGVtLnRhcmdldCA9PT0gJ25vdGVzJykubWFwKGl0ZW0gPT4gaXRlbS52YWx1ZSk7XG4gICAgY29uc3QgZG9jdW1lbnRGb2xkZXJQYXRocyA9IGRlc3RpbmF0aW9ucy5maWx0ZXIoaXRlbSA9PiBpdGVtLnRhcmdldCA9PT0gJ2RvY3VtZW50cycpLm1hcChpdGVtID0+IGl0ZW0udmFsdWUpO1xuICAgIGNvbnN0IGtub3dsZWRnZUJhc2VOYW1lcyA9IGRlc3RpbmF0aW9ucy5maWx0ZXIoaXRlbSA9PiBpdGVtLnRhcmdldCA9PT0gJ2tub3dsZWRnZScpLm1hcChpdGVtID0+IGl0ZW0udmFsdWUgfHwgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdEtub3dsZWRnZUJhc2VOYW1lKTtcbiAgICBjb25zdCB0YXJnZXRzID0ge1xuICAgICAgbm90ZXM6IG5vdGVGb2xkZXJQYXRocy5sZW5ndGggPiAwLFxuICAgICAgZG9jdW1lbnRzOiBkb2N1bWVudEZvbGRlclBhdGhzLmxlbmd0aCA+IDAsXG4gICAgICBrbm93bGVkZ2U6IGtub3dsZWRnZUJhc2VOYW1lcy5sZW5ndGggPiAwLFxuICAgIH07XG5cbiAgICB0aGlzLnBsdWdpbi5zdGF0dXNCYXIuc2V0U3luY2luZygpO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHJ1bk9ic2lkaWFuVG9XaXNlTWluZEltcG9ydCh7XG4gICAgICBpdGVtcyxcbiAgICAgIGFwaTogdGhpcy5wbHVnaW4uYXBpLFxuICAgICAgdGFyZ2V0cyxcbiAgICAgIG5vdGVGb2xkZXJQYXRocyxcbiAgICAgIGRvY3VtZW50Rm9sZGVyUGF0aHMsXG4gICAgICBrbm93bGVkZ2VCYXNlTmFtZXMsXG4gICAgICBkdXBsaWNhdGVQb2xpY3k6IHRoaXMub3ZlcndyaXRlRXhpc3RpbmcgPyAndXBkYXRlJyA6ICdkdXBsaWNhdGUnLFxuICAgICAga25vd2xlZGdlQmFzZU5hbWU6IHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRLbm93bGVkZ2VCYXNlTmFtZSxcbiAgICAgIGNodW5rU2l6ZTogdGhpcy5wbHVnaW4uc2V0dGluZ3MuY2h1bmtTaXplLFxuICAgICAgb25Qcm9ncmVzczogcHJvZ3Jlc3MgPT4gdGhpcy5zZXRSZXN1bHQoZm9ybWF0UmVzdWx0KHByb2dyZXNzKSksXG4gICAgfSk7XG4gICAgdGhpcy5wbHVnaW4uc3RhdHVzQmFyLnNldFJlc3VsdChyZXN1bHQpO1xuICAgIHRoaXMuc2V0UmVzdWx0KGZvcm1hdFJlc3VsdChyZXN1bHQpKTtcbiAgICBhd2FpdCB0aGlzLnJlY29yZEhpc3Rvcnkoe1xuICAgICAgZGlyZWN0aW9uOiAndG8td2lzZW1pbmQnLFxuICAgICAgc291cmNlTGFiZWw6ICdPYnNpZGlhbiBcdTVGNTNcdTUyNERcdTRFRDNcdTVFOTMnLFxuICAgICAgdGFyZ2V0TGFiZWw6ICdXaXNlTWluZEFJJyxcbiAgICAgIHNvdXJjZUZvbGRlcnM6IHVuaXF1ZShpdGVtcy5tYXAoaXRlbSA9PiBpdGVtLmZvbGRlclBhdGggfHwgJ1x1NjgzOVx1NzZFRVx1NUY1NScpKSxcbiAgICAgIHRhcmdldEZvbGRlcnM6IGRlc3RpbmF0aW9ucy5tYXAoaXRlbSA9PiBgJHtkZXN0aW5hdGlvblR5cGVMYWJlbChpdGVtLnRhcmdldCl9XHVGRjFBJHtpdGVtLnRpdGxlfWApLFxuICAgICAgaXRlbVRpdGxlczogaXRlbXMubWFwKGl0ZW0gPT4gaXRlbS50aXRsZSksXG4gICAgICByZXN1bHQsXG4gICAgfSk7XG4gICAgbmV3IE5vdGljZShgXHU1QkZDXHU1MTY1XHU1QjhDXHU2MjEwXHVGRjFBXHU2MjEwXHU1MjlGICR7cmVzdWx0LmNyZWF0ZWQgKyByZXN1bHQudXBkYXRlZH1cdUZGMENcdTU5MzFcdThEMjUgJHtyZXN1bHQuZmFpbGVkfWApO1xuICAgIGF3YWl0IHRoaXMucmVmcmVzaCh0cnVlKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaW1wb3J0VG9PYnNpZGlhbigpIHtcbiAgICBjb25zdCBpdGVtcyA9IHRoaXMuZ2V0U2VsZWN0ZWRXaXNlTWluZEZvckFjdGl2ZUNhdGVnb3J5KCk7XG4gICAgaWYgKCFpdGVtcy5sZW5ndGgpIHtcbiAgICAgIG5ldyBOb3RpY2UoJ1x1OEJGN1x1NTE0OFx1NTcyOFx1NURFNlx1NEZBN1x1OTAwOVx1NjJFOVx1ODk4MVx1NTQwQ1x1NkI2NVx1NTIzMCBPYnNpZGlhbiBcdTc2ODQgV2lzZU1pbmRBSSBcdTUxODVcdTVCQjlcdTYyMTZcdTY1ODdcdTRFRjZcdTU5MzknKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qgcm9vdEZvbGRlcnMgPSBBcnJheS5mcm9tKHRoaXMuc2VsZWN0ZWRPYnNpZGlhblRhcmdldEZvbGRlcnMpO1xuICAgIGlmICghcm9vdEZvbGRlcnMubGVuZ3RoKSB7XG4gICAgICBuZXcgTm90aWNlKCdcdThCRjdcdTkwMDlcdTYyRTkgT2JzaWRpYW4gXHU3NkVFXHU2ODA3XHU2NTg3XHU0RUY2XHU1OTM5Jyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMucGx1Z2luLnN0YXR1c0Jhci5zZXRTeW5jaW5nKCk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcnVuV2lzZU1pbmRUb09ic2lkaWFuSW1wb3J0KHtcbiAgICAgIGFwcDogdGhpcy5hcHAsXG4gICAgICBpdGVtcyxcbiAgICAgIHJvb3RGb2xkZXI6IHJvb3RGb2xkZXJzWzBdIHx8ICcnLFxuICAgICAgcm9vdEZvbGRlcnMsXG4gICAgICBpbmNsdWRlRm9sZGVyU3RydWN0dXJlOiB0aGlzLmluY2x1ZGVPYnNpZGlhbkZvbGRlcnMsXG4gICAgICBkdXBsaWNhdGVQb2xpY3k6IHRoaXMub3ZlcndyaXRlRXhpc3RpbmcgPyAndXBkYXRlJyA6ICdkdXBsaWNhdGUnLFxuICAgICAgY2h1bmtTaXplOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jaHVua1NpemUsXG4gICAgICBvblByb2dyZXNzOiBwcm9ncmVzcyA9PiB0aGlzLnNldFJlc3VsdChmb3JtYXRSZXN1bHQocHJvZ3Jlc3MpKSxcbiAgICB9KTtcbiAgICB0aGlzLnBsdWdpbi5zdGF0dXNCYXIuc2V0UmVzdWx0KHJlc3VsdCk7XG4gICAgdGhpcy5zZXRSZXN1bHQoZm9ybWF0UmVzdWx0KHJlc3VsdCkpO1xuICAgIGF3YWl0IHRoaXMucmVjb3JkSGlzdG9yeSh7XG4gICAgICBkaXJlY3Rpb246ICd0by1vYnNpZGlhbicsXG4gICAgICBzb3VyY2VMYWJlbDogYFdpc2VNaW5kQUkgJHtjYXRlZ29yeUxhYmVsKHRoaXMuYWN0aXZlV2lzZU1pbmRDYXRlZ29yeSl9YCxcbiAgICAgIHRhcmdldExhYmVsOiAnT2JzaWRpYW4gXHU1RjUzXHU1MjREXHU0RUQzXHU1RTkzJyxcbiAgICAgIHNvdXJjZUZvbGRlcnM6IHVuaXF1ZShpdGVtcy5tYXAoaXRlbSA9PiBpdGVtLnNvdXJjZVR5cGUgPT09ICdrbm93bGVkZ2UtZG9jdW1lbnQnID8gaXRlbS5rbm93bGVkZ2VCYXNlTmFtZSB8fCAnXHU3N0U1XHU4QkM2XHU1RTkzJyA6IGl0ZW0uZm9sZGVyUGF0aCB8fCAnXHU2NzJBXHU1MjA2XHU3RUM0JykpLFxuICAgICAgdGFyZ2V0Rm9sZGVyczogcm9vdEZvbGRlcnMubWFwKGZvbGRlciA9PiBmb2xkZXIgfHwgJ1x1NjgzOVx1NzZFRVx1NUY1NScpLFxuICAgICAgaXRlbVRpdGxlczogaXRlbXMubWFwKGl0ZW0gPT4gaXRlbS50aXRsZSksXG4gICAgICByZXN1bHQsXG4gICAgfSk7XG4gICAgbmV3IE5vdGljZShgXHU1NDBDXHU2QjY1XHU1QjhDXHU2MjEwXHVGRjFBXHU2MjEwXHU1MjlGICR7cmVzdWx0LmNyZWF0ZWQgKyByZXN1bHQudXBkYXRlZH1cdUZGMENcdTU5MzFcdThEMjUgJHtyZXN1bHQuZmFpbGVkfWApO1xuICAgIGF3YWl0IHRoaXMucmVmcmVzaCh0cnVlKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmVjb3JkSGlzdG9yeShwYXJhbXM6IHtcbiAgICBkaXJlY3Rpb246IERpcmVjdGlvbjtcbiAgICBzb3VyY2VMYWJlbDogc3RyaW5nO1xuICAgIHRhcmdldExhYmVsOiBzdHJpbmc7XG4gICAgc291cmNlRm9sZGVyczogc3RyaW5nW107XG4gICAgdGFyZ2V0Rm9sZGVyczogc3RyaW5nW107XG4gICAgaXRlbVRpdGxlczogc3RyaW5nW107XG4gICAgcmVzdWx0OiBCcmlkZ2VSdW5SZXN1bHQ7XG4gIH0pIHtcbiAgICBjb25zdCBpdGVtOiBCcmlkZ2VTeW5jSGlzdG9yeUl0ZW0gPSB7XG4gICAgICBpZDogYGhpc3RvcnktJHtEYXRlLm5vdygpfWAsXG4gICAgICBjcmVhdGVkQXQ6IERhdGUubm93KCksXG4gICAgICBkaXJlY3Rpb246IHBhcmFtcy5kaXJlY3Rpb24sXG4gICAgICBzb3VyY2VMYWJlbDogcGFyYW1zLnNvdXJjZUxhYmVsLFxuICAgICAgdGFyZ2V0TGFiZWw6IHBhcmFtcy50YXJnZXRMYWJlbCxcbiAgICAgIHNvdXJjZUZvbGRlcnM6IHVuaXF1ZShwYXJhbXMuc291cmNlRm9sZGVycyksXG4gICAgICB0YXJnZXRGb2xkZXJzOiB1bmlxdWUocGFyYW1zLnRhcmdldEZvbGRlcnMpLFxuICAgICAgaXRlbVRpdGxlczogdW5pcXVlKHBhcmFtcy5pdGVtVGl0bGVzKSxcbiAgICAgIGNyZWF0ZWQ6IHBhcmFtcy5yZXN1bHQuY3JlYXRlZCxcbiAgICAgIHVwZGF0ZWQ6IHBhcmFtcy5yZXN1bHQudXBkYXRlZCxcbiAgICAgIHNraXBwZWQ6IHBhcmFtcy5yZXN1bHQuc2tpcHBlZCxcbiAgICAgIGZhaWxlZDogcGFyYW1zLnJlc3VsdC5mYWlsZWQsXG4gICAgfTtcbiAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zeW5jSGlzdG9yeSA9IFtpdGVtLCAuLi4odGhpcy5wbHVnaW4uc2V0dGluZ3Muc3luY0hpc3RvcnkgfHwgW10pXS5zbGljZSgwLCA1MCk7XG4gICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gIH1cblxuICBwcml2YXRlIHNldFJlc3VsdCh0ZXh0OiBzdHJpbmcpIHtcbiAgICAvLyBcdTdFRDNcdTY3OUNcdThCRTZcdTYwQzVcdTRFMERcdTUxOERcdTUzNjBcdTc1MjhcdTk4NzVcdTk3NjJcdTdBN0FcdTk1RjRcdUZGMENcdTUxNzNcdTk1MkVcdTcyQjZcdTYwMDFcdTkwMUFcdThGQzdcdTkwMUFcdTc3RTVcdTU0OENcdTcyQjZcdTYwMDFcdTY4MEZcdTUzQ0RcdTk5ODhcdTMwMDJcbiAgICB2b2lkIHRleHQ7XG4gIH1cblxuICBwcml2YXRlIGZvY3VzU2VhcmNoKHBsYWNlaG9sZGVyOiBzdHJpbmcsIGNhcmV0OiBudW1iZXIpIHtcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgIGNvbnN0IGlucHV0ID0gQXJyYXkuZnJvbSh0aGlzLmNvbnRlbnRFbC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dCcpKVxuICAgICAgICAuZmluZChpdGVtID0+IGl0ZW0uZ2V0QXR0cmlidXRlKCdwbGFjZWhvbGRlcicpID09PSBwbGFjZWhvbGRlcikgYXMgSFRNTElucHV0RWxlbWVudCB8IHVuZGVmaW5lZDtcbiAgICAgIGlmICghaW5wdXQpIHJldHVybjtcbiAgICAgIGlucHV0LmZvY3VzKCk7XG4gICAgICBpbnB1dC5zZXRTZWxlY3Rpb25SYW5nZShjYXJldCwgY2FyZXQpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRJY29uU3ZnKG5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBJQ09OU1tuYW1lXSB8fCAnJztcbiAgfVxufVxuXG5jb25zdCBJQ09OUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgJ3dpc2VtaW5kYWktbG9nby5zdmcnOiB3aXNlTWluZExvZ29JY29uLFxuICAnZG9jdW1lbnQuc3ZnJzogZG9jdW1lbnRJY29uLFxuICAnaG9tZS5zdmcnOiBob21lSWNvbixcbiAgJ2tub3dsZWRnZS5zdmcnOiBrbm93bGVkZ2VJY29uLFxuICAnbWFya2Rvd24uc3ZnJzogbWFya2Rvd25JY29uLFxuICAnbm90ZS5zdmcnOiBub3RlSWNvbixcbiAgJ3N5bmMtdG8tb2JzaWRpYW4uc3ZnJzogc3luY1RvT2JzaWRpYW5JY29uLFxuICAnc3luYy10by13aXNlbWluZC5zdmcnOiBzeW5jVG9XaXNlTWluZEljb24sXG4gICd0by1yaWdodC5zdmcnOiB0b1JpZ2h0SWNvbixcbiAgJ2NoZXZyb24tZG93bi5zdmcnOiBjaGV2cm9uRG93bkljb24sXG4gICdjaGV2cm9uLXJpZ2h0LnN2Zyc6IGNoZXZyb25SaWdodEljb24sXG4gICdhcnJvdy1wYXRoLnN2Zyc6IGFycm93UGF0aEljb24sXG4gICdib29rbWFyay1zcXVhcmUuc3ZnJzogYm9va21hcmtTcXVhcmVJY29uLFxuICAnY2hlY2stY2lyY2xlLnN2Zyc6IGNoZWNrQ2lyY2xlSWNvbixcbiAgJ2Nsb2NrLnN2Zyc6IGNsb2NrSWNvbixcbiAgJ3BlbmNpbC1zcXVhcmUuc3ZnJzogcGVuY2lsU3F1YXJlSWNvbixcbiAgJ3BsdXMuc3ZnJzogcGx1c0ljb24sXG4gICd0cmFzaC5zdmcnOiB0cmFzaEljb24sXG4gICd4LW1hcmsuc3ZnJzogeE1hcmtJY29uLFxufTtcblxuY29uc3QgcmVuZGVyU3VtbWFyeUJsb2NrID0gKHRpdGxlOiBzdHJpbmcsIGl0ZW1zOiBBcnJheTx7IHZhbHVlOiBudW1iZXI7IGxhYmVsOiBzdHJpbmcgfT4pID0+IHtcbiAgY29uc3QgYmxvY2sgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgYmxvY2suY2xhc3NOYW1lID0gJ3dpc2VtaW5kLWJyaWRnZS1zdW1tYXJ5LWJsb2NrJztcbiAgYmxvY2suY3JlYXRlRWwoJ3N0cm9uZycsIHsgdGV4dDogdGl0bGUgfSk7XG4gIGNvbnN0IG1ldHJpY3MgPSBibG9jay5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2Utc3VtbWFyeS1tZXRyaWNzJyB9KTtcbiAgaXRlbXMuZm9yRWFjaChpdGVtID0+IHtcbiAgICBjb25zdCBtZXRyaWMgPSBtZXRyaWNzLmNyZWF0ZURpdih7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1zdW1tYXJ5LW1ldHJpYycgfSk7XG4gICAgbWV0cmljLmNyZWF0ZUVsKCdzcGFuJywgeyB0ZXh0OiBTdHJpbmcoaXRlbS52YWx1ZSkgfSk7XG4gICAgbWV0cmljLmNyZWF0ZUVsKCdlbScsIHsgdGV4dDogaXRlbS5sYWJlbCB9KTtcbiAgfSk7XG4gIHJldHVybiBibG9jaztcbn07XG5cbmNvbnN0IHJlbmRlclBhbmVsID0gKHBhcmFtczoge1xuICB0aXRsZTogc3RyaW5nO1xuICBkZXNjOiBzdHJpbmc7XG4gIGNvdW50VGV4dD86IHN0cmluZztcbiAgc2VhcmNoVmFsdWU/OiBzdHJpbmc7XG4gIHNlYXJjaFBsYWNlaG9sZGVyPzogc3RyaW5nO1xuICBvblNlYXJjaD86ICh2YWx1ZTogc3RyaW5nKSA9PiB2b2lkO1xuICBhbGxTZWxlY3RlZD86IGJvb2xlYW47XG4gIG9uVG9nZ2xlQWxsPzogKCkgPT4gdm9pZDtcbn0pID0+IHtcbiAgY29uc3QgcGFuZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzZWN0aW9uJyk7XG4gIHBhbmVsLmNsYXNzTmFtZSA9ICd3aXNlbWluZC1icmlkZ2UtcGFuZWwnO1xuICBjb25zdCBoZWFkZXIgPSBwYW5lbC5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtcGFuZWwtaGVhZGVyJyB9KTtcbiAgY29uc3QgdGV4dCA9IGhlYWRlci5jcmVhdGVEaXYoKTtcbiAgdGV4dC5jcmVhdGVFbCgnc3Ryb25nJywgeyB0ZXh0OiBwYXJhbXMudGl0bGUgfSk7XG4gIHRleHQuY3JlYXRlRWwoJ3NwYW4nLCB7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1tdXRlZCcsIHRleHQ6IHBhcmFtcy5kZXNjIH0pO1xuICBjb25zdCByaWdodCA9IGhlYWRlci5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtcGFuZWwtcmlnaHQnIH0pO1xuICBpZiAocGFyYW1zLmNvdW50VGV4dCkge1xuICAgIHJpZ2h0LmNyZWF0ZUVsKCdzcGFuJywgeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtcGFuZWwtY291bnQnLCB0ZXh0OiBwYXJhbXMuY291bnRUZXh0IH0pO1xuICB9XG4gIGlmIChwYXJhbXMub25Ub2dnbGVBbGwpIHtcbiAgICBjb25zdCBhY3Rpb25zID0gcmlnaHQuY3JlYXRlRGl2KHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLWdyb3VwLWFjdGlvbnMnIH0pO1xuICAgIGFjdGlvbnMuYXBwZW5kKGNyZWF0ZVRleHRCdXR0b24ocGFyYW1zLmFsbFNlbGVjdGVkID8gJ1x1NkUwNVx1N0E3QScgOiAnXHU1MTY4XHU5MDA5JywgcGFyYW1zLm9uVG9nZ2xlQWxsKSk7XG4gIH1cbiAgaWYgKHBhcmFtcy5vblNlYXJjaCkge1xuICAgIGNvbnN0IHNlYXJjaCA9IHBhbmVsLmNyZWF0ZUVsKCdpbnB1dCcsIHtcbiAgICAgIGNsczogJ3dpc2VtaW5kLWJyaWRnZS1zZWFyY2gnLFxuICAgICAgYXR0cjogeyBwbGFjZWhvbGRlcjogcGFyYW1zLnNlYXJjaFBsYWNlaG9sZGVyIHx8ICdcdTY0MUNcdTdEMjInIH0sXG4gICAgfSk7XG4gICAgc2VhcmNoLnZhbHVlID0gcGFyYW1zLnNlYXJjaFZhbHVlIHx8ICcnO1xuICAgIHNlYXJjaC5vbmlucHV0ID0gKCkgPT4gcGFyYW1zLm9uU2VhcmNoPy4oc2VhcmNoLnZhbHVlKTtcbiAgfVxuICByZXR1cm4gcGFuZWw7XG59O1xuXG5jb25zdCByZW5kZXJBcnJvdyA9IChpY29uOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgYXJyb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgYXJyb3cuY2xhc3NOYW1lID0gJ3dpc2VtaW5kLWJyaWRnZS1hcnJvdyc7XG4gIGFycm93LmFwcGVuZENoaWxkKGNyZWF0ZUlubGluZUljb24oaWNvbiwgJ1x1NTQwQ1x1NkI2NVx1NjVCOVx1NTQxMScpKTtcbiAgcmV0dXJuIGFycm93O1xufTtcblxuY29uc3QgcmVuZGVyQ2hlY2tSb3cgPSAocGFyYW1zOiB7XG4gIGNoZWNrZWQ6IGJvb2xlYW47XG4gIHRpdGxlOiBzdHJpbmc7XG4gIG1ldGE6IHN0cmluZztcbiAgb25DaGFuZ2U6IChjaGVja2VkOiBib29sZWFuKSA9PiB2b2lkO1xufSkgPT4ge1xuICBjb25zdCByb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsYWJlbCcpO1xuICByb3cuY2xhc3NOYW1lID0gJ3dpc2VtaW5kLWJyaWRnZS1yb3cnO1xuICBjb25zdCBsZWZ0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICBsZWZ0LmNsYXNzTmFtZSA9ICd3aXNlbWluZC1icmlkZ2Utcm93LW1haW4nO1xuICBjb25zdCBjaGVja2JveCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gIGNoZWNrYm94LnR5cGUgPSAnY2hlY2tib3gnO1xuICBjaGVja2JveC5jaGVja2VkID0gcGFyYW1zLmNoZWNrZWQ7XG4gIGNoZWNrYm94Lm9uY2hhbmdlID0gKCkgPT4gcGFyYW1zLm9uQ2hhbmdlKGNoZWNrYm94LmNoZWNrZWQpO1xuICBjb25zdCB0aXRsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgdGl0bGUuY2xhc3NOYW1lID0gJ3dpc2VtaW5kLWJyaWRnZS1yb3ctdGl0bGUnO1xuICB0aXRsZS50ZXh0Q29udGVudCA9IHBhcmFtcy50aXRsZTtcbiAgbGVmdC5hcHBlbmQoY2hlY2tib3gsIHRpdGxlKTtcbiAgY29uc3QgbWV0YSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgbWV0YS5jbGFzc05hbWUgPSAnd2lzZW1pbmQtYnJpZGdlLW11dGVkIHdpc2VtaW5kLWJyaWRnZS1yb3ctbWV0YSc7XG4gIG1ldGEudGV4dENvbnRlbnQgPSBwYXJhbXMubWV0YTtcbiAgcm93LmFwcGVuZChsZWZ0LCBtZXRhKTtcbiAgcmV0dXJuIHJvdztcbn07XG5cbmNvbnN0IHJlbmRlclNlbGVjdEZpZWxkID0gKHBhcmFtczoge1xuICB0aXRsZTogc3RyaW5nO1xuICBkZXNjOiBzdHJpbmc7XG4gIG9wdGlvbnM6IEFycmF5PHsgdmFsdWU6IHN0cmluZzsgdGl0bGU6IHN0cmluZyB9PjtcbiAgc2VsZWN0ZWQ6IHN0cmluZztcbiAgZW1wdHlUZXh0Pzogc3RyaW5nO1xuICBvbkNoYW5nZTogKHZhbHVlOiBzdHJpbmcpID0+IHZvaWQ7XG59KSA9PiB7XG4gIGNvbnN0IHJvdyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xhYmVsJyk7XG4gIHJvdy5jbGFzc05hbWUgPSAnd2lzZW1pbmQtYnJpZGdlLWNvbnRleHQtc2VsZWN0LXJvdyc7XG4gIGNvbnN0IGhlYWRlciA9IHJvdy5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtY29udGV4dC1zZWN0aW9uLWhlYWRlcicgfSk7XG4gIGhlYWRlci5jcmVhdGVFbCgnc3Ryb25nJywgeyB0ZXh0OiBwYXJhbXMudGl0bGUgfSk7XG4gIGhlYWRlci5jcmVhdGVFbCgnc3BhbicsIHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLW11dGVkJywgdGV4dDogcGFyYW1zLmRlc2MgfSk7XG5cbiAgaWYgKCFwYXJhbXMub3B0aW9ucy5sZW5ndGgpIHtcbiAgICByb3cuY3JlYXRlRWwoJ3NwYW4nLCB7IGNsczogJ3dpc2VtaW5kLWJyaWRnZS1tdXRlZCcsIHRleHQ6IHBhcmFtcy5lbXB0eVRleHQgfHwgJ1x1NkNBMVx1NjcwOVx1NTNFRlx1OTAwOVx1NjJFOVx1NzY4NFx1NzZFRVx1NjgwN1x1MzAwMicgfSk7XG4gICAgcmV0dXJuIHJvdztcbiAgfVxuICBjb25zdCBzZWxlY3QgPSByb3cuY3JlYXRlRWwoJ3NlbGVjdCcsIHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLXNlbGVjdCcgfSk7XG4gIHBhcmFtcy5vcHRpb25zLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICBjb25zdCBpdGVtID0gc2VsZWN0LmNyZWF0ZUVsKCdvcHRpb24nLCB7IHRleHQ6IG9wdGlvbi50aXRsZSB9KTtcbiAgICBpdGVtLnZhbHVlID0gb3B0aW9uLnZhbHVlO1xuICB9KTtcbiAgc2VsZWN0LnZhbHVlID0gcGFyYW1zLm9wdGlvbnMuc29tZShvcHRpb24gPT4gb3B0aW9uLnZhbHVlID09PSBwYXJhbXMuc2VsZWN0ZWQpXG4gICAgPyBwYXJhbXMuc2VsZWN0ZWRcbiAgICA6IHBhcmFtcy5vcHRpb25zWzBdPy52YWx1ZSB8fCAnJztcbiAgc2VsZWN0Lm9uY2hhbmdlID0gKCkgPT4gcGFyYW1zLm9uQ2hhbmdlKHNlbGVjdC52YWx1ZSk7XG4gIHBhcmFtcy5vbkNoYW5nZShzZWxlY3QudmFsdWUpO1xuICByZXR1cm4gcm93O1xufTtcblxuY29uc3QgcmVuZGVyRW1wdHkgPSAodGV4dDogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IGVtcHR5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGVtcHR5LmNsYXNzTmFtZSA9ICd3aXNlbWluZC1icmlkZ2UtZW1wdHknO1xuICBlbXB0eS50ZXh0Q29udGVudCA9IHRleHQ7XG4gIHJldHVybiBlbXB0eTtcbn07XG5cbmNvbnN0IHJlbmRlcldpc2VNaW5kQ29ubmVjdGlvbkVtcHR5ID0gKG1lc3NhZ2U6IHN0cmluZywgb25SZXRyeTogKCkgPT4gdW5rbm93biwgcmV0cnlJY29uOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgZW1wdHkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgZW1wdHkuY2xhc3NOYW1lID0gJ3dpc2VtaW5kLWJyaWRnZS1lbXB0eSB3aXNlbWluZC1icmlkZ2UtY29ubmVjdGlvbi1lbXB0eSc7XG4gIGVtcHR5LmNyZWF0ZUVsKCdzdHJvbmcnLCB7IHRleHQ6ICdcdTY3MkFcdThGREVcdTYzQTUgV2lzZU1pbmRBSScgfSk7XG4gIGVtcHR5LmNyZWF0ZUVsKCdwJywgeyB0ZXh0OiBtZXNzYWdlIHx8ICdcdThCRjdcdTUxNDhcdTU0MkZcdTUyQTggV2lzZU1pbmRBSSBcdTVFOTRcdTc1MjhcdUZGMENcdTVFNzZcdTc4NkVcdThCQTRcdTY3MkNcdTU3MzBcdTYzQTVcdTUzRTNcdTVERjJcdTVGMDBcdTU0MkZcdTMwMDInIH0pO1xuICBlbXB0eS5hcHBlbmRDaGlsZChjcmVhdGVCdXR0b24oJ1x1OTFDRFx1NjVCMFx1OEZERVx1NjNBNScsIG9uUmV0cnksICdzZWNvbmRhcnknLCByZXRyeUljb24pKTtcbiAgY29uc3QgbGluayA9IGVtcHR5LmNyZWF0ZUVsKCdhJywge1xuICAgIHRleHQ6ICdcdTUyNERcdTVGODAgd2lzZW1pbmRhaS5hcHAgXHU0RTBCXHU4RjdEXHU1Qjg5XHU4OEM1JyxcbiAgICBhdHRyOiB7XG4gICAgICBocmVmOiAnaHR0cHM6Ly93aXNlbWluZGFpLmFwcCcsXG4gICAgICB0YXJnZXQ6ICdfYmxhbmsnLFxuICAgICAgcmVsOiAnbm9vcGVuZXIgbm9yZWZlcnJlcicsXG4gICAgfSxcbiAgfSk7XG4gIGxpbmsub25jbGljayA9IGV2ZW50ID0+IGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICBlbXB0eS5jcmVhdGVFbCgncCcsIHsgdGV4dDogJ1x1NUI4OVx1ODhDNVx1NUU3Nlx1NTQyRlx1NTJBOFx1NTQwRVx1RkYwQ1x1NTcyOCBXaXNlTWluZEFJIFx1NURFNlx1NEUwQlx1ODlEMlx1NjI1M1x1NUYwMFx1OEJCRVx1N0Y2RVx1RkYwQ1x1OEZEQlx1NTE2NVx1MzAwQ1x1N0NGQlx1N0VERlx1OEJCRVx1N0Y2RVx1MzAwRC0+XHUzMDBDXHU2NzJDXHU1NzMwIEFQSSBcdTY3MERcdTUyQTFcdTMwMERcdUZGMENcdTVGMDBcdTU0MkZcdTY3MERcdTUyQTFcdTUzNzNcdTUzRUZcdThGREVcdTYzQTVcdTMwMDInIH0pO1xuICByZXR1cm4gZW1wdHk7XG59O1xuXG5jb25zdCBjcmVhdGVCdXR0b24gPSAodGV4dDogc3RyaW5nLCBvbkNsaWNrOiAoKSA9PiB1bmtub3duLCBraW5kOiAncHJpbWFyeScgfCAnc2Vjb25kYXJ5JywgaWNvbj86IHN0cmluZykgPT4ge1xuICBjb25zdCBidXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcbiAgYnV0dG9uLmNsYXNzTmFtZSA9IGB3aXNlbWluZC1icmlkZ2UtYnV0dG9uIGlzLSR7a2luZH1gO1xuICBpZiAoaWNvbikgYnV0dG9uLmFwcGVuZChjcmVhdGVJbmxpbmVJY29uKGljb24sIHRleHQpKTtcbiAgYnV0dG9uLmFwcGVuZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh0ZXh0KSk7XG4gIGJ1dHRvbi5vbmNsaWNrID0gKCkgPT4gdm9pZCBvbkNsaWNrKCk7XG4gIHJldHVybiBidXR0b247XG59O1xuXG5jb25zdCBjcmVhdGVJY29uQnV0dG9uID0gKGNvbnRlbnQ6IE5vZGUgfCBzdHJpbmcsIHRpdGxlOiBzdHJpbmcsIG9uQ2xpY2s6ICgpID0+IHVua25vd24pID0+IHtcbiAgY29uc3QgYnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG4gIGJ1dHRvbi5jbGFzc05hbWUgPSAnd2lzZW1pbmQtYnJpZGdlLWljb24tYnV0dG9uJztcbiAgaWYgKHR5cGVvZiBjb250ZW50ID09PSAnc3RyaW5nJykge1xuICAgIGJ1dHRvbi50ZXh0Q29udGVudCA9IGNvbnRlbnQ7XG4gIH0gZWxzZSB7XG4gICAgYnV0dG9uLmFwcGVuZENoaWxkKGNvbnRlbnQpO1xuICB9XG4gIGJ1dHRvbi50aXRsZSA9IHRpdGxlO1xuICBidXR0b24uc2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJywgdGl0bGUpO1xuICBidXR0b24ub25jbGljayA9IGV2ZW50ID0+IHtcbiAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB2b2lkIG9uQ2xpY2soKTtcbiAgfTtcbiAgcmV0dXJuIGJ1dHRvbjtcbn07XG5cbmNvbnN0IGNyZWF0ZVRleHRCdXR0b24gPSAodGV4dDogc3RyaW5nLCBvbkNsaWNrOiAoKSA9PiB1bmtub3duLCBpY29uPzogc3RyaW5nLCBleHRyYUNsYXNzID0gJycpID0+IHtcbiAgY29uc3QgYnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG4gIGJ1dHRvbi5jbGFzc05hbWUgPSBgd2lzZW1pbmQtYnJpZGdlLXRleHQtYnV0dG9uJHtleHRyYUNsYXNzID8gYCAke2V4dHJhQ2xhc3N9YCA6ICcnfWA7XG4gIGJ1dHRvbi50aXRsZSA9IHRleHQ7XG4gIGlmIChpY29uKSBidXR0b24uYXBwZW5kKGNyZWF0ZUlubGluZUljb24oaWNvbiwgdGV4dCkpO1xuICBidXR0b24uYXBwZW5kKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHRleHQpKTtcbiAgYnV0dG9uLm9uY2xpY2sgPSBldmVudCA9PiB7XG4gICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgdm9pZCBvbkNsaWNrKCk7XG4gIH07XG4gIHJldHVybiBidXR0b247XG59O1xuXG5jb25zdCBjcmVhdGVJbmxpbmVJY29uID0gKHN2Zzogc3RyaW5nLCBsYWJlbDogc3RyaW5nLCBjbHMgPSAnJykgPT4ge1xuICBjb25zdCBpY29uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICBpY29uLmNsYXNzTmFtZSA9IGB3aXNlbWluZC1icmlkZ2UtaW5saW5lLWljb24ke2NscyA/IGAgJHtjbHN9YCA6ICcnfWA7XG4gIGljb24uc2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJywgbGFiZWwpO1xuICBpY29uLmlubmVySFRNTCA9IHN2ZyB8fCAnJztcbiAgcmV0dXJuIGljb247XG59O1xuXG5jb25zdCBjYXRlZ29yeUljb24gPSAoY2F0ZWdvcnk6IFdpc2VNaW5kQ2F0ZWdvcnkpID0+XG4gIGNhdGVnb3J5ID09PSAnZG9jdW1lbnRzJyA/ICdkb2N1bWVudC5zdmcnIDogY2F0ZWdvcnkgPT09ICdrbm93bGVkZ2UnID8gJ2tub3dsZWRnZS5zdmcnIDogJ25vdGUuc3ZnJztcblxuY29uc3QgZ2V0RnVsbHlTZWxlY3RlZEdyb3VwSWRzID0gPFQ+KFxuICBncm91cHM6IFRyZWVHcm91cDxUPltdLFxuICBzZWxlY3RlZDogU2V0PHN0cmluZz4sXG4gIGtleU9mOiAoaXRlbTogVCkgPT4gc3RyaW5nLFxuKSA9PlxuICBncm91cHNcbiAgICAuZmlsdGVyKGdyb3VwID0+IGdyb3VwLml0ZW1zLmxlbmd0aCA+IDAgJiYgZ3JvdXAuaXRlbXMuZXZlcnkoaXRlbSA9PiBzZWxlY3RlZC5oYXMoa2V5T2YoaXRlbSkpKSlcbiAgICAubWFwKGdyb3VwID0+IGdyb3VwLmlkKTtcblxuY29uc3QgdGFyZ2V0U2V0RnJvbVNldHRpbmdzID0gKHNldHRpbmdzOiBJbXBvcnRUYXJnZXRTZWxlY3Rpb24pID0+IHtcbiAgY29uc3QgdGFyZ2V0cyA9IG5ldyBTZXQ8V2lzZU1pbmRUYXJnZXQ+KCk7XG4gIGlmIChzZXR0aW5ncy5kb2N1bWVudHMpIHRhcmdldHMuYWRkKCdkb2N1bWVudHMnKTtcbiAgaWYgKHNldHRpbmdzLmtub3dsZWRnZSkgdGFyZ2V0cy5hZGQoJ2tub3dsZWRnZScpO1xuICBpZiAoc2V0dGluZ3Mubm90ZXMpIHRhcmdldHMuYWRkKCdub3RlcycpO1xuICBpZiAoIXRhcmdldHMuc2l6ZSkgdGFyZ2V0cy5hZGQoJ25vdGVzJyk7XG4gIHJldHVybiB0YXJnZXRzO1xufTtcblxuY29uc3QgcmVuZGVySGlzdG9yeUJhZGdlcyA9IChwYXJlbnQ6IEhUTUxFbGVtZW50LCB0aXRsZTogc3RyaW5nLCBpdGVtczogc3RyaW5nW10pID0+IHtcbiAgY29uc3Qgd3JhcCA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtaGlzdG9yeS1saW5lJyB9KTtcbiAgd3JhcC5jcmVhdGVFbCgnc3BhbicsIHsgdGV4dDogdGl0bGUgfSk7XG4gIGNvbnN0IGJhZGdlcyA9IHdyYXAuY3JlYXRlRGl2KHsgY2xzOiAnd2lzZW1pbmQtYnJpZGdlLWJhZGdlcycgfSk7XG4gIGNvbnN0IHZhbHVlcyA9IHN1bW1hcml6ZVZhbHVlcyhpdGVtcyk7XG4gICh2YWx1ZXMubGVuZ3RoID8gdmFsdWVzIDogWydcdTY1RTAnXSkuZm9yRWFjaCh2YWx1ZSA9PiB7XG4gICAgYmFkZ2VzLmNyZWF0ZUVsKCdzcGFuJywgeyBjbHM6ICd3aXNlbWluZC1icmlkZ2UtYmFkZ2Utc29mdCcsIHRleHQ6IHZhbHVlIH0pO1xuICB9KTtcbn07XG5cbmNvbnN0IHNhZmVUaXRsZSA9ICguLi52YWx1ZXM6IHVua25vd25bXSkgPT4ge1xuICBmb3IgKGNvbnN0IHZhbHVlIG9mIHZhbHVlcykge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnICYmIHZhbHVlLnRyaW0oKSkgcmV0dXJuIHZhbHVlLnRyaW0oKTtcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykgcmV0dXJuIFN0cmluZyh2YWx1ZSk7XG4gIH1cbiAgcmV0dXJuICdcdTY3MkFcdTU0N0RcdTU0MEQnO1xufTtcblxuY29uc3QgdW5pcXVlID0gKGl0ZW1zOiBzdHJpbmdbXSkgPT4gQXJyYXkuZnJvbShuZXcgU2V0KGl0ZW1zLmZpbHRlcihCb29sZWFuKSkpO1xuY29uc3QgdW5pcXVlQnlQYXRoID0gKGl0ZW1zOiBPYnNpZGlhblNvdXJjZUl0ZW1bXSkgPT4gQXJyYXkuZnJvbShuZXcgTWFwKGl0ZW1zLm1hcChpdGVtID0+IFtpdGVtLnBhdGgsIGl0ZW1dKSkudmFsdWVzKCkpO1xuY29uc3Qgc3VtbWFyaXplVmFsdWVzID0gKGl0ZW1zOiBzdHJpbmdbXSkgPT4ge1xuICBjb25zdCB2YWx1ZXMgPSB1bmlxdWUoaXRlbXMpO1xuICBpZiAodmFsdWVzLmxlbmd0aCA8PSAxMikgcmV0dXJuIHZhbHVlcztcbiAgcmV0dXJuIFsuLi52YWx1ZXMuc2xpY2UoMCwgMTEpLCBgXHU3QjQ5ICR7dmFsdWVzLmxlbmd0aH0gXHU5ODc5YF07XG59O1xuY29uc3QgY2F0ZWdvcnlMYWJlbCA9IChjYXRlZ29yeTogV2lzZU1pbmRDYXRlZ29yeSkgPT5cbiAgY2F0ZWdvcnkgPT09ICdkb2N1bWVudHMnID8gJ1x1NjU4N1x1Njg2MycgOiBjYXRlZ29yeSA9PT0gJ2tub3dsZWRnZScgPyAnXHU3N0U1XHU4QkM2XHU1RTkzJyA6ICdcdTdCMTRcdThCQjAnO1xuY29uc3QgZm9ybWF0RGF0ZVRpbWUgPSAodmFsdWU6IG51bWJlcikgPT4gbmV3IERhdGUodmFsdWUpLnRvTG9jYWxlU3RyaW5nKCk7XG5jb25zdCBzb3VyY2VLZXkgPSAoaXRlbTogV2lzZU1pbmRTb3VyY2VJdGVtKSA9PiBgJHtpdGVtLnNvdXJjZVR5cGV9OiR7aXRlbS5pZH1gO1xuY29uc3Qgc291cmNlTWF0Y2hlc0NhdGVnb3J5ID0gKGl0ZW06IFdpc2VNaW5kU291cmNlSXRlbSwgY2F0ZWdvcnk6IFdpc2VNaW5kQ2F0ZWdvcnkpID0+XG4gIGNhdGVnb3J5ID09PSAnZG9jdW1lbnRzJ1xuICAgID8gaXRlbS5zb3VyY2VUeXBlID09PSAnZG9jdW1lbnQnXG4gICAgOiBjYXRlZ29yeSA9PT0gJ2tub3dsZWRnZSdcbiAgICAgID8gaXRlbS5zb3VyY2VUeXBlID09PSAna25vd2xlZGdlLWRvY3VtZW50J1xuICAgICAgOiBpdGVtLnNvdXJjZVR5cGUgPT09ICdub3RlJztcbmNvbnN0IHRvZ2dsZVNldCA9IDxUPihzZXQ6IFNldDxUPiwga2V5OiBULCBjaGVja2VkOiBib29sZWFuKSA9PiBjaGVja2VkID8gc2V0LmFkZChrZXkpIDogc2V0LmRlbGV0ZShrZXkpO1xuY29uc3Qgc291cmNlVHlwZUxhYmVsID0gKHR5cGU6IFdpc2VNaW5kU291cmNlVHlwZSkgPT5cbiAgdHlwZSA9PT0gJ25vdGUnID8gJ1x1N0IxNFx1OEJCMCcgOiB0eXBlID09PSAnZG9jdW1lbnQnID8gJ1x1NjU4N1x1Njg2MycgOiAnXHU3N0U1XHU4QkM2XHU1RTkzJztcbmNvbnN0IGRlc3RpbmF0aW9uVHlwZUxhYmVsID0gKHR5cGU6IFdpc2VNaW5kVGFyZ2V0KSA9PlxuICB0eXBlID09PSAnbm90ZXMnID8gJ1x1N0IxNFx1OEJCMFx1NjU4N1x1NEVGNlx1NTkzOScgOiB0eXBlID09PSAnZG9jdW1lbnRzJyA/ICdcdTY1ODdcdTY4NjNcdTY1ODdcdTRFRjZcdTU5MzknIDogJ1x1NzdFNVx1OEJDNlx1NUU5Myc7XG5jb25zdCBkZXN0aW5hdGlvbktleSA9ICh0YXJnZXQ6IFdpc2VNaW5kVGFyZ2V0LCB2YWx1ZTogc3RyaW5nKSA9PiBgJHt0YXJnZXR9OiR7dmFsdWV9YDtcbmNvbnN0IG1hdGNoZXNTZWFyY2ggPSAodmFsdWU6IHN0cmluZywgc2VhcmNoOiBzdHJpbmcpID0+XG4gICFzZWFyY2gudHJpbSgpIHx8IHZhbHVlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoc2VhcmNoLnRyaW0oKS50b0xvd2VyQ2FzZSgpKTtcbmNvbnN0IGZpbHRlckdyb3VwcyA9IDxUPihncm91cHM6IFRyZWVHcm91cDxUPltdLCBzZWFyY2g6IHN0cmluZywgdGV4dE9mOiAoaXRlbTogVCkgPT4gc3RyaW5nKSA9PiB7XG4gIGlmICghc2VhcmNoLnRyaW0oKSkgcmV0dXJuIGdyb3VwcztcbiAgcmV0dXJuIGdyb3Vwc1xuICAgIC5tYXAoZ3JvdXAgPT4gKHtcbiAgICAgIC4uLmdyb3VwLFxuICAgICAgaXRlbXM6IGdyb3VwLml0ZW1zLmZpbHRlcihpdGVtID0+IG1hdGNoZXNTZWFyY2goYCR7Z3JvdXAudGl0bGV9ICR7Z3JvdXAuc3VidGl0bGV9ICR7dGV4dE9mKGl0ZW0pfWAsIHNlYXJjaCkpLFxuICAgIH0pKVxuICAgIC5maWx0ZXIoZ3JvdXAgPT4gZ3JvdXAuaXRlbXMubGVuZ3RoIHx8IG1hdGNoZXNTZWFyY2goYCR7Z3JvdXAudGl0bGV9ICR7Z3JvdXAuc3VidGl0bGV9YCwgc2VhcmNoKSk7XG59O1xuY29uc3Qgc29ydFJvb3RGaXJzdCA9IChhOiBzdHJpbmcsIGI6IHN0cmluZykgPT4ge1xuICBjb25zdCByb290TmFtZXMgPSBuZXcgU2V0KFsnJywgJ1x1NjgzOVx1NzZFRVx1NUY1NScsICdcdTY3MkFcdTUyMDZcdTdFQzQnXSk7XG4gIGNvbnN0IGFSb290ID0gcm9vdE5hbWVzLmhhcyhhKTtcbiAgY29uc3QgYlJvb3QgPSByb290TmFtZXMuaGFzKGIpO1xuICBpZiAoYVJvb3QgJiYgIWJSb290KSByZXR1cm4gLTE7XG4gIGlmICghYVJvb3QgJiYgYlJvb3QpIHJldHVybiAxO1xuICByZXR1cm4gYS5sb2NhbGVDb21wYXJlKGIpO1xufTtcbmNvbnN0IGZvcm1hdFJlc3VsdCA9IChyZXN1bHQ6IHsgY3JlYXRlZDogbnVtYmVyOyB1cGRhdGVkOiBudW1iZXI7IHNraXBwZWQ6IG51bWJlcjsgZmFpbGVkOiBudW1iZXI7IGl0ZW1zOiBhbnlbXSB9KSA9PlxuICBgXHU1MjFCXHU1RUZBICR7cmVzdWx0LmNyZWF0ZWR9XHVGRjBDXHU2NkY0XHU2NUIwICR7cmVzdWx0LnVwZGF0ZWR9XHVGRjBDXHU4REYzXHU4RkM3ICR7cmVzdWx0LnNraXBwZWR9XHVGRjBDXHU1OTMxXHU4RDI1ICR7cmVzdWx0LmZhaWxlZH1cXG5cXG4ke3Jlc3VsdC5pdGVtc1xuICAgIC5zbGljZSgtMjApXG4gICAgLm1hcChpdGVtID0+IGAke2l0ZW0uc3RhdHVzfSBcdTAwQjcgJHtpdGVtLnRpdGxlfSR7aXRlbS5tZXNzYWdlID8gYCBcdTAwQjcgJHtpdGVtLm1lc3NhZ2V9YCA6ICcnfWApXG4gICAgLmpvaW4oJ1xcbicpfWA7XG4iLCAiPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgZmlsbD1cIm5vbmVcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgc3Ryb2tlLXdpZHRoPVwiMS41XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCI+XG4gIDxwYXRoIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiIGQ9XCJNMTYuMDIzIDkuMzQ4aDQuOTkydi0uMDAxTTIuOTg1IDE5LjY0NHYtNC45OTJtMCAwaDQuOTkybS00Ljk5MyAwIDMuMTgxIDMuMTgzYTguMjUgOC4yNSAwIDAgMCAxMy44MDMtMy43TTQuMDMxIDkuODY1YTguMjUgOC4yNSAwIDAgMSAxMy44MDMtMy43bDMuMTgxIDMuMTgybTAtNC45OTF2NC45OVwiIC8+XG48L3N2Zz5cbiIsICI8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBmaWxsPVwibm9uZVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBzdHJva2Utd2lkdGg9XCIxLjVcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIj5cbiAgPHBhdGggc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgZD1cIk0xNi41IDMuNzVWMTYuNUwxMiAxNC4yNSA3LjUgMTYuNVYzLjc1bTkgMEgxOEEyLjI1IDIuMjUgMCAwIDEgMjAuMjUgNnYxMkEyLjI1IDIuMjUgMCAwIDEgMTggMjAuMjVINkEyLjI1IDIuMjUgMCAwIDEgMy43NSAxOFY2QTIuMjUgMi4yNSAwIDAgMSA2IDMuNzVoMS41bTkgMGgtOVwiIC8+XG48L3N2Zz5cbiIsICI8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBmaWxsPVwibm9uZVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBzdHJva2Utd2lkdGg9XCIxLjVcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIj5cbiAgPHBhdGggc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgZD1cIk05IDEyLjc1IDExLjI1IDE1IDE1IDkuNzVNMjEgMTJhOSA5IDAgMSAxLTE4IDAgOSA5IDAgMCAxIDE4IDBaXCIgLz5cbjwvc3ZnPlxuIiwgIjxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIGZpbGw9XCJub25lXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIHN0cm9rZS13aWR0aD1cIjEuNVwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIGNsYXNzPVwic2l6ZS02XCI+XG4gIDxwYXRoIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiIGQ9XCJtMTkuNSA4LjI1LTcuNSA3LjUtNy41LTcuNVwiIC8+XG48L3N2Zz5cbiIsICI8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBmaWxsPVwibm9uZVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBzdHJva2Utd2lkdGg9XCIxLjVcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBjbGFzcz1cInNpemUtNlwiPlxuICA8cGF0aCBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIiBkPVwibTguMjUgNC41IDcuNSA3LjUtNy41IDcuNVwiIC8+XG48L3N2Zz5cbiIsICI8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBmaWxsPVwibm9uZVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBzdHJva2Utd2lkdGg9XCIxLjVcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIj5cbiAgPHBhdGggc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgZD1cIk0xMiA2djZoNC41TTIxIDEyYTkgOSAwIDEgMS0xOCAwIDkgOSAwIDAgMSAxOCAwWlwiIC8+XG48L3N2Zz5cbiIsICI8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBmaWxsPVwibm9uZVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBzdHJva2Utd2lkdGg9XCIxLjVcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBjbGFzcz1cInNpemUtNlwiPlxuICA8cGF0aCBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIiBkPVwiTTE5LjUgMTQuMjV2LTIuNjI1YTMuMzc1IDMuMzc1IDAgMCAwLTMuMzc1LTMuMzc1aC0xLjVBMS4xMjUgMS4xMjUgMCAwIDEgMTMuNSA3LjEyNXYtMS41YTMuMzc1IDMuMzc1IDAgMCAwLTMuMzc1LTMuMzc1SDguMjVtMCAxMi43NWg3LjVtLTcuNSAzSDEyTTEwLjUgMi4yNUg1LjYyNWMtLjYyMSAwLTEuMTI1LjUwNC0xLjEyNSAxLjEyNXYxNy4yNWMwIC42MjEuNTA0IDEuMTI1IDEuMTI1IDEuMTI1aDEyLjc1Yy42MjEgMCAxLjEyNS0uNTA0IDEuMTI1LTEuMTI1VjExLjI1YTkgOSAwIDAgMC05LTlaXCIgLz5cbjwvc3ZnPlxuIiwgIjxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIGZpbGw9XCJub25lXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIHN0cm9rZS13aWR0aD1cIjEuNVwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIGNsYXNzPVwic2l6ZS02XCI+XG4gIDxwYXRoIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiIGQ9XCJtMi4yNSAxMiA4Ljk1NC04Ljk1NWMuNDQtLjQzOSAxLjE1Mi0uNDM5IDEuNTkxIDBMMjEuNzUgMTJNNC41IDkuNzV2MTAuMTI1YzAgLjYyMS41MDQgMS4xMjUgMS4xMjUgMS4xMjVIOS43NXYtNC44NzVjMC0uNjIxLjUwNC0xLjEyNSAxLjEyNS0xLjEyNWgyLjI1Yy42MjEgMCAxLjEyNS41MDQgMS4xMjUgMS4xMjVWMjFoNC4xMjVjLjYyMSAwIDEuMTI1LS41MDQgMS4xMjUtMS4xMjVWOS43NU04LjI1IDIxaDguMjVcIiAvPlxuPC9zdmc+XG4iLCAiPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgZmlsbD1cIm5vbmVcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgc3Ryb2tlLXdpZHRoPVwiMS41XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgY2xhc3M9XCJzaXplLTZcIj5cbiAgPHBhdGggc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgZD1cIk0xMiA2LjA0MkE4Ljk2NyA4Ljk2NyAwIDAgMCA2IDMuNzVjLTEuMDUyIDAtMi4wNjIuMTgtMyAuNTEydjE0LjI1QTguOTg3IDguOTg3IDAgMCAxIDYgMThjMi4zMDUgMCA0LjQwOC44NjcgNiAyLjI5Mm0wLTE0LjI1YTguOTY2IDguOTY2IDAgMCAxIDYtMi4yOTJjMS4wNTIgMCAyLjA2Mi4xOCAzIC41MTJ2MTQuMjVBOC45ODcgOC45ODcgMCAwIDAgMTggMThhOC45NjcgOC45NjcgMCAwIDAtNiAyLjI5Mm0wLTE0LjI1djE0LjI1XCIgLz5cbjwvc3ZnPlxuIiwgIjxzdmcgdD1cIjE3NjI5NjA4MzIzNTZcIiBjbGFzcz1cImljb25cIiB2aWV3Qm94PVwiMCAwIDEwMjQgMTAyNFwiIHZlcnNpb249XCIxLjFcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgcC1pZD1cIjM1NjNcIiB3aWR0aD1cIjEyOFwiIGhlaWdodD1cIjEyOFwiPjxwYXRoIGQ9XCJNOTAzLjUwOTMzMyAyNTYuNjgyNjY3TDY1Ny41Nzg2NjcgMTAuNzUyQTM2LjQ5NDIyMiAzNi40OTQyMjIgMCAwIDAgNjMxLjc1MTExMSAwSDE0Ni4yNjEzMzNDMTI2LjAwODg4OSAwIDEwOS42ODE3NzggMTYuMzU1NTU2IDEwOS42ODE3NzggMzYuNTc5NTU2djk1MC44NDA4ODhjMCAyMC4yMjQgMTYuMzU1NTU2IDM2LjU3OTU1NiAzNi41Nzk1NTUgMzYuNTc5NTU2aDczMS40MjA0NDVjMjAuMjI0IDAgMzYuNTc5NTU2LTE2LjM1NTU1NiAzNi41Nzk1NTUtMzYuNTc5NTU2VjI4Mi42MjRjMC05LjY5OTU1Ni0zLjg5Njg4OS0xOS4wNTc3NzgtMTAuNzUyLTI1Ljk0MTMzM3ogbS03My41ODU3NzcgNDIuNzUyaC0yMTUuMDk2ODg5Vjg0LjMzNzc3OGwyMTUuMDk2ODg5IDIxNS4wOTY4ODl6IG0yLjA0OCA2NDIuMjc1NTU1SDE5MlY4Mi4yODk3NzhoMzQ1LjE0NDg4OXYyNDYuODQwODg5YTQ4LjAxNDIyMiA0OC4wMTQyMjIgMCAwIDAgNDguMDE0MjIyIDQ4LjAxNDIyMmgyNDYuODQwODg5djU2NC41NjUzMzN6TTQxNy4xMDkzMzMgNDc2Ljc4NTc3OGExMy42MjQ4ODkgMTMuNjI0ODg5IDAgMCAwLTEyLjU3MjQ0NC04LjIyMDQ0NWgtMzkuOTkyODg5YTEzLjc2NzExMSAxMy43NjcxMTEgMCAwIDAtMTMuNzEwMjIyIDEzLjcxMDIyM3YzMTAuODY5MzMzYzAgNy41Mzc3NzggNi4xNzI0NDQgMTMuNzEwMjIyIDEzLjcxMDIyMiAxMy43MTAyMjJoMzAuOTc2YTEzLjc2NzExMSAxMy43NjcxMTEgMCAwIDAgMTMuNzEwMjIyLTEzLjcxMDIyMnYtMjAxLjAxNjg4OWw3Ni4zNDQ4ODkgMTcxLjYzMzc3OGExMy43Mzg2NjcgMTMuNzM4NjY3IDAgMCAwIDEyLjU3MjQ0NSA4LjEzNTExMWgyNy41MzQyMjJhMTMuOTM3Nzc4IDEzLjkzNzc3OCAwIDAgMCAxMi41NzI0NDQtOC4xMzUxMTFsNzYuMzQ0ODg5LTE3Mi4wODg4ODl2MjAxLjQ3MmMwIDcuNTM3Nzc4IDYuMTcyNDQ0IDEzLjcxMDIyMiAxMy43MTAyMjIgMTMuNzEwMjIyaDMxLjA4OTc3OGExMy43NjcxMTEgMTMuNzY3MTExIDAgMCAwIDEzLjcxMDIyMi0xMy43MTAyMjJWNDgyLjI3NTU1NmExMy43NjcxMTEgMTMuNzY3MTExIDAgMCAwLTEzLjcxMDIyMi0xMy43MTAyMjNoLTM5LjY1MTU1NWExMy42MjQ4ODkgMTMuNjI0ODg5IDAgMCAwLTEyLjU3MjQ0NSA4LjI0ODg4OWwtOTQuOTc2IDIxOC4yODI2NjctOTUuMDg5Nzc4LTIxOC4zMTExMTF6XCIgZmlsbD1cImN1cnJlbnRDb2xvclwiIHAtaWQ9XCIzNTY0XCI+PC9wYXRoPjwvc3ZnPiIsICI8P3htbCB2ZXJzaW9uPVwiMS4wXCIgZW5jb2Rpbmc9XCJVVEYtOFwiPz48c3ZnIHdpZHRoPVwiMjRcIiBoZWlnaHQ9XCIyNFwiIHZpZXdCb3g9XCIwIDAgNDggNDhcIiBmaWxsPVwibm9uZVwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj48cGF0aCBkPVwiTTggNkM4IDQuODk1NDMgOC44OTU0MyA0IDEwIDRIMzhDMzkuMTA0NiA0IDQwIDQuODk1NDMgNDAgNlY0MkM0MCA0My4xMDQ2IDM5LjEwNDYgNDQgMzggNDRIMTBDOC44OTU0MyA0NCA4IDQzLjEwNDYgOCA0MlY2WlwiIGZpbGw9XCJub25lXCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiNFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIvPjxwYXRoIGQ9XCJNMTYgNFY0NFwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjRcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIi8+PHBhdGggZD1cIk0yNCAxMkgzMlwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjRcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIi8+PHBhdGggZD1cIk0yNCAyMEgzMlwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjRcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIi8+PHBhdGggZD1cIk0xMCA0SDIyXCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiNFwiIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiLz48cGF0aCBkPVwiTTEwIDQ0SDIyXCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiNFwiIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiLz48L3N2Zz4iLCAiPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgZmlsbD1cIm5vbmVcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgc3Ryb2tlLXdpZHRoPVwiMS41XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCI+XG4gIDxwYXRoIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiIGQ9XCJtMTYuODYyIDQuNDg3IDEuNjg3LTEuNjg4YTEuODc1IDEuODc1IDAgMSAxIDIuNjUyIDIuNjUyTDEwLjU4MiAxNi4wN2E0LjUgNC41IDAgMCAxLTEuODk3IDEuMTNMNiAxOGwuOC0yLjY4NWE0LjUgNC41IDAgMCAxIDEuMTMtMS44OTdsOC45MzItOC45MzFabTAgMEwxOS41IDcuMTI1TTE4IDE0djQuNzVBMi4yNSAyLjI1IDAgMCAxIDE1Ljc1IDIxSDUuMjVBMi4yNSAyLjI1IDAgMCAxIDMgMTguNzVWOC4yNUEyLjI1IDIuMjUgMCAwIDEgNS4yNSA2SDEwXCIgLz5cbjwvc3ZnPlxuIiwgIjxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIGZpbGw9XCJub25lXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIHN0cm9rZS13aWR0aD1cIjEuNVwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIGNsYXNzPVwic2l6ZS02XCI+XG4gIDxwYXRoIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiIGQ9XCJNMTIgNC41djE1bTcuNS03LjVoLTE1XCIgLz5cbjwvc3ZnPlxuXG4iLCAiPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgZmlsbD1cIm5vbmVcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgc3Ryb2tlLXdpZHRoPVwiMS41XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgY2xhc3M9XCJzaXplLTZcIj5cbiAgPHBhdGggc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgZD1cIk0zIDE2LjV2Mi4yNUEyLjI1IDIuMjUgMCAwIDAgNS4yNSAyMWgxMy41QTIuMjUgMi4yNSAwIDAgMCAyMSAxOC43NVYxNi41bS0xMy41LTlMMTIgM20wIDAgNC41IDQuNU0xMiAzdjEzLjVcIiAvPlxuPC9zdmc+XG4iLCAiPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgZmlsbD1cIm5vbmVcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgc3Ryb2tlLXdpZHRoPVwiMS41XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgY2xhc3M9XCJzaXplLTZcIj5cbiAgPHBhdGggc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgZD1cIk0zIDE2LjV2Mi4yNUEyLjI1IDIuMjUgMCAwIDAgNS4yNSAyMWgxMy41QTIuMjUgMi4yNSAwIDAgMCAyMSAxOC43NVYxNi41bS0xMy41LTlMMTIgM20wIDAgNC41IDQuNU0xMiAzdjEzLjVcIiAvPlxuPC9zdmc+XG4iLCAiPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgZmlsbD1cIm5vbmVcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgc3Ryb2tlLXdpZHRoPVwiMS41XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgY2xhc3M9XCJzaXplLTZcIj5cbiAgPHBhdGggc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgZD1cIm01LjI1IDQuNSA3LjUgNy41LTcuNSA3LjVtNi0xNSA3LjUgNy41LTcuNSA3LjVcIiAvPlxuPC9zdmc+XG4iLCAiPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgZmlsbD1cIm5vbmVcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgc3Ryb2tlLXdpZHRoPVwiMS41XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCI+XG4gIDxwYXRoIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiIGQ9XCJtMTQuNzQgOS0uMzQ2IDltLTQuNzg4IDBMOS4yNiA5bTkuOTY4LTMuMjFjLjM0Mi4wNTIuNjgyLjEwNyAxLjAyMi4xNjZNMTkuMjI4IDUuNzkgMTguMTYgMTkuNjczQTIuMjUgMi4yNSAwIDAgMSAxNS45MTYgMjFIOC4wODRhMi4yNSAyLjI1IDAgMCAxLTIuMjQ0LTIuMDc3TDQuNzcyIDUuNzltMTQuNDU2IDBhNDguMTA4IDQ4LjEwOCAwIDAgMC0zLjQ3OC0uMzk3bS0xMiAuNTYyYy4zNC0uMDU5LjY4LS4xMTQgMS4wMjItLjE2NW0wIDBhNDguMTEgNDguMTEgMCAwIDEgMy40NzgtLjM5N203LjUgMHYtLjkxNmMwLTEuMTgtLjkxLTIuMTY0LTIuMDktMi4yMDFhNTEuOTY0IDUxLjk2NCAwIDAgMC0zLjMyIDBjLTEuMTguMDM3LTIuMDkgMS4wMjItMi4wOSAyLjIwMXYuOTE2bTcuNSAwYTQ4LjY2NyA0OC42NjcgMCAwIDAtNy41IDBcIiAvPlxuPC9zdmc+XG4iLCAiPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgZmlsbD1cIm5vbmVcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgc3Ryb2tlLXdpZHRoPVwiMS41XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgY2xhc3M9XCJzaXplLTZcIj5cbiAgPHBhdGggc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgZD1cIk02IDE4IDE4IDZNNiA2bDEyIDEyXCIgLz5cbjwvc3ZnPlxuIiwgImV4cG9ydCBjb25zdCBoYXNoVGV4dCA9IGFzeW5jICh0ZXh0OiBzdHJpbmcpID0+IHtcbiAgY29uc3QgZGF0YSA9IG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZSh0ZXh0KTtcbiAgY29uc3QgZGlnZXN0ID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5kaWdlc3QoJ1NIQS0yNTYnLCBkYXRhKTtcbiAgcmV0dXJuIEFycmF5LmZyb20obmV3IFVpbnQ4QXJyYXkoZGlnZXN0KSlcbiAgICAubWFwKGJ5dGUgPT4gYnl0ZS50b1N0cmluZygxNikucGFkU3RhcnQoMiwgJzAnKSlcbiAgICAuam9pbignJyk7XG59O1xuXG5leHBvcnQgY29uc3QgbWFya2Rvd25Ub1BsYWluVGV4dCA9IChtYXJrZG93bjogc3RyaW5nKSA9PlxuICBtYXJrZG93blxuICAgIC5yZXBsYWNlKC9gYGBbXFxzXFxTXSo/YGBgL2csICcgJylcbiAgICAucmVwbGFjZSgvYChbXmBdKylgL2csICckMScpXG4gICAgLnJlcGxhY2UoLyFcXFtbXlxcXV0qXVxcKFteKV0qXFwpL2csICcgJylcbiAgICAucmVwbGFjZSgvXFxbKFteXFxdXSspXVxcKFteKV0qXFwpL2csICckMScpXG4gICAgLnJlcGxhY2UoL1sjPipfXFwtfnxdL2csICcgJylcbiAgICAucmVwbGFjZSgvXFxzKy9nLCAnICcpXG4gICAgLnRyaW0oKTtcblxuZXhwb3J0IGNvbnN0IHNhZmVKc29uUGFyc2UgPSA8VD4odmFsdWU6IHVua25vd24sIGZhbGxiYWNrOiBUKTogVCA9PiB7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSByZXR1cm4gKHZhbHVlIGFzIFQpID8/IGZhbGxiYWNrO1xuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKHZhbHVlKSBhcyBUO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsbGJhY2s7XG4gIH1cbn07XG5cbmV4cG9ydCBjb25zdCBub3JtYWxpemVUYWdzID0gKHZhbHVlOiB1bmtub3duKTogc3RyaW5nW10gPT4ge1xuICBjb25zdCBwYXJzZWQgPSB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnID8gc2FmZUpzb25QYXJzZTx1bmtub3duPih2YWx1ZSwgdmFsdWUpIDogdmFsdWU7XG4gIGlmIChBcnJheS5pc0FycmF5KHBhcnNlZCkpIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShcbiAgICAgIG5ldyBTZXQoXG4gICAgICAgIHBhcnNlZFxuICAgICAgICAgIC5tYXAoaXRlbSA9PiB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSByZXR1cm4gaXRlbTtcbiAgICAgICAgICAgIGlmIChpdGVtICYmIHR5cGVvZiBpdGVtID09PSAnb2JqZWN0JyAmJiAndGV4dCcgaW4gaXRlbSkgcmV0dXJuIFN0cmluZygoaXRlbSBhcyBhbnkpLnRleHQpO1xuICAgICAgICAgICAgaWYgKGl0ZW0gJiYgdHlwZW9mIGl0ZW0gPT09ICdvYmplY3QnICYmICduYW1lJyBpbiBpdGVtKSByZXR1cm4gU3RyaW5nKChpdGVtIGFzIGFueSkubmFtZSk7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAubWFwKGl0ZW0gPT4gaXRlbS5yZXBsYWNlKC9eIy8sICcnKS50cmltKCkpXG4gICAgICAgICAgLmZpbHRlcihCb29sZWFuKSxcbiAgICAgICksXG4gICAgKTtcbiAgfVxuICBpZiAodHlwZW9mIHBhcnNlZCA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gcGFyc2VkXG4gICAgICAuc3BsaXQoL1ssXHVGRjBDXFxzXSsvKVxuICAgICAgLm1hcChpdGVtID0+IGl0ZW0ucmVwbGFjZSgvXiMvLCAnJykudHJpbSgpKVxuICAgICAgLmZpbHRlcihCb29sZWFuKTtcbiAgfVxuICByZXR1cm4gW107XG59O1xuXG5leHBvcnQgY29uc3Qgc2FuaXRpemVGaWxlTmFtZSA9ICh2YWx1ZTogc3RyaW5nLCBmYWxsYmFjazogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IHRleHQgPSAodmFsdWUgfHwgZmFsbGJhY2spLnJlcGxhY2UoL1tcXFxcLzpcIio/PD58XS9nLCAnLScpLnJlcGxhY2UoL1xccysvZywgJyAnKS50cmltKCk7XG4gIHJldHVybiB0ZXh0IHx8IGZhbGxiYWNrO1xufTtcblxuZXhwb3J0IGNvbnN0IHF1b3RlWWFtbFN0cmluZyA9ICh2YWx1ZTogc3RyaW5nKSA9PiBKU09OLnN0cmluZ2lmeSh2YWx1ZSA/PyAnJyk7XG4iLCAiaW1wb3J0IHR5cGUgeyBBcHAsIFRGaWxlIH0gZnJvbSAnb2JzaWRpYW4nO1xuXG5pbXBvcnQgeyBzdHJpcFNvdXJjZU1hcmtlcnMgfSBmcm9tICcuL21hcmtlcnMnO1xuaW1wb3J0IHsgaGFzaFRleHQsIG1hcmtkb3duVG9QbGFpblRleHQsIG5vcm1hbGl6ZVRhZ3MgfSBmcm9tICcuL3RleHQnO1xuaW1wb3J0IHR5cGUgeyBPYnNpZGlhblNvdXJjZUl0ZW0gfSBmcm9tICcuL3R5cGVzJztcblxuZXhwb3J0IHR5cGUgU2NhblZhdWx0T3B0aW9ucyA9IHtcbiAgZm9sZGVyUHJlZml4Pzogc3RyaW5nO1xuICBtYXhGaWxlU2l6ZUtiOiBudW1iZXI7XG4gIGlnbm9yZVBhdHRlcm5zOiBzdHJpbmdbXTtcbn07XG5cbnR5cGUgRnJvbnRtYXR0ZXJSZXN1bHQgPSB7XG4gIGZyb250bWF0dGVyOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgYm9keTogc3RyaW5nO1xufTtcblxuZXhwb3J0IGNvbnN0IHNjYW5WYXVsdCA9IGFzeW5jIChhcHA6IEFwcCwgb3B0aW9uczogU2NhblZhdWx0T3B0aW9ucyk6IFByb21pc2U8T2JzaWRpYW5Tb3VyY2VJdGVtW10+ID0+IHtcbiAgY29uc3QgbWF4Qnl0ZXMgPSBvcHRpb25zLm1heEZpbGVTaXplS2IgKiAxMDI0O1xuICBjb25zdCBmaWxlcyA9IGFwcC52YXVsdFxuICAgIC5nZXRNYXJrZG93bkZpbGVzKClcbiAgICAuZmlsdGVyKGZpbGUgPT4gc2hvdWxkSW5jbHVkZUZpbGUoZmlsZSwgbWF4Qnl0ZXMsIG9wdGlvbnMpKTtcblxuICBjb25zdCBpdGVtcyA9IGF3YWl0IFByb21pc2UuYWxsKGZpbGVzLm1hcChmaWxlID0+IHJlYWRPYnNpZGlhbkZpbGUoYXBwLCBmaWxlKSkpO1xuICByZXR1cm4gaXRlbXMuc29ydCgoYSwgYikgPT4gYS5wYXRoLmxvY2FsZUNvbXBhcmUoYi5wYXRoKSk7XG59O1xuXG5leHBvcnQgY29uc3QgcmVhZE9ic2lkaWFuRmlsZSA9IGFzeW5jIChhcHA6IEFwcCwgZmlsZTogVEZpbGUpOiBQcm9taXNlPE9ic2lkaWFuU291cmNlSXRlbT4gPT4ge1xuICBjb25zdCByYXcgPSBhd2FpdCBhcHAudmF1bHQuY2FjaGVkUmVhZChmaWxlKTtcbiAgY29uc3QgbWFya2Rvd24gPSBzdHJpcFNvdXJjZU1hcmtlcnMocmF3KTtcbiAgY29uc3QgeyBmcm9udG1hdHRlciwgYm9keSB9ID0gcGFyc2VGcm9udG1hdHRlcihtYXJrZG93bik7XG4gIGNvbnN0IHRhZ3MgPSBBcnJheS5mcm9tKG5ldyBTZXQoWy4uLm5vcm1hbGl6ZVRhZ3MoZnJvbnRtYXR0ZXIudGFncyksIC4uLmV4dHJhY3RJbmxpbmVUYWdzKGJvZHkpXSkpO1xuICBjb25zdCB0aXRsZSA9IHRpdGxlRnJvbU1hcmtkb3duKG1hcmtkb3duLCBmaWxlLmJhc2VuYW1lKTtcbiAgY29uc3QgZm9sZGVyUGF0aCA9IGZpbGUucGF0aC5pbmNsdWRlcygnLycpID8gZmlsZS5wYXRoLnNwbGl0KCcvJykuc2xpY2UoMCwgLTEpLmpvaW4oJy8nKSA6ICcnO1xuICBjb25zdCBjb250ZW50SGFzaCA9IGF3YWl0IGhhc2hUZXh0KG1hcmtkb3duKTtcblxuICByZXR1cm4ge1xuICAgIHBhdGg6IGZpbGUucGF0aCxcbiAgICBhYnNvbHV0ZVBhdGg6IHJlc29sdmVBYnNvbHV0ZVBhdGgoYXBwLCBmaWxlLnBhdGgpLFxuICAgIGJhc2VuYW1lOiBmaWxlLmJhc2VuYW1lLFxuICAgIGZvbGRlclBhdGgsXG4gICAgdGl0bGUsXG4gICAgbWFya2Rvd24sXG4gICAgcGxhaW5UZXh0OiBtYXJrZG93blRvUGxhaW5UZXh0KGJvZHkpLFxuICAgIHRhZ3MsXG4gICAgZnJvbnRtYXR0ZXIsXG4gICAgbW9kaWZpZWRBdDogZmlsZS5zdGF0Lm10aW1lLFxuICAgIHNpemU6IGZpbGUuc3RhdC5zaXplLFxuICAgIGNvbnRlbnRIYXNoLFxuICB9O1xufTtcblxuY29uc3QgcmVzb2x2ZUFic29sdXRlUGF0aCA9IChhcHA6IEFwcCwgcGF0aDogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IGFkYXB0ZXIgPSAoYXBwLnZhdWx0IGFzIGFueSkuYWRhcHRlcjtcbiAgY29uc3QgYmFzZVBhdGggPSB0eXBlb2YgYWRhcHRlci5nZXRCYXNlUGF0aCA9PT0gJ2Z1bmN0aW9uJyA/IGFkYXB0ZXIuZ2V0QmFzZVBhdGgoKSA6ICcnO1xuICByZXR1cm4gYmFzZVBhdGggPyBgJHtTdHJpbmcoYmFzZVBhdGgpLnJlcGxhY2UoL1xcLyskLywgJycpfS8ke3BhdGh9YCA6IHBhdGg7XG59O1xuXG5leHBvcnQgY29uc3QgdGl0bGVGcm9tTWFya2Rvd24gPSAobWFya2Rvd246IHN0cmluZywgZmFsbGJhY2s6IHN0cmluZykgPT4ge1xuICBjb25zdCB7IGZyb250bWF0dGVyLCBib2R5IH0gPSBwYXJzZUZyb250bWF0dGVyKG1hcmtkb3duKTtcbiAgY29uc3QgZnJvbnRtYXR0ZXJUaXRsZSA9IHR5cGVvZiBmcm9udG1hdHRlci50aXRsZSA9PT0gJ3N0cmluZycgPyBmcm9udG1hdHRlci50aXRsZS50cmltKCkgOiAnJztcbiAgaWYgKGZyb250bWF0dGVyVGl0bGUpIHJldHVybiBmcm9udG1hdHRlclRpdGxlO1xuICBjb25zdCBoZWFkaW5nID0gYm9keS5tYXRjaCgvXiNcXHMrKC4rKSQvbSk/LlsxXT8udHJpbSgpO1xuICByZXR1cm4gaGVhZGluZyB8fCBmYWxsYmFjayB8fCAnXHU2NzJBXHU1NDdEXHU1NDBEXHU3QjE0XHU4QkIwJztcbn07XG5cbmV4cG9ydCBjb25zdCBzdHJpcEZyb250bWF0dGVyID0gKG1hcmtkb3duOiBzdHJpbmcpID0+IHBhcnNlRnJvbnRtYXR0ZXIobWFya2Rvd24pLmJvZHk7XG5cbmV4cG9ydCBjb25zdCBleHRyYWN0SW5saW5lVGFncyA9IChtYXJrZG93bjogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IHRhZ3MgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgcmVnZXggPSAvKF58XFxzKSMoW1xccHtMfVxccHtOfV8vLV0rKS9ndTtcbiAgbGV0IG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xuICB3aGlsZSAoKG1hdGNoID0gcmVnZXguZXhlYyhtYXJrZG93bikpKSB7XG4gICAgY29uc3QgdGFnID0gbWF0Y2hbMl0/LnJlcGxhY2UoL14jLywgJycpLnRyaW0oKTtcbiAgICBpZiAodGFnKSB0YWdzLmFkZCh0YWcpO1xuICB9XG4gIHJldHVybiBBcnJheS5mcm9tKHRhZ3MpO1xufTtcblxuZXhwb3J0IGNvbnN0IHBhcnNlRnJvbnRtYXR0ZXIgPSAobWFya2Rvd246IHN0cmluZyk6IEZyb250bWF0dGVyUmVzdWx0ID0+IHtcbiAgaWYgKCFtYXJrZG93bi5zdGFydHNXaXRoKCctLS0nKSkge1xuICAgIHJldHVybiB7IGZyb250bWF0dGVyOiB7fSwgYm9keTogbWFya2Rvd24gfTtcbiAgfVxuXG4gIGNvbnN0IGVuZCA9IG1hcmtkb3duLmluZGV4T2YoJ1xcbi0tLScsIDMpO1xuICBpZiAoZW5kID09PSAtMSkge1xuICAgIHJldHVybiB7IGZyb250bWF0dGVyOiB7fSwgYm9keTogbWFya2Rvd24gfTtcbiAgfVxuXG4gIGNvbnN0IHJhdyA9IG1hcmtkb3duLnNsaWNlKDMsIGVuZCkudHJpbSgpO1xuICBjb25zdCBib2R5ID0gbWFya2Rvd24uc2xpY2UoZW5kICsgNCkucmVwbGFjZSgvXlxccj9cXG4vLCAnJyk7XG4gIGNvbnN0IGZyb250bWF0dGVyOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuXG4gIHJhdy5zcGxpdCgvXFxyP1xcbi8pLmZvckVhY2gobGluZSA9PiB7XG4gICAgY29uc3QgaW5kZXggPSBsaW5lLmluZGV4T2YoJzonKTtcbiAgICBpZiAoaW5kZXggPT09IC0xKSByZXR1cm47XG4gICAgY29uc3Qga2V5ID0gbGluZS5zbGljZSgwLCBpbmRleCkudHJpbSgpO1xuICAgIGNvbnN0IHZhbHVlID0gbGluZS5zbGljZShpbmRleCArIDEpLnRyaW0oKTtcbiAgICBpZiAoIWtleSkgcmV0dXJuO1xuICAgIGlmICh2YWx1ZS5zdGFydHNXaXRoKCdbJykgJiYgdmFsdWUuZW5kc1dpdGgoJ10nKSkge1xuICAgICAgZnJvbnRtYXR0ZXJba2V5XSA9IHZhbHVlXG4gICAgICAgIC5zbGljZSgxLCAtMSlcbiAgICAgICAgLnNwbGl0KCcsJylcbiAgICAgICAgLm1hcChpdGVtID0+IGl0ZW0udHJpbSgpLnJlcGxhY2UoL15bJ1wiXXxbJ1wiXSQvZywgJycpKVxuICAgICAgICAuZmlsdGVyKEJvb2xlYW4pO1xuICAgIH0gZWxzZSB7XG4gICAgICBmcm9udG1hdHRlcltrZXldID0gdmFsdWUucmVwbGFjZSgvXlsnXCJdfFsnXCJdJC9nLCAnJyk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4geyBmcm9udG1hdHRlciwgYm9keSB9O1xufTtcblxuY29uc3Qgc2hvdWxkSW5jbHVkZUZpbGUgPSAoZmlsZTogVEZpbGUsIG1heEJ5dGVzOiBudW1iZXIsIG9wdGlvbnM6IFNjYW5WYXVsdE9wdGlvbnMpID0+IHtcbiAgaWYgKGZpbGUuZXh0ZW5zaW9uICE9PSAnbWQnKSByZXR1cm4gZmFsc2U7XG4gIGlmICghZmlsZS5wYXRoLnRvTG93ZXJDYXNlKCkuZW5kc1dpdGgoJy5tZCcpKSByZXR1cm4gZmFsc2U7XG4gIGlmIChmaWxlLnBhdGgudG9Mb3dlckNhc2UoKS5lbmRzV2l0aCgnLmNhbnZhcycpIHx8IGZpbGUucGF0aC50b0xvd2VyQ2FzZSgpLmVuZHNXaXRoKCcuYmFzZScpKSByZXR1cm4gZmFsc2U7XG4gIGlmIChmaWxlLnN0YXQuc2l6ZSA+IG1heEJ5dGVzKSByZXR1cm4gZmFsc2U7XG4gIGlmIChvcHRpb25zLmZvbGRlclByZWZpeCAmJiAhZmlsZS5wYXRoLnN0YXJ0c1dpdGgob3B0aW9ucy5mb2xkZXJQcmVmaXgpKSByZXR1cm4gZmFsc2U7XG4gIGlmIChmaWxlLnBhdGguc3BsaXQoJy8nKS5zb21lKHBhcnQgPT4gcGFydC5zdGFydHNXaXRoKCcuJykgJiYgcGFydCAhPT0gJy4nKSkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gIW9wdGlvbnMuaWdub3JlUGF0dGVybnMuc29tZShwYXR0ZXJuID0+IG1hdGNoU2ltcGxlUGF0dGVybihmaWxlLnBhdGgsIHBhdHRlcm4pKTtcbn07XG5cbmNvbnN0IG1hdGNoU2ltcGxlUGF0dGVybiA9IChwYXRoOiBzdHJpbmcsIHBhdHRlcm46IHN0cmluZykgPT4ge1xuICBpZiAoIXBhdHRlcm4pIHJldHVybiBmYWxzZTtcbiAgaWYgKHBhdHRlcm4uZW5kc1dpdGgoJy8qKicpKSByZXR1cm4gcGF0aC5zdGFydHNXaXRoKHBhdHRlcm4uc2xpY2UoMCwgLTMpKTtcbiAgaWYgKHBhdHRlcm4uc3RhcnRzV2l0aCgnKiovJykpIHJldHVybiBwYXRoLmluY2x1ZGVzKHBhdHRlcm4uc2xpY2UoMykucmVwbGFjZSgnLyoqJywgJycpKTtcbiAgcmV0dXJuIHBhdGggPT09IHBhdHRlcm4gfHwgcGF0aC5zdGFydHNXaXRoKGAke3BhdHRlcm59L2ApO1xufTtcbiIsICJpbXBvcnQgdHlwZSB7IFdpc2VNaW5kRm9sZGVyLCBXaXNlTWluZFNuYXBzaG90IH0gZnJvbSAnLi90eXBlcyc7XG5cbnR5cGUgRmV0Y2hMaWtlID0gKGlucHV0OiBzdHJpbmcsIGluaXQ/OiBSZXF1ZXN0SW5pdCkgPT4gUHJvbWlzZTxSZXNwb25zZT47XG5cbmV4cG9ydCBjbGFzcyBXaXNlTWluZEFwaUVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBzdGF0dXM/OiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nLCBzdGF0dXM/OiBudW1iZXIpIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICB0aGlzLm5hbWUgPSAnV2lzZU1pbmRBcGlFcnJvcic7XG4gICAgdGhpcy5zdGF0dXMgPSBzdGF0dXM7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFdpc2VNaW5kQXBpQ2xpZW50IHtcbiAgcHJpdmF0ZSBiYXNlVXJsOiBzdHJpbmc7XG4gIHByaXZhdGUgZmV0Y2hJbXBsOiBGZXRjaExpa2U7XG4gIHByaXZhdGUgdGltZW91dE1zOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoYmFzZVVybDogc3RyaW5nLCBmZXRjaEltcGw6IEZldGNoTGlrZSA9IGZldGNoLmJpbmQoZ2xvYmFsVGhpcyksIHRpbWVvdXRNcyA9IDEwMDAwKSB7XG4gICAgdGhpcy5iYXNlVXJsID0gbm9ybWFsaXplQmFzZVVybChiYXNlVXJsKTtcbiAgICB0aGlzLmZldGNoSW1wbCA9IGZldGNoSW1wbDtcbiAgICB0aGlzLnRpbWVvdXRNcyA9IHRpbWVvdXRNcztcbiAgfVxuXG4gIGFzeW5jIGhlYWx0aCgpIHtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCcvYXBpL2hlYWx0aCcpO1xuICB9XG5cbiAgYXN5bmMgc2VhcmNoKHE6IHN0cmluZywgdHlwZXM/OiBzdHJpbmdbXSkge1xuICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoeyBxIH0pO1xuICAgIGlmICh0eXBlcz8ubGVuZ3RoKSBwYXJhbXMuc2V0KCd0eXBlcycsIHR5cGVzLmpvaW4oJywnKSk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdChgL2FwaS9zZWFyY2g/JHtwYXJhbXMudG9TdHJpbmcoKX1gKTtcbiAgfVxuXG4gIGFzeW5jIGxpc3ROb3RlcyhwYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCB1bmRlZmluZWQ+ID0ge30pIHtcbiAgICByZXR1cm4gdGhpcy5nZXREYXRhPGFueVtdPihgL2FwaS92Mi9ub3RlcyR7dG9RdWVyeShwYXJhbXMpfWApO1xuICB9XG5cbiAgYXN5bmMgZ2V0Tm90ZShpZDogbnVtYmVyIHwgc3RyaW5nKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0RGF0YTxhbnk+KGAvYXBpL3YyL25vdGVzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KFN0cmluZyhpZCkpfWApO1xuICB9XG5cbiAgYXN5bmMgbGlzdE5vdGVGb2xkZXJzKCkge1xuICAgIHJldHVybiB0aGlzLmdldERhdGE8V2lzZU1pbmRGb2xkZXJbXT4oJy9hcGkvdjIvbm90ZS1mb2xkZXJzJyk7XG4gIH1cblxuICBhc3luYyByZXNvbHZlTm90ZUZvbGRlcihuYW1lOiBzdHJpbmcsIGZyb21Gb2xkZXI/OiBzdHJpbmcgfCBudW1iZXIgfCBudWxsKSB7XG4gICAgcmV0dXJuIHRoaXMucG9zdERhdGEoJy9hcGkvdjIvbm90ZS1mb2xkZXJzL3Jlc29sdmUnLCB7IG5hbWUsIGZyb21fZm9sZGVyOiBub3JtYWxpemVOdWxsYWJsZShmcm9tRm9sZGVyKSB9KTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZU5vdGUocGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pIHtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCcvYXBpL3YyL25vdGVzJywgeyBtZXRob2Q6ICdQT1NUJywgYm9keTogSlNPTi5zdHJpbmdpZnkocGF5bG9hZCkgfSk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVOb3RlKGlkOiBudW1iZXIgfCBzdHJpbmcsIHBheWxvYWQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdChgL2FwaS92Mi9ub3Rlcy8ke2VuY29kZVVSSUNvbXBvbmVudChTdHJpbmcoaWQpKX1gLCB7IG1ldGhvZDogJ1BBVENIJywgYm9keTogSlNPTi5zdHJpbmdpZnkocGF5bG9hZCkgfSk7XG4gIH1cblxuICBhc3luYyBsaXN0RG9jdW1lbnRzKHBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IHVuZGVmaW5lZD4gPSB7fSkge1xuICAgIHJldHVybiB0aGlzLmdldERhdGE8YW55W10+KGAvYXBpL3YyL2ZpbGVzJHt0b1F1ZXJ5KHBhcmFtcyl9YCk7XG4gIH1cblxuICBhc3luYyBnZXREb2N1bWVudChpZDogbnVtYmVyIHwgc3RyaW5nKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0RGF0YTxhbnk+KGAvYXBpL3YyL2ZpbGVzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KFN0cmluZyhpZCkpfWApO1xuICB9XG5cbiAgYXN5bmMgbGlzdEZpbGVGb2xkZXJzKCkge1xuICAgIHJldHVybiB0aGlzLmdldERhdGE8V2lzZU1pbmRGb2xkZXJbXT4oJy9hcGkvdjIvZmlsZS1mb2xkZXJzJyk7XG4gIH1cblxuICBhc3luYyByZXNvbHZlRmlsZUZvbGRlcihuYW1lOiBzdHJpbmcsIGZyb21Gb2xkZXI/OiBzdHJpbmcgfCBudW1iZXIgfCBudWxsKSB7XG4gICAgcmV0dXJuIHRoaXMucG9zdERhdGEoJy9hcGkvdjIvZmlsZS1mb2xkZXJzL3Jlc29sdmUnLCB7IG5hbWUsIGZyb21fZm9sZGVyOiBub3JtYWxpemVOdWxsYWJsZShmcm9tRm9sZGVyKSB9KTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZURvY3VtZW50KHBheWxvYWQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgnL2FwaS92Mi9maWxlcycsIHsgbWV0aG9kOiAnUE9TVCcsIGJvZHk6IEpTT04uc3RyaW5naWZ5KHBheWxvYWQpIH0pO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlRG9jdW1lbnQoaWQ6IG51bWJlciB8IHN0cmluZywgcGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pIHtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KGAvYXBpL3YyL2ZpbGVzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KFN0cmluZyhpZCkpfWAsIHsgbWV0aG9kOiAnUEFUQ0gnLCBib2R5OiBKU09OLnN0cmluZ2lmeShwYXlsb2FkKSB9KTtcbiAgfVxuXG4gIGFzeW5jIHVwc2VydERvY3VtZW50KHBheWxvYWQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB7XG4gICAgcmV0dXJuIHRoaXMucG9zdERhdGEoJy9hcGkvdjIvZmlsZXMvdXBzZXJ0JywgcGF5bG9hZCk7XG4gIH1cblxuICBhc3luYyBsaXN0S25vd2xlZGdlQmFzZXMocGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgdW5kZWZpbmVkPiA9IHt9KSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0RGF0YTxhbnlbXT4oYC9hcGkvdjIva25vd2xlZGdlLWJhc2VzJHt0b1F1ZXJ5KHBhcmFtcyl9YCk7XG4gIH1cblxuICBhc3luYyByZXNvbHZlS25vd2xlZGdlQmFzZShuYW1lOiBzdHJpbmcsIGV4dHJhOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9KSB7XG4gICAgcmV0dXJuIHRoaXMucG9zdERhdGEoJy9hcGkvdjIva25vd2xlZGdlLWJhc2VzL3Jlc29sdmUnLCB7IG5hbWUsIC4uLmV4dHJhIH0pO1xuICB9XG5cbiAgYXN5bmMgbGlzdEtub3dsZWRnZURvY3VtZW50cyhrbm93bGVkZ2VCYXNlSWQ/OiBudW1iZXIgfCBzdHJpbmcsIHE/OiBzdHJpbmcpIHtcbiAgICByZXR1cm4gdGhpcy5nZXREYXRhPGFueVtdPihcbiAgICAgIGAvYXBpL3YyL2tub3dsZWRnZS1kb2N1bWVudHMke3RvUXVlcnkoeyBrbm93bGVkZ2VCYXNlSWQsIHEgfSl9YCxcbiAgICApO1xuICB9XG5cbiAgYXN5bmMgZ2V0S25vd2xlZGdlRG9jdW1lbnQoaWQ6IG51bWJlciB8IHN0cmluZykge1xuICAgIHJldHVybiB0aGlzLmdldERhdGE8YW55PihgL2FwaS92Mi9rbm93bGVkZ2UtZG9jdW1lbnRzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KFN0cmluZyhpZCkpfWApO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlS25vd2xlZGdlRG9jdW1lbnQocGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pIHtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCcvYXBpL3YyL2tub3dsZWRnZS1kb2N1bWVudHMnLCB7IG1ldGhvZDogJ1BPU1QnLCBib2R5OiBKU09OLnN0cmluZ2lmeShwYXlsb2FkKSB9KTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZUtub3dsZWRnZURvY3VtZW50KGlkOiBudW1iZXIgfCBzdHJpbmcsIHBheWxvYWQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdChgL2FwaS92Mi9rbm93bGVkZ2UtZG9jdW1lbnRzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KFN0cmluZyhpZCkpfWAsIHtcbiAgICAgIG1ldGhvZDogJ1BBVENIJyxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHBheWxvYWQpLFxuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgbG9hZFNuYXBzaG90KCk6IFByb21pc2U8V2lzZU1pbmRTbmFwc2hvdD4ge1xuICAgIGNvbnN0IFtub3Rlcywgbm90ZUZvbGRlcnMsIGRvY3VtZW50cywgZG9jdW1lbnRGb2xkZXJzLCBrbm93bGVkZ2VCYXNlc10gPSBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICB0aGlzLmxpc3ROb3Rlcyh7IGluY2x1ZGVGb2xkZXJzOiB0cnVlIH0pLFxuICAgICAgdGhpcy5saXN0Tm90ZUZvbGRlcnMoKSxcbiAgICAgIHRoaXMubGlzdERvY3VtZW50cyh7IGluY2x1ZGVGb2xkZXJzOiB0cnVlLCBsaW1pdDogMjAwIH0pLFxuICAgICAgdGhpcy5saXN0RmlsZUZvbGRlcnMoKSxcbiAgICAgIHRoaXMubGlzdEtub3dsZWRnZUJhc2VzKCksXG4gICAgXSk7XG5cbiAgICBjb25zdCBrbm93bGVkZ2VEb2N1bWVudHNOZXN0ZWQgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgIGtub3dsZWRnZUJhc2VzLm1hcCgoYmFzZTogYW55KSA9PiB0aGlzLmxpc3RLbm93bGVkZ2VEb2N1bWVudHMoYmFzZS5pZCkuY2F0Y2goKCkgPT4gW10pKSxcbiAgICApO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5vdGVzLFxuICAgICAgbm90ZUZvbGRlcnMsXG4gICAgICBkb2N1bWVudHMsXG4gICAgICBkb2N1bWVudEZvbGRlcnMsXG4gICAgICBrbm93bGVkZ2VCYXNlcyxcbiAgICAgIGtub3dsZWRnZURvY3VtZW50czoga25vd2xlZGdlRG9jdW1lbnRzTmVzdGVkLmZsYXQoKSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBnZXREYXRhPFQ+KHBhdGg6IHN0cmluZyk6IFByb21pc2U8VD4ge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5yZXF1ZXN0KHBhdGgpO1xuICAgIHJldHVybiAocmVzcG9uc2U/LmRhdGEgPz8gW10pIGFzIFQ7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHBvc3REYXRhPFQgPSBhbnk+KHBhdGg6IHN0cmluZywgYm9keTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBQcm9taXNlPFQ+IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMucmVxdWVzdChwYXRoLCB7IG1ldGhvZDogJ1BPU1QnLCBib2R5OiBKU09OLnN0cmluZ2lmeShib2R5KSB9KTtcbiAgICByZXR1cm4gKHJlc3BvbnNlPy5kYXRhID8/IHJlc3BvbnNlKSBhcyBUO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyByZXF1ZXN0KHBhdGg6IHN0cmluZywgaW5pdDogUmVxdWVzdEluaXQgPSB7fSkge1xuICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgY29uc3QgdGltZW91dCA9IGdsb2JhbFRoaXMuc2V0VGltZW91dCgoKSA9PiBjb250cm9sbGVyLmFib3J0KCksIHRoaXMudGltZW91dE1zKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmZldGNoSW1wbChgJHt0aGlzLmJhc2VVcmx9JHtwYXRofWAsIHtcbiAgICAgICAgLi4uaW5pdCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgLi4uKGluaXQuaGVhZGVycyB8fCB7fSksXG4gICAgICAgIH0sXG4gICAgICAgIHNpZ25hbDogY29udHJvbGxlci5zaWduYWwsXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgdGV4dCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcbiAgICAgIGxldCBqc29uOiBhbnkgPSB7fTtcbiAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAganNvbiA9IEpTT04ucGFyc2UodGV4dCk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIHRocm93IG5ldyBXaXNlTWluZEFwaUVycm9yKCdXaXNlTWluZEFJIFx1NjcyQ1x1NTczMFx1NjNBNVx1NTNFM1x1OEZENFx1NTZERVx1NEU4Nlx1NjVFMFx1NkNENVx1ODlFM1x1Njc5MFx1NzY4NFx1NjU3MFx1NjM2RScsIHJlc3BvbnNlLnN0YXR1cyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICB0aHJvdyBuZXcgV2lzZU1pbmRBcGlFcnJvcihqc29uPy5lcnJvciB8fCBqc29uPy5tZXNzYWdlIHx8IGBXaXNlTWluZEFJIFx1OEJGN1x1NkM0Mlx1NTkzMVx1OEQyNVx1RkYxQSR7cmVzcG9uc2Uuc3RhdHVzfWAsIHJlc3BvbnNlLnN0YXR1cyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBqc29uO1xuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIGlmIChlcnJvcj8ubmFtZSA9PT0gJ0Fib3J0RXJyb3InKSB7XG4gICAgICAgIHRocm93IG5ldyBXaXNlTWluZEFwaUVycm9yKCdcdThGREVcdTYzQTUgV2lzZU1pbmRBSSBcdTY3MkNcdTU3MzBcdTYzQTVcdTUzRTNcdThEODVcdTY1RjYnKTtcbiAgICAgIH1cbiAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIFdpc2VNaW5kQXBpRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgICB0aHJvdyBuZXcgV2lzZU1pbmRBcGlFcnJvcihlcnJvcj8ubWVzc2FnZSB8fCAnXHU2NUUwXHU2Q0Q1XHU4RkRFXHU2M0E1IFdpc2VNaW5kQUkgXHU2NzJDXHU1NzMwXHU2M0E1XHU1M0UzJyk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGdsb2JhbFRoaXMuY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgY29uc3Qgbm9ybWFsaXplQmFzZVVybCA9ICh2YWx1ZTogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IHRyaW1tZWQgPSAodmFsdWUgfHwgJ2h0dHA6Ly8xMjcuMC4wLjE6MzgyMjEnKS50cmltKCk7XG4gIHJldHVybiB0cmltbWVkLnJlcGxhY2UoL1xcLyskLywgJycpO1xufTtcblxuZXhwb3J0IGNvbnN0IHRvUXVlcnkgPSAocGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgdW5kZWZpbmVkIHwgbnVsbD4pID0+IHtcbiAgY29uc3QgcXVlcnkgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKCk7XG4gIE9iamVjdC5lbnRyaWVzKHBhcmFtcykuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09ICcnKSB7XG4gICAgICBxdWVyeS5zZXQoa2V5LCBTdHJpbmcodmFsdWUpKTtcbiAgICB9XG4gIH0pO1xuICBjb25zdCB0ZXh0ID0gcXVlcnkudG9TdHJpbmcoKTtcbiAgcmV0dXJuIHRleHQgPyBgPyR7dGV4dH1gIDogJyc7XG59O1xuXG5jb25zdCBub3JtYWxpemVOdWxsYWJsZSA9ICh2YWx1ZT86IHN0cmluZyB8IG51bWJlciB8IG51bGwpID0+IHtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09ICcnKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIFN0cmluZyh2YWx1ZSk7XG59O1xuIiwgImltcG9ydCB7IHN0cmlwU291cmNlTWFya2VycyB9IGZyb20gJy4vbWFya2Vycyc7XG5pbXBvcnQgeyBoYXNoVGV4dCwgbWFya2Rvd25Ub1BsYWluVGV4dCwgbm9ybWFsaXplVGFncyB9IGZyb20gJy4vdGV4dCc7XG5pbXBvcnQgdHlwZSB7IFdpc2VNaW5kRm9sZGVyLCBXaXNlTWluZFNuYXBzaG90LCBXaXNlTWluZFNvdXJjZUl0ZW0gfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB0eXBlIHsgV2lzZU1pbmRBcGlDbGllbnQgfSBmcm9tICcuL3dpc2VtaW5kQXBpJztcblxuZXhwb3J0IHR5cGUgV2lzZU1pbmRTY2FuT3B0aW9ucyA9IHtcbiAgaW5jbHVkZU5vdGVzOiBib29sZWFuO1xuICBpbmNsdWRlRG9jdW1lbnRzOiBib29sZWFuO1xuICBpbmNsdWRlS25vd2xlZGdlRG9jdW1lbnRzOiBib29sZWFuO1xufTtcblxuZXhwb3J0IGNvbnN0IGxvYWRXaXNlTWluZFNvdXJjZXMgPSBhc3luYyAoXG4gIGFwaTogV2lzZU1pbmRBcGlDbGllbnQsXG4gIG9wdGlvbnM6IFdpc2VNaW5kU2Nhbk9wdGlvbnMsXG4pOiBQcm9taXNlPHsgc25hcHNob3Q6IFdpc2VNaW5kU25hcHNob3Q7IGl0ZW1zOiBXaXNlTWluZFNvdXJjZUl0ZW1bXSB9PiA9PiB7XG4gIGNvbnN0IHNuYXBzaG90ID0gYXdhaXQgYXBpLmxvYWRTbmFwc2hvdCgpO1xuICBjb25zdCBpdGVtczogV2lzZU1pbmRTb3VyY2VJdGVtW10gPSBbXTtcblxuICBpZiAob3B0aW9ucy5pbmNsdWRlTm90ZXMpIHtcbiAgICBmb3IgKGNvbnN0IG5vdGUgb2Ygc25hcHNob3Qubm90ZXMuZmlsdGVyKGl0ZW0gPT4gIWl0ZW0uaXNfZm9sZGVyKSkge1xuICAgICAgaXRlbXMucHVzaChhd2FpdCBub3JtYWxpemVXaXNlTWluZE5vdGUobm90ZSwgc25hcHNob3Qubm90ZUZvbGRlcnMpKTtcbiAgICB9XG4gIH1cblxuICBpZiAob3B0aW9ucy5pbmNsdWRlRG9jdW1lbnRzKSB7XG4gICAgZm9yIChjb25zdCBkb2Mgb2Ygc25hcHNob3QuZG9jdW1lbnRzLmZpbHRlcihpdGVtID0+ICFpdGVtLmlzX2ZvbGRlciAmJiBpc01hcmtkb3duUmVjb3JkKGl0ZW0pKSkge1xuICAgICAgY29uc3QgZGV0YWlsID0gaGFzRG9jdW1lbnRCb2R5KGRvYykgPyBkb2MgOiBhd2FpdCBhcGkuZ2V0RG9jdW1lbnQoZG9jLmlkKS5jYXRjaCgoKSA9PiBkb2MpO1xuICAgICAgY29uc3Qgbm9ybWFsaXplZCA9IGF3YWl0IG5vcm1hbGl6ZVdpc2VNaW5kRG9jdW1lbnQoeyAuLi5kb2MsIC4uLmRldGFpbCB9LCBzbmFwc2hvdC5kb2N1bWVudEZvbGRlcnMpO1xuICAgICAgaWYgKG5vcm1hbGl6ZWQubWFya2Rvd24udHJpbSgpKSBpdGVtcy5wdXNoKG5vcm1hbGl6ZWQpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChvcHRpb25zLmluY2x1ZGVLbm93bGVkZ2VEb2N1bWVudHMpIHtcbiAgICBmb3IgKGNvbnN0IGtub3dsZWRnZURvY3VtZW50IG9mIHNuYXBzaG90Lmtub3dsZWRnZURvY3VtZW50cy5maWx0ZXIoaXNNYXJrZG93blJlY29yZCkpIHtcbiAgICAgIGNvbnN0IGJhc2UgPSBzbmFwc2hvdC5rbm93bGVkZ2VCYXNlcy5maW5kKGl0ZW0gPT4gU3RyaW5nKGl0ZW0uaWQpID09PSBTdHJpbmcoa25vd2xlZGdlRG9jdW1lbnQua25vd2xlZGdlQmFzZUlkKSk7XG4gICAgICBpdGVtcy5wdXNoKGF3YWl0IG5vcm1hbGl6ZVdpc2VNaW5kS25vd2xlZGdlRG9jdW1lbnQoa25vd2xlZGdlRG9jdW1lbnQsIGJhc2UpKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4geyBzbmFwc2hvdCwgaXRlbXMgfTtcbn07XG5cbmV4cG9ydCBjb25zdCBub3JtYWxpemVXaXNlTWluZE5vdGUgPSBhc3luYyAobm90ZTogYW55LCBmb2xkZXJzOiBXaXNlTWluZEZvbGRlcltdID0gW10pOiBQcm9taXNlPFdpc2VNaW5kU291cmNlSXRlbT4gPT4ge1xuICBjb25zdCBtYXJrZG93biA9IHN0cmlwU291cmNlTWFya2VycyhmaXJzdFRleHQobm90ZS5tZCwgbm90ZS50ZXh0LCBub3RlLmNvbnRlbnQpKTtcbiAgY29uc3QgdGl0bGUgPSBmaXJzdFRleHQobm90ZS50aXRsZSwgbm90ZS5maWxlTmFtZSwgYG5vdGUtJHtub3RlLmlkfWApO1xuICBjb25zdCBmb2xkZXJQYXRoID0gcmVzb2x2ZUZvbGRlclBhdGgobm90ZS5mcm9tX2ZvbGRlciwgZm9sZGVycyk7XG4gIHJldHVybiB7XG4gICAgc291cmNlVHlwZTogJ25vdGUnLFxuICAgIGlkOiBub3RlLmlkLFxuICAgIHRpdGxlLFxuICAgIG1hcmtkb3duLFxuICAgIHBsYWluVGV4dDogZmlyc3RUZXh0KG5vdGUudGV4dCwgbWFya2Rvd25Ub1BsYWluVGV4dChtYXJrZG93bikpLFxuICAgIHRhZ3M6IG5vcm1hbGl6ZVRhZ3Mobm90ZS50YWdzKSxcbiAgICBmb2xkZXJQYXRoLFxuICAgIHVwZGF0ZWRBdDogbm90ZS51cGRhdGVkX2F0IHx8IG5vdGUubGFzdE1vZGlmaWVkLFxuICAgIGNvbnRlbnRIYXNoOiBhd2FpdCBoYXNoVGV4dChtYXJrZG93biksXG4gICAgcmF3OiBub3RlLFxuICB9O1xufTtcblxuZXhwb3J0IGNvbnN0IG5vcm1hbGl6ZVdpc2VNaW5kRG9jdW1lbnQgPSBhc3luYyAoZG9jOiBhbnksIGZvbGRlcnM6IFdpc2VNaW5kRm9sZGVyW10gPSBbXSk6IFByb21pc2U8V2lzZU1pbmRTb3VyY2VJdGVtPiA9PiB7XG4gIGNvbnN0IG1hcmtkb3duID0gc3RyaXBTb3VyY2VNYXJrZXJzKGZpcnN0VGV4dChkb2MuY29udGVudCwgZG9jLm1kLCBkb2MubWFya2Rvd24sIGRvYy5ub3RlLCBkb2Muc3VtbWFyeSkpO1xuICBjb25zdCB0aXRsZSA9IGZpcnN0VGV4dChkb2MubmFtZSwgZG9jLnRpdGxlLCBgZG9jdW1lbnQtJHtkb2MuaWR9YCk7XG4gIGNvbnN0IGZvbGRlclBhdGggPSByZXNvbHZlRm9sZGVyUGF0aChkb2MuZnJvbV9mb2xkZXIsIGZvbGRlcnMpO1xuICByZXR1cm4ge1xuICAgIHNvdXJjZVR5cGU6ICdkb2N1bWVudCcsXG4gICAgaWQ6IGRvYy5pZCxcbiAgICB0aXRsZSxcbiAgICBtYXJrZG93bixcbiAgICBwbGFpblRleHQ6IG1hcmtkb3duVG9QbGFpblRleHQobWFya2Rvd24pLFxuICAgIHRhZ3M6IG5vcm1hbGl6ZVRhZ3MoZG9jLnRhZ3MpLFxuICAgIGZvbGRlclBhdGgsXG4gICAgdXBkYXRlZEF0OiBkb2MudXBkYXRlZF9hdCB8fCBkb2MubGFzdE1vZGlmaWVkLFxuICAgIGNvbnRlbnRIYXNoOiBhd2FpdCBoYXNoVGV4dChtYXJrZG93biksXG4gICAgcmF3OiBkb2MsXG4gIH07XG59O1xuXG5jb25zdCBoYXNEb2N1bWVudEJvZHkgPSAoZG9jOiBhbnkpID0+IEJvb2xlYW4oZmlyc3RUZXh0KGRvYz8uY29udGVudCwgZG9jPy5tZCwgZG9jPy5tYXJrZG93biwgZG9jPy5ub3RlLCBkb2M/LnN1bW1hcnkpKTtcblxuZXhwb3J0IGNvbnN0IG5vcm1hbGl6ZVdpc2VNaW5kS25vd2xlZGdlRG9jdW1lbnQgPSBhc3luYyAoZG9jOiBhbnksIGJhc2U6IGFueSk6IFByb21pc2U8V2lzZU1pbmRTb3VyY2VJdGVtPiA9PiB7XG4gIGNvbnN0IG1hcmtkb3duID0gc3RyaXBTb3VyY2VNYXJrZXJzKGZpcnN0VGV4dChkb2MuY29udGVudCwgZG9jLnN1bW1hcnkpKTtcbiAgY29uc3Qga25vd2xlZGdlQmFzZU5hbWUgPSBmaXJzdFRleHQoYmFzZT8ubmFtZSwgYGtub3dsZWRnZS0ke2RvYy5rbm93bGVkZ2VCYXNlSWR9YCk7XG4gIGNvbnN0IHRpdGxlID0gZmlyc3RUZXh0KGRvYy50aXRsZSwgYGtub3dsZWRnZS1kb2N1bWVudC0ke2RvYy5pZH1gKTtcbiAgcmV0dXJuIHtcbiAgICBzb3VyY2VUeXBlOiAna25vd2xlZGdlLWRvY3VtZW50JyxcbiAgICBpZDogZG9jLmlkLFxuICAgIHRpdGxlLFxuICAgIG1hcmtkb3duLFxuICAgIHBsYWluVGV4dDogbWFya2Rvd25Ub1BsYWluVGV4dChtYXJrZG93biksXG4gICAgdGFnczogbm9ybWFsaXplVGFncyhkb2MudGFncyksXG4gICAgZm9sZGVyUGF0aDogYEtub3dsZWRnZS8ke2tub3dsZWRnZUJhc2VOYW1lfWAsXG4gICAgdXBkYXRlZEF0OiBkb2MudXBkYXRlZF9hdCxcbiAgICBjb250ZW50SGFzaDogYXdhaXQgaGFzaFRleHQobWFya2Rvd24pLFxuICAgIGtub3dsZWRnZUJhc2VOYW1lLFxuICAgIHJhdzogZG9jLFxuICB9O1xufTtcblxuZXhwb3J0IGNvbnN0IHJlc29sdmVGb2xkZXJQYXRoID0gKGZvbGRlcklkOiB1bmtub3duLCBmb2xkZXJzOiBXaXNlTWluZEZvbGRlcltdKSA9PiB7XG4gIGlmIChmb2xkZXJJZCA9PT0gdW5kZWZpbmVkIHx8IGZvbGRlcklkID09PSBudWxsIHx8IGZvbGRlcklkID09PSAnJykgcmV0dXJuICcnO1xuICBjb25zdCBieUlkID0gbmV3IE1hcChmb2xkZXJzLm1hcChmb2xkZXIgPT4gW1N0cmluZyhmb2xkZXIuaWQpLCBmb2xkZXJdKSk7XG4gIGNvbnN0IG5hbWVzOiBzdHJpbmdbXSA9IFtdO1xuICBsZXQgY3VycmVudCA9IGJ5SWQuZ2V0KFN0cmluZyhmb2xkZXJJZCkpO1xuICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIHdoaWxlIChjdXJyZW50ICYmICFzZWVuLmhhcyhTdHJpbmcoY3VycmVudC5pZCkpKSB7XG4gICAgc2Vlbi5hZGQoU3RyaW5nKGN1cnJlbnQuaWQpKTtcbiAgICBuYW1lcy51bnNoaWZ0KGN1cnJlbnQubmFtZSk7XG4gICAgY3VycmVudCA9IGN1cnJlbnQuZnJvbV9mb2xkZXIgPyBieUlkLmdldChTdHJpbmcoY3VycmVudC5mcm9tX2ZvbGRlcikpIDogdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiBuYW1lcy5qb2luKCcvJyk7XG59O1xuXG5leHBvcnQgY29uc3QgaXNNYXJrZG93blJlY29yZCA9IChyZWNvcmQ6IGFueSkgPT4ge1xuICBjb25zdCB2YWx1ZXMgPSBbXG4gICAgcmVjb3JkPy50eXBlLFxuICAgIHJlY29yZD8uZmlsZVR5cGUsXG4gICAgcmVjb3JkPy5maWxlX3R5cGUsXG4gICAgcmVjb3JkPy5maWxlRXh0LFxuICAgIHJlY29yZD8uZmlsZV9leHQsXG4gICAgcmVjb3JkPy5leHQsXG4gICAgcmVjb3JkPy5leHRlbnNpb24sXG4gICAgcmVjb3JkPy5uYW1lLFxuICAgIHJlY29yZD8udGl0bGUsXG4gICAgcmVjb3JkPy5maWxlTmFtZSxcbiAgICByZWNvcmQ/LmZpbGVuYW1lLFxuICAgIHJlY29yZD8uZmlsZVBhdGgsXG4gICAgcmVjb3JkPy5wYXRoLFxuICAgIHJlY29yZD8ubWQsXG4gICAgcmVjb3JkPy5jb250ZW50LFxuICBdO1xuXG4gIHJldHVybiB2YWx1ZXMuc29tZSh2YWx1ZSA9PiB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCBub3JtYWxpemVkID0gdmFsdWUudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gICAgcmV0dXJuIG5vcm1hbGl6ZWQgPT09ICdtZCcgfHwgbm9ybWFsaXplZCA9PT0gJy5tZCcgfHwgbm9ybWFsaXplZCA9PT0gJ21hcmtkb3duJyB8fCBub3JtYWxpemVkLmVuZHNXaXRoKCcubWQnKTtcbiAgfSk7XG59O1xuXG5jb25zdCBmaXJzdFRleHQgPSAoLi4udmFsdWVzOiB1bmtub3duW10pID0+IHtcbiAgZm9yIChjb25zdCB2YWx1ZSBvZiB2YWx1ZXMpIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyAmJiB2YWx1ZS50cmltKCkpIHJldHVybiB2YWx1ZS50cmltKCk7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHJldHVybiBTdHJpbmcodmFsdWUpO1xuICB9XG4gIHJldHVybiAnJztcbn07XG4iLCAiaW1wb3J0IHR5cGUgeyBBcHAsIFRGaWxlIH0gZnJvbSAnb2JzaWRpYW4nO1xuXG5pbXBvcnQgeyBhcHBlbmRNYXJrZXIsIGNyZWF0ZVdpc2VNaW5kU291cmNlTWFya2VyLCBmaW5kU291cmNlTWFya2VyIH0gZnJvbSAnLi9tYXJrZXJzJztcbmltcG9ydCB7IHF1b3RlWWFtbFN0cmluZywgc2FuaXRpemVGaWxlTmFtZSB9IGZyb20gJy4vdGV4dCc7XG5pbXBvcnQgdHlwZSB7IEJyaWRnZUl0ZW1SZXN1bHQsIER1cGxpY2F0ZVBvbGljeSwgV2lzZU1pbmRTb3VyY2VJdGVtIH0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBjb25zdCBidWlsZE9ic2lkaWFuRGVzdGluYXRpb25QYXRoID0gKGl0ZW06IFdpc2VNaW5kU291cmNlSXRlbSwgcm9vdDogc3RyaW5nLCBpbmNsdWRlRm9sZGVyID0gdHJ1ZSkgPT4ge1xuICBjb25zdCBzYWZlUm9vdCA9IHRyaW1TbGFzaGVzKHJvb3QpO1xuICBjb25zdCBzYWZlVGl0bGUgPSBzYW5pdGl6ZUZpbGVOYW1lKGl0ZW0udGl0bGUsIGAke2l0ZW0uc291cmNlVHlwZX0tJHtpdGVtLmlkfWApO1xuICBjb25zdCBmb2xkZXIgPSBpbmNsdWRlRm9sZGVyXG4gICAgPyBpdGVtLnNvdXJjZVR5cGUgPT09ICdub3RlJ1xuICAgICAgPyBpdGVtLmZvbGRlclBhdGggfHwgJydcbiAgICAgIDogaXRlbS5zb3VyY2VUeXBlID09PSAnZG9jdW1lbnQnXG4gICAgICAgID8gaXRlbS5mb2xkZXJQYXRoIHx8ICcnXG4gICAgICAgIDogc2FuaXRpemVGaWxlTmFtZShpdGVtLmtub3dsZWRnZUJhc2VOYW1lIHx8ICdcdTY3MkFcdTU0N0RcdTU0MERcdTc3RTVcdThCQzZcdTVFOTMnLCAnXHU2NzJBXHU1NDdEXHU1NDBEXHU3N0U1XHU4QkM2XHU1RTkzJylcbiAgICA6ICcnO1xuICByZXR1cm4gbm9ybWFsaXplUGF0aChgJHtzYWZlUm9vdCA/IGAke3NhZmVSb290fS9gIDogJyd9JHtmb2xkZXJ9LyR7c2FmZVRpdGxlfS5tZGApO1xufTtcblxuZXhwb3J0IGNvbnN0IGJ1aWxkT2JzaWRpYW5GaWxlQ29udGVudCA9IChpdGVtOiBXaXNlTWluZFNvdXJjZUl0ZW0pID0+IHtcbiAgY29uc3QgbGluZXMgPSBbXG4gICAgJy0tLScsXG4gICAgYHRpdGxlOiAke3F1b3RlWWFtbFN0cmluZyhpdGVtLnRpdGxlKX1gLFxuICAgIGB3aXNlbWluZF9zb3VyY2VfdHlwZTogJHtpdGVtLnNvdXJjZVR5cGV9YCxcbiAgICBgd2lzZW1pbmRfc291cmNlX2lkOiAke3F1b3RlWWFtbFN0cmluZyhTdHJpbmcoaXRlbS5pZCkpfWAsXG4gICAgaXRlbS5rbm93bGVkZ2VCYXNlTmFtZSA/IGB3aXNlbWluZF9rbm93bGVkZ2VfYmFzZTogJHtxdW90ZVlhbWxTdHJpbmcoaXRlbS5rbm93bGVkZ2VCYXNlTmFtZSl9YCA6ICcnLFxuICAgIGl0ZW0udGFncy5sZW5ndGggPyBgdGFnczogJHtKU09OLnN0cmluZ2lmeShpdGVtLnRhZ3MpfWAgOiAnJyxcbiAgICAnLS0tJyxcbiAgICAnJyxcbiAgICBpdGVtLm1hcmtkb3duLFxuICBdLmZpbHRlcihsaW5lID0+IGxpbmUgIT09ICcnKTtcbiAgcmV0dXJuIGFwcGVuZE1hcmtlcihsaW5lcy5qb2luKCdcXG4nKSwgY3JlYXRlV2lzZU1pbmRTb3VyY2VNYXJrZXIoaXRlbSkpO1xufTtcblxuZXhwb3J0IGNvbnN0IHdyaXRlV2lzZU1pbmRJdGVtVG9PYnNpZGlhbiA9IGFzeW5jIChcbiAgYXBwOiBBcHAsXG4gIGl0ZW06IFdpc2VNaW5kU291cmNlSXRlbSxcbiAgcm9vdDogc3RyaW5nLFxuICBwb2xpY3k6IER1cGxpY2F0ZVBvbGljeSxcbiAgaW5jbHVkZUZvbGRlciA9IHRydWUsXG4pOiBQcm9taXNlPEJyaWRnZUl0ZW1SZXN1bHQ+ID0+IHtcbiAgY29uc3QgdGFyZ2V0UGF0aCA9IGJ1aWxkT2JzaWRpYW5EZXN0aW5hdGlvblBhdGgoaXRlbSwgcm9vdCwgaW5jbHVkZUZvbGRlcik7XG4gIGNvbnN0IGNvbnRlbnQgPSBidWlsZE9ic2lkaWFuRmlsZUNvbnRlbnQoaXRlbSk7XG4gIGNvbnN0IGV4aXN0aW5nUGF0aCA9IGF3YWl0IGZpbmRFeGlzdGluZ1dpc2VNaW5kRmlsZShhcHAsIGl0ZW0sIHRhcmdldFBhdGgpO1xuXG4gIGlmIChleGlzdGluZ1BhdGgpIHtcbiAgICBjb25zdCBleGlzdGluZ0ZpbGUgPSBhcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGV4aXN0aW5nUGF0aCkgYXMgVEZpbGUgfCBudWxsO1xuICAgIGlmIChwb2xpY3kgPT09ICdza2lwJykge1xuICAgICAgcmV0dXJuIHsgdGl0bGU6IGl0ZW0udGl0bGUsIHNvdXJjZTogZXhpc3RpbmdQYXRoLCBzdGF0dXM6ICdza2lwcGVkJywgbWVzc2FnZTogJ1x1NURGMlx1NUI1OFx1NTcyOFx1NTQwQ1x1Njc2NVx1NkU5MFx1NjU4N1x1NEVGNicgfTtcbiAgICB9XG4gICAgaWYgKHBvbGljeSA9PT0gJ3VwZGF0ZScgJiYgZXhpc3RpbmdGaWxlKSB7XG4gICAgICBhd2FpdCBhcHAudmF1bHQubW9kaWZ5KGV4aXN0aW5nRmlsZSwgY29udGVudCk7XG4gICAgICByZXR1cm4geyB0aXRsZTogaXRlbS50aXRsZSwgc291cmNlOiBleGlzdGluZ1BhdGgsIHN0YXR1czogJ3VwZGF0ZWQnIH07XG4gICAgfVxuICB9XG5cbiAgY29uc3QgZmluYWxQYXRoID0gcG9saWN5ID09PSAnZHVwbGljYXRlJyA/IGF3YWl0IG5leHRBdmFpbGFibGVQYXRoKGFwcCwgdGFyZ2V0UGF0aCkgOiB0YXJnZXRQYXRoO1xuICBhd2FpdCBlbnN1cmVGb2xkZXIoYXBwLCBmaW5hbFBhdGguc3BsaXQoJy8nKS5zbGljZSgwLCAtMSkuam9pbignLycpKTtcbiAgYXdhaXQgYXBwLnZhdWx0LmNyZWF0ZShmaW5hbFBhdGgsIGNvbnRlbnQpO1xuICByZXR1cm4geyB0aXRsZTogaXRlbS50aXRsZSwgc291cmNlOiBmaW5hbFBhdGgsIHN0YXR1czogJ2NyZWF0ZWQnIH07XG59O1xuXG5leHBvcnQgY29uc3QgZW5zdXJlRm9sZGVyID0gYXN5bmMgKGFwcDogQXBwLCBmb2xkZXJQYXRoOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgcGFydHMgPSBmb2xkZXJQYXRoLnNwbGl0KCcvJykuZmlsdGVyKEJvb2xlYW4pO1xuICBsZXQgY3VycmVudCA9ICcnO1xuICBmb3IgKGNvbnN0IHBhcnQgb2YgcGFydHMpIHtcbiAgICBjdXJyZW50ID0gY3VycmVudCA/IGAke2N1cnJlbnR9LyR7cGFydH1gIDogcGFydDtcbiAgICBpZiAoIWFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoY3VycmVudCkpIHtcbiAgICAgIGF3YWl0IGFwcC52YXVsdC5jcmVhdGVGb2xkZXIoY3VycmVudCk7XG4gICAgfVxuICB9XG59O1xuXG5leHBvcnQgY29uc3QgbmV4dEF2YWlsYWJsZVBhdGggPSBhc3luYyAoYXBwOiBBcHAsIHBhdGg6IHN0cmluZykgPT4ge1xuICBpZiAoIWFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgocGF0aCkpIHJldHVybiBwYXRoO1xuICBjb25zdCBkb3QgPSBwYXRoLmxhc3RJbmRleE9mKCcuJyk7XG4gIGNvbnN0IGJhc2UgPSBkb3QgPT09IC0xID8gcGF0aCA6IHBhdGguc2xpY2UoMCwgZG90KTtcbiAgY29uc3QgZXh0ID0gZG90ID09PSAtMSA/ICcnIDogcGF0aC5zbGljZShkb3QpO1xuICBsZXQgaW5kZXggPSAyO1xuICBsZXQgY2FuZGlkYXRlID0gYCR7YmFzZX0gJHtpbmRleH0ke2V4dH1gO1xuICB3aGlsZSAoYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChjYW5kaWRhdGUpKSB7XG4gICAgaW5kZXggKz0gMTtcbiAgICBjYW5kaWRhdGUgPSBgJHtiYXNlfSAke2luZGV4fSR7ZXh0fWA7XG4gIH1cbiAgcmV0dXJuIGNhbmRpZGF0ZTtcbn07XG5cbmNvbnN0IGZpbmRFeGlzdGluZ1dpc2VNaW5kRmlsZSA9IGFzeW5jIChhcHA6IEFwcCwgaXRlbTogV2lzZU1pbmRTb3VyY2VJdGVtLCBmYWxsYmFja1BhdGg6IHN0cmluZykgPT4ge1xuICBjb25zdCBmYWxsYmFjayA9IGFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZmFsbGJhY2tQYXRoKTtcbiAgaWYgKGZhbGxiYWNrKSByZXR1cm4gZmFsbGJhY2tQYXRoO1xuICBjb25zdCBmaWxlcyA9IGFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCk7XG4gIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCBhcHAudmF1bHQuY2FjaGVkUmVhZChmaWxlKTtcbiAgICBjb25zdCBtYXJrZXIgPSBmaW5kU291cmNlTWFya2VyKGNvbnRlbnQpO1xuICAgIGlmIChtYXJrZXI/LnNvdXJjZSA9PT0gJ3dpc2VtaW5kJyAmJiBtYXJrZXIudHlwZSA9PT0gaXRlbS5zb3VyY2VUeXBlICYmIG1hcmtlci5pZCA9PT0gU3RyaW5nKGl0ZW0uaWQpKSB7XG4gICAgICByZXR1cm4gZmlsZS5wYXRoO1xuICAgIH1cbiAgfVxuICByZXR1cm4gJyc7XG59O1xuXG5jb25zdCB0cmltU2xhc2hlcyA9ICh2YWx1ZTogc3RyaW5nKSA9PiB2YWx1ZS5yZXBsYWNlKC9eXFwvK3xcXC8rJC9nLCAnJyk7XG5jb25zdCBub3JtYWxpemVQYXRoID0gKHZhbHVlOiBzdHJpbmcpID0+IHZhbHVlLnJlcGxhY2UoL1xcLysvZywgJy8nKS5yZXBsYWNlKC9cXC9cXC5tZCQvLCAnLm1kJyk7XG4iLCAiaW1wb3J0IHR5cGUgeyBBcHAgfSBmcm9tICdvYnNpZGlhbic7XG5cbmltcG9ydCB7IGVtcHR5UmVzdWx0LCBwdXNoIH0gZnJvbSAnLi9pbXBvcnRSdW5uZXInO1xuaW1wb3J0IHsgd3JpdGVXaXNlTWluZEl0ZW1Ub09ic2lkaWFuIH0gZnJvbSAnLi9vYnNpZGlhbldyaXRlcic7XG5pbXBvcnQgdHlwZSB7IEJyaWRnZVJ1blJlc3VsdCwgRHVwbGljYXRlUG9saWN5LCBXaXNlTWluZFNvdXJjZUl0ZW0gfSBmcm9tICcuL3R5cGVzJztcblxuZXhwb3J0IHR5cGUgV2lzZU1pbmRUb09ic2lkaWFuT3B0aW9ucyA9IHtcbiAgYXBwOiBBcHA7XG4gIGl0ZW1zOiBXaXNlTWluZFNvdXJjZUl0ZW1bXTtcbiAgcm9vdEZvbGRlcjogc3RyaW5nO1xuICByb290Rm9sZGVycz86IHN0cmluZ1tdO1xuICBpbmNsdWRlRm9sZGVyU3RydWN0dXJlPzogYm9vbGVhbjtcbiAgZHVwbGljYXRlUG9saWN5OiBEdXBsaWNhdGVQb2xpY3k7XG4gIGNodW5rU2l6ZTogbnVtYmVyO1xuICBzaWduYWw/OiBBYm9ydFNpZ25hbDtcbiAgb25Qcm9ncmVzcz86IChyZXN1bHQ6IEJyaWRnZVJ1blJlc3VsdCkgPT4gdm9pZDtcbn07XG5cbmV4cG9ydCBjb25zdCBydW5XaXNlTWluZFRvT2JzaWRpYW5JbXBvcnQgPSBhc3luYyAob3B0aW9uczogV2lzZU1pbmRUb09ic2lkaWFuT3B0aW9ucyk6IFByb21pc2U8QnJpZGdlUnVuUmVzdWx0PiA9PiB7XG4gIGNvbnN0IHJlc3VsdCA9IGVtcHR5UmVzdWx0KCk7XG4gIGNvbnN0IHJvb3RGb2xkZXJzID0gb3B0aW9ucy5yb290Rm9sZGVycz8ubGVuZ3RoID8gb3B0aW9ucy5yb290Rm9sZGVycyA6IFtvcHRpb25zLnJvb3RGb2xkZXJdO1xuICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgb3B0aW9ucy5pdGVtcy5sZW5ndGg7IGluZGV4ICs9IG9wdGlvbnMuY2h1bmtTaXplIHx8IDEwKSB7XG4gICAgaWYgKG9wdGlvbnMuc2lnbmFsPy5hYm9ydGVkKSBicmVhaztcbiAgICBjb25zdCBjaHVuayA9IG9wdGlvbnMuaXRlbXMuc2xpY2UoaW5kZXgsIGluZGV4ICsgKG9wdGlvbnMuY2h1bmtTaXplIHx8IDEwKSk7XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIGNodW5rKSB7XG4gICAgICBpZiAob3B0aW9ucy5zaWduYWw/LmFib3J0ZWQpIGJyZWFrO1xuICAgICAgdHJ5IHtcbiAgICAgICAgZm9yIChjb25zdCByb290Rm9sZGVyIG9mIHJvb3RGb2xkZXJzKSB7XG4gICAgICAgICAgY29uc3QgaXRlbVJlc3VsdCA9IGF3YWl0IHdyaXRlV2lzZU1pbmRJdGVtVG9PYnNpZGlhbihcbiAgICAgICAgICAgIG9wdGlvbnMuYXBwLFxuICAgICAgICAgICAgaXRlbSxcbiAgICAgICAgICAgIHJvb3RGb2xkZXIsXG4gICAgICAgICAgICBvcHRpb25zLmR1cGxpY2F0ZVBvbGljeSxcbiAgICAgICAgICAgIG9wdGlvbnMuaW5jbHVkZUZvbGRlclN0cnVjdHVyZSA/PyB0cnVlLFxuICAgICAgICAgICk7XG4gICAgICAgICAgcHVzaChyZXN1bHQsIGl0ZW1SZXN1bHQudGl0bGUsIGl0ZW1SZXN1bHQuc291cmNlLCBpdGVtUmVzdWx0LnN0YXR1cywgaXRlbVJlc3VsdC5tZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICBwdXNoKHJlc3VsdCwgaXRlbS50aXRsZSwgYCR7aXRlbS5zb3VyY2VUeXBlfToke2l0ZW0uaWR9YCwgJ2ZhaWxlZCcsIGVycm9yPy5tZXNzYWdlIHx8ICdcdTU0MENcdTZCNjVcdTU5MzFcdThEMjUnKTtcbiAgICAgIH1cbiAgICAgIG9wdGlvbnMub25Qcm9ncmVzcz8uKHJlc3VsdCk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59O1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQUFBO0FBQUE7QUFBQTtBQUFBLElBQUFDLG1CQUF1RDs7O0FDQXZEOzs7QUNFQSxJQUFNLHFCQUFxQjtBQUMzQixJQUFNLHFCQUFxQjtBQU1wQixJQUFNLDZCQUE2QixDQUFDLFNBQ3pDLHVDQUF1QyxXQUFXLEtBQUssSUFBSSxDQUFDLFdBQVcsV0FBVyxLQUFLLFdBQVcsQ0FBQztBQUU5RixJQUFNLDZCQUE2QixDQUFDLFNBQ3pDLHVDQUF1QyxXQUFXLEtBQUssVUFBVSxDQUFDLFNBQVMsV0FBVyxPQUFPLEtBQUssRUFBRSxDQUFDLENBQUMsV0FBVyxXQUFXLEtBQUssV0FBVyxDQUFDO0FBRXhJLElBQU0sZUFBZSxDQUFDLFVBQWtCLFdBQW1CO0FBQ2hFLFFBQU0sVUFBVSxtQkFBbUIsUUFBUSxFQUFFLFFBQVE7QUFDckQsU0FBTyxHQUFHLE9BQU87QUFBQTtBQUFBLEVBQU8sTUFBTTtBQUNoQztBQUVPLElBQU0scUJBQXFCLENBQUMsYUFDakMsU0FBUyxRQUFRLG9CQUFvQixFQUFFLEVBQUUsUUFBUSxv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QSxFQUNwRDtBQUNBLFNBQU87QUFDVDtBQUVBLElBQU0sb0JBQW9CLENBQUMsWUFBOEI7QUFDdkQsUUFBTSxTQUFTLG9CQUFJLElBQVksQ0FBQyxFQUFFLENBQUM7QUFDbkMsVUFBUSxRQUFRLFlBQVU7QUFDeEIsVUFBTSxPQUFPLGtCQUFrQixPQUFPLElBQUksT0FBTyxLQUFLLE9BQU87QUFDN0QsUUFBSTtBQUFNLGFBQU8sSUFBSSxJQUFJO0FBQUEsRUFDM0IsQ0FBQztBQUNELFNBQU8sTUFBTSxLQUFLLE1BQU0sRUFDckIsS0FBS0MsY0FBYSxFQUNsQixJQUFJLFlBQVUsRUFBRSxPQUFPLE9BQU8sY0FBYyxLQUFLLEVBQUUsRUFBRTtBQUMxRDtBQUVBLElBQU1BLGlCQUFnQixDQUFDLEdBQVcsTUFBYztBQUM5QyxNQUFJLENBQUMsS0FBSztBQUFHLFdBQU87QUFDcEIsTUFBSSxLQUFLLENBQUM7QUFBRyxXQUFPO0FBQ3BCLFNBQU8sRUFBRSxjQUFjLENBQUM7QUFDMUI7IiwKICAibmFtZXMiOiBbIldpc2VNaW5kT2JzaWRpYW5QbHVnaW4iLCAiaW1wb3J0X29ic2lkaWFuIiwgImltcG9ydF9vYnNpZGlhbiIsICJzYWZlVGl0bGUiLCAiaXRlbXMiLCAiV2lzZU1pbmRPYnNpZGlhblBsdWdpbiIsICJzb3J0Um9vdEZpcnN0Il0KfQo=
