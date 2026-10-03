import * as THREE from 'three';
import type { Motion } from './Motion';
import type { PostFX } from './PostFX';
export class Inspector {
  group=new THREE.Group();private overlay=new THREE.Scene();private warmth=new THREE.PointLight('#ffc17a',0,3,2);
  active=false;
  id='';
  private zoom=1.45;
  private offset=new THREE.Vector3();
  anchored=false;
  constructor(private scene:THREE.Scene,private camera:THREE.Camera,private motion:Motion,private fx:PostFX){this.overlay.add(this.group,this.warmth);this.overlay.add(new THREE.HemisphereLight('#fff0d1','#64533e',2));const light=new THREE.DirectionalLight('#fff3d4',3);light.position.set(2,4,5);this.overlay.add(light);this.group.visible=false;this.group.userData.cameraIgnore=true;}
  async open(id:string,object:THREE.Object3D){this.close();this.id=id;this.active=true;this.anchored=false;this.zoom=innerWidth<700?2.7:1.65;this.group.clear();const clone=object.clone(true);clone.position.set(0,0,0);clone.rotation.set(0,0,0);clone.scale.setScalar(1);const size=new THREE.Box3().setFromObject(clone).getSize(new THREE.Vector3());const scale=Math.min(1,1/Math.max(size.x,size.y,size.z));clone.scale.setScalar(scale);this.group.add(clone);this.group.quaternion.copy(this.camera.quaternion);this.group.visible=true;this.tick();await this.motion.to(.5,t=>{this.group.scale.setScalar(.25+.75*t);});}
  drag(dx:number,dy:number){this.group.rotation.y+=dx*.012;this.group.rotation.x+=dy*.01;}
  scroll(delta:number){if(this.anchored){this.group.scale.setScalar(THREE.MathUtils.clamp(this.group.scale.x-delta*.0008,.45,1.3));return;}this.zoom=THREE.MathUtils.clamp(this.zoom+delta*.0009,.9,2.3);}
  tick(){if(!this.active)return;if(!this.anchored){this.offset.set(0,.03,-this.zoom).applyQuaternion(this.camera.quaternion).add(this.camera.position);this.group.position.copy(this.offset);}this.warmth.position.copy(this.group.position).add(new THREE.Vector3(0,-.55,.2));this.warmth.intensity=this.anchored?.65+Math.sin(performance.now()*.009)*.12:0;this.fx.inspect(this.group.position);document.body.classList.toggle('inspecting',!this.anchored);}
  render(renderer:THREE.WebGLRenderer){if(!this.active)return;renderer.autoClear=false;renderer.clearDepth();renderer.render(this.overlay,this.camera);renderer.autoClear=true;}
  close(){document.body.classList.remove('inspecting');this.active=false;this.id='';this.group.visible=false;this.fx.inspect(null);}
}
