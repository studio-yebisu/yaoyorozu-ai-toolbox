/* Yaoyorozu AI ToolBox — case & catalog entry studio enhancements.
   Enhances DOM rendered by pinned case.js without modifying case.js, media.js, or media.css.
   No innerHTML on data; all URLs pass SY.safeHref; no external network requests. */
(() => {
  'use strict';

  const SY = window.SY || {};
  const $ = SY.$ || ((sel, r = document) => r.querySelector(sel));
  const $$ = SY.$$ || ((sel, r = document) => Array.from(r.querySelectorAll(sel)));
  const h = SY.h || function fallbackH(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat(Infinity)) {
      if (c === null || c === undefined || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  };
  const safeHref = SY.safeHref || (v => (typeof v === 'string' && /^https?:\/\/[^/]/i.test(v.trim()) ? v.trim() : null));
  const loadJSON = SY.loadJSON || (async url => {
    const res = await fetch(url, {cache: 'no-cache'});
    if (!res.ok) throw new Error(url + ' ' + res.status);
    return res.json();
  });
  const norm = SY.norm || (v => String(v ?? '').normalize('NFKC').toLowerCase());
  const announce = SY.announce || (() => {});

  const STAGE_META = {
    'runtime-reviewed': {label: '実動検証済み', tone: 'verified'},
    'concept-demo': {label: '概念デモ', tone: 'demo'},
    'source-reviewed': {label: '原典確認済み', tone: 'source'},
    'model-source-reviewed': {label: '原典確認済み', tone: 'source'},
    'guide': {label: 'ガイド収録', tone: 'guide'},
    'guide-included': {label: 'ガイド収録', tone: 'guide'}
  };

  const CASE_LINK = /^case\.html\?id=([a-z0-9._-]+)(?:[&#]|$)/i;
  const SAFE_DEMO_PATH = /^examples\/[a-z0-9._-]+(?:\/[a-z0-9._-]+)*(?:\?[a-z0-9._=&-]*)?(?:#[a-z0-9._-]*)?$/i;
  const COMPARE_KEY = 'yaoyorozu-compare-v1';
  const COMPARE_MAX = 4;

  let catalogPromise = null;
  let casesPromise = null;
  let toastTimer = null;
  let activeCleanup = null;

  /* ---------- Feedback & Clipboard ---------- */

  function showToast(message) {
    if (!message) return;
    announce(message);
    if (typeof SY.toast === 'function') {
      SY.toast(message);
      return;
    }
    let el = $('.cs-toast');
    if (!el) {
      el = h('p', {class: 'cs-toast', role: 'status', 'aria-live': 'polite'});
      document.body.append(el);
    }
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.classList.remove('is-visible'); }, 2400);
  }

  async function copyToClipboard(text, sourceEl) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (_) { /* Fallback below. */ }
    }
    const buf = h('textarea', {class: 'cs-copy-buffer', readonly: true, 'aria-hidden': 'true'});
    buf.value = text;
    document.body.append(buf);
    buf.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
    buf.remove();
    if (sourceEl && typeof sourceEl.focus === 'function') {
      sourceEl.focus({preventScroll: true});
    }
    return ok;
  }

  function flashButtonLabel(button, ok, successLabel, failLabel) {
    const base = button.dataset.csLabel || button.textContent;
    button.dataset.csLabel = base;
    clearTimeout(button._csReset);
    button.textContent = ok ? successLabel : failLabel;
    button._csReset = setTimeout(() => { button.textContent = base; }, ok ? 2000 : 3500);
  }

  /* ---------- Data Loaders ---------- */

  function getCatalog() {
    if (!catalogPromise) {
      catalogPromise = (async () => {
        try {
          const data = await loadJSON('data/catalog.json');
          const entries = Array.isArray(data) ? data : (Array.isArray(data.entries) ? data.entries : []);
          let categories = !Array.isArray(data) && Array.isArray(data.categories) ? data.categories : [];
          if (!categories.length) {
            try {
              const extra = await loadJSON('data/categories.json');
              categories = Array.isArray(extra.categories) ? extra.categories : [];
            } catch (_) { categories = []; }
          }
          return {entries, categories};
        } catch (_) {
          return {entries: [], categories: []};
        }
      })();
    }
    return catalogPromise;
  }

  function getCases() {
    if (!casesPromise) {
      casesPromise = (async () => {
        try {
          const data = await loadJSON('data/cases.json');
          const list = Array.isArray(data) ? data : (Array.isArray(data.cases) ? data.cases : []);
          return list.filter(item => item && item.id);
        } catch (_) {
          return [];
        }
      })();
    }
    return casesPromise;
  }

  async function getSingleCase(id) {
    if (!id) return null;
    try {
      const data = await loadJSON('data/cases/' + encodeURIComponent(id) + '.json');
      return data && data.id === id ? data : null;
    } catch (_) {
      return null;
    }
  }

  /* ---------- Workbench Integration ---------- */

  function readLocalCompare() {
    try {
      const raw = localStorage.getItem(COMPARE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string' && id) : [];
    } catch (_) {
      return [];
    }
  }

  function isInWorkbench(id) {
    if (SY.itemActions && typeof SY.itemActions.isCompared === 'function') {
      try { return Boolean(SY.itemActions.isCompared(id)); } catch (_) { /* Fallback. */ }
    }
    return readLocalCompare().includes(id);
  }

  function toggleWorkbench(id, title) {
    if (SY.itemActions && typeof SY.itemActions.toggleCompare === 'function') {
      const res = SY.itemActions.toggleCompare(id);
      return {handledBySY: true, added: Boolean(res && res.added), limitReached: Boolean(res && res.limitReached)};
    }
    try {
      const list = readLocalCompare();
      const idx = list.indexOf(id);
      let added = false;
      if (idx >= 0) {
        list.splice(idx, 1);
      } else {
        if (list.length >= COMPARE_MAX) {
          showToast(`比較は最大${COMPARE_MAX}件までです。`);
          return {added: false, limitReached: true};
        }
        list.push(id);
        added = true;
      }
      localStorage.setItem(COMPARE_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('sy:comparechange', {detail: {id, added, list}}));
      showToast(added
        ? `「${title}」をワークベンチの比較リストに追加しました（${list.length}/${COMPARE_MAX}）。`
        : `「${title}」を比較リストから外しました。`);
      return {added, count: list.length};
    } catch (_) {
      return {error: true};
    }
  }

  /* ---------- Metadata Helpers ---------- */

  function resolveStage(caseItem, entry) {
    const raw = (caseItem && (caseItem.verification_stage || (caseItem.catalog_entry && caseItem.catalog_entry.verification_stage)))
      || (entry && entry.verification_stage);
    if (raw && STAGE_META[raw]) return STAGE_META[raw];
    if (caseItem) {
      return caseItem.runtime_review ? STAGE_META['runtime-reviewed'] : STAGE_META['concept-demo'];
    }
    if (entry && entry.source_project === 'curated') return STAGE_META['source-reviewed'];
    if (entry) return STAGE_META.guide;
    return null;
  }

  function collectTags(caseItem, entry) {
    const raw = [
      ...(Array.isArray(caseItem && caseItem.catalog_entry && caseItem.catalog_entry.tags) ? caseItem.catalog_entry.tags : []),
      ...(Array.isArray(entry && entry.tags) ? entry.tags : [])
    ];
    const seen = new Set();
    const out = [];
    for (const tag of raw) {
      const text = String(tag || '').trim();
      const key = norm(text);
      if (!text || seen.has(key)) continue;
      seen.add(key);
      out.push(text);
    }
    return out;
  }

  function collectRequirements(caseItem, entry) {
    const raw = (caseItem && caseItem.catalog_entry && caseItem.catalog_entry.requirements)
      || (entry && entry.requirements);
    if (Array.isArray(raw)) return raw.map(v => String(v || '').trim()).filter(Boolean);
    if (typeof raw === 'string' && raw.trim()) return [raw.trim()];
    return [];
  }

  function isSafeDemoPath(value) {
    const href = safeHref(value);
    if (!href || /^https?:/i.test(href) || href.startsWith('/') || href.includes('..')) return null;
    return SAFE_DEMO_PATH.test(href) ? href : null;
  }

  /* ---------- UI Enhancements ---------- */

  function syncBreadcrumbs(head, itemTitle) {
    const syCrumb = $('.sy-breadcrumb');
    const headCrumbs = $('.crumbs', head);
    if (!syCrumb || !headCrumbs) return;

    const links = $$('a', headCrumbs);
    const catAnchor = links.length > 1 ? links[links.length - 1] : null;
    const catHref = catAnchor ? safeHref(catAnchor.getAttribute('href')) : null;
    const catLabel = catAnchor ? catAnchor.textContent.trim() : '';

    const nodes = [
      h('a', {href: safeHref('./') || './'}, 'ホーム'),
      h('span', {'aria-hidden': 'true'}, '/')
    ];
    if (catHref && catLabel) {
      nodes.push(
        h('a', {href: catHref}, catLabel),
        h('span', {'aria-hidden': 'true'}, '/')
      );
    }
    nodes.push(h('span', {'aria-current': 'page'}, itemTitle));
    syCrumb.replaceChildren(...nodes);
    headCrumbs.hidden = true;
    headCrumbs.setAttribute('aria-hidden', 'true');
  }

  function mountReadingProgressAndToc(root) {
    const existing = $('.cs-progress');
    if (existing) existing.remove();

    const fill = h('div', {class: 'cs-progress-fill'});
    const bar = h('div', {
      class: 'cs-progress',
      role: 'progressbar',
      'aria-label': '読了進捗',
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuenow': '0'
    }, fill);
    document.body.append(bar);

    const measureHeader = () => {
      const header = $('.sy-header') || $('.masthead');
      if (!header) return;
      const rect = header.getBoundingClientRect();
      if (rect.height > 0) {
        document.documentElement.style.setProperty('--cs-header-h', Math.round(rect.height) + 'px');
      }
    };

    let rafId = 0;
    const updateProgress = () => {
      rafId = 0;
      const doc = document.documentElement;
      const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
      const ratio = Math.min(1, Math.max(0, window.scrollY / scrollable));
      const pct = Math.round(ratio * 100);
      bar.style.setProperty('--cs-progress', ratio.toFixed(4));
      bar.setAttribute('aria-valuenow', String(pct));
    };

    const onScroll = () => {
      if (!rafId) rafId = requestAnimationFrame(updateProgress);
    };
    const onResize = () => {
      measureHeader();
      onScroll();
    };

    measureHeader();
    updateProgress();
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onResize, {passive: true});

    // Active TOC Spy
    const toc = $('.toc', root);
    let io = null;
    if (toc) {
      const tocLinks = $$('a[href^="#"]', toc);
      const targets = [];
      const linkById = new Map();
      for (const link of tocLinks) {
        const id = link.getAttribute('href').slice(1);
        const section = id ? document.getElementById(id) : null;
        if (section && root.contains(section)) {
          targets.push(section);
          linkById.set(id, link);
        }
      }

      const setActive = activeId => {
        for (const [id, link] of linkById.entries()) {
          if (id === activeId) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        }
      };

      for (const link of tocLinks) {
        link.addEventListener('click', () => {
          const id = link.getAttribute('href').slice(1);
          if (id) setActive(id);
        });
      }

      if ('IntersectionObserver' in window && targets.length) {
        const visible = new Set();
        io = new IntersectionObserver(entries => {
          for (const entry of entries) {
            if (entry.isIntersecting) visible.add(entry.target.id);
            else visible.delete(entry.target.id);
          }
          if (visible.size) {
            const topSection = targets.find(sec => visible.has(sec.id));
            if (topSection) setActive(topSection.id);
          }
        }, {rootMargin: '-18% 0px -64% 0px', threshold: [0, 0.2, 0.5]});

        for (const sec of targets) io.observe(sec);
        setActive(targets[0].id);
      }
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (io) io.disconnect();
      bar.remove();
    };
  }

  function enrichHeader(head, {stage, tags, requirements, toolId, compareId, title}) {
    // 1. Verification stage badge in .card-meta
    const cardMeta = $('.card-meta', head);
    if (cardMeta && stage && !$('.cs-stage-badge', cardMeta)) {
      cardMeta.append(h('span', {class: 'cs-stage-badge', 'data-stage': stage.tone}, stage.label));
    }

    // 2. Requirements summary pill + clickable tags strip
    if ((requirements.length || tags.length) && !$('.cs-meta-strip', head)) {
      const strip = h('div', {class: 'cs-meta-strip'});
      if (requirements.length) {
        const first = requirements[0];
        const summaryText = first.length > 36 ? first.slice(0, 35) + '…' : first;
        const extra = requirements.length > 1 ? `（ほか${requirements.length - 1}件）` : '';
        strip.append(h('details', {class: 'cs-req-pill'},
          h('summary', {title: requirements.join(' / ')},
            h('span', {class: 'cs-req-k'}, '動作環境'),
            h('span', {class: 'cs-req-v'}, summaryText + extra)),
          h('ul', {class: 'cs-req-list'}, requirements.map(req => h('li', {}, req)))));
      }
      if (tags.length) {
        strip.append(h('ul', {class: 'cs-tags', 'aria-label': '関連タグ'},
          tags.map(tag => {
            const tagHref = safeHref('./?tag=' + encodeURIComponent(tag) + '#catalog');
            return h('li', {}, tagHref
              ? h('a', {class: 'cs-tag', href: tagHref}, '#' + tag)
              : h('span', {class: 'cs-tag'}, '#' + tag));
          })));
      }
      const lead = $('.article-lead', head) || $('.article-overview', head) || $('.article-title', head);
      if (lead && lead.parentNode === head) lead.after(strip);
      else head.append(strip);
    }

    // 3. Studio & Workbench action bar
    const cmpId = compareId || toolId;
    if (!toolId || $('.cs-studio-bar', head)) return null;
    const studioHref = safeHref('prompt-studio.html?tool=' + encodeURIComponent(toolId));
    const compareBtn = h('button', {
      type: 'button',
      class: 'btn btn-line cs-compare-btn',
      'aria-pressed': String(isInWorkbench(cmpId))
    }, isInWorkbench(cmpId) ? '比較リストに追加済み' : 'ワークベンチで比較');

    const syncCompareBtn = () => {
      const active = isInWorkbench(cmpId);
      compareBtn.setAttribute('aria-pressed', String(active));
      compareBtn.textContent = active ? '比較リストに追加済み' : 'ワークベンチで比較';
    };

    compareBtn.addEventListener('click', () => {
      const res = toggleWorkbench(cmpId, title);
      if (res && res.error) {
        showToast('比較リストを保存できませんでした。');
        return;
      }
      syncCompareBtn();
    });

    window.addEventListener('sy:comparechange', syncCompareBtn);

    const bar = h('div', {class: 'cs-studio-bar', role: 'group', 'aria-label': 'スタジオとワークベンチ連携'},
      studioHref ? h('a', {class: 'btn btn-line cs-studio-link', href: studioHref}, '依頼ブリーフスタジオで調整 ↗') : null,
      compareBtn);

    const actionsWrap = $('.item-actions-wrap', head);
    const primaryActions = $('.actions', head);
    const anchor = primaryActions || actionsWrap;
    if (anchor && anchor.parentNode === head) anchor.after(bar);
    else head.append(bar);

    return () => window.removeEventListener('sy:comparechange', syncCompareBtn);
  }

  function enhanceEntryTagsSection(root) {
    const tagList = $('#tags .tags', root);
    if (!tagList || tagList.dataset.csLinked === '1') return;
    tagList.dataset.csLinked = '1';
    for (const li of $$('li', tagList)) {
      if ($('a', li)) continue;
      const text = li.textContent.trim();
      const href = safeHref('./?tag=' + encodeURIComponent(text) + '#catalog');
      if (text && href) {
        li.replaceChildren(h('a', {class: 'cs-tag-link', href}, text));
      }
    }
  }

  /* ---------- Interactive Prompt Customizer ---------- */

  function buildCustomPrompt(original, goal, constraints) {
    const cleanGoal = goal.trim();
    const cleanConstraints = constraints.trim();
    if (!cleanGoal && !cleanConstraints) return original;

    let result = original.trimEnd();
    if (cleanGoal) {
      if (/(?:^|\n)依頼：[^\n]*$/.test(result)) {
        result = result.replace(/(^|\n)依頼：[^\n]*$/, '$1依頼：' + cleanGoal);
      } else {
        result += '\n\n【自分の目的・対象】\n' + cleanGoal;
      }
    }
    if (cleanConstraints) {
      result += '\n\n【制約・出力形式の指定】\n' + cleanConstraints;
    }
    return result;
  }

  function injectPromptCustomizer(root) {
    const section = $('#request, #prompt', root);
    if (!section || $('.cs-customizer', section)) return;
    const pre = $('.prompt-text', section);
    if (!pre) return;

    const original = pre.textContent || '';
    const goalId = 'cs-goal-' + Math.random().toString(36).slice(2, 7);
    const constId = 'cs-const-' + Math.random().toString(36).slice(2, 7);

    const goalInput = h('textarea', {
      id: goalId,
      class: 'cs-input',
      rows: '2',
      placeholder: '例：社内イベント受付の案内ページを初心者向けに作りたい'
    });
    const constInput = h('textarea', {
      id: constId,
      class: 'cs-input',
      rows: '2',
      placeholder: '例：日本語で箇条書き中心、外部ライブラリなし、320px幅でも崩れないこと'
    });
    const preview = h('pre', {
      class: 'cs-customizer-preview',
      tabindex: '0',
      'aria-label': '調整した依頼文のプレビュー'
    }, original);

    const copyBtn = h('button', {type: 'button', class: 'btn btn-ink cs-custom-copy'}, '調整した依頼文をコピー');
    const resetBtn = h('button', {type: 'button', class: 'btn btn-line cs-custom-reset', disabled: true}, '元に戻す');
    const badge = h('span', {class: 'cs-customizer-badge', hidden: true}, '調整中');

    let currentText = original;
    const sync = () => {
      const modified = Boolean(goalInput.value.trim() || constInput.value.trim());
      currentText = buildCustomPrompt(original, goalInput.value, constInput.value);
      preview.textContent = currentText;
      resetBtn.disabled = !modified;
      badge.hidden = !modified;
    };

    goalInput.addEventListener('input', sync);
    constInput.addEventListener('input', sync);

    copyBtn.addEventListener('click', async () => {
      const ok = await copyToClipboard(currentText, copyBtn);
      flashButtonLabel(copyBtn, ok, 'コピーしました', 'コピーできませんでした');
      showToast(ok ? '調整した依頼文をコピーしました。' : 'プレビュー欄から手動で選択してコピーしてください。');
    });

    resetBtn.addEventListener('click', () => {
      goalInput.value = '';
      constInput.value = '';
      sync();
      showToast('元の依頼文に戻しました。');
      goalInput.focus();
    });

    const details = h('details', {class: 'cs-customizer'},
      h('summary', {class: 'cs-customizer-summary'},
        h('span', {}, '自分の案件向けに依頼文を調整する'),
        badge),
      h('div', {class: 'cs-customizer-body'},
        h('div', {class: 'cs-field'},
          h('label', {for: goalId}, '自分の目的・対象'),
          goalInput),
        h('div', {class: 'cs-field'},
          h('label', {for: constId}, '制約・出力形式の指定'),
          constInput),
        h('div', {class: 'cs-preview-wrap'},
          h('p', {class: 'cs-preview-label'}, '組み立て結果'),
          preview),
        h('div', {class: 'cs-customizer-actions'}, copyBtn, resetBtn)));

    const promptBox = $('.prompt', section);
    if (promptBox && promptBox.parentNode === section) promptBox.after(details);
    else section.append(details);
  }

  /* ---------- Inline Safe Demo Frame ---------- */

  function injectInlineDemoFrame(root, caseItem, title) {
    const demoSection = $('#demo', root);
    if (!demoSection || $('.cs-demo-toggle', demoSection)) return;

    const callout = $('.demo-callout', demoSection);
    const calloutLink = callout && $('a.btn', callout);
    const rawDemo = (caseItem && caseItem.demo) || (calloutLink && calloutLink.getAttribute('href'));
    const safeDemo = isSafeDemoPath(rawDemo);
    if (!safeDemo || !callout) return;

    const toggleBtn = h('button', {
      type: 'button',
      class: 'btn btn-line cs-demo-toggle',
      'aria-expanded': 'false'
    }, 'この場でデモを試す');

    let stage = null;
    let escBound = false;

    const closeStage = (restoreFocus = true) => {
      if (!stage) return;
      stage.remove();
      stage = null;
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.textContent = 'この場でデモを試す';
      if (escBound) {
        document.removeEventListener('keydown', onDocKeydown);
        escBound = false;
      }
      if (restoreFocus) toggleBtn.focus();
    };

    function onDocKeydown(event) {
      if (event.key === 'Escape' && stage) {
        event.preventDefault();
        closeStage(true);
      }
    }

    const openStage = () => {
      if (stage) return;
      const closeBtn = h('button', {type: 'button', class: 'btn btn-line cs-demo-close'}, '閉じる');
      closeBtn.addEventListener('click', () => closeStage(true));

      const extLink = h('a', {
        class: 'btn btn-line cs-demo-ext',
        href: safeDemo,
        target: '_blank',
        rel: 'noopener noreferrer'
      }, '別タブで開く ↗');

      const iframe = h('iframe', {
        class: 'cs-demo-frame',
        src: safeDemo,
        title: (title || '作例') + ' インラインデモ',
        loading: 'lazy',
        allow: 'clipboard-write'
      });

      iframe.addEventListener('load', () => {
        try {
          const doc = iframe.contentDocument;
          if (!doc) return;
          for (const a of doc.querySelectorAll('a[href]')) {
            const href = a.getAttribute('href') || '';
            if (/^https?:/i.test(href)) {
              a.setAttribute('target', '_blank');
              a.setAttribute('rel', 'noopener noreferrer');
            }
          }
          doc.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
              event.preventDefault();
              closeStage(true);
            }
          });
        } catch (_) { /* Cross-document access is optional. */ }
      });

      stage = h('div', {class: 'cs-demo-stage'},
        h('div', {class: 'cs-demo-toolbar'},
          h('span', {class: 'cs-demo-label'}, 'インラインデモ（Escで閉じる）'),
          h('div', {class: 'cs-demo-controls'}, extLink, closeBtn)),
        iframe);

      callout.after(stage);
      toggleBtn.setAttribute('aria-expanded', 'true');
      toggleBtn.textContent = 'デモを閉じる';
      if (!escBound) {
        document.addEventListener('keydown', onDocKeydown);
        escBound = true;
      }
      showToast('ページ内にデモを開きました（Escで閉じます）。');
    };

    toggleBtn.addEventListener('click', () => {
      if (stage) closeStage(true);
      else openStage();
    });

    let btnRow = $('.cs-demo-btns', callout);
    if (!btnRow) {
      btnRow = h('div', {class: 'cs-demo-btns'});
      if (calloutLink) {
        calloutLink.before(btnRow);
        btnRow.append(calloutLink, toggleBtn);
      } else {
        callout.append(btnRow);
        btnRow.append(toggleBtn);
      }
    }

    return () => closeStage(false);
  }

  /* ---------- Multi-Sample Tab Switcher & Copy JSON ---------- */

  function extractSamplePayload(card, rawSample, index) {
    if (rawSample && typeof rawSample === 'object') return rawSample;
    const title = ($('.sample-title', card) || $('.sample-label', card))?.textContent?.trim() || ('サンプル ' + (index + 1));
    const parts = $$('.sample-part', card).map(part => {
      const label = $('.sample-label', part)?.textContent?.trim() || '';
      const bodyEl = $('.sample-code, .sample-text, .sample-quote, .sample-facts', part);
      const valueText = bodyEl ? bodyEl.textContent.trim() : part.textContent.trim();
      let parsed = valueText;
      if (bodyEl && bodyEl.classList.contains('sample-code')) {
        try { parsed = JSON.parse(valueText); } catch (_) { parsed = valueText; }
      }
      return {label, value: parsed};
    });
    return {sample: title, parts};
  }

  function enhanceSamples(root, caseItem) {
    const samplesEl = $('.samples', root);
    if (!samplesEl || samplesEl.dataset.csEnhanced === '1') return;
    const cards = $$(':scope > li, :scope > article, :scope > details', samplesEl);
    if (!cards.length) return;
    samplesEl.dataset.csEnhanced = '1';

    let samplesDataPromise = null;
    const samplesUrl = safeHref(caseItem && caseItem.samples);
    if (samplesUrl && !/^https?:/i.test(samplesUrl)) {
      samplesDataPromise = loadJSON(samplesUrl)
        .then(data => (Array.isArray(data && data.samples) ? data.samples : []))
        .catch(() => []);
    }

    cards.forEach((card, index) => {
      if ($('.cs-sample-copy', card)) return;
      const copyBtn = h('button', {
        type: 'button',
        class: 'btn btn-line cs-sample-copy',
        'aria-label': `サンプル ${index + 1} の入力・出力をコピー`
      }, '入力・出力をコピー');

      copyBtn.addEventListener('click', async () => {
        const rawList = samplesDataPromise ? await samplesDataPromise : [];
        const payload = extractSamplePayload(card, rawList[index], index);
        const text = JSON.stringify(payload, null, 2);
        const ok = await copyToClipboard(text, copyBtn);
        flashButtonLabel(copyBtn, ok, 'コピーしました', 'コピーできませんでした');
        showToast(ok ? `サンプル ${index + 1} の入力・出力（JSON）をコピーしました。` : 'コピーできませんでした。');
      });

      card.append(h('div', {class: 'cs-sample-actions'}, copyBtn));
    });

    if (cards.length < 3) return;

    const tabs = [];
    const selectTab = selected => {
      tabs.forEach((tab, idx) => {
        const active = idx === selected;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      cards.forEach((card, idx) => {
        card.hidden = selected !== 0 && idx !== selected - 1;
      });
    };

    const allTab = h('button', {
      type: 'button',
      role: 'tab',
      class: 'cs-sample-tab',
      'aria-selected': 'true',
      tabindex: '0'
    }, `すべて (${cards.length})`);
    allTab.addEventListener('click', () => selectTab(0));
    tabs.push(allTab);

    cards.forEach((card, i) => {
      const sampleTitle = ($('.sample-title', card) || $('.sample-quote', card))?.textContent?.trim() || '';
      const tab = h('button', {
        type: 'button',
        role: 'tab',
        class: 'cs-sample-tab',
        'aria-selected': 'false',
        tabindex: '-1',
        title: sampleTitle || undefined
      }, `サンプル ${i + 1}`);
      tab.addEventListener('click', () => selectTab(i + 1));
      tabs.push(tab);
    });

    const tablist = h('div', {
      class: 'cs-sample-tabs',
      role: 'tablist',
      'aria-label': 'サンプルの表示切り替え'
    }, tabs);

    tablist.addEventListener('keydown', event => {
      const current = tabs.indexOf(document.activeElement);
      if (current < 0) return;
      let next = current;
      if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      tabs[next].focus();
      selectTab(next);
    });

    samplesEl.before(tablist);
  }

  /* ---------- Related Tools & Prev/Next Sibling Navigation ---------- */

  function buildUnifiedPool(entries, cases, categories) {
    const catLabels = Object.create(null);
    for (const c of categories || []) {
      if (c && c.id) catLabels[c.id] = c.label || c.id;
    }

    const caseById = new Map();
    const caseByEntryId = new Map();
    for (const c of cases || []) {
      caseById.set(c.id, c);
      if (c.catalog_entry && c.catalog_entry.id) caseByEntryId.set(c.catalog_entry.id, c);
    }

    const pool = [];
    const seenCaseIds = new Set();

    for (const entry of entries || []) {
      if (!entry || !entry.id) continue;
      const match = typeof entry.guide_url === 'string' && CASE_LINK.exec(entry.guide_url.trim());
      const linkedCase = caseByEntryId.get(entry.id) || (match && caseById.get(match[1])) || null;
      if (linkedCase) {
        if (seenCaseIds.has(linkedCase.id)) continue;
        seenCaseIds.add(linkedCase.id);
        const stage = resolveStage(linkedCase, entry);
        pool.push({
          key: 'case:' + linkedCase.id,
          caseId: linkedCase.id,
          entryId: entry.id,
          category: linkedCase.category || entry.category || '',
          catLabel: catLabels[linkedCase.category || entry.category] || linkedCase.category || entry.category || 'その他',
          title: (linkedCase.catalog_entry && linkedCase.catalog_entry.name) || linkedCase.title || entry.name || linkedCase.id,
          summary: (linkedCase.catalog_entry && linkedCase.catalog_entry.summary) || linkedCase.summary || entry.summary || '',
          tags: collectTags(linkedCase, entry),
          stage,
          hasCase: true,
          href: safeHref('case.html?id=' + encodeURIComponent(linkedCase.id))
        });
      } else {
        const guideHref = safeHref(entry.guide_url);
        const isOpenModel = guideHref && guideHref.startsWith('open-models.html');
        const href = isOpenModel ? guideHref : safeHref('case.html?entry=' + encodeURIComponent(entry.id));
        if (!href) continue;
        pool.push({
          key: 'entry:' + entry.id,
          caseId: null,
          entryId: entry.id,
          category: entry.category || '',
          catLabel: catLabels[entry.category] || entry.category || 'その他',
          title: entry.name || entry.id,
          summary: entry.summary || '',
          tags: collectTags(null, entry),
          stage: resolveStage(null, entry),
          hasCase: false,
          href
        });
      }
    }

    for (const c of cases || []) {
      if (seenCaseIds.has(c.id)) continue;
      seenCaseIds.add(c.id);
      const href = safeHref('case.html?id=' + encodeURIComponent(c.id));
      if (!href) continue;
      pool.push({
        key: 'case:' + c.id,
        caseId: c.id,
        entryId: (c.catalog_entry && c.catalog_entry.id) || null,
        category: c.category || '',
        catLabel: catLabels[c.category] || c.category || 'その他',
        title: (c.catalog_entry && c.catalog_entry.name) || c.title || c.id,
        summary: (c.catalog_entry && c.catalog_entry.summary) || c.summary || '',
        tags: collectTags(c, null),
        stage: resolveStage(c, null),
        hasCase: true,
        href
      });
    }

    return pool;
  }

  function appendRelatedAndSiblingNav(root, {pool, caseId, entryId, category, tags, catLabel}) {
    if (!pool.length || $('.cs-related', root)) return;

    const isSelf = item => (caseId && item.caseId === caseId) || (entryId && item.entryId === entryId);
    const currentNormTags = new Set(tags.map(norm));

    const scored = [];
    for (const item of pool) {
      if (isSelf(item)) continue;
      let score = 0;
      const sharedTags = [];
      if (category && item.category === category) score += 10;
      for (const t of item.tags) {
        if (currentNormTags.has(norm(t))) {
          score += 4;
          sharedTags.push(t);
        }
      }
      if (score > 0 && item.hasCase) score += 2;
      if (score > 0) scored.push({item, score, sharedTags});
    }

    scored.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'ja'));
    const related = scored.slice(0, 4);

    // Same-category Prev / Next sibling navigation
    const siblings = category ? pool.filter(item => item.category === category) : [];
    const selfIndex = siblings.findIndex(isSelf);
    const prev = selfIndex > 0 ? siblings[selfIndex - 1] : null;
    const next = selfIndex >= 0 && selfIndex < siblings.length - 1 ? siblings[selfIndex + 1] : null;

    if (!related.length && !prev && !next) return;

    const section = h('section', {class: 'cs-related', 'aria-labelledby': 'cs-related-title'});

    if (related.length) {
      section.append(
        h('div', {class: 'cs-related-head'},
          h('h2', {id: 'cs-related-title', class: 'cs-related-title'}, '同じ分野・関連タグの道具'),
          h('p', {class: 'cs-related-sub'}, '用途やタグが近いスキル・ツールをピックアップしています。')),
        h('ul', {class: 'cs-rel-grid'}, related.map(({item, sharedTags}) =>
          h('li', {},
            h('a', {class: 'cs-rel-card', href: item.href},
              h('div', {class: 'cs-rel-meta'},
                h('span', {class: 'cs-rel-cat'}, item.catLabel),
                item.stage ? h('span', {class: 'cs-stage-badge', 'data-stage': item.stage.tone}, item.stage.label) : null),
              h('strong', {class: 'cs-rel-title'}, item.title),
              item.summary ? h('p', {class: 'cs-rel-summary'}, item.summary) : null,
              sharedTags.length ? h('div', {class: 'cs-rel-tags'}, sharedTags.slice(0, 3).map(t => h('span', {}, '#' + t))) : null)))));
    } else {
      section.append(h('h2', {id: 'cs-related-title', class: 'sr-only'}, '前後の項目'));
    }

    if (prev || next) {
      section.append(
        h('nav', {class: 'cs-pager', 'aria-label': (catLabel || '同分野') + 'の前後ナビゲーション'},
          prev ? h('a', {class: 'cs-pager-card is-prev', href: prev.href},
            h('span', {class: 'cs-pager-dir'}, `← 同分野の前へ（${catLabel}）`),
            h('strong', {class: 'cs-pager-title'}, prev.title)) : h('span', {class: 'cs-pager-empty', 'aria-hidden': 'true'}),
          next ? h('a', {class: 'cs-pager-card is-next', href: next.href},
            h('span', {class: 'cs-pager-dir'}, `同分野の次へ（${catLabel}） →`),
            h('strong', {class: 'cs-pager-title'}, next.title)) : h('span', {class: 'cs-pager-empty', 'aria-hidden': 'true'})));
    }

    root.append(section);
  }

  /* ---------- Orchestrator ---------- */

  async function enhanceArticle(root, head) {
    if (typeof activeCleanup === 'function') {
      activeCleanup();
      activeCleanup = null;
    }

    const params = new URLSearchParams(location.search);
    const caseId = params.get('id');
    const entryId = params.get('entry');
    if (!caseId && !entryId) return;

    const [{entries, categories}, cases] = await Promise.all([getCatalog(), getCases()]);

    let caseItem = caseId ? cases.find(c => c.id === caseId) : null;
    if (caseId && !caseItem) {
      caseItem = await getSingleCase(caseId);
    }

    let entry = entryId ? entries.find(e => e && e.id === entryId) : null;
    if (!entry && caseItem) {
      const targetEntryId = caseItem.catalog_entry && caseItem.catalog_entry.id;
      entry = entries.find(e => e && (e.id === targetEntryId || e.guide_url === 'case.html?id=' + caseId)) || null;
    }
    if (!caseItem && entry) {
      const match = typeof entry.guide_url === 'string' && CASE_LINK.exec(entry.guide_url.trim());
      caseItem = cases.find(c => (c.catalog_entry && c.catalog_entry.id === entry.id) || (match && c.id === match[1])) || null;
    }

    const category = (caseItem && caseItem.category) || (entry && entry.category) || '';
    const catObj = categories.find(c => c && c.id === category);
    const catLabel = (catObj && catObj.label) || category || '分類なし';
    const titleEl = $('.article-title', head);
    const title = (titleEl && titleEl.textContent.trim())
      || (caseItem && ((caseItem.catalog_entry && caseItem.catalog_entry.name) || caseItem.title))
      || (entry && entry.name)
      || caseId || entryId || '詳細';

    const toolId = (caseItem && ((caseItem.catalog_entry && caseItem.catalog_entry.id) || caseItem.id))
      || (entry && entry.id)
      || caseId || entryId;
    const compareId = (caseItem && SY.likes && typeof SY.likes.caseID === 'function')
      ? SY.likes.caseID(caseItem)
      : toolId;

    const stage = resolveStage(caseItem, entry);
    const tags = collectTags(caseItem, entry);
    const requirements = collectRequirements(caseItem, entry);
    const href = location.pathname + location.search;

    if (SY.recent && typeof SY.recent.push === 'function') {
      try {
        SY.recent.push({
          id: caseId || entryId,
          type: caseId ? 'case' : 'entry',
          title,
          href,
          cat: catLabel
        });
      } catch (_) { /* Optional browser history. */ }
    }

    syncBreadcrumbs(head, title);
    const headerCleanup = enrichHeader(head, {stage, tags, requirements, toolId, compareId, title});
    enhanceEntryTagsSection(root);
    injectPromptCustomizer(root);

    const demoCleanup = caseId ? injectInlineDemoFrame(root, caseItem, title) : null;
    enhanceSamples(root, caseItem);

    const pool = buildUnifiedPool(entries, cases, categories);
    appendRelatedAndSiblingNav(root, {pool, caseId, entryId, category, tags, catLabel});

    const progressCleanup = mountReadingProgressAndToc(root);
    activeCleanup = () => {
      if (headerCleanup) headerCleanup();
      if (progressCleanup) progressCleanup();
      if (demoCleanup) demoCleanup();
    };
  }

  function boot() {
    const root = $('[data-root]');
    if (!root) return;

    const checkAndRun = () => {
      if (root.hasAttribute('aria-busy')) return;
      const head = $('.article-head', root) || $('.article', root);
      if (!head || head.dataset.csEnhanced === '1') return;
      head.dataset.csEnhanced = '1';
      queueMicrotask(() => {
        enhanceArticle(root, head).catch(() => {});
      });
    };

    const observer = new MutationObserver(checkAndRun);
    observer.observe(root, {attributes: true, childList: true, attributeFilter: ['aria-busy']});
    checkAndRun();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }
})();
