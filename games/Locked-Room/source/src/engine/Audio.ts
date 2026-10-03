import * as THREE from 'three';
export class Audio {
  private listener: THREE.AudioListener | null=null;
  private loops: THREE.PositionalAudio[]=[];
  private volume=.45;private muted=false;
  constructor(private camera:THREE.Camera,private scene:THREE.Scene,private caption:(text:string)=>void){}
  async start(){if(!this.listener){this.listener=new THREE.AudioListener();this.camera.add(this.listener);this.ambience('rain',[-4,2,-3.6],.075);this.ambience('room',[0,1,0],.024);}if(this.listener.context.state==='suspended')await this.listener.context.resume();this.set(this.volume,this.muted);}
  set(volume:number,muted:boolean){this.volume=volume;this.muted=muted;this.listener?.setMasterVolume(muted?0:volume);}
  private buffer(kind:string,seconds:number,freq:number){const context=this.listener!.context;const data=context.createBuffer(1,Math.ceil(context.sampleRate*seconds),context.sampleRate);const out=data.getChannelData(0);let brown=0;for(let i=0;i<out.length;i++){const t=i/context.sampleRate;const noise=Math.random()*2-1;brown=(brown+.02*noise)/1.02;const envelope=Math.exp(-t*(kind==='bell'?2.6:7));out[i]=kind==='rain'?noise*.22:kind==='room'?brown*.7:kind==='slide'||kind==='door'?brown*envelope*3:kind==='fire'?((Math.random()>.997?noise*2:0)+brown*.2):kind==='match'?noise*envelope*.6:((Math.sin(t*freq*Math.PI*2)+.22*Math.sin(t*freq*2.76*Math.PI*2))*.35*envelope);}return data;}
  sound(kind:string,position:THREE.Vector3|number[]=[0,1,0],caption='',freq=620){if(caption)this.caption(caption);if(!this.listener)return;const audio=new THREE.PositionalAudio(this.listener);audio.setBuffer(this.buffer(kind,kind==='bell'?1.6:.7,freq));audio.setRefDistance(4);audio.setVolume(kind==='bell'?.38:.3);audio.setPlaybackRate(kind==='bell'?1:.96+Math.random()*.08);audio.position.copy(position instanceof THREE.Vector3?position:new THREE.Vector3(...position as [number,number,number]));this.scene.add(audio);audio.onEnded=()=>{audio.disconnect();audio.removeFromParent();};audio.play();}
  ambience(kind:string,pos:number[],volume:number){if(!this.listener)return;const audio=new THREE.PositionalAudio(this.listener);audio.setBuffer(this.buffer(kind,3,50));audio.setLoop(true);audio.setRefDistance(4);audio.setVolume(volume);audio.position.set(...pos as [number,number,number]);this.scene.add(audio);audio.play();this.loops.push(audio);}
}
