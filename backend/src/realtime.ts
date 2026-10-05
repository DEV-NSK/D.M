type Sink = (event: string, payload: unknown) => void;
const users = new Map<string, Set<Sink>>();

export function subscribe(userId: string, sink: Sink) {
  const set = users.get(userId) || new Set<Sink>();
  set.add(sink); users.set(userId, set);
  return () => { set.delete(sink); if (!set.size) users.delete(userId); };
}

export function publish(userIds: string[], event: string, payload: unknown) {
  for (const id of new Set(userIds)) for (const sink of users.get(id) || []) sink(event, payload);
}
