// トークンバケットの説明用モデル（純粋関数のみ）。
// ネットワーク・タイマー・乱数は使わない。実際のAPIには接続しない。
// 状態は凍結したオブジェクトで、操作は新しい状態を返す。

export const CAPACITY = 8;
export const INITIAL = 8;
export const REFILL_PER_SECOND = 2;

const freeze = (value) => Object.freeze(value);

const snapshot = (state) => freeze({
  tokens: state.tokens,
  seconds: state.seconds,
  accepted: state.accepted,
  refused: state.refused,
});

export function createBucket({capacity = CAPACITY, initial = INITIAL, rate = REFILL_PER_SECOND} = {}) {
  if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError('capacity は1以上の整数');
  if (!Number.isInteger(initial) || initial < 0 || initial > capacity) throw new RangeError('initial は0〜capacityの整数');
  if (!Number.isInteger(rate) || rate < 0) throw new RangeError('rate は0以上の整数');
  return freeze({capacity, rate, tokens: initial, seconds: 0, accepted: 0, refused: 0, last: null});
}

// 時間を整数秒だけ進める。1秒ごとに rate 枚を足し、capacity で止める。
export function advance(state, seconds = 1) {
  if (!Number.isInteger(seconds) || seconds < 0) throw new RangeError('seconds は0以上の整数');
  const added = Math.min(state.capacity - state.tokens, state.rate * seconds);
  return freeze({
    ...state,
    tokens: state.tokens + added,
    seconds: state.seconds + seconds,
    last: freeze({kind: 'refill', seconds, added, capped: added < state.rate * seconds, before: snapshot(state)}),
  });
}

// リクエスト1件。トークンが1枚以上あれば1枚使って許可、なければ拒否。
export function request(state) {
  if (state.tokens >= 1) {
    return freeze({
      ...state,
      tokens: state.tokens - 1,
      accepted: state.accepted + 1,
      last: freeze({kind: 'accept', before: snapshot(state)}),
    });
  }
  return freeze({
    ...state,
    refused: state.refused + 1,
    last: freeze({kind: 'refuse', before: snapshot(state)}),
  });
}

// 同じ時刻に count 件。途中の状態をすべて返す（最後が結果）。
export function requestMany(state, count) {
  const steps = [];
  let current = state;
  for (let index = 0; index < count; index++) {
    current = request(current);
    steps.push(current);
  }
  return steps;
}

// 操作の列をまとめて適用する。'request' か {advance: 秒}。
export function run(state, operations) {
  return operations.reduce((current, op) => (op === 'request' ? request(current) : advance(current, op.advance)), state);
}

export function readoutOf(state) {
  return `残り ${state.tokens}/${state.capacity} · 許可 ${state.accepted} · 拒否 ${state.refused} · ${state.seconds}秒`;
}

export function captionOf(state) {
  const last = state.last;
  if (!last) return `満タンです。トークンは${state.tokens}枚あり、${state.tokens}件まではすぐ通せます。`;
  if (last.kind === 'accept') return `1件を通しました。トークンを1枚使い、残りは${state.tokens}枚です。`;
  if (last.kind === 'refuse') return 'トークンが0枚なので、この1件は拒否しました。補充を待つ必要があります。';
  if (last.added === 0) return `${last.seconds}秒たちましたが、すでに上限の${state.capacity}枚なので増えません。`;
  if (last.capped) return `${last.seconds}秒たち、上限の${state.capacity}枚で止まりました（${last.added}枚だけ補充）。`;
  return `${last.seconds}秒たち、${last.added}枚を補充しました。残りは${state.tokens}枚です。`;
}
