export const taskTransitions:Record<string,string[]>={
 TODO:['ASSIGNED','CANCELLED'],
 ASSIGNED:['IN_PROGRESS','CANCELLED'],
 IN_PROGRESS:['IN_REVIEW','COMPLETED','CANCELLED'],
 IN_REVIEW:['REVISION_REQUIRED','COMPLETED'],
 REVISION_REQUIRED:['IN_PROGRESS','IN_REVIEW','CANCELLED'],
 COMPLETED:[],CANCELLED:[]
};
export function canTransition(from:string,to:string){return taskTransitions[from]?.includes(to)??false}
export function validSchedule(start?:Date|null,due?:Date|null){return !start||!due||due>=start}
export function validProgress(value:number){return Number.isInteger(value)&&value>=0&&value<=100}
