import * as THREE from 'three';
import { EffectComposer, RenderPass, NormalPass, EffectPass, SSAOEffect, SelectiveBloomEffect, DepthOfFieldEffect, VignetteEffect, NoiseEffect, SMAAEffect, BrightnessContrastEffect, BlendFunction } from 'postprocessing';
export class PostFX {
  composer: EffectComposer;
  bloom: SelectiveBloomEffect;
  dof: DepthOfFieldEffect;
  private normal: NormalPass;
  private aoPass: EffectPass;
  private dofPass: EffectPass;
  private grain: NoiseEffect;
  private tier = 'medium';private dim=new BrightnessContrastEffect({brightness:0});private dimLow=new BrightnessContrastEffect({brightness:0});
  private fullPass:EffectPass;
  private lowPass:EffectPass;
  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.composer=new EffectComposer(renderer,{frameBufferType:THREE.HalfFloatType});
    this.composer.addPass(new RenderPass(scene,camera));
    this.normal=new NormalPass(scene,camera);this.composer.addPass(this.normal);
    const ao=new SSAOEffect(camera,this.normal.texture,{samples:9,rings:3,radius:.08,intensity:1.15,worldDistanceThreshold:20,worldDistanceFalloff:5,worldProximityThreshold:.3,worldProximityFalloff:.15,resolutionScale:.5});
    this.aoPass=new EffectPass(camera,ao);this.composer.addPass(this.aoPass);
    this.dof=new DepthOfFieldEffect(camera,{worldFocusDistance:1.4,worldFocusRange:.6,bokehScale:2,resolutionScale:.5});
    this.dofPass=new EffectPass(camera,this.dof);this.dofPass.enabled=false;this.composer.addPass(this.dofPass);
    this.bloom=new SelectiveBloomEffect(scene,camera,{intensity:.4,luminanceThreshold:.7,mipmapBlur:true});this.bloom.ignoreBackground=true;
    this.grain=new NoiseEffect({blendFunction:BlendFunction.SOFT_LIGHT});this.grain.blendMode.opacity.value=.055;
    this.fullPass=new EffectPass(camera,this.dim,this.bloom,new VignetteEffect({darkness:.36,offset:.25}),this.grain,new SMAAEffect());this.composer.addPass(this.fullPass);
    this.lowPass=new EffectPass(camera,this.dimLow,new VignetteEffect({darkness:.36,offset:.25}),new SMAAEffect());this.lowPass.enabled=false;this.composer.addPass(this.lowPass);
  }
  quality(tier: string, reduced: boolean) {this.tier=tier;this.fullPass.enabled=tier!=='low';this.lowPass.enabled=tier==='low';this.fullPass.renderToScreen=tier!=='low';this.lowPass.renderToScreen=tier==='low';this.aoPass.enabled=tier!=='low';this.normal.enabled=tier!=='low';this.grain.blendMode.opacity.value=reduced?0:.045;if(tier==='low')this.dofPass.enabled=false;}
  inspect(point: THREE.Vector3 | null) { this.dof.target=null;this.dof.circleOfConfusionMaterial.worldFocusDistance=point?.45:1.4;this.dof.circleOfConfusionMaterial.worldFocusRange=.1;this.dim.brightness=this.dimLow.brightness=point?-.13:0;this.dofPass.enabled=!!point&&this.tier!=='low'; }
  resize(w:number,h:number){this.composer.setSize(w,h);}
  render(dt:number){this.composer.render(dt);}
}
