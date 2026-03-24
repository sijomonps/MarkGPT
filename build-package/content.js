/* MarkGPT - content.js (v2.0 optimized) */
(() => {
  if (window.__bkmrk_loaded) return;
  window.__bkmrk_loaded = true;

  /* ── Platform detection (cached once) ── */
  const HOST = location.hostname;
  const IS_CLAUDE = HOST === "claude.ai";
  const IS_GEMINI = HOST === "gemini.google.com";
  const IS_CHATGPT = HOST === "chatgpt.com" || HOST === "chat.openai.com";

  /* ── State ── */
  let enabled = true;
  let allBookmarks = [];
  let savedScopedSigs = new Set();
  let savedMsgIds = new Set();

  let toastEl = null;
  let panel = null;
  let panelOpen = false;
  let panelCountEl = null;
  let panelListEl = null;
  let observer = null;
  let syncTimer = 0;
  let heartbeat = 0;
  const btnMap = new WeakMap();   // host element → button element
  const hostMap = new WeakMap();  // message element → host element

  /* ── Selectors per platform ── */
  const SEL_CHATGPT = "[data-message-author-role], [data-message-id], [data-testid^='conversation-turn']";
  const SEL_CLAUDE = "[data-testid='user-message'], [data-testid='assistant-message'], [data-testid='assistant-turn'], [data-testid='message-content'], [data-message-author-role], [data-is-streaming], div.font-claude-message, [role='article']";
  const SEL_GEMINI = "model-response, user-query";

  function platformSelector() {
    if (IS_CHATGPT) return SEL_CHATGPT;
    if (IS_CLAUDE) return SEL_CLAUDE;
    if (IS_GEMINI) return SEL_GEMINI;
    return SEL_CHATGPT;
  }

  /* ── SVG icons ── */
  const BM = 'd="M19 21l-7-4-7 4V5a2 2 0 012-2h10a2 2 0 012 2z"';
  const mkSvg = (s, f) =>
    '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="' + (f ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path ' + BM + "/></svg>";
  const IC_OUT = mkSvg(14, 0);
  const IC_FILL = mkSvg(14, 1);
  const IC_SM = mkSvg(11, 1);
  const IC_X = '<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  /* ── Styles ── */
  const style = document.createElement("style");
  style.id = "bkmrk-css";
  style.textContent = `
    .bk-row{display:flex;justify-content:flex-end;width:100%;margin-top:4px;pointer-events:auto}
    .bk-rbtn{width:22px;height:22px;border-radius:5px;border:none;background:transparent;color:inherit;opacity:.45;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:opacity .15s,background .12s;pointer-events:auto}
    .bk-rbtn:hover{opacity:.9;background:rgba(127,127,127,.12)}
    .bk-rbtn.on{opacity:.8}
    .bk-claude-host{position:relative !important}
    .bk-abs{position:absolute;bottom:6px;right:6px;width:22px;height:22px;border-radius:5px;border:none;background:rgba(127,127,127,.08);color:inherit;opacity:.4;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:opacity .15s,background .12s;pointer-events:auto;z-index:10}
    .bk-claude-host:hover .bk-abs{opacity:.7}
    .bk-abs:hover{opacity:1 !important;background:rgba(127,127,127,.18)}
    .bk-abs.on{opacity:.75}
    #bk-t{position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(8px);background:#2f2f2f;color:#e0e0e0;font:500 12px/1 system-ui,sans-serif;padding:10px 20px;border-radius:22px;border:1px solid rgba(255,255,255,.08);box-shadow:0 4px 20px rgba(0,0,0,.5);opacity:0;pointer-events:none;z-index:2147483647;transition:opacity .2s,transform .2s;white-space:nowrap}
    #bk-t.on{opacity:1;transform:translateX(-50%) translateY(0)}
    #bk-p{position:fixed;top:72px;left:10px;z-index:2147483640;font:13px/1.4 system-ui,sans-serif;display:flex;flex-direction:column;align-items:flex-start;gap:4px}
    #bk-tog{display:flex;align-items:center;gap:5px;padding:5px 10px;background:rgba(38,38,38,.92);border:1px solid rgba(255,255,255,.15);border-radius:20px;cursor:pointer;color:rgba(255,255,255,.65);user-select:none;box-shadow:0 2px 8px rgba(0,0,0,.35);transition:background .15s,border-color .15s}
    #bk-tog:hover{background:rgba(60,60,60,.98);border-color:rgba(255,255,255,.3);color:#fff}
    #bk-tog-n{font-size:11px;font-weight:600}
    #bk-list{width:210px;background:#1e1e1e;border:1px solid rgba(255,255,255,.1);border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.5);display:none}
    #bk-list.open{display:block}
    #bk-list-inner{max-height:320px;overflow-y:auto;padding:4px}
    #bk-list-inner::-webkit-scrollbar{width:3px}
    #bk-list-inner::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px}
    .bk-li{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:7px;cursor:pointer;transition:background .12s}
    .bk-li:hover{background:rgba(255,255,255,.07)}
    .bk-li-ic{flex-shrink:0;color:rgba(255,255,255,.3)}
    .bk-li-lbl{flex:1;min-width:0;font-size:12px;color:#d0d0d0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500}
    .bk-li-del{flex-shrink:0;width:16px;height:16px;border:none;background:transparent;color:#555;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:3px;padding:0;opacity:0;transition:opacity .12s}
    .bk-li:hover .bk-li-del{opacity:1}
    .bk-li-del:hover{background:rgba(255,255,255,.08);color:#ccc}
    .bk-em{padding:12px 8px;text-align:center;color:#4a4a4a;font-size:11px}
    #bk-wm{padding:5px 8px 6px;text-align:center;font-size:9px;color:rgba(255,255,255,.45);letter-spacing:.4px;border-top:1px solid rgba(255,255,255,.12);user-select:none}
  `;
  document.head.appendChild(style);

  /* ── Init ── */
  chrome.storage.local.get(["extensionEnabled", "bookmarks", "bkmrk_scrollTo"], (r) => {
    enabled = r.extensionEnabled !== false;
    allBookmarks = r.bookmarks || [];
    rebuildIndex();
    if (enabled) boot();
    const target = normTarget(r.bkmrk_scrollTo);
    if (target && enabled && targetMatchesChat(target)) retryScroll(target, true);
  });

  chrome.storage.onChanged.addListener((ch) => {
    if (ch.extensionEnabled) {
      enabled = ch.extensionEnabled.newValue !== false;
      enabled ? showAll() : hideAll();
    }
    if (ch.bookmarks) {
      allBookmarks = ch.bookmarks.newValue || [];
      rebuildIndex();
      if (enabled) { scheduleSync(); renderPanel(); }
    }
    if (ch.bkmrk_scrollTo && enabled) {
      const t = normTarget(ch.bkmrk_scrollTo.newValue);
      if (t && targetMatchesChat(t)) retryScroll(t, true);
    }
  });

  /* ── Boot / Show / Hide ── */
  function boot() {
    mkToast();
    mkPanel();
    startObserver();
  }

  function showAll() {
    if (!toastEl) boot();
    if (panel) panel.style.display = "";
    startObserver();
  }

  function hideAll() {
    stopObserver();
    document.querySelectorAll(".bk-row, .bk-abs").forEach(b => b.remove());
    document.querySelectorAll(".bk-claude-host").forEach(h => h.classList.remove("bk-claude-host"));
    if (panel) panel.style.display = "none";
  }

  /* ── Toast ── */
  function mkToast() {
    if (toastEl) return;
    toastEl = document.createElement("div");
    toastEl.id = "bk-t";
    document.documentElement.appendChild(toastEl);
  }
  function flash(m) {
    if (!toastEl) return;
    toastEl.textContent = m;
    toastEl.classList.add("on");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove("on"), 2200);
  }

  /* ── Panel ── */
  function mkPanel() {
    if (panel) return;
    panel = document.createElement("div");
    panel.id = "bk-p";
    panel.innerHTML =
      '<div id="bk-tog">' + IC_SM + '<span id="bk-tog-n">0</span></div>' +
      '<div id="bk-list"><div id="bk-list-inner"></div><div id="bk-wm">MarkGPT by Sijomon P S</div></div>';
    document.documentElement.appendChild(panel);
    panelCountEl = panel.querySelector("#bk-tog-n");
    panelListEl = panel.querySelector("#bk-list-inner");
    posPanel();
    panel.querySelector("#bk-tog").addEventListener("click", () => {
      panelOpen = !panelOpen;
      panel.querySelector("#bk-list").classList.toggle("open", panelOpen);
    });
    renderPanel();
    window.addEventListener("resize", () => requestAnimationFrame(posPanel), { passive: true });
  }

  function posPanel() {
    if (!panel) return;
    const nav = document.querySelector("nav");
    const offset = nav ? Math.round(nav.getBoundingClientRect().right) + 10 : 10;
    panel.style.left = Math.min(Math.max(10, offset), window.innerWidth - 230) + "px";
  }

  function renderPanel() {
    if (!panelCountEl || !panelListEl) return;
    panelCountEl.textContent = String(allBookmarks.length);
    if (!allBookmarks.length) {
      panelListEl.innerHTML = '<div class="bk-em">No bookmarks yet</div>';
      return;
    }
    const frag = document.createDocumentFragment();
    for (let i = allBookmarks.length - 1; i >= 0; i--) {
      const bm = allBookmarks[i];
      const ri = i;
      const row = document.createElement("div");
      row.className = "bk-li";
      row.innerHTML =
        '<span class="bk-li-ic">' + IC_SM + "</span>" +
        '<span class="bk-li-lbl">' + esc(bm.label) + "</span>" +
        '<button class="bk-li-del" title="Remove">' + IC_X + "</button>";
      row.addEventListener("click", () => goTo(bm));
      row.querySelector(".bk-li-del").addEventListener("click", (e) => {
        e.stopPropagation();
        allBookmarks.splice(ri, 1);
        chrome.storage.local.set({ bookmarks: allBookmarks });
      });
      frag.appendChild(row);
    }
    panelListEl.innerHTML = "";
    panelListEl.appendChild(frag);
  }

  /* ── Observer (debounced) ── */
  function startObserver() {
    if (observer) { scheduleSync(); return; }
    scheduleSync();
    observer = new MutationObserver(() => scheduleSync());
    observer.observe(document.body, { childList: true, subtree: true });
    // Heartbeat every 4s (was 1.8s → less lag)
    if (!heartbeat) heartbeat = setInterval(() => { if (enabled) scheduleSync(); }, 4000);
  }

  function stopObserver() {
    if (observer) { observer.disconnect(); observer = null; }
    if (syncTimer) { cancelAnimationFrame(syncTimer); syncTimer = 0; }
    if (heartbeat) { clearInterval(heartbeat); heartbeat = 0; }
  }

  function scheduleSync() {
    if (syncTimer) return;
    syncTimer = requestAnimationFrame(() => {
      syncTimer = 0;
      if (!enabled) return;
      syncButtons();
    });
  }

  /* ── Core sync: find messages → ensure one button each ── */
  function syncButtons() {
    const messages = getMessages();
    const activeHosts = new Set();

    for (let i = 0; i < messages.length; i++) {
      const host = findHost(messages[i]);
      if (!host || activeHosts.has(host)) continue;
      activeHosts.add(host);
      ensureButton(host, messages[i]);
    }

    // Remove orphaned buttons
    document.querySelectorAll(".bk-row, .bk-abs").forEach(el => {
      const h = el.parentElement;
      if (!h || !activeHosts.has(h)) el.remove();
    });
  }

  /* ── Find the host element to attach the button to ── */
  function findHost(el) {
    if (!el || !(el instanceof HTMLElement)) return null;

    if (IS_CHATGPT) {
      // ChatGPT: prefer article (message wrapper), fallback to turn container
      const article = el.closest("article");
      if (article) return article;
      const msgId = el.closest("[data-message-id]");
      if (msgId) return msgId;
      const turn = el.closest("[data-testid^='conversation-turn']");
      if (turn) return turn;
      return el;
    }

    if (IS_CLAUDE) {
      // Claude: walk up to find the message turn block
      let best = el;
      let cursor = el;
      const elText = (el.textContent || "").length;
      for (let i = 0; i < 10 && cursor && cursor !== document.body; i++) {
        if (cursor.matches && cursor.matches("nav, aside, header, footer, [role='navigation']")) break;
        const ov = getComputedStyle(cursor).overflowY;
        if (/(auto|scroll)/.test(ov) && cursor.scrollHeight > cursor.clientHeight + 50) break;
        const curLen = (cursor.textContent || "").length;
        if (curLen <= elText * 1.5 || curLen < 3000) {
          const d = getComputedStyle(cursor).display;
          if (d !== "contents" && d !== "inline") best = cursor;
        } else break;
        cursor = cursor.parentElement;
      }
      return best;
    }

    if (IS_GEMINI) {
      // Gemini: use model-response or user-query
      const root = el.closest("model-response") || el.closest("user-query");
      if (!root) return el;
      // Find a suitable inner container for appending (avoid appending to custom element directly)
      const inner = root.querySelector(".response-container, .query-container, .model-response-text, .user-query-text") || root.querySelector("div") || root;
      return inner;
    }

    return el;
  }

  /* ── Create or update a single button on a host ── */
  function ensureButton(host, messageEl) {
    hostMap.set(messageEl, host);

    // Check for existing button
    let existingBtn = btnMap.get(host);
    if (existingBtn && existingBtn.isConnected) {
      updateBtn(existingBtn, messageEl);
      return;
    }

    // Clean up stale
    host.querySelectorAll(":scope > .bk-row, :scope > .bk-abs").forEach(b => b.remove());

    function makeClickHandler(btn) {
      btn.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        if (isSaved(messageEl)) {
          flash("Already bookmarked");
          return;
        }
        doSave(messageEl);
      });
    }

    if (IS_CLAUDE) {
      // Claude: absolute positioned button, host gets position:relative
      host.classList.add("bk-claude-host");
      const btn = document.createElement("button");
      btn.className = "bk-abs";
      btn.type = "button";
      btn.title = "Bookmark this message";
      btn.innerHTML = IC_OUT;
      makeClickHandler(btn);
      host.appendChild(btn);
      btnMap.set(host, btn);
      updateBtn(btn, messageEl);
    } else {
      // ChatGPT / Gemini: inline row at bottom
      const row = document.createElement("div");
      row.className = "bk-row";
      const btn = document.createElement("button");
      btn.className = "bk-rbtn";
      btn.type = "button";
      btn.title = "Bookmark this message";
      btn.innerHTML = IC_OUT;
      makeClickHandler(btn);
      row.appendChild(btn);
      host.appendChild(row);
      btnMap.set(host, btn);
      updateBtn(btn, messageEl);
    }
  }

  function updateBtn(btn, messageEl) {
    const saved = isSaved(messageEl);
    btn.innerHTML = saved ? IC_FILL : IC_OUT;
    btn.classList.toggle("on", saved);
  }

  /* ── Get all messages (optimized per platform) ── */
  function getMessages() {
    const sel = platformSelector();
    let raw;
    try { raw = document.querySelectorAll(sel); } catch { return []; }
    if (!raw.length && IS_GEMINI) {
      // Gemini fallback: try shadow DOM
      const mc = document.querySelectorAll("message-content");
      const results = [];
      mc.forEach(m => {
        const p = m.closest("model-response") || m.closest("user-query");
        if (p) results.push(p);
      });
      return dedup(results);
    }

    const main = document.querySelector("main");
    const filtered = [];
    for (let i = 0; i < raw.length; i++) {
      const node = raw[i];
      if (!(node instanceof Element)) continue;
      if (node.closest("#bk-p, #bk-t, .bk-btn")) continue;
      if (node.closest("nav, aside, header, footer")) continue;
      const text = node.textContent || "";
      if (text.trim().length < 8) continue;

      if (IS_CLAUDE || IS_GEMINI) {
        filtered.push(node);
      } else {
        if (main && node.closest("main")) filtered.push(node);
        else if (!main) filtered.push(node);
      }
    }

    if (!filtered.length && IS_CLAUDE) {
      // Claude fallback: heuristic
      return dedup(claudeFallback());
    }

    return dedup(filtered);
  }

  function dedup(elements) {
    // Sort by document order
    elements.sort((a, b) => {
      const cmp = a.compareDocumentPosition(b);
      return cmp & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    // Dedup by host → only one per host
    const seen = new Set();
    const result = [];
    for (const el of elements) {
      const host = findHost(el);
      if (!host || seen.has(host)) continue;
      // Also skip if this host is a descendant of an already-seen host
      let isChild = false;
      for (const s of seen) {
        if (s.contains(host) || host.contains(s)) { isChild = true; break; }
      }
      if (isChild) continue;
      seen.add(host);
      result.push(el);
    }
    return result;
  }

  function claudeFallback() {
    const candidates = document.querySelectorAll("main > div > div, article, [role='article']");
    const picked = [];
    for (let i = 0; i < candidates.length && picked.length < 60; i++) {
      const node = candidates[i];
      if (!(node instanceof HTMLElement)) continue;
      if (node.closest("#bk-p, #bk-t, .bk-btn, nav, aside, header, footer")) continue;
      const text = (node.textContent || "").trim();
      if (text.length < 30) continue;
      // Skip if a single child has 85%+ of the text (means we should go deeper)
      let skip = false;
      for (const ch of node.children) {
        if ((ch.textContent || "").trim().length >= text.length * 0.85) { skip = true; break; }
      }
      if (!skip) picked.push(node);
    }
    return picked;
  }

  /* ── Text helpers ── */
  function norm(s) { return String(s || "").replace(/\s+/g, " ").trim(); }

  function msgText(el) {
    if (!el) return "";
    let text = el.textContent || el.innerText || "";

    // Gemini shadow DOM
    if (IS_GEMINI && text.trim().length < 5) {
      const mc = el.matches && el.matches("message-content") ? el : el.querySelector("message-content");
      if (mc && mc.shadowRoot) text = mc.shadowRoot.textContent || "";
    }

    // Claude nested
    if (IS_CLAUDE && text.trim().length < 5) {
      for (const sel of ["[data-testid='message-content']", "div.font-claude-message", "[role='article']", "p"]) {
        const c = el.querySelector(sel);
        if (c && (c.textContent || "").trim().length > text.trim().length) { text = c.textContent; break; }
      }
    }

    if (!text.trim() && el.shadowRoot) text = el.shadowRoot.textContent || "";
    return norm(text);
  }

  function snippetKey(s) { return norm(s).substring(0, 140); }
  function snippetTail(s) { return norm(s).slice(-140); }

  /* ── Bookmark index ── */
  function rebuildIndex() {
    savedScopedSigs = new Set();
    savedMsgIds = new Set();
    for (const bm of allBookmarks) {
      if (bm.messageId) savedMsgIds.add(String(bm.messageId));
      const k = bm.msgKey || snippetKey((bm.textSnippet || "").substring(0, 300));
      const t = bm.msgTail || snippetTail((bm.textSnippet || "").substring(0, 300));
      const sig = k + "|" + t + "|" + (bm.msgLen || 0);
      savedScopedSigs.add(basePath(bm.url || "") + "||" + sig);
    }
  }

  function isSaved(el) {
    const msgId = extractMsgId(el);
    if (msgId && savedMsgIds.has(msgId)) return true;
    const text = msgText(el);
    const sig = snippetKey(text) + "|" + snippetTail(text) + "|" + text.length;
    return savedScopedSigs.has(basePath(location.href) + "||" + sig);
  }

  /* ── Save ── */
  function doSave(el) {
    const text = msgText(el);
    let label = "";
    try {
      const preview = text.substring(0, 80) + (text.length > 80 ? "…" : "");
      const result = prompt('Enter a title/label for this bookmark:\n\n"' + preview + '"');
      if (result === null) return; // cancelled
      label = result.trim();
    } catch { label = ""; }
    if (!label) {
      const base = norm(text).substring(0, 44);
      label = base ? (base.length >= 44 ? base + "…" : base) : "Bookmark";
    }

    allBookmarks.push({
      label,
      textSnippet: text.substring(0, 300),
      url: location.href,
      savedAt: Date.now(),
      msgKey: snippetKey(text),
      msgTail: snippetTail(text),
      msgLen: text.length,
      messageId: extractMsgId(el),
      turnIndex: getMessages().indexOf(el)
    });

    rebuildIndex();
    scheduleSync();
    renderPanel();
    chrome.storage.local.set({ bookmarks: allBookmarks }, () => {
      if (chrome.runtime && chrome.runtime.lastError) { flash("Save failed"); return; }
      flash("Saved: " + label);
    });
  }

  /* ── Utilities ── */
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function basePath(u) { try { const p = new URL(u); return p.origin + p.pathname; } catch { return u; } }

  function extractMsgId(el) {
    if (!el || !(el instanceof Element)) return "";
    return el.getAttribute("data-message-id") || (el.querySelector("[data-message-id]") || {}).getAttribute?.("data-message-id") || "";
  }

  /* ── Navigation ── */
  function goTo(bm) {
    const target = {
      url: bm.url || "",
      textSnippet: bm.textSnippet || "",
      msgKey: bm.msgKey || snippetKey((bm.textSnippet || "").substring(0, 300)),
      msgTail: bm.msgTail || snippetTail((bm.textSnippet || "").substring(0, 300)),
      msgLen: bm.msgLen || norm(bm.textSnippet || "").length,
      messageId: bm.messageId || "",
      turnIndex: Number.isFinite(bm.turnIndex) ? bm.turnIndex : -1
    };
    if (basePath(location.href) === basePath(bm.url || "")) retryScroll(target, false);
    else if (bm.url) chrome.storage.local.set({ bkmrk_scrollTo: target }, () => (location.href = bm.url));
  }

  function scrollMsg(target, quiet) {
    if (!target) return false;

    // By message ID
    if (target.messageId) {
      const safe = window.CSS?.escape ? CSS.escape(target.messageId) : target.messageId;
      const byId = document.querySelector('[data-message-id="' + safe + '"]');
      if (byId) { highlight(byId); return true; }
    }

    // By turn index
    if (Number.isFinite(target.turnIndex) && target.turnIndex >= 0) {
      const msgs = getMessages();
      const el = msgs[Math.min(target.turnIndex, msgs.length - 1)];
      if (el) {
        const text = msgText(el);
        const k = snippetKey(text);
        if (k === target.msgKey || !target.msgKey) { highlight(el); return true; }
      }
    }

    // By text matching
    if (target.msgKey) {
      for (const m of getMessages()) {
        if (snippetKey(msgText(m)) === target.msgKey) { highlight(m); return true; }
      }
    }

    // Fuzzy
    if (target.textSnippet) {
      const q = snippetKey(target.textSnippet).substring(0, 100);
      if (q) {
        for (const m of getMessages()) {
          if (norm(m.textContent || "").includes(q)) { highlight(m); return true; }
        }
      }
    }

    if (!quiet) flash("Message not found in this chat");
    return false;
  }

  function retryScroll(target, removeOnSuccess) {
    const t = normTarget(target);
    if (!t) return;
    let n = 0;
    const iv = setInterval(() => {
      if (scrollMsg(t, true)) {
        if (removeOnSuccess) chrome.storage.local.remove("bkmrk_scrollTo");
        clearInterval(iv);
        return;
      }
      n++;
      if (n > 30) { clearInterval(iv); flash("Message not found in this chat"); }
    }, 900);
  }

  function highlight(el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.style.outline = "2px solid rgba(255,255,255,.2)";
    el.style.borderRadius = "8px";
    el.style.transition = "outline .3s";
    setTimeout(() => (el.style.outline = ""), 2500);
  }

  function normTarget(t) {
    if (!t) return null;
    if (typeof t === "string") return { textSnippet: t };
    if (typeof t === "object") return t;
    return null;
  }

  function targetMatchesChat(t) {
    const target = normTarget(t);
    if (!target || !target.url) return true;
    return basePath(location.href) === basePath(target.url);
  }
})();
