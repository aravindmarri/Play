import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
export type Asset = { id: string; url: string; type: 'hdr' | 'gltf' | 'ktx2' };
export class Assets {
  gltf: GLTFLoader;
  private draco = new DRACOLoader();
  private ktx = new KTX2Loader();
  constructor(private renderer: THREE.WebGLRenderer) {
    // Current Three.js resolves and bundles its decoder URLs via import.meta.url.
    this.ktx.detectSupport(renderer);
    this.gltf = new GLTFLoader().setDRACOLoader(this.draco).setKTX2Loader(this.ktx);
  }
  async loadAll(assets:Asset[],scene:THREE.Scene,progress:(fraction:number,label:string)=>void){
    scene.userData.assets={};
    for(let i=0;i<assets.length;i++){
      const asset=assets[i];const report=(received:number,total:number)=>progress((i+(total?received/total:0))/assets.length,`${asset.id} · ${(received/1024).toFixed(0)} KB${total?` / ${(total/1024).toFixed(0)} KB`:''}`);
      if(asset.type==='hdr')await this.environment(asset,scene,report);
      else{const url=`${import.meta.env.BASE_URL}${asset.url}`;const onProgress=(event:ProgressEvent)=>report(event.loaded,event.total);scene.userData.assets[asset.id]=asset.type==='gltf'?await this.gltf.loadAsync(url,onProgress):await this.ktx.loadAsync(url,onProgress);}
      progress((i+1)/assets.length,asset.id+' ready');
    }
  }
  async environment(asset: Asset, scene: THREE.Scene, progress: (received: number,total: number) => void) {
    const response=await fetch(`${import.meta.env.BASE_URL}${asset.url}`);
    if(!response.ok)throw new Error('The room lighting could not load. Please retry.');
    const total=Number(response.headers.get('content-length'))||0;
    const chunks: Uint8Array[]=[];let size=0;
    if(response.body){const reader=response.body.getReader();for(;;){const result=await reader.read();if(result.done)break;chunks.push(result.value);size+=result.value.length;progress(size,total);}}
    else{const data=new Uint8Array(await response.arrayBuffer());chunks.push(data);size=data.length;}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    const parsed=new HDRLoader().parse(bytes.buffer);
    const texture=new THREE.DataTexture(parsed.data,parsed.width,parsed.height,THREE.RGBAFormat,parsed.type);
    texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.LinearSRGBColorSpace;texture.needsUpdate=true;
    const pmrem=new THREE.PMREMGenerator(this.renderer);
    // r186's GGX kernel leaves sin(pi) residues in constant-folded samples.
    // ANGLE/D3D reports precision warnings for those near-zero values. Snap only
    // sub-float-precision components, preserving shader validation and errors.
    // This adapter is deliberately local to the pinned r186 PMREM implementation.
    const internal=pmrem as unknown as { _allocateTargets:()=>THREE.WebGLRenderTarget; _ggxMaterial:THREE.ShaderMaterial };
    const allocate=internal._allocateTargets.bind(pmrem);
    internal._allocateTargets=()=>{const target=allocate();internal._ggxMaterial.fragmentShader=internal._ggxMaterial.fragmentShader.replace('float s = 0.5 * (1.0 + V.z);','t1 = abs(t1) < 0.0000001 ? 0.0 : t1;\n t2 = abs(t2) < 0.0000001 ? 0.0 : t2;\n float s = 0.5 * (1.0 + V.z);');return target;};
    scene.environment=pmrem.fromEquirectangular(texture).texture;scene.environmentIntensity=.28;
    pmrem.dispose();texture.dispose();progress(size,size);
  }
}
