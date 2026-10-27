// 八百万図AIツールボックス example guide. MIT.
// Drives the existing controls only; filtering stays in tasks.mjs through app.mjs.
const el = id => document.getElementById(id);
const presets = [...document.querySelectorAll('[data-preset]')];
let saved;
let edited = false;

function applyPreset(link) {
  el('status').value = link.dataset.status;
  el('cutoff').value = link.dataset.cutoff;
  el('cutoff').dispatchEvent(new Event('input'));
}

function fromHash() {
  const link = presets.find(item => '#' + item.dataset.preset === location.hash);
  if (link) applyPreset(link);
}

function describe() {
  const match = presets.find(link => link.dataset.status === el('status').value && link.dataset.cutoff === el('cutoff').value);
  for (const link of presets) {
    if (link === match) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  }
  const total = Number((/全(\d+)件/.exec(el('count').textContent) || [])[1] || 0);
  if (total && total !== 6) edited = true;
  const origin = el('origin');
  if (!total) {origin.textContent = ''; return;}
  if (edited) {origin.textContent = '追加や完了の切り替えをした後の一覧です。このページのメモリー上の結果で、保存した記録とは比べていません。再読込すると合成データ6件に戻ります。'; return;}
  if (!el('cutoff-error').hidden) {origin.textContent = '期限の日付を使えないため、状態の絞り込みだけの一覧です。'; return;}
  if (!match) {origin.textContent = '記録した3つの例にない条件です。tasks.mjs がこの場で計算した一覧で、制作時の記録とは比べていません。'; return;}
  if (saved === undefined) {origin.textContent = ''; return;}
  const record = saved && saved.get(match.dataset.preset);
  if (!record) {origin.textContent = '記録（results.json）を読めないため、保存した結果とは比べていません。一覧は tasks.mjs がこの場で計算しています。'; return;}
  const shown = [...el('tasks').children].map(item => item.dataset.id).join(',');
  const expected = record.after.map(task => task.id).join(',');
  const label = match.querySelector('b').textContent;
  origin.textContent = shown === expected
    ? `例「${label}」と同じ入力です。この場で計算した${record.after.length}件は、制作時に Node ${saved.node} で保存した結果（results.json）と同じ並びです。`
    : `例「${label}」と同じ入力ですが、この場の一覧は保存した結果（${record.after.length}件）と違います。`;
}

for (const link of presets) link.addEventListener('click', () => applyPreset(link));
window.addEventListener('hashchange', fromHash);
el('tasks').addEventListener('change', event => {
  if (event.target.type === 'checkbox') edited = true;
});
const observer = new MutationObserver(describe);
observer.observe(el('count'), {childList: true, characterData: true, subtree: true});
observer.observe(el('tasks'), {childList: true});
observer.observe(el('cutoff-error'), {attributes: true, attributeFilter: ['hidden']});

el('copy-request').addEventListener('click', () => {
  const area = el('request');
  const status = el('copy-status');
  const done = () => {status.textContent = '依頼文をコピーしました。';};
  const fallback = () => {
    area.focus();
    area.select();
    status.textContent = '自動ではコピーできませんでした。依頼文を選択したので、Ctrl+C（Mac は Command+C）でコピーしてください。';
  };
  area.focus();
  area.select();
  area.setSelectionRange(0, area.value.length);
  let copied = false;
  try {copied = document.execCommand('copy');} catch {copied = false;}
  if (copied) return done();
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(area.value).then(done, fallback);
  else fallback();
});

fromHash();
try {
  const response = await fetch('results.json');
  if (!response.ok) throw new Error('results');
  const data = await response.json();
  saved = {node: data.node, get: id => data.samples.find(sample => sample.id === id)};
} catch {
  saved = null;
}
describe();
