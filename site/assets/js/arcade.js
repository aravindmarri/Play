import * as THREE from 'three';
import {createStaircase,createMarker} from '../previews/silent-stairs/geometry.js';
import {createGhost} from '../previews/silent-stairs/ghost.js';
import {solveConnectorPosition} from '../previews/silent-stairs/align.js';

const canvas=document.querySelector('#arcade');
const motion=document.querySelector('#motion');
let paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
function syncMotion(){motion.setAttribute('aria-pressed',String(!paused));motion.innerHTML=`3D MOTION <span>${paused?'OFF':'ON'}</span>`;}
syncMotion();motion.addEventListener('click',()=>{paused=!paused;syncMotion();});
try{init();}catch(error){console.error(error);document.querySelector('#fallback').hidden=false;canvas.hidden=true;motion.hidden=true;}

function init(){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();
 scene.background=new THREE.Color(0x040710);
 scene.fog=new THREE.FogExp2(0x060a19,.029);
 const camera=new THREE.PerspectiveCamera(47,innerWidth/innerHeight,.1,150);
 camera.position.set(0,3.5,13);
 scene.add(new THREE.HemisphereLight(0x687ebe,0x131325,1.3));
 const light=new THREE.DirectionalLight(0xb8d7ff,2.3);light.position.set(-3,9,6);scene.add(light);
 const pinkLight=new THREE.PointLight(0xc071ff,30,16);pinkLight.position.set(5,4,1);scene.add(pinkLight);
 const blueLight=new THREE.PointLight(0x44cfff,25,16);blueLight.position.set(-2,5,3);scene.add(blueLight);

 function box(group,w,h,d,material,x,y,z){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);group.add(mesh);return mesh;}
 function label(group,text,w,h,x,y,z,color='#a5eaff',fontSize=70){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=192;
  const context=canvas.getContext('2d');context.textAlign='center';context.textBaseline='middle';
  context.shadowColor=color;context.shadowBlur=14;context.fillStyle=color;context.font=`800 ${fontSize}px monospace`;context.fillText(text,512,96);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
  mesh.position.set(x,y,z);group.add(mesh);return mesh;
 }
 function createCabinet(title,subtitle,x){
  const group=new THREE.Group();group.position.x=x;scene.add(group);
  const body=new THREE.MeshStandardMaterial({color:0x101725,metalness:.65,roughness:.28});
  const panel=new THREE.MeshStandardMaterial({color:0x090e19,metalness:.35,roughness:.3});
  const cyan=new THREE.MeshBasicMaterial({color:0x7deaff});
  const violet=new THREE.MeshBasicMaterial({color:0xaf8bff});
  const pink=new THREE.MeshBasicMaterial({color:0xfa6bd2});
  box(group,2.55,2.1,1.5,body,0,1.05,0);box(group,2.55,2.65,1.1,body,0,3.4,-.25);box(group,2.68,.65,1.42,panel,0,4.75,-.02);
  box(group,2.28,1.95,.11,panel,0,3.25,.345);box(group,2.48,.18,1.15,panel,0,2.15,.27);
  for(const side of [-1,1]){box(group,.04,4.95,.06,side<0?cyan:violet,side*1.28,2.5,.59);box(group,.045,2.5,.04,cyan,side*1.28,3.32,-.77);}
  box(group,2.6,.05,.05,cyan,0,.08,.79);box(group,2.58,.05,.05,violet,0,5.09,.7);box(group,2.3,.026,.045,cyan,0,4.32,.37);box(group,1.8,.015,.05,cyan,0,2.06,.85);
  label(group,title,2.4,.47,0,4.77,.705,'#a6e7ff',title.length>12?70:85);
  label(group,subtitle,1.95,.19,0,2.4,.415,'#a8c0dc',42);label(group,'PLAYROOM',1.25,.26,0,.6,.76,'#7885b8',70);
  for(let i=0;i<3;i++){const light=new THREE.Mesh(new THREE.CylinderGeometry(.115,.115,.065,24),i===1?violet:cyan);light.position.set(.22+i*.32,2.28,.66);group.add(light);}
  box(group,.46,.62,.04,panel,.43,1.24,.775);box(group,.055,.21,.025,pink,.43,1.27,.805);
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(2.12,1.76),new THREE.MeshBasicMaterial({color:0x050711}));screen.position.set(0,3.29,.412);group.add(screen);
  return {group,screen};
 }
 const silentDisplay=createCabinet('SILENT STAIRS','A PUZZLE OF PERSPECTIVE',3.3);
 const poolDisplay=createCabinet('EIGHT BALL','POOL · PRECISION · PLAY',-3.3);

 // Silent Stairs runs as a small live scene inside its cabinet screen.
 const stairsScene=new THREE.Scene();stairsScene.background=new THREE.Color(0x1b1f2a);
 const stairsCamera=new THREE.OrthographicCamera(-12,12,9.5,-9.5,.1,100);stairsCamera.position.set(9,8,11);stairsCamera.lookAt(0,2,0);
 stairsScene.add(new THREE.AmbientLight(0xffffff,1));const stairsSun=new THREE.DirectionalLight(0xffffff,2);stairsSun.position.set(6,12,4);stairsScene.add(stairsSun);
 const world=new THREE.Group();stairsScene.add(world);
 const firstStair=createStaircase({steps:5,rise:.6,run:1,width:2.2,color:0xe4dccb,enlargeLast:false});world.add(firstStair.group);
 const secondStair=createStaircase({steps:4,rise:.6,run:1,width:2.2,color:0xe4dccb,enlargeFirst:false});
 const connector=solveConnectorPosition(firstStair.exitLocal,stairsCamera,42*Math.PI/180,6.5);secondStair.group.position.set(connector.x,connector.y-secondStair.height,connector.z);world.add(secondStair.group);
 const ghost=createGhost();ghost.group.position.copy(firstStair.entryLocal);world.add(ghost.group);
 const goal=createMarker(0xf2c14e);goal.position.copy(secondStair.exitLocal).add(secondStair.group.position).add(new THREE.Vector3(0,.4,0));world.add(goal);

 // Build a lit, perspective pool table as a second real-time 3D scene.
 const poolScene=new THREE.Scene();poolScene.background=new THREE.Color(0x06140f);
 const poolCamera=new THREE.PerspectiveCamera(39,2.12/1.76,.1,50);poolCamera.position.set(0,8.8,6.6);poolCamera.lookAt(0,0,0);
 poolScene.add(new THREE.HemisphereLight(0xd7ffe9,0x06180f,2));
 const poolKey=new THREE.DirectionalLight(0xffe4ae,2.7);poolKey.position.set(-3,7,4);poolScene.add(poolKey);
 const tableWood=new THREE.MeshStandardMaterial({color:0x492c19,roughness:.32,metalness:.2});
 const tableBrass=new THREE.MeshStandardMaterial({color:0xb88b4d,roughness:.25,metalness:.68,emissive:0x35200a,emissiveIntensity:.3});
 const tableFelt=new THREE.MeshStandardMaterial({color:0x075439,roughness:.66,metalness:.02});
 const cushion=new THREE.MeshStandardMaterial({color:0x14533a,roughness:.38,metalness:.08});
 const base=new THREE.Mesh(new THREE.BoxGeometry(7.3,.32,4.45),tableWood);base.position.y=-.25;poolScene.add(base);
 const brassBed=new THREE.Mesh(new THREE.BoxGeometry(7.05,.09,4.2),tableBrass);brassBed.position.y=-.04;poolScene.add(brassBed);
 const felt=new THREE.Mesh(new THREE.BoxGeometry(6.78,.1,3.93),tableFelt);felt.position.y=.035;poolScene.add(felt);
 for(const [x,z,w,d] of [[0,-1.84,6.9,.24],[0,1.84,6.9,.24],[-3.27,0,.24,3.65],[3.27,0,.24,3.65]]){const rail=new THREE.Mesh(new THREE.BoxGeometry(w,.2,d),cushion);rail.position.set(x,.17,z);poolScene.add(rail);}
 const pocketMaterial=new THREE.MeshBasicMaterial({color:0x010403});
 for(const [x,z] of [[-3.22,-1.83],[0,-1.83],[3.22,-1.83],[-3.22,1.83],[0,1.83],[3.22,1.83]]){const pocket=new THREE.Mesh(new THREE.CylinderGeometry(.22,.25,.05,28),pocketMaterial);pocket.position.set(x,.19,z);poolScene.add(pocket);}
 const balls=[];
 function poolBall(x,z,color,number){
  const ball=new THREE.Mesh(new THREE.SphereGeometry(.235,32,24),new THREE.MeshPhysicalMaterial({color,roughness:.12,metalness:.04,clearcoat:1,clearcoatRoughness:.05}));
  ball.position.set(x,.32,z);poolScene.add(ball);balls.push(ball);
  if(number!==undefined){const medallion=new THREE.Mesh(new THREE.CircleGeometry(.105,24),new THREE.MeshBasicMaterial({color:0xf9f6e9}));medallion.rotation.x=-Math.PI/2;medallion.position.set(0,.231,0);ball.add(medallion);const mark=label(ball,String(number),.125,.125,0,.238,0,'#1a201d',46);mark.rotation.x=-Math.PI/2;}
  return ball;
 }
 const cueBall=poolBall(-1.55,-.62,0xf2f4ed);
 const rack=[[-.1,0,8,0x151718],[.42,.25,1,0xe5b131],[.42,-.25,9,0xe9e7d9],[.94,.5,3,0xbe3541],[.94,0,10,0xe8e5d7],[.94,-.5,2,0x3c57a4],[1.46,.75,6,0x278251],[1.46,.25,11,0xd8b349],[1.46,-.25,7,0x352774],[1.46,-.75,14,0xe5e3d7]];
 rack.forEach(([x,z,n,color])=>poolBall(x,z,color,n));
 const cueGroup=new THREE.Group();poolScene.add(cueGroup);
 const cueShaft=new THREE.Mesh(new THREE.CylinderGeometry(.032,.055,1.94,20),new THREE.MeshStandardMaterial({color:0xd6a158,roughness:.23,metalness:.24}));cueShaft.rotation.z=Math.PI/2;cueShaft.position.set(-2.45,.34,-.62);cueGroup.add(cueShaft);
 const cueFerrule=new THREE.Mesh(new THREE.CylinderGeometry(.044,.044,.12,16),new THREE.MeshStandardMaterial({color:0xe6e9e3,roughness:.22}));cueFerrule.rotation.z=Math.PI/2;cueFerrule.position.set(-1.42,.34,-.62);cueGroup.add(cueFerrule);
 cueGroup.position.set(-.425,0,0);

 const gameTarget=new THREE.WebGLRenderTarget(768,640);gameTarget.texture.colorSpace=THREE.SRGBColorSpace;
 silentDisplay.screen.material.map=gameTarget.texture;silentDisplay.screen.material.color.set(0xffffff);silentDisplay.screen.material.needsUpdate=true;
 const poolTarget=new THREE.WebGLRenderTarget(768,640);poolTarget.texture.colorSpace=THREE.SRGBColorSpace;
 poolDisplay.screen.material.map=poolTarget.texture;poolDisplay.screen.material.color.set(0xffffff);poolDisplay.screen.material.needsUpdate=true;
 const chessDisplay=createCabinet('CHESS','STRATEGY · CLASSIC · PLAY',3.3);
 const chessTarget=new THREE.WebGLRenderTarget(512,426);chessTarget.texture.colorSpace=THREE.SRGBColorSpace;
 chessDisplay.screen.material.map=chessTarget.texture;chessDisplay.screen.material.color.set(0xffffff);chessDisplay.screen.material.needsUpdate=true;
 // A compact low-poly board preview keeps the gallery scene light while making Chess feel like a live game.
 const chessScene=new THREE.Scene();chessScene.background=new THREE.Color(0x10151a);
 const chessCamera=new THREE.PerspectiveCamera(35,2.12/1.76,.1,50);chessCamera.position.set(8.8,10.8,11.4);chessCamera.lookAt(0,.1,0);
 chessScene.add(new THREE.HemisphereLight(0xdbe9e8,0x171518,1.8));const chessKey=new THREE.DirectionalLight(0xffe4ba,2.2);chessKey.position.set(-4,9,6);chessScene.add(chessKey);const chessRim=new THREE.PointLight(0x70ded4,18,14);chessRim.position.set(4,4,-4);chessScene.add(chessRim);
 const chessWorld=new THREE.Group();chessScene.add(chessWorld);
 const chessWood=new THREE.MeshStandardMaterial({color:0x38291f,roughness:.4,metalness:.12}),chessGold=new THREE.MeshStandardMaterial({color:0xb8965f,roughness:.25,metalness:.65}),chessLight=new THREE.MeshStandardMaterial({color:0xe8dfca,roughness:.3}),chessDark=new THREE.MeshStandardMaterial({color:0x343331,roughness:.32}),chessWhite=new THREE.MeshStandardMaterial({color:0xe9e0cb,roughness:.22,metalness:.12}),chessBlack=new THREE.MeshStandardMaterial({color:0x172024,roughness:.2,metalness:.4});
 const chessBase=new THREE.Mesh(new THREE.BoxGeometry(8.6,.34,8.6),chessWood);chessBase.position.y=-.14;chessBase.receiveShadow=true;chessWorld.add(chessBase);const chessTrim=new THREE.Mesh(new THREE.BoxGeometry(8.68,.08,8.68),chessGold);chessTrim.position.y=.025;chessWorld.add(chessTrim);
 const tileGeometry=new THREE.BoxGeometry(1,.1,1),lightTiles=new THREE.InstancedMesh(tileGeometry,chessLight,32),darkTiles=new THREE.InstancedMesh(tileGeometry,chessDark,32),tileDummy=new THREE.Object3D();let lightIndex=0,darkIndex=0;for(let row=0;row<8;row++)for(let col=0;col<8;col++){tileDummy.position.set(col-3.5,.08,row-3.5);tileDummy.updateMatrix();if((row+col)%2){darkTiles.setMatrixAt(darkIndex++,tileDummy.matrix);}else{lightTiles.setMatrixAt(lightIndex++,tileDummy.matrix);}}chessWorld.add(lightTiles,darkTiles);
 const pieceProfiles={pawn:[[0,.08],[.24,.08],[.27,.15],[.18,.23],[.12,.31],[.16,.44],[.11,.51],[.15,.61],[.12,.71],[.08,.77]],rook:[[0,.08],[.25,.08],[.28,.16],[.2,.24],[.14,.48],[.22,.56],[.22,.7],[.27,.7],[.27,.8],[.08,.8]],bishop:[[0,.08],[.25,.08],[.28,.16],[.19,.24],[.14,.45],[.1,.57],[.16,.61],[.1,.76],[.02,.86]],king:[[0,.08],[.26,.08],[.28,.16],[.19,.24],[.14,.46],[.23,.55],[.22,.68],[.14,.73],[.18,.81],[.08,.9]]};
 const pieceTypes=['pawn','rook','bishop','king'];for(const [color,material] of [['white',chessWhite],['black',chessBlack]])for(const type of pieceTypes){const geometry=new THREE.LatheGeometry(pieceProfiles[type].map(([r,y])=>new THREE.Vector2(r,y)),10);geometry.computeVertexNormals();const mesh=new THREE.InstancedMesh(geometry,material,type==='pawn'?8:2);const dummyPiece=new THREE.Object3D();let count=0;const row=color==='white'?3.5:-3.5,back=color==='white'?2.5:-2.5;const positions=type==='pawn'?Array.from({length:8},(_,i)=>[i-3.5,row]):type==='rook'?[[-3.5,back],[3.5,back]]:type==='bishop'?[[-1.5,back],[1.5,back]]:[[-.5,back],[.5,back]];for(const [x,z] of positions){dummyPiece.position.set(x,.05,z);if(type==='king'&&count===1)dummyPiece.rotation.y=Math.PI/8;dummyPiece.updateMatrix();mesh.setMatrixAt(count++,dummyPiece.matrix);}chessWorld.add(mesh);}
 function reflectionFor(source){const group=source.clone();group.scale.y=-1;group.traverse(node=>{if(node.isMesh){node.material=node.material.clone();node.material.transparent=true;node.material.opacity*=.18;node.material.depthWrite=false;}});scene.add(group);return group;}
 const silentReflection=reflectionFor(silentDisplay.group),poolReflection=reflectionFor(poolDisplay.group),chessReflection=reflectionFor(chessDisplay.group);

 const floor=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({color:0x090d1d,roughness:.23,metalness:.65,transparent:true,opacity:.78,depthWrite:false}));floor.rotation.x=-Math.PI/2;floor.position.y=-.015;scene.add(floor);
 const grid=new THREE.GridHelper(140,100,0x3541a0,0x202b64);grid.position.y=.005;grid.material.transparent=true;grid.material.opacity=.62;scene.add(grid);
 const glowCanvas=document.createElement('canvas');glowCanvas.width=128;glowCanvas.height=128;const glowContext=glowCanvas.getContext('2d');const gradient=glowContext.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(255,255,255,.7)');gradient.addColorStop(.13,'rgba(255,255,255,.25)');gradient.addColorStop(1,'rgba(255,255,255,0)');glowContext.fillStyle=gradient;glowContext.fillRect(0,0,128,128);const glowTexture=new THREE.CanvasTexture(glowCanvas);
 function glow(x,y,z,color,scale=3){const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.65}));sprite.position.set(x,y,z);sprite.scale.set(scale,scale*2.8,1);scene.add(sprite);}
 const poles=[[-6,4,-1,0x66ddff],[-9,5,-8,0x7799ff],[6,5,-3,0xc383ff],[9,4,-9,0x6cdfff],[-2,3,-12,0x68efd9],[3,6,-14,0xa580ff],[-13,6,-18,0x8fcaff],[13,6,-16,0x78caff]];
 for(const [x,height,z,color] of poles){box(scene,.055,height,.055,new THREE.MeshBasicMaterial({color}),x,height/2,z);glow(x,height/2,z,color,2.1);box(scene,.04,height,.04,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.18}),x,-height/2,z);}
 glow(4.58,2.5,.65,0x9974ff,1.35);glow(2.02,2.5,.65,0x70deff,1.2);glow(-4.58,2.5,.65,0x9974ff,1.35);glow(-2.02,2.5,.65,0x70deff,1.2);
 let seed=43;function random(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
 const buildings=new THREE.Group();scene.add(buildings);const windowGeometry=new THREE.PlaneGeometry(.1,.27);const windowMaterial=new THREE.MeshBasicMaterial({color:0x6682d6,transparent:true,opacity:.25});const windows=new THREE.InstancedMesh(windowGeometry,windowMaterial,1300);let windowCount=0;const dummy=new THREE.Object3D();
 for(let i=0;i<22;i++){const x=(i%2?-1:1)*(8+random()*19),z=-10-random()*35,height=7+random()*22,width=1.7+random()*3;box(buildings,width,height,2,new THREE.MeshStandardMaterial({color:i%3?0x080c19:0x100e25,roughness:1}),x,height/2,z);for(let row=0;row<height/.65;row++)for(let col=0;col<3;col++)if(random()>.6&&windowCount<1300){dummy.position.set(x-width*.32+col*width*.32,.7+row*.65,z+1.01);dummy.updateMatrix();windows.setMatrixAt(windowCount++,dummy.matrix);}}
 windows.count=windowCount;scene.add(windows);
 const starsGeometry=new THREE.BufferGeometry();const starPositions=new Float32Array(400*3);for(let i=0;i<400;i++){starPositions[i*3]=(random()-.5)*110;starPositions[i*3+1]=random()*35+2;starPositions[i*3+2]=-random()*70;}starsGeometry.setAttribute('position',new THREE.BufferAttribute(starPositions,3));scene.add(new THREE.Points(starsGeometry,new THREE.PointsMaterial({color:0x92bdea,size:.035,transparent:true,opacity:.5})));

 const sceneTarget=new THREE.WebGLRenderTarget(1,1);const postScene=new THREE.Scene();const postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 const postMaterial=new THREE.ShaderMaterial({uniforms:{image:{value:sceneTarget.texture},resolution:{value:new THREE.Vector2(1,1)}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D image;uniform vec2 resolution;varying vec2 vUv;vec3 bright(vec2 uv){vec3 c=texture2D(image,uv).rgb;return c*max(0.,max(c.r,max(c.g,c.b))-.52);}void main(){vec3 c=texture2D(image,vUv).rgb;vec3 b=vec3(0.);for(int i=0;i<12;i++){float a=float(i)*.523598;vec2 d=vec2(cos(a),sin(a))/resolution;b+=bright(vUv+d*5.)*.024+bright(vUv+d*13.)*.027+bright(vUv+d*28.)*.018;}gl_FragColor=vec4(c+b,1.);}`});
 postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),postMaterial));

 const displayMap={'silent-stairs':{cabinet:silentDisplay.group,reflection:silentReflection,cameraSide:1},'eight-ball-pool':{cabinet:poolDisplay.group,reflection:poolReflection,cameraSide:-1},chess:{cabinet:chessDisplay.group,reflection:chessReflection,cameraSide:1}};
 const displays=[...document.querySelectorAll('[data-game-scene]')].map(section=>({section,...displayMap[section.dataset.gameScene]})).filter(item=>item.cabinet);
 const introObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');introObserver.unobserve(entry.target);}}),{threshold:.18});
 document.querySelectorAll('.game-card').forEach(card=>introObserver.observe(card));
 let pointerX=0,pointerY=0,mobile=false,poolScroll=0;
 function updateProgress(){document.querySelector('#progress').style.width=100*window.scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)+'%';}
 addEventListener('scroll',updateProgress,{passive:true});
 addEventListener('pointermove',event=>{if(event.pointerType==='touch')return;pointerX=Math.max(-1,Math.min(1,event.clientX/innerWidth*2-1));pointerY=Math.max(-1,Math.min(1,event.clientY/innerHeight*2-1));},{passive:true});
 function resetPointer(){pointerX=0;pointerY=0;}document.documentElement.addEventListener('pointerleave',resetPointer);addEventListener('blur',resetPointer);
 function sectionProgress(){
  const center=window.scrollY+innerHeight*.5;
  const points=displays.map(item=>item.section.offsetTop+item.section.offsetHeight*.5);
  const poolSection=displays.find(item=>item.section.dataset.gameScene==='eight-ball-pool')?.section;
  if(poolSection)poolScroll=THREE.MathUtils.clamp((center-poolSection.offsetTop)/Math.max(1,poolSection.offsetHeight),0,1);
  if(points.length<2)return {index:0,mix:0};
  if(center<=points[0])return {index:0,mix:0};
  for(let i=0;i<points.length-1;i++)if(center<=points[i+1])return {index:i,mix:THREE.MathUtils.smoothstep((center-points[i])/(points[i+1]-points[i]),0,1)};
  return {index:points.length-2,mix:1};
 }
 function resize(){mobile=innerWidth<=650;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);const size=renderer.getDrawingBufferSize(new THREE.Vector2());sceneTarget.setSize(size.x,size.y);postMaterial.uniforms.resolution.value.copy(size);stairsCamera.updateProjectionMatrix();poolCamera.aspect=2.12/1.76;poolCamera.updateProjectionMatrix();chessCamera.aspect=2.12/1.76;chessCamera.updateProjectionMatrix();updateProgress();}
 addEventListener('resize',resize);resize();
 let previous=performance.now(),time=0,visible=true;const cameraLook=new THREE.Vector3(),cameraTarget=new THREE.Vector3();const sceneWeights=displays.map((_,index)=>index===0?1:0);
 document.addEventListener('visibilitychange',()=>visible=!document.hidden);
 function applyOpacity(group,amount){group.traverse(node=>{if(!node.isMesh)return;const materials=Array.isArray(node.material)?node.material:[node.material];for(const material of materials){if(material.userData.galleryBaseOpacity===undefined)material.userData.galleryBaseOpacity=material.opacity;material.transparent=true;material.opacity=material.userData.galleryBaseOpacity*amount;material.needsUpdate=true;}});group.visible=amount>.006;}
 function frame(now){
  requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.05);previous=now;if(!visible)return;if(!paused)time+=dt;
  const transition=paused?{index:0,mix:0}:sectionProgress();
  const targetWeights=displays.map((_,index)=>index===transition.index?1-transition.mix:index===transition.index+1?transition.mix:0);
  sceneWeights.forEach((weight,index)=>{sceneWeights[index]=weight+(targetWeights[index]-weight)*(1-Math.exp(-3.4*dt));const item=displays[index];const side=item.cameraSide;item.cabinet.position.x=mobile?0:side*3.3;item.cabinet.rotation.y=mobile?0:side*-.17;item.reflection.position.x=item.cabinet.position.x;item.reflection.rotation.y=item.cabinet.rotation.y;applyOpacity(item.cabinet,sceneWeights[index]);applyOpacity(item.reflection,sceneWeights[index]);});
  const shot=THREE.MathUtils.clamp(poolScroll,0,1);
  const pull=THREE.MathUtils.smoothstep(shot,0,.19)-THREE.MathUtils.smoothstep(shot,.19,.34);
  const push=THREE.MathUtils.smoothstep(shot,.2,.34);
  cueGroup.position.x=-.425-.28*pull+.3*push;
  cueBall.position.x=-1.55+1.32*THREE.MathUtils.smoothstep(shot,.31,.82);
  balls.forEach((ball,index)=>{ball.rotation.z+=dt*(.16+index*.009);});
  const activePointer=!paused&&!mobile;const mx=activePointer?pointerX:0,my=activePointer?pointerY:0;
  const nextIndex=Math.min(transition.index+1,displays.length-1),from=displays[transition.index],to=displays[nextIndex];
  const cameraX=THREE.MathUtils.lerp(from.cameraSide*.7,to.cameraSide*.7,transition.mix),lookX=THREE.MathUtils.lerp(from.cameraSide*.3,to.cameraSide*.3,transition.mix);
  cameraTarget.set(mobile?0:cameraX+mx*.95,mobile?6.2:3.7-my*.45, mobile?13.5:13);
  camera.position.lerp(cameraTarget,1-Math.exp(-4.4*dt));
  cameraLook.set(mobile?0:lookX+mx*.32,mobile?4.4:2.45-my*.22,0);camera.lookAt(cameraLook);
  ghost.update(time,false);world.rotation.y=.1+transition.mix*.42;if(chessDisplay.group.visible)chessWorld.rotation.y=Math.sin(time*.22)*.045;
  renderer.setRenderTarget(gameTarget);renderer.render(stairsScene,stairsCamera);
  renderer.setRenderTarget(poolTarget);renderer.render(poolScene,poolCamera);
  if(chessDisplay.group.visible){renderer.setRenderTarget(chessTarget);renderer.render(chessScene,chessCamera);}
  renderer.setRenderTarget(sceneTarget);renderer.render(scene,camera);
  renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
 }
 requestAnimationFrame(frame);
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();document.querySelector('#fallback').hidden=false;motion.hidden=true;});
}
