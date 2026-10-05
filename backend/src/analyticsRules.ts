export function rate(numerator:number,denominator:number){return denominator?Math.round(numerator/denominator*10000)/100:0}
export function parseDateRange(input:any){
  const end=input.endDate?new Date(`${input.endDate}T23:59:59.999Z`):new Date();
  const start=input.startDate?new Date(`${input.startDate}T00:00:00.000Z`):new Date(end.getTime()-29*86400000);
  if(Number.isNaN(start.valueOf())||Number.isNaN(end.valueOf())||start>end)throw Object.assign(new Error('startDate and endDate must form a valid date range.'),{statusCode:422});
  if(end.getTime()-start.getTime()>366*86400000)throw Object.assign(new Error('Date range cannot exceed 366 days.'),{statusCode:422});
  return {start,end};
}
export function csv(rows:Record<string,unknown>[]){if(!rows.length)return '';const keys=Object.keys(rows[0]);const esc=(v:unknown)=>`"${String(v??'').replaceAll('"','""')}"`;return [keys.map(esc).join(','),...rows.map(r=>keys.map(k=>esc(r[k])).join(','))].join('\r\n')}
