import './ui/style.css';
import { Game } from './engine/Game';
import { levels } from './levels';
import { SaveSystem } from './engine/SaveSystem';
const requested=Number(new URLSearchParams(location.search).get('level')||1);
const access=new SaveSystem();
const entry=levels.find(l=>l.definition.id===requested&&access.unlocked(requested))||levels[0];
const level=entry.definition;
const url=new URL(location.href);url.searchParams.set('level',String(level.id));history.replaceState(null,'',url);
try {
  const game=new Game(level,levels.map(entry=>entry.definition));
  game.init(entry.controller).catch(error=>{game.hud.text('load-label',error instanceof Error?error.message:'The room could not load.');const retry=document.createElement('button');retry.textContent='Try again';retry.onclick=()=>location.reload();game.hud.$('loading').append(retry);});
} catch(error){document.querySelector('#ui')!.innerHTML='';const section=document.createElement('section');section.className='loading';const title=document.createElement('h1');title.textContent='The Locked Room';const text=document.createElement('p');text.textContent=error instanceof Error?error.message:'This browser could not open the room.';const back=document.createElement('a');back.href='https://play.aravindmarri.com/';back.textContent='← Back to Arcade';section.append(title,text,back);document.querySelector('#ui')!.append(section);}
