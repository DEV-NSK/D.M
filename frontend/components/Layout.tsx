'use client';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import {Bell,ChevronRight,CircleHelp,LogOut,Menu,Search,X} from 'lucide-react';
import {canAccessPath,navigationFor,workspacePolicies,WorkspaceRole} from './workspacePolicy';
const api=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000/api/v1';
export function Layout({me,children}:{me:any;children:React.ReactNode}){
 const path=usePathname(),router=useRouter(),[open,setOpen]=useState(false),drawer=useRef<HTMLElement>(null);
 const initials=me.user.name.split(' ').map((x:string)=>x[0]).join('').slice(0,2).toUpperCase();
 const active=(url:string)=>{const clean=url.split('?')[0];return path===clean||(clean!=='/dashboard'&&path.startsWith(clean+'/'))};
 const groups=navigationFor(me),policy=workspacePolicies[me.role as WorkspaceRole]||workspacePolicies.EMPLOYEE;
 useEffect(()=>{if(!open)return;drawer.current?.querySelector<HTMLElement>('a,button')?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[open]);
 async function logout(){await fetch(api+'/auth/logout',{method:'POST',credentials:'include'});router.push('/login')}
 if(!canAccessPath(me,path))return <main className="access-denied"><section className="card"><span>403</span><h1>That area isn’t available to your role.</h1><p>Your workspace only shows data and actions you’re authorized to use.</p><Link className="button" href="/dashboard">Return to dashboard</Link></section></main>;
 return <main className="app-shell">{open&&<button className="nav-scrim" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}<aside ref={drawer} className={`sidebar ${open?'is-open':''}`} aria-label="Primary navigation">
  <div className="sidebar-head"><Link className="brand" href="/dashboard"><span className="brand-mark">D</span><span><b>D.M</b><small>Digital Marketing</small></span></Link><button className="nav-close" onClick={()=>setOpen(false)} aria-label="Close menu"><X size={19}/></button></div>
  <p className="workspace"><b>{me.organization.name}</b><small>{policy.label}</small></p>
  <nav>{groups.map(group=><section className="nav-group" key={group.label}><p>{group.label}</p>{group.items.map(({label,href,icon:Icon})=><Link className={active(href)?'active':''} aria-current={active(href)?'page':undefined} href={href} key={`${label}-${href}`} onClick={()=>setOpen(false)}><Icon size={17}/><span>{label}</span>{active(href)&&<ChevronRight className="nav-arrow" size={14}/>}</Link>)}</section>)}</nav>
  <div className="sidebar-help"><CircleHelp size={17}/><div><b>Need help?</b><small>Visit the help center</small></div></div><div className="side-user"><span>{initials}</span><div><b>{me.user.name}</b><small>{me.role.replace('_',' ')}</small></div><button onClick={logout} title="Sign out" aria-label="Sign out"><LogOut size={17}/></button></div>
 </aside><section className="main"><header className="topbar"><button className="menu-toggle" onClick={()=>setOpen(true)} aria-label="Open navigation" aria-expanded={open}><Menu size={20}/></button><Link href={me.role==='EMPLOYEE'?'/my-tasks':'/tasks'} className="search"><Search size={17}/><span>Search your workspace</span><kbd>⌘ K</kbd></Link><div className="top-actions"><Link href="/notifications" aria-label="Notifications" className="icon-button"><Bell size={18}/></Link><Link href="/profile" className="top-profile"><span className="avatar">{initials}</span><div><b>{me.user.name}</b><small>{me.role.replace('_',' ')}</small></div></Link></div></header><div className="page">{children}</div></section>
 </main>
}
