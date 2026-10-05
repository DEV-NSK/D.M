'use client';

import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useState} from 'react';
import {Bell,BriefcaseBusiness,ChevronRight,FileBarChart,LayoutDashboard,LogOut,Menu,Search,SquareCheckBig,Star,UserRound,X} from 'lucide-react';
import {api} from './useWorkspace';

const items=[['Dashboard','/portal',LayoutDashboard],['Campaigns','/portal/campaigns',BriefcaseBusiness],['Tasks','/portal/tasks',SquareCheckBig],['Reviews','/portal/reviews',Star],['Reports','/portal/reports',FileBarChart],['Notifications','/portal/notifications',Bell],['Profile','/portal/profile',UserRound]];
export function PortalLayout({me,live,children}:{me:any;live?:string;children:React.ReactNode}){
  const path=usePathname(),router=useRouter(),[open,setOpen]=useState(false),initials=me.user.name.split(' ').map((x:string)=>x[0]).join('').slice(0,2).toUpperCase();
  const active=(url:string)=>path===url||(url!=='/portal'&&path.startsWith(url+'/'));
  async function logout(){await fetch(api+'/auth/logout',{method:'POST',credentials:'include'});router.push('/login')}
  return <main className="app-shell portal-shell">
    {open&&<button className="nav-scrim" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}
    <aside className={`sidebar portal-sidebar ${open?'is-open':''}`} aria-label="Client portal navigation">
      <div className="sidebar-head"><Link className="brand" href="/portal"><span className="brand-mark">D</span><span><b>D.M</b><small>Client Portal</small></span></Link><button className="nav-close" onClick={()=>setOpen(false)} aria-label="Close menu"><X size={19}/></button></div>
      <p className="workspace">Your workspace</p><nav><section className="nav-group"><p>Portal</p>{items.map(([title,url,Icon]:any)=><Link className={active(url)?'active':''} aria-current={active(url)?'page':undefined} href={url} key={url} onClick={()=>setOpen(false)}><Icon size={17}/><span>{title}</span>{active(url)&&<ChevronRight className="nav-arrow" size={14}/>}</Link>)}</section></nav>
      <div className="side-user"><span>{initials}</span><div><b>{me.user.name}</b><small>Client</small></div><button onClick={logout} title="Sign out" aria-label="Sign out"><LogOut size={17}/></button></div>
    </aside>
    <section className="main"><header className="topbar"><button className="menu-toggle" onClick={()=>setOpen(true)} aria-label="Open navigation"><Menu size={20}/></button><div className="search portal-search"><Search size={17}/><span>Search your client workspace</span></div><div className="top-actions"><span className={`live-status ${live||''}`}><i/>{live==='connected'?'Live':live==='reconnecting'?'Reconnecting…':'Connecting…'}</span><Link href="/portal/notifications" className="icon-button" aria-label="Notifications"><Bell size={18}/></Link><span className="avatar">{initials}</span></div></header><div className="page">{children}</div></section>
  </main>
}
