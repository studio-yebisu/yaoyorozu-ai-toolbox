// 八百万図AIツールボックス original. MIT. 入力はこのページの中だけで計算し、外へ送らない。
import { searchEntries } from './search.mjs';
import { searchEntries as searchBefore } from './baseline/search.mjs';

const $ = id => document.getElementById(id);
const CYCLE_TITLES = ['表記ゆれとタグ', '語を足して絞る', '分野で選ぶ'];

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

async function load(path, as) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(path + ' を読み込めません（HTTP ' + response.status + '）');
  return as === 'text' ? response.text() : response.json();
}

const ids = list => list.map(entry => entry.id);
const sameIds = (a, b) => a.length === b.length && a.every((id, i) => id === b[i]);
const idText = list => (list.length ? list.join('、') : 'なし（0件）');
const queryText = query => (query === '' ? '（空）' : JSON.stringify(query));
const short = hash => hash.slice(0, 8);
const jst = iso => new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit'
}).format(new Date(iso)) + '（日本時間）';

// ---- 結果のカード ----
function card(entry, flag) {
  const item = node('li', 'card');
  item.append(node('p', 'card-title', entry.title));
  const meta = node('p', 'card-meta');
  meta.append(node('span', 'card-id', entry.id), node('span', 'card-category', '分野 ' + entry.category));
  item.append(meta);
  const tags = node('ul', 'tags');
  tags.setAttribute('aria-label', entry.title + 'のタグ');
  for (const tag of entry.tags) tags.append(node('li', 'tag', tag));
  item.append(tags);
  if (flag) {
    item.classList.add('card-only');
    item.append(node('p', 'card-flag', flag));
  }
  return item;
}

function fill(list, empty, count, entries, otherIds, flag) {
  list.replaceChildren(...entries.map(entry => card(entry, otherIds.has(entry.id) ? '' : flag)));
  empty.hidden = entries.length > 0;
  list.hidden = entries.length === 0;
  count.textContent = entries.length + '件';
}

// ---- 検索 ----
function setupSearch({ entries, samples, acceptance }) {
  const form = $('search-form');
  const query = $('query');
  const category = $('category');
  const presets = [...document.querySelectorAll('.preset')];

  for (const link of presets) {
    const sample = samples.find(s => s.id === link.dataset.sample);
    if (!sample) throw new Error('samples.json に ' + link.dataset.sample + ' がありません');
    link.replaceChildren(node('b', '', sample.label), node('span', '', sample.input));
  }

  function markPreset() {
    for (const link of presets) {
      const sample = samples.find(s => s.id === link.dataset.sample);
      const current = sample.query === query.value && sample.category === category.value;
      if (current) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  }

  function provenance(before, after) {
    const sample = samples.find(s => s.query === query.value && s.category === category.value);
    const check = acceptance.checks_detail.find(c => c.query === query.value && c.category === category.value);
    if (sample) {
      const match = sameIds(ids(before), sample.before_ids) && sameIds(ids(after), sample.after_ids);
      return { kind: match ? 'saved' : 'mismatch', text: '保存した例「' + sample.label + '」と同じ入力です。いまの計算は、制作時に保存した変更前' + sample.before_ids.length + '件・変更後' + sample.after_ids.length + '件（samples.json）と' + (match ? '一致しています。' : '一致しません。') };
    }
    if (check) {
      const match = sameIds(ids(after), check.expected);
      return { kind: match ? 'saved' : 'mismatch', text: '制作時の受け入れ確認「' + check.id + '」と同じ入力です。いまの変更後の計算は、保存した期待値' + check.expected.length + '件（acceptance.json）と' + (match ? '一致しています。' : '一致しません。') };
    }
    return { kind: 'live', text: '新しい入力です。結果はこのページでその場に計算したもので、制作時のテストや受け入れ確認では確かめていません。' };
  }

  function run() {
    const options = { category: category.value };
    const before = searchBefore(entries, query.value, options);
    const after = searchEntries(entries, query.value, options);
    const beforeIds = new Set(ids(before));
    const afterIds = new Set(ids(after));
    fill($('before-list'), $('before-empty'), $('before-count'), before, afterIds, '変更前だけ');
    fill($('after-list'), $('after-empty'), $('after-count'), after, beforeIds, '変更後だけ');
    $('summary').textContent = '検索語 ' + queryText(query.value) + '・分野 ' + category.value + '：変更前 ' + before.length + '件、変更後 ' + after.length + '件';
    const origin = provenance(before, after);
    $('provenance').textContent = origin.text;
    $('provenance').dataset.kind = origin.kind;
    markPreset();
  }

  function applyPreset(id) {
    const sample = samples.find(s => s.id === id);
    if (!sample) return false;
    query.value = sample.query;
    category.value = sample.category;
    run();
    return true;
  }

  function edited() {
    if (samples.some(s => '#' + s.id === location.hash)) history.replaceState(null, '', location.pathname + location.search);
    run();
  }

  form.addEventListener('submit', event => event.preventDefault());
  query.addEventListener('input', edited);
  category.addEventListener('change', edited);
  for (const link of presets) link.addEventListener('click', () => applyPreset(link.dataset.sample));
  window.addEventListener('hashchange', () => applyPreset(location.hash.slice(1)));

  $('all-list').replaceChildren(...entries.map(entry => card(entry, '')));
  $('boot-note').hidden = true;
  $('outcome').hidden = false;
  if (!applyPreset(location.hash.slice(1))) applyPreset(samples[0].id);
}

// ---- 実行記録 ----
function listAfter(lines, key) {
  const start = lines.indexOf('  ' + key + ':');
  if (start < 0) return null;
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    const match = lines[i].match(/^ {4}\d+: '(.*)'$/);
    if (!match) break;
    out.push(match[1]);
  }
  return out;
}

function failure(tap) {
  const lines = tap.split('\n');
  const head = lines.findIndex(line => /^not ok \d+ - /.test(line));
  if (head < 0) return null;
  const end = lines.indexOf('  ...', head);
  const block = lines.slice(head, end < 0 ? undefined : end);
  return {
    name: lines[head].replace(/^not ok \d+ - /, ''),
    code: (block.find(line => line.startsWith('  code: ')) || '').replace(/^ {2}code: '?|'$/g, ''),
    expected: listAfter(block, 'expected'),
    actual: listAfter(block, 'actual')
  };
}

const passedNames = tap => tap.split('\n').filter(line => /^ok \d+ - /.test(line)).map(line => line.replace(/^ok \d+ - /, ''));

function runBox(kind, run, detail) {
  const box = node('div', 'run run-' + kind);
  box.append(node('p', 'run-badge', kind === 'red' ? 'RED 失敗' : 'GREEN 成功'));
  const line = kind === 'red'
    ? run.tests + '件中 ' + run.fail + '件が失敗（成功 ' + run.pass + '件・終了コード ' + run.exit_code + '）'
    : run.tests + '件中 ' + run.pass + '件が成功（失敗 ' + run.fail + '件・終了コード ' + run.exit_code + '）';
  box.append(node('p', 'run-count', line));
  if (detail) box.append(detail);
  box.append(node('p', 'run-time', jst(run.executed_at)));
  return box;
}

function setupHistory(history) {
  const runs = new Map(history.runs.map(run => [run.phase, run]));
  const baseline = runs.get('baseline');
  if (!baseline) throw new Error('tdd-history.json に baseline がありません');
  $('tdd-node').textContent = 'Node ' + baseline.node;
  $('baseline-line').textContent = '変更前（baseline）：既存のテスト ' + baseline.tests + '件、成功 ' + baseline.pass + '件。';

  const items = CYCLE_TITLES.map((title, i) => {
    const red = runs.get('red' + (i + 1));
    const green = runs.get('green' + (i + 1));
    if (!red || !green) throw new Error('tdd-history.json に段' + (i + 1) + 'の記録がありません');
    const item = node('li', 'cycle');
    item.append(node('h3', 'cycle-title', '段' + (i + 1) + '　' + title));
    const fail = failure(red.tap);
    if (fail) {
      const name = node('p', 'cycle-test');
      name.append(node('span', 'cycle-label', '足したテスト'), document.createTextNode(fail.name));
      item.append(name);
    }
    let detail = null;
    if (fail && fail.expected && fail.actual) {
      detail = node('dl', 'run-diff');
      detail.append(node('dt', '', '期待'), node('dd', '', idText(fail.expected)), node('dt', '', '実際'), node('dd', '', idText(fail.actual)));
      if (fail.code) detail.append(node('dt', '', '種類'), node('dd', '', fail.code + '（期待との不一致）'));
    }
    const pair = node('div', 'run-pair');
    pair.append(runBox('red', red, detail), node('span', 'run-arrow', '→'), runBox('green', green, null));
    item.append(pair);
    const changed = red.source_sha256['search.mjs'] !== green.source_sha256['search.mjs'];
    const sameTest = red.source_sha256['search.test.mjs'] === green.source_sha256['search.test.mjs'];
    item.append(node('p', 'cycle-hash', 'search.mjs ' + short(red.source_sha256['search.mjs']) + ' → ' + short(green.source_sha256['search.mjs']) + (changed ? '' : '（変化なし）') + '／テスト ' + short(green.source_sha256['search.test.mjs']) + (sameTest ? '（失敗時と同じ）' : '（失敗時と異なる）')));
    const links = node('p', 'cycle-files');
    for (const [label, href] of [['失敗時のテスト', 'tdd/red' + (i + 1) + '/search.test.mjs'], ['失敗時のコード', 'tdd/red' + (i + 1) + '/search.mjs'], ['成功時のコード', 'tdd/green' + (i + 1) + '/search.mjs'], ['記録', 'tdd/green' + (i + 1) + '/record.json']]) {
      const link = node('a', '', label);
      link.href = href;
      links.append(link);
    }
    item.append(links);
    return item;
  });
  $('cycles').replaceChildren(...items);

  const last = runs.get('green3');
  $('test-names').replaceChildren(...passedNames(last.tap).map(name => node('li', '', name)));
}

function setupAcceptance(acceptance) {
  const passed = acceptance.checks_detail.filter(check => check.passed).length;
  const line = $('acceptance-line');
  line.replaceChildren(
    document.createTextNode('制作時に、テストとは別の受け入れ確認（'),
    Object.assign(node('a', '', 'acceptance.json'), { href: 'acceptance.json' }),
    document.createTextNode('）も行い、' + acceptance.checks_detail.length + '項目中 ' + passed + '項目が期待どおりでした。空白だけの検索語、未知の分野、分野名や識別子を検索語にした場合、半角カタカナ、記号を含む入力などです。' + (acceptance.new_array_and_no_input_mutation ? '毎回新しい配列を返し、渡したデータを変えていないことも確かめています。' : ''))
  );
  $('acceptance-rows').replaceChildren(...acceptance.checks_detail.map(check => {
    const row = node('tr');
    row.append(node('th', '', check.id), node('td', 'mono', queryText(check.query)), node('td', '', check.category), node('td', '', idText(check.expected)), node('td', '', check.passed ? '一致' : '不一致'));
    row.firstChild.scope = 'row';
    return row;
  }));
}

// ---- 依頼文のコピー ----
function setupCopy(text) {
  const button = $('copy-request');
  const status = $('copy-status');
  const pre = $('request-text');
  pre.textContent = text;
  button.addEventListener('click', async () => {
    try {
      // Preserve the user gesture for embedded browsers that do not bridge the async clipboard API.
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.append(area);
      area.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } finally { area.remove(); }
      if (!copied) await navigator.clipboard.writeText(text);
      button.focus({preventScroll:true});
      status.textContent = 'コピーしました。';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(pre);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = 'コピーできなかったため、依頼文を選択しました。Ctrl+C（Mac は ⌘+C）でコピーしてください。';
    }
  });
}

function showError(error) {
  const note = $('boot-note');
  note.hidden = false;
  note.classList.add('boot-error');
  note.textContent = 'データを読み込めませんでした（' + error.message + '）。README の手順で、このフォルダをローカルのサーバーから開いてください。';
}

(async () => {
  try {
    const [entries, samplesFile, acceptance, history, request, before, after] = await Promise.all([
      load('entries.json'), load('samples.json'), load('acceptance.json'), load('tdd-history.json'),
      load('request.txt', 'text'), load('baseline/search.mjs', 'text'), load('search.mjs', 'text')
    ]);
    setupSearch({ entries, samples: samplesFile.samples, acceptance });
    setupHistory(history);
    setupAcceptance(acceptance);
    setupCopy(request);
    $('code-before').textContent = before;
    $('code-after').textContent = after;
  } catch (error) {
    showError(error);
  }
})();
