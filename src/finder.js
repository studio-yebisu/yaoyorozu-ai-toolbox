/* Yaoyorozu AI ToolBox — Use-Case Finder & Curated Recipes. */
(() => {
  'use strict';

  window.addEventListener('DOMContentLoaded', () => {
    const {$, $$, h, safeHref, loadJSON, norm, announce} = window.SY;
    const normText = typeof window.SY.normSearch === 'function' ? window.SY.normSearch : norm;

    const MAX_RESULTS = 12;
    const WORKBENCH_KEY = 'yaoyorozu-saved-items-v1';
    const COMPARE_KEY = 'yaoyorozu-compare-v1';
    const ID_RE = /^[a-z0-9][a-z0-9._-]{0,99}$/i;

    const GOAL_GROUPS = {
      'ui-slides-graphics': {
        label: '画面・資料・図解をつくる',
        categories: new Set(['ui-ux', 'slides', 'graphics', 'writing', 'documents']),
        related: new Set(['motion']),
        keywords: ['ui', 'ux', 'デザイン', 'スライド', '図解', 'mermaid', 'pptx', '資料']
      },
      'video-audio-3d': {
        label: '動画・音声・3Dをつくる',
        categories: new Set(['motion', 'video', 'audio', '3d', 'games']),
        related: new Set(['graphics']),
        keywords: ['動画', 'モーション', '音声', '文字起こし', 'tts', '3d', 'cad', 'vfx']
      },
      'dev-research-auto': {
        label: '開発・調査・自動化を進める',
        categories: new Set(['development', 'research', 'agents', 'automation']),
        related: new Set(['knowledge']),
        keywords: ['開発', 'テスト', '調査', '収集', '自動化', 'エージェント', 'mcp', 'ワークフロー']
      },
      'knowledge-docs-learn': {
        label: '知識整理・文書・学習に使う',
        categories: new Set(['knowledge', 'documents', 'writing', 'learning']),
        related: new Set(['research']),
        keywords: ['知識', '記憶', 'メモリー', '文書', 'pdf', '学習', '検証', 'コード解析']
      },
      openweight: {
        label: '用途特化モデル(OpenWeight)を探す',
        categories: new Set(['owm-tools']),
        related: new Set(),
        keywords: ['openweight', '重み', 'モデル', '推論']
      }
    };

    const VERIFICATION_MAP = {
      'runtime-reviewed': {label: '実制作デモあり', cls: 'is-demo', rank: 4},
      'concept-demo': {label: '概念デモ', cls: 'is-demo', rank: 3},
      'model-source-reviewed': {label: 'OpenWeight（推論未実行）', cls: 'is-openweight', rank: 2},
      'source-reviewed': {label: '原典確認済み（未実行）', cls: '', rank: 2}
    };

    const state = {
      goal: '',
      prefs: new Set(),
      kind: '',
      q: '',
      entries: [],
      byId: Object.create(null),
      casesByEntry: Object.create(null),
      catMap: Object.create(null),
      recipes: []
    };

    const form = $('[data-finder-form]');
    const goalWrap = $('[data-goal-chips]');
    const prefWrap = $('[data-pref-chips]');
    const searchInput = $('[data-finder-q]');
    const statusEl = $('[data-finder-status]');
    const resultsEl = $('[data-finder-results]');
    const emptyEl = $('[data-finder-empty]');
    const errorEl = $('[data-finder-error]');
    const trayEl = $('[data-finder-tray]');
    const traySummary = $('[data-finder-tray-summary]');
    const trayWorkbenchLink = $('[data-tray-workbench]');
    const recipesStatusEl = $('[data-recipes-status]');
    const recipesListEl = $('[data-recipes-list]');

    if (!form || !resultsEl || !recipesListEl) return;

    function readIdList(key) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(id => typeof id === 'string' && ID_RE.test(id));
      } catch (_) {
        return [];
      }
    }

    function writeIdList(key, items) {
      try {
        localStorage.setItem(key, JSON.stringify(items));
      } catch (_) {
        /* Storage may be unavailable in private browsing modes. */
      }
    }

    function getWorkbenchIds() {
      const actions = window.SY.itemActions;
      if (actions && typeof actions.getSavedIds === 'function') {
        return actions.getSavedIds();
      }
      return readIdList(WORKBENCH_KEY);
    }

    function addWorkbenchId(id) {
      const actions = window.SY.itemActions;
      if (actions && typeof actions.getSavedIds === 'function' && typeof actions.setSavedIds === 'function') {
        const list = actions.getSavedIds();
        if (!list.includes(id)) return actions.setSavedIds([...list, id]);
        return list;
      }
      const list = readIdList(WORKBENCH_KEY);
      if (!list.includes(id)) {
        list.push(id);
        writeIdList(WORKBENCH_KEY, list);
      }
      return list;
    }

    function getCompareIds() {
      const actions = window.SY.itemActions;
      if (actions && typeof actions.getCompareIds === 'function') {
        return actions.getCompareIds();
      }
      return readIdList(COMPARE_KEY);
    }

    function toggleCompareId(id) {
      const actions = window.SY.itemActions;
      if (actions && typeof actions.toggleCompare === 'function') {
        actions.toggleCompare(id);
        return actions.getCompareIds().includes(id);
      }
      const list = readIdList(COMPARE_KEY);
      const idx = list.indexOf(id);
      if (idx >= 0) {
        list.splice(idx, 1);
        writeIdList(COMPARE_KEY, list);
        return false;
      }
      if (list.length >= 4) list.shift();
      list.push(id);
      writeIdList(COMPARE_KEY, list);
      return true;
    }

    function toast(message, action) {
      announce(message);
      if (typeof window.SY.toast === 'function') window.SY.toast(message, action);
    }

    function parseURL() {
      const params = new URLSearchParams(location.search);
      const goal = params.get('goal') || '';
      state.goal = Object.prototype.hasOwnProperty.call(GOAL_GROUPS, goal) ? goal : '';
      state.prefs = new Set();
      for (const token of (params.get('pref') || '').split(',')) {
        const clean = token.trim();
        if (clean === 'demo' || clean === 'verified') state.prefs.add(clean);
      }
      const kind = params.get('kind') || '';
      state.kind = (kind === 'skill' || kind === 'tool') ? kind : '';
      state.q = params.get('q') || '';
      searchInput.value = state.q;
    }

    function syncURL() {
      const params = new URLSearchParams();
      if (state.goal) params.set('goal', state.goal);
      if (state.prefs.size) params.set('pref', [...state.prefs].join(','));
      if (state.kind) params.set('kind', state.kind);
      if (state.q.trim()) params.set('q', state.q.trim());
      const query = params.toString();
      const target = location.pathname + (query ? '?' + query : '') + location.hash;
      history.replaceState(null, '', target);
    }

    function verificationInfo(entry) {
      const stage = entry.verification_stage;
      if (stage && VERIFICATION_MAP[stage]) return VERIFICATION_MAP[stage];
      if (entry.resource_type === 'open-weight-model' || entry.category === 'owm-tools') {
        return VERIFICATION_MAP['model-source-reviewed'];
      }
      if (state.casesByEntry[entry.id]) return VERIFICATION_MAP['runtime-reviewed'];
      if (entry.source_commit) return {label: '原典確認・ガイド掲載', cls: '', rank: 1};
      return {label: 'ガイド掲載', cls: '', rank: 0};
    }

    function hasDemo(entry) {
      if (state.casesByEntry[entry.id]) return true;
      if (entry.verification_stage === 'runtime-reviewed' || entry.verification_stage === 'concept-demo') return true;
      if (typeof entry.guide_url === 'string' && entry.guide_url.startsWith('case.html?id=')) return true;
      return Boolean(entry.example_url);
    }

    function isSkillKind(entry) {
      return String(entry.kind || '').includes('スキル');
    }

    function isToolKind(entry) {
      const kind = String(entry.kind || '');
      return !kind.includes('スキル') && kind !== 'モデル';
    }

    function isVerified(entry) {
      if (entry.verification_stage && VERIFICATION_MAP[entry.verification_stage]) return true;
      return Boolean(entry.source_commit);
    }

    function entrySearchText(entry) {
      const catLabel = (state.catMap[entry.category] && state.catMap[entry.category].label) || '';
      const tags = Array.isArray(entry.tags) ? entry.tags.join(' ') : '';
      return normText([entry.id, entry.name, entry.summary, entry.use_case, entry.kind, catLabel, tags].join(' '));
    }

    function scoreEntries() {
      const qNorm = normText(state.q.trim());
      const qTokens = qNorm ? qNorm.split(/\s+/).filter(Boolean) : [];
      const goalDef = state.goal ? GOAL_GROUPS[state.goal] : null;
      const scored = [];

      for (const entry of state.entries) {
        const hay = entrySearchText(entry);
        const nameNorm = normText(entry.name + ' ' + entry.id);

        if (qTokens.length) {
          const allMatch = qTokens.every(tok => hay.includes(tok));
          if (!allMatch) continue;
        }

        const reasons = [];
        let score = 0;

        if (goalDef) {
          const isOwn = state.goal === 'openweight'
            ? (entry.resource_type === 'open-weight-model' || entry.category === 'owm-tools')
            : goalDef.categories.has(entry.category);
          const isRelated = goalDef.related.has(entry.category);
          const kwHit = goalDef.keywords.some(kw => hay.includes(normText(kw)));
          if (!isOwn && !isRelated && !kwHit) continue;
          if (isOwn) {
            score += 45;
            reasons.push('目的に一致');
          } else if (isRelated) {
            score += 20;
            reasons.push('関連分野');
          } else {
            score += 12;
            reasons.push('用途関連');
          }
        }

        const demo = hasDemo(entry);
        const verif = verificationInfo(entry);

        if (state.prefs.has('demo')) {
          if (demo) {
            score += 30;
            reasons.push('動画・デモあり');
          } else {
            score -= 5;
          }
        } else if (demo) {
          score += 8;
        }

        if (state.prefs.has('verified')) {
          if (isVerified(entry)) {
            score += 25;
            reasons.push('原典確認済み');
          } else {
            continue;
          }
        }

        if (state.kind === 'skill') {
          if (isSkillKind(entry)) {
            score += 25;
            reasons.push('スキル');
          } else {
            score -= 8;
          }
        } else if (state.kind === 'tool') {
          if (isToolKind(entry)) {
            score += 25;
            reasons.push('ツール・ライブラリ');
          } else {
            score -= 8;
          }
        }

        if (qTokens.length) {
          const nameHits = qTokens.filter(tok => nameNorm.includes(tok)).length;
          score += 20 + nameHits * 20;
          reasons.push('キーワード一致');
        }

        score += verif.rank * 3;
        scored.push({entry, score, reasons, demo, verif});
      }

      scored.sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name, 'ja'));
      return scored.slice(0, MAX_RESULTS);
    }

    function updateChips() {
      for (const btn of $$('[data-goal]', goalWrap)) {
        btn.setAttribute('aria-pressed', String(btn.dataset.goal === state.goal));
      }
      for (const btn of $$('[data-pref]', prefWrap)) {
        btn.setAttribute('aria-pressed', String(state.prefs.has(btn.dataset.pref)));
      }
      for (const btn of $$('[data-kind]', prefWrap)) {
        btn.setAttribute('aria-pressed', String(btn.dataset.kind === state.kind));
      }
    }

    function renderTray() {
      const wb = getWorkbenchIds();
      const cmp = getCompareIds();
      if (!wb.length && !cmp.length) {
        trayEl.hidden = true;
        return;
      }
      trayEl.hidden = false;
      const parts = [];
      if (wb.length) parts.push('ワークベンチ追加済み: ' + wb.length + '件');
      if (cmp.length) parts.push('比較候補: ' + cmp.length + '件');
      traySummary.textContent = parts.join(' ／ ');
      if (wb.length) {
        trayWorkbenchLink.hidden = false;
        trayWorkbenchLink.href = safeHref('workbench.html?items=' + encodeURIComponent(wb.join(',')));
      } else {
        trayWorkbenchLink.hidden = true;
      }
    }

    function renderRecommendations() {
      const wbSet = new Set(getWorkbenchIds());
      const cmpSet = new Set(getCompareIds());
      const hits = scoreEntries();

      if (!hits.length) {
        resultsEl.replaceChildren();
        emptyEl.hidden = false;
        statusEl.textContent = '該当する道具はありません（0件）';
        return;
      }

      emptyEl.hidden = true;
      const activeFilters = [];
      if (state.goal) activeFilters.push(GOAL_GROUPS[state.goal].label);
      if (state.prefs.has('demo')) activeFilters.push('動画・デモ付き');
      if (state.prefs.has('verified')) activeFilters.push('原典確認済み以上');
      if (state.kind === 'skill') activeFilters.push('スキル優先');
      if (state.kind === 'tool') activeFilters.push('ツール優先');
      if (state.q.trim()) activeFilters.push('「' + state.q.trim() + '」');

      statusEl.textContent = activeFilters.length
        ? 'おすすめ候補 ' + hits.length + '件（条件：' + activeFilters.join('・') + '）'
        : '代表的な道具 ' + hits.length + '件を表示中（ステップを選ぶと絞り込めます）';

      const cards = hits.map(({entry, reasons, verif}) => {
        const catLabel = (state.catMap[entry.category] && state.catMap[entry.category].label) || entry.category;
        const detailHref = safeHref(entry.guide_url || ('case.html?entry=' + encodeURIComponent(entry.id)));
        const briefHref = safeHref('prompt-studio.html?tool=' + encodeURIComponent(entry.id));

        const metaChildren = [
          h('span', {class: 'card-cat'}, catLabel),
          h('span', {class: 'finder-badge'}, String(entry.kind || 'ツール')),
          h('span', {class: 'finder-badge ' + verif.cls}, verif.label)
        ];

        const reasonBadges = reasons.length
          ? h('div', {class: 'finder-reasons'}, reasons.map(r => h('span', {class: 'finder-badge is-match'}, r)))
          : null;

        const wbBtn = h('button', {
          type: 'button',
          class: 'btn',
          'aria-pressed': String(wbSet.has(entry.id)),
          onclick: () => {
            addWorkbenchId(entry.id);
            wbBtn.setAttribute('aria-pressed', 'true');
            wbBtn.textContent = 'ワークベンチに追加済み';
            renderTray();
            toast(entry.name + ' をワークベンチに追加しました。', {label: 'ワークベンチを開く', href: 'workbench.html'});
          }
        }, wbSet.has(entry.id) ? 'ワークベンチに追加済み' : 'ワークベンチに追加');

        const cmpBtn = h('button', {
          type: 'button',
          class: 'btn',
          'aria-pressed': String(cmpSet.has(entry.id)),
          onclick: () => {
            const added = toggleCompareId(entry.id);
            cmpBtn.setAttribute('aria-pressed', String(added));
            cmpBtn.textContent = added ? '比較候補から外す' : '比較に追加';
            renderTray();
            toast(entry.name + (added ? ' を比較に追加しました。' : ' を比較候補から外しました。'), added ? {label: '比較表を開く', href: 'workbench.html#compare'} : null);
          }
        }, cmpSet.has(entry.id) ? '比較候補から外す' : '比較に追加');

        return h('li', {class: 'finder-card'},
          h('div', {class: 'finder-card-meta'}, ...metaChildren),
          h('h3', {class: 'finder-card-title'},
            detailHref ? h('a', {href: detailHref}, entry.name) : entry.name
          ),
          h('p', {class: 'finder-card-summary'}, entry.summary || ''),
          entry.use_case ? h('p', {class: 'finder-card-use'}, entry.use_case) : null,
          reasonBadges,
          h('div', {class: 'finder-card-actions'},
            detailHref ? h('a', {class: 'btn btn-ink', href: detailHref}, '記事・詳細を見る') : null,
            wbBtn,
            cmpBtn,
            briefHref ? h('a', {class: 'btn', href: briefHref}, '依頼ブリーフ作成') : null
          )
        );
      });

      resultsEl.replaceChildren(...cards);
    }

    function renderRecipes() {
      if (!state.recipes.length) {
        recipesStatusEl.textContent = 'レシピを読み込めませんでした。';
        return;
      }
      recipesStatusEl.textContent = '全 ' + state.recipes.length + ' 件のワークフローレシピ';

      const goalLabel = state.goal && GOAL_GROUPS[state.goal] ? GOAL_GROUPS[state.goal].label : '';
      const ordered = state.recipes.slice().sort((a, b) => {
        const ma = goalLabel && a.goal === goalLabel ? 1 : 0;
        const mb = goalLabel && b.goal === goalLabel ? 1 : 0;
        return mb - ma;
      });

      const nodes = ordered.map(recipe => {
        const isGoalMatch = Boolean(goalLabel && recipe.goal === goalLabel);
        const stepIds = (recipe.steps || []).map(s => s.item_id).filter(Boolean);
        const firstId = stepIds[0] || '';
        const wbHref = safeHref('workbench.html?items=' + encodeURIComponent(stepIds.join(',')));
        const briefHref = firstId ? safeHref('prompt-studio.html?tool=' + encodeURIComponent(firstId)) : null;

        const stepItems = (recipe.steps || []).map(step => {
          const entry = state.byId[step.item_id];
          const name = entry ? entry.name : step.item_id;
          const catLabel = entry && state.catMap[entry.category] ? state.catMap[entry.category].label : (entry ? entry.category : '');
          const verif = entry ? verificationInfo(entry) : {label: '未参照', cls: ''};
          const href = entry ? safeHref(entry.guide_url || ('case.html?entry=' + encodeURIComponent(entry.id))) : null;

          return h('li', {class: 'recipe-step'},
            h('span', {class: 'recipe-step-num'}, 'Step ' + String(step.order)),
            h('div', {class: 'recipe-step-body'},
              h('span', {class: 'recipe-step-role'}, step.role),
              h('div', {class: 'recipe-step-top'},
                href ? h('a', {class: 'recipe-step-tool', href}, name) : h('span', {class: 'recipe-step-tool'}, name),
                catLabel ? h('span', {class: 'finder-badge'}, catLabel) : null,
                h('span', {class: 'finder-badge ' + verif.cls}, verif.label)
              ),
              h('p', {class: 'recipe-step-why'}, step.why)
            )
          );
        });

        return h('li', {class: 'recipe-card' + (isGoalMatch ? ' is-goal-match' : '')},
          h('div', {class: 'recipe-head'},
            h('div', {class: 'recipe-meta'},
              h('span', {class: 'finder-badge'}, recipe.goal),
              isGoalMatch ? h('span', {class: 'finder-badge is-demo'}, '選択中の目的に一致') : null,
              ...(recipe.tags || []).map(t => h('span', {class: 'finder-badge'}, t))
            ),
            h('h3', {class: 'recipe-title'}, recipe.title),
            h('p', {class: 'recipe-summary'}, recipe.summary),
            recipe.audience ? h('p', {class: 'recipe-audience'}, '対象：' + recipe.audience) : null
          ),
          h('ol', {class: 'recipe-steps'}, ...stepItems),
          h('div', {class: 'recipe-actions'},
            wbHref ? h('a', {class: 'btn btn-ink', href: wbHref}, 'このレシピをワークベンチで開く') : null,
            briefHref ? h('a', {class: 'btn', href: briefHref}, 'レシピの最初の道具で依頼ブリーフ作成') : null
          )
        );
      });

      recipesListEl.replaceChildren(...nodes);
    }

    function applyUpdate() {
      updateChips();
      syncURL();
      renderTray();
      renderRecommendations();
      renderRecipes();
    }

    goalWrap.addEventListener('click', event => {
      const btn = event.target.closest('[data-goal]');
      if (!btn) return;
      const picked = btn.dataset.goal || '';
      state.goal = state.goal === picked && picked !== '' ? '' : picked;
      applyUpdate();
    });

    prefWrap.addEventListener('click', event => {
      const prefBtn = event.target.closest('[data-pref]');
      if (prefBtn) {
        const val = prefBtn.dataset.pref;
        if (state.prefs.has(val)) state.prefs.delete(val);
        else state.prefs.add(val);
        applyUpdate();
        return;
      }
      const kindBtn = event.target.closest('[data-kind]');
      if (kindBtn) {
        const val = kindBtn.dataset.kind;
        state.kind = state.kind === val ? '' : val;
        applyUpdate();
      }
    });

    let composing = false;
    let timer = 0;
    const scheduleSearch = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.q = searchInput.value;
        applyUpdate();
      }, 140);
    };
    searchInput.addEventListener('compositionstart', () => { composing = true; clearTimeout(timer); });
    searchInput.addEventListener('compositionend', () => { composing = false; scheduleSearch(); });
    searchInput.addEventListener('input', event => { if (!composing && !event.isComposing) scheduleSearch(); });
    form.addEventListener('submit', event => {
      event.preventDefault();
      state.q = searchInput.value;
      applyUpdate();
    });

    const resetAll = () => {
      state.goal = '';
      state.prefs.clear();
      state.kind = '';
      state.q = '';
      searchInput.value = '';
      applyUpdate();
    };
    $('[data-finder-reset]').addEventListener('click', resetAll);
    $('[data-finder-empty-reset]').addEventListener('click', resetAll);

    $('[data-tray-clear]').addEventListener('click', () => {
      const actions = window.SY.itemActions;
      if (actions && typeof actions.setSavedIds === 'function') actions.setSavedIds([]);
      else writeIdList(WORKBENCH_KEY, []);
      if (actions && typeof actions.setCompareIds === 'function') actions.setCompareIds([]);
      else writeIdList(COMPARE_KEY, []);
      applyUpdate();
      toast('ワークベンチと比較の選択を空にしました。');
    });

    window.addEventListener('sy:savedchange', () => {
      if (state.entries.length) {
        renderTray();
        renderRecommendations();
      }
    });
    window.addEventListener('sy:comparechange', () => {
      if (state.entries.length) {
        renderTray();
        renderRecommendations();
      }
    });

    parseURL();

    Promise.allSettled([
      loadJSON('data/catalog.json'),
      loadJSON('data/curated-resources.json'),
      loadJSON('data/open-models.json'),
      loadJSON('data/cases.json'),
      loadJSON('data/categories.json'),
      loadJSON('data/recipes.json')
    ]).then(([catRes, curRes, owmRes, casesRes, catsRes, recipesRes]) => {
      const byId = Object.create(null);

      if (catRes.status === 'fulfilled' && Array.isArray(catRes.value && catRes.value.entries)) {
        for (const e of catRes.value.entries) byId[e.id] = e;
      }
      if (curRes.status === 'fulfilled' && Array.isArray(curRes.value && curRes.value.entries)) {
        for (const e of curRes.value.entries) {
          if (!byId[e.id]) byId[e.id] = e;
        }
      }
      if (owmRes.status === 'fulfilled' && Array.isArray(owmRes.value && owmRes.value.models)) {
        for (const m of owmRes.value.models) {
          const owmId = 'owm-' + m.id;
          if (!byId[owmId]) {
            byId[owmId] = {
              id: owmId,
              name: m.name,
              summary: m.summary,
              category: m.category || 'owm-tools',
              kind: 'モデル',
              resource_type: 'open-weight-model',
              guide_url: 'open-models.html#' + m.id,
              use_case: (m.task || '') + '。' + (m.headline || ''),
              tags: ['OpenWeight', m.task, m.provider].filter(Boolean),
              verification_stage: 'model-source-reviewed',
              source_commit: m.weights && m.weights.revision
            };
          }
        }
      }
      if (casesRes.status === 'fulfilled' && Array.isArray(casesRes.value && casesRes.value.cases)) {
        for (const c of casesRes.value.cases) {
          if (c && c.catalog_entry && c.catalog_entry.id) {
            state.casesByEntry[c.catalog_entry.id] = c;
            byId[c.catalog_entry.id] = c.catalog_entry;
          }
        }
      }
      if (catsRes.status === 'fulfilled' && Array.isArray(catsRes.value && catsRes.value.categories)) {
        for (const cat of catsRes.value.categories) state.catMap[cat.id] = cat;
      }
      if (recipesRes.status === 'fulfilled' && Array.isArray(recipesRes.value && recipesRes.value.recipes)) {
        state.recipes = recipesRes.value.recipes;
      }

      state.byId = byId;
      state.entries = Object.values(byId);

      if (!state.entries.length) {
        errorEl.hidden = false;
        statusEl.textContent = 'カタログを読み込めませんでした。';
        return;
      }
      applyUpdate();
    });
  });
})();
