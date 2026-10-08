export type ProgressTask={status:string;blocked?:boolean;dueDate?:Date|string|null};
export function sopProgress(tasks:ProgressTask[]){
  const completed=tasks.filter(t=>t.status==='COMPLETED').length,total=tasks.length;
  return {completed,total,percentage:total?Math.round(completed*100/total):0};
}
export function dayStatus(tasks:ProgressTask[]){
  if(!tasks.length||tasks.every(t=>['TODO','ASSIGNED'].includes(t.status)))return 'NOT_STARTED';
  if(tasks.some(t=>t.blocked))return 'BLOCKED';
  if(tasks.every(t=>t.status==='COMPLETED'))return 'COMPLETED';
  return 'IN_PROGRESS';
}
export function executionHealth(tasks:ProgressTask[],now=new Date()){
  if(tasks.some(t=>t.dueDate&&new Date(t.dueDate)<now&&t.status!=='COMPLETED'))return 'OVERDUE';
  if(tasks.some(t=>t.blocked))return 'BLOCKED';
  const soon=new Date(now.getTime()+86400000);
  if(tasks.some(t=>t.dueDate&&new Date(t.dueDate)<=soon&&t.status!=='COMPLETED'))return 'AT_RISK';
  return 'HEALTHY';
}
export function hasCycle(edges:Array<[string,string]>) {const graph=new Map<string,string[]>();for(const [a,b] of edges)graph.set(a,[...(graph.get(a)||[]),b]);const visiting=new Set<string>(),done=new Set<string>();function visit(n:string):boolean{if(visiting.has(n))return true;if(done.has(n))return false;visiting.add(n);for(const x of graph.get(n)||[])if(visit(x))return true;visiting.delete(n);done.add(n);return false}return [...graph.keys()].some(visit)}
