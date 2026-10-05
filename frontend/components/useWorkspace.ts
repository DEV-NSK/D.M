'use client';
import {useEffect,useState} from 'react';import {useRouter} from 'next/navigation';
export const api=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000/api/v1';
export function useWorkspace(){const [me,setMe]=useState<any>();const router=useRouter();useEffect(()=>{fetch(api+'/me',{credentials:'include'}).then(async r=>{if(r.status===401){router.push('/login');return}const x=await r.json();setMe(x.data)})},[router]);return me}
export async function request(path:string,options:RequestInit={}){const r=await fetch(api+path,{credentials:'include',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});const x=await r.json();if(!r.ok)throw new Error(x.error?.message||'Request failed.');return x}
export const label=(s:string)=>s.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
