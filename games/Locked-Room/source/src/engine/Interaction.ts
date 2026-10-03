import * as THREE from 'three';
export type Hotspot = { id: string; label: string; object: THREE.Object3D };
export class Interaction {
  enabled = false;
  hotspots: Hotspot[] = [];
  hover: Hotspot | null = null;
  private ray = new THREE.Raycaster();
  private point = new THREE.Vector2();
  private down: { x: number; y: number; moved: boolean } | null = null;
  private pointers = new Map<number, { x: number; y: number }>();
  private pinch = 0;private dial:string|null=null;private dialDrag=0;
  constructor(private canvas: HTMLCanvasElement, private camera: THREE.Camera, private callbacks: { dial?: (id:string,delta:number)=>void; click: (id: string) => void; drag: (dx: number, dy: number) => void; zoom: (delta: number) => void; hover: (label: string) => void; back: () => void }) {
    canvas.addEventListener('pointerdown', e => { if (!this.enabled) return; canvas.setPointerCapture(e.pointerId);const picked=this.pick(e.clientX,e.clientY);this.dial=picked?.id.startsWith('dial-')?picked.id:null;this.dialDrag=0; this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY}); this.down = { x: e.clientX, y: e.clientY, moved: false }; if (this.pointers.size === 2) this.pinch = this.distance(); });
    canvas.addEventListener('pointermove', e => {
      if (!this.enabled) return;
      if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if (this.down && this.pointers.size > 1) { const d = this.distance(); this.callbacks.zoom((this.pinch - d) * 3); this.pinch = d; this.down.moved = true; return; }
      if (this.down) { const dx = e.clientX - this.down.x, dy = e.clientY - this.down.y; if (Math.abs(dx)+Math.abs(dy)>3 || this.down.moved) { this.down.moved = true; if(this.dial){this.dialDrag-=dy;if(Math.abs(this.dialDrag)>14){this.callbacks.dial?.(this.dial,Math.sign(this.dialDrag));this.dialDrag=0;}}else this.callbacks.drag(dx,dy); this.down.x=e.clientX;this.down.y=e.clientY; } }
      else this.updateHover(e.clientX,e.clientY);
    });
    canvas.addEventListener('pointerup', e => { this.pointers.delete(e.pointerId); if (this.enabled && this.down && !this.down.moved && e.button !== 2) { const hit = this.pick(e.clientX,e.clientY); if(hit) this.callbacks.click(hit.id); } this.down=null;this.dial=null; });
    canvas.addEventListener('pointercancel', () => { this.down=null;this.pointers.clear(); });
    canvas.addEventListener('contextmenu', e=>{e.preventDefault();if(this.enabled)this.callbacks.back();});
    canvas.addEventListener('wheel', e=>{if(this.enabled){e.preventDefault();this.callbacks.zoom(e.deltaY);}},{passive:false});
    canvas.addEventListener('dragover', e=>e.preventDefault());
    canvas.addEventListener('drop', e=>{e.preventDefault();if(this.enabled){const hit=this.pick(e.clientX,e.clientY);if(hit)this.callbacks.click(hit.id);}});
  }
  private distance() { const p=[...this.pointers.values()];return Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y); }
  pick(x:number,y:number) { const r=this.canvas.getBoundingClientRect();this.point.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);this.ray.setFromCamera(this.point,this.camera);const hits=this.ray.intersectObjects(this.hotspots.map(h=>h.object),true);for(const hit of hits){let node:THREE.Object3D|null=hit.object;while(node){const hotspot=this.hotspots.find(h=>h.object===node);if(hotspot&&node.visible)return hotspot;node=node.parent;}}return null; }
  private updateHover(x:number,y:number) {
    const next=this.pick(x,y);if(next?.id===this.hover?.id)return;
    if(this.hover)this.glow(this.hover.object,false);this.hover=next;
    if(next)this.glow(next.object,true);this.canvas.style.cursor=next?'pointer':'grab';this.callbacks.hover(next?.label||'');
  }
  private glow(root:THREE.Object3D,on:boolean){root.traverse(obj=>{if(obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshPhysicalMaterial){
    if(on){if(!obj.userData.originalMaterial){obj.userData.originalMaterial=obj.material;obj.userData.hoverMaterial=obj.material.clone();const material=obj.userData.hoverMaterial as THREE.MeshPhysicalMaterial;const baseCompile=obj.material.onBeforeCompile;material.onBeforeCompile=(shader,renderer)=>{baseCompile(shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight += pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 3.0) * vec3(0.22,0.16,0.08);\n#include <opaque_fragment>');};material.customProgramCacheKey=()=> 'locked-room-hover-rim';}obj.material=obj.userData.hoverMaterial;}
    else if(obj.userData.originalMaterial)obj.material=obj.userData.originalMaterial;
  }});}
}
