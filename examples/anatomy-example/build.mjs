// 単体の figure.svg を書き出す（Node 20 以上、依存なし）。
//   node build.mjs                 満タンの静止状態
//   node build.mjs --state refused 8件通したあと9件目を拒否した状態
// ページと動画と同じ renderFigure（figure.mjs）と model.mjs を使う。ネットワークは使わない。

import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createBucket, run} from './model.mjs';
import {renderFigure, FIGURE} from './figure.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(HERE, 'figure.css'), 'utf8');

const STATES = {
  full: [],
  refused: Array.from({length: 9}, () => 'request'),
  refilled: [...Array.from({length: 9}, () => 'request'), {advance: 1}],
};

const flag = process.argv.indexOf('--state');
const name = flag > 0 ? process.argv[flag + 1] : 'full';
if (!STATES[name]) {
  console.error(`--state は ${Object.keys(STATES).join(' / ')} のどれか`);
  process.exit(1);
}

const state = {...run(createBucket(), STATES[name]), progress: 1};
const svg = renderFigure(state, {...FIGURE, standalone: true, css});
const file = name === 'full' ? 'figure.svg' : `figure-${name}.svg`;
writeFileSync(join(HERE, file), `<?xml version="1.0" encoding="UTF-8"?>\n${svg}\n`);
console.log('wrote', file, `(${state.tokens}/${state.capacity}, 許可${state.accepted}, 拒否${state.refused})`);
