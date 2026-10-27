/* 八百万図AIツールボックス — article page. case.html?id=<case-id> (produced case) or case.html?entry=<catalog-id>
   (catalog item: a source guide, or a pointer to its produced case). Data comes only from relative
   paths under data/. Every value is written as text; links pass through SY.safeHref. */
(() => {
  'use strict';

  const {$, h, safeHref, isExternal, displayUrl, loadJSON, announce, setTabbar} = window.SY;

  const STATUS_LABELS = {draft: '制作中', produced: '制作済み', rendered: '動画を書き出し済み', reviewed: '確認済み', published: '掲載済み'};
  const MODEL_LABELS = {'claude-opus-5-5': 'Claude Opus 5.5'};
  // Extra files that belong to a case but are not part of the case schema.
  const CASE_EXTRAS = {
    'brief-to-demo': {
      videoNote: '28秒、音声なし。「イベント受付を使いやすくしたい」がブリーフになり、AIへ渡すまで。',
      videoSource: 'examples/brief-to-demo/video/index.html',
      skillLicense: 'skills/brief-to-demo/LICENSE'
    }
  };
  const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;
  const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,99}$/i;
  const CASE_LINK = /^case\.html\?id=([a-z0-9._-]+)(?:[&#]|$)/i;
  // Samples longer than this open in a <details> so one sample cannot fill several screens.
  const LONG_SAMPLE = 900;

  const root = $('[data-root]');
  let uid = 0;
  const nextId = prefix => prefix + '-' + (++uid);

  /* ---------- Text helpers ---------- */

  const sentences = text => String(text || '').trim().match(/[^。]+(?:。|$)/g) || [];

  // Lead = the first sentences up to a short paragraph; the rest stays one tap away.
  function splitLead(text, min = 70) {
    const parts = sentences(text);
    let lead = '';
    let index = 0;
    while (index < parts.length && (lead.length < min || index === 0)) lead += parts[index++];
    const rest = parts.slice(index).join('');
    return rest.length < 40 ? [lead + rest, ''] : [lead, rest];
  }

  function videoType(url) {
    if (/\.mp4(\?|#|$)/i.test(url) || /\.m4v(\?|#|$)/i.test(url)) return 'video/mp4';
    if (/\.webm(\?|#|$)/i.test(url)) return 'video/webm';
    if (/\.mov(\?|#|$)/i.test(url)) return 'video/quicktime';
    return null;
  }

  /* ---------- Copy ---------- */

  function selectText(el) {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  // Success is reported only after the clipboard accepted the text.
  async function copyText(text, pre, button, hint, expand) {
    let ok = false;
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); ok = true; } catch (_) { ok = false; }
    }
    if (!ok) {
      // Older browsers: select the visible text and use the native copy command.
      selectText(pre);
      try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      if (ok) window.getSelection().removeAllRanges();
    }
    const label = button.dataset.label || button.textContent;
    button.dataset.label = label;
    clearTimeout(button._reset);
    if (ok) {
      hint.hidden = true;
      button.textContent = 'コピーしました';
      announce('依頼文をコピーしました。');
      button._reset = setTimeout(() => { button.textContent = label; }, 2200);
    } else {
      // Leave the full text open and selected so it can be copied from the system menu.
      expand();
      selectText(pre);
      button.textContent = 'コピーできませんでした';
      hint.hidden = false;
      hint.textContent = '文を長押しして選択・コピーしてください（パソコンではドラッグして選択）。';
      button._reset = setTimeout(() => { button.textContent = label; }, 4000);
    }
  }

  function promptBlock(text, label) {
    const preId = nextId('prompt-text');
    const pre = h('pre', {class: 'prompt-text', id: preId, tabindex: '0', 'aria-label': label}, text);
    const hint = h('p', {class: 'prompt-hint', role: 'status'});
    hint.hidden = true;
    const box = h('div', {class: 'prompt'});
    const long = text.split('\n').length > 10 || text.length > 420;
    let toggle = null;
    const setExpanded = open => {
      box.classList.toggle('is-collapsed', !open);
      if (toggle) {
        toggle.setAttribute('aria-expanded', String(open));
        toggle.textContent = open ? '短く表示' : '全文を表示';
      }
    };
    if (long) {
      toggle = h('button', {type: 'button', class: 'text-btn prompt-toggle', 'aria-controls': preId, 'aria-expanded': 'false'}, '全文を表示');
      toggle.addEventListener('click', () => setExpanded(toggle.getAttribute('aria-expanded') !== 'true'));
      setExpanded(false);
    }
    const copy = h('button', {type: 'button', class: 'btn btn-ink prompt-copy'}, '依頼文をコピー');
    copy.addEventListener('click', () => copyText(text, pre, copy, hint, () => setExpanded(true)));
    box.append(...[
      h('div', {class: 'prompt-bar'}, h('span', {class: 'prompt-label'}, label), copy),
      pre,
      toggle ? h('div', {class: 'prompt-foot'}, toggle) : null,
      hint].filter(Boolean));
    return box;
  }

  /* ---------- Catalog and categories ---------- */

  // Category labels come from catalog.categories (fallback: data/categories.json), never from this file.
  const categories = Object.create(null);
  let catalogPromise = null;

  function loadCatalog() {
    if (!catalogPromise) {
      catalogPromise = (async () => {
        const data = await loadJSON('data/catalog.json');
        const entries = Array.isArray(data) ? data : (Array.isArray(data.entries) ? data.entries : []);
        let list = !Array.isArray(data) && Array.isArray(data.categories) ? data.categories : [];
        if (!list.length) {
          try {
            const extra = await loadJSON('data/categories.json');
            list = Array.isArray(extra.categories) ? extra.categories : [];
          } catch (_) { list = []; }
        }
        const ordered = [];
        for (const category of list) {
          if (!category || typeof category.id !== 'string' || !category.id || categories[category.id]) continue;
          categories[category.id] = category;
          ordered.push(category);
        }
        return {entries, categories: ordered};
      })();
    }
    return catalogPromise;
  }

  // null means the file could not be read (as opposed to an empty list).
  async function loadCases() {
    try {
      const data = await loadJSON('data/cases.json');
      return (Array.isArray(data) ? data : (Array.isArray(data.cases) ? data.cases : [])).filter(item => item && item.id);
    } catch (_) {
      return null;
    }
  }

  const categoryLabel = id => (categories[id] && categories[id].label) || id || '分類なし';
  const categoryHref = id => './#' + encodeURIComponent(categories[id] ? id : 'catalog');

  function sourceLabel(entry) {
    const id = entry.source_project;
    if (id === 'curated') return '八百万図AIツールボックス 原典確認済みの紹介';
    if (!id) return '八百万図AIツールボックス 統合カタログ';
    return categories[id] ? '八百万図AIツールボックス ' + categoryLabel(id) + 'のカタログ' : String(id);
  }

  function renderFooterCategories(list) {
    const nav = $('[data-colophon-cats]');
    if (!nav || !list.length) return;
    nav.replaceChildren(...list.map(category => h('a', {href: './#' + encodeURIComponent(category.id)}, category.label || category.id)));
  }

  /* ---------- Page frame ---------- */

  function show(...nodes) {
    root.replaceChildren(...nodes.filter(Boolean));
    root.removeAttribute('aria-busy');
    // The content did not exist when the browser tried the #fragment, so jump to it now.
    const id = location.hash.slice(1);
    const target = /^[a-z][a-z0-9-]*$/i.test(id) ? document.getElementById(id) : null;
    if (target && root.contains(target)) target.scrollIntoView({block: 'start'});
  }

  function showState(title, body, options = {}) {
    document.title = title + '｜八百万図AIツールボックス';
    show(h('div', {class: 'page-state'},
      h('h1', {class: 'empty-title'}, title),
      h('p', {}, body),
      h('div', {class: 'actions'},
        options.retry ? h('button', {type: 'button', class: 'btn btn-ink', onclick: () => location.reload()}, 'もう一度読み込む') : null,
        h('a', {class: 'btn ' + (options.retry ? 'btn-line' : 'btn-ink'), href: './#catalog'}, 'カタログを開く'),
        h('a', {class: 'btn btn-line', href: './#cases'}, 'スキル・ツールの一覧を見る'))));
  }

  function crumbs(category) {
    return h('nav', {class: 'crumbs', 'aria-label': 'パンくず'},
      h('ol', {},
        h('li', {}, h('a', {href: './'}, 'トップ')),
        h('li', {}, h('a', {href: categoryHref(category)}, categoryLabel(category)))));
  }

  function facts(pairs) {
    const rows = pairs.filter(pair => pair && pair[1] !== null && pair[1] !== undefined && pair[1] !== '');
    if (!rows.length) return null;
    return h('dl', {class: 'facts'}, rows.map(([term, value]) => h('div', {}, h('dt', {}, term), h('dd', {}, value))));
  }

  // Sections register a short label for the table of contents.
  function article() {
    const toc = [];
    const sections = [];
    return {
      add(id, title, short, ...children) {
        toc.push([id, short || title]);
        sections.push(h('section', {class: 'a-section', id, 'aria-labelledby': id + '-title'}, h('h2', {id: id + '-title'}, title), ...children));
      },
      body(lead) {
        return h('div', {class: 'article-body'},
          toc.length > 1 ? h('nav', {class: 'toc', 'aria-label': '目次'},
            h('p', {class: 'toc-title'}, '目次'),
            h('ol', {}, toc.map(([id, label]) => h('li', {}, h('a', {href: '#' + id}, label))))) : null,
          h('div', {class: 'article-main'}, lead, sections));
      }
    };
  }

  function linkList(items) {
    return h('ul', {class: 'd-links'}, items.map(([label, url]) => h('li', {},
      h('a', {href: url}, h('span', {class: 'd-link-label'}, label || displayUrl(url)), h('small', {}, isExternal(url) ? displayUrl(url) : 'このサイト内')))));
  }

  /* ---------- Produced case ---------- */

  async function findCase(id) {
    const cases = await loadCases();
    const found = cases && cases.find(item => item.id === id);
    if (found) return {item: found};
    try {
      const single = await loadJSON('data/cases/' + encodeURIComponent(id) + '.json');
      if (single && single.id === id) return {item: single};
    } catch (_) { /* not found or unreadable */ }
    return {item: null, failed: cases === null};
  }

  function skillName(item) {
    if (item.catalog_entry && item.catalog_entry.name) return item.catalog_entry.name;
    const first = Array.isArray(item.applied_skills) && item.applied_skills[0];
    return (first && first.name) || '';
  }

  function videoBlock(item, extras) {
    const video = safeHref(item.video);
    if (!video) return null;
    const wideVideo = safeHref(item.video_landscape);
    const portraitVideo = safeHref(item.video_portrait);
    const player = window.SY.media.create(item);
    const frame = h('div', {class: 'video-frame'}, player);
    const [noteLead, noteRest] = splitLead(extras.videoNote || '使い方の解説動画', 50);
    return h('section', {class: 'article-video', id: 'video', 'aria-label': '解説動画'},
      h('figure', {},
        frame,
        h('figcaption', {},
          h('p', {class: 'video-note'}, '画面幅に合わせて縦横を切り替え、無音で自動再生します。音声がある動画は操作で音を出せます。'),
          h('p', {class: 'video-note'}, noteLead),
          noteRest ? h('details', {class: 'more-text'}, h('summary', {}, '動画の説明をすべて読む'), h('p', {}, noteRest)) : null,
          h('p', {class: 'video-links'},
            h('a', {href: video}, '動画を大きく見る'),
            wideVideo ? h('a', {href: wideVideo}, '横向き版を見る') : null,
            portraitVideo ? h('a', {href: portraitVideo}, '縦向き版を見る') : null,
            extras.videoSource ? h('a', {href: extras.videoSource}, '映像のソースを開く') : null))),
      window.SY.videoShare.create(item));
  }

  function briefSample(sample, demo) {
    const brief = sample.brief || {};
    const route = sample.route || {};
    const skills = (route.skills || []).map(skill => skill && skill.name).filter(Boolean);
    const acceptance = (brief.acceptance || []).slice(0, 3);
    const assumptions = (brief.assumptions || []).slice(0, 1);
    return h('li', {class: 'sample'},
      h('div', {class: 'sample-part'},
        h('p', {class: 'sample-label'}, '入力', sample.label ? '　' + sample.label : null),
        h('p', {class: 'sample-quote'}, h('q', {}, brief.request || ''))),
      h('div', {class: 'sample-part'},
        h('p', {class: 'sample-label'}, 'できたブリーフ'),
        h('dl', {class: 'sample-facts'},
          h('dt', {}, '題名'), h('dd', {}, brief.title || ''),
          h('dt', {}, '分野'), h('dd', {}, route.category_label || categoryLabel(brief.category)),
          h('dt', {}, '読むスキル'), h('dd', {}, skills.join('、') || (brief.skill_refs || []).join('、')),
          h('dt', {}, '目的'), h('dd', {}, brief.goal || ''),
          h('dt', {}, '完成条件'), h('dd', {}, h('ul', {class: 'checks'}, acceptance.map(text => h('li', {}, text)))),
          assumptions.length ? [h('dt', {}, '仮の条件'), h('dd', {}, assumptions[0])] : null)),
      demo && sample.id ? h('a', {class: 'sample-link', href: demo + '#' + encodeURIComponent(sample.id)}, 'このブリーフをデモで全部見る') : null);
  }

  function sampleValue(data, label) {
    const isText = typeof data === 'string';
    const text = isText ? data : JSON.stringify(data, null, 2);
    if (typeof text !== 'string') return h('p', {class: 'd-note'}, '記録がありません。');
    const body = isText
      ? h('p', {class: 'sample-text'}, text)
      : h('pre', {class: 'sample-code', tabindex: '0', 'aria-label': label + '（JSON）'}, text);
    if (text.length <= LONG_SAMPLE) return body;
    const size = isText ? text.length + '字' : 'JSON・' + text.split('\n').length + '行';
    return h('details', {class: 'sample-more'}, h('summary', {}, label + 'の全文を開く（' + size + '）'), body);
  }

  function pairSample(sample, demo) {
    return h('li', {class: 'sample'},
      h('h3', {class: 'sample-title'}, sample.label || sample.id || ''),
      h('div', {class: 'sample-part'}, h('p', {class: 'sample-label'}, '入力'), sampleValue(sample.input, '入力')),
      h('div', {class: 'sample-part is-output'}, h('p', {class: 'sample-label'}, '結果'), sampleValue(sample.output, '結果')),
      demo && sample.id ? h('a', {class: 'sample-link', href: demo + '#' + encodeURIComponent(sample.id)}, 'この結果をデモで開く') : null);
  }

  async function renderCase(item) {
    const extras = {
      ...(CASE_EXTRAS[item.id] || {}),
      ...(item.video_note ? {videoNote: item.video_note} : {}),
      ...(safeHref(item.video_source) ? {videoSource: safeHref(item.video_source)} : {}),
      ...(safeHref(item.skill_license) ? {skillLicense: safeHref(item.skill_license)} : {})
    };
    const pairs = item.sample_format === 'input-output';
    const demo = safeHref(item.demo);
    const video = safeHref(item.video);
    const skill = safeHref(item.skill);
    const samplesUrl = safeHref(item.samples);
    const hasRequest = typeof item.request === 'string' && item.request.trim();
    const skillTitle = skillName(item);
    document.title = (item.title || item.id) + '｜八百万図AIツールボックス';

    let samples = [];
    if (samplesUrl) {
      try {
        const data = await loadJSON(samplesUrl);
        samples = Array.isArray(data.samples) ? data.samples : [];
      } catch (_) { samples = []; }
    }

    const entry = item.catalog_entry || {};
    const description = entry.summary || item.summary;
    const overview = entry.tagline;
    const head = h('header', {class: 'article-head'},
      crumbs(item.category),
      h('p', {class: 'card-meta'},
        h('span', {class: 'card-cat'}, categoryLabel(item.category)),
        entry.kind ? h('span', {}, entry.kind) : null),
      h('h1', {class: 'article-title article-tool-name'}, skillTitle || item.title || item.id),
      overview ? h('p', {class: 'article-overview'}, overview) : null,
      description ? h('p', {class: 'article-lead'}, description) : null,
      demo || hasRequest ? h('div', {class: 'actions'},
        demo ? h('a', {class: 'btn btn-ink', href: demo}, 'デモを開く') : null,
        hasRequest ? h('a', {class: 'btn btn-line', href: '#prompt'}, '依頼文を見る') : null) : null,
      facts([
        ['分野', categoryLabel(item.category)],
        ['デモ・動画の制作モデル', item.model ? MODEL_LABELS[item.model] || item.model : null],
        ['状態', item.status ? STATUS_LABELS[item.status] || item.status : null],
        ['デモのコード・素材の条件', item.license || null],
        ['動画の条件', item.video_license ? item.video_license.label : null],
        ['更新日', item.updated_on || null]
      ]));

    const page = article();

    if (demo) {
      page.add('demo', 'デモ', 'デモ',
        h('div', {class: 'demo-callout'},
          h('p', {}, item.demo_description || '実際の依頼を選ぶと、選ばれた分野、読むスキル、できあがったブリーフが並びます。依頼文のコピーとJSONの保存もできます。'),
          h('a', {class: 'btn btn-ink', href: demo}, 'デモを開く')),
        h('p', {class: 'd-note'}, item.demo_note || 'デモに表示されるのは、事前に制作したサンプルです。ページ上でAIを実行することはありません。'));
    }

    if (samples.length) {
      page.add('examples', item.samples_title || (pairs ? '実入力と結果' : samples.length + 'つの依頼と、できたブリーフ'), '入力と結果',
        h('p', {}, item.samples_intro || (pairs ? 'デモで使った入力と、表示する結果です。' : 'どれも依頼の文はそのまま残し、成果物から分野を選んでいます。依頼にない日時や名前は書かず、仮の条件として分けました。')),
        h('ol', {class: 'samples'}, samples.map(sample => pairs ? pairSample(sample, demo) : briefSample(sample, demo))));
    } else if (samplesUrl) {
      page.add('examples', '実入力と結果', '入力と結果',
        h('p', {}, 'サンプルのファイルを読み込めませんでした。'),
        h('p', {}, h('a', {href: samplesUrl}, 'サンプルのファイルを直接開く')));
    }

    if (hasRequest) {
      page.add('prompt', 'AIへの頼み方', '依頼文',
        h('p', {}, item.request_intro || 'SKILL.mdを読み込めるAIに、次の文章を渡します。最後の「依頼：」の部分を、自分の言葉に置き換えて使ってください。'),
        promptBlock(item.request, '依頼文の例'));
    }

    if (Array.isArray(item.limitations) && item.limitations.length) {
      page.add('limits', 'できないことと注意', '注意点', h('ul', {class: 'limits'}, item.limitations.map(text => h('li', {}, text))));
    }

    if (Array.isArray(item.steps) && item.steps.length) {
      page.add('method', '制作の方法', '制作の方法',
        h('ol', {class: 'steps'}, item.steps.map(step => h('li', {}, h('h3', {}, step.title || ''), h('p', {}, step.body || '')))));
    }

    if (Array.isArray(item.applied_skills) && item.applied_skills.length) {
      page.add('skills', '使ったスキルと、使い方', '使ったスキル',
        h('dl', {class: 'applied'}, item.applied_skills.map(applied => {
          const source = safeHref(applied.source);
          return h('div', {},
            h('dt', {}, applied.name || '', source ? h('small', {}, h('a', {href: source}, applied.source)) : (applied.source ? h('small', {}, applied.source) : null)),
            h('dd', {}, applied.applied || ''));
        })));
    }

    const downloads = [
      skill && [item.skill_label || 'スキル（SKILL.md）', item.skill_description || 'AIに読ませる手順書', skill],
      extras.skillLicense && ['原典のライセンス', '紹介するスキル・ツールの利用条件', extras.skillLicense],
      samplesUrl && [pairs ? '実入力と結果（JSON）' : samples.length + '件のブリーフ（JSON）', 'デモで表示しているサンプル', samplesUrl],
      ['検証と制作の記録（JSON）', '手順・使ったスキル・出典', 'data/cases/' + encodeURIComponent(item.id) + '.json'],
      extras.videoSource && ['映像のソース', 'ブラウザで開いて再生・確認できます', extras.videoSource]
    ].filter(Boolean);
    page.add('downloads', 'ダウンロード', 'ダウンロード',
      h('ul', {class: 'downloads'}, downloads.map(([label, note, href]) => h('li', {},
        h('a', {href, download: /\.(md|json)$/i.test(href) || /LICENSE[^/]*$/.test(href) ? '' : null}, h('strong', {}, label), h('span', {}, note))))));

    const sources = (item.sources || []).map(source => [source && source.label, safeHref(source && source.url)]).filter(([, url]) => url);
    page.add('sources', '出典とライセンス', '出典',
      sources.length ? linkList(sources) : null,
      h('p', {class: 'd-note'}, item.license_note || ((item.license ? 'このページのコード・サンプルは ' + item.license + ' License です。' : '') + '外部の原典は、それぞれのライセンスに従います。')),
      video ? h('p', {class: 'd-note'}, '完成動画はクレジット付きで商用利用・編集・再配布できます。Xの投稿本文には @studio_yebisu の記載が必須です。 ', h('a', {href: 'media-rights.html'}, '動画の利用条件')) : null);

    setTabbar([
      ['ツール一覧', './#cases', 'list'],
      video ? ['動画', '#video', 'cases'] : null,
      demo ? ['デモ', demo, 'demo'] : null,
      hasRequest ? ['依頼文', '#prompt', 'prompt'] : null
    ]);

    show(head, videoBlock(item, extras), page.body(null));
  }

  /* ---------- Catalog entry (source guide) ---------- */

  // A catalog entry counts as produced only when a 八百万図AIツールボックス case points to it. If cases.json is
  // unreadable, an entry whose guide_url is a case article still links there.
  function caseForEntry(entry, cases) {
    const direct = cases && cases.find(item => item.catalog_entry && item.catalog_entry.id === entry.id);
    if (direct) return direct;
    const match = typeof entry.guide_url === 'string' && CASE_LINK.exec(entry.guide_url.trim());
    if (!match) return null;
    if (!cases) return {id: match[1]};
    return cases.find(item => item.id === match[1]) || null;
  }

  function renderEntry(entry, produced) {
    document.title = (entry.name || entry.id) + '｜八百万図AIツールボックス';
    const skill = String(entry.kind || '').trim() === 'スキル';
    const category = categories[entry.category];
    const caseHref = produced ? 'case.html?id=' + encodeURIComponent(produced.id) : null;
    const sourceOnly = !produced && entry.verification_stage === 'source-reviewed';
    const image = safeHref(entry.image);
    let media = null;
    if (image) {
      media = h('figure', {class: 'd-media'});
      const el = VIDEO_EXT.test(image)
        ? h('video', {src: image, controls: true, preload: 'none', playsinline: true, 'aria-label': (entry.name || '') + (produced ? 'の解説動画' : 'の動画')})
        : h('img', {src: image, alt: (entry.name || '') + (produced ? 'の紹介画像' : 'の紹介画像'), decoding: 'async'});
      el.addEventListener('error', () => media.classList.add('is-missing'));
      media.append(el);
    }

    const hasPrompt = typeof entry.prompt === 'string' && entry.prompt.trim();
    const guide = safeHref(entry.guide_url) || safeHref(entry.source_url);
    const prompt = hasPrompt ? entry.prompt.trim() : [
      (entry.name || entry.id) + ' を使いたいです。',
      'まず原典の説明' + (guide ? '（' + guide + '）' : '') + 'を読み、次の用途に合うか確かめてから進めてください。',
      entry.use_case ? '用途：' + entry.use_case : '',
      '完成したら、何を作ったかと、確かめた方法を短く教えてください。'
    ].filter(Boolean).join('\n');

    const license = safeHref(entry.license_url);
    const source = safeHref(entry.source_url);
    const selfPage = 'case.html?entry=' + encodeURIComponent(entry.id);
    const links = [
      ['原典', entry.source_url],
      ['使い方の案内', entry.guide_url === caseHref || entry.guide_url === selfPage ? null : entry.guide_url],
      ['詳しい紹介記事', caseHref],
      [produced ? 'デモを開く' : '掲載元の見本', entry.example_url === selfPage ? null : entry.example_url],
      ['スキルをダウンロード', entry.skill_download]
    ].map(([label, url]) => [label, safeHref(url)]).filter(([, url]) => url);

    const stage = caseHref ? '動画・デモあり'
      : sourceOnly ? '紹介のみ'
      : entry.example_url || entry.image ? '掲載元の見本あり' : null;
    const useAnchor = entry.use_case ? '#use' : Array.isArray(entry.workflow) && entry.workflow.length ? '#workflow' : null;

    const head = h('header', {class: 'article-head'},
      crumbs(entry.category),
      h('p', {class: 'card-meta'},
        h('span', {class: 'entry-kind'}, h('span', {class: 'mark ' + (skill ? 'mark-skill' : 'mark-support'), 'aria-hidden': 'true'}), entry.kind || 'その他'),
        h('span', {}, categoryLabel(entry.category)),
        stage ? h('span', {class: caseHref ? 'entry-case' : 'stage'}, stage) : null),
      h('h1', {class: 'article-title article-title-entry article-tool-name'}, entry.name || entry.id),
      entry.tagline ? h('p', {class: 'article-overview'}, entry.tagline) : null,
      entry.summary ? h('p', {class: 'article-lead'}, entry.summary) : null,
      h('div', {class: 'actions'},
        caseHref ? h('a', {class: 'btn btn-ink', href: caseHref}, '詳しい紹介を読む') : null,
        h('a', {class: 'btn ' + (caseHref ? 'btn-line' : 'btn-ink'), href: '#prompt'}, '依頼文を見る'),
        source ? h('a', {class: 'btn btn-line', href: source}, '原典を開く') : null),
      entry.verification ? h('p', {class: 'status-note'}, h('strong', {}, '確認状況'), entry.verification) : null);

    const page = article();
    if (entry.use_case) page.add('use', '使いどころ', '使いどころ', h('p', {}, entry.use_case));
    if (Array.isArray(entry.workflow) && entry.workflow.length) page.add('workflow', '最初の試し方', '試し方', h('ol', {class: 'd-list'}, entry.workflow.map(step => h('li', {}, step))));
    if (Array.isArray(entry.requirements) && entry.requirements.length) page.add('requirements', '使う環境', '使う環境', h('ul', {class: 'd-list'}, entry.requirements.map(requirement => h('li', {}, requirement))));
    page.add('prompt', 'AIへの頼み方', '依頼文',
      promptBlock(prompt, hasPrompt ? '依頼文の例' : '依頼文のひな形'),
      hasPrompt ? null : h('p', {class: 'd-note'}, 'この項目には依頼文の例がまだないため、原典を読んでから使うためのひな形を表示しています。'));
    page.add('conditions', '分類・確認状況・ライセンス', '条件',
      h('dl', {class: 'd-facts'},
        h('div', {}, h('dt', {}, '分野'), h('dd', {}, h('a', {href: categoryHref(entry.category)}, categoryLabel(entry.category)), category && category.group ? '（' + category.group + '）' : null, category && category.description ? h('span', {class: 'd-note d-inline'}, category.description) : null)),
        h('div', {}, h('dt', {}, '種類'), h('dd', {}, entry.kind || 'その他')),
        h('div', {}, h('dt', {}, '確認状況'), h('dd', {}, entry.verification || '記載なし')),
        h('div', {}, h('dt', {}, '原典'), h('dd', {}, source ? h('a', {class: 'url', href: source}, displayUrl(source)) : '記載なし')),
        h('div', {}, h('dt', {}, 'ライセンス'), h('dd', {}, license ? h('a', {href: license}, entry.license || 'ライセンスを見る') : (entry.license || '原典で確認してください'))),
        h('div', {}, h('dt', {}, 'デモ・動画'), h('dd', {}, caseHref
          ? h('a', {href: caseHref}, produced.title || '詳しい紹介とデモ')
          : sourceOnly ? '紹介のみで、デモ・動画は未制作です。' : entry.example_url || entry.image ? '掲載元のデモ・見本を参照できます。確認した範囲は上記の記録をご覧ください。' : 'この統合サイトの制作記事は未掲載です。'))),
      entry.license_note ? h('p', {class: 'd-note'}, entry.license_note) : null);
    if (links.length) page.add('links', 'リンク', 'リンク', linkList(links));
    if (Array.isArray(entry.tags) && entry.tags.length) page.add('tags', 'タグ', 'タグ', h('ul', {class: 'tags'}, entry.tags.map(tag => h('li', {}, tag))));
    page.add('source-note', '出典について', '出典',
      h('p', {}, entry.source_note || ('この項目は、' + sourceLabel(entry) + 'に掲載している情報です。説明は原典をもとに日本語でまとめています。最新の内容と利用条件は原典で確かめてください。')),
      h('div', {class: 'actions'}, h('a', {class: 'btn btn-line', href: categoryHref(entry.category)}, categoryLabel(entry.category) + 'の一覧に戻る')));

    setTabbar([
      ['一覧', categoryHref(entry.category), 'list'],
      useAnchor ? ['使い方', useAnchor, 'guide'] : null,
      ['依頼文', '#prompt', 'prompt'],
      source ? ['原典', source, 'source'] : null
    ]);

    show(head, page.body(media));
  }

  /* ---------- Route ---------- */

  async function start() {
    const params = new URLSearchParams(location.search);
    const caseId = params.get('id');
    const entryId = params.get('entry');

    // Labels for every route; the article still renders if the catalog cannot be read.
    const catalog = loadCatalog();
    catalog.then(data => renderFooterCategories(data.categories)).catch(() => {});

    if (caseId) {
      if (!ID_PATTERN.test(caseId)) return showState('紹介ページが見つかりません', 'URLの項目名が正しくありません。一覧かカタログから選び直してください。');
      const [found] = await Promise.all([findCase(caseId), catalog.catch(() => null)]);
      if (found.item) return renderCase(found.item);
      if (found.failed) return showState('紹介ページを読み込めませんでした', '通信状態を確かめてから、もう一度読み込んでください。', {retry: true});
      return showState('紹介ページが見つかりません', '「' + caseId + '」はまだ掲載されていません。一覧かカタログから選び直してください。');
    }

    if (entryId) {
      if (!ID_PATTERN.test(entryId)) return showState('項目が見つかりません', 'URLの項目名が正しくありません。カタログから選び直してください。');
      let entries;
      let cases;
      try {
        [{entries}, cases] = await Promise.all([catalog, loadCases()]);
      } catch (_) {
        return showState('カタログを読み込めませんでした', '通信状態を確かめてから、もう一度読み込んでください。', {retry: true});
      }
      const entry = entries.find(item => item && item.id === entryId);
      if (!entry) return showState('項目が見つかりません', '「' + entryId + '」はカタログにありません。名前が変わった可能性があります。カタログから探し直してください。');
      return renderEntry(entry, caseForEntry(entry, cases));
    }

    showState('表示する項目が選ばれていません', '一覧かカタログから、見たいものを選んでください。');
  }

  start().catch(() => showState('ページを表示できませんでした', '時間をおいて、もう一度開いてください。', {retry: true}));
})();
