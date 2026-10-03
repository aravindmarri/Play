import * as THREE from 'three';
import { createRenderer } from './Renderer';
import { Assets } from './Assets';
import { PostFX } from './PostFX';
import { CameraRig } from './CameraRig';
import { Interaction } from './Interaction';
import { Inspector } from './Inspector';
import { Inventory } from './Inventory';
import { PuzzleState } from './PuzzleState';
import { HintSystem } from './HintSystem';
import { Audio } from './Audio';
import { SaveSystem, type RoomSave } from './SaveSystem';
import { Quality } from './Quality';
import { Motion } from './Motion';
import type { BuiltRoom, LevelDefinition } from './Level';
import { HUD } from '../ui/HUD';
export type LevelController={ action:(id:string)=>Promise<void>|void; view:(id:string)=>void; tick:(dt:number,time:number)=>void; restore:()=>void; drag?:(dx:number,dy:number)=>boolean };
export class Game {
  hud=new HUD();save=new SaveSystem();scene=new THREE.Scene();motion=new Motion();
  renderer=createRenderer(document.querySelector('#scene')!);rig=new CameraRig(this.renderer.domElement);
  fx=new PostFX(this.renderer,this.scene,this.rig.camera);
  audio=new Audio(this.rig.camera,this.scene,text=>this.hud.caption(text,this.save.data.settings.captions));
  inspector=new Inspector(this.scene,this.rig.camera,this.motion,this.fx);
  quality:Quality;interaction:Interaction;inventory:Inventory;puzzle:PuzzleState;hints:HintSystem;roomSave:RoomSave;
  room!:BuiltRoom;controller!:LevelController;started=false;paused=false;private working=false;get busy(){return this.working;}set busy(value:boolean){this.working=value;document.body.setAttribute('aria-busy',String(value));}viewId='room';previousView='room';time=0;
  private last=performance.now();private saveElapsed=0;private lookX=0;private lookY=0;private frame=0;
  constructor(readonly level:LevelDefinition,readonly levels:LevelDefinition[]){
    this.hud.configure(level);this.roomSave=this.save.room(level.id);this.puzzle=new PuzzleState(level.puzzleGraph,this.roomSave.flags);
    this.inventory=new Inventory(this.roomSave.inventory,()=>{this.hud.inventory(this.inventory);this.persist();});
    this.hints=new HintSystem(this.puzzle,level.hints,this.roomSave.hintDepth);
    this.puzzle.bus.on(()=>this.persist());
    this.quality=new Quality(this.renderer,tier=>{this.fx.quality(tier,this.save.data.settings.reduced);this.room?.quality(tier);this.resize();});
    this.interaction=new Interaction(this.renderer.domElement,this.rig.camera,{click:id=>{if(!this.busy&&!this.inspector.active){if(this.inventory.selected==='match'&&id==='candle'||this.inventory.selected==='key'&&id==='door'){void this.go(id).then(()=>this.controller.action(`touch-${id}`));}else if(this.viewId===id)this.controller.action(`touch-${id}`);else this.go(id);}},hover:label=>this.hud.text('hover-label',this.inspector.active?'':label),drag:(dx,dy)=>{
      if(this.busy)return;if(this.inspector.active){this.inspector.drag(dx,dy);return;}if(this.controller.drag?.(dx,dy))return;
      const invert=this.save.data.settings.invert?-1:1;const nextX=THREE.MathUtils.clamp(this.lookX-dx*.0018*invert,-.42,.42),nextY=THREE.MathUtils.clamp(this.lookY-dy*.0018*invert,-.22,.22);this.rig.look(nextX-this.lookX,nextY-this.lookY);this.lookX=nextX;this.lookY=nextY;
    },zoom:delta=>{if(this.inspector.active)this.inspector.scroll(delta);},back:()=>this.back()});
    this.hud.action=id=>{void this.action(id);};
    addEventListener('keydown',e=>{if(e.key==='Escape'&&!this.hud.$<HTMLDialogElement>('modal').open){e.preventDefault();this.back();}if(e.key.toLowerCase()==='h'&&this.started&&!this.paused&&!/INPUT|SELECT/.test((e.target as HTMLElement).tagName)){e.preventDefault();this.action('hint');}});
    addEventListener('resize',()=>this.resize());addEventListener('pagehide',()=>this.persist());
    document.addEventListener('visibilitychange',()=>{this.last=performance.now();if(document.hidden)this.persist();});
  }
  async init(controller:(game:Game)=>LevelController){
    this.hud.progress(0,'Letting in the moonlight…');
    const assets=new Assets(this.renderer);await assets.loadAll(this.level.assets,this.scene,(fraction,detail)=>this.hud.progress(fraction*65,'Loading the room’s assets…',detail));
    this.hud.progress(70,'Setting the clockmaker’s study…');await new Promise(r=>setTimeout(r,20));
    this.room=this.level.build(this.scene);this.interaction.hotspots=this.room.hotspots;this.room.bloom.forEach(o=>this.fx.bloom.selection.add(o));
    this.controller=controller(this);this.controller.restore();this.hud.inventory(this.inventory);
    this.applySettings();await this.rig.go(this.room.views.title,true);this.resize();
    const inspectLight=new THREE.PointLight('#ffe6bd',2,3,2);inspectLight.position.set(.5,.2,-.3);this.rig.camera.add(inspectLight);this.scene.add(this.rig.camera);
    this.hud.progress(90,'Warming the glass and brass…');await this.renderer.compileAsync(this.scene,this.rig.camera);
    this.hud.progress(100,'The study is ready.');this.hud.ready(this.roomSave.seconds>0&&!this.puzzle.has('complete'));
    if(new URLSearchParams(location.search).has('debug')){const {default:GUI}=await import('lil-gui');const gui=new GUI({title:'The Study · rendering'});gui.add(this.renderer,'toneMappingExposure',.3,2);gui.add(this.scene,'environmentIntensity',0,1);gui.add(this.quality,'tier').listen().disable();}
    this.last=performance.now();requestAnimationFrame(this.tick);
  }
  private tick=(now:number)=>{this.frame=requestAnimationFrame(this.tick);if(document.hidden)return;const elapsed=(now-this.last)/1000;const dt=Math.min(elapsed,.08);this.last=now;this.time+=dt;
    if(!this.paused){this.motion.tick(dt);this.rig.tick(dt);this.room.update(dt,this.time,this.puzzle.flags);this.controller.tick(dt,this.time);this.inspector.tick();if(this.started&&!this.puzzle.has('complete'))this.roomSave.seconds+=elapsed;}
    if(!this.started&&!this.save.data.settings.reduced){this.rig.camera.position.x+=Math.sin(this.time*.15)*.001;}
    this.quality.tick(elapsed);this.fx.render(dt);this.saveElapsed+=dt;if(this.saveElapsed>3){this.saveElapsed=0;this.persist();}
  };
  persist(){if(!this.inventory)return;this.roomSave.flags=[...this.puzzle.flags];this.roomSave.inventory=[...this.inventory.contents];this.save.write();}
  resize(){const w=innerWidth,h=innerHeight;this.renderer.setSize(w,h,false);this.rig.resize(w,h);if(w<700&&this.started&&this.viewId!=='room')this.rig.camera.setViewOffset(w,h,0,h*.14,w,h);else this.rig.camera.clearViewOffset();this.fx.resize(w,h);}
  applySettings(){const s=this.save.data.settings;this.rig.reduced=s.reduced;this.motion.reduced=s.reduced;this.audio.set(s.volume,s.muted);this.hud.text('mute-button',s.muted?'Sound off':'Sound on');this.quality.apply(s.quality);}
  async go(id:string){if(!this.room.views[id]||!this.started||this.paused||this.busy)return;this.busy=true;this.inspector.close();this.lookX=0;this.lookY=0;this.previousView=this.viewId;this.viewId=id;this.hud.hide('back',id==='room');this.hud.$('hover-label').textContent='';document.querySelectorAll<HTMLElement>('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===id));this.controller.view(id);this.resize();
    let view=this.room.views[id];if(id==='room'&&innerWidth<700)view={eye:[0,4.4,13],target:[0,1.9,-1.15]};await this.rig.go(view);this.busy=false;
  }
  async inspect(id:string){if(!this.room.objects[id])return;this.busy=true;await this.inspector.open(id,this.room.objects[id]);this.busy=false;this.hud.hide('back',false);}
  back(){if(!this.started||this.paused||this.busy)return;if(this.inspector.active){this.inspector.close();this.controller.view(this.viewId);}else if(this.viewId==='room')this.action('pause');else this.go('room');}
  async action(id:string){
    if(id==='enter'){await this.audio.start();if(this.puzzle.has('complete')){this.hud.completed(this.roomSave,this.level.onComplete(),this.level.title,this.level.id,this.levels.find(l=>l.id===this.level.id+1)?.id);return;}this.started=true;this.interaction.enabled=true;this.hud.play();await this.go('room');return;}
    if(id==='mute'){this.save.data.settings.muted=!this.save.data.settings.muted;this.applySettings();this.save.write();return;}
    if(id==='settings'){this.paused=true;this.interaction.enabled=false;this.hud.settings(this.save.data.settings);return;}
    if(id==='save-settings'){const h=this.hud,s=this.save.data.settings;s.quality=h.$<HTMLSelectElement>('quality').value as typeof s.quality;s.volume=Number(h.$<HTMLInputElement>('volume').value);for(const key of ['muted','invert','reduced','captions'] as const)s[key]=h.$<HTMLInputElement>(key).checked;this.applySettings();this.save.write();id='close-modal';}
    if(id==='close-modal'||id==='resume'){this.hud.close();this.paused=false;this.interaction.enabled=this.started&&!this.puzzle.has('complete');return;}
    if(id==='levels'){this.paused=true;this.interaction.enabled=false;this.hud.dialog(`<p class="eyebrow">THE LOCKED ROOM</p><h2>Rooms to remember</h2><div class="level-grid">${this.levels.map(l=>`<button data-action="level-${l.id}" ${this.save.unlocked(l.id)?'':'disabled'}><strong>${String(l.id).padStart(2,'0')} ${this.save.data.solved.includes(l.id)?'✓':''}</strong><small>${l.title}</small></button>`).join('')}${this.levels.some(l=>l.id===2)?'':'<button disabled><strong>02</strong><small>The Clock Tower<br>Coming soon · Locked</small></button>'}</div>`);return;}
    if(id.startsWith('level-')){const n=Number(id.slice(6));if(this.levels.some(l=>l.id===n)&&this.save.unlocked(n)){const url=new URL(location.href);url.searchParams.set('level',String(n));location.assign(url.href);}return;}
    if(id==='restart'){this.hud.dialog('<p class="eyebrow">A FRESH START</p><h2>Revisit the study?</h2><p>Your current room and inventory will reset. Completed-room records are kept.</p><button data-action="confirm-restart" class="primary">Restart this room</button><button data-action="close-modal">Keep exploring</button>');return;}
    if(id==='confirm-restart'){this.save.restart(this.level.id);this.started=false;cancelAnimationFrame(this.frame);location.reload();return;}
    if(id==='pause'){if(this.busy)return;this.paused=true;this.interaction.enabled=false;this.persist();this.hud.dialog('<p class="eyebrow">THE WORLD CAN WAIT</p><h2>A quiet moment</h2><div class="menu-list"><button class="primary" data-action="resume">Resume</button><button data-action="restart">Restart level</button><button data-action="settings">Settings</button><button data-action="levels">Levels</button><a class="arcade-button" href="https://play.aravindmarri.com/">Back to Arcade ↗</a></div>');return;}
    if(!this.started||this.paused||this.busy||this.puzzle.has('complete'))return;
    if(id==='back'){this.back();return;}if(id==='hint'){this.roomSave.hints++;this.hud.toast(this.hints.next());this.persist();return;}
    if(id.startsWith('view-')){await this.go(id.slice(5));return;}
    if(id==='clear-item'){this.inventory.selected=null;this.hud.inventory(this.inventory);this.inspector.close();this.controller.view(this.viewId);return;}
    if(id.startsWith('item-')){const item=id.slice(5);if(!this.inventory.has(item))return;this.inventory.select(item);this.controller.action(`selected-${item}`);return;}
    await this.controller.action(id);
  }
  async finish(){this.busy=true;this.inspector.close();this.puzzle.set('escape');this.persist();this.save.complete(this.level.id);this.interaction.enabled=false;this.hud.hide('context');this.hud.hide('game-bottom');await this.rig.go({eye:[4.25,1.7,-2.8],target:[4.43,1.65,-5]});this.hud.$('exit-fade').classList.add('visible');await new Promise(r=>setTimeout(r,this.save.data.settings.reduced?180:1000));this.hud.$('exit-fade').classList.remove('visible');this.hud.completed(this.roomSave,this.level.onComplete(),this.level.title,this.level.id,this.levels.find(l=>l.id===this.level.id+1)?.id);this.busy=false;}
}
