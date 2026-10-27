// 八百万図AIツールボックス: Humanizer作例ビューア
// 保存済みの inputs/jobs.json と outputs/revisions.json を表示するだけで、文章の書き直しは行わない。

const JOB_IDS = ['release', 'reply', 'japanese'];
const SOURCE_PATH = 'inputs/jobs.json';
const RESULT_PATH = 'outputs/revisions.json';

const JOB_EN = {
  release: 'Release note',
  reply: 'Support reply',
  japanese: 'Japanese notice',
};

const LANG_LABEL = { en: 'English（英語）', ja: '日本語' };

// この作例で実際に使った節だけ。名前は固定版SKILL.mdの見出しのまま。
const SECTIONS = {
  1: ['Not X but Y', '「XではなくY」の対比'],
  2: ['One-line closers and dramatic fragments', '言い直すだけの一行の締め'],
  3: ['Sayings that sound deep', '深そうに聞こえる言い回し'],
  4: ['Staged run-up before the point', '本題の前の前置き'],
  5: ['Arguing with no one', '誰も出していない反論への応答'],
  13: ['Inflated significance', '意義の誇張'],
  22: ['Chatbot residue', 'チャットの決まり文句の残り'],
  26: ['Re-explaining what the reader knows', '読み手が知っている背景の言い直し'],
};

const RAW_LINKS = [
  ['outputs/revisions.md', '推敲メモ（outputs/revisions.md）'],
  ['outputs/revisions.json', '結果データ（outputs/revisions.json）'],
  ['inputs/jobs.json', '入力と残す条件（inputs/jobs.json）'],
];

const tabs = JOB_IDS.map((id) => document.getElementById(`tab-${id}`));
const panels = JOB_IDS.map((id) => document.getElementById(id));

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) {
    if (child === undefined || child === null || child === false) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function sectionLabel(n) {
  const entry = SECTIONS[n];
  return entry ? `§${n} ${entry[0]}` : `§${n}`;
}

function sectionChip(n) {
  const entry = SECTIONS[n];
  return el(
    'span',
    { class: 'chip' },
    el('span', { class: 'chip-en', lang: 'en' }, sectionLabel(n)),
    entry ? el('span', { class: 'chip-ja' }, entry[1]) : null,
  );
}

function quoteNode(text, lang) {
  return el('q', { class: 'qt', lang }, text);
}

// --- 文字列の位置に印を付ける（保存済みの引用だけを使い、自動検出はしない） ---

function locate(text, items) {
  const found = [];
  for (const item of items) {
    if (!item.quote) continue;
    const start = text.indexOf(item.quote);
    if (start < 0) continue;
    found.push({ ...item, start, end: start + item.quote.length });
  }
  found.sort((a, b) => a.start - b.start);
  const ranges = [];
  let last = 0;
  for (const r of found) {
    if (r.start < last) continue;
    ranges.push(r);
    last = r.end;
  }
  return ranges;
}

function paintText(container, text, ranges, makeMark) {
  container.replaceChildren();
  let pos = 0;
  for (const r of ranges) {
    if (r.start > pos) container.append(document.createTextNode(text.slice(pos, r.start)));
    container.append(makeMark(text.slice(r.start, r.end), r));
    pos = r.end;
  }
  if (pos < text.length) container.append(document.createTextNode(text.slice(pos)));
}

// --- タブ ---

function selectTab(id, { focus = false, updateHash = false } = {}) {
  JOB_IDS.forEach((jobId, i) => {
    const on = jobId === id;
    tabs[i].setAttribute('aria-selected', String(on));
    tabs[i].tabIndex = on ? 0 : -1;
    panels[i].hidden = !on;
  });
  const index = JOB_IDS.indexOf(id);
  if (focus) tabs[index].focus();
  if (updateHash && location.hash !== `#${id}`) {
    history.replaceState(null, '', `#${id}`);
  }
}

function hashTarget() {
  const raw = location.hash.slice(1);
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function jobFromHash() {
  const target = hashTarget();
  return JOB_IDS.includes(target) ? target : null;
}

function setupTabs() {
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(JOB_IDS[i], { updateHash: true }));
    tab.addEventListener('keydown', (event) => {
      let next = null;
      if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      if (next === null) return;
      event.preventDefault();
      selectTab(JOB_IDS[next], { focus: true, updateHash: true });
    });
  });

  window.addEventListener('hashchange', () => {
    const id = jobFromHash();
    if (!id) return;
    selectTab(id);
    document.getElementById(id).scrollIntoView({ block: 'start' });
  });
}

// --- 読み込み ---

async function getJSON(path) {
  let res;
  try {
    res = await fetch(path, { cache: 'no-cache' });
  } catch {
    throw new Error(`${path} に接続できませんでした。`);
  }
  if (!res.ok) throw new Error(`${path} を読み込めませんでした（HTTP ${res.status}）。`);
  try {
    return await res.json();
  } catch {
    throw new Error(`${path} をJSONとして読めませんでした。`);
  }
}

function rawLinkList() {
  return el(
    'ul',
    {},
    RAW_LINKS.map(([href, label]) => el('li', {}, el('a', { href }, label))),
  );
}

function showLoadError(error) {
  const box = document.getElementById('load-error');
  const children = [
    el('p', { class: 'notice-title' }, '保存済みの結果を読み込めませんでした。'),
    el('p', {}, `理由：${error.message}`),
  ];
  if (location.protocol === 'file:') {
    children.push(
      el('p', {}, 'ファイルを直接（file://）開くと、ブラウザーがJSONの読み込みを止めます。README.mdの手順でローカルサーバーから開いてください。'),
    );
  }
  children.push(el('p', {}, '次のファイルで同じ内容を読めます。'), rawLinkList());
  box.replaceChildren(...children);
  box.hidden = false;
}

function checkShape(source, result) {
  if (!source || !Array.isArray(source.jobs)) throw new Error(`${SOURCE_PATH} に jobs がありません。`);
  if (!result || !Array.isArray(result.jobs)) throw new Error(`${RESULT_PATH} に jobs がありません。`);
  for (const id of JOB_IDS) {
    if (!source.jobs.some((j) => j.id === id)) throw new Error(`${SOURCE_PATH} に ${id} がありません。`);
    if (!result.jobs.some((j) => j.id === id)) throw new Error(`${RESULT_PATH} に ${id} の結果がありません。`);
  }
}

// --- パネルの組み立て ---

function renderMismatch(panel, id) {
  panel.querySelector('.panel-body').replaceChildren(
    el('div', { class: 'notice notice-error' },
      el('p', { class: 'notice-title' }, `${id}：入力ファイルと結果データの原文が一致しないため、表示を止めました。`),
      el('p', {}, 'ファイルを直接確認してください。'),
      rawLinkList(),
    ),
  );
}

function renderJob(panel, src, job) {
  const lang = job.language;
  const ctx = { job, src, selected: null, factButtons: [] };

  // 番号付きの変更点
  const changes = (job.changes || []).map((c, i) => ({ ...c, n: i + 1 }));

  // 見出しと文脈
  const head = el('div', { class: 'panel-head' },
    el('h3', { class: 'panel-title' },
      el('span', { class: 'panel-en', lang: 'en' }, JOB_EN[job.id] || job.id),
      el('span', { class: 'panel-ja' }, src.label),
    ),
    el('dl', { class: 'context' },
      el('div', {}, el('dt', {}, '言語'), el('dd', {}, LANG_LABEL[lang] || lang)),
      el('div', {}, el('dt', {}, '目的'), el('dd', {}, src.purpose)),
      el('div', {}, el('dt', {}, '読み手'), el('dd', {}, src.reader_context)),
    ),
  );

  // 原文と最終稿
  const srcText = el('div', { class: 'text', lang });
  paintText(
    srcText,
    job.input,
    locate(job.input, changes.map((c) => ({ quote: c.before, n: c.n, after: c.after }))),
    (text, r) => el('mark', {
      class: r.after ? 'chg chg-edit' : 'chg chg-cut',
      'data-n': r.n,
      title: `変更${r.n}：${r.after ? '書き換え' : '削除'}`,
    }, text),
  );

  const finalText = el('div', { class: 'text', lang });
  ctx.finalText = finalText;

  const copyStatus = el('p', { class: 'copy-status', role: 'status' });
  const copyBtn = el('button', { type: 'button', class: 'btn btn-small' }, '最終稿をコピー');
  copyBtn.addEventListener('click', () => copyFinal(job.final, copyStatus));

  const compare = el('div', { class: 'compare' },
    el('article', { class: 'col col-src', 'aria-label': '原文' },
      el('h4', { class: 'col-title' }, '原文', el('span', { class: 'col-en', lang: 'en' }, 'Input')),
      srcText,
    ),
    el('article', { class: 'col col-out', 'aria-label': '最終稿' },
      el('h4', { class: 'col-title' }, '最終稿', el('span', { class: 'col-en', lang: 'en' }, 'Final')),
      finalText,
      el('div', { class: 'col-actions' }, copyBtn, copyStatus),
    ),
  );

  // 初稿と点検
  const draftId = `${job.id}-draft`;
  const draftText = el('div', { class: 'text', lang });
  const remaining = job.remaining_patterns || [];
  paintText(
    draftText,
    job.first_draft,
    locate(job.first_draft, remaining.map((p, i) => ({ quote: p.quote, n: i + 1 }))),
    (text, r) => el('mark', { class: 'rem', 'data-n': r.n }, text),
  );
  const draftBox = el('div', { id: draftId, class: 'draft', hidden: true },
    el('div', { class: 'draft-grid' },
      el('div', {},
        el('h4', { class: 'col-title' }, '初稿', el('span', { class: 'col-en', lang: 'en' }, 'First draft')),
        draftText,
        job.first_draft === job.final
          ? el('p', { class: 'small' }, '点検で直す箇所がなかったため、この初稿をそのまま最終稿にしています。')
          : null,
      ),
      el('div', {},
        el('h4', { class: 'col-title' }, '点検', el('span', { class: 'col-en', lang: 'en' }, 'Remaining patterns')),
        remaining.length === 0
          ? el('p', {}, '初稿に残った定型表現：なし')
          : el('ol', { class: 'plain-list' },
            remaining.map((p) => el('li', {},
              sectionChip(p.section),
              el('p', {}, quoteNode(p.quote, lang)),
              el('p', { class: 'reason' }, p.reason),
            )),
          ),
      ),
    ),
  );
  const draftToggle = el('button', {
    type: 'button',
    class: 'btn btn-small toggle',
    'aria-expanded': 'false',
    'aria-controls': draftId,
  }, '初稿と点検を見る');
  draftToggle.addEventListener('click', () => {
    const open = draftToggle.getAttribute('aria-expanded') !== 'true';
    draftToggle.setAttribute('aria-expanded', String(open));
    draftToggle.textContent = open ? '初稿と点検を閉じる' : '初稿と点検を見る';
    draftBox.hidden = !open;
  });

  // 変更点
  const changeList = el('ol', { class: 'change-list' },
    changes.map((c) => el('li', { class: 'change', 'data-n': c.n },
      el('p', { class: 'change-pair' },
        el('span', { class: 'pair-label' }, '原文'),
        el('span', { class: 'pair-before' }, quoteNode(c.before, lang)),
      ),
      el('p', { class: 'change-pair' },
        el('span', { class: 'pair-label' }, '最終稿'),
        c.after
          ? el('span', { class: 'pair-after' }, quoteNode(c.after, lang))
          : el('span', { class: 'pair-removed' }, '削除'),
      ),
      el('p', { class: 'chips' }, (c.sections || []).map(sectionChip)),
      el('p', { class: 'reason' }, c.reason),
    )),
  );

  // 残した条件
  const factDetail = el('div', { class: 'fact-detail', 'aria-live': 'polite' });
  ctx.factDetail = factDetail;
  const savedFacts = new Map((job.facts || []).map((f) => [f.id, f]));
  ctx.facts = (src.facts || []).map((f) => ({ ...f, saved: savedFacts.get(f.id) || null }));
  const factList = el('ul', { class: 'fact-list' },
    ctx.facts.map((f) => {
      const btn = el('button', {
        type: 'button',
        class: 'fact-btn',
        'aria-pressed': 'false',
        'data-fact': f.id,
      },
      el('span', { class: 'fact-id', lang: 'en' }, f.id),
      el('span', { class: 'fact-label' }, f.label));
      btn.addEventListener('click', () => toggleFact(ctx, f.id));
      ctx.factButtons.push(btn);
      return el('li', {}, btn);
    }),
  );

  // 印・省いた背景・説明
  const markList = el('ol', { class: 'plain-list marks' },
    (job.marks || []).map((m) => el('li', {},
      sectionChip(m.section),
      el('p', {}, quoteNode(m.quote, lang)),
      el('p', { class: 'reason' }, m.reason),
    )),
  );
  const omissions = job.context_omissions || [];
  const omissionBlock = el('section', { class: 'note-block' },
    el('h4', {}, '読み手が知っている背景として省いた箇所'),
    omissions.length === 0
      ? el('p', {}, 'なし。この文章の読み手は初めて読む利用者なので、背景は省いていません。')
      : el('ul', { class: 'plain-list' },
        omissions.map((o) => el('li', {},
          el('p', {}, quoteNode(o.quote, lang)),
          el('p', { class: 'reason' }, o.reason),
        )),
      ),
  );

  const notes = el('div', { class: 'notes' },
    el('section', { class: 'note-block note-changes' },
      el('h4', {}, '変更点', el('span', { class: 'col-en', lang: 'en' }, 'Changes')),
      changeList,
    ),
    el('section', { class: 'note-block note-facts' },
      el('h4', {}, '残した条件', el('span', { class: 'col-en', lang: 'en' }, 'Facts')),
      el('p', { class: 'small' }, '条件を選ぶと、最終稿の該当箇所が緑で示されます。原文と最終稿の文字列の対応を示すもので、意味が同じことの保証ではありません。'),
      factList,
      factDetail,
    ),
  );

  const lower = el('div', { class: 'lower' },
    el('section', { class: 'note-block' },
      el('h4', {}, '原文で印を付けた箇所（強いものから）'),
      markList,
    ),
    omissionBlock,
    el('section', { class: 'note-block explain' },
      el('h4', {}, 'この推敲のまとめ'),
      el('p', {}, job.explanation_ja),
    ),
  );

  panel.querySelector('.panel-body').replaceChildren(
    head,
    compare,
    el('div', { class: 'toggle-row' }, draftToggle),
    draftBox,
    notes,
    lower,
  );

  ctx.changes = changes;
  paintFinal(ctx);
  paintFactDetail(ctx);
}

function paintFinal(ctx) {
  const { job } = ctx;
  if (ctx.selected) {
    const fact = ctx.facts.find((f) => f.id === ctx.selected);
    const quote = fact && fact.saved ? fact.saved.final_quote : '';
    paintText(
      ctx.finalText,
      job.final,
      locate(job.final, [{ quote }]),
      (text) => el('mark', { class: 'keep' }, text),
    );
    return;
  }
  paintText(
    ctx.finalText,
    job.final,
    locate(job.final, ctx.changes.filter((c) => c.after).map((c) => ({ quote: c.after, n: c.n }))),
    (text, r) => el('mark', { class: 'chg chg-edit', 'data-n': r.n, title: `変更${r.n}：書き換え後` }, text),
  );
}

function paintFactDetail(ctx) {
  const lang = ctx.job.language;
  if (!ctx.selected) {
    ctx.factDetail.replaceChildren(el('p', { class: 'small muted' }, '条件はまだ選ばれていません。'));
    return;
  }
  const fact = ctx.facts.find((f) => f.id === ctx.selected);
  const saved = fact.saved;
  const found = saved && ctx.job.final.includes(saved.final_quote);
  ctx.factDetail.replaceChildren(...[
    el('p', { class: 'fact-head' },
      el('span', { class: 'fact-id', lang: 'en' }, fact.id),
      el('span', {}, fact.label),
    ),
    el('dl', { class: 'fact-quotes' },
      el('div', {}, el('dt', {}, '原文'), el('dd', {}, quoteNode(fact.source_quote, lang))),
      el('div', {}, el('dt', {}, '最終稿'),
        el('dd', {}, saved ? quoteNode(saved.final_quote, lang) : '結果データに対応する引用がありません。')),
    ),
    saved ? el('p', { class: 'reason' }, saved.note) : null,
    saved && !found ? el('p', { class: 'small warn' }, 'この引用は最終稿の中に見つかりませんでした。') : null,
  ].filter(Boolean));
}

function toggleFact(ctx, id) {
  ctx.selected = ctx.selected === id ? null : id;
  for (const btn of ctx.factButtons) {
    btn.setAttribute('aria-pressed', String(btn.dataset.fact === ctx.selected));
  }
  paintFinal(ctx);
  paintFactDetail(ctx);
}

async function copyFinal(text, status) {
  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
    status.textContent = 'このブラウザーではコピー機能を使えません。最終稿の文章を選択してコピーしてください。';
    return;
  }
  status.textContent = '';
  try {
    await navigator.clipboard.writeText(text);
    status.textContent = '最終稿をコピーしました。';
  } catch {
    status.textContent = 'コピーできませんでした（ブラウザーが許可しませんでした）。最終稿の文章を選択してコピーしてください。';
  }
}

// --- 起動 ---

function scrollToHashTarget() {
  const target = hashTarget();
  if (!target) return;
  const node = document.getElementById(target);
  if (node) node.scrollIntoView({ block: 'start' });
}

async function main() {
  setupTabs();
  selectTab(jobFromHash() || 'release');

  let source;
  let result;
  try {
    [source, result] = await Promise.all([getJSON(SOURCE_PATH), getJSON(RESULT_PATH)]);
    checkShape(source, result);
  } catch (error) {
    showLoadError(error);
    return;
  }

  for (const id of JOB_IDS) {
    const panel = document.getElementById(id);
    const src = source.jobs.find((j) => j.id === id);
    const job = result.jobs.find((j) => j.id === id);
    if (job.input !== src.input) {
      renderMismatch(panel, id);
      continue;
    }
    renderJob(panel, src, job);
  }

  // 非同期の描画で高さが変わるため、URLの断片が指す位置へ合わせ直す
  const fromHash = jobFromHash();
  if (fromHash) selectTab(fromHash);
  scrollToHashTarget();
}

main();
