(() => {
  'use strict';

  // config
  const IMAGE_TAG_RE = /\[image=(.+?)\]/g;
  const aliasMap = {
    pcd: 'cdn.fourvo.id',
    yt: 'i.ytimg.com',
    gh: 'raw.githubusercontent.com',
    mc: 'textures.minecraft.net'
  };
  const PREVIEW_CLASS = 'yt-composer-image-preview-area';
  const PREVIEW_IMG_CLASS = 'yt-composer-image-preview-img';

  // CSS
  const CSS = `
    .${PREVIEW_CLASS} { margin-top:8px; display:flex; gap:8px; flex-wrap:wrap; align-items:flex-start; }
    .${PREVIEW_CLASS} img.${PREVIEW_IMG_CLASS} { max-width:140px; max-height:140px; border-radius:8px; object-fit:cover; display:block; }
    .${PREVIEW_CLASS} .yt-preview-broken { width:140px; height:90px; display:flex; align-items:center; justify-content:center; border-radius:8px; background:#222; color:#fff; font-size:12px; padding:6px; box-sizing:border-box; text-align:center; }
  `;
  (function injectCSS(){
    if (document.getElementById('yt-composer-image-preview-css')) return;
    const s = document.createElement('style');
    s.id = 'yt-composer-image-preview-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  })();

  // Normalizer (for preview only)
  function normalizeUrlForPreview(raw) {
  if (!raw) return null;
  let url = raw.trim();

  // STEP 1: detect hs:// or h://
  const sc = url.match(/^(hs|h):\/\/(.+)$/i);
  if (sc) {
    const scheme = sc[1].toLowerCase() === 'hs' ? 'https' : 'http';
    url = scheme + '://' + sc[2];  // convert scheme only
  }

  // STEP 2: alias fix (pcd/, gh/, yt/, etc)
  const alias = url.match(/^https?:\/\/([^\/]+)\/(.+)$/i);
  if (alias) {
    let host = alias[1];
    const path = alias[2];

    // aliasMap support
    if (aliasMap[host]) host = aliasMap[host];

    // STEP 3: apply domain fixes even if host came from alias or raw
    host = host
      .replace(/\.dic\b/gi, '.id')
      .replace(/\.cv\b/gi, '.com')
      .replace(/\.mcd\b/gi, '.me');

    return `https://${host}/${path}`;
  }

  // FINAL fallback: plain domain/path
  url = url
    .replace(/\.dic\b/gi, '.id')
    .replace(/\.cv\b/gi, '.com')
    .replace(/\.mcd\b/gi, '.me');

  return url.startsWith('http') ? url : 'https://' + url;
}
  // create image element for preview
  function makeImg(url) {
    const img = document.createElement('img');
    img.className = PREVIEW_IMG_CLASS;
    img.loading = 'lazy';
    img.alt = '';
    img.src = url;
    // handle load/error for nicer UX
    img.addEventListener('error', () => {
      // replace image element with broken indicator
      const box = document.createElement('div');
      box.className = 'yt-preview-broken';
      box.textContent = 'Preview failed';
      if (img.parentNode) img.parentNode.replaceChild(box, img);
    });
    return img;
  }

  // update preview area for a composer wrapper (does NOT change editor text)
  function updatePreviewForComposer(composerEl) {
    const editable = findEditableInComposer(composerEl);
    if (!editable) return;

    const text = editable.innerText || editable.textContent || '';
    IMAGE_TAG_RE.lastIndex = 0;
    let m;
    const previewUrls = [];
    while ((m = IMAGE_TAG_RE.exec(text)) !== null) {
      const raw = m[1].trim();
      const normalized = normalizeUrlForPreview(raw);
      if (normalized) previewUrls.push(normalized);
    }

    // find/create wrapper
    let wrapper = composerEl.querySelector(`.${PREVIEW_CLASS}`);
    if (!wrapper && previewUrls.length === 0) return;
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = PREVIEW_CLASS;
      composerEl.appendChild(wrapper);
    }

    // remove old children that are not in previewUrls (match by src for images)
    const existingImgs = Array.from(wrapper.querySelectorAll(`img.${PREVIEW_IMG_CLASS}`));
    const existingSrcs = new Set(existingImgs.map(i => i.src));
    existingImgs.forEach(img => { if (!previewUrls.includes(img.src)) img.remove(); });

    // append missing previews in order
    for (const u of previewUrls) {
      if (!existingSrcs.has(u)) {
        try {
          const img = makeImg(u);
          wrapper.appendChild(img);
        } catch (e) {
          // ignore
        }
      }
    }

    // if previewUrls became empty, remove wrapper
    if (previewUrls.length === 0 && wrapper && wrapper.childElementCount === 0) {
      wrapper.remove();
    }
  }

  // locate editor inside composer wrapper
  function findEditableInComposer(container) {
    if (!container) return null;
    const candidates = [
      '[contenteditable="true"]',
      '#contenteditable-root',
      'yt-formatted-string[contenteditable="true"]'
    ];
    for (const sel of candidates) {
      const el = container.querySelector(sel);
      if (el) return el;
    }
    return container.querySelector('[contenteditable="true"]') || null;
  }

  // attach to composer (setup events but DO NOT modify text)
  function attachComposer(composerEl) {
    if (!composerEl || composerEl.dataset.ytImageComposerAttached === '1') return;
    composerEl.dataset.ytImageComposerAttached = '1';

    const editable = findEditableInComposer(composerEl);
    if (!editable) return;

    const debounced = debounce(() => updatePreviewForComposer(composerEl), 180);

    function onInput() { debounced(); }
    function onPaste() { setTimeout(debounced, 50); }

    editable.addEventListener('input', onInput);
    editable.addEventListener('keyup', onInput);
    editable.addEventListener('paste', onPaste);

    // initial update
    setTimeout(() => updatePreviewForComposer(composerEl), 250);

    // cleanup when composer removed
    const mo = new MutationObserver(() => {
      if (!document.body.contains(composerEl)) {
        editable.removeEventListener('input', onInput);
        editable.removeEventListener('keyup', onInput);
        editable.removeEventListener('paste', onPaste);
        mo.disconnect();
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  // scan page for composer wrappers
  function scanForComposers() {
    const selectors = [
      'ytd-comment-simplebox-renderer',
      'ytd-commentbox #simplebox',
      'div#simplebox',
      'ytd-commentbox',
      '.comment-simplebox-renderer',
      '.yt-simplebox-renderer'
    ];
    const els = document.querySelectorAll(selectors.join(','));
    if (!els || els.length === 0) {
      // fallback: attach to visible contenteditable likely to be composer
      document.querySelectorAll('[contenteditable="true"]').forEach(e => {
        const wrapper = e.closest('ytd-comment-simplebox-renderer, ytd-commentbox, div#simplebox') || e.parentElement;
        if (wrapper) attachComposer(wrapper);
      });
      return;
    }
    els.forEach(attachComposer);
  }

  // debounce helper
  function debounce(fn, wait = 300) {
    let t = null;
    return (...a) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => { t = null; try { fn(...a); } catch (e) { console.error(e); } }, wait);
    };
  }

  // observe page mutations
  const pageObserver = new MutationObserver((mutations) => {
    let relevant = false;
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length) { relevant = true; break; }
      if (m.type === 'characterData') { relevant = true; break; }
    }
    if (relevant) debouncedScanForComposers();
  });
  const debouncedScanForComposers = debounce(scanForComposers, 300);
  pageObserver.observe(document.body, { childList: true, subtree: true, characterData: true });

  // initial run
  setTimeout(scanForComposers, 600);

  // debug hook
  window.__ytComposerImagePreview_scan = scanForComposers;
})();
