/* ============================================================
   AI HUB — app.js
   ============================================================
   This file contains everything: provider/model config, API-key
   configuration, localStorage persistence, and UI wiring.

   ------------------------------------------------------------
   OWNER SETUP — put your API keys here
   ------------------------------------------------------------
   Replace the placeholder strings below with your own API keys.
   These keys are bundled into the site's JavaScript, so anyone
   who visits the site (or views its source) can technically see
   them. Do NOT put a key here that you are not comfortable
   exposing publicly — use burner accounts / keys with limited
   quota, spending caps, or IP/domain restrictions where the
   provider supports it.
   ------------------------------------------------------------ */
const API_KEYS = {
  openai:    "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",
  gemini:    "AQ.Ab8RN6JSJnMHh2PuUwwe3oN744baVqOBwNPtTz5sEil5MmmNMQ",
  anthropic: "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",
};

/* ------------------------------------------------------------
   PROVIDER / MODEL CONFIGURATION
   Add or remove models here — nothing else needs to change.
   ------------------------------------------------------------ */
const PROVIDERS = {
  anthropic: {
    name: "Anthropic",
    color: "var(--anthropic)",
    models: [
      { id: "claude-sonnet-4-6",      label: "Claude Sonnet 4.6" },
      { id: "claude-opus-4-1",        label: "Claude Opus 4.1" },
      { id: "claude-haiku-4-5",       label: "Claude Haiku 4.5" },
    ],
  },
  openai: {
    name: "OpenAI",
    color: "var(--openai)",
    models: [
      { id: "gpt-4o",       label: "GPT-4o" },
      { id: "gpt-4o-mini",  label: "GPT-4o mini" },
      { id: "gpt-4.1",      label: "GPT-4.1" },
    ],
  },
  gemini: {
    name: "Google Gemini",
    color: "var(--gemini)",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-pro",   label: "Gemini 1.5 Pro" },
    ],
  },
};

const STORAGE_KEY = "aihub.conversations.v1";
const SETTINGS_KEY = "aihub.settings.v1";

/* ------------------------------------------------------------
   STATE
   ------------------------------------------------------------ */
let state = {
  conversations: [],   // array of conversation objects
  activeId: null,
  settings: { defaultProvider: "anthropic", defaultModel: "claude-sonnet-4-6", theme: "dark" },
  isGenerating: false,
  abortController: null,
};

function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ------------------------------------------------------------
   PERSISTENCE
   ------------------------------------------------------------ */
function loadConversations(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){
    console.error("Failed to load conversations", e);
    return [];
  }
}

function saveConversations(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.conversations));
  }catch(e){
    console.error("Failed to save conversations", e);
  }
}

function loadSettings(){
  try{
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...state.settings, ...JSON.parse(raw) } : state.settings;
  }catch(e){
    return state.settings;
  }
}

function saveSettings(){
  try{
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  }catch(e){
    console.error("Failed to save settings", e);
  }
}

/* ------------------------------------------------------------
   CONVERSATION HELPERS
   ------------------------------------------------------------ */
function getActiveConversation(){
  return state.conversations.find(c => c.id === state.activeId) || null;
}

function createConversation(){
  const conv = {
    id: uid(),
    title: "New chat",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    provider: state.settings.defaultProvider,
    model: state.settings.defaultModel,
    messages: [],
  };
  state.conversations.unshift(conv);
  state.activeId = conv.id;
  saveConversations();
  return conv;
}

function deleteConversation(id){
  state.conversations = state.conversations.filter(c => c.id !== id);
  if(state.activeId === id){
    state.activeId = state.conversations[0]?.id || null;
  }
  saveConversations();
}

function titleFromMessage(text){
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > 48 ? clean.slice(0, 48).trim() + "…" : clean || "New chat";
}

/* ------------------------------------------------------------
   DOM REFS
   ------------------------------------------------------------ */
const el = {
  app: document.getElementById("app"),
  sidebar: document.getElementById("sidebar"),
  backdrop: document.getElementById("backdrop"),
  mobileMenuBtn: document.getElementById("mobileMenuBtn"),
  mobileNewChatBtn: document.getElementById("mobileNewChatBtn"),
  mobileTitle: document.getElementById("mobileTitle"),
  sidebarCloseBtn: document.getElementById("sidebarCloseBtn"),
  newChatBtn: document.getElementById("newChatBtn"),
  searchInput: document.getElementById("searchInput"),
  convList: document.getElementById("convList"),
  settingsBtn: document.getElementById("settingsBtn"),

  chatTitle: document.getElementById("chatTitle"),
  providerBtn: document.getElementById("providerBtn"),
  providerBtnLabel: document.getElementById("providerBtnLabel"),
  providerDot: document.getElementById("providerDot"),
  providerDropdown: document.getElementById("providerDropdown"),
  modelBtn: document.getElementById("modelBtn"),
  modelBtnLabel: document.getElementById("modelBtnLabel"),
  modelDropdown: document.getElementById("modelDropdown"),

  chatScroll: document.getElementById("chatScroll"),
  chatInner: document.getElementById("chatInner"),
  emptyState: document.getElementById("emptyState"),

  composer: document.getElementById("composer"),
  messageInput: document.getElementById("messageInput"),
  sendBtn: document.getElementById("sendBtn"),
  stopBtn: document.getElementById("stopBtn"),

  settingsModal: document.getElementById("settingsModal"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  defaultProviderSelect: document.getElementById("defaultProviderSelect"),
  defaultModelSelect: document.getElementById("defaultModelSelect"),
  themeSelect: document.getElementById("themeSelect"),
  clearAllBtn: document.getElementById("clearAllBtn"),

  renameModal: document.getElementById("renameModal"),
  renameInput: document.getElementById("renameInput"),
  renameSaveBtn: document.getElementById("renameSaveBtn"),
  renameCancelBtn: document.getElementById("renameCancelBtn"),
  closeRenameBtn: document.getElementById("closeRenameBtn"),

  deleteModal: document.getElementById("deleteModal"),
  deleteConfirmBtn: document.getElementById("deleteConfirmBtn"),
  deleteCancelBtn: document.getElementById("deleteCancelBtn"),
  closeDeleteBtn: document.getElementById("closeDeleteBtn"),

  clearAllModal: document.getElementById("clearAllModal"),
  clearAllConfirmBtn: document.getElementById("clearAllConfirmBtn"),
  clearAllCancelBtn: document.getElementById("clearAllCancelBtn"),
  closeClearAllBtn: document.getElementById("closeClearAllBtn"),
};

let renameTargetId = null;
let deleteTargetId = null;

/* ------------------------------------------------------------
   SIDEBAR RENDERING
   ------------------------------------------------------------ */
function groupConversations(list){
  const now = new Date();
  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(now);
  const yesterday = today - 86400000;
  const weekAgo = today - 7 * 86400000;

  const groups = { Today: [], Yesterday: [], "Previous 7 Days": [], Older: [] };
  for(const conv of list){
    const day = startOfDay(new Date(conv.updatedAt));
    if(day === today) groups.Today.push(conv);
    else if(day === yesterday) groups.Yesterday.push(conv);
    else if(day >= weekAgo) groups["Previous 7 Days"].push(conv);
    else groups.Older.push(conv);
  }
  return groups;
}

function renderSidebar(){
  const query = el.searchInput.value.trim().toLowerCase();
  const filtered = query
    ? state.conversations.filter(c => c.title.toLowerCase().includes(query))
    : state.conversations;

  const sorted = [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);
  const groups = groupConversations(sorted);

  el.convList.innerHTML = "";

  if(sorted.length === 0){
    const empty = document.createElement("div");
    empty.className = "conv-empty";
    empty.textContent = query ? "No conversations match." : "No conversations yet.";
    el.convList.appendChild(empty);
    return;
  }

  for(const [label, convs] of Object.entries(groups)){
    if(convs.length === 0) continue;
    const groupLabel = document.createElement("div");
    groupLabel.className = "conv-group-label";
    groupLabel.textContent = label;
    el.convList.appendChild(groupLabel);

    for(const conv of convs){
      el.convList.appendChild(renderConvItem(conv));
    }
  }
}

function renderConvItem(conv){
  const item = document.createElement("div");
  item.className = "conv-item" + (conv.id === state.activeId ? " active" : "");
  item.dataset.id = conv.id;

  const title = document.createElement("div");
  title.className = "conv-title";
  title.textContent = conv.title;
  item.appendChild(title);

  const actions = document.createElement("div");
  actions.className = "conv-actions";

  const renameBtn = document.createElement("button");
  renameBtn.className = "conv-action-btn";
  renameBtn.setAttribute("aria-label", "Rename conversation");
  renameBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>`;
  renameBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openRenameModal(conv.id);
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "conv-action-btn";
  deleteBtn.setAttribute("aria-label", "Delete conversation");
  deleteBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>`;
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openDeleteModal(conv.id);
  });

  actions.appendChild(renameBtn);
  actions.appendChild(deleteBtn);
  item.appendChild(actions);

  item.addEventListener("click", () => {
    state.activeId = conv.id;
    renderAll();
    closeSidebarMobile();
  });

  return item;
}

/* ------------------------------------------------------------
   HEADER / SELECTORS
   ------------------------------------------------------------ */
function renderHeader(){
  const conv = getActiveConversation();
  const title = conv ? conv.title : "New chat";
  el.chatTitle.textContent = title;
  el.mobileTitle.textContent = title;

  const provider = conv ? conv.provider : state.settings.defaultProvider;
  const model = conv ? conv.model : state.settings.defaultModel;
  const providerInfo = PROVIDERS[provider];

  el.providerBtnLabel.textContent = providerInfo ? providerInfo.name : "Select provider";
  el.providerDot.style.background = providerInfo ? providerInfo.color : "var(--text-faint)";

  const modelInfo = providerInfo?.models.find(m => m.id === model);
  el.modelBtnLabel.textContent = modelInfo ? modelInfo.label : "Select model";

  renderProviderDropdown(provider);
  renderModelDropdown(provider, model);
}

function renderProviderDropdown(activeProvider){
  el.providerDropdown.innerHTML = "";
  for(const [key, p] of Object.entries(PROVIDERS)){
    const btn = document.createElement("button");
    btn.className = "dropdown-item" + (key === activeProvider ? " selected" : "");
    btn.innerHTML = `<span class="provider-dot" style="background:${p.color}"></span>${p.name}`;
    btn.addEventListener("click", () => {
      setConversationProvider(key);
      closeDropdowns();
    });
    el.providerDropdown.appendChild(btn);
  }
}

function renderModelDropdown(provider, activeModel){
  el.modelDropdown.innerHTML = "";
  const info = PROVIDERS[provider];
  if(!info) return;
  for(const m of info.models){
    const btn = document.createElement("button");
    btn.className = "dropdown-item" + (m.id === activeModel ? " selected" : "");
    btn.textContent = m.label;
    btn.addEventListener("click", () => {
      setConversationModel(m.id);
      closeDropdowns();
    });
    el.modelDropdown.appendChild(btn);
  }
}

function setConversationProvider(providerKey){
  let conv = getActiveConversation();
  if(!conv) conv = createConversation();
  conv.provider = providerKey;
  conv.model = PROVIDERS[providerKey].models[0].id;
  conv.updatedAt = Date.now();
  saveConversations();
  renderAll();
}

function setConversationModel(modelId){
  let conv = getActiveConversation();
  if(!conv) conv = createConversation();
  conv.model = modelId;
  conv.updatedAt = Date.now();
  saveConversations();
  renderAll();
}

function closeDropdowns(){
  el.providerDropdown.classList.remove("open");
  el.modelDropdown.classList.remove("open");
}

/* ------------------------------------------------------------
   CHAT RENDERING
   ------------------------------------------------------------ */
function escapeHtml(str){
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* Minimal markdown renderer: code blocks, inline code, bold, italic,
   links, headings, lists, blockquotes, paragraphs. */
function renderMarkdown(text){
  const codeBlocks = [];
  let src = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push({ lang: lang || "text", code });
    return `\u0000CODEBLOCK${idx}\u0000`;
  });

  src = escapeHtml(src);

  // restore code blocks (escaped separately below when injected)
  const lines = src.split("\n");
  let html = "";
  let inList = null; // 'ul' | 'ol'
  let paragraphBuf = [];

  const flushParagraph = () => {
    if(paragraphBuf.length){
      html += `<p>${paragraphBuf.join(" ")}</p>`;
      paragraphBuf = [];
    }
  };
  const closeList = () => {
    if(inList){ html += `</${inList}>`; inList = null; }
  };

  const inlineFormat = (line) => {
    line = line.replace(/`([^`]+)`/g, "<code>$1</code>");
    line = line.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    line = line.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    line = line.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return line;
  };

  for(let rawLine of lines){
    const codeMatch = rawLine.match(/^\u0000CODEBLOCK(\d+)\u0000$/);
    if(codeMatch){
      flushParagraph(); closeList();
      const block = codeBlocks[Number(codeMatch[1])];
      const escapedCode = escapeHtml(block.code.replace(/\n$/, ""));
      html += `<div class="code-block"><span class="code-lang">${escapeHtml(block.lang)}</span><button class="copy-code-btn" data-code-idx="${codeMatch[1]}"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Copy</button><pre><code>${escapedCode}</code></pre></div>`;
      continue;
    }

    const line = rawLine;
    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h1 = line.match(/^# (.+)/);
    const ul = line.match(/^[-*] (.+)/);
    const ol = line.match(/^\d+\. (.+)/);
    const bq = line.match(/^> (.+)/);

    if(h1 || h2 || h3){
      flushParagraph(); closeList();
      const [_, content, tag] = h1 ? [null, h1[1], "h1"] : h2 ? [null, h2[1], "h2"] : [null, h3[1], "h3"];
      html += `<${tag}>${inlineFormat(content)}</${tag}>`;
    } else if(ul){
      flushParagraph();
      if(inList !== "ul"){ closeList(); html += "<ul>"; inList = "ul"; }
      html += `<li>${inlineFormat(ul[1])}</li>`;
    } else if(ol){
      flushParagraph();
      if(inList !== "ol"){ closeList(); html += "<ol>"; inList = "ol"; }
      html += `<li>${inlineFormat(ol[1])}</li>`;
    } else if(bq){
      flushParagraph(); closeList();
      html += `<blockquote>${inlineFormat(bq[1])}</blockquote>`;
    } else if(line.trim() === ""){
      flushParagraph(); closeList();
    } else {
      paragraphBuf.push(inlineFormat(line));
    }
  }
  flushParagraph();
  closeList();

  return { html, codeBlocks };
}

function renderMessages(){
  const conv = getActiveConversation();
  el.chatInner.querySelectorAll(".msg, .msg-error-wrap").forEach(n => n.remove());

  if(!conv || conv.messages.length === 0){
    el.emptyState.classList.remove("hidden");
    return;
  }
  el.emptyState.classList.add("hidden");

  for(const msg of conv.messages){
    el.chatInner.appendChild(renderMessageNode(msg, conv.provider));
  }
  scrollToBottom();
}

function renderMessageNode(msg, provider){
  const wrap = document.createElement("div");
  wrap.className = `msg ${msg.role}` + (msg.role === "assistant" ? ` provider-${provider}` : "");
  wrap.dataset.msgId = msg.id;

  const avatar = document.createElement("div");
  avatar.className = "msg-avatar";
  if(msg.role === "user"){
    avatar.textContent = "You";
  } else {
    avatar.textContent = PROVIDERS[provider]?.name.slice(0, 2).toUpperCase() || "AI";
  }
  wrap.appendChild(avatar);

  const body = document.createElement("div");
  body.className = "msg-body";

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  meta.textContent = msg.role === "user" ? "You" : (PROVIDERS[provider]?.models.find(m => m.id === msg.model)?.label || PROVIDERS[provider]?.name || "Assistant");
  body.appendChild(meta);

  if(msg.status === "loading"){
    const typing = document.createElement("div");
    typing.className = "typing";
    typing.innerHTML = "<span></span><span></span><span></span>";
    body.appendChild(typing);
  } else if(msg.status === "error"){
    const errBox = document.createElement("div");
    errBox.className = "msg-error";
    errBox.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/></svg><span>${escapeHtml(msg.error || "Something went wrong.")}</span>`;
    body.appendChild(errBox);

    const retryBtn = document.createElement("button");
    retryBtn.className = "retry-btn";
    retryBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>Retry`;
    retryBtn.addEventListener("click", () => retryMessage(msg.id));
    body.appendChild(retryBtn);
  } else {
    const content = document.createElement("div");
    content.className = "msg-content";
    const { html } = renderMarkdown(msg.content || "");
    content.innerHTML = html;
    body.appendChild(content);
  }

  wrap.appendChild(body);
  return wrap;
}

function scrollToBottom(){
  requestAnimationFrame(() => {
    el.chatScroll.scrollTop = el.chatScroll.scrollHeight;
  });
}

/* Delegate copy-code clicks */
el.chatInner.addEventListener("click", (e) => {
  const btn = e.target.closest(".copy-code-btn");
  if(!btn) return;
  const pre = btn.parentElement.querySelector("pre code");
  if(!pre) return;
  navigator.clipboard.writeText(pre.textContent).then(() => {
    const original = btn.innerHTML;
    btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>Copied`;
    setTimeout(() => { btn.innerHTML = original; }, 1500);
  }).catch(() => {});
});

/* ------------------------------------------------------------
   SENDING MESSAGES / API CALLS
   ------------------------------------------------------------ */
function buildRequestForProvider(provider, model, history, apiKey, signal){
  if(provider === "anthropic"){
    return fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      signal,
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        messages: history.map(m => ({ role: m.role, content: m.content })),
      }),
    }).then(async res => {
      const data = await res.json().catch(() => ({}));
      if(!res.ok){
        throw new Error(data?.error?.message || `Anthropic error (${res.status})`);
      }
      const text = (data.content || []).map(b => b.type === "text" ? b.text : "").join("");
      return text || "(empty response)";
    });
  }

  if(provider === "openai"){
    return fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      signal,
      body: JSON.stringify({
        model,
        messages: history.map(m => ({ role: m.role, content: m.content })),
      }),
    }).then(async res => {
      const data = await res.json().catch(() => ({}));
      if(!res.ok){
        throw new Error(data?.error?.message || `OpenAI error (${res.status})`);
      }
      const text = data?.choices?.[0]?.message?.content;
      return text || "(empty response)";
    });
  }

  if(provider === "gemini"){
    const contents = history.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({ contents }),
    }).then(async res => {
      const data = await res.json().catch(() => ({}));
      if(!res.ok){
        throw new Error(data?.error?.message || `Gemini error (${res.status})`);
      }
      const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join("");
      return text || "(empty response)";
    });
  }

  return Promise.reject(new Error("Unknown provider"));
}

function friendlyErrorMessage(err, provider){
  const msg = (err?.message || "").toLowerCase();
  if(err?.name === "AbortError") return "Generation stopped.";
  if(msg.includes("failed to fetch") || msg.includes("network")) return "Network error — check your connection and try again.";
  if(msg.includes("401") || msg.includes("api key") || msg.includes("unauthorized") || msg.includes("permission")) return `Invalid or missing API key for ${PROVIDERS[provider]?.name || provider}. The site owner needs to add a valid key in app.js.`;
  if(msg.includes("429") || msg.includes("rate") || msg.includes("quota")) return "Rate limit or quota reached. Wait a moment and try again.";
  if(msg.includes("model")) return "That model isn't available right now. Try a different one.";
  if(msg.includes("503") || msg.includes("overload") || msg.includes("unavailable")) return `${PROVIDERS[provider]?.name || "The provider"} is temporarily unavailable. Try again shortly.`;
  return err?.message || "Something went wrong while generating a response.";
}

async function sendMessage(){
  const text = el.messageInput.value.trim();
  if(!text || state.isGenerating) return;

  let conv = getActiveConversation();
  if(!conv) conv = createConversation();

  const isFirstMessage = conv.messages.length === 0;

  const userMsg = { id: uid(), role: "user", content: text, status: "done" };
  conv.messages.push(userMsg);

  if(isFirstMessage){
    conv.title = titleFromMessage(text);
  }
  conv.updatedAt = Date.now();

  el.messageInput.value = "";
  autoResizeTextarea();
  updateSendButtonState();
  saveConversations();
  renderSidebar();
  renderHeader();
  renderMessages();

  await generateAssistantReply(conv.id);
}

async function generateAssistantReply(convId){
  const conv = state.conversations.find(c => c.id === convId);
  if(!conv) return;

  const assistantMsg = { id: uid(), role: "assistant", content: "", status: "loading", model: conv.model };
  conv.messages.push(assistantMsg);
  saveConversations();
  renderMessages();

  state.isGenerating = true;
  updateSendButtonState();
  el.stopBtn.classList.remove("hidden");
  el.sendBtn.classList.add("hidden");

  const apiKey = API_KEYS[conv.provider];
  const controller = new AbortController();
  state.abortController = controller;

  const history = conv.messages
    .filter(m => m.status !== "loading" && m.status !== "error")
    .map(m => ({ role: m.role, content: m.content }));

  try{
    if(!apiKey || apiKey.startsWith("PUT_")){
      throw new Error(`No API key configured for ${PROVIDERS[conv.provider].name}. The site owner needs to add one in app.js.`);
    }
    const replyText = await buildRequestForProvider(conv.provider, conv.model, history, apiKey, controller.signal);
    assistantMsg.content = replyText;
    assistantMsg.status = "done";
  }catch(err){
    assistantMsg.status = "error";
    assistantMsg.error = friendlyErrorMessage(err, conv.provider);
  }finally{
    state.isGenerating = false;
    state.abortController = null;
    conv.updatedAt = Date.now();
    saveConversations();
    updateSendButtonState();
    el.stopBtn.classList.add("hidden");
    el.sendBtn.classList.remove("hidden");
    renderMessages();
    renderSidebar();
  }
}

function retryMessage(assistantMsgId){
  const conv = getActiveConversation();
  if(!conv) return;
  const idx = conv.messages.findIndex(m => m.id === assistantMsgId);
  if(idx === -1) return;
  conv.messages.splice(idx, 1);
  saveConversations();
  generateAssistantReply(conv.id);
}

function stopGeneration(){
  if(state.abortController){
    state.abortController.abort();
  }
}

/* ------------------------------------------------------------
   COMPOSER
   ------------------------------------------------------------ */
function autoResizeTextarea(){
  el.messageInput.style.height = "auto";
  el.messageInput.style.height = Math.min(el.messageInput.scrollHeight, 200) + "px";
}

function updateSendButtonState(){
  const hasText = el.messageInput.value.trim().length > 0;
  el.sendBtn.disabled = !hasText || state.isGenerating;
}

el.messageInput.addEventListener("input", () => {
  autoResizeTextarea();
  updateSendButtonState();
});

el.messageInput.addEventListener("keydown", (e) => {
  if(e.key === "Enter" && !e.shiftKey){
    e.preventDefault();
    sendMessage();
  }
});

el.sendBtn.addEventListener("click", sendMessage);
el.stopBtn.addEventListener("click", stopGeneration);

/* ------------------------------------------------------------
   SIDEBAR / MOBILE
   ------------------------------------------------------------ */
function openSidebarMobile(){
  el.sidebar.classList.add("open");
  el.backdrop.classList.add("open");
}
function closeSidebarMobile(){
  el.sidebar.classList.remove("open");
  el.backdrop.classList.remove("open");
}

el.mobileMenuBtn.addEventListener("click", openSidebarMobile);
el.sidebarCloseBtn.addEventListener("click", closeSidebarMobile);
el.backdrop.addEventListener("click", closeSidebarMobile);

el.mobileNewChatBtn.addEventListener("click", () => {
  createConversation();
  renderAll();
  closeSidebarMobile();
});

el.newChatBtn.addEventListener("click", () => {
  createConversation();
  renderAll();
});

el.searchInput.addEventListener("input", renderSidebar);

/* ------------------------------------------------------------
   SELECTOR DROPDOWNS
   ------------------------------------------------------------ */
el.providerBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const wasOpen = el.providerDropdown.classList.contains("open");
  closeDropdowns();
  if(!wasOpen) el.providerDropdown.classList.add("open");
});

el.modelBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const wasOpen = el.modelDropdown.classList.contains("open");
  closeDropdowns();
  if(!wasOpen) el.modelDropdown.classList.add("open");
});

document.addEventListener("click", () => closeDropdowns());

/* ------------------------------------------------------------
   SETTINGS MODAL
   ------------------------------------------------------------ */
function populateProviderSelect(selectEl, selected){
  selectEl.innerHTML = "";
  for(const [key, p] of Object.entries(PROVIDERS)){
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = p.name;
    if(key === selected) opt.selected = true;
    selectEl.appendChild(opt);
  }
}

function populateModelSelect(selectEl, providerKey, selected){
  selectEl.innerHTML = "";
  const info = PROVIDERS[providerKey];
  if(!info) return;
  for(const m of info.models){
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.label;
    if(m.id === selected) opt.selected = true;
    selectEl.appendChild(opt);
  }
}

function openSettingsModal(){
  populateProviderSelect(el.defaultProviderSelect, state.settings.defaultProvider);
  populateModelSelect(el.defaultModelSelect, state.settings.defaultProvider, state.settings.defaultModel);
  el.themeSelect.value = state.settings.theme;
  el.settingsModal.classList.add("open");
}
function closeSettingsModal(){ el.settingsModal.classList.remove("open"); }

el.settingsBtn.addEventListener("click", openSettingsModal);
el.closeSettingsBtn.addEventListener("click", closeSettingsModal);
el.settingsModal.addEventListener("click", (e) => { if(e.target === el.settingsModal) closeSettingsModal(); });

document.querySelectorAll(".modal-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".modal-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
  });
});

el.defaultProviderSelect.addEventListener("change", () => {
  state.settings.defaultProvider = el.defaultProviderSelect.value;
  const firstModel = PROVIDERS[state.settings.defaultProvider].models[0].id;
  state.settings.defaultModel = firstModel;
  populateModelSelect(el.defaultModelSelect, state.settings.defaultProvider, firstModel);
  saveSettings();
});

el.defaultModelSelect.addEventListener("change", () => {
  state.settings.defaultModel = el.defaultModelSelect.value;
  saveSettings();
});

el.themeSelect.addEventListener("change", () => {
  state.settings.theme = el.themeSelect.value;
  applyTheme();
  saveSettings();
});

function applyTheme(){
  document.documentElement.setAttribute("data-theme", state.settings.theme);
}

/* Clear all conversations */
el.clearAllBtn.addEventListener("click", () => {
  el.clearAllModal.classList.add("open");
});
el.closeClearAllBtn.addEventListener("click", () => el.clearAllModal.classList.remove("open"));
el.clearAllCancelBtn.addEventListener("click", () => el.clearAllModal.classList.remove("open"));
el.clearAllModal.addEventListener("click", (e) => { if(e.target === el.clearAllModal) el.clearAllModal.classList.remove("open"); });
el.clearAllConfirmBtn.addEventListener("click", () => {
  state.conversations = [];
  state.activeId = null;
  saveConversations();
  el.clearAllModal.classList.remove("open");
  closeSettingsModal();
  renderAll();
});

/* ------------------------------------------------------------
   RENAME MODAL
   ------------------------------------------------------------ */
function openRenameModal(convId){
  const conv = state.conversations.find(c => c.id === convId);
  if(!conv) return;
  renameTargetId = convId;
  el.renameInput.value = conv.title;
  el.renameModal.classList.add("open");
  setTimeout(() => { el.renameInput.focus(); el.renameInput.select(); }, 50);
}
function closeRenameModal(){
  el.renameModal.classList.remove("open");
  renameTargetId = null;
}
el.closeRenameBtn.addEventListener("click", closeRenameModal);
el.renameCancelBtn.addEventListener("click", closeRenameModal);
el.renameModal.addEventListener("click", (e) => { if(e.target === el.renameModal) closeRenameModal(); });
el.renameInput.addEventListener("keydown", (e) => {
  if(e.key === "Enter"){ e.preventDefault(); commitRename(); }
  if(e.key === "Escape") closeRenameModal();
});
el.renameSaveBtn.addEventListener("click", commitRename);

function commitRename(){
  if(!renameTargetId) return;
  const conv = state.conversations.find(c => c.id === renameTargetId);
  if(conv){
    const newTitle = el.renameInput.value.trim();
    conv.title = newTitle || conv.title;
    saveConversations();
  }
  closeRenameModal();
  renderAll();
}

/* ------------------------------------------------------------
   DELETE MODAL
   ------------------------------------------------------------ */
function openDeleteModal(convId){
  deleteTargetId = convId;
  el.deleteModal.classList.add("open");
}
function closeDeleteModal(){
  el.deleteModal.classList.remove("open");
  deleteTargetId = null;
}
el.closeDeleteBtn.addEventListener("click", closeDeleteModal);
el.deleteCancelBtn.addEventListener("click", closeDeleteModal);
el.deleteModal.addEventListener("click", (e) => { if(e.target === el.deleteModal) closeDeleteModal(); });
el.deleteConfirmBtn.addEventListener("click", () => {
  if(deleteTargetId){
    deleteConversation(deleteTargetId);
  }
  closeDeleteModal();
  renderAll();
});

/* ------------------------------------------------------------
   INIT
   ------------------------------------------------------------ */
function renderAll(){
  renderSidebar();
  renderHeader();
  renderMessages();
}

function init(){
  state.settings = loadSettings();
  applyTheme();
  state.conversations = loadConversations();
  state.activeId = state.conversations[0]?.id || null;
  renderAll();
  updateSendButtonState();
}

init();
