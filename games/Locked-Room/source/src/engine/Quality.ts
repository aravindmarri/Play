import type * as THREE from 'three';
import type { QualityTier } from './SaveSystem';
export class Quality {
  tier: 'low'|'medium'|'high' = innerWidth < 700 ? 'low' : 'medium';
  override: QualityTier='auto';
  private elapsed=0;private samples=0;private warmup=4;
  constructor(private renderer:THREE.WebGLRenderer,private changed:(tier:string)=>void){const gl=renderer.getContext();if(gl.getParameter(gl.MAX_TEXTURE_SIZE)>=16384&&navigator.hardwareConcurrency>=12&&innerWidth>1000)this.tier='high';}
  apply(override:QualityTier){this.override=override;if(override!=='auto')this.tier=override;this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.tier==='high'?1.6:this.tier==='medium'?1.25:1));this.changed(this.tier);}
  tick(dt:number){if(this.override!=='auto')return;if(this.warmup>0){this.warmup-=dt;return;}this.elapsed+=dt;this.samples++;if(this.elapsed>4){const fps=this.samples/this.elapsed;if(fps<36&&this.tier!=='low'){this.tier=this.tier==='high'?'medium':'low';this.apply('auto');}this.elapsed=0;this.samples=0;}}
}
