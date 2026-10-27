// 八百万図AIツールボックス synthetic existing TODO. MIT.
export function selectTasks(tasks, {status = 'all', cutoff = null} = {}) {
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
