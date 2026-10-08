'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {AlertTriangle,ArrowRight,CheckCircle2,Clock3} from 'lucide-react';
import {Layout} from '../../components/Layout';
import {api,label,useWorkspace} from '../../components/useWorkspace';

const copy:any={
 CEO:{eyebrow:'ORGANIZATION',title:'Agency Overview',subtitle:"A high-level view of your organization's performance.",cta:'View reports',href:'/reports'},
 MANAGER:{eyebrow:'OPERATIONS',title:'Operations Overview',subtitle:'Keep campaigns, teams and execution moving.',cta:'Create task',href:'/tasks/new'},
 TEAM_LEAD:{eyebrow:'TEAM',title:'Team Execution',subtitle:"Here’s your team's work for today.",cta:'Create task',href:'/tasks/new'},
 EMPLOYEE:{eyebrow:'MY WORK',title:'My Work',subtitle:'Everything you need to complete today.',cta:'Open my tasks',href:'/my-tasks'},
};
export default function Dashboard(){
 const me=useWorkspace(),[data,setData]=useState<any>(),[tasks,setTasks]=useState<any>(),[items,setItems]=useState<any[]>([]),[error,setError]=useState('');
 useEffect(()=>{Promise.all([fetch(api+'/dashboard/summary',{credentials:'include'}),fetch(api+'/task-dashboard',{credentials:'include'}),fetch(api+'/tasks?page_size=8',{credentials:'include'})]).then(async rs=>{if(rs.some(r=>!r.ok))throw Error('We couldn’t load your workspace.');return Promise.all(rs.map(r=>r.json()))}).then(([d,t,i])=>{setData(d.data);setTasks(t.data);setItems(i.data||[])}).catch(e=>setError(e.message))},[]);
 if(!me)return <DashboardSkeleton/>;
 if(error)return <Layout me={me}><section className="card dashboard-error"><AlertTriangle/><h1>We couldn’t load your dashboard.</h1><p>Please check your connection and try again.</p><button onClick={()=>location.reload()}>Try again</button></section></Layout>;
 if(!data||!tasks)return <DashboardSkeleton/>;
 const c=copy[me.role]||copy.EMPLOYEE,employee=me.role==='EMPLOYEE',ceo=me.role==='CEO';
 const metrics=ceo?[['Active Clients',data.activeClients],['Active Campaigns',data.activeCampaigns],['Total Tasks',tasks.total],['Completed Tasks',tasks.completed],['Overdue Tasks',tasks.overdue],['Pending Review',tasks.inReview]]:employee?[['Assigned Tasks',tasks.total],['Due Today',tasks.dueToday],['Overdue',tasks.overdue],['In Progress',tasks.inProgress],['Completed',tasks.completed],['Awaiting Review',tasks.inReview]]:[['Active Campaigns',data.activeCampaigns],['Active Tasks',tasks.total],['Due Today',tasks.dueToday],['Overdue',tasks.overdue],['Completed',tasks.completed],['Pending Review',tasks.inReview]];
 const urgent=items.filter(x=>x.blocked||(['TODO','ASSIGNED','IN_PROGRESS'].includes(x.status)&&x.dueDate&&new Date(x.dueDate)<=new Date(Date.now()+86400000))).slice(0,5);
 return <Layout me={me}><header className="page-head role-hero"><div><p className="eyebrow">{c.eyebrow}</p><h1>{c.title}</h1><p>{c.subtitle}</p></div><Link href={c.href} className="button">{c.cta}</Link></header>
  <section className="metrics role-metrics" aria-label="Workspace metrics">{metrics.map((m:any)=><Metric key={m[0]} heading={m[0]} number={m[1]}/>)}</section>
  <div className="dashboard-grid"><section className="card dashboard-span"><div className="card-title"><div><h2>{employee?'Today’s Priorities':me.role==='TEAM_LEAD'?'Team Priorities':'Campaign Performance'}</h2><p>{employee?'Your most urgent assigned work.':'Live work in your authorized scope.'}</p></div><Link className="record-link" href={employee?'/my-tasks':'/tasks'}>View all <ArrowRight size={14}/></Link></div>{urgent.length?urgent.map(x=><Link className="priority-row" href={`/tasks/${x.id}`} key={x.id}><span className={`status-dot ${x.blocked?'danger':''}`}/><div><b>{x.title}</b><p>{x.campaign?.name||'General work'} · {x.dueDate?new Date(x.dueDate).toLocaleDateString():'No due date'}</p></div><span className="pill">{x.blocked?'Blocked':label(x.status)}</span></Link>):<Empty title="Nothing urgent" text="You’re clear for now. New priorities will appear here."/>}</section>
   <section className="card"><div className="card-title"><div><h2>{employee?'My Campaigns':me.role==='TEAM_LEAD'?'Campaign Progress':'Active Campaigns'}</h2><p>Recently updated in your scope.</p></div></div>{data.recentCampaigns.length?data.recentCampaigns.map((x:any)=><Link className="campaign-row" href={`/campaigns/${x.id}`} key={x.id}><span><b>{x.name}</b><small>Updated {new Date(x.updatedAt).toLocaleDateString()}</small></span><span className="pill green">{label(x.status)}</span></Link>):<Empty title="No campaigns yet" text="Campaigns you can access will appear here."/>}</section>
   <section className="card"><div className="card-title"><div><h2>{employee?'My Progress':me.role==='TEAM_LEAD'?'Blocked Work':'Attention Required'}</h2><p>Signals generated from current task data.</p></div></div><div className="insight"><AlertTriangle size={18}/><span><b>{tasks.overdue} overdue</b><small>{tasks.overdue?'Needs attention now':'No overdue work'}</small></span></div><div className="insight"><Clock3 size={18}/><span><b>{tasks.inReview} pending review</b><small>{employee?'Waiting for feedback':'Awaiting a decision'}</small></span></div><div className="insight"><CheckCircle2 size={18}/><span><b>{tasks.completed} completed</b><small>In your current scope</small></span></div></section>
  </div></Layout>
}
function Metric({heading,number}:{heading:string;number:number}){return <article className="metric"><small>{heading}</small><strong>{number}</strong><p><span>●</span> Live workspace data</p></article>}
function Empty({title,text}:{title:string;text:string}){return <div className="empty"><h3>{title}</h3><p>{text}</p></div>}
function DashboardSkeleton(){return <main className="dashboard-loading" aria-label="Loading dashboard"><div className="skeleton-line wide"/><div className="skeleton-line"/><div className="skeleton-grid">{Array.from({length:6},(_,i)=><i key={i}/>)}</div><div className="skeleton-panel"/></main>}
