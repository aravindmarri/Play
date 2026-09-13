import * as THREE from 'three';
import {createStaircase,createMarker} from './geometry.js';
import {createGhost} from './ghost.js';
import {solveConnectorPosition} from './align.js';
const canvas=document.querySelector('#arcade'),motion=document.querySelector('#motion');
let paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
function syncMotion(){motion.setAttribute('aria-pressed',String(!paused));motion.innerHTML=`3D MOTION <span>${paused?'OFF':'ON'}</span>`;}
syncMotion();motion.addEventListener('click',()=>{paused=!paused;syncMotion();});
try{init();}catch(e){console.error(e);document.querySelector('#fallback').hidden=false;canvas.hidden=true;motion.hidden=true;}
function init(){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x040710);scene.fog=new THREE.FogExp2(0x060a19,.029);
 const camera=new THREE.PerspectiveCamera(47,innerWidth/innerHeight,.1,150);camera.position.set(0,3.5,13);
 scene.add(new THREE.HemisphereLight(0x687ebe,0x131325,1.3));const light=new THREE.DirectionalLight(0xb8d7ff,2.3);light.position.set(-3,9,6);scene.add(light);
 const pinkLight=new THREE.PointLight(0xc071ff,30,16);pinkLight.position.set(5,4,1);scene.add(pinkLight);const blueLight=new THREE.PointLight(0x44cfff,25,16);blueLight.position.set(-2,5,3);scene.add(blueLight);
 const cabinet=new THREE.Group();cabinet.position.x=3.3;scene.add(cabinet);
 const bodyMat=new THREE.MeshStandardMaterial({color:0x101725,metalness:.65,roughness:.28});const panelMat=new THREE.MeshStandardMaterial({color:0x090e19,metalness:.35,roughness:.3});
 function box(group,w,h,d,mat,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);group.add(m);return m;}
 const cyan=new THREE.MeshBasicMaterial({color:0x7deaff});const purple=new THREE.MeshBasicMaterial({color:0xaf8bff});const hotPink=new THREE.MeshBasicMaterial({color:0xfa6bd2});
 box(cabinet,2.55,2.1,1.5,bodyMat,0,1.05,0);box(cabinet,2.55,2.65,1.1,bodyMat,0,3.4,-.25);box(cabinet,2.68,.65,1.42,panelMat,0,4.75,-.02);
 box(cabinet,2.28,1.95,.11,panelMat,0,3.25,.345);box(cabinet,2.48,.18,1.15,panelMat,0,2.15,.27);
 for(const x of [-1.28,1.28]){box(cabinet,.04,4.95,.06,x<0?cyan:purple,x,2.5,.59);box(cabinet,.045,2.5,.04,cyan,x,3.32,-.77);}
 box(cabinet,2.6,.05,.05,cyan,0,.08,.79);box(cabinet,2.58,.05,.05,purple,0,5.09,.7);box(cabinet,2.3,.026,.045,cyan,0,4.32,.37);
 box(cabinet,1.8,.015,.05,cyan,0,2.06,.85);
 function label(group,text,w,h,x,y,z,color='#a5eaff',fontSize=70){const c=document.createElement('canvas');c.width=1024;c.height=192;const ctx=c.getContext('2d');ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor=color;ctx.shadowBlur=14;ctx.fillStyle=color;ctx.font=`800 ${fontSize}px monospace`;ctx.fillText(text,512,96);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));m.position.set(x,y,z);group.add(m);return m;}
 label(cabinet,'SILENT STAIRS',2.4,.47,0,4.77,.705,'#a6e7ff',85);label(cabinet,'A PUZZLE OF PERSPECTIVE',1.95,.19,0,2.4,.415,'#a8c0dc',44);label(cabinet,'PLAYROOM',1.25,.26,0,.6,.76,'#7885b8',70);
 const stick=box(cabinet,.07,.29,.07,new THREE.MeshStandardMaterial({color:0xb1bbca,metalness:.7,roughness:.2}),-.6,2.36,.62);const ball=new THREE.Mesh(new THREE.SphereGeometry(.16,24,16),hotPink);ball.position.set(-.6,2.53,.62);cabinet.add(ball);
 for(let i=0;i<3;i++){const b=new THREE.Mesh(new THREE.CylinderGeometry(.115,.115,.065,24),i===1?purple:cyan);b.position.set(.22+i*.32,2.28,.66);cabinet.add(b);}
 box(cabinet,.46,.62,.04,panelMat,.43,1.24,.775);box(cabinet,.055,.21,.025,hotPink,.43,1.27,.805);
 // Display the actual staircase and ghost from Silent Stairs.
 const game=new THREE.Scene();game.background=new THREE.Color(0x1b1f2a);const gc=new THREE.OrthographicCamera(-12,12,9.5,-9.5,.1,100);gc.position.set(9,8,11);gc.lookAt(0,2,0);game.add(new THREE.AmbientLight(0xffffff,1));const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(6,12,4);game.add(sun);
 const world=new THREE.Group();game.add(world);const a=createStaircase({steps:5,rise:.6,run:1,width:2.2,color:0xe4dccb,enlargeLast:false});world.add(a.group);const b=createStaircase({steps:4,rise:.6,run:1,width:2.2,color:0xe4dccb,enlargeFirst:false});const pos=solveConnectorPosition(a.exitLocal,gc,42*Math.PI/180,6.5);b.group.position.set(pos.x,pos.y-b.height,pos.z);world.add(b.group);const ghost=createGhost();ghost.group.position.copy(a.entryLocal);world.add(ghost.group);const goal=createMarker(0xf2c14e);goal.position.copy(b.exitLocal).add(b.group.position).add(new THREE.Vector3(0,.4,0));world.add(goal);
 const gameTarget=new THREE.WebGLRenderTarget(768,640);gameTarget.texture.colorSpace=THREE.SRGBColorSpace;const screen=new THREE.Mesh(new THREE.PlaneGeometry(2.12,1.76),new THREE.MeshBasicMaterial({map:gameTarget.texture}));screen.position.set(0,3.29,.412);cabinet.add(screen);
 // A reflected cabinet below the translucent floor anchors the scene.
 const reflection=cabinet.clone();reflection.scale.y=-1;reflection.traverse(m=>{if(m.isMesh){m.material=m.material.clone();m.material.transparent=true;m.material.opacity=.19;m.material.depthWrite=false;}});scene.add(reflection);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({color:0x090d1d,roughness:.23,metalness:.65,transparent:true,opacity:.78,depthWrite:false}));floor.rotation.x=-Math.PI/2;floor.position.y=-.015;scene.add(floor);
 const grid=new THREE.GridHelper(140,100,0x3541a0,0x202b64);grid.position.y=.005;grid.material.transparent=true;grid.material.opacity=.62;scene.add(grid);
 const glowCanvas=document.createElement('canvas');glowCanvas.width=128;glowCanvas.height=128;const ctx=glowCanvas.getContext('2d');const grad=ctx.createRadialGradient(64,64,0,64,64,64);grad.addColorStop(0,'rgba(255,255,255,.7)');grad.addColorStop(.13,'rgba(255,255,255,.25)');grad.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);const glowTex=new THREE.CanvasTexture(glowCanvas);
 function glow(x,y,z,color,scale=3){const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.65}));sprite.position.set(x,y,z);sprite.scale.set(scale,scale*2.8,1);scene.add(sprite);}
 // Sparse light columns and an abstract skyline frame the single featured game.
 const poles=[[-6,4,-1,0x66ddff],[-9,5,-8,0x7799ff],[6,5,-3,0xc383ff],[9,4,-9,0x6cdfff],[-2,3,-12,0x68efd9],[3,6,-14,0xa580ff],[-13,6,-18,0x8fcaff],[13,6,-16,0x78caff]];
 for(const [x,h,z,color] of poles){box(scene,.055,h,.055,new THREE.MeshBasicMaterial({color}),x,h/2,z);glow(x,h/2,z,color,2.1);const reflected=box(scene,.04,h,.04,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.18}),x,-h/2,z);}
 glow(4.58,2.5,.65,0x9974ff,1.35);glow(2.02,2.5,.65,0x70deff,1.2);
 let seed=43;function rnd(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
 const buildings=new THREE.Group();scene.add(buildings);const windowGeo=new THREE.PlaneGeometry(.1,.27);const windowMat=new THREE.MeshBasicMaterial({color:0x6682d6,transparent:true,opacity:.25});const windows=new THREE.InstancedMesh(windowGeo,windowMat,1300);let count=0;const dummy=new THREE.Object3D();
 for(let i=0;i<22;i++){const x=(i%2?-1:1)*(8+rnd()*19),z=-10-rnd()*35,h=7+rnd()*22,w=1.7+rnd()*3;box(buildings,w,h,2,new THREE.MeshStandardMaterial({color:i%3?0x080c19:0x100e25,roughness:1}),x,h/2,z);for(let row=0;row<h/.65;row++)for(let col=0;col<3;col++){if(rnd()>.6&&count<1300){dummy.position.set(x-w*.32+col*w*.32,.7+row*.65,z+1.01);dummy.updateMatrix();windows.setMatrixAt(count++,dummy.matrix);}}}windows.count=count;scene.add(windows);
 const starsGeo=new THREE.BufferGeometry();const positions=new Float32Array(400*3);for(let i=0;i<400;i++){positions[i*3]=(rnd()-.5)*110;positions[i*3+1]=rnd()*35+2;positions[i*3+2]=-rnd()*70;}starsGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));scene.add(new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0x92bdea,size:.035,transparent:true,opacity:.5})));
 // A lightweight glow pass keeps neon edges luminous without extra dependencies.
 const sceneTarget=new THREE.WebGLRenderTarget(1,1);const postScene=new THREE.Scene();const postCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);const postMat=new THREE.ShaderMaterial({uniforms:{image:{value:sceneTarget.texture},resolution:{value:new THREE.Vector2(1,1)}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D image;uniform vec2 resolution;varying vec2 vUv;vec3 bright(vec2 uv){vec3 c=texture2D(image,uv).rgb;return c*max(0.,max(c.r,max(c.g,c.b))-.52);}void main(){vec3 c=texture2D(image,vUv).rgb;vec3 b=vec3(0.);for(int i=0;i<12;i++){float a=float(i)*.523598;vec2 d=vec2(cos(a),sin(a))/resolution;b+=bright(vUv+d*5.)*.024+bright(vUv+d*13.)*.027+bright(vUv+d*28.)*.018;}gl_FragColor=vec4(c+b,1.);}`});postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),postMat));
 let scroll=0,px=0,py=0,mobile=false;function onScroll(){const section=document.querySelector('#silent-stairs');const start=section.offsetTop;scroll=Math.max(0,Math.min(2,window.scrollY/start));document.querySelector('#progress').style.width=100*window.scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)+'%';}
 addEventListener('scroll',onScroll,{passive:true});addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;px=Math.max(-1,Math.min(1,e.clientX/innerWidth*2-1));py=Math.max(-1,Math.min(1,e.clientY/innerHeight*2-1));},{passive:true});
 function resetPointer(){px=0;py=0;}document.documentElement.addEventListener('pointerleave',resetPointer);addEventListener('blur',resetPointer);
 function resize(){mobile=innerWidth<=650;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);const size=renderer.getDrawingBufferSize(new THREE.Vector2());sceneTarget.setSize(size.x,size.y);postMat.uniforms.resolution.value.copy(size);onScroll();}addEventListener('resize',resize);resize();
 let previous=performance.now(),time=0;const look=new THREE.Vector3();let visible=true;document.addEventListener('visibilitychange',()=>visible=!document.hidden);
 function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.05);previous=now;if(!visible)return;if(!paused)time+=dt;const p=paused?0:scroll;const zoom=Math.min(p,1);cabinet.position.x=mobile?0:3.3;cabinet.rotation.y=mobile?-.06:-.17+Math.max(0,p-1)*.35;reflection.position.x=cabinet.position.x;reflection.rotation.y=cabinet.rotation.y;
 const pointerActive=!paused&&!mobile;
 const cursorX=pointerActive?px:0,cursorY=pointerActive?py:0;
 const targetX=mobile?0:.7*zoom+cursorX*1.25,targetY=mobile?6.2:3.7-zoom*.3-cursorY*.7,targetZ=mobile?13.5:13-zoom*3.2;
 camera.position.lerp(new THREE.Vector3(targetX,targetY,targetZ),1-Math.exp(-5*dt));
 look.set(mobile?0:.3+cursorX*.4,mobile?4.4:2.45-cursorY*.24,0);camera.lookAt(look);ghost.update(time,false);world.rotation.y=.1+Math.min(p,1.5)*.42;
 renderer.setRenderTarget(gameTarget);renderer.render(game,gc);renderer.setRenderTarget(sceneTarget);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCam);
 }requestAnimationFrame(frame);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.querySelector('#fallback').hidden=false;motion.hidden=true;});
}
