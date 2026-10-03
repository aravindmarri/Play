import { puzzleGraph, hints } from './puzzle';
import type { LevelDefinition } from '../../engine/Level';
import { build } from './scene';
export const study: LevelDefinition = {
  id:1,title:'The Study',subtitle:'The last night of Elias Vance',
  assets:[{id:'interior',type:'hdr',url:'assets/brown_photostudio_01_1k.hdr'}],build,
  puzzleGraph, hints,
  onComplete:()=> 'Elias left you a way out. And a reason to return.',
};
