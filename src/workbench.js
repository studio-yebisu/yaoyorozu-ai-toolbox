/* Yaoyorozu AI ToolBox — Workbench (workbench.html).
   100% client-side. No external network calls, DOM built solely via SY.h / textContent, safeHref on all links. */
(() => {
  'use strict';

  const {$, $$, h, safeHref, isExternal, displayUrl, loadJSON, norm, announce} = window.SY;

  const SAVED_KEY = 'yaoyorozu-saved-items-v1';
  const COMPARE_KEY = 'yaoyorozu-compare-v1';
  const NOTES_KEY = 'yaoyorozu-saved-notes-v1';
  const THEME_KEY = 'yaoyorozu-theme-v1';
  const ID_RE = /^[a-z0-9][a-z0-9._-]{0,99}$/i;
  const MAX_COMPARE = 4;
  const MAX_SHARED = 24;
  const PICKER_PAGE = 24;

  const FALLBACK_PRESETS = [
    {
      id: 'preset-brief-ui-diagram',
      title: '要件整理 → UI設計 → 図解キット',
      description: '短い依頼をブリーフ化し、画面設計とMermaid図解まで一気につなぐ定番3点です。',
      items: ['agents-brief-to-demo', 'ui-ux-frontend-design', 'resource-pretty-mermaid']
    },
    {
      id: 'preset-ui-audit',
      title: 'UI点検・操作性改善キット',
      description: '既存UIの講評、アクセシビリティ監査、マイクロインタラクション仕上げを揃えます。',
      items: ['ui-ux-impeccable', 'ui-ux-web-design-guidelines', 'resource-make-interfaces-feel-better']
    },
    {
      id: 'preset-owm-media',
      title: '画像・音声 OpenWeight 制作キット',
      description: '用途特化の重み公開モデルで画像生成・音声合成・文字起こしを比較します。',
      items: ['owm-flux-3-klein', 'owm-ming-3-tts', 'owm-moss-transcribe']
    }
  ];

  const root = $('[data-wb-root]');
  if (!root) return;

  const statusEl = $('[data-wb-status]');
  const errorEl = $('[data-wb-error]');
  const retryBtn = $('[data-wb-retry]');
  const sharedBanner = $('[data-shared-banner]');
  const sharedTitle = $('[data-shared-title]');
  const sharedDesc = $('[data-shared-desc]');
  const importSharedBtn = $('[data-import-shared]');
  const exitSharedBtn = $('[data-exit-shared]');
  const kitCountEl = $('[data-kit-count]');
  const compareCountEl = $('[data-compare-count]');
  const clearKitBtn = $('[data-clear-kit]');
  const presetListEl = $('[data-preset-list]');
  const kitEmptyEl = $('[data-kit-empty]');
  const kitListEl = $('[data-kit-list]');
  const pickerTotalEl = $('[data-picker-total]');
  const pickerQ = $('[data-picker-q]');
  const pickerCat = $('[data-picker-cat]');
  const pickerListEl = $('[data-picker-list]');
  const pickerMoreBtn = $('[data-picker-more]');
  const compareSlotsEl = $('[data-compare-slots]');
  const compareSelectEl = $('[data-compare-select]');
  const compareAddBtn = $('[data-compare-add-selected]');
  const compareEmptyEl = $('[data-compare-empty]');
  const compareTableWrap = $('[data-compare-table-wrap]');
  const compareTableEl = $('[data-compare-table]');
  const clearCompareBtn = $('[data-clear-compare]');
  const copyCompareUrlBtn = $('[data-copy-compare-url]');
  const shareItemsUrlEl = $('[data-share-items-url]');
  const shareCompareUrlEl = $('[data-share-compare-url]');
  const copyItemsUrlBtn = $('[data-copy-items-url]');
  const copyCompareUrl2Btn = $('[data-copy-compare-url-2]');
  const bundleGoalEl = $('[data-bundle-goal]');
  const bundlePreviewEl = $('[data-bundle-preview]');
  const copyBundleBtn = $('[data-copy-bundle]');
  const openPromptStudioEl = $('[data-open-prompt-studio]');
  const mdPreviewEl = $('[data-md-preview]');
  const copyMdBtn = $('[data-copy-md]');
  const downloadMdBtn = $('[data-download-md]');
  const toastRegion = $('[data-wb-toast-region]');

  const state = {
    loaded: false,
    items: [],
    byId: new Map(),
    aliasToId: new Map(),
    categories: [],
    catLabels: new Map(),
    presets: [],
    savedIds: [],
    compareIds: [],
    sharedIds: null,
    sharedDropped: 0,
    urlCompareIds: null,
    notes: Object.create(null),
    activeTab: 'kit',
    pickerQuery: '',
    pickerCategory: 'all',
    pickerLimit: PICKER_PAGE,
    mdFormat: 'agents',
    bundleGoal: ''
  };

  let memoTimers = new Map();

  /* ---------- Toast & Clipboard ---------- */

  function localToast(message) {
    if (!message) return;
    announce(message);
    if (!toastRegion) return;
    const node = h('div', {class: 'wb-toast', role: 'status'}, message);
    toastRegion.append(node);
    setTimeout(() => { node.remove(); }, 3000);
  }

  function showToast(message) {
    if (window.SY && typeof window.SY.toast === 'function') {
      try {
        window.SY.toast(message);
        return;
      } catch (_) { /* Use local toast fallback. */ }
    }
    localToast(message);
  }

  if (window.SY && typeof window.SY.toast !== 'function') {
    window.SY.toast = localToast;
  }

  async function copyText(text, okMessage) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        showToast(okMessage);
        return true;
      } catch (_) { /* Fallback below. */ }
    }
    const ta = h('textarea', {class: 'sr-only', readonly: true, 'aria-hidden': 'true'});
    ta.value = text;
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
    ta.remove();
    showToast(ok ? okMessage : 'コピーできませんでした。表示された文字列を手動でコピーしてください。');
    return ok;
  }

  function downloadText(filename, content) {
    const blob = new Blob([content], {type: 'text/markdown;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = h('a', {href: url, download: filename, class: 'sr-only'});
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(filename + ' を保存しました。');
  }

  /* ---------- Theme ---------- */

  function applyTheme(choice) {
    const val = ['system', 'light', 'dark'].includes(choice) ? choice : 'system';
    if (val === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', val);
    for (const btn of $$('[data-theme-choice]')) {
      btn.setAttribute('aria-pressed', String(btn.dataset.themeChoice === val));
    }
    try { localStorage.setItem(THEME_KEY, val); } catch (_) { /* Ignore storage restrictions. */ }
  }

  function initTheme() {
    let savedTheme = 'system';
    try { savedTheme = localStorage.getItem(THEME_KEY) || 'system'; } catch (_) { savedTheme = 'system'; }
    applyTheme(savedTheme);
    for (const btn of $$('[data-theme-choice]')) {
      btn.addEventListener('click', () => applyTheme(btn.dataset.themeChoice));
    }
  }

  /* ---------- Storage ---------- */

  function readIdArray(key, maxLen) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const seen = new Set();
      const out = [];
      for (const item of parsed) {
        if (typeof item !== 'string' || !ID_RE.test(item) || seen.has(item)) continue;
        seen.add(item);
        out.push(item);
        if (out.length >= maxLen) break;
      }
      return out;
    } catch (_) {
      return [];
    }
  }

  function writeIdArray(key, ids) {
    try {
      localStorage.setItem(key, JSON.stringify(ids));
      return true;
    } catch (_) {
      showToast('ブラウザーの保存領域に書き込めませんでした。');
      return false;
    }
  }

  function readNotes() {
    const out = Object.create(null);
    try {
      const raw = localStorage.getItem(NOTES_KEY);
      if (!raw) return out;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return out;
      for (const [id, entry] of Object.entries(parsed)) {
        if (!ID_RE.test(id) || !entry || typeof entry !== 'object') continue;
        if (typeof entry.note !== 'string') continue;
        out[id] = {
          note: entry.note,
          updatedAt: Number.isFinite(entry.updatedAt) ? entry.updatedAt : Date.now()
        };
      }
    } catch (_) { /* Ignore malformed storage. */ }
    return out;
  }

  function writeNotes(notesObj) {
    try {
      const clean = {};
      for (const [id, entry] of Object.entries(notesObj)) {
        if (ID_RE.test(id) && entry && typeof entry.note === 'string' && entry.note.trim()) {
          clean[id] = {note: entry.note, updatedAt: entry.updatedAt || Date.now()};
        }
      }
      localStorage.setItem(NOTES_KEY, JSON.stringify(clean));
      return true;
    } catch (_) {
      return false;
    }
  }

  /* ---------- Data Normalization ---------- */

  function verificationInfo(entry, linkedCase) {
    if (entry.resource_type === 'open-weight-model') {
      return {label: 'OpenWeight (原典確認)', tone: 'model'};
    }
    if (linkedCase) {
      return {label: '実制作デモあり', tone: 'demo'};
    }
    const stage = String(entry.verification_stage || entry.verification || '').trim();
    if (stage === 'runtime-reviewed') return {label: '実制作デモ・実行確認', tone: 'demo'};
    if (stage === 'source-reviewed') return {label: '原典確認済み', tone: 'reviewed'};
    if (stage === 'model-source-reviewed') return {label: 'OpenWeight (原典確認)', tone: 'model'};
    if (stage === 'concept-demo') return {label: '図解・コンセプトデモ', tone: 'demo'};
    if (stage) return {label: stage, tone: 'base'};
    return {label: 'カタログ掲載', tone: 'base'};
  }

  function buildNormalizedCatalog(catalogData, categoriesData, casesData, openModelsData, curatedData) {
    const catList = [];
    const seenCats = new Set();
    const rawCats = (Array.isArray(catalogData?.categories) && catalogData.categories.length)
      ? catalogData.categories
      : (Array.isArray(categoriesData?.categories) ? categoriesData.categories : []);
    for (const c of rawCats) {
      if (!c || typeof c.id !== 'string' || seenCats.has(c.id)) continue;
      seenCats.add(c.id);
      catList.push(c);
      state.catLabels.set(c.id, c.label || c.id);
    }

    const casesById = new Map();
    const casesByCatalogId = new Map();
    for (const c of (Array.isArray(casesData?.cases) ? casesData.cases : [])) {
      if (!c || typeof c.id !== 'string') continue;
      casesById.set(c.id, c);
      if (c.catalog_entry?.id) casesByCatalogId.set(c.catalog_entry.id, c);
    }

    const modelById = new Map();
    for (const m of (Array.isArray(openModelsData?.models) ? openModelsData.models : [])) {
      if (!m || typeof m.id !== 'string') continue;
      modelById.set(m.id, m);
    }

    // Merge entries in the same priority order as scripts/catalog.py so both dist/ and src/ work identically.
    const rawById = new Map();
    const sources = [
      ...(Array.isArray(catalogData?.entries) ? catalogData.entries : []),
      ...(Array.isArray(curatedData?.entries) ? curatedData.entries : [])
    ];
    for (const entry of sources) {
      if (entry && typeof entry.id === 'string') rawById.set(entry.id, entry);
    }
    for (const m of modelById.values()) {
      const owmId = 'owm-' + m.id;
      if (!rawById.has(owmId)) {
        rawById.set(owmId, {
          id: owmId,
          name: m.name,
          summary: m.summary,
          category: m.category || 'owm-tools',
          kind: 'モデル',
          resource_type: 'open-weight-model',
          source_url: m.sources?.[0]?.url || m.weights?.url || '',
          guide_url: 'open-models.html#' + m.id,
          license: m.license?.name || '原典参照',
          license_url: m.license?.url || '',
          use_case: (m.task ? m.task + '。' : '') + (m.headline || ''),
          tags: ['OpenWeight', m.task, m.provider].filter(Boolean),
          requirements: m.requirements || '',
          verification_stage: 'model-source-reviewed'
        });
      }
    }
    for (const c of casesById.values()) {
      if (c.catalog_entry && typeof c.catalog_entry.id === 'string') {
        rawById.set(c.catalog_entry.id, c.catalog_entry);
      } else if (!rawById.has('case-' + c.id) && !rawById.has(c.id)) {
        rawById.set('case-' + c.id, {
          id: 'case-' + c.id,
          name: c.title || c.id,
          summary: c.summary || '',
          category: c.category || 'agents',
          kind: '実制作デモ',
          source_url: c.sources?.[0]?.url || '',
          guide_url: 'case.html?id=' + encodeURIComponent(c.id),
          license: '作例ページを参照',
          use_case: c.summary || '',
          tags: [c.category].filter(Boolean),
          verification_stage: 'runtime-reviewed'
        });
      }
    }

    const items = [];
    const byId = new Map();
    const aliasToId = new Map();

    for (const entry of rawById.values()) {
      const linkedCase = casesByCatalogId.get(entry.id)
        || (entry.case_id ? casesById.get(entry.case_id) : null)
        || casesById.get(entry.id.replace(/^case-/, ''))
        || null;
      const rawModelId = entry.id.startsWith('owm-') ? entry.id.slice(4) : null;
      const linkedModel = rawModelId ? modelById.get(rawModelId) : null;
      const ver = verificationInfo(entry, linkedCase);

      const hasVideo = Boolean(linkedCase?.video);
      const hasDemo = Boolean(linkedCase?.demo || entry.example_url);
      let mediaLabel = 'なし';
      if (hasVideo && hasDemo) mediaLabel = '動画・デモあり';
      else if (hasVideo) mediaLabel = '動画あり';
      else if (hasDemo) mediaLabel = 'デモ・作例あり';
      else if (linkedModel?.concept) mediaLabel = '模式図・公式作例あり';

      const detailUrl = linkedCase
        ? 'case.html?id=' + encodeURIComponent(linkedCase.id)
        : (entry.resource_type === 'open-weight-model' && safeHref(entry.guide_url))
          ? safeHref(entry.guide_url)
          : 'case.html?entry=' + encodeURIComponent(entry.id);

      const requirements = String(entry.requirements || linkedModel?.requirements || '').trim()
        || (entry.kind === 'スキル' ? '対応AIツール・指示書（SKILL.md）を読める環境' : '原典の手順書を参照');

      const record = {
        id: entry.id,
        name: String(entry.name || entry.id),
        category: String(entry.category || ''),
        categoryLabel: state.catLabels.get(entry.category) || entry.category || '未分類',
        kind: String(entry.kind || 'ツール'),
        verificationLabel: ver.label,
        verificationTone: ver.tone,
        license: String(entry.license || '原典を確認'),
        licenseUrl: safeHref(entry.license_url || ''),
        requirements,
        useCase: String(entry.use_case || entry.summary || ''),
        summary: String(entry.summary || ''),
        tags: Array.isArray(entry.tags) ? entry.tags.map(String) : [],
        mediaLabel,
        hasMedia: hasVideo || hasDemo || Boolean(linkedModel?.concept),
        sourceUrl: safeHref(entry.source_url || ''),
        detailUrl: safeHref(detailUrl) || './#catalog',
        searchText: norm([
          entry.id,
          entry.name,
          entry.summary,
          entry.use_case,
          entry.kind,
          entry.license,
          entry.requirements,
          state.catLabels.get(entry.category),
          ...(Array.isArray(entry.tags) ? entry.tags : [])
        ].join(' '))
      };

      items.push(record);
      byId.set(record.id, record);
      aliasToId.set(record.id, record.id);
      if (rawModelId && !aliasToId.has(rawModelId)) aliasToId.set(rawModelId, record.id);
      if (linkedCase) {
        if (!aliasToId.has(linkedCase.id)) aliasToId.set(linkedCase.id, record.id);
        if (!aliasToId.has('case-' + linkedCase.id)) aliasToId.set('case-' + linkedCase.id, record.id);
      }
    }

    state.categories = catList;
    state.items = items;
    state.byId = byId;
    state.aliasToId = aliasToId;
  }

  function resolveId(raw) {
    if (typeof raw !== 'string' || !ID_RE.test(raw)) return null;
    return state.aliasToId.get(raw) || null;
  }

  function resolveIdList(list, maxLen) {
    const out = [];
    const seen = new Set();
    let dropped = 0;
    for (const raw of list) {
      const canonical = resolveId(raw);
      if (!canonical) {
        dropped += 1;
        continue;
      }
      if (seen.has(canonical)) continue;
      seen.add(canonical);
      out.push(canonical);
      if (out.length >= maxLen) break;
    }
    return {ids: out, dropped};
  }

  /* ---------- Active Collections ---------- */

  function activeKitIds() {
    return state.sharedIds !== null ? state.sharedIds : state.savedIds;
  }

  function activeCompareIds() {
    return state.urlCompareIds !== null ? state.urlCompareIds : state.compareIds;
  }

  function saveKitIds(next) {
    const clean = [];
    const seen = new Set();
    for (const raw of next) {
      const id = resolveId(raw) || (ID_RE.test(raw) ? raw : null);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      clean.push(id);
    }
    if (state.sharedIds !== null) {
      state.sharedIds = clean;
    } else {
      state.savedIds = clean;
      writeIdArray(SAVED_KEY, clean);
    }
  }

  function saveCompareIds(next) {
    const clean = [];
    const seen = new Set();
    for (const raw of next) {
      const id = resolveId(raw) || (ID_RE.test(raw) ? raw : null);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      clean.push(id);
      if (clean.length >= MAX_COMPARE) break;
    }
    state.urlCompareIds = null;
    state.compareIds = clean;
    writeIdArray(COMPARE_KEY, clean);
  }

  function toggleKitItem(id) {
    const canonical = resolveId(id);
    if (!canonical) return;
    const current = activeKitIds();
    const exists = current.includes(canonical);
    const next = exists ? current.filter(x => x !== canonical) : [...current, canonical];
    saveKitIds(next);
    const item = state.byId.get(canonical);
    showToast(exists ? `「${item.name}」をキットから外しました。` : `「${item.name}」をキットに追加しました。`);
    renderAll();
  }

  function toggleCompareItem(id) {
    const canonical = resolveId(id);
    if (!canonical) return;
    const current = activeCompareIds();
    const exists = current.includes(canonical);
    if (!exists && current.length >= MAX_COMPARE) {
      showToast('並列比較は最大4件までです。不要な項目を外してから追加してください。');
      return;
    }
    const next = exists ? current.filter(x => x !== canonical) : [...current, canonical];
    saveCompareIds(next);
    const item = state.byId.get(canonical);
    showToast(exists ? `「${item.name}」を比較から外しました。` : `「${item.name}」を比較に追加しました。`);
    renderAll();
  }

  function moveKitItem(index, delta) {
    const current = [...activeKitIds()];
    const target = index + delta;
    if (target < 0 || target >= current.length) return;
    const [moved] = current.splice(index, 1);
    current.splice(target, 0, moved);
    saveKitIds(current);
    renderAll();
    const buttons = $$('[data-move-id]');
    const focusBtn = buttons.find(b => b.dataset.moveId === moved && Number(b.dataset.moveDelta) === delta);
    if (focusBtn) focusBtn.focus();
  }

  function applyPreset(preset, mode) {
    const resolved = resolveIdList(preset.items || [], MAX_SHARED).ids;
    if (!resolved.length) {
      showToast('このセットの項目がカタログに見つかりませんでした。');
      return;
    }
    if (mode === 'replace') {
      saveKitIds(resolved);
      showToast(`「${preset.title}」（${resolved.length}件）を読み込みました。`);
    } else {
      const current = activeKitIds();
      const merged = [...current];
      for (const id of resolved) {
        if (!merged.includes(id)) merged.push(id);
      }
      saveKitIds(merged);
      showToast(`「${preset.title}」をキットに追加しました。`);
    }
    renderAll();
  }

  /* ---------- Formatting Exports ---------- */

  function buildShareUrl(mode) {
    const base = new URL('workbench.html', location.href);
    const ids = mode === 'compare' ? activeCompareIds() : activeKitIds();
    if (ids.length) {
      base.searchParams.set(mode === 'compare' ? 'compare' : 'items', ids.join(','));
    }
    return base.href;
  }

  function buildMarkdown() {
    const kit = activeKitIds().map(id => state.byId.get(id)).filter(Boolean);
    if (!kit.length) {
      return '# ツールキット（未選択）\n\n「マイツールキット」で道具やOpenWeightモデルを追加すると、ここに共有用Markdownが生成されます。';
    }
    const isAgents = state.mdFormat === 'agents';
    const lines = [];
    lines.push(isAgents ? '# AI ToolKit (AGENTS / TOOLS 参照用)' : '# Yaoyorozu AI ToolBox ツールキット');
    lines.push('');
    lines.push(`- 構成件数: ${kit.length}件`);
    lines.push(`- 共有リンク: ${buildShareUrl('kit')}`);
    lines.push('');
    lines.push(isAgents ? '## 推奨スキル・ツール一覧' : '## 導入ステップ一覧');
    lines.push('');
    kit.forEach((item, idx) => {
      const memo = state.notes[item.id]?.note?.trim() || '';
      lines.push(`### Step ${idx + 1}: ${item.name} (${item.id})`);
      lines.push(`- 分野 / 種類: ${item.categoryLabel} / ${item.kind}`);
      lines.push(`- 確認状況: ${item.verificationLabel}`);
      lines.push(`- ライセンス: ${item.license}`);
      lines.push(`- 使いどころ: ${item.useCase}`);
      lines.push(`- 必要な環境: ${item.requirements}`);
      if (item.sourceUrl) lines.push(`- 原典URL: ${item.sourceUrl}`);
      if (memo) lines.push(`- 制作メモ: ${memo}`);
      lines.push('');
    });
    if (isAgents) {
      lines.push('## 利用時の共通ルール');
      lines.push('- 着手前に各原典URLの `SKILL.md` / README / ライセンス原文を確認する。');
      lines.push('- 未提供の数値・日時・実績を補わず、仮定条件を明示して進める。');
    }
    return lines.join('\n');
  }

  function buildPromptBundle() {
    const kit = activeKitIds().map(id => state.byId.get(id)).filter(Boolean);
    const goal = state.bundleGoal.trim() || '【ここに達成したい目的を1行で入力】';
    if (!kit.length) {
      return `目的: ${goal}\n\n※ 先に「マイツールキット」から1件以上の道具を追加すると、各ステップの原典URL・ライセンス・メモ付き依頼文が生成されます。`;
    }
    const lines = [
      '以下のツールキットを順番に参照し、目的を達成してください。',
      '',
      `## 目的`,
      goal,
      '',
      '## 使用する道具（順番どおり）'
    ];
    kit.forEach((item, idx) => {
      const memo = state.notes[item.id]?.note?.trim() || '';
      lines.push(`${idx + 1}. **${item.name}**（${item.kind} / ${item.categoryLabel}）`);
      lines.push(`   - 用途: ${item.useCase}`);
      lines.push(`   - ライセンス: ${item.license}`);
      if (item.sourceUrl) lines.push(`   - 原典: ${item.sourceUrl}`);
      if (memo) lines.push(`   - 補足メモ: ${memo}`);
    });
    lines.push('');
    lines.push('## 進め方の約束');
    lines.push('- 最初に各原典の指示書とライセンス条件を確認してから作業する。');
    lines.push('- こちらから渡していない数値・事実・実績は作らず、仮定が必要な点は明記する。');
    lines.push('- 最後に変更した内容と確認結果を報告する。');
    return lines.join('\n');
  }

  /* ---------- Rendering ---------- */

  function badgeNode(item) {
    const cls = item.verificationTone === 'demo'
      ? 'wb-badge wb-badge-demo'
      : item.verificationTone === 'model'
        ? 'wb-badge wb-badge-model'
        : 'wb-badge';
    return h('span', {class: cls}, item.verificationLabel);
  }

  function renderBanner() {
    if (state.sharedIds === null) {
      sharedBanner.hidden = true;
      return;
    }
    sharedBanner.hidden = false;
    const count = state.sharedIds.length;
    sharedTitle.textContent = `共有されたツールキット（${count}件）を表示しています`;
    sharedDesc.textContent = state.sharedDropped > 0
      ? `URL内の${state.sharedDropped}件は現在のカタログに見つからなかったため除外しました。下のボタンで自分の保存リストへ取り込めます。`
      : '共有リンクから開いた一時表示です。手元の「あとで試す」へまとめて取り込んで編集できます。';
  }

  function renderTabs() {
    const kitCount = activeKitIds().length;
    const cmpCount = activeCompareIds().length;
    kitCountEl.textContent = String(kitCount);
    compareCountEl.textContent = `${cmpCount}/${MAX_COMPARE}`;

    for (const tab of $$('[data-tab]')) {
      const active = tab.dataset.tab === state.activeTab;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    }
    for (const panel of $$('[data-panel]')) {
      panel.hidden = panel.dataset.panel !== state.activeTab;
    }

    const scopeNote = state.sharedIds !== null ? '共有表示中' : 'ローカル保存';
    statusEl.textContent = `全${state.items.length}件対応 ・ キット${kitCount}件 ・ 比較${cmpCount}/${MAX_COMPARE}件（${scopeNote}）`;
  }

  function renderPresets() {
    const cards = state.presets.map(preset => {
      const resolvedItems = resolveIdList(preset.items || [], MAX_SHARED).ids
        .map(id => state.byId.get(id))
        .filter(Boolean);
      return h('div', {class: 'wb-preset-card'},
        h('p', {class: 'wb-preset-title'}, preset.title),
        h('p', {class: 'wb-preset-desc'}, preset.description || ''),
        h('div', {class: 'wb-preset-items'},
          ...resolvedItems.map(item => h('span', {}, item.name))),
        h('div', {class: 'wb-preset-actions'},
          h('button', {
            type: 'button',
            class: 'wb-btn-sm',
            onclick: () => applyPreset(preset, 'merge')
          }, 'キットに追加'),
          h('button', {
            type: 'button',
            class: 'wb-btn-sm',
            onclick: () => applyPreset(preset, 'replace')
          }, 'これに入れ替え'))
      );
    });
    presetListEl.replaceChildren(...cards);
  }

  function renderKit() {
    const ids = activeKitIds();
    const compareSet = new Set(activeCompareIds());
    const validIds = ids.filter(id => state.byId.has(id));
    clearKitBtn.hidden = validIds.length === 0;
    kitEmptyEl.hidden = validIds.length > 0;

    const rows = validIds.map((id, index) => {
      const item = state.byId.get(id);
      const inCompare = compareSet.has(id);
      const memoEntry = state.notes[id];
      const memoText = memoEntry ? memoEntry.note : '';
      const savedStamp = memoEntry?.updatedAt
        ? '保存済み ' + new Date(memoEntry.updatedAt).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'})
        : '未記入';

      const memoStatusEl = h('span', {class: 'wb-memo-saved'}, savedStamp);
      const textareaId = 'wb-memo-' + id;
      const textarea = h('textarea', {
        id: textareaId,
        class: 'wb-textarea',
        rows: '2',
        placeholder: '例：最初に要件を整理するときに使う / ○○画面の点検を担当',
        oninput: event => {
          const val = event.target.value;
          const now = Date.now();
          state.notes[id] = {note: val, updatedAt: now};
          memoStatusEl.textContent = '保存中…';
          clearTimeout(memoTimers.get(id));
          memoTimers.set(id, setTimeout(() => {
            writeNotes(state.notes);
            memoStatusEl.textContent = val.trim()
              ? '保存済み ' + new Date(now).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'})
              : '未記入';
            renderExports();
          }, 250));
        },
        onblur: event => {
          clearTimeout(memoTimers.get(id));
          const val = event.target.value;
          const now = Date.now();
          state.notes[id] = {note: val, updatedAt: now};
          writeNotes(state.notes);
          memoStatusEl.textContent = val.trim()
            ? '保存済み ' + new Date(now).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'})
            : '未記入';
          renderExports();
        }
      });
      textarea.value = memoText;

      return h('li', {class: 'wb-step-card'},
        h('div', {class: 'wb-step-head'},
          h('span', {class: 'wb-step-badge'}, `Step ${index + 1}`),
          h('div', {class: 'wb-badges'},
            h('span', {class: 'wb-badge'}, item.categoryLabel),
            h('span', {class: 'wb-badge'}, item.kind),
            badgeNode(item),
            h('span', {class: 'wb-badge'}, item.license)
          )
        ),
        h('h3', {class: 'wb-step-title'},
          h('a', {href: item.detailUrl}, item.name)
        ),
        h('p', {class: 'wb-step-summary'}, item.summary),
        h('p', {class: 'wb-step-use'}, '使いどころ：' + item.useCase),
        h('div', {class: 'wb-step-controls'},
          h('button', {
            type: 'button',
            class: 'wb-btn-sm',
            disabled: index === 0,
            'data-move-id': id,
            'data-move-delta': '-1',
            'aria-label': `${item.name}を1つ上へ移動`,
            onclick: () => moveKitItem(index, -1)
          }, '↑ 上へ'),
          h('button', {
            type: 'button',
            class: 'wb-btn-sm',
            disabled: index === validIds.length - 1,
            'data-move-id': id,
            'data-move-delta': '1',
            'aria-label': `${item.name}を1つ下へ移動`,
            onclick: () => moveKitItem(index, 1)
          }, '↓ 下へ'),
          h('button', {
            type: 'button',
            class: 'wb-btn-sm',
            'aria-pressed': String(inCompare),
            onclick: () => toggleCompareItem(id)
          }, inCompare ? '比較中 ✓' : '比較に入れる'),
          h('a', {
            class: 'wb-btn-sm',
            href: 'prompt-studio.html?tool=' + encodeURIComponent(id)
          }, 'ブリーフを作成'),
          h('button', {
            type: 'button',
            class: 'wb-btn-sm wb-btn-danger',
            'aria-label': `${item.name}をキットから外す`,
            onclick: () => toggleKitItem(id)
          }, '外す')
        ),
        h('div', {class: 'wb-memo-block'},
          h('div', {class: 'wb-memo-head'},
            h('label', {class: 'wb-field-label', for: textareaId}, `この道具の使い方メモ（Step ${index + 1}）`),
            memoStatusEl
          ),
          textarea
        )
      );
    });
    kitListEl.replaceChildren(...rows);
  }

  function populateCategorySelects() {
    const opts = [h('option', {value: 'all'}, `すべての分野（${state.items.length}件）`)];
    const counts = new Map();
    for (const item of state.items) {
      counts.set(item.category, (counts.get(item.category) || 0) + 1);
    }
    for (const c of state.categories) {
      const cnt = counts.get(c.id) || 0;
      if (cnt > 0) opts.push(h('option', {value: c.id}, `${c.label}（${cnt}）`));
    }
    pickerCat.replaceChildren(...opts);
    pickerCat.value = state.pickerCategory;

    const cmpOpts = [h('option', {value: ''}, '追加する道具・モデルを選ぶ…')];
    for (const item of state.items) {
      cmpOpts.push(h('option', {value: item.id}, `[${item.categoryLabel}] ${item.name}`));
    }
    compareSelectEl.replaceChildren(...cmpOpts);
  }

  function renderPicker() {
    const terms = norm(state.pickerQuery).split(/\s+/).filter(Boolean);
    const filtered = state.items.filter(item => {
      if (state.pickerCategory !== 'all' && item.category !== state.pickerCategory) return false;
      return terms.every(t => item.searchText.includes(t));
    });

    const kitSet = new Set(activeKitIds());
    const cmpSet = new Set(activeCompareIds());
    const shown = filtered.slice(0, state.pickerLimit);
    pickerTotalEl.textContent = `${filtered.length}件該当 / 全${state.items.length}件`;

    const nodes = shown.map(item => {
      const inKit = kitSet.has(item.id);
      const inCmp = cmpSet.has(item.id);
      return h('li', {class: 'wb-pick-row'},
        h('div', {class: 'wb-badges'},
          h('span', {class: 'wb-badge'}, item.categoryLabel),
          badgeNode(item),
          h('span', {class: 'wb-badge'}, item.license)
        ),
        h('p', {class: 'wb-pick-name'}, item.name),
        h('p', {class: 'wb-pick-summary'}, item.useCase || item.summary),
        h('div', {class: 'wb-pick-actions'},
          h('button', {
            type: 'button',
            class: 'wb-btn-sm',
            'aria-pressed': String(inKit),
            onclick: () => toggleKitItem(item.id)
          }, inKit ? 'キット済み ✓' : '+ キットに追加'),
          h('button', {
            type: 'button',
            class: 'wb-btn-sm',
            'aria-pressed': String(inCmp),
            disabled: !inCmp && cmpSet.size >= MAX_COMPARE,
            onclick: () => toggleCompareItem(item.id)
          }, inCmp ? '比較中 ✓' : '比較')
        )
      );
    });

    if (!nodes.length) {
      nodes.push(h('li', {class: 'wb-pick-row'}, h('p', {class: 'wb-pick-summary'}, '条件に一致する道具がありません。')));
    }
    pickerListEl.replaceChildren(...nodes);
    pickerMoreBtn.hidden = filtered.length <= state.pickerLimit;
    if (!pickerMoreBtn.hidden) {
      pickerMoreBtn.textContent = `さらに表示する（残り${filtered.length - state.pickerLimit}件）`;
    }
  }

  function renderCompare() {
    const compareItems = activeCompareIds()
      .map(id => state.byId.get(id))
      .filter(Boolean);

    const pills = compareItems.map(item =>
      h('span', {class: 'wb-slot-pill'},
        item.name,
        h('button', {
          type: 'button',
          class: 'wb-slot-remove',
          'aria-label': `${item.name}を比較から外す`,
          onclick: () => toggleCompareItem(item.id)
        }, '×')
      )
    );
    compareSlotsEl.replaceChildren(...pills);

    compareEmptyEl.hidden = compareItems.length > 0;
    compareTableWrap.hidden = compareItems.length === 0;
    clearCompareBtn.disabled = compareItems.length === 0;
    copyCompareUrlBtn.disabled = compareItems.length === 0;

    if (!compareItems.length) {
      compareTableEl.replaceChildren();
      return;
    }

    const headRow = h('tr', {},
      h('th', {scope: 'col'}, '比較項目'),
      ...compareItems.map(item =>
        h('th', {scope: 'col'},
          h('div', {class: 'wb-compare-col-head'},
            h('a', {class: 'wb-compare-col-title', href: item.detailUrl}, item.name),
            h('span', {class: 'wb-compare-col-id'}, item.id)
          )
        )
      )
    );

    const specs = [
      {label: '分野', render: item => item.categoryLabel},
      {label: '種類', render: item => item.kind},
      {label: '確認状況', render: item => badgeNode(item)},
      {
        label: 'ライセンス',
        render: item => item.licenseUrl
          ? h('a', {href: item.licenseUrl, target: '_blank', rel: 'noopener noreferrer'}, item.license + ' ↗')
          : item.license
      },
      {label: '必要な環境', render: item => item.requirements},
      {label: '使いどころ', render: item => item.useCase},
      {
        label: 'タグ',
        render: item => item.tags.length
          ? h('ul', {class: 'tags'}, ...item.tags.slice(0, 6).map(t => h('li', {}, t)))
          : '—'
      },
      {label: 'デモ・動画の有無', render: item => item.mediaLabel},
      {
        label: '原典リンク',
        render: item => item.sourceUrl
          ? h('a', {
              href: item.sourceUrl,
              target: isExternal(item.sourceUrl) ? '_blank' : null,
              rel: isExternal(item.sourceUrl) ? 'noopener noreferrer' : null
            }, displayUrl(item.sourceUrl) + (isExternal(item.sourceUrl) ? ' ↗' : ''))
          : '—'
      }
    ];

    const bodyRows = specs.map(row =>
      h('tr', {},
        h('th', {scope: 'row'}, row.label),
        ...compareItems.map(item => h('td', {}, row.render(item)))
      )
    );

    compareTableEl.replaceChildren(
      h('thead', {}, headRow),
      h('tbody', {}, ...bodyRows)
    );
  }

  function renderExports() {
    shareItemsUrlEl.value = buildShareUrl('kit');
    shareCompareUrlEl.value = buildShareUrl('compare');
    bundlePreviewEl.textContent = buildPromptBundle();
    mdPreviewEl.textContent = buildMarkdown();

    for (const btn of $$('[data-md-format]')) {
      btn.setAttribute('aria-pressed', String(btn.dataset.mdFormat === state.mdFormat));
    }

    const firstId = activeKitIds().find(id => state.byId.has(id));
    openPromptStudioEl.href = firstId
      ? 'prompt-studio.html?tool=' + encodeURIComponent(firstId)
      : 'prompt-studio.html';
  }

  function renderAll() {
    if (!state.loaded) return;
    renderBanner();
    renderTabs();
    renderKit();
    renderPicker();
    renderCompare();
    renderExports();
  }

  /* ---------- Tab & Event Wiring ---------- */

  function switchTab(tabName) {
    if (!['kit', 'compare', 'export'].includes(tabName)) return;
    state.activeTab = tabName;
    renderTabs();
  }

  function bindEvents() {
    const tabs = $$('[data-tab]');
    tabs.forEach((tab, idx) => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
      tab.addEventListener('keydown', event => {
        let nextIdx = null;
        if (event.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') nextIdx = 0;
        else if (event.key === 'End') nextIdx = tabs.length - 1;
        if (nextIdx !== null) {
          event.preventDefault();
          tabs[nextIdx].focus();
          switchTab(tabs[nextIdx].dataset.tab);
        }
      });
    });

    pickerQ.addEventListener('input', () => {
      state.pickerQuery = pickerQ.value;
      state.pickerLimit = PICKER_PAGE;
      renderPicker();
    });

    pickerCat.addEventListener('change', () => {
      state.pickerCategory = pickerCat.value;
      state.pickerLimit = PICKER_PAGE;
      renderPicker();
    });

    pickerMoreBtn.addEventListener('click', () => {
      state.pickerLimit += PICKER_PAGE;
      renderPicker();
    });

    clearKitBtn.addEventListener('click', () => {
      saveKitIds([]);
      showToast('キットを空にしました。');
      renderAll();
    });

    compareAddBtn.addEventListener('click', () => {
      const id = compareSelectEl.value;
      if (!id) {
        showToast('追加する道具を選択してください。');
        return;
      }
      if (activeCompareIds().includes(id)) {
        showToast('その項目はすでに比較に入っています。');
        return;
      }
      toggleCompareItem(id);
    });

    clearCompareBtn.addEventListener('click', () => {
      saveCompareIds([]);
      showToast('比較リストをクリアしました。');
      renderAll();
    });

    const handleCopyCompareUrl = () => copyText(buildShareUrl('compare'), '比較共有URLをコピーしました。');
    copyCompareUrlBtn.addEventListener('click', handleCopyCompareUrl);
    copyCompareUrl2Btn.addEventListener('click', handleCopyCompareUrl);
    copyItemsUrlBtn.addEventListener('click', () => copyText(buildShareUrl('kit'), 'ツールキット共有URLをコピーしました。'));

    bundleGoalEl.addEventListener('input', () => {
      state.bundleGoal = bundleGoalEl.value;
      bundlePreviewEl.textContent = buildPromptBundle();
    });

    copyBundleBtn.addEventListener('click', () => copyText(buildPromptBundle(), 'まとめ依頼文をコピーしました。'));

    for (const btn of $$('[data-md-format]')) {
      btn.addEventListener('click', () => {
        state.mdFormat = btn.dataset.mdFormat;
        renderExports();
      });
    }

    copyMdBtn.addEventListener('click', () => copyText(buildMarkdown(), 'Markdownをコピーしました。'));
    downloadMdBtn.addEventListener('click', () => downloadText('toolkit.md', buildMarkdown()));

    importSharedBtn.addEventListener('click', () => {
      if (!state.sharedIds) return;
      const merged = [...state.savedIds];
      let added = 0;
      for (const id of state.sharedIds) {
        if (!merged.includes(id)) {
          merged.push(id);
          added += 1;
        }
      }
      state.savedIds = merged;
      writeIdArray(SAVED_KEY, merged);
      state.sharedIds = null;
      state.sharedDropped = 0;
      const url = new URL(location.href);
      url.searchParams.delete('items');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
      showToast(`自分の「あとで試す」に${added}件取り込みました。`);
      renderAll();
    });

    exitSharedBtn.addEventListener('click', () => {
      state.sharedIds = null;
      state.sharedDropped = 0;
      const url = new URL(location.href);
      url.searchParams.delete('items');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
      showToast('自分の保存リストを表示しました。');
      renderAll();
    });

    window.addEventListener('storage', event => {
      if (event.key === SAVED_KEY || event.key === null) {
        state.savedIds = readIdArray(SAVED_KEY, 2000);
      }
      if (event.key === COMPARE_KEY || event.key === null) {
        if (state.urlCompareIds === null) state.compareIds = readIdArray(COMPARE_KEY, MAX_COMPARE);
      }
      if (event.key === NOTES_KEY || event.key === null) {
        state.notes = readNotes();
      }
      renderAll();
    });

    window.addEventListener('sy:savedchange', () => {
      state.savedIds = readIdArray(SAVED_KEY, 2000);
      renderAll();
    });

    if (retryBtn) retryBtn.addEventListener('click', loadAll);
  }

  /* ---------- Bootstrap ---------- */

  async function optionalJSON(url) {
    try { return await loadJSON(url); } catch (_) { return null; }
  }

  async function loadAll() {
    errorEl.hidden = true;
    statusEl.textContent = 'カタログを読み込んでいます…';
    try {
      const [catalogData, categoriesData, casesData, openModelsData, curatedData, recipesData] = await Promise.all([
        loadJSON('data/catalog.json'),
        optionalJSON('data/categories.json'),
        optionalJSON('data/cases.json'),
        optionalJSON('data/open-models.json'),
        optionalJSON('data/curated-resources.json'),
        optionalJSON('data/recipes.json')
      ]);

      buildNormalizedCatalog(catalogData, categoriesData, casesData, openModelsData, curatedData);

      const recipePresets = Array.isArray(recipesData?.recipes)
        ? recipesData.recipes.map(r => {
            const stepItems = Array.isArray(r.steps)
              ? [...r.steps].sort((a, b) => (a.order || 0) - (b.order || 0)).map(s => s.item_id).filter(Boolean)
              : [];
            const fallbackItems = Array.isArray(r.items) ? r.items : [];
            return {
              id: String(r.id || 'recipe'),
              title: String(r.title || r.name || 'レシピ'),
              description: String(r.description || r.summary || ''),
              items: stepItems.length ? stepItems : fallbackItems
            };
          })
        : [];
      state.presets = [...recipePresets, ...FALLBACK_PRESETS];

      state.savedIds = readIdArray(SAVED_KEY, 2000);
      state.compareIds = readIdArray(COMPARE_KEY, MAX_COMPARE);
      state.notes = readNotes();

      const params = new URLSearchParams(location.search);
      const rawItems = params.get('items');
      if (rawItems !== null) {
        const parsed = rawItems.split(',').map(s => s.trim()).filter(Boolean).slice(0, MAX_SHARED);
        const {ids, dropped} = resolveIdList(parsed, MAX_SHARED);
        state.sharedIds = ids;
        state.sharedDropped = dropped;
      }

      const rawCompare = params.get('compare');
      if (rawCompare !== null) {
        const parsed = rawCompare.split(',').map(s => s.trim()).filter(Boolean).slice(0, MAX_COMPARE);
        const {ids} = resolveIdList(parsed, MAX_COMPARE);
        if (ids.length) {
          state.urlCompareIds = ids;
          state.activeTab = 'compare';
        }
      }

      state.loaded = true;
      populateCategorySelects();
      renderPresets();
      renderAll();
    } catch (_) {
      errorEl.hidden = false;
      statusEl.textContent = '読み込みに失敗しました。';
    }
  }

  initTheme();
  bindEvents();
  loadAll();
})();
