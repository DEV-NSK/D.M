'use client';

import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useState} from 'react';
import {BarChart3,Bell,BriefcaseBusiness,Building2,CalendarDays,ChevronRight,CircleHelp,LayoutDashboard,LogOut,Menu,Search,Settings,SquareCheckBig,UserRound,UsersRound,X} from 'lucide-react';

const api=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000/api/v1';
type Item=[string,string,any,string?];
const allGroups:{label:string;items:Item[]}[]=[
  {label:'Main',items:[['Dashboard','/dashboard',LayoutDashboard],['Clients','/clients',Building2,'clients.view'],['Campaigns','/campaigns',BriefcaseBusiness,'campaigns.view'],['Tasks','/tasks',SquareCheckBig,'tasks.create'],['My tasks','/my-tasks',SquareCheckBig,'tasks.view'],['Calendar','/calendar',CalendarDays,'tasks.view'],['Analytics','/analytics',BarChart3,'analytics'],['Teams','/teams',UsersRound,'teams.view']]},
  {label:'Workspace',items:[['Reports','/reports',BarChart3,'reports'],['Notifications','/notifications',Bell],['Members','/members',UserRound,'members.view'],['Invitations','/invitations',UsersRound,'members.invite']]},
  {label:'Settings',items:[['Organization settings','/settings',Settings,'organization.update'],['My profile','/profile',UserRound]]},
];

function granted(me:any,permission?:string){if(!permission)return true;const p:string[]=me.permissions||[];return p.includes('*')||p.includes(permission)||p.some(x=>permission==='analytics'?x.startsWith('analytics.'):(permission==='reports'?x.startsWith('reports.'):false));}
function visibleItem(me:any,item:Item){const [title,, ,permission]=item;if(!granted(me,permission))return false;if(me.role==='EMPLOYEE'&&['Clients','Tasks','Teams'].includes(title))return false;if(me.role!=='EMPLOYEE'&&title==='My tasks')return false;if(me.role==='TEAM_LEAD'&&title==='Clients')return false;if(me.role!=='CEO'&&title==='Organization settings')return false;return true;}

export function Layout({me,children}:{me:any;children:React.ReactNode}){
  const path=usePathname(),router=useRouter(),[open,setOpen]=useState(false);
  const initials=me.user.name.split(' ').map((x:string)=>x[0]).join('').slice(0,2).toUpperCase();
  const active=(url:string)=>path===url||(url!=='/dashboard'&&path.startsWith(url+'/'));
  const groups=allGroups.map(g=>({...g,items:g.items.filter(i=>visibleItem(me,i))})).filter(g=>g.items.length);
  const protectedRoute:Record<string,string>={'/members':'members.view','/invitations':'members.invite','/settings':'organization.update','/analytics':'analytics','/reports':'reports','/clients':'clients.view'};
  const requirement=Object.entries(protectedRoute).find(([route])=>path===route||path.startsWith(route+'/'))?.[1];
  async function logout(){await fetch(api+'/auth/logout',{method:'POST',credentials:'include'});router.push('/login')}
  if(requirement&&!granted(me,requirement))return <main className="access-denied"><section className="card"><span>403</span><h1>That area isn’t available to your role.</h1><p>Your workspace only shows data and actions you’re authorized to use.</p><Link className="button" href="/dashboard">Return to dashboard</Link></section></main>;
  return <main className="app-shell">
    {open&&<button className="nav-scrim" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}<aside className={`sidebar ${open?'is-open':''}`} aria-label="Primary navigation">
      <div className="sidebar-head"><Link className="brand" href="/dashboard"><span className="brand-mark">D</span><span><b>D.M</b><small>Digital Marketing</small></span></Link><button className="nav-close" onClick={()=>setOpen(false)} aria-label="Close menu"><X size={19}/></button></div>
      <p className="workspace"><b>{me.organization.name}</b><small>{me.role==='CEO'?'Organization workspace':'My workspace'}</small></p>
      <nav>{groups.map(group=><section className="nav-group" key={group.label}><p>{group.label}</p>{group.items.map(([title,url,Icon])=><Link className={active(url)?'active':''} aria-current={active(url)?'page':undefined} href={url} key={url} onClick={()=>setOpen(false)}><Icon size={17}/><span>{title}</span>{active(url)&&<ChevronRight className="nav-arrow" size={14}/>}</Link>)}</section>)}</nav>
      <div className="sidebar-help"><CircleHelp size={17}/><div><b>Need help?</b><small>Visit the help center</small></div></div><div className="side-user"><span>{initials}</span><div><b>{me.user.name}</b><small>{me.role.replace('_',' ')}</small></div><button onClick={logout} title="Sign out" aria-label="Sign out"><LogOut size={17}/></button></div>
    </aside><section className="main"><header className="topbar"><button className="menu-toggle" onClick={()=>setOpen(true)} aria-label="Open navigation"><Menu size={20}/></button><Link href="/tasks" className="search"><Search size={17}/><span>Search tasks, campaigns &amp; people</span><kbd>⌘ K</kbd></Link><div className="top-actions"><Link href="/notifications" aria-label="Notifications" className="icon-button"><Bell size={18}/></Link><div className="top-profile"><span className="avatar">{initials}</span><div><b>{me.user.name}</b><small>{me.role.replace('_',' ')}</small></div></div></div></header><div className="page">{children}</div></section>
  </main>
}
