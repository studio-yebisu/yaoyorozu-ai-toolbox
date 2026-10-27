// 八百万図AIツールボックス synthetic existing TODO. MIT.
function assertCutoff(cutoff) {
  const match = typeof cutoff === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(cutoff);
  if (!match) throw new RangeError('INVALID_CUTOFF');
  const [year, month, day] = match.slice(1).map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (year < 1000 || !days || day < 1 || day > days) throw new RangeError('INVALID_CUTOFF');
}

export function selectTasks(tasks, {status = 'all', cutoff = null} = {}) {
  if (cutoff !== null && cutoff !== '') assertCutoff(cutoff);
  return tasks.filter(task => (status === 'all' || task.done === (status === 'done'))
    && (!cutoff || (task.dueDate !== null && task.dueDate <= cutoff)));
}

export function addTask(tasks, {id, title, dueDate = null}) {
  const trimmed = title.trim();
  if (!trimmed || trimmed.length > 80) throw new RangeError('INVALID_TITLE');
  if (tasks.some(task => task.id === id)) throw new RangeError('DUPLICATE_ID');
  return [...tasks, {id, title: trimmed, dueDate, done: false}];
}

export function toggleTask(tasks, id) {
  if (!tasks.some(task => task.id === id)) throw new RangeError('UNKNOWN_TASK');
  return tasks.map(task => task.id === id ? {...task, done: !task.done} : task);
}
