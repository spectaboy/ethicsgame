import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

class FirstPersonCameraDemo {
  constructor() {
    this.initialize_();
  }

  initialize_() {
    this.initializeRenderer_();
    this.initializeLights_();
    this.initializeScene_();
    this.initializePostFX_();
    this.initializeDemo_();

    this.previousRAF_ = null;
    this.raf_();
    this.onWindowResize_();
  }

  initializeDemo_() {
    this.controls_ = new PointerLockControls(this.camera_, document.body);
    this.scene_.add(this.controls_.getObject());

    this.raycaster_ = new THREE.Raycaster();

    document.addEventListener('click', () => {
      if (this.controls_.isLocked) {
        this.raycaster_.setFromCamera(new THREE.Vector2(), this.camera_);
        const intersects = this.raycaster_.intersectObjects(this.scene_.children, true);
        if (intersects.length > 0 && intersects[0].object.name == 'next-button') {
            this.loadNextScene_();
        }
      } else {
        this.controls_.lock();
      }
    });

    const onKeyDown = (event) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.moveForward = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.moveLeft = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.moveBackward = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.moveRight = true;
          break;
        case 'Space':
          this.moveUp = true;
          break;
        case 'ShiftLeft':
          this.moveDown = true;
          break;
      }
    };

    const onKeyUp = (event) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.moveForward = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.moveLeft = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.moveBackward = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.moveRight = false;
          break;
        case 'Space':
          this.moveUp = false;
          break;
        case 'ShiftLeft':
          this.moveDown = false;
          break;
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.moveUp = false;
    this.moveDown = false;
    this.mixers = [];
  }

  initializeScene_() {
    const loader = new GLTFLoader();
    loader.load('./resources/classroom/scene.gltf', (gltf) => {
      this.scene_.add(gltf.scene);

      this.camera_.position.set(-78.75, 158.84, 148.83);
      this.camera_.lookAt(-71.27, 158.84, 374.03);

      this.createWorldButton_();
    });
  }

  loadNextScene_() {
    // Clear existing scene
    while(this.scene_.children.length > 0){ 
      this.scene_.remove(this.scene_.children[0]); 
    }

    // Add lights back in
    this.initializeLights_();

    // Load new scene
    const fbxLoader = new FBXLoader();
    fbxLoader.load('./resources/isometric-bedroom (1)/source/cameretta.fbx', (fbx) => {
      this.scene_.add(fbx);
      
      // Position camera
      this.camera_.position.set(100, 100, 100);
      this.camera_.lookAt(0, 0, 0);

      // We don't need the pointer lock controls for the new scene
      this.controls_.unlock();
      this.controls_.enabled = false;
    });
  }

  createWorldButton_() {
    const buttonMaterial = new THREE.MeshBasicMaterial({
        color: 0x0000ff,
        transparent: true,
        opacity: 0.8
    });

    this.button_ = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 10, 1, 1),
        buttonMaterial
    );
    
    this.button_.position.set(-195.81, 158.84, 386.73);
    this.button_.lookAt(this.camera_.position);

    this.button_.name = 'next-button';
    this.scene_.add(this.button_);
  }

  initializeRenderer_() {
    this.threejs_ = new THREE.WebGLRenderer({
      antialias: false,
    });
    this.threejs_.shadowMap.enabled = true;
    this.threejs_.shadowMap.type = THREE.PCFSoftShadowMap;
    this.threejs_.setPixelRatio(window.devicePixelRatio);
    this.threejs_.setSize(window.innerWidth, window.innerHeight);
    this.threejs_.physicallyCorrectLights = true;
    this.threejs_.outputEncoding = THREE.sRGBEncoding;

    document.body.appendChild(this.threejs_.domElement);

    window.addEventListener('resize', () => {
      this.onWindowResize_();
    }, false);

    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 1000.0;
    this.camera_ = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera_.position.set(0, 50, 100);

    this.scene_ = new THREE.Scene();

    this.uiCamera_ = new THREE.OrthographicCamera(
        -1, 1, 1 * aspect, -1 * aspect, 1, 1000);
    this.uiScene_ = new THREE.Scene();
  }

  initializeLights_() {
    const distance = 50.0;
    const angle = Math.PI / 4.0;
    const penumbra = 0.5;
    const decay = 1.0;

    let light = new THREE.SpotLight(
        0xFFFFFF, 100.0, distance, angle, penumbra, decay);
    light.castShadow = true;
    light.shadow.bias = -0.00001;
    light.shadow.mapSize.width = 4096;
    light.shadow.mapSize.height = 4096;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 100;

    light.position.set(25, 25, 0);
    light.lookAt(0, 0, 0);
    this.scene_.add(light);

    const upColour = 0xFFFF80;
    const downColour = 0x808080;
    light = new THREE.HemisphereLight(upColour, downColour, 0.5);
    light.color.setHSL( 0.6, 1, 0.6 );
    light.groundColor.setHSL( 0.095, 1, 0.75 );
    light.position.set(0, 4, 0);
    this.scene_.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene_.add(ambientLight);
  }

  loadMaterial_(name, tiling) {
    const mapLoader = new THREE.TextureLoader();
    const maxAnisotropy = this.threejs_.capabilities.getMaxAnisotropy();

    const metalMap = mapLoader.load('resources/freepbr/' + name + 'metallic.png');
    metalMap.anisotropy = maxAnisotropy;
    metalMap.wrapS = THREE.RepeatWrapping;
    metalMap.wrapT = THREE.RepeatWrapping;
    metalMap.repeat.set(tiling, tiling);

    const albedo = mapLoader.load('resources/freepbr/' + name + 'albedo.png');
    albedo.anisotropy = maxAnisotropy;
    albedo.wrapS = THREE.RepeatWrapping;
    albedo.wrapT = THREE.RepeatWrapping;
    albedo.repeat.set(tiling, tiling);
    albedo.encoding = THREE.sRGBEncoding;

    const normalMap = mapLoader.load('resources/freepbr/' + name + 'normal.png');
    normalMap.anisotropy = maxAnisotropy;
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(tiling, tiling);

    const roughnessMap = mapLoader.load('resources/freepbr/' + name + 'roughness.png');
    roughnessMap.anisotropy = maxAnisotropy;
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.set(tiling, tiling);

    const material = new THREE.MeshStandardMaterial({
      metalnessMap: metalMap,
      map: albedo,
      normalMap: normalMap,
      roughnessMap: roughnessMap,
    });

    return material;
  }

  initializePostFX_() {
  }

  onWindowResize_() {
    this.camera_.aspect = window.innerWidth / window.innerHeight;
    this.camera_.updateProjectionMatrix();

    this.uiCamera_.left = -this.camera_.aspect;
    this.uiCamera_.right = this.camera_.aspect;
    this.uiCamera_.updateProjectionMatrix();

    this.threejs_.setSize(window.innerWidth, window.innerHeight);
  }

  raf_() {
    requestAnimationFrame((t) => {
      if (this.previousRAF_ === null) {
        this.previousRAF_ = t;
      }

      this.step_(t, t - this.previousRAF_);
      this.threejs_.render(this.scene_, this.camera_);
      this.previousRAF_ = t;
      this.raf_();
    });
  }

  step_(time, timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;
    this.mixers.forEach(mixer => mixer.update(timeElapsedS));

    if (this.controls_.isLocked) {
        const speed = 200.0 * timeElapsedS;
        if (this.moveForward) {
            this.controls_.moveForward(speed);
        }
        if (this.moveBackward) {
            this.controls_.moveForward(-speed);
        }
        if (this.moveRight) {
            this.controls_.moveRight(speed);
        }
        if (this.moveLeft) {
            this.controls_.moveRight(-speed);
        }
        if (this.moveUp) {
            this.controls_.getObject().position.y += speed;
        }
        if (this.moveDown) {
            this.controls_.getObject().position.y -= speed;
        }
    }

    if (!this.logTimer_ || time - this.logTimer_ > 1000) {
        console.log(`Player Position: X: ${this.camera_.position.x.toFixed(2)}, Y: ${this.camera_.position.y.toFixed(2)}, Z: ${this.camera_.position.z.toFixed(2)}`);
        this.logTimer_ = time;
    }

    this.updateInteractions_();
  }

  updateInteractions_() {
    if (this.controls_.isLocked) {
      this.raycaster_.setFromCamera(new THREE.Vector2(), this.camera_);
      const intersects = this.raycaster_.intersectObjects(this.scene_.children, true);
      if (intersects.length > 0 && intersects[0].object.name == 'next-button') {
          this.button_.material.color.set(0x00ff00);
      } else {
          this.button_.material.color.set(0x0000ff);
      }
    }
  }
}

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new FirstPersonCameraDemo();
});
