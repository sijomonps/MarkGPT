/* MarkGPT - content.js (v2.3 - selection bookmarks + cross-platform panel alignment) */
(() => {
  if (window.__bkmrk_loaded) return;
  window.__bkmrk_loaded = true;

  /* ── Platform detection (cached once) ── */
  const HOST = location.hostname;
  const IS_CLAUDE = HOST === "claude.ai";
  const IS_GEMINI = HOST === "gemini.google.com";
  const IS_CHATGPT = HOST === "chatgpt.com" || HOST === "chat.openai.com";
  const BOOKMARK_TEXT_LIMIT = 260;
  const SELECTION_DEBOUNCE_MS = 140;
  const SELECTION_MIN_CHARS = 2;

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
  let selectionBtn = null;
  let selectionDebounce = 0;
  let selectionDraft = null;
  let selectionHooksInstalled = false;
  const btnMap = new WeakMap();   // host element → button element
  const hostMap = new WeakMap();  // message element → host element
  const msgElMap = new WeakMap(); // button → messageEl reference

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
    .bk-row{display:flex;justify-content:flex-end;width:100%;margin-top:4px;pointer-events:auto;position:relative;z-index:9999}
    .bk-rbtn{width:22px;height:22px;border-radius:5px;border:none;background:transparent;color:inherit;opacity:.45;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:opacity .15s,background .12s;pointer-events:auto;position:relative;z-index:9999}
    .bk-rbtn svg,.bk-abs svg,.bk-sel-btn svg{pointer-events:none}
    .bk-rbtn:hover{opacity:.9;background:rgba(127,127,127,.12)}
    .bk-rbtn.on{opacity:.8}
    .bk-claude-host, .bk-chatgpt-host{position:relative !important}
    .bk-abs{position:absolute;bottom:6px;right:6px;width:22px;height:22px;border-radius:5px;border:none;background:rgba(127,127,127,.08);color:inherit;opacity:.4;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:opacity .15s,background .12s;pointer-events:auto;z-index:9999}
    .bk-claude-host:hover .bk-abs, .bk-chatgpt-host:hover .bk-abs{opacity:.7}
    .bk-abs:hover{opacity:1 !important;background:rgba(127,127,127,.18)}
    .bk-abs.on{opacity:.75}
    /* Gemini: stable host styling */
    model-response.bk-gemini-host,user-query.bk-gemini-host{display:block !important;position:relative}
    model-response.bk-gemini-host .bk-row,user-query.bk-gemini-host .bk-row{display:flex;justify-content:flex-end;width:100%;margin-top:2px;padding-right:4px;box-sizing:border-box}
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
    #bk-wm{padding:5px 8px 6px;text-align:center;font-size:10px;color:rgba(255,255,255,.45);letter-spacing:.4px;border-top:1px solid rgba(255,255,255,.12);user-select:none;display:flex;align-items:center;justify-content:center;gap:2px;flex-wrap:wrap}
    #bk-wm a{color:inherit;text-decoration:none;opacity:.92;transition:opacity .12s,color .12s}
    #bk-wm a:hover{opacity:1;color:rgba(255,255,255,.82)}
    #bk-wm a:focus-visible{outline:1px solid rgba(255,255,255,.25);outline-offset:1px;border-radius:2px}
    #bk-modal-overlay{position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,.55);z-index:2147483646;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;pointer-events:auto}
    #bk-modal-overlay.show{opacity:1}
    #bk-modal{background:#2a2a2a;border:1px solid rgba(255,255,255,.15);border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.6);padding:18px 20px;width:320px;max-width:90vw;font:13px/1.5 system-ui,sans-serif;color:#e0e0e0}
    #bk-modal h3{margin:0 0 12px;font-size:14px;font-weight:600;color:#fff}
    #bk-modal-input{width:100%;box-sizing:border-box;padding:8px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.15);background:#1e1e1e;color:#e0e0e0;font:13px system-ui,sans-serif;outline:none;transition:border-color .15s}
    #bk-modal-input:focus{border-color:rgba(255,255,255,.35)}
    #bk-modal-meta{display:flex;justify-content:flex-end;margin-top:6px;font-size:11px;color:#8c8c8c}
    #bk-modal-count{font-variant-numeric:tabular-nums}
    #bk-modal-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}
    #bk-modal-btns button{padding:6px 16px;border-radius:7px;border:none;font:500 12px system-ui,sans-serif;cursor:pointer;transition:background .12s}
    #bk-modal-cancel{background:rgba(255,255,255,.08);color:#aaa}
    #bk-modal-cancel:hover{background:rgba(255,255,255,.14)}
    #bk-modal-save{background:rgba(59,130,246,.8);color:#fff}
    #bk-modal-save:hover{background:rgba(59,130,246,1)}
    #bk-sel-btn{position:fixed;top:-100px;left:-100px;width:26px;height:26px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(36,36,36,.95);color:#e8e8e8;display:none;align-items:center;justify-content:center;padding:0;cursor:pointer;z-index:2147483645;box-shadow:0 5px 20px rgba(0,0,0,.45);opacity:0;transform:translateY(4px);transition:opacity .15s,transform .15s,background .12s}
    #bk-sel-btn.show{display:flex;opacity:.92;transform:translateY(0)}
    #bk-sel-btn:hover{opacity:1;background:rgba(60,60,60,.98)}
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
    installGlobalClickHandler();
    installSelectionHooks();
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
    document.querySelectorAll(".bk-gemini-host").forEach(h => h.classList.remove("bk-gemini-host"));
    hideSelectionButton();
    if (panel) panel.style.display = "none";
  }

  /* ── Global click handler (capture phase on document) ── */
  let globalClickInstalled = false;
  function installGlobalClickHandler() {
    if (globalClickInstalled) return;
    globalClickInstalled = true;

    // Use capture phase at the document level to intercept clicks BEFORE
    // React/Angular/etc. event delegation can swallow them
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".bk-rbtn, .bk-abs, .bk-sel-btn");
      if (!btn) return;

      // This is our bookmark button — stop everything
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (btn.classList.contains("bk-sel-btn")) {
        saveSelectionBookmark();
        return;
      }

      const msgEl = msgElMap.get(btn);
      if (!msgEl) return;

      if (isSaved(msgEl)) {
        flash("Already bookmarked");
        return;
      }
      doSave(msgEl);
    }, true); // capture phase

    // Also block mousedown/pointerdown from propagating on our BOOKMARK buttons only
    document.addEventListener("mousedown", (e) => {
      if (e.target.closest(".bk-rbtn, .bk-abs, .bk-sel-btn")) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    }, true);
    document.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".bk-rbtn, .bk-abs, .bk-sel-btn")) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    }, true);
  }

  /* ── Text selection bookmark action ── */
  function installSelectionHooks() {
    if (selectionHooksInstalled) return;
    selectionHooksInstalled = true;

    document.addEventListener("selectionchange", () => {
      if (!enabled) { hideSelectionButton(); return; }
      if (selectionDebounce) clearTimeout(selectionDebounce);
      selectionDebounce = setTimeout(() => {
        selectionDebounce = 0;
        syncSelectionButton();
      }, SELECTION_DEBOUNCE_MS);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideSelectionButton();
    }, true);

    document.addEventListener("mousedown", (e) => {
      if (e.target.closest("#bk-modal-overlay, .bk-sel-btn")) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) hideSelectionButton();
    }, true);

    window.addEventListener("scroll", () => {
      if (selectionBtn && selectionBtn.classList.contains("show")) syncSelectionButton();
    }, { passive: true, capture: true });

    window.addEventListener("resize", () => {
      if (selectionBtn && selectionBtn.classList.contains("show")) syncSelectionButton();
    }, { passive: true });
  }

  function mkSelectionButton() {
    if (selectionBtn) return;
    selectionBtn = document.createElement("button");
    selectionBtn.id = "bk-sel-btn";
    selectionBtn.className = "bk-sel-btn";
    selectionBtn.type = "button";
    selectionBtn.title = "Bookmark selected text";
    selectionBtn.innerHTML = IC_OUT;
    document.documentElement.appendChild(selectionBtn);
  }

  function syncSelectionButton() {
    if (!enabled || document.getElementById("bk-modal-overlay")) {
      hideSelectionButton();
      return;
    }

    const payload = readSelectionPayload();
    if (!payload) {
      hideSelectionButton();
      return;
    }

    mkSelectionButton();
    selectionDraft = payload;
    const pos = selectionButtonPos(payload.rect);
    selectionBtn.style.left = pos.left + "px";
    selectionBtn.style.top = pos.top + "px";
    selectionBtn.classList.add("show");
  }

  function selectionButtonPos(rect) {
    const btnSize = 26;
    let left = Math.round(rect.right + 8);
    let top = Math.round(rect.top + rect.height / 2 - btnSize / 2);

    if (left + btnSize + 8 > window.innerWidth) {
      left = Math.max(8, Math.round(rect.left - btnSize - 8));
    }
    top = Math.max(8, Math.min(top, window.innerHeight - btnSize - 8));
    return { left, top };
  }

  function hideSelectionButton() {
    selectionDraft = null;
    if (!selectionBtn) return;
    selectionBtn.classList.remove("show");
    selectionBtn.style.left = "-100px";
    selectionBtn.style.top = "-100px";
  }

  function selectionRect(range) {
    if (!range) return null;
    let rect = range.getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) {
      const rects = range.getClientRects();
      if (rects && rects.length) rect = rects[rects.length - 1];
    }
    return rect || null;
  }

  function nodeToElement(node) {
    if (!node) return null;
    return node instanceof Element ? node : node.parentElement;
  }

  function selectionMessage(sel) {
    const candidates = [
      nodeToElement(sel.anchorNode),
      nodeToElement(sel.focusNode),
      nodeToElement(sel.rangeCount ? sel.getRangeAt(0).commonAncestorContainer : null)
    ];

    for (const el of candidates) {
      if (!el) continue;
      const msg = el.closest(platformSelector());
      if (msg) return msg;
      if (IS_GEMINI) {
        const gm = el.closest("model-response, user-query");
        if (gm) return gm;
      }
    }
    return null;
  }

  function readSelectionPayload() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;

    const text = norm(sel.toString());
    if (text.length < SELECTION_MIN_CHARS) return null;

    const anchorEl = nodeToElement(sel.anchorNode);
    if (!anchorEl) return null;
    if (anchorEl.closest("#bk-p, #bk-t, #bk-modal-overlay, .bk-sel-btn")) return null;

    const rect = selectionRect(sel.getRangeAt(0));
    if (!rect) return null;

    return {
      text: text.substring(0, BOOKMARK_TEXT_LIMIT),
      messageEl: selectionMessage(sel),
      rect
    };
  }

  function saveSelectionBookmark() {
    if (!selectionDraft || !selectionDraft.text) {
      hideSelectionButton();
      return;
    }

    const draft = selectionDraft;
    const initialValue = draft.text.substring(0, BOOKMARK_TEXT_LIMIT);

    hideSelectionButton();
    try {
      const sel = window.getSelection();
      if (sel) sel.removeAllRanges();
    } catch {}

    showBookmarkModal({
      title: "Bookmark Selection",
      placeholder: "Edit selected text",
      initialValue,
      maxLen: BOOKMARK_TEXT_LIMIT
    }).then((result) => {
      if (result === null) return;

      const picked = norm(result).substring(0, BOOKMARK_TEXT_LIMIT);
      if (!picked) {
        flash("Bookmark text is empty");
        return;
      }

      const scopedSig = snippetKey(picked) + "|" + snippetTail(picked) + "|" + picked.length;
      if (savedScopedSigs.has(basePath(location.href) + "||" + scopedSig)) {
        flash("Already bookmarked");
        return;
      }

      const labelSeed = picked.substring(0, 44);
      const label = labelSeed ? (labelSeed.length >= 44 ? labelSeed + "…" : labelSeed) : "Bookmark";

      allBookmarks.push({
        label,
        textSnippet: picked,
        url: location.href,
        savedAt: Date.now(),
        msgKey: snippetKey(picked),
        msgTail: snippetTail(picked),
        msgLen: picked.length,
        messageId: extractMsgId(draft.messageEl),
        turnIndex: draft.messageEl ? getMessages().indexOf(draft.messageEl) : -1
      });

      rebuildIndex();
      scheduleSync();
      renderPanel();
      chrome.storage.local.set({ bookmarks: allBookmarks }, () => {
        if (chrome.runtime && chrome.runtime.lastError) { flash("Save failed"); return; }
        flash("Saved: " + label);
      });
    });
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
      '<div id="bk-list"><div id="bk-list-inner"></div><div id="bk-wm">MarkGPT by <a href="https://sijomonps.github.io/" target="_blank" rel="noopener noreferrer">Sijomon P S ❤️</a></div></div>';
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
    const offset = panelOffsetFromLeftRail();
    panel.style.left = Math.min(Math.max(12, offset), window.innerWidth - 230) + "px";
  }

  function panelOffsetFromLeftRail() {
    const selectors = [
      "aside",
      "nav",
      "side-navigation-v2",
      "bard-sidenav",
      "mat-sidenav",
      "[data-testid*='sidebar']",
      "[class*='sidebar']:not([class*='content'])",
      "[class*='sidenav']:not([class*='content'])"
    ];

    let railRight = 0;
    const nodes = document.querySelectorAll(selectors.join(","));
    nodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const r = node.getBoundingClientRect();
      if (r.width < 72 || r.height < 120) return;
      if (r.left > 40) return;
      if (r.right <= 0 || r.right >= window.innerWidth * 0.65) return;
      railRight = Math.max(railRight, Math.round(r.right));
    });

    return railRight ? railRight + 12 : 18;
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
  let geminiSyncDebounce = 0;

  function startObserver() {
    if (observer) { scheduleSync(); return; }
    scheduleSync();
    observer = new MutationObserver((mutations) => {
      // For Gemini: skip mutations that are only our own bk-row elements
      // to prevent the Angular re-render → bk-row removal → sync → re-add loop
      if (IS_GEMINI) {
        const isSelfMutation = mutations.every(m =>
          Array.from(m.addedNodes).every(n => n.nodeType !== 1 || (n instanceof Element && (n.classList.contains('bk-row') || n.classList.contains('bk-rbtn') || n.id === 'bk-t' || n.id === 'bk-p'))) &&
          Array.from(m.removedNodes).every(n => n.nodeType !== 1 || (n instanceof Element && (n.classList.contains('bk-row') || n.classList.contains('bk-rbtn'))))
        );
        if (isSelfMutation) return;
        scheduleSync();
      } else {
        scheduleSync();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Heartbeat every 4s
    if (!heartbeat) heartbeat = setInterval(() => { if (enabled) scheduleSync(); }, 4000);
  }

  function stopObserver() {
    if (observer) { observer.disconnect(); observer = null; }
    if (syncTimer) { clearTimeout(syncTimer); syncTimer = 0; }
    if (heartbeat) { clearInterval(heartbeat); heartbeat = 0; }
    if (geminiSyncDebounce) { clearTimeout(geminiSyncDebounce); geminiSyncDebounce = 0; }
    if (selectionDebounce) { clearTimeout(selectionDebounce); selectionDebounce = 0; }
  }

  function scheduleSync() {
    if (syncTimer) return;
    syncTimer = setTimeout(() => {
      syncTimer = 0;
      if (!enabled) return;
      syncButtons();
    }, 500);
  }

  /* ── Core sync: find messages → ensure one button each ── */
  const activeBtnParents = new Set(); // track actual parent elements of our buttons

  function syncButtons() {
    const messages = getMessages();
    const activeHosts = new Set();
    activeBtnParents.clear();

    for (let i = 0; i < messages.length; i++) {
      const host = findHost(messages[i]);
      if (!host || activeHosts.has(host)) continue;
      activeHosts.add(host);
      ensureButton(host, messages[i]);
    }

    // Remove orphaned buttons
    // For Gemini: only remove .bk-row whose host element no longer has bk-gemini-host class
    // (avoids false positives from Angular re-renders in inner divs)
    if (IS_GEMINI) {
      document.querySelectorAll(".bk-row").forEach(el => {
        const h = el.parentElement;
        if (!h || !h.classList.contains("bk-gemini-host")) el.remove();
        else if (!activeHosts.has(h)) el.remove();
      });
    } else {
      document.querySelectorAll(".bk-row, .bk-abs").forEach(el => {
        const h = el.parentElement;
        if (!h || (!activeHosts.has(h) && !activeBtnParents.has(h))) el.remove();
      });
    }
  }

  /* ── Find the host element to attach the button to ── */
  function findHost(el) {
    if (!el || !(el instanceof HTMLElement)) return null;

    if (IS_CHATGPT) {
      let inner = el;
      if (el.matches("[data-testid^='conversation-turn'], article")) {
        inner = el.querySelector("[data-message-id], [data-message-author-role]") || el;
      }
      const msgId = inner.closest("[data-message-id]");
      if (msgId) return msgId;
      const role = inner.closest("[data-message-author-role]");
      if (role) return role;
      const turn = inner.closest("[data-testid^='conversation-turn']");
      if (turn) return turn;
      return inner;
    }

    if (IS_CLAUDE) {
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
      // Gemini: return the custom element itself (model-response / user-query)
      return el.closest("model-response") || el.closest("user-query") || el;
    }

    return el;
  }

  /* ── Create or update a single button on a host ── */
  function ensureButton(host, messageEl) {
    hostMap.set(messageEl, host);

    // Check for existing button
    let existingBtn = btnMap.get(host);
    if (existingBtn && existingBtn.isConnected) {
      // Update the msgEl mapping in case the element changed
      msgElMap.set(existingBtn, messageEl);
      updateBtn(existingBtn, messageEl);
      return;
    }

    // Clean up stale
    host.querySelectorAll(":scope > .bk-row, :scope > .bk-abs").forEach(b => b.remove());

    if (IS_CLAUDE) {
      host.classList.add("bk-claude-host");
      const btn = document.createElement("button");
      btn.className = "bk-abs";
      btn.type = "button";
      btn.title = "Bookmark this message";
      btn.innerHTML = IC_OUT;
      msgElMap.set(btn, messageEl);
      host.appendChild(btn);
      btnMap.set(host, btn);
      updateBtn(btn, messageEl);
    } else if (IS_GEMINI) {
      // Gemini: append directly to model-response / user-query element (NOT inner Angular-managed divs)
      // This prevents Angular change detection from removing our bk-row when it re-renders inner content
      host.classList.add("bk-gemini-host");
      const row = document.createElement("div");
      row.className = "bk-row";
      const btn = document.createElement("button");
      btn.className = "bk-rbtn";
      btn.type = "button";
      btn.title = "Bookmark this message";
      btn.innerHTML = IC_OUT;
      msgElMap.set(btn, messageEl);
      row.appendChild(btn);
      host.appendChild(row);
      activeBtnParents.add(host);
      btnMap.set(host, btn);
      updateBtn(btn, messageEl);
    } else {
      // ChatGPT: inside the message area completely
      host.classList.add("bk-chatgpt-host");
      const btn = document.createElement("button");
      btn.className = "bk-abs";
      btn.type = "button";
      btn.title = "Bookmark this message";
      btn.innerHTML = IC_OUT;
      msgElMap.set(btn, messageEl);
      host.appendChild(btn);
      activeBtnParents.add(host);
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
      // Gemini fallback: try finding message-content elements
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
      return dedup(claudeFallback());
    }

    return dedup(filtered);
  }

  function dedup(elements) {
    elements.sort((a, b) => {
      const cmp = a.compareDocumentPosition(b);
      return cmp & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    const seen = new Set();
    const result = [];
    for (const el of elements) {
      const host = findHost(el);
      if (!host || seen.has(host)) continue;
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

    // For Gemini, also walk into the host's DOM
    if (IS_GEMINI) {
      // Try to get text from the root model-response/user-query
      const root = el.closest("model-response") || el.closest("user-query") || el;
      const rootText = root.textContent || root.innerText || "";
      if (rootText.trim().length > text.trim().length) text = rootText;

      // Try shadow DOM
      if (text.trim().length < 5) {
        const mc = root.querySelector("message-content") || (root.matches && root.matches("message-content") ? root : null);
        if (mc && mc.shadowRoot) text = mc.shadowRoot.textContent || "";
      }
    }

    // Claude nested
    if (IS_CLAUDE && text.trim().length < 5) {
      for (const sel of ["[data-testid='message-content']", "div.font-claude-message", "[role='article']", "p"]) {
        const c = el.querySelector(sel);
        if (c && (c.textContent || "").trim().length > text.trim().length) { text = c.textContent; break; }
      }
    }

    // ChatGPT: walk up to article to get full text
    if (IS_CHATGPT && text.trim().length < 5) {
      const article = el.closest("article");
      if (article) text = article.textContent || article.innerText || "";
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

  /* ── Custom modal dialog ── */
  function showBookmarkModal(opts = {}) {
    return new Promise((resolve) => {
      const title = String(opts.title || "Bookmark Chat");
      const placeholder = String(opts.placeholder || "label");
      const initialValue = String(opts.initialValue || "");
      const maxLen = Number.isFinite(opts.maxLen) ? Math.max(32, Math.min(300, opts.maxLen)) : 300;

      // Remove any existing modal
      const old = document.getElementById("bk-modal-overlay");
      if (old) old.remove();

      const overlay = document.createElement("div");
      overlay.id = "bk-modal-overlay";
      overlay.innerHTML =
        '<div id="bk-modal">' +
          '<h3>' + esc(title) + '</h3>' +
          '<input id="bk-modal-input" type="text" placeholder="' + esc(placeholder) + '" autocomplete="off" />' +
          '<div id="bk-modal-meta"><span id="bk-modal-count">0/' + maxLen + '</span></div>' +
          '<div id="bk-modal-btns">' +
            '<button id="bk-modal-cancel">Cancel</button>' +
            '<button id="bk-modal-save">Save</button>' +
          '</div>' +
        '</div>';

      document.documentElement.appendChild(overlay);
      // Force reflow then show
      void overlay.offsetHeight;
      overlay.classList.add("show");

      const input = overlay.querySelector("#bk-modal-input");
      const count = overlay.querySelector("#bk-modal-count");
      const saveBtn = overlay.querySelector("#bk-modal-save");
      const cancelBtn = overlay.querySelector("#bk-modal-cancel");
      let resolved = false;

      input.maxLength = maxLen;
      input.value = initialValue.substring(0, maxLen);
      const syncCount = () => { count.textContent = input.value.length + "/" + maxLen; };
      syncCount();
      input.addEventListener("input", syncCount);

      function cleanup(result) {
        if (resolved) return;
        resolved = true;
        overlay.classList.remove("show");
        setTimeout(() => { try { overlay.remove(); } catch(e) {} }, 150);
        resolve(result);
      }

      // Block mousedown/pointerdown on the entire overlay from reaching the page,
      // so platforms can't steal focus or intercept our modal interaction.
      // We do NOT block click events here — onclick handlers fire normally.
      const stopDown = (e) => { e.stopPropagation(); e.stopImmediatePropagation(); };
      overlay.addEventListener("mousedown",   stopDown, true);
      overlay.addEventListener("pointerdown", stopDown, true);

      // Save button — direct onclick fires at target phase, unblocked.
      saveBtn.onclick = (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
        cleanup(input.value.trim());
      };

      // Cancel button
      cancelBtn.onclick = (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
        cleanup(null);
      };

      // Click on backdrop closes modal
      overlay.onclick = (e) => {
        if (e.target === overlay) cleanup(null);
      };

      input.addEventListener("keydown", (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (e.key === "Enter") cleanup(input.value.trim());
        if (e.key === "Escape") cleanup(null);
      }, true);

      // Focus input
      setTimeout(() => {
        try {
          input.focus();
          input.select();
        } catch(e) {}
      }, 80);
    });
  }

  /* ── Save ── */
  function doSave(el) {
    const text = msgText(el);

    showBookmarkModal({ maxLen: 300 }).then(result => {
      if (result === null) return; // cancelled

      let label = result;
      if (!label) {
        const t = text || "Message";
        const base = norm(t).substring(0, 44);
        label = base ? (base.length >= 44 ? base + "…" : base) : "Bookmark";
      }

      allBookmarks.push({
        label,
        textSnippet: (text || "").substring(0, 300),
        url: location.href,
        savedAt: Date.now(),
        msgKey: snippetKey(text || ""),
        msgTail: snippetTail(text || ""),
        msgLen: (text || "").length,
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

    if (target.messageId) {
      const safe = window.CSS?.escape ? CSS.escape(target.messageId) : target.messageId;
      const byId = document.querySelector('[data-message-id="' + safe + '"]');
      if (byId) { highlight(byId); return true; }
    }

    if (Number.isFinite(target.turnIndex) && target.turnIndex >= 0) {
      const msgs = getMessages();
      const el = msgs[Math.min(target.turnIndex, msgs.length - 1)];
      if (el) {
        const text = msgText(el);
        const k = snippetKey(text);
        if (k === target.msgKey || !target.msgKey) { highlight(el); return true; }
      }
    }

    if (target.msgKey) {
      for (const m of getMessages()) {
        if (snippetKey(msgText(m)) === target.msgKey) { highlight(m); return true; }
      }
    }

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
