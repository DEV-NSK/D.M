'use client';

import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useState} from 'react';
import {BarChart3,Bell,BriefcaseBusiness,Building2,CalendarDays,ChevronRight,CircleHelp,LayoutDashboard,LogOut,Menu,Search,Settings,SquareCheckBig,UserRound,UsersRound,X} from 'lucide-react';

const api=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000/api/v1';
const groups=[
  {label:'Main',items:[
    ['Dashboard','/dashboard',LayoutDashboard],['Clients','/clients',Building2],['Campaigns','/campaigns',BriefcaseBusiness],['Tasks','/tasks',SquareCheckBig],['My tasks','/my-tasks',CalendarDays],['Analytics','/analytics',BarChart3],['Teams','/teams',UsersRound],
  ]},
  {label:'Workspace',items:[['Reports','/reports',BarChart3],['Notifications','/notifications',Bell],['Members','/members',UserRound],['Invitations','/invitations',UsersRound]]},
  {label:'Settings',items:[['Organization settings','/settings',Settings],['My profile','/profile',UserRound]]},
];

export function Layout({me,children}:{me:any;children:React.ReactNode}){
  const path=usePathname(),router=useRouter(),[open,setOpen]=useState(false);
  const initials=me.user.name.split(' ').map((x:string)=>x[0]).join('').slice(0,2).toUpperCase();
  const active=(url:string)=>path===url||(url!=='/dashboard'&&path.startsWith(url+'/'));
  async function logout(){await fetch(api+'/auth/logout',{method:'POST',credentials:'include'});router.push('/login')}
  return <main className="app-shell">
    {open&&<button className="nav-scrim" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}
    <aside className={`sidebar ${open?'is-open':''}`} aria-label="Primary navigation">
      <div className="sidebar-head"><Link className="brand" href="/dashboard"><span className="brand-mark">D</span><span><b>D.M</b><small>Digital Marketing</small></span></Link><button className="nav-close" onClick={()=>setOpen(false)} aria-label="Close menu"><X size={19}/></button></div>
      <p className="workspace">{me.organization.name}</p>
      <nav>{groups.map(group=><section className="nav-group" key={group.label}><p>{group.label}</p>{group.items.filter(([title])=>!(title==='Invitations'&&!['OWNER','MANAGER'].includes(me.role))).map(([title,url,Icon]:any)=><Link className={active(url)?'active':''} aria-current={active(url)?'page':undefined} href={url} key={url} onClick={()=>setOpen(false)}><Icon size={17}/><span>{title}</span>{active(url)&&<ChevronRight className="nav-arrow" size={14}/>}</Link>)}</section>)}</nav>
      <div className="sidebar-help"><CircleHelp size={17}/><div><b>Need help?</b><small>Visit the help center</small></div></div>
      <div className="side-user"><span>{initials}</span><div><b>{me.user.name}</b><small>{me.role.replace('_',' ')}</small></div><button onClick={logout} title="Sign out" aria-label="Sign out"><LogOut size={17}/></button></div>
    </aside>
    <section className="main">
      <header className="topbar"><button className="menu-toggle" onClick={()=>setOpen(true)} aria-label="Open navigation"><Menu size={20}/></button><Link href="/tasks" className="search"><Search size={17}/><span>Search projects, campaigns &amp; people</span><kbd>⌘ K</kbd></Link><div className="top-actions"><Link href="/notifications" aria-label="Notifications" className="icon-button"><Bell size={18}/></Link><div className="top-profile"><span className="avatar">{initials}</span><div><b>{me.user.name}</b><small>{me.role.replace('_',' ')}</small></div></div></div></header>
      <div className="page">{children}</div>
    </section>
  </main>
}
