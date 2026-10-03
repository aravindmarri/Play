import test from 'node:test';
import assert from 'node:assert/strict';
import { PuzzleState } from '../src/engine/PuzzleState.ts';
import { SaveSystem } from '../src/engine/SaveSystem.ts';
import { HintSystem } from '../src/engine/HintSystem.ts';
import { Inventory } from '../src/engine/Inventory.ts';
import { puzzleGraph, hints } from '../src/levels/level01-the-study/puzzle.ts';
const study={puzzleGraph,hints};

test('the complete study route resolves all steps, with no premature escape',()=>{
  const state=new PuzzleState(study.puzzleGraph);
  assert.equal(state.next()?.id,'latch');assert.equal(state.done().length,0);
  for(const flag of ['latch','drawer','match','candle','heat','moon','cage','bird','hooks','straight','painting','safe','key'])state.set(flag);
  assert.equal(state.has('complete'),false);assert.equal(state.next()?.id,'escape');
  state.set('escape');assert.equal(state.has('complete'),true);assert.equal(state.done().length,12);
  assert.equal(new PuzzleState(study.puzzleGraph,[...state.flags]).done().length,12);
});
test('clues can be discovered out of order without skipping the physical chain',()=>{
  const state=new PuzzleState(study.puzzleGraph);state.set('moon');state.set('hooks');state.set('bird');
  assert.equal(state.next()?.id,'latch');assert.equal(state.has('safeOpen'),false);
  state.set('latch');assert.equal(state.next()?.id,'drawer');
});
test('hint presses reveal one tier at a time and follow the next unresolved step',()=>{
  const state=new PuzzleState(study.puzzleGraph);const depth:Record<string,number>={};const hints=new HintSystem(state,study.hints,depth);
  assert.equal(hints.next(),study.hints.latch[0]);assert.equal(hints.next(),study.hints.latch[1]);assert.equal(hints.next(),study.hints.latch[2]);assert.equal(hints.next(),study.hints.latch[2]);
  state.set('latch');assert.equal(hints.next(),study.hints.drawer[0]);
  const reloaded=new HintSystem(state,study.hints,depth);assert.equal(reloaded.next(),study.hints.drawer[1]);
});
test('blocked and corrupt storage do not stop play',()=>{
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('blocked');}});
  const save=new SaveSystem();save.room(1).inventory=['letter'];assert.doesNotThrow(()=>save.complete(1));assert.equal(save.unlocked(2),true);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>'{invalid',setItem:()=>{throw new Error('quota');}}});
  assert.doesNotThrow(()=>new SaveSystem().write());assert.deepEqual(new SaveSystem().data.solved,[]);
});
test('progress, inventory, settings and completion survive round-trip; restart keeps solved records',()=>{
  const data=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>data.get(k)||null,setItem:(k:string,v:string)=>data.set(k,v)}});
  const save=new SaveSystem();assert.equal(save.unlocked(2),false);save.room(1).flags=['latch','drawer'];save.room(1).inventory=['matches','letter'];save.room(1).seconds=52;save.room(1).heat=.4;save.room(1).dials=[9,2,0,0];save.data.settings.quality='low';save.write();
  const restored=new SaveSystem();assert.deepEqual(restored.room(1),save.room(1));assert.equal(restored.data.settings.quality,'low');restored.complete(1);restored.restart(1);assert.equal(restored.unlocked(2),true);assert.equal(restored.room(1).seconds,0);assert.deepEqual(restored.room(1).inventory,[]);
});
test('using an item clears its selection and cannot duplicate inventory slots',()=>{
  let changes=0;const inventory=new Inventory([],()=>changes++);inventory.add('match');inventory.add('match');assert.equal(inventory.contents.size,1);inventory.select('match');inventory.remove('match');assert.equal(inventory.selected,null);assert.equal(inventory.has('match'),false);assert.equal(changes,4);
});
test('malformed numerical state is clamped and unknown inventory items are discarded',()=>{
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify({version:1,solved:[],rooms:{1:{flags:[],inventory:['bad','key'],seconds:-7,heat:9,dials:[-3,20,'bad',4]}},settings:{volume:5,quality:'invalid'}}),setItem:()=>{}}});
  const s=new SaveSystem();assert.equal(s.room(1).seconds,0);assert.equal(s.room(1).heat,1);assert.deepEqual(s.room(1).dials,[0,9,0,4]);assert.equal(s.data.settings.volume,1);assert.deepEqual([...new Inventory(s.room(1).inventory,()=>{}).contents],['key']);
});
import * as THREE from 'three';
import { CameraSafety } from '../src/engine/CameraSafety.ts';
test('camera route detours around solid furniture and every segment is clear',()=>{const scene=new THREE.Scene();const obstacle=new THREE.Mesh(new THREE.BoxGeometry(2,3,2),new THREE.MeshBasicMaterial());obstacle.position.set(0,1.5,1.7);scene.add(obstacle);const safety=new CameraSafety(scene);safety.refresh();const start=new THREE.Vector3(-3,1.5,1.7),end=new THREE.Vector3(3,1.5,1.7);assert.equal(safety.clear(start,end),false);const path=safety.route(start,end);assert.ok(path.length>2);for(let i=1;i<path.length;i++)assert.equal(safety.clear(path[i-1],path[i]),true);assert.ok(safety.inside(new THREE.Vector3(0,1.5,1.7)));});
test('camera occlusion detects unrelated objects but accepts the subject surface',()=>{const scene=new THREE.Scene(),target=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial());scene.add(target);const safety=new CameraSafety(scene);safety.refresh();const eye=new THREE.Vector3(0,0,4),center=new THREE.Vector3();assert.equal(safety.occluded(eye,center,target),undefined);const blocker=target.clone();blocker.position.z=2;scene.add(blocker);safety.refresh();assert.equal(safety.occluded(eye,center,target)?.object,blocker);});
