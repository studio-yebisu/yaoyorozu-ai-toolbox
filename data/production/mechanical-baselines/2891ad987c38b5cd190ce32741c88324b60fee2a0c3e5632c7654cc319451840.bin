// 八百万図AIツールボックス: LangGraph concept map (visual-r1).
// One connected picture of what LangGraph is (a Python library), who wrote and who ran this example, and how one
// fictional request travels as a shared state card through five rule-based Python functions, stops at review, is
// resumed by a scripted test reply and comes back as a saved record. The browser only reads the frozen files named in
// concept/manifest.json: it never runs Python, LangGraph or a model, and every value on the card is read from the
// original saved run records. video/video.js imports this same module for the 32 s film.

const BASE = new URL('./', import.meta.url);
const MANIFEST_PATH = 'concept/manifest.json';
const MANIFEST_SHA = '3147f2fff01f9ae8e548ebd4af6084648f357232d49b0bdb2530916feaedf4ed';
const CASE = 'langgraph-example';
export const COMMIT = 'd4149cc1f5384364d1a21092b4c2f582a6e7af8f';
export const REPO = 'langchain-ai/langgraph';
export const CASE_IDS = ['approved', 'missing', 'rejected'];
export const LETTER = {approved: 'A', missing: 'B', rejected: 'C'};
export const PART_IDS = ['state', 'edges', 'compile', 'memory', 'interrupt', 'resume'];
export const TOTAL_FILES = 21;

const PACKAGES = {'langgraph': '1.2.15', 'langgraph-checkpoint': '4.3.0', 'langgraph-prebuilt': '1.1.0', 'langgraph-sdk': '0.4.7'};
const NODES = ['validate', 'needs_input', 'estimate', 'review', 'finalize'];
const GRAPH_EDGES = [['START', 'validate'], ['validate', 'needs_input'], ['validate', 'estimate'], ['needs_input', 'END'],
  ['estimate', 'review'], ['review', 'finalize'], ['finalize', 'END']];
const STATE_PY = 'vendor/langgraph/libs/langgraph/langgraph/graph/state.py';
const TYPES_PY = 'vendor/langgraph/libs/langgraph/langgraph/types.py';
const MEMORY_PY = 'vendor/langgraph/libs/checkpoint/langgraph/checkpoint/memory/__init__.py';
// The six frozen quotes and the line each one sits on at the fixed commit.
const QUOTES = {
  state: [STATE_PY, 132, 'A graph whose nodes communicate by reading and writing to a shared state.'],
  edges: [STATE_PY, 990, 'Add a conditional edge from the starting node to any number of destination nodes.'],
  compile: [STATE_PY, 1189, 'Compiles the `StateGraph` into a `CompiledStateGraph` object.'],
  memory: [MEMORY_PY, 37, 'An in-memory checkpoint saver.'],
  interrupt: [TYPES_PY, 906, 'Interrupt the graph with a resumable exception from within a node.'],
  resume: [TYPES_PY, 842, 'resume: Value to resume execution with.'],
};
// Facts of the three original jobs. They are read back from the saved records, never produced here.
const FROZEN = {
  approved: {status: 'approved', total: 8000, flag: false, reply: true, interrupts: 1, checkpoints: 6, items: [['camera', 1], ['tripod', 2]]},
  missing: {status: 'needs_input', total: null, flag: null, reply: null, interrupts: 0, checkpoints: 4, items: [['camera', 1]]},
  rejected: {status: 'rejected', total: 36000, flag: true, reply: false, interrupts: 1, checkpoints: 6, items: [['camera', 4], ['light', 3]]},
};
const SCHEMA_ROWS = ['request', 'status', 'total_yen', 'review'];
const EXPECTED = [
  'concept/structure.json', 'concept/original-run.json',
  'concept/jobs/approved.json', 'concept/jobs/missing.json', 'concept/jobs/rejected.json',
  'inputs/requests.json', 'outputs/runs.json', 'outputs/result.md', 'samples.json', 'request.txt', 'workflow.py',
  'verification.json', 'vendor/langgraph/README.md', 'vendor/langgraph/LICENSE', STATE_PY, TYPES_PY, MEMORY_PY,
  'vendor/langgraph/libs/langgraph/pyproject.toml', 'vendor/langgraph/libs/checkpoint/pyproject.toml',
  'vendor/langgraph/libs/prebuilt/pyproject.toml', 'vendor/langgraph/libs/sdk-py/pyproject.toml',
];
// Lines of the original workflow.py this picture depends on. Read as text, never executed.
const WORKFLOW_FACTS = [
  'builder = StateGraph(RequestState)',
  'builder.add_node("validate", validate)',
  'builder.add_node("needs_input", needs_input)',
  'builder.add_node("estimate", estimate)',
  'builder.add_node("review", review)',
  'builder.add_node("finalize", finalize)',
  'builder.add_edge(START, "validate")',
  'builder.add_conditional_edges(',
  'if state.get("missing_fields") or state.get("input_errors"):',
  'builder.add_edge("estimate", "review")',
  'return builder.compile(checkpointer=InMemorySaver())',
  '"subtotal_yen": item["quantity"] * entry["unit_yen"],',
  'decision = interrupt(payload, response_schema=ReviewDecision)',
  'class ReviewDecision(BaseModel):',
  'config = {"configurable": {"thread_id": thread_id}}',
  'first = graph.invoke({"job_id": job["id"], "request": copy.deepcopy(job["request"])}, config=config)',
  'resumed = graph.invoke(Command(resume=copy.deepcopy(job["test_resume"])), config=config)',
];

export const assetURL = path => new URL(path, BASE).href;
const num = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export const yen = n => num(n) + '円';

export class LoadError extends Error {}
const fail = message => new LoadError(message);
const check = (ok, message) => { if (!ok) throw fail(message); };
const utf8 = new TextDecoder('utf-8', {fatal: true});
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const hasOwn = (o, key) => Object.prototype.hasOwnProperty.call(o, key);

function same(a, b) {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(key => hasOwn(b, key) && same(a[key], b[key]));
}

async function sha256(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

async function fetchBytes(path, signal) {
  let response;
  try {
    response = await fetch(assetURL(path), {cache: 'no-store', credentials: 'same-origin', signal});
  } catch (error) {
    if (signal.aborted) throw error;
    throw fail(`${path} を取得できません`);
  }
  if (!response.ok) throw fail(`${path}：HTTP ${response.status}`);
  return response.arrayBuffer();
}

function readText(path, buffer) {
  try { return utf8.decode(buffer); } catch { throw fail(`${path}：UTF-8として読めません`); }
}

function readJSON(path, text) {
  try { return JSON.parse(text); } catch { throw fail(`${path}：JSONとして読めません`); }
}

// Loads the 21 frozen files named by concept/manifest.json and checks size, SHA-256 and meaning before anything is
// drawn. Nothing is fetched again per frame.
export async function loadAssets({signal, onProgress = () => {}} = {}) {
  if (!globalThis.crypto || !crypto.subtle) {
    throw fail('SHA-256を確かめるには、HTTPS か localhost で開いてください（crypto.subtle を使えません）');
  }
  const local = new AbortController();
  const abort = () => local.abort();
  if (signal) { if (signal.aborted) local.abort(); else signal.addEventListener('abort', abort, {once: true}); }
  const report = info => { if (!local.signal.aborted) onProgress(info); };
  try {
    const manifestBuffer = await fetchBytes(MANIFEST_PATH, local.signal);
    check(await sha256(manifestBuffer) === MANIFEST_SHA, 'concept/manifest.json のSHA-256が固定値と違います');
    const manifest = readJSON(MANIFEST_PATH, readText(MANIFEST_PATH, manifestBuffer));
    const entries = isObj(manifest) && Array.isArray(manifest.files) ? manifest.files : [];
    const listed = new Set(entries.map(entry => (isObj(entry) ? entry.path : null)));
    check(manifest.format === 'langgraph-visual-assets/v1' && manifest.case_id === CASE && manifest.source_commit === COMMIT &&
      entries.length === TOTAL_FILES && listed.size === TOTAL_FILES && EXPECTED.every(path => listed.has(path)) &&
      entries.every(entry => Number.isInteger(entry.bytes) && entry.bytes > 0 && /^[0-9a-f]{64}$/.test(entry.sha256)),
    '確認する21件の一覧が違います');

    const bytes = new Map();
    const hashes = new Map(entries.map(entry => [entry.path, entry.sha256]));
    const sizes = new Map(entries.map(entry => [entry.path, entry.bytes]));
    let done = 0;
    report({done, total: TOTAL_FILES});
    await Promise.all(entries.map(async entry => {
      const buffer = await fetchBytes(entry.path, local.signal);
      check(buffer.byteLength === entry.bytes, `${entry.path}：大きさが違います（${buffer.byteLength}／${entry.bytes}バイト）`);
      check(await sha256(buffer) === entry.sha256, `${entry.path}：SHA-256が違います`);
      bytes.set(entry.path, buffer);
      report({done: ++done, total: TOTAL_FILES});
    }).map(task => task.catch(error => { local.abort(); throw error; })));
    if (local.signal.aborted) throw signal && signal.aborted ? new DOMException('aborted', 'AbortError') : fail('読み込みを中断しました');

    const texts = new Map();
    const text = path => {
      if (!texts.has(path)) texts.set(path, readText(path, bytes.get(path)));
      return texts.get(path);
    };
    try {
      return validate(text, path => readJSON(path, text(path)), hashes, sizes);
    } catch (error) {
      throw error instanceof LoadError ? error : fail('保存記録の形が想定と違います');
    }
  } catch (error) {
    local.abort();
    throw error;
  } finally {
    if (signal) signal.removeEventListener('abort', abort);
  }
}

// Meaning checks on the saved records. They read what the original run wrote; they are not a new graph run.
function validate(text, json, hashes, sizes) {
  const structure = json('concept/structure.json');
  check(isObj(structure) && structure.format === 'langgraph-structure/v1' && structure.case_id === CASE &&
    structure.source_commit === COMMIT && typeof structure.definition === 'string', 'structure.json の形式か固定コミットが違います');
  const parts = Array.isArray(structure.parts) ? structure.parts : [];
  check(parts.map(part => (isObj(part) ? part.id : null)).join() === PART_IDS.join(), 'structure.json の6部品が違います');
  for (const part of parts) {
    const [path, line, quote] = QUOTES[part.id];
    check(part.source_path === path && part.upstream_path === path.replace(/^vendor\/langgraph\//, '') &&
      part.line_start === line && part.quote === quote && typeof part.label === 'string' && typeof part.meaning === 'string',
    `${part.id}：引用の記録が違います`);
    const source = text(path).split(/\r?\n/)[line - 1];
    check(typeof source === 'string' && source.includes(quote), `${path}:${line} に引用の文がありません`);
  }
  const graph = isObj(structure.graph) ? structure.graph : {};
  check(same(graph.nodes, NODES) && same(graph.edges, GRAPH_EDGES), 'structure.json のノードと辺が workflow.py の5ノードと違います');
  check(Array.isArray(structure.state_fields) && SCHEMA_ROWS.every(field => structure.state_fields.includes(field)),
    'structure.json の state の項目が違います');
  const summaries = Array.isArray(structure.jobs) ? structure.jobs : [];
  check(summaries.map(job => (isObj(job) ? job.id : null)).join() === CASE_IDS.join(), 'structure.json の3件が違います');

  const requests = json('inputs/requests.json');
  const rules = isObj(requests) && isObj(requests.rules) ? requests.rules : {};
  check(requests.fictional === true && rules.all_complete_requests_pause_for_review === true &&
    rules.budget_review_from_yen === 30000 && Array.isArray(rules.catalog) &&
    same(rules.catalog.map(entry => [entry.sku, entry.unit_yen]), [['camera', 6000], ['tripod', 1000], ['light', 4000]]) &&
    Array.isArray(requests.jobs) && requests.jobs.length === 3, 'inputs/requests.json の架空の入力・単価表が違います');

  const runs = json('outputs/runs.json');
  const framework = isObj(runs) && isObj(runs.framework) ? runs.framework : {};
  check(runs.fictional === true && framework.name === 'LangGraph' && framework.version === '1.2.15' &&
    framework.commit === COMMIT && same(framework.packages, PACKAGES) && same(runs.rules, rules) &&
    Array.isArray(runs.jobs) && runs.jobs.length === 3, 'outputs/runs.json の版・規則が違います');

  const samples = json('samples.json');
  check(isObj(samples) && samples.format === 'input-output' && Array.isArray(samples.samples) && samples.samples.length === 3,
    'samples.json の形式が違います');

  const jobs = {}, jobTexts = {};
  CASE_IDS.forEach((id, i) => {
    const path = `concept/jobs/${id}.json`;
    const job = json(path);
    check(same(job, runs.jobs[i]), `${path}：outputs/runs.json の jobs[${i}] と同じ記録ではありません`);
    const request = requests.jobs[i], sample = samples.samples[i], summary = summaries[i];
    check(isObj(request) && request.id === id && same(request.request, job.input) && same(request.test_resume, job.test_resume),
      `${path}：入力（inputs/requests.json）と違います`);
    check(isObj(sample) && sample.id === id && same(sample.input, job.input) && same(sample.output, job.final),
      `${path}：samples.json の入力と最終stateの対と違います`);
    check(summary.record_path === path && summary.record_bytes === sizes.get(path) && summary.label === job.label &&
      summary.thread_id === job.thread_id, `structure.json の ${id} が記録と違います`);
    checkJob(id, job, summary, rules);
    jobs[id] = job;
    jobTexts[id] = text(path);
  });

  const original = json('concept/original-run.json');
  const of = isObj(original) && isObj(original.framework) ? original.framework : {};
  const rt = isObj(original.runtime) ? original.runtime : {};
  const dc = isObj(original.original_data_checks) ? original.original_data_checks : {};
  const receipts = Array.isArray(original.original_model_receipts) ? original.original_model_receipts : [];
  check(of.name === 'LangGraph' && of.version === '1.2.15' && of.commit === COMMIT && same(of.packages, PACKAGES) &&
    rt.status === 'passed' && rt.sample_count === 3 && rt.human_approval === false &&
    receipts.map(receipt => (isObj(receipt) ? receipt.phase : null)).join() === 'implement,video' &&
    dc.status === 'passed' && dc.sample_count === 3 && dc.human_approval === false && dc.external_connections_attempted === 0 &&
    dc.installed_runtime_files_equal_fixed_source === 157 && dc.source_files_unchanged === 172 &&
    dc.input_sha256 === hashes.get('inputs/requests.json') && dc.output_sha256 === hashes.get('outputs/runs.json') &&
    dc.sample_sha256 === hashes.get('samples.json') && dc.workflow_sha256 === hashes.get('workflow.py'),
  'concept/original-run.json の元の記録（版・件数・ハッシュ）が違います');
  const totals = Array.isArray(dc.summary) ? dc.summary : [];
  check(totals.length === 3 && CASE_IDS.every((id, i) => isObj(totals[i]) && totals[i].id === id &&
    totals[i].status === FROZEN[id].status && totals[i].total_yen === FROZEN[id].total &&
    totals[i].interrupt_count === FROZEN[id].interrupts && totals[i].checkpoints === FROZEN[id].checkpoints),
  'concept/original-run.json の3件の要約が記録と違います');

  const verification = json('verification.json');
  const vc = isObj(verification) && isObj(verification.data_checks) ? verification.data_checks : {};
  check(verification.id === CASE && verification.source_commit === COMMIT && vc.human_approval === false &&
    vc.output_sha256 === hashes.get('outputs/runs.json'), 'verification.json の元の確認記録が違います');

  const workflow = text('workflow.py');
  for (const line of WORKFLOW_FACTS) check(workflow.includes(line), `workflow.py に「${line}」がありません`);
  const request = text('request.txt');
  check(request.includes(COMMIT) && request.includes('InMemorySaver') && request.includes('Command(resume=テスト値)'),
    'request.txt の依頼文が違います');
  const memo = text('outputs/result.md');
  check(memo.startsWith('# LangGraph 作例：機材貸出申請の実行結果') && memo.includes('8,000円') && memo.includes('36,000円'),
    'outputs/result.md の結果メモが違います');
  check(text('vendor/langgraph/README.md').includes('LangGraph'), 'vendor/langgraph/README.md が違います');
  const license = text('vendor/langgraph/LICENSE');
  check(license.includes('MIT License') && license.includes('Copyright (c) 2024 LangChain, Inc.'), 'vendor/langgraph/LICENSE が違います');
  const pyproject = (dir, name, version) => {
    const body = text(`vendor/langgraph/libs/${dir}/pyproject.toml`);
    check(body.includes(`name = "${name}"`) && body.includes(version ? `version = "${version}"` : 'dynamic = ["version"]'),
      `${dir}/pyproject.toml の名前か版が違います`);
  };
  pyproject('langgraph', 'langgraph', '1.2.15');
  pyproject('checkpoint', 'langgraph-checkpoint', '4.3.0');
  pyproject('prebuilt', 'langgraph-prebuilt', '1.1.0');
  pyproject('sdk-py', 'langgraph-sdk', null);

  return {
    structure,
    parts,
    jobs,
    jobTexts,
    request,
    sheets: Object.fromEntries(CASE_IDS.map(id => [id, jobs[id].checkpoints.length])),
  };
}

function checkJob(id, job, summary, rules) {
  const want = FROZEN[id];
  const where = `concept/jobs/${id}.json`;
  check(isObj(job) && job.id === id && job.thread_id === `studio-yebisu-langgraph-example-${id}` && isObj(job.input) &&
    isObj(job.final) && isObj(job.end_state) && same(job.end_state.values, job.final) && same(job.end_state.next, []) &&
    isObj(job.checks) && job.checks.interrupt_count === want.interrupts && job.checks.expected_status === want.status,
  `${where}：最終stateの記録が違います`);
  const final = job.final;
  const cps = Array.isArray(job.checkpoints) ? job.checkpoints : [];
  check(cps.length === want.checkpoints && cps.every(cp => isObj(cp) && isObj(cp.values) && Array.isArray(cp.next) &&
    Array.isArray(cp.interrupt_ids)) && same(cps[0].values, {}) && same(cps[cps.length - 1].values, final) &&
    isObj(cps[1].values.request) && same(cps[1].values.request, job.input),
  `${where}：チェックポイントは${want.checkpoints}件のはずです`);
  check(Array.isArray(job.input.items) && same(job.input.items.map(item => [item.sku, item.quantity]), want.items),
    `${where}：申請の品目が違います`);
  const route = [];
  for (const cp of cps) for (const node of cp.next) if (node !== '__start__' && route[route.length - 1] !== node) route.push(node);
  route.push('END');
  check(same(route, summary.route) && final.status === want.status && summary.status === want.status &&
    summary.total_yen === want.total && summary.budget_flag === want.flag && summary.interrupt_count === want.interrupts &&
    summary.checkpoint_count === want.checkpoints, `${where}：通った道（チェックポイントの next）が違います`);

  if (id === 'missing') {
    check(job.pause === null && job.after_resume === null && job.test_resume === null && final.status === 'needs_input' &&
      same(final.missing_fields, ['end_date']) && job.input.end_date === '' && !hasOwn(final, 'line_items') &&
      !hasOwn(final, 'total_yen') && !hasOwn(final, 'budget_flag') && !hasOwn(final, 'review') &&
      typeof final.summary === 'string' && cps[2].values.status === 'needs_input' &&
      same(cps[2].values.missing_fields, ['end_date']) && same(cps[2].next, ['needs_input']) && same(cps[3].next, []),
    `${where}：返却日のない申請の記録が違います（見積・停止・再開はないはずです）`);
    return;
  }

  check(cps[2].values.status === 'validated' && same(cps[2].next, ['estimate']) &&
    cps[3].values.status === 'awaiting_review' && same(cps[3].next, ['review']) && cps[3].interrupt_ids.length === 1 &&
    cps[4].values.status === want.status && same(cps[4].next, ['finalize']) && isObj(cps[4].values.review) &&
    typeof cps[5].values.summary === 'string', `${where}：validate→estimate→review→finalize の記録が違います`);
  const pause = job.pause;
  check(isObj(pause) && Array.isArray(pause.interrupts) && pause.interrupts.length === 1 && isObj(pause.state) &&
    same(pause.state.next, ['review']) && same(pause.state.values, cps[3].values), `${where}：停止時の記録（next=[review]）が違います`);
  const pending = isObj(pause.interrupts[0]) ? pause.interrupts[0] : {};
  const payload = isObj(pending.value) ? pending.value : {};
  check(same(cps[3].interrupt_ids, [pending.id]) && same(payload.request, job.input) &&
    same(payload.line_items, final.line_items) && payload.total_yen === final.total_yen &&
    payload.budget_flag === final.budget_flag && payload.budget_review_from_yen === rules.budget_review_from_yen,
  `${where}：interrupt の payload が違います`);
  const schema = isObj(pending.response_schema) ? pending.response_schema : {};
  check(schema.title === 'ReviewDecision' && schema.additionalProperties === false && isObj(schema.properties) &&
    same(Object.keys(schema.properties).sort(), ['approved', 'comment']) && Array.isArray(schema.required) &&
    same([...schema.required].sort(), ['approved', 'comment']), `${where}：再開値の型（ReviewDecision）が違います`);
  const reply = job.test_resume;
  check(isObj(reply) && same(Object.keys(reply).sort(), ['approved', 'comment']) && reply.approved === want.reply &&
    typeof reply.comment === 'string' && same(final.review, reply) && isObj(job.after_resume) &&
    same(job.after_resume.values, final) && same(job.after_resume.next, []), `${where}：テスト回答と再開後の記録が違います`);
  const catalog = new Map(rules.catalog.map(entry => [entry.sku, entry.unit_yen]));
  const lines = Array.isArray(final.line_items) ? final.line_items : [];
  check(lines.length === want.items.length && lines.every((line, i) => isObj(line) && line.sku === want.items[i][0] &&
    line.quantity === want.items[i][1] && line.unit_yen === catalog.get(line.sku) &&
    line.subtotal_yen === line.quantity * line.unit_yen) &&
    lines.reduce((sum, line) => sum + line.subtotal_yen, 0) === final.total_yen && final.total_yen === want.total &&
    final.budget_flag === want.flag && final.budget_flag === (final.total_yen >= rules.budget_review_from_yen) &&
    final.needs_review === true && typeof final.summary === 'string', `${where}：見積（数量×単価）か最終stateが違います`);
}

// ---- What the card says ----------------------------------------------------------------------------------------
// Each phase is one saved checkpoint of the selected job. Keys are short Japanese names of the real state fields.

export function cardRows(job, phase) {
  const cps = job.checkpoints;
  const items = values => values.request.items.map(item => ({k: item.sku, v: '×' + item.quantity}));
  const money = values => [{k: '合計', v: yen(values.total_yen)}, {k: '予算フラグ', v: String(values.budget_flag)}];
  switch (phase) {
    case 'schema':
      return {head: 'RequestState', rows: SCHEMA_ROWS.map(k => ({k, v: ''}))};
    case 'input': {
      const values = cps[1].values;
      const rows = items(values);
      if (values.request.end_date === '') rows.push({k: 'end_date', v: '空'});
      return {head: '申請（入力）', rows};
    }
    case 'validated': {
      const values = cps[2].values;
      const rows = items(values);
      if (values.missing_fields.length) rows.push({k: '不足', v: values.missing_fields.join(',')});
      return {head: values.status, rows};
    }
    case 'estimated':
    case 'paused': {
      const values = cps[3].values;
      return {head: values.status, rows: [...values.line_items.map(line => ({k: line.sku, v: `${num(line.unit_yen)}×${line.quantity}`})), ...money(values)]};
    }
    case 'resumed': {
      const values = cps[4].values;
      return {head: values.status, rows: [...money(values), {k: 'テスト回答', v: String(values.review.approved)}]};
    }
    case 'final': {
      const values = cps[5].values;
      return {head: values.status, rows: [...money(values), {k: 'テスト回答', v: String(values.review.approved)}, {k: '要約', v: 'あり'}]};
    }
    case 'missing-final': {
      const values = cps[3].values;
      return {head: values.status, rows: [...items(values), {k: '不足', v: values.missing_fields.join(',')}, {k: '要約', v: 'あり'}]};
    }
    default:
      return {head: '', rows: []};
  }
}

// Short facts for labels next to the map and in the film. Missing values stay absent, never 0.
export function caseFacts(job) {
  const final = job.final;
  return {
    letter: LETTER[job.id],
    label: job.label,
    status: final.status,
    value: typeof final.total_yen === 'number' ? yen(final.total_yen) : `${final.missing_fields.join('・')} 不足`,
    flag: typeof final.budget_flag === 'boolean' ? final.budget_flag : null,
    reply: isObj(job.test_resume) ? job.test_resume.approved : null,
    interrupts: job.checks.interrupt_count,
    checkpoints: job.checkpoints.length,
  };
}

// ---- Diagram -------------------------------------------------------------------------------------------------
// Paper and ink; blue for the route the state took, amber only for the stop and the scripted reply.

export const PALETTES = {
  light: {bg: '#f2eee5', zone: '#e8e2d5', card: '#fcfaf5', ink: '#1d1b18', sub: '#5a5347', rule: '#b3a994', lane: '#e2d9c6',
    blue: '#2453ad', blueSoft: '#dde5f3', amber: '#9a5c05', amberSoft: '#f3e2c2', onAmber: '#fffaf0'},
  dark: {bg: '#161513', zone: '#1e1d1a', card: '#24221e', ink: '#ece6d9', sub: '#ab9f8b', rule: '#564e42', lane: '#2c2821',
    blue: '#8aaaf0', blueSoft: '#233050', amber: '#e2a64c', amberSoft: '#3d2f18', onAmber: '#1a1206'},
};

export const FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Yu Gothic", "Noto Sans JP", Meiryo, sans-serif';
export const SERIF = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';

// Design space: portrait 300×380, wide 640×300. Positions scale uniformly; labels never drop below 11 px.
export const LAYOUTS = {
  portrait: {
    w: 300, h: 380,
    zone: {x: 102, y: 54, w: 197, h: 268},
    title: {x: 192, y: 98},
    book: {x: 2, y: 4, w: 42, h: 36}, plus: [47, 27], req: {x: 50, y: 4, w: 38, h: 36},
    ai: {cx: 116, cy: 21, r: 13, label: [116, 49, 'center']},
    wf: {x: 144, y: 4, w: 72, h: 36},
    op: {x: 224, y: 2, w: 74, h: 44},
    compile: {x: 210, y: 58, w: 86, h: 22},
    invoke: {x: 104, y: 58, w: 78, h: 22},
    start: {cx: 143, cy: 92, label: [137, 96, 'right']},
    validate: {x: 104, y: 102, w: 78, h: 22},
    fork: {cx: 143, cy: 146, r: 10},
    needs: {x: 192, y: 135, w: 80, h: 22},
    end2: {cx: 287, cy: 146, label: [287, 133, 'center']},
    estimate: {x: 104, y: 170, w: 78, h: 22},
    review: {x: 104, y: 214, w: 78, h: 34},
    shelf: {x: 192, y: 230, w: 106, h: 52},
    reply: {x: 192, y: 288, w: 106, h: 32},
    finalize: {x: 104, y: 268, w: 78, h: 22},
    end: {cx: 143, cy: 308, label: [151, 312, 'left']},
    record: {x: 104, y: 324, w: 78, h: 42},
    viewer: {x: 192, y: 328, w: 106, h: 34},
    labels: {lack: [172, 141, 'center'], ok: [139, 166, 'right'], head: [200, 210, 'left']},
    card: {w: 100, h: 66},
    docks: {
      input: {x: 0, y: 50, ptr: 'right', at: 69},
      validate: {x: 0, y: 80, ptr: 'right', at: 113},
      estimate: {x: 0, y: 148, ptr: 'right', at: 181},
      review: {x: 0, y: 198, ptr: 'right', at: 231},
      finalize: {x: 0, y: 246, ptr: 'right', at: 279},
      record: {x: 0, y: 312, ptr: 'right', at: 345},
      needs: {x: 192, y: 162, ptr: 'up', at: 232},
    },
    edges: {
      'req-ai': [[88, 22], [103, 22]],
      'ai-wf': [[129, 22], [144, 22]],
      'wf-op': [[216, 22], [224, 22]],
      'op-compile': [[261, 46], [261, 58]],
      'compile-invoke': [[210, 69], [182, 69]],
      'compile-shelf': [[296, 69], [299, 69], [299, 256], [298, 256]],
      'invoke-start': [[143, 80], [143, 88]],
      'start-validate': [[143, 96], [143, 102]],
      'validate-fork': [[143, 124], [143, 136]],
      'fork-needs': [[153, 146], [192, 146]],
      'needs-end2': [[272, 146], [283, 146]],
      'fork-estimate': [[143, 156], [143, 170]],
      'estimate-review': [[143, 192], [143, 214]],
      'review-shelf': [[182, 244], [192, 244]],
      'reply-shelf': [[245, 288], [245, 282]],
      'shelf-review': [[196, 230], [196, 206], [163, 206], [163, 214]],
      'review-finalize': [[143, 248], [143, 268]],
      'finalize-end': [[143, 290], [143, 304]],
      'end-record': [[143, 312], [143, 324]],
      'record-viewer': [[182, 345], [192, 345]],
    },
  },
  wide: {
    w: 640, h: 300,
    zone: {x: 174, y: 60, w: 380, h: 112},
    title: {x: 6, y: 198},
    book: {x: 6, y: 8, w: 46, h: 36}, plus: [55, 31], req: {x: 58, y: 8, w: 42, h: 36},
    ai: {cx: 132, cy: 26, r: 14, label: [152, 30, 'left']},
    wf: {x: 96, y: 56, w: 74, h: 30},
    op: {x: 6, y: 52, w: 80, h: 40},
    compile: {x: 6, y: 104, w: 80, h: 22},
    invoke: {x: 6, y: 139, w: 80, h: 22},
    start: {cx: 184, cy: 150, label: [184, 138, 'center']},
    validate: {x: 200, y: 139, w: 62, h: 22},
    fork: {cx: 282, cy: 150, r: 10},
    needs: {x: 242, y: 92, w: 80, h: 22},
    end2: {cx: 334, cy: 103, label: [342, 107, 'left']},
    estimate: {x: 304, y: 139, w: 62, h: 22},
    review: {x: 382, y: 132, w: 66, h: 36},
    shelf: {x: 366, y: 66, w: 94, h: 52},
    reply: {x: 466, y: 72, w: 84, h: 32},
    finalize: {x: 466, y: 139, w: 62, h: 22},
    end: {cx: 544, cy: 150, label: [544, 138, 'center']},
    record: {x: 558, y: 130, w: 78, h: 42},
    viewer: {x: 558, y: 78, w: 78, h: 34},
    labels: {lack: [288, 130, 'left'], ok: [293, 170, 'center'], head: [366, 128, 'right']},
    card: {w: 100, h: 66},
    docks: {
      input: {x: 134, y: 174, ptr: 'up', at: 184},
      validate: {x: 181, y: 174, ptr: 'up', at: 231},
      estimate: {x: 285, y: 174, ptr: 'up', at: 335},
      review: {x: 365, y: 174, ptr: 'up', at: 415},
      finalize: {x: 447, y: 174, ptr: 'up', at: 497},
      record: {x: 536, y: 174, ptr: 'up', at: 597},
      needs: {x: 232, y: 20, ptr: 'down', at: 282},
    },
    edges: {
      'req-ai': [[100, 26], [118, 26]],
      'ai-wf': [[132, 40], [132, 56]],
      'wf-op': [[96, 71], [86, 71]],
      'op-compile': [[46, 92], [46, 104]],
      'compile-invoke': [[46, 126], [46, 139]],
      'invoke-start': [[86, 150], [179, 150]],
      'start-validate': [[189, 150], [200, 150]],
      'validate-fork': [[262, 150], [272, 150]],
      'fork-needs': [[282, 140], [282, 114]],
      'needs-end2': [[322, 103], [330, 103]],
      'fork-estimate': [[292, 150], [304, 150]],
      'estimate-review': [[366, 150], [382, 150]],
      'review-shelf': [[415, 132], [415, 118]],
      'reply-shelf': [[466, 88], [460, 88]],
      'shelf-review': [[370, 118], [370, 141], [382, 141]],
      'review-finalize': [[448, 150], [466, 150]],
      'finalize-end': [[528, 150], [539, 150]],
      'end-record': [[549, 150], [558, 150]],
      'record-viewer': [[597, 130], [597, 112]],
    },
  },
};

const EDGE_ENDS = {
  'req-ai': ['req', 'ai'], 'ai-wf': ['ai', 'wf'], 'wf-op': ['wf', 'op'], 'op-compile': ['op', 'compile'],
  'compile-invoke': ['compile', 'invoke'], 'compile-shelf': ['compile', 'shelf'], 'invoke-start': ['invoke', 'start'],
  'start-validate': ['start', 'validate'], 'validate-fork': ['validate', 'fork'], 'fork-needs': ['fork', 'needs'],
  'needs-end2': ['needs', 'end2'], 'fork-estimate': ['fork', 'estimate'], 'estimate-review': ['estimate', 'review'],
  'review-shelf': ['review', 'shelf'], 'reply-shelf': ['reply', 'shelf'], 'shelf-review': ['shelf', 'review'],
  'review-finalize': ['review', 'finalize'], 'finalize-end': ['finalize', 'end'], 'end-record': ['end', 'record'],
  'record-viewer': ['record', 'viewer'],
};

// The route each kind of job took in the saved records, and what it never touched.
const ROUTE_DONE = ['invoke', 'start', 'validate', 'fork', 'estimate', 'review', 'finalize', 'end', 'record', 'viewer', 'shelf',
  'reply', 'e:invoke-start', 'e:start-validate', 'e:validate-fork', 'e:fork-estimate', 'e:estimate-review', 'e:review-shelf',
  'e:reply-shelf', 'e:shelf-review', 'e:review-finalize', 'e:finalize-end', 'e:end-record', 'e:record-viewer'];
const OFF_DONE = ['needs', 'end2', 'e:fork-needs', 'e:needs-end2'];
const ROUTE_MISSING = ['invoke', 'start', 'validate', 'fork', 'needs', 'end2', 'shelf', 'record', 'viewer', 'e:invoke-start',
  'e:start-validate', 'e:validate-fork', 'e:fork-needs', 'e:needs-end2', 'e:record-viewer'];
const OFF_MISSING = ['estimate', 'review', 'finalize', 'end', 'reply', 'e:fork-estimate', 'e:estimate-review', 'e:review-shelf',
  'e:reply-shelf', 'e:shelf-review', 'e:review-finalize', 'e:finalize-end', 'e:end-record'];
const OFF_ALPHA = 0.78;

// Which part of the picture each control lights up. The whole picture always stays on screen.
export const STAGE_FOCUS = [
  ['book', 'req', 'ai', 'wf', 'op', 'compile', 'invoke', 'start', 'card', 'shelf', 'e:req-ai', 'e:ai-wf', 'e:wf-op',
    'e:op-compile', 'e:compile-invoke', 'e:invoke-start', 'e:compile-shelf'],
  ['start', 'validate', 'fork', 'estimate', 'review', 'needs', 'end2', 'shelf', 'card', 'e:invoke-start', 'e:start-validate',
    'e:validate-fork', 'e:fork-needs', 'e:needs-end2', 'e:fork-estimate', 'e:estimate-review', 'e:review-shelf'],
  ['reply', 'shelf', 'review', 'finalize', 'end', 'record', 'viewer', 'card', 'needs', 'end2', 'e:reply-shelf',
    'e:shelf-review', 'e:review-finalize', 'e:finalize-end', 'e:end-record', 'e:record-viewer'],
];
export const PART_FOCUS = {
  state: ['card', 'title', 'validate', 'needs', 'estimate', 'review', 'finalize'],
  edges: ['fork', 'needs', 'end2', 'estimate', 'e:validate-fork', 'e:fork-needs', 'e:needs-end2', 'e:fork-estimate'],
  compile: ['op', 'compile', 'invoke', 'start', 'shelf', 'e:op-compile', 'e:compile-invoke', 'e:invoke-start', 'e:compile-shelf'],
  memory: ['shelf', 'e:review-shelf', 'e:shelf-review', 'e:compile-shelf'],
  interrupt: ['review', 'shelf', 'card', 'e:review-shelf'],
  resume: ['reply', 'shelf', 'review', 'e:reply-shelf', 'e:shelf-review'],
};

export const clamp01 = x => (x <= 0 ? 0 : x >= 1 ? 1 : x);
export const seg = (t, a, b) => (b > a ? clamp01((t - a) / (b - a)) : t >= a ? 1 : 0);
export const ease = x => { const c = clamp01(x); return c * c * (3 - 2 * c); };
const lerp = (a, b, p) => a + (b - a) * p;

// ---- Saved-state stages ----------------------------------------------------------------------------------------
// 組む / 止まるまで / 再開後 replay the saved checkpoints of one job on the same picture. Times are seconds into a
// stage; the result depends on (job, stage, e) only, so the page and the film draw the same thing at the same e.

export const STAGE_TIMES = {build: 3.4, pause: 4.4, pauseMissing: 3.0, resume: 5.0};

export function stageDuration(job, stage) {
  if (stage === 0) return STAGE_TIMES.build;
  if (job.id === 'missing') return stage === 1 ? STAGE_TIMES.pauseMissing : 0;
  return stage === 1 ? STAGE_TIMES.pause : STAGE_TIMES.resume;
}

function track(e, start, legs) {
  let place = {a: start, b: start, p: 1};
  for (const [t0, t1, from, to] of legs) if (e >= t0) place = {a: from, b: to, p: seg(e, t0, t1)};
  return place;
}

function phaseAt(e, changes) {
  let i = 0;
  while (i + 1 < changes.length && e >= changes[i + 1][0]) i++;
  const [at, phase] = changes[i];
  return {phase, prev: i > 0 ? changes[i - 1][1] : phase, flash: i > 0 ? 1 - seg(e, at, at + 0.9) : 0};
}

function stepValue(e, steps) {
  let value = steps[0][1];
  for (const [t, v] of steps) if (e >= t) value = v;
  return value;
}

// `sheets` holds the snapshot count shown for each thread; the selected job's own count follows the stage.
export function runState(job, stage, e, sheets = {}) {
  const complete = job.id !== 'missing';
  const s = {
    job, show: {}, ghost: 0.3, dim: 0.62, focus: null,
    route: new Set(complete ? ROUTE_DONE : ROUTE_MISSING), off: new Set(complete ? OFF_DONE : OFF_MISSING),
    card: null, gate: 0, sheets: {...sheets}, tokens: [], pulse: {}, replyHot: 0, headHot: 0,
  };
  const ev = (a, b) => ease(seg(e, a, b));
  const move = (edge, kind, a, b) => s.tokens.push({edge, kind, p: seg(e, a, b)});
  const still = (dock, phase) => ({a: dock, b: dock, p: 1, phase, prev: phase, flash: 0});
  const saved = job.checkpoints.length;

  if (stage === null) {
    s.card = complete ? still('record', 'final') : still('needs', 'missing-final');
    s.sheets[job.id] = saved;
    return s;
  }
  s.focus = STAGE_FOCUS[stage].filter(id => !s.off.has(id));
  if (stage === 0) {
    move('req-ai', 'page', 0, 0.5);
    s.pulse.ai = seg(e, 0.5, 1.0);
    move('ai-wf', 'code', 0.8, 1.3);
    move('wf-op', 'code', 1.4, 1.8);
    s.pulse.op = seg(e, 1.8, 2.3);
    move('op-compile', 'dot', 1.9, 2.2);
    move('compile-invoke', 'dot', 2.2, 2.5);
    s.card = {a: 'input', b: 'input', p: 1, ...phaseAt(e, [[0, 'schema'], [2.6, 'input']]), stack: ev(2.6, 3.2)};
    s.sheets[job.id] = 0;
    return s;
  }
  if (stage === 1) {
    move('invoke-start', 'dot', 0, 0.25);
    if (complete) {
      s.card = {
        ...track(e, 'input', [[0.2, 1.0, 'input', 'validate'], [1.5, 2.2, 'validate', 'estimate'], [2.7, 3.3, 'estimate', 'review']]),
        ...phaseAt(e, [[0, 'input'], [1.0, 'validated'], [2.2, 'estimated'], [3.5, 'paused']]),
      };
      s.gate = ev(3.3, 3.7);
      move('review-shelf', 'snap', 3.7, 4.3);
      s.sheets[job.id] = stepValue(e, [[0, 0], [0.25, 2], [1.0, 3], [4.3, 4]]);
    } else {
      s.card = {
        ...track(e, 'input', [[0.2, 1.0, 'input', 'validate'], [1.4, 2.2, 'validate', 'needs']]),
        ...phaseAt(e, [[0, 'input'], [1.0, 'validated'], [2.2, 'missing-final']]),
      };
      move('fork-needs', 'dot', 1.4, 2.0);
      s.pulse.end2 = seg(e, 2.3, 2.9);
      s.sheets[job.id] = stepValue(e, [[0, 0], [0.25, 2], [1.0, 3], [2.2, 4]]);
    }
    // The waiting requests stay with the card only while it is still at the input.
    s.card.stack = s.card.b === 'input' || (s.card.a === 'input' && s.card.p <= 0) ? 1 : 0;
    return s;
  }
  // Stage 2. A job that never stopped has nothing to resume: it stays finished at needs_input.
  if (!complete) {
    s.card = still('needs', 'missing-final');
    s.sheets[job.id] = saved;
    return s;
  }
  s.replyHot = ev(0, 0.4) * (1 - ev(2.2, 2.6));
  move('reply-shelf', 'reply', 0.4, 1.0);
  move('shelf-review', 'restore', 1.1, 1.9);
  s.headHot = ev(1.1, 1.4) * (1 - ev(2.4, 2.8));
  s.gate = 1 - ev(1.9, 2.3);
  s.card = {
    ...track(e, 'review', [[2.5, 3.1, 'review', 'finalize'], [3.3, 3.9, 'finalize', 'record']]),
    ...phaseAt(e, [[0, 'paused'], [2.2, 'resumed'], [3.1, 'final']]),
  };
  s.sheets[job.id] = stepValue(e, [[0, 4], [2.2, 5], [3.1, 6]]);
  s.pulse.record = seg(e, 3.9, 4.4);
  move('record-viewer', 'file', 4.0, 4.4);
  s.pulse.viewer = seg(e, 4.4, 5.0);
  return s;
}

function pointAt(points, p) {
  let total = 0;
  const lengths = [];
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    lengths.push(d); total += d;
  }
  let left = clamp01(p) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i] || i === lengths.length - 1) {
      const q = lengths[i] ? Math.min(1, left / lengths[i]) : 0;
      return [lerp(points[i][0], points[i + 1][0], q), lerp(points[i][1], points[i + 1][1], q)];
    }
    left -= lengths[i];
  }
  return points[0];
}

// Rounded rectangle and folded paper paths without roundRect, which older iOS Safari lacks.
function rrect(ctx, x, y, w, h, r) {
  const q = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + q, y);
  ctx.arcTo(x + w, y, x + w, y + h, q);
  ctx.arcTo(x + w, y + h, x, y + h, q);
  ctx.arcTo(x, y + h, x, y, q);
  ctx.arcTo(x, y, x + w, y, q);
  ctx.closePath();
}

function paperPath(ctx, x, y, w, h, fold) {
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + w - fold, y); ctx.lineTo(x + w, y + fold); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h);
  ctx.closePath();
}

// Draws the whole connected map for state `s` into `rect` (canvas units). `pxPerUnit` is how many output pixels
// (CSS pixels on the page, video pixels in the film) one canvas unit becomes, so labels stay at least 11.
export function drawMap(ctx, kind, rect, s, pal, pxPerUnit = 1) {
  const L = LAYOUTS[kind];
  const k = Math.min(rect.w / L.w, rect.h / L.h);
  const unit = k * pxPerUnit;
  const size = n => Math.max(n, 11 / unit);
  const shown = id => { const v = s.show[id]; return v === undefined ? 1 : v; };
  const hot = id => !!(s.focus && s.focus.includes(id));
  const off = id => s.off.has(id);
  const onRoute = id => s.route.has(id) && !off(id);
  const alpha = id => {
    let a = s.ghost + (1 - s.ghost) * shown(id);
    if (s.focus && !s.focus.includes(id)) a *= s.dim;
    if (off(id)) a *= OFF_ALPHA;
    return a;
  };
  const font = (n, weight) => `${weight} ${size(n)}px ${FONT}`;
  const text = (str, x, y, n, {weight = 500, align = 'left', color = pal.ink, max} = {}) => {
    ctx.font = font(n, weight); ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color;
    if (max) ctx.fillText(str, x, y, max); else ctx.fillText(str, x, y);
  };
  const ink = id => (off(id) ? pal.sub : pal.ink);
  const outline = (id, base = 1.3) => {
    ctx.setLineDash(off(id) ? [3, 2.5] : []);
    ctx.lineWidth = hot(id) ? base + 1 : base;
    ctx.strokeStyle = hot(id) ? pal.blue : ink(id);
    ctx.stroke();
    ctx.setLineDash([]);
  };
  const ring = (x, y, w, h, p, color = pal.blue) => {
    if (!(p > 0 && p < 1)) return;
    const a = ctx.globalAlpha, g = 7 * p;
    rrect(ctx, x - g, y - g, w + 2 * g, h + 2 * g, 5 + g);
    ctx.globalAlpha = a * (1 - p); ctx.lineWidth = 1.8; ctx.strokeStyle = color; ctx.stroke(); ctx.globalAlpha = a;
  };
  const block = (id, label) => {
    const b = L[id];
    ctx.globalAlpha = alpha(id);
    rrect(ctx, b.x, b.y, b.w, b.h, 5);
    ctx.fillStyle = pal.card; ctx.fill();
    outline(id, onRoute(id) ? 1.6 : 1.2);
    text(label, b.x + b.w / 2, b.y + b.h / 2 + 4, 12, {weight: 700, align: 'center', color: ink(id), max: b.w - 8});
  };
  const pill = (id, label) => {
    const b = L[id];
    ctx.globalAlpha = alpha(id);
    rrect(ctx, b.x, b.y, b.w, b.h, b.h / 2);
    ctx.fillStyle = pal.card; ctx.fill();
    outline(id, 1.3);
    text(label, b.x + b.w / 2, b.y + b.h / 2 + 4, 12, {weight: 700, align: 'center', max: b.w - 10});
  };
  const terminal = (id, label) => {
    const d = L[id];
    ctx.globalAlpha = alpha(id);
    ctx.beginPath(); ctx.arc(d.cx, d.cy, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = hot(id) ? pal.blue : ink(id); ctx.fill();
    text(label, d.label[0], d.label[1], 11, {weight: 700, align: d.label[2], color: pal.sub});
    const p = s.pulse[id];
    if (p > 0 && p < 1) {
      const a = ctx.globalAlpha;
      ctx.beginPath(); ctx.arc(d.cx, d.cy, 5 + 9 * p, 0, Math.PI * 2);
      ctx.globalAlpha = a * (1 - p); ctx.lineWidth = 1.6; ctx.strokeStyle = pal.blue; ctx.stroke(); ctx.globalAlpha = a;
    }
  };

  ctx.save();
  ctx.translate(rect.x + (rect.w - L.w * k) / 2, rect.y + (rect.h - L.h * k) / 2);
  ctx.scale(k, k);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  // The graph itself: one LangGraph StateGraph of rule-based Python functions.
  const zone = L.zone;
  ctx.globalAlpha = 1;
  rrect(ctx, zone.x, zone.y, zone.w, zone.h, 8);
  ctx.fillStyle = pal.zone; ctx.fill();
  ctx.globalAlpha = alpha('title');
  text('LangGraph', L.title.x, L.title.y, 14, {weight: 700, color: hot('title') ? pal.blue : pal.ink});
  text('規則で動く5関数', L.title.x, L.title.y + 14, 11, {color: pal.sub});
  text('紙＝共有state', L.title.x, L.title.y + 28, 11, {color: pal.sub});

  // Edges under the shapes.
  for (const [id, points] of Object.entries(L.edges)) {
    const [from, to] = EDGE_ENDS[id];
    const eid = 'e:' + id;
    const own = s.show[eid];
    const reveal = own === undefined ? Math.min(shown(from), shown(to)) : own;
    let a = s.ghost + (1 - s.ghost) * reveal;
    if (s.focus && !hot(eid)) a *= s.dim;
    if (off(eid)) a *= OFF_ALPHA;
    ctx.globalAlpha = a;
    const route = onRoute(eid);
    ctx.strokeStyle = hot(eid) || route ? pal.blue : pal.sub;
    ctx.lineWidth = hot(eid) ? 2.4 : route ? 1.8 : 1.2;
    ctx.setLineDash(id === 'compile-shelf' || off(eid) ? [3, 3] : []);
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.setLineDash([]);
    const [x1, y1] = points[points.length - 2], [x2, y2] = points[points.length - 1];
    const angle = Math.atan2(y2 - y1, x2 - x1), head = 4.5;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle - 0.5), y2 - head * Math.sin(angle - 0.5));
    ctx.lineTo(x2 - head * Math.cos(angle + 0.5), y2 - head * Math.sin(angle + 0.5));
    ctx.closePath(); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
  }

  // Authoring, once, in the original production: reference API + request → one writer AI → workflow.py.
  const book = L.book;
  ctx.globalAlpha = alpha('book');
  ctx.beginPath(); ctx.rect(book.x, book.y, book.w, book.h); ctx.fillStyle = pal.card; ctx.fill(); outline('book');
  ctx.beginPath(); ctx.moveTo(book.x + 5, book.y); ctx.lineTo(book.x + 5, book.y + book.h);
  ctx.lineWidth = 1; ctx.strokeStyle = pal.rule; ctx.stroke();
  text('原典', book.x + book.w / 2 + 2, book.y + 16, 11, {weight: 700, align: 'center'});
  text('API', book.x + book.w / 2 + 2, book.y + 30, 11, {weight: 700, align: 'center'});
  ctx.globalAlpha = Math.min(alpha('book'), alpha('req'));
  text('+', L.plus[0], L.plus[1], 12, {weight: 700, align: 'center', color: pal.sub});

  const req = L.req;
  ctx.globalAlpha = alpha('req');
  paperPath(ctx, req.x, req.y, req.w, req.h, 7); ctx.fillStyle = pal.card; ctx.fill(); outline('req');
  text('依頼文', req.x + req.w / 2 - 2, req.y + 16, 11, {weight: 700, align: 'center', max: req.w - 6});
  ctx.beginPath();
  for (const dy of [23, 28]) { ctx.moveTo(req.x + 6, req.y + dy); ctx.lineTo(req.x + req.w - 6, req.y + dy); }
  ctx.lineWidth = 1; ctx.strokeStyle = pal.rule; ctx.stroke();

  const ai = L.ai;
  ctx.globalAlpha = alpha('ai');
  const aiPulse = s.pulse.ai;
  if (aiPulse > 0 && aiPulse < 1) {
    const a = ctx.globalAlpha;
    ctx.beginPath(); ctx.arc(ai.cx, ai.cy, ai.r + 8 * aiPulse, 0, Math.PI * 2);
    ctx.globalAlpha = a * (1 - aiPulse); ctx.lineWidth = 1.8; ctx.strokeStyle = pal.blue; ctx.stroke(); ctx.globalAlpha = a;
  }
  ctx.beginPath(); ctx.arc(ai.cx, ai.cy, ai.r, 0, Math.PI * 2); ctx.fillStyle = pal.card; ctx.fill(); outline('ai', 1.6);
  text('AI', ai.cx, ai.cy + 4, 12, {weight: 700, align: 'center'});
  text('元の制作AI', ai.label[0], ai.label[1], 11, {weight: 700, align: ai.label[2]});

  const wf = L.wf;
  ctx.globalAlpha = alpha('wf');
  paperPath(ctx, wf.x, wf.y, wf.w, wf.h, 7); ctx.fillStyle = pal.card; ctx.fill(); outline('wf');
  text('workflow.py', wf.x + 5, wf.y + 14, 11, {weight: 700, max: wf.w - 12});
  [0.55, 0.4, 0.66].forEach((f, i) => {
    const by = wf.y + 19 + i * 4.5;
    if (by > wf.y + wf.h - 3) return;
    ctx.fillStyle = pal.blue; ctx.fillRect(wf.x + 6 + (i === 1 ? 6 : 0), by, (wf.w - 14) * f, 2);
  });

  // The operator, in a separate step, ran Python: compile with the in-memory checkpointer, then invoke per thread.
  const op = L.op;
  ctx.globalAlpha = alpha('op');
  rrect(ctx, op.x, op.y, op.w, op.h, 4); ctx.fillStyle = pal.lane; ctx.fill(); outline('op');
  text('制作担当', op.x + op.w / 2, op.y + op.h / 2 - 3, 11, {weight: 700, align: 'center', max: op.w - 6});
  text('▶ Python', op.x + op.w / 2, op.y + op.h / 2 + 12, 11, {align: 'center', color: pal.sub, max: op.w - 6});
  ring(op.x, op.y, op.w, op.h, s.pulse.op);
  pill('compile', 'compile');
  pill('invoke', 'invoke');

  // Runtime graph: START → validate → fork → estimate → review (interrupt) → finalize → END; side branch needs_input.
  terminal('start', 'START');
  block('validate', 'validate');
  const fork = L.fork;
  ctx.globalAlpha = alpha('fork');
  ctx.beginPath();
  ctx.moveTo(fork.cx, fork.cy - fork.r); ctx.lineTo(fork.cx + fork.r, fork.cy); ctx.lineTo(fork.cx, fork.cy + fork.r);
  ctx.lineTo(fork.cx - fork.r, fork.cy); ctx.closePath();
  ctx.fillStyle = pal.card; ctx.fill(); outline('fork', 1.6);
  block('needs', 'needs_input');
  terminal('end2', 'END');
  block('estimate', 'estimate');

  const rv = L.review;
  ctx.globalAlpha = alpha('review');
  rrect(ctx, rv.x, rv.y, rv.w, rv.h, 5); ctx.fillStyle = pal.card; ctx.fill(); outline('review', onRoute('review') ? 1.6 : 1.2);
  ctx.fillStyle = ink('review');
  ctx.fillRect(rv.x + 4, rv.y + 5, 2.6, rv.h - 9);
  ctx.fillRect(rv.x + rv.w - 6.6, rv.y + 5, 2.6, rv.h - 9);
  text('review', rv.x + rv.w / 2, rv.y + 13, 12, {weight: 700, align: 'center', color: ink('review')});
  text('interrupt', rv.x + rv.w / 2, rv.y + 23, 11, {align: 'center', color: pal.sub});
  if (s.gate > 0) {
    // A sliding bar across the exit: the node is stopped until a reply arrives.
    const bx = rv.x + 7, bw = (rv.w - 14) * s.gate, by = rv.y + rv.h - 7;
    ctx.fillStyle = pal.amber; ctx.fillRect(bx, by - 2, bw, 4);
    ctx.fillStyle = pal.card;
    for (let sx = bx + 4; sx < bx + bw - 3; sx += 8) ctx.fillRect(sx, by - 2, 3, 4);
  }

  // The in-memory checkpointer: one tray in the same Python process, one slot per thread_id.
  const sh = L.shelf;
  ctx.globalAlpha = alpha('shelf');
  rrect(ctx, sh.x, sh.y, sh.w, sh.h, 4); ctx.fillStyle = pal.lane; ctx.fill(); outline('shelf');
  text('InMemorySaver', sh.x + 6, sh.y + 13, 11, {weight: 700, max: sh.w - 12});
  text('プロセス内メモリ', sh.x + 6, sh.y + 25, 11, {color: pal.sub, max: sh.w - 12});
  const gap = 3, slotW = (sh.w - 12 - gap * 2) / 3, slotY = sh.y + 29, slotH = sh.h - 33;
  const sheetW = 7, step = Math.max(0, (slotW - 13 - sheetW) / 5);
  CASE_IDS.forEach((id, i) => {
    const sx = sh.x + 6 + i * (slotW + gap);
    const mine = id === s.job.id;
    ctx.fillStyle = pal.card; ctx.fillRect(sx, slotY, slotW, slotH);
    ctx.lineWidth = mine ? 1.8 : 1; ctx.strokeStyle = mine ? pal.blue : pal.rule; ctx.strokeRect(sx, slotY, slotW, slotH);
    text(LETTER[id], sx + 3, slotY + slotH - 5, 11, {weight: 700, color: mine ? pal.blue : pal.sub});
    const count = s.sheets[id] || 0;
    for (let j = 0; j < count; j++) {
      const px = sx + 11 + j * step;
      ctx.fillStyle = pal.card; ctx.fillRect(px, slotY + 3, sheetW, slotH - 6);
      ctx.lineWidth = 0.8; ctx.strokeStyle = mine ? pal.ink : pal.sub; ctx.strokeRect(px, slotY + 3, sheetW, slotH - 6);
    }
  });

  // The scripted reply: a test value from inputs/requests.json, handed over with Command.
  const rp = L.reply;
  const reply = s.job.test_resume;
  const hasReply = reply !== null && typeof reply === 'object';
  ctx.globalAlpha = alpha('reply');
  paperPath(ctx, rp.x, rp.y, rp.w, rp.h, 7);
  ctx.fillStyle = hasReply ? pal.amberSoft : pal.card; ctx.fill();
  ctx.setLineDash(off('reply') ? [3, 2.5] : []);
  ctx.lineWidth = s.replyHot > 0 ? 1.3 + 1.2 * s.replyHot : hot('reply') ? 2.3 : 1.3;
  ctx.strokeStyle = s.replyHot > 0 ? pal.amber : hot('reply') ? pal.blue : ink('reply');
  ctx.stroke(); ctx.setLineDash([]);
  text('Command', rp.x + 6, rp.y + 13, 11, {weight: 700, color: ink('reply')});
  text(hasReply ? `テスト値 ${String(reply.approved)}` : '停止なし', rp.x + 6, rp.y + 26, 11,
    {weight: hasReply ? 700 : 500, color: hasReply ? pal.amber : pal.sub, max: rp.w - 12});

  block('finalize', 'finalize');
  terminal('end', 'END');

  // The saved record and the original detailed viewer.
  const rec = L.record;
  ctx.globalAlpha = alpha('record');
  paperPath(ctx, rec.x, rec.y, rec.w, rec.h, 8); ctx.fillStyle = pal.card; ctx.fill(); outline('record', onRoute('record') ? 1.6 : 1.2);
  text('保存記録', rec.x + rec.w / 2, rec.y + 17, 12, {weight: 700, align: 'center', max: rec.w - 10});
  text(`${s.job.id}.json`, rec.x + rec.w / 2, rec.y + 32, 11, {align: 'center', color: pal.sub, max: rec.w - 8});
  ring(rec.x, rec.y, rec.w, rec.h, s.pulse.record);

  const vw = L.viewer;
  ctx.globalAlpha = alpha('viewer');
  rrect(ctx, vw.x, vw.y, vw.w, vw.h - 6, 3); ctx.fillStyle = pal.card; ctx.fill(); outline('viewer');
  ctx.beginPath();
  ctx.moveTo(vw.x + vw.w / 2, vw.y + vw.h - 6); ctx.lineTo(vw.x + vw.w / 2, vw.y + vw.h - 2);
  ctx.moveTo(vw.x + vw.w / 2 - 9, vw.y + vw.h - 1); ctx.lineTo(vw.x + vw.w / 2 + 9, vw.y + vw.h - 1);
  ctx.lineWidth = 1.3; ctx.strokeStyle = pal.ink; ctx.stroke();
  text('元の実データ', vw.x + vw.w / 2, vw.y + 13, 11, {weight: 700, align: 'center', max: vw.w - 6});
  text('desk.html', vw.x + vw.w / 2, vw.y + 25, 11, {align: 'center', color: pal.sub, max: vw.w - 6});
  ring(vw.x, vw.y, vw.w, vw.h - 6, s.pulse.viewer);

  // Edge labels: the branch is input validity only; resume restarts review from its beginning.
  const lab = L.labels;
  ctx.globalAlpha = alpha('needs');
  text('不足', lab.lack[0], lab.lack[1], 11, {weight: 700, align: lab.lack[2], color: off('needs') ? pal.sub : pal.amber});
  ctx.globalAlpha = alpha('estimate');
  text('そろう', lab.ok[0], lab.ok[1], 11, {align: lab.ok[2], color: pal.sub});
  ctx.globalAlpha = alpha('reply');
  text('先頭から', lab.head[0], lab.head[1], 11, {weight: s.headHot > 0.5 ? 700 : 500, align: lab.head[2], color: s.headHot > 0.5 ? pal.blue : pal.sub});

  // The shared state card: the same paper travels, gains fields and waits at the gate.
  const c = s.card;
  if (c && (c.alpha === undefined || c.alpha > 0)) {
    const d0 = L.docks[c.a], d1 = L.docks[c.b], q = ease(c.p);
    const x = lerp(d0.x, d1.x, q), y = lerp(d0.y, d1.y, q), w = L.card.w, h = L.card.h;
    const now = cardRows(s.job, c.phase), was = cardRows(s.job, c.prev || c.phase);
    const base = (c.alpha === undefined ? 1 : c.alpha) * (s.focus && !s.focus.includes('card') ? s.dim : 1);
    const flash = c.flash || 0;
    if (c.stack > 0) {
      // The other fictional requests wait in the same input file.
      ctx.globalAlpha = base * c.stack;
      for (const dy of [8, 4]) {
        ctx.fillStyle = pal.card; ctx.fillRect(x, y + dy, w, h);
        ctx.lineWidth = 1; ctx.strokeStyle = pal.rule; ctx.strokeRect(x, y + dy, w, h);
      }
    }
    ctx.globalAlpha = base;
    ctx.fillStyle = pal.card; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = pal.lane; ctx.fillRect(x, y, w, 16);
    if (now.head !== was.head && flash > 0) {
      ctx.globalAlpha = base * flash; ctx.fillStyle = pal.amberSoft; ctx.fillRect(x, y, w, 16); ctx.globalAlpha = base;
    }
    text(now.head, x + 5, y + 12, 11, {weight: 700, max: w - 10});
    now.rows.slice(0, 4).forEach((row, i) => {
      const ry = y + 18 + i * 12;
      const old = was.rows.find(r => r.k === row.k);
      if ((!old || old.v !== row.v) && flash > 0 && c.phase !== c.prev) {
        ctx.globalAlpha = base * flash; ctx.fillStyle = pal.amberSoft; ctx.fillRect(x + 2, ry, w - 4, 11.5); ctx.globalAlpha = base;
      }
      text(row.k, x + 5, ry + 9.5, 11, {color: pal.sub});
      const keyW = ctx.measureText(row.k).width;
      if (row.v) text(row.v, x + w - 5, ry + 9.5, 11, {weight: 700, align: 'right', max: Math.max(10, w - 14 - keyW)});
    });
    const paused = c.phase === 'paused';
    ctx.lineWidth = paused || hot('card') ? 2.2 : 1.4;
    ctx.strokeStyle = paused ? pal.amber : hot('card') ? pal.blue : pal.ink;
    ctx.strokeRect(x, y, w, h);
    const rest = c.p <= 0 ? d0 : c.p >= 1 ? d1 : null;
    if (rest) {
      ctx.beginPath();
      if (rest.ptr === 'right') {
        const py = Math.min(y + h - 8, Math.max(y + 8, rest.at));
        ctx.moveTo(x + w, py - 5); ctx.lineTo(x + w + 4, py); ctx.lineTo(x + w, py + 5);
      } else {
        const px = Math.min(x + w - 8, Math.max(x + 8, rest.at));
        const edge = rest.ptr === 'up' ? y : y + h, tip = rest.ptr === 'up' ? y - 4 : y + h + 4;
        ctx.moveTo(px - 5, edge); ctx.lineTo(px, tip); ctx.lineTo(px + 5, edge);
      }
      ctx.closePath(); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
    }
    if (paused) {
      const sw = 30, sx = x + w - sw - 4, sy = y - 7;
      ctx.fillStyle = pal.amber; ctx.fillRect(sx, sy, sw, 14);
      text('停止', sx + sw / 2, sy + 11, 11, {weight: 700, align: 'center', color: pal.onAmber});
    }
  }

  // Small things in flight along the edges.
  for (const token of s.tokens) {
    if (!(token.p > 0 && token.p < 1)) continue;
    const [tx, ty] = pointAt(L.edges[token.edge], token.p);
    ctx.globalAlpha = Math.min(1, token.p * 6, (1 - token.p) * 6);
    drawToken(ctx, token.kind, tx, ty, pal);
  }
  ctx.restore();
}

function drawToken(ctx, kind, x, y, pal) {
  const sheet = (cx, cy, w, h, fill, edge) => {
    ctx.fillStyle = fill; ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.lineWidth = 1.2; ctx.strokeStyle = edge; ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
  };
  switch (kind) {
    case 'dot':
      ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI * 2); ctx.fillStyle = pal.blue; ctx.fill();
      break;
    case 'code':
      sheet(x, y, 11, 14, pal.card, pal.ink);
      ctx.fillStyle = pal.blue; ctx.fillRect(x - 3.5, y - 3, 7, 1.6); ctx.fillRect(x - 3.5, y + 1, 5, 1.6);
      break;
    case 'snap':
      sheet(x, y, 18, 13, pal.card, pal.amber);
      ctx.fillStyle = pal.lane; ctx.fillRect(x - 8, y - 5.5, 16, 3.5);
      break;
    case 'reply':
      sheet(x, y, 16, 11, pal.amberSoft, pal.amber);
      break;
    case 'restore':
      sheet(x - 3, y - 2, 18, 13, pal.card, pal.amber);
      sheet(x + 4, y + 3, 14, 9, pal.amberSoft, pal.amber);
      break;
    case 'file':
      sheet(x, y, 11, 14, pal.card, pal.ink);
      ctx.fillStyle = pal.blue; ctx.fillRect(x - 3.5, y + 1, 7, 2);
      break;
    default:
      sheet(x, y, 11, 14, pal.card, pal.ink);
      ctx.beginPath(); ctx.moveTo(x - 3, y - 2); ctx.lineTo(x + 3, y - 2); ctx.moveTo(x - 3, y + 2); ctx.lineTo(x + 3, y + 2);
      ctx.lineWidth = 1; ctx.strokeStyle = pal.rule; ctx.stroke();
  }
}

// ---- Page ------------------------------------------------------------------------------------------------------

function phaseNote(job, stage) {
  const letter = LETTER[job.id];
  const facts = caseFacts(job);
  if (job.id === 'missing') {
    if (stage === 0) return '元のAIがworkflow.pyを書き、制作担当がPythonでcompile→invoke。申請Bがstateに入ります。';
    if (stage === 1) return 'validateがend_dateの空欄を見つけ、needs_input→END。見積もinterruptもありません。';
    if (stage === 2) return 'この申請は止まらないので、再開もありません。needs_inputのまま終わった記録です。';
    return '保存記録の最終state。end_dateが空でneeds_inputへ。見積・停止・再開はありません。';
  }
  const flag = facts.flag ? '予算フラグtrueは目印だけで、自動では差し戻しません。' : '';
  if (stage === 0) return `元のAIがworkflow.pyを書き、制作担当がPythonでcompile→invoke。申請${letter}がstateに入ります。`;
  if (stage === 1) return `validate→estimate（数量×単価）→reviewのinterruptで停止。next=[review]をthread ${letter}のメモリへ。${flag}`;
  if (stage === 2) return `テスト値（approved=${facts.reply}）をCommandで同じthread ${letter}へ。reviewを先頭からやり直し、finalize→保存。`;
  return `保存記録の最終state。reviewで1回止まり、テスト値（approved=${facts.reply}）で再開して${facts.status}。${flag}`;
}

function initPage() {
  const root = document.documentElement;
  const $ = id => document.getElementById(id);
  const canvas = $('concept-map');
  const ctx = canvas.getContext('2d');
  const figure = canvas.parentElement;
  const caseButtons = [...document.querySelectorAll('button[data-case]')];
  const stageButtons = [...document.querySelectorAll('button[data-stage]')];
  const partButtons = [...document.querySelectorAll('button[data-part]')];
  const assetLinks = [...document.querySelectorAll('a[data-asset-link]')];
  const summarySteps = [...document.querySelectorAll('#map-summary [data-step]')];
  const replay = $('replay'), retry = $('retry'), status = $('load-status'), meta = $('case-meta'), note = $('phase-note');
  const saveRecord = $('save-record'), openDesk = $('open-desk'), recordContent = $('record-content'), recordName = $('record-name');
  const requestText = $('request-text'), copyButton = $('copy-request'), copyStatus = $('copy-status');
  const partFields = ['part-label', 'part-meaning', 'part-quote'].map($);
  const partSource = $('part-source'), partLocal = $('part-local');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const dark = matchMedia('(prefers-color-scheme: dark)');
  const controls = [...caseButtons, ...stageButtons, ...partButtons, replay, copyButton];

  let assets = null, generation = 0, controller = null;
  let caseId = 'approved', stage = null, part = -1, anim = null, raf = 0;

  const schedule = () => { if (!raf) raf = requestAnimationFrame(paint); };

  function paint(now) {
    raf = 0;
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(box.width * dpr)), h = Math.max(1, Math.round(box.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!assets) return;
    const job = assets.jobs[caseId];
    const elapsed = anim ? (now - anim.start) / 1000 : Infinity;
    let s, running = false;
    if (anim && anim.all) {
      // Replay with no stage selected: build, stop and resume in order, then settle on the saved final state.
      let t = elapsed, st = 0;
      while (st < 2 && t >= stageDuration(job, st)) { t -= stageDuration(job, st); st++; }
      if (st === 2 && t >= stageDuration(job, 2)) s = runState(job, null, 0, assets.sheets);
      else { s = runState(job, st, t, assets.sheets); running = true; }
    } else if (stage === null) {
      s = runState(job, null, 0, assets.sheets);
    } else {
      const total = stageDuration(job, stage);
      s = runState(job, stage, Math.min(elapsed, total), assets.sheets);
      running = !!anim && elapsed < total;
    }
    if (part >= 0) s.focus = PART_FOCUS[PART_IDS[part]];
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Canvas units are CSS pixels here, so the 11 px label floor is in CSS pixels.
    drawMap(ctx, canvas.dataset.layout, {x: 0, y: 0, w: box.width, h: box.height}, s, dark.matches ? PALETTES.dark : PALETTES.light, 1);
    ctx.restore();
    if (running) raf = requestAnimationFrame(paint);
    else anim = null;
  }

  function fitLayout() {
    const layout = figure.clientWidth >= 600 ? 'wide' : 'portrait';
    if (canvas.dataset.layout !== layout) canvas.dataset.layout = layout;
    schedule();
  }

  function setLink(link, target) {
    link.dataset.assetLink = target;
    if (root.dataset.state === 'ready') link.href = target;
  }

  function updateNote() {
    note.textContent = assets ? phaseNote(assets.jobs[caseId], stage) : '';
  }

  function selectCase(id, writeHash) {
    caseId = id;
    for (const button of caseButtons) button.setAttribute('aria-pressed', String(button.dataset.case === id));
    const job = assets.jobs[id];
    const f = caseFacts(job);
    meta.textContent = [f.letter, f.status, f.value, f.flag === null ? null : `予算フラグ ${f.flag}`, `interrupt ${f.interrupts}`]
      .filter(Boolean).join(' · ');
    setLink(saveRecord, `concept/jobs/${id}.json`);
    saveRecord.setAttribute('download', `langgraph-${id}.json`);
    setLink(openDesk, `desk.html#${id}`);
    recordName.textContent = `concept/jobs/${id}.json`;
    recordContent.textContent = assets.jobTexts[id];
    updateNote();
    if (writeHash) history.replaceState(null, '', '#' + id);
    anim = stage !== null && !reduced.matches ? {start: performance.now()} : null;
    schedule();
  }

  function selectStage(next, animate) {
    stage = next;
    part = -1;
    for (const button of partButtons) button.setAttribute('aria-pressed', 'false');
    for (const button of stageButtons) button.setAttribute('aria-pressed', String(Number(button.dataset.stage) === next));
    for (const step of summarySteps) {
      if (next !== null && Number(step.dataset.step) === next) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    }
    updateNote();
    anim = animate && !reduced.matches ? {start: performance.now(), all: next === null} : null;
    schedule();
  }

  function fillPart(index) {
    const p = assets.parts[index];
    partFields[0].textContent = p.label;
    partFields[1].textContent = p.meaning;
    partFields[2].textContent = p.quote;
    partSource.href = `https://github.com/${REPO}/blob/${COMMIT}/${p.upstream_path}#L${p.line_start}`;
    partSource.textContent = `GitHub ${p.upstream_path}#L${p.line_start}`;
    partLocal.href = p.source_path;
    partLocal.textContent = `${p.source_path}:${p.line_start}`;
  }

  function selectPart(index) {
    part = index;
    for (const button of partButtons) button.setAttribute('aria-pressed', String(PART_IDS.indexOf(button.dataset.part) === index));
    fillPart(index);
    schedule();
  }

  function hashCase() {
    let id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { id = ''; }
    return CASE_IDS.includes(id) ? id : 'approved';
  }

  function setControls(enabled) {
    for (const control of controls) control.disabled = !enabled;
    for (const link of assetLinks) {
      if (enabled) { link.href = link.dataset.assetLink; link.removeAttribute('aria-disabled'); }
      else { link.removeAttribute('href'); link.setAttribute('aria-disabled', 'true'); }
    }
  }

  function clearResults() {
    anim = null;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    meta.textContent = '';
    note.textContent = '';
    for (const field of partFields) field.textContent = '';
    for (const link of [partSource, partLocal]) { link.removeAttribute('href'); link.textContent = ''; }
    requestText.value = '';
    copyStatus.textContent = '';
    recordContent.textContent = '';
    recordName.textContent = '';
  }

  function ready() {
    root.dataset.state = 'ready';
    setControls(true);
    requestText.value = assets.request;
    // Short on purpose: it shares the readout line under the map on a 320 px phone. Details are below the fold.
    status.textContent = `${TOTAL_FILES}件を確認済み`;
    fillPart(0);
    selectStage(stage, false);
    selectCase(hashCase(), false);
  }

  function failed(error) {
    root.dataset.state = 'error';
    clearResults();
    setControls(false);
    const reason = error instanceof LoadError ? error.message : '読み込み中に予期しないエラーが起きました';
    status.textContent = `読み込みを止めました。${reason}。図・記録・引用・依頼文は表示していません。`;
    retry.hidden = false;
    retry.disabled = false;
  }

  async function load() {
    const mine = ++generation;
    if (controller) controller.abort();
    controller = new AbortController();
    assets = null;
    root.dataset.state = 'loading';
    clearResults();
    setControls(false);
    retry.hidden = true;
    retry.disabled = true;
    status.textContent = `確認中 0/${TOTAL_FILES}`;
    try {
      const loaded = await loadAssets({signal: controller.signal, onProgress(info) {
        if (mine !== generation) return;
        status.textContent = `確認中 ${info.done}/${info.total}`;
      }});
      if (mine !== generation) return;
      assets = loaded;
      ready();
    } catch (error) {
      if (mine !== generation) return;
      failed(error);
    }
  }

  for (const button of caseButtons) button.addEventListener('click', () => selectCase(button.dataset.case, true));
  for (const button of stageButtons) button.addEventListener('click', () => selectStage(Number(button.dataset.stage), true));
  for (const button of partButtons) button.addEventListener('click', () => selectPart(PART_IDS.indexOf(button.dataset.part)));
  replay.addEventListener('click', () => selectStage(stage, true));
  retry.addEventListener('click', load);
  copyButton.addEventListener('click', async () => {
    if (!assets) return;
    copyStatus.textContent = '';
    try {
      await navigator.clipboard.writeText(assets.request);
      copyStatus.textContent = '依頼文をコピーしました。';
    } catch {
      requestText.focus();
      requestText.select();
      copyStatus.textContent = 'コピーできませんでした。文を選んだので、長押しか Ctrl+C でコピーしてください。';
    }
  });
  window.addEventListener('hashchange', () => { if (assets) selectCase(hashCase(), false); });
  dark.addEventListener('change', schedule);
  new ResizeObserver(fitLayout).observe(figure);
  fitLayout();
  load();
}

if (typeof document !== 'undefined' && document.getElementById('concept-map')) initPage();
