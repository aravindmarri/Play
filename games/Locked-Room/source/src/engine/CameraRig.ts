import * as THREE from 'three';
import CameraControls from 'camera-controls';
CameraControls.install({ THREE });
export type Viewpoint = { eye: [number,number,number]; target: [number,number,number] };
export class CameraRig {
  camera = new THREE.PerspectiveCamera(48, 1, .05, 70);
  controls: CameraControls;
  reduced = false;
  constructor(canvas: HTMLCanvasElement) {
    this.controls = new CameraControls(this.camera, canvas);
    this.controls.smoothTime = .28;
    this.controls.draggingSmoothTime = .14;
    this.controls.mouseButtons.left = CameraControls.ACTION.NONE;
    this.controls.mouseButtons.right = CameraControls.ACTION.NONE;
    this.controls.mouseButtons.wheel = CameraControls.ACTION.NONE;
    this.controls.touches.one = CameraControls.ACTION.NONE;
    this.controls.touches.two = CameraControls.ACTION.NONE;
  }
  async go(view: Viewpoint, immediate = false) {
    this.controls.smoothTime = this.reduced ? .07 : .24;
    await this.controls.setLookAt(...view.eye, ...view.target, !immediate);
  }
  look(dx: number, dy: number) {
    const eye=this.controls.getPosition(new THREE.Vector3(),true);
    const direction=this.controls.getTarget(new THREE.Vector3(),true).sub(eye);
    direction.applyAxisAngle(new THREE.Vector3(0,1,0),dx);
    const right=new THREE.Vector3().crossVectors(direction,new THREE.Vector3(0,1,0)).normalize();
    direction.applyAxisAngle(right,dy);
    const target=eye.clone().add(direction);
    void this.controls.setLookAt(...eye.toArray() as [number,number,number],...target.toArray() as [number,number,number],true);
  }
  resize(w: number, h: number) { this.camera.aspect = w / h; this.camera.fov = w < 700 ? 54 : 48; this.camera.updateProjectionMatrix(); }
  tick(dt: number) { this.controls.update(dt); }
}
