import type * as THREE from 'three';
import type { Asset } from './Assets';
import type { Step } from './PuzzleState';
import type { Hotspot } from './Interaction';
import type { Viewpoint } from './CameraRig';
export type BuiltRoom = {
  objects: Record<string, THREE.Object3D>;
  views: Record<string, Viewpoint>;
  hotspots: Hotspot[];
  bloom: THREE.Object3D[];
  heat: { value: number };
  flamePosition: THREE.Vector3;
  update: (dt:number,time:number,flags:Set<string>)=>void;
  quality: (tier:string)=>void;
};
export type LevelDefinition = { id:number; title:string; subtitle:string; assets:Asset[]; build:(scene:THREE.Scene)=>BuiltRoom; puzzleGraph:Step[]; hints:Record<string,string[]>; onComplete:()=>string };
