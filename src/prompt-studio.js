/* Yaoyorozu AI ToolBox — Prompt Studio (prompt-studio.html).
   100% client-side brief-to-demo 11-field generator. Zero external network calls. */
(() => {
  'use strict';

  const {$, $$, h, safeHref, isExternal, displayUrl, loadJSON, norm, announce} = window.SY;

  const DRAFT_KEY = 'yaoyorozu-brief-draft-v1';
  const SAVED_KEY = 'yaoyorozu-saved-items-v1';
  const THEME_KEY = 'yaoyorozu-theme-v1';
  const ID_RE = /^[a-z0-9][a-z0-9._-]{0,99}$/i;
  const MAX_REFS = 5;

  const SCHEMA_FIELDS = [
    ['request', '依頼'],
    ['category', '分野'],
    ['goal', '目的'],
    ['audience', '対象'],
    ['inputs', '素材'],
    ['assumptions', '仮定'],
    ['open_questions', '未確定'],
    ['skill_refs', '道具'],
    ['deliverables', '成果物'],
    ['acceptance', '完成条件'],
    ['next_step', '最初の一歩']
  ];

  const EXAMPLES = [
    {
      id: 'ex-ui',
      label: 'UI改善',
      summary: 'スマホ受付・フォームの操作性とエラー案内',
      category: 'ui-ux',
      preferredTools: ['ui-ux-frontend-design', 'ui-ux-impeccable', 'ui-ux-web-design-guidelines'],
      brief: {
        request: '地域のイベント受付を、スマホでも迷わず使える画面にしたい',
        goal: '初めて参加する人が360px幅のスマホで迷わず申し込みを完了できるようにする',
        audience: '地域イベントに申し込む近隣住民（スマホ操作に慣れていない人も含む）',
        inputs: [
          'イベント名・開催日時・会場・定員（主催者から受取予定）',
          '受付フォームで聞く項目一覧（氏名・連絡先・参加人数）'
        ],
        assumptions: [
          '受付画面は参加者が自分のスマホから申し込む用途として扱う',
          'イベント日時・会場名は未提供のため、仮値と分かる表記にする',
          '送信先サーバーは未定のため、ブラウザー内の完了画面表示までとする'
        ],
        open_questions: [
          '連絡先はメールアドレスと電話番号のどちらを必須にするか？',
          '定員に達したあとのキャンセル待ち表示は必要か？'
        ],
        deliverables: [
          '360px〜1440px対応の受付画面HTML・CSS・JavaScript一式',
          '入力・確認・完了の3ステップ画面と項目単位のエラー表示'
        ],
        acceptance: [
          '320px〜1440px幅で横スクロールせずに完結する',
          '必須項目が未入力のとき、対象欄のすぐ近くに入力例付きで修正方法が出る',
          'すべてのボタン・入力欄のタッチ領域が44px以上ある',
          'キーボードだけで全項目の入力と送信ができ、フォーカス位置が見える'
        ],
        next_step: 'open_questions の2点を主催者に確認し、skill_refs の SKILL.md を読んで画面設計に着手する'
      }
    },
    {
      id: 'ex-slides',
      label: 'スライド構成',
      summary: '5枚で伝えるサービス・イベント案内PPTX',
      category: 'slides',
      preferredTools: ['slides-likaku-mck-ppt-design-skill', 'slides-zarazhangrui-frontend-slides'],
      brief: {
        request: '小さな書店の読書会を紹介する、5枚の日本語スライドを作りたい',
        goal: '来店客が5枚を見るだけで、読書会の内容と参加方法を把握できるようにする',
        audience: '書店に来るお客さんや、読書会に興味がある近所の人',
        inputs: [
          '読書会の名称・開催頻度・次回日時・課題本（書店から受取予定）',
          '参加費の有無・定員・申し込み窓口'
        ],
        assumptions: [
          '店頭モニターとSNS共有の両方で使うため16:9比率にする',
          '書店から受け取っていない日時・人数・感想は作らず空欄で示す'
        ],
        open_questions: [
          '店内写真や過去の開催写真で掲載許可済みの素材はあるか？',
          '申し込み方法は店頭受付とフォームのどちらを案内するか？'
        ],
        deliverables: [
          '編集可能な5枚の日本語PPTXファイル',
          '文字はみ出し確認用の書き出しPDFまたは画像'
        ],
        acceptance: [
          'ちょうど5枚構成で、PPTXファイルを実際に開いて編集できる',
          '5枚目だけを見ても申し込み先と次回案内欄がすぐ分かる',
          '受け取っていない日時・実績・感想を創作していない'
        ],
        next_step: '書店から一次情報と許可済み写真を受け取り、5枚のページ割りを確定してから原典エンジンで組み立てる'
      }
    },
    {
      id: 'ex-motion',
      label: '解説モーション',
      summary: '3つの変更点を伝える20秒無音モーション',
      category: 'motion',
      preferredTools: ['motion-remotion-skills', 'motion-motion-graphics-skills', 'motion-anatomy'],
      brief: {
        request: '新機能の3つの変更点を、20秒の文字と図形の動画で伝えたい',
        goal: '音なしで見ても、3つの変更点の名前と要点を1つずつ読み取れるようにする',
        audience: 'その製品をすでに使っているユーザー',
        inputs: [
          '3つの変更点の名称と一文の説明（公式リリースノートより）',
          '製品名・ロゴと利用条件'
        ],
        assumptions: [
          'SNS・記事埋め込み前提で、無音の1280×720（16:9）・30fpsで制作する',
          '実画面キャプチャが未提供の部分は、実在画面に見せかけず抽象図形で示す'
        ],
        open_questions: [
          '3つの変更点のうち最優先で強調したい機能はどれか？',
          '縦型（9:16）版の書き出しも別途必要か？'
        ],
        deliverables: [
          '20秒・1280×720・30fpsの無音MP4動画',
          '編集可能なソース一式と代表フレーム画像'
        ],
        acceptance: [
          'ちょうど20秒のMP4が最後まで途切れず再生できる',
          '3つの変更点がそれぞれ4秒以上静止して読める時間がある',
          '720p再生で文字が潰れず、文言が一次資料と一致している'
        ],
        next_step: 'リリースノートから3つの一文を確定し、0〜20秒の場面割りを決めてから制作に着手する'
      }
    }
  ];

  const COMMON_CHIPS = [
    '320px〜1440px幅で横スクロールしない',
    '操作部品のタッチ領域が44px以上',
    '未提供の数値・日時・実績を勝手に作らない'
  ];

  const CATEGORY_CHIPS = {
    'ui-ux': [
      'キーボード操作だけで全手順を完了でき、フォーカスが見える',
      '入力エラー時は対象項目の近くに修正方法が表示される',
      'ライト／ダーク両方と動きを減らす設定（reduced-motion）に対応する'
    ],
    'slides': [
      '指定枚数どおりで、PPTX/資料を開いて文字が枠からはみ出さない',
      '最後のページだけを見ても次の行動（連絡先・申込先）が分かる',
      '使用した写真・図版の出典と利用許可が確認済みである'
    ],
    'motion': [
      '指定秒数・解像度・フレームレートで最後まで正常に再生できる',
      '各見出しと説明文が静止して読み切れる時間（4秒以上）ある',
      '音声なし・reduced-motion配慮でも内容の要点が伝わる'
    ],
    'graphics': [
      '図内の文字が重ならず、スマホ幅でも見切れず拡大して読める',
      '要素の色・線が背景に対して十分なコントラストを持つ'
    ],
    'agents': [
      '作業前に skill_refs の SKILL.md とライセンス条件を確認した記録を残す',
      '推測した条件は assumptions に分け、確認事項を open_questions に残す'
    ],
    'development': [
      '変更後のテスト・構文チェックを実行し、失敗や省略がない結果を残す',
      '既存ファイルや公開境界へ不要な副作用を与えていない'
    ],
    'owm-tools': [
      '利用する重みのライセンス条件（商用可否・帰属表示）を満たしている',
      '必要なGPU・推論手順と入出力形式を事前に明記している'
    ],
    'documents': [
      '出力ファイルを開いて文字化け・改ページ崩れがないことを確認する',
      '個人情報や機密情報が不要に含まれていない'
    ]
  };

  const root = $('[data-ps-root]');
  if (!root) return;

  const errorEl = $('[data-ps-error]');
  const retryBtn = $('[data-ps-retry]');
  const contextBanner = $('[data-context-banner]');
  const contextMsg = $('[data-context-msg]');
  const dismissContextBtn = $('[data-dismiss-context]');
  const draftStatusEl = $('[data-draft-status]');
  const saveDraftBtn = $('[data-save-draft]');
  const loadDraftBtn = $('[data-load-draft]');
  const clearDraftBtn = $('[data-clear-draft]');
  const templateRow = $('[data-template-row]');
  const categorySelect = $('#ps-category');
  const catHintEl = $('[data-cat-hint]');
  const requestEl = $('#ps-request');
  const refCountEl = $('[data-ref-count]');
  const refEmptyEl = $('[data-ref-empty]');
  const refListEl = $('[data-ref-list]');
  const importSavedBtn = $('[data-import-saved-tools]');
  const filterCatBtn = $('[data-filter-cat-only]');
  const toolQEl = $('[data-tool-q]');
  const toolStatusEl = $('[data-tool-status]');
  const toolCandidatesEl = $('[data-tool-candidates]');
  const goalEl = $('#ps-goal');
  const audienceEl = $('#ps-audience');
  const inputsEl = $('#ps-inputs');
  const deliverablesEl = $('#ps-deliverables');
  const assumptionsEl = $('#ps-assumptions');
  const openQuestionsEl = $('#ps-open-questions');
  const acceptChipsEl = $('[data-accept-chips]');
  const acceptanceEl = $('#ps-acceptance');
  const nextStepEl = $('#ps-next-step');
  const schemaPillsEl = $('[data-schema-pills]');
  const promptPreviewEl = $('[data-prompt-preview]');
  const jsonPreviewEl = $('[data-json-preview]');
  const copyPromptBtn = $('[data-copy-prompt]');
  const copyJsonBtn = $('[data-copy-json]');
  const downloadJsonBtn = $('[data-download-json]');
  const toastRegion = $('[data-ps-toast-region]');

  const state = {
    loaded: false,
    categories: [],
    catById: new Map(),
    items: [],
    byId: new Map(),
    aliasToId: new Map(),
    savedWorkbenchIds: [],
    prioritizeCategory: true,
    showSavedOnly: false,
    toolQuery: '',
    outTab: 'prompt',
    brief: emptyBrief()
  };

  let draftTimer = 0;

  function emptyBrief() {
    return {
      request: '',
      category: 'ui-ux',
      goal: '',
      audience: '',
      inputs: [],
      assumptions: [],
      open_questions: [],
      skill_refs: [],
      deliverables: [],
      acceptance: [],
      next_step: ''
    };
  }

  /* ---------- Toast & Clipboard ---------- */

  function localToast(message) {
    if (!message) return;
    announce(message);
    if (!toastRegion) return;
    const node = h('div', {class: 'ps-toast', role: 'status'}, message);
    toastRegion.append(node);
    setTimeout(() => node.remove(), 3000);
  }

  function showToast(message) {
    if (window.SY && typeof window.SY.toast === 'function') {
      try { window.SY.toast(message); return; } catch (_) { /* Fallback below. */ }
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
    showToast(ok ? okMessage : 'コピーできませんでした。プレビューから選択してコピーしてください。');
    return ok;
  }

  function downloadJson(filename, content) {
    const blob = new Blob([content], {type: 'application/json;charset=utf-8'});
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
    try { localStorage.setItem(THEME_KEY, val); } catch (_) { /* Ignore. */ }
  }

  function initTheme() {
    let saved = 'system';
    try { saved = localStorage.getItem(THEME_KEY) || 'system'; } catch (_) { saved = 'system'; }
    applyTheme(saved);
    for (const btn of $$('[data-theme-choice]')) {
      btn.addEventListener('click', () => applyTheme(btn.dataset.themeChoice));
    }
  }

  /* ---------- Helpers ---------- */

  const linesToArray = text => String(text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const arrayToLines = arr => (Array.isArray(arr) ? arr.join('\n') : '');

  function hasStoredDraft() {
    try { return Boolean(localStorage.getItem(DRAFT_KEY)); } catch (_) { return false; }
  }

  function readDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      const b = emptyBrief();
      b.request = typeof parsed.request === 'string' ? parsed.request : '';
      b.category = typeof parsed.category === 'string' && parsed.category ? parsed.category : 'ui-ux';
      b.goal = typeof parsed.goal === 'string' ? parsed.goal : '';
      b.audience = typeof parsed.audience === 'string' ? parsed.audience : '';
      b.next_step = typeof parsed.next_step === 'string' ? parsed.next_step : '';
      for (const k of ['inputs', 'assumptions', 'open_questions', 'deliverables', 'acceptance']) {
        if (Array.isArray(parsed[k])) b[k] = parsed[k].map(String).filter(Boolean);
      }
      if (Array.isArray(parsed.skill_refs)) {
        b.skill_refs = parsed.skill_refs.slice(0, MAX_REFS).filter(r => r && typeof r === 'object' && ID_RE.test(r.id || '')).map(r => ({
          id: String(r.id),
          name: String(r.name || r.id),
          source_url: safeHref(r.source_url || '') || '',
          license: String(r.license || '原典確認')
        }));
      }
      return b;
    } catch (_) {
      return null;
    }
  }

  function saveDraft(explicit = false) {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(state.brief));
      const stamp = new Date().toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'});
      draftStatusEl.textContent = `下書き保存済み（${stamp}）`;
      loadDraftBtn.hidden = true;
      if (explicit) showToast('下書きをブラウザーに保存しました。');
      return true;
    } catch (_) {
      draftStatusEl.textContent = '下書きを保存できませんでした';
      if (explicit) showToast('ブラウザーの保存機能が無効のため保存できませんでした。');
      return false;
    }
  }

  function scheduleDraftSave() {
    draftStatusEl.textContent = '編集中…';
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => saveDraft(false), 450);
  }

  function readWorkbenchSavedIds() {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter(x => typeof x === 'string' && ID_RE.test(x)) : [];
    } catch (_) {
      return [];
    }
  }

  /* ---------- Catalog Normalization ---------- */

  function verificationInfo(entry, linkedCase) {
    if (entry.resource_type === 'open-weight-model') return {label: 'OpenWeight (原典確認)', tone: 'model'};
    if (linkedCase) return {label: '実制作デモあり', tone: 'demo'};
    const stage = String(entry.verification_stage || entry.verification || '').trim();
    if (stage === 'runtime-reviewed') return {label: '実制作デモ', tone: 'demo'};
    if (stage === 'source-reviewed') return {label: '原典確認済み', tone: 'reviewed'};
    if (stage === 'model-source-reviewed') return {label: 'OpenWeight (原典確認)', tone: 'model'};
    if (stage === 'concept-demo') return {label: '図解デモ', tone: 'demo'};
    return {label: stage || 'カタログ掲載', tone: 'base'};
  }

  function buildCatalog(catalogData, categoriesData, casesData, openModelsData, curatedData) {
    const rawCats = (Array.isArray(catalogData?.categories) && catalogData.categories.length)
      ? catalogData.categories
      : (Array.isArray(categoriesData?.categories) ? categoriesData.categories : []);
    const cats = [];
    const seenCats = new Set();
    for (const c of rawCats) {
      if (!c || typeof c.id !== 'string' || seenCats.has(c.id)) continue;
      seenCats.add(c.id);
      cats.push(c);
      state.catById.set(c.id, c);
    }

    const casesById = new Map();
    const casesByCatalogId = new Map();
    for (const c of (Array.isArray(casesData?.cases) ? casesData.cases : [])) {
      if (!c || typeof c.id !== 'string') continue;
      casesById.set(c.id, c);
      if (c.catalog_entry?.id) casesByCatalogId.set(c.catalog_entry.id, c);
    }

    const rawById = new Map();
    for (const entry of [
      ...(Array.isArray(catalogData?.entries) ? catalogData.entries : []),
      ...(Array.isArray(curatedData?.entries) ? curatedData.entries : [])
    ]) {
      if (entry && typeof entry.id === 'string') rawById.set(entry.id, entry);
    }

    for (const m of (Array.isArray(openModelsData?.models) ? openModelsData.models : [])) {
      if (!m || typeof m.id !== 'string') continue;
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
          license: m.license?.name || '原典参照',
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
      const ver = verificationInfo(entry, linkedCase);
      const cat = state.catById.get(entry.category);
      const record = {
        id: entry.id,
        name: String(entry.name || entry.id),
        category: String(entry.category || 'agents'),
        categoryLabel: cat?.label || entry.category || '未分類',
        kind: String(entry.kind || 'ツール'),
        verificationLabel: ver.label,
        verificationTone: ver.tone,
        license: String(entry.license || '原典確認'),
        sourceUrl: safeHref(entry.source_url || '') || '',
        useCase: String(entry.use_case || entry.summary || ''),
        requirements: String(entry.requirements || ''),
        summary: String(entry.summary || ''),
        tags: Array.isArray(entry.tags) ? entry.tags.map(String) : [],
        searchText: norm([
          entry.id, entry.name, entry.summary, entry.use_case, entry.license,
          cat?.label, ...(Array.isArray(entry.tags) ? entry.tags : [])
        ].join(' '))
      };
      items.push(record);
      byId.set(record.id, record);
      aliasToId.set(record.id, record.id);
      if (record.id.startsWith('owm-')) {
        const raw = record.id.slice(4);
        if (!aliasToId.has(raw)) aliasToId.set(raw, record.id);
      }
      if (linkedCase) {
        if (!aliasToId.has(linkedCase.id)) aliasToId.set(linkedCase.id, record.id);
        if (!aliasToId.has('case-' + linkedCase.id)) aliasToId.set('case-' + linkedCase.id, record.id);
      }
    }

    state.categories = cats;
    state.items = items;
    state.byId = byId;
    state.aliasToId = aliasToId;
  }

  function resolveToolId(raw) {
    if (typeof raw !== 'string' || !ID_RE.test(raw)) return null;
    return state.aliasToId.get(raw) || null;
  }

  /* ---------- Brief Mutations ---------- */

  function addSkillRef(item) {
    if (!item) return;
    if (state.brief.skill_refs.some(r => r.id === item.id)) {
      showToast(`「${item.name}」はすでに追加されています。`);
      return;
    }
    if (state.brief.skill_refs.length >= MAX_REFS) {
      showToast(`使う道具は最大${MAX_REFS}件までです。不要な項目を外してから追加してください。`);
      return;
    }
    state.brief.skill_refs.push({
      id: item.id,
      name: item.name,
      source_url: item.sourceUrl,
      license: item.license
    });
    scheduleDraftSave();
    renderRefs();
    renderCandidates();
    renderPreview();
  }

  function removeSkillRef(id) {
    state.brief.skill_refs = state.brief.skill_refs.filter(r => r.id !== id);
    scheduleDraftSave();
    renderRefs();
    renderCandidates();
    renderPreview();
  }

  function applyExample(ex) {
    const b = emptyBrief();
    b.category = state.catById.has(ex.category) ? ex.category : (state.categories[0]?.id || 'ui-ux');
    b.request = ex.brief.request;
    b.goal = ex.brief.goal;
    b.audience = ex.brief.audience;
    b.inputs = [...ex.brief.inputs];
    b.assumptions = [...ex.brief.assumptions];
    b.open_questions = [...ex.brief.open_questions];
    b.deliverables = [...ex.brief.deliverables];
    b.acceptance = [...ex.brief.acceptance];
    b.next_step = ex.brief.next_step;

    const refs = [];
    for (const rawId of ex.preferredTools) {
      const id = resolveToolId(rawId);
      const item = id ? state.byId.get(id) : null;
      if (item && refs.length < MAX_REFS) {
        refs.push({id: item.id, name: item.name, source_url: item.sourceUrl, license: item.license});
      }
    }
    if (!refs.length) {
      for (const item of state.items) {
        if (item.category === b.category && refs.length < 2) {
          refs.push({id: item.id, name: item.name, source_url: item.sourceUrl, license: item.license});
        }
      }
    }
    b.skill_refs = refs;
    state.brief = b;
    syncFormFromState();
    scheduleDraftSave();
    renderAll();
    showToast(`例「${ex.label}」を読み込みました。`);
  }

  function applyToolPrepopulate(item) {
    if (!item) return;
    state.brief.category = state.catById.has(item.category) ? item.category : state.brief.category;
    if (!state.brief.skill_refs.some(r => r.id === item.id) && state.brief.skill_refs.length < MAX_REFS) {
      state.brief.skill_refs.push({
        id: item.id,
        name: item.name,
        source_url: item.sourceUrl,
        license: item.license
      });
    }
    if (!state.brief.request) {
      state.brief.request = `${item.name}を使って、${item.useCase || item.summary}`;
    }
    if (!state.brief.goal) {
      state.brief.goal = item.useCase || item.summary || `${item.name}を使った制作を完了する`;
    }
    if (!state.brief.inputs.length && item.requirements) {
      state.brief.inputs = [item.requirements];
    }
    if (!state.brief.assumptions.length) {
      state.brief.assumptions = [
        `${item.name}（${item.license}）の原典手順と利用条件を事前に確認する`
      ];
    }
    if (!state.brief.next_step) {
      state.brief.next_step = `まず skill_refs の「${item.name}」の原典とライセンスを確認し、必要な素材を揃えて着手する`;
    }
  }

  /* ---------- Output Formatting ---------- */

  function normalizedBriefObject() {
    return {
      request: state.brief.request,
      category: state.brief.category,
      goal: state.brief.goal,
      audience: state.brief.audience,
      inputs: state.brief.inputs,
      assumptions: state.brief.assumptions,
      open_questions: state.brief.open_questions,
      skill_refs: state.brief.skill_refs,
      deliverables: state.brief.deliverables,
      acceptance: state.brief.acceptance,
      next_step: state.brief.next_step
    };
  }

  function buildPromptMarkdown() {
    const b = normalizedBriefObject();
    const catLabel = state.catById.get(b.category)?.label || b.category;
    const bullet = (arr, emptyText) => arr.length ? arr.map(line => `- ${line}`).join('\n') : `- ${emptyText}`;

    const refsBlock = b.skill_refs.length
      ? b.skill_refs.map((r, i) => {
          const urlPart = r.source_url ? ` / 原典: ${r.source_url}` : '';
          return `${i + 1}. **${r.name}** (\`${r.id}\`) — ライセンス: ${r.license}${urlPart}`;
        }).join('\n')
      : '- （未指定：分野に合うスキルを先に選定してください）';

    return [
      '# 制作ブリーフ（brief-to-demo 形式）',
      '',
      '以下の条件と完成基準に沿って作業してください。私が渡していない日時・数値・実績は作らず、推測が必要な条件は `assumptions` として明示してください。',
      '',
      '## 1. 元の依頼（request）',
      b.request || '（未入力）',
      '',
      `## 2. 分野（category）`,
      `${catLabel} (\`${b.category}\`)`,
      '',
      '## 3. 目的・対象（goal / audience）',
      `- 目的: ${b.goal || '（未入力）'}`,
      `- 使う人・見る人: ${b.audience || '（未入力）'}`,
      '',
      '## 4. 参照する道具・スキル（skill_refs）',
      '※ 着手前に各原典URLの指示書とライセンス条件を必ず確認してください。',
      refsBlock,
      '',
      '## 5. 渡す素材（inputs）',
      bullet(b.inputs, '（未入力）'),
      '',
      '## 6. 仮定（assumptions）',
      bullet(b.assumptions, '（未入力）'),
      '',
      '## 7. 未確定事項（open_questions）',
      bullet(b.open_questions, '（なし）'),
      '',
      '## 8. 成果物（deliverables）',
      bullet(b.deliverables, '（未入力）'),
      '',
      '## 9. 完成条件（acceptance）',
      bullet(b.acceptance, '（未入力）'),
      '',
      '## 10. 最初の一歩（next_step）',
      b.next_step || '（未入力）'
    ].join('\n');
  }

  /* ---------- Rendering ---------- */

  function syncFormFromState() {
    categorySelect.value = state.brief.category;
    requestEl.value = state.brief.request;
    goalEl.value = state.brief.goal;
    audienceEl.value = state.brief.audience;
    inputsEl.value = arrayToLines(state.brief.inputs);
    deliverablesEl.value = arrayToLines(state.brief.deliverables);
    assumptionsEl.value = arrayToLines(state.brief.assumptions);
    openQuestionsEl.value = arrayToLines(state.brief.open_questions);
    acceptanceEl.value = arrayToLines(state.brief.acceptance);
    nextStepEl.value = state.brief.next_step;
  }

  function renderCategorySelect() {
    const groups = [];
    for (const c of state.categories) {
      const gName = c.group || 'その他';
      let g = groups.find(x => x.name === gName);
      if (!g) groups.push(g = {name: gName, items: []});
      g.items.push(c);
    }
    const nodes = groups.map(g =>
      h('optgroup', {label: g.name},
        ...g.items.map(c => h('option', {value: c.id}, c.label)))
    );
    categorySelect.replaceChildren(...nodes);
    if (!state.catById.has(state.brief.category) && state.categories[0]) {
      state.brief.category = state.categories[0].id;
    }
    categorySelect.value = state.brief.category;
    updateCategoryHint();
  }

  function updateCategoryHint() {
    const cat = state.catById.get(state.brief.category);
    catHintEl.textContent = cat ? `${cat.label}：${cat.description}` : '欲しい成果物の種類から分野を選びます。';
  }

  function renderTemplates() {
    templateRow.replaceChildren(...EXAMPLES.map(ex =>
      h('button', {
        type: 'button',
        class: 'ps-template-btn',
        onclick: () => applyExample(ex)
      },
        h('strong', {}, ex.label),
        h('span', {}, ex.summary)
      )
    ));
  }

  function badgeNode(item) {
    const cls = item.verificationTone === 'demo'
      ? 'ps-badge ps-badge-demo'
      : item.verificationTone === 'model'
        ? 'ps-badge ps-badge-model'
        : 'ps-badge';
    return h('span', {class: cls}, item.verificationLabel);
  }

  function renderRefs() {
    const refs = state.brief.skill_refs;
    refCountEl.textContent = String(refs.length);
    refEmptyEl.hidden = refs.length > 0;

    refListEl.replaceChildren(...refs.map(ref => {
      const full = state.byId.get(ref.id);
      const urlHref = safeHref(ref.source_url);
      return h('li', {class: 'ps-ref-item'},
        h('div', {class: 'ps-ref-meta'},
          h('div', {class: 'ps-badges'},
            full ? badgeNode(full) : null,
            h('span', {class: 'ps-badge'}, ref.license)
          ),
          h('span', {class: 'ps-ref-name'}, ref.name),
          urlHref
            ? h('a', {
                class: 'ps-ref-url',
                href: urlHref,
                target: isExternal(urlHref) ? '_blank' : null,
                rel: isExternal(urlHref) ? 'noopener noreferrer' : null
              }, displayUrl(urlHref) + (isExternal(urlHref) ? ' ↗' : ''))
            : null
        ),
        h('button', {
          type: 'button',
          class: 'ps-btn-sm ps-btn-danger',
          'aria-label': `${ref.name}を外す`,
          onclick: () => removeSkillRef(ref.id)
        }, '外す')
      );
    }));
  }

  function renderCandidates() {
    const selectedSet = new Set(state.brief.skill_refs.map(r => r.id));
    const savedSet = new Set(state.savedWorkbenchIds);
    const terms = norm(state.toolQuery).split(/\s+/).filter(Boolean);

    let list = state.items.filter(item => {
      if (state.showSavedOnly && !savedSet.has(item.id)) return false;
      return terms.every(t => item.searchText.includes(t));
    });

    // Sort: matching category first (when prioritized), then verified demos, then name.
    const toneScore = tone => (tone === 'demo' ? 0 : tone === 'reviewed' ? 1 : tone === 'model' ? 2 : 3);
    list.sort((a, b) => {
      if (state.prioritizeCategory) {
        const aCat = a.category === state.brief.category ? 0 : 1;
        const bCat = b.category === state.brief.category ? 0 : 1;
        if (aCat !== bCat) return aCat - bCat;
      }
      const td = toneScore(a.verificationTone) - toneScore(b.verificationTone);
      if (td !== 0) return td;
      return a.name.localeCompare(b.name, 'ja');
    });

    const shown = list.slice(0, 30);
    const catLabel = state.catById.get(state.brief.category)?.label || state.brief.category;
    toolStatusEl.textContent = state.showSavedOnly
      ? `ワークベンチ保存済み ${list.length}件を表示中`
      : `${list.length}件該当（${state.prioritizeCategory ? `「${catLabel}」優先` : '全分野'}・最大30件表示）`;

    if (!shown.length) {
      toolCandidatesEl.replaceChildren(
        h('li', {class: 'ps-cand-row'}, h('span', {class: 'ps-cand-use'}, '条件に一致する道具がありません。'))
      );
      return;
    }

    toolCandidatesEl.replaceChildren(...shown.map(item => {
      const chosen = selectedSet.has(item.id);
      return h('li', {class: 'ps-cand-row'},
        h('div', {class: 'ps-cand-info'},
          h('div', {class: 'ps-badges'},
            h('span', {class: 'ps-badge'}, item.categoryLabel),
            badgeNode(item),
            h('span', {class: 'ps-badge'}, item.license)
          ),
          h('span', {class: 'ps-cand-name'}, item.name),
          h('span', {class: 'ps-cand-use'}, item.useCase || item.summary)
        ),
        h('button', {
          type: 'button',
          class: 'ps-btn-sm',
          disabled: chosen || state.brief.skill_refs.length >= MAX_REFS,
          'aria-pressed': String(chosen),
          onclick: () => addSkillRef(item)
        }, chosen ? '選択済み ✓' : '+ 追加')
      );
    }));
  }

  function renderAcceptanceChips() {
    const specific = CATEGORY_CHIPS[state.brief.category] || [];
    const chips = [...specific, ...COMMON_CHIPS];
    const currentSet = new Set(state.brief.acceptance);

    acceptChipsEl.replaceChildren(...chips.map(text => {
      const added = currentSet.has(text);
      return h('button', {
        type: 'button',
        class: 'ps-accept-chip',
        'aria-pressed': String(added),
        onclick: () => {
          if (currentSet.has(text)) {
            state.brief.acceptance = state.brief.acceptance.filter(x => x !== text);
          } else {
            state.brief.acceptance = [...state.brief.acceptance, text];
          }
          acceptanceEl.value = arrayToLines(state.brief.acceptance);
          scheduleDraftSave();
          renderAcceptanceChips();
          renderPreview();
        }
      }, (added ? '✓ ' : '+ ') + text);
    }));
  }

  function renderPreview() {
    const brief = normalizedBriefObject();
    schemaPillsEl.replaceChildren(...SCHEMA_FIELDS.map(([key, label]) => {
      const val = brief[key];
      const filled = Array.isArray(val) ? val.length > 0 : Boolean(String(val || '').trim());
      return h('span', {class: 'ps-schema-pill' + (filled ? ' is-filled' : '')},
        (filled ? '✓ ' : '') + label);
    }));

    promptPreviewEl.textContent = buildPromptMarkdown();
    jsonPreviewEl.textContent = JSON.stringify(brief, null, 2);

    for (const tab of $$('[data-out-tab]')) {
      const active = tab.dataset.outTab === state.outTab;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    }
    for (const panel of $$('[data-out-panel]')) {
      panel.hidden = panel.dataset.outPanel !== state.outTab;
    }
  }

  function renderAll() {
    if (!state.loaded) return;
    updateCategoryHint();
    renderRefs();
    renderCandidates();
    renderAcceptanceChips();
    renderPreview();
  }

  /* ---------- Events ---------- */

  function bindEvents() {
    const bindText = (el, key, isArray) => {
      el.addEventListener('input', () => {
        state.brief[key] = isArray ? linesToArray(el.value) : el.value;
        if (key === 'acceptance') renderAcceptanceChips();
        scheduleDraftSave();
        renderPreview();
      });
    };

    categorySelect.addEventListener('change', () => {
      state.brief.category = categorySelect.value;
      scheduleDraftSave();
      renderAll();
    });

    bindText(requestEl, 'request', false);
    bindText(goalEl, 'goal', false);
    bindText(audienceEl, 'audience', false);
    bindText(inputsEl, 'inputs', true);
    bindText(deliverablesEl, 'deliverables', true);
    bindText(assumptionsEl, 'assumptions', true);
    bindText(openQuestionsEl, 'open_questions', true);
    bindText(acceptanceEl, 'acceptance', true);
    bindText(nextStepEl, 'next_step', false);

    filterCatBtn.addEventListener('click', () => {
      state.prioritizeCategory = !state.prioritizeCategory;
      state.showSavedOnly = false;
      filterCatBtn.setAttribute('aria-pressed', String(state.prioritizeCategory));
      renderCandidates();
    });

    importSavedBtn.addEventListener('click', () => {
      state.showSavedOnly = !state.showSavedOnly;
      importSavedBtn.setAttribute('aria-pressed', String(state.showSavedOnly));
      renderCandidates();
    });

    toolQEl.addEventListener('input', () => {
      state.toolQuery = toolQEl.value;
      renderCandidates();
    });

    const outTabs = $$('[data-out-tab]');
    outTabs.forEach((tab, idx) => {
      tab.addEventListener('click', () => {
        state.outTab = tab.dataset.outTab;
        renderPreview();
      });
      tab.addEventListener('keydown', event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          const next = outTabs[(idx + 1) % outTabs.length];
          next.focus();
          state.outTab = next.dataset.outTab;
          renderPreview();
        }
      });
    });

    copyPromptBtn.addEventListener('click', () => copyText(buildPromptMarkdown(), '日本語の依頼プロンプトをコピーしました。'));
    copyJsonBtn.addEventListener('click', () => copyText(JSON.stringify(normalizedBriefObject(), null, 2), 'brief.json をコピーしました。'));
    downloadJsonBtn.addEventListener('click', () => downloadJson('brief.json', JSON.stringify(normalizedBriefObject(), null, 2) + '\n'));

    saveDraftBtn.addEventListener('click', () => saveDraft(true));
    loadDraftBtn.addEventListener('click', () => {
      const draft = readDraft();
      if (!draft) {
        showToast('保存された下書きが見つかりませんでした。');
        return;
      }
      state.brief = draft;
      syncFormFromState();
      renderAll();
      showToast('保存済みの下書きを復元しました。');
    });
    clearDraftBtn.addEventListener('click', () => {
      clearTimeout(draftTimer);
      try { localStorage.removeItem(DRAFT_KEY); } catch (_) { /* Ignore. */ }
      state.brief = emptyBrief();
      if (state.categories[0]) state.brief.category = state.categories[0].id;
      syncFormFromState();
      draftStatusEl.textContent = '下書きをクリアしました';
      loadDraftBtn.hidden = true;
      renderAll();
      showToast('入力内容とローカル下書きをクリアしました。');
    });

    if (dismissContextBtn) {
      dismissContextBtn.addEventListener('click', () => { contextBanner.hidden = true; });
    }
    if (retryBtn) retryBtn.addEventListener('click', loadAll);
  }

  /* ---------- Bootstrap ---------- */

  async function optionalJSON(url) {
    try { return await loadJSON(url); } catch (_) { return null; }
  }

  async function loadAll() {
    errorEl.hidden = true;
    try {
      const [catalogData, categoriesData, casesData, openModelsData, curatedData] = await Promise.all([
        loadJSON('data/catalog.json'),
        optionalJSON('data/categories.json'),
        optionalJSON('data/cases.json'),
        optionalJSON('data/open-models.json'),
        optionalJSON('data/curated-resources.json')
      ]);

      buildCatalog(catalogData, categoriesData, casesData, openModelsData, curatedData);
      state.savedWorkbenchIds = readWorkbenchSavedIds().map(resolveToolId).filter(Boolean);
      importSavedBtn.hidden = state.savedWorkbenchIds.length === 0;

      renderCategorySelect();
      renderTemplates();

      const params = new URLSearchParams(location.search);
      const rawTool = params.get('tool');
      const rawCat = params.get('cat');
      const resolvedToolId = rawTool ? resolveToolId(rawTool) : null;
      const toolItem = resolvedToolId ? state.byId.get(resolvedToolId) : null;

      if (toolItem) {
        applyToolPrepopulate(toolItem);
        contextBanner.hidden = false;
        contextMsg.textContent = `「${toolItem.name}」の分野・原典・使いどころを初期値にセットしました。`;
        loadDraftBtn.hidden = !hasStoredDraft();
      } else if (rawCat && state.catById.has(rawCat)) {
        state.brief.category = rawCat;
        const cat = state.catById.get(rawCat);
        contextBanner.hidden = false;
        contextMsg.textContent = `分野「${cat.label}」を初期選択し、関連する道具を優先表示しています。`;
        loadDraftBtn.hidden = !hasStoredDraft();
      } else {
        const draft = readDraft();
        if (draft) {
          state.brief = draft;
          draftStatusEl.textContent = '前回のローカル下書きを復元しました';
        }
      }

      state.loaded = true;
      syncFormFromState();
      renderAll();
    } catch (_) {
      errorEl.hidden = false;
      toolStatusEl.textContent = '読み込みに失敗しました。';
    }
  }

  initTheme();
  bindEvents();
  loadAll();
})();
