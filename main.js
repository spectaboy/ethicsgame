import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { ScenarioTree } from './ethics-ed-game/js/scenarios.js';

class FirstPersonCameraDemo {
  constructor() {
    this.initialize_();
    this.currentScenario = 'exam_malpractice';
    this.metrics = {
      academicStanding: 50,
      peerReputation: 50,
      integrity: 50
    };
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
        const intersects = this.raycaster_.intersectObjects(this.cssScene_.children, true);
        if (intersects.length > 0) {
          const clickedObject = intersects[0].object;
          if (clickedObject.name.startsWith('choice-')) {
            const choiceIndex = parseInt(clickedObject.name.split('-')[1]);
            const scenario = ScenarioTree[this.currentScenario];
            const choice = scenario.choices[choiceIndex];

            if (choice.metrics) {
              this.metrics.academicStanding += choice.metrics.academicStanding || 0;
              this.metrics.peerReputation += choice.metrics.peerReputation || 0;
              this.metrics.integrity += choice.metrics.integrity || 0;
            }
            
            const nextScenarioId = choice.nextId;
            const isOutcome = nextScenarioId.includes('_outcome');

            if (isOutcome) {
                this.showOutcome_(nextScenarioId);
            } else {
                this.displayScenario_(nextScenarioId);
            }
          }
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
    this.cssScene_ = new THREE.Scene();
    this.choiceButtons_ = [];
    this.interactionPlanes_ = [];
  }

  initializeScene_() {
    const loader = new GLTFLoader();
    loader.load('./resources/classroom/scene.gltf', (gltf) => {
      this.scene_.add(gltf.scene);

      this.camera_.position.set(-78.75, 158.84, 148.83);
      this.camera_.lookAt(-71.27, 158.84, 374.03);

      this.displayScenario_(this.currentScenario);
    });
  }

  loadNextScene_() {
    while(this.scene_.children.length > 0){ 
      this.scene_.remove(this.scene_.children[0]); 
    }
    while(this.cssScene_.children.length > 0){
        this.cssScene_.remove(this.cssScene_.children[0]);
    }
    this.initializeLights_();

    const fbxLoader = new FBXLoader();
    fbxLoader.load('./resources/isometric-bedroom (1)/source/cameretta.fbx', (fbx) => {
      this.scene_.add(fbx);
      
      this.camera_.position.set(-27.35, 73.30, -17.31);
      this.camera_.lookAt(-60.61, 73.30, -15.83);

      this.controls_.unlock();
    });
  }

  displayScenario_(scenarioId) {
    if (scenarioId === 'end') {
        this.loadNextScene_();
        return;
    }
    this.currentScenario = scenarioId;
    const scenario = ScenarioTree[scenarioId];
    if (!scenario) return;

    this.clearUI_();
    
    const { container, object } = this.createUIContainer_();
    
    this.populateUIGradeAndRules_(container);

    const dialogueBox = this.createDialogueBox_(container);
    
    const situation = document.createElement('p');
    situation.className = 'scenario-text';
    situation.textContent = scenario.situation;
    dialogueBox.appendChild(situation);

    const choices = document.createElement('div');
    choices.className = 'choices';
    scenario.choices.forEach((choice, index) => {
        const button = this.createButton_(choice.text);
        choices.appendChild(button);
        this.choiceButtons_.push(button);
    });
    dialogueBox.appendChild(choices);
    
    this.realignHitboxes_(container, object);
  }

  showOutcome_(outcomeId) {
    const outcomeScenario = ScenarioTree[outcomeId];
    if (!outcomeScenario) {
        if (outcomeId === 'end') this.loadNextScene_();
        return;
    }
    
    this.clearUI_();
    
    const { container, object } = this.createUIContainer_();
    
    this.populateUIGradeAndRules_(container);

    const dialogueBox = this.createDialogueBox_(container);

    const situation = document.createElement('p');
    situation.className = 'scenario-text';
    situation.textContent = outcomeScenario.situation;
    dialogueBox.appendChild(situation);

    const choices = document.createElement('div');
    choices.className = 'choices';
    const nextButton = this.createButton_('Next');
    nextButton.addEventListener('click', () => { // This is for debugging in-browser
        const nextScenarioId = outcomeScenario.choices[0].nextId;
        this.displayScenario_(nextScenarioId);
    });
    choices.appendChild(nextButton);
    dialogueBox.appendChild(choices);
    this.choiceButtons_.push(nextButton);

    this.realignHitboxes_(container, object);
  }

  clearUI_() {
    this.cssScene_.children.forEach(c => this.cssScene_.remove(c));
    this.choiceButtons_ = [];
    this.interactionPlanes_.forEach(p => p.parent.remove(p));
    this.interactionPlanes_ = [];
  }
  
  createUIContainer_() {
    const container = document.createElement('div');
    container.className = 'scene';
    const object = new CSS3DObject(container);
    object.position.set(-71.27, 158.84, 520.03);
    object.lookAt(this.camera_.position);
    this.cssScene_.add(object);
    return { container, object };
  }

  populateUIGradeAndRules_(container) {
    const getLetterGrade = (score) => {
        if (score >= 100) return 'A+';
        if (score >= 90) return 'A';
        if (score >= 70) return 'B';
        if (score >= 50) return 'C';
        if (score >= 30) return 'D';
        return 'F';
    };
    const currentGrade = getLetterGrade(this.metrics.academicStanding);

    const gradePanel = document.createElement('div');
    gradePanel.className = 'current-grade';
    gradePanel.innerHTML = `<h3>Current Grade</h3><div class="grade">${currentGrade}</div>`;
    container.appendChild(gradePanel);

    const rulesPanel = document.createElement('div');
    rulesPanel.className = 'rules-display';
    rulesPanel.innerHTML = `
        <h3>The Ethics Game</h3>
        <div class="rules-text">
            <p>Make ethical academic choices to maintain:</p>
            <ul class="rules-list">
                <li>🎓 Academic Standing</li>
                <li>👥 Peer Reputation</li>
                <li>⭐ Personal Integrity</li>
            </ul>
        </div>`;
    container.appendChild(rulesPanel);
  }

  createDialogueBox_(container) {
    const dialogueBox = document.createElement('div');
    dialogueBox.className = 'dialogue-box';
    container.appendChild(dialogueBox);
    return dialogueBox;
  }

  createButton_(text) {
    const button = document.createElement('button');
    button.className = 'choice-btn';
    button.textContent = text;
    return button;
  }

  realignHitboxes_(container, object) {
    this.interactionPlanes_.forEach(plane => plane.parent.remove(plane));
    this.interactionPlanes_ = [];

    setTimeout(() => {
        this.cssScene_.updateMatrixWorld(true);
        this.choiceButtons_.forEach((button, index) => {
            const planeWidth = button.offsetWidth;
            const planeHeight = button.offsetHeight;
            const plane = new THREE.Mesh(
                new THREE.PlaneGeometry(planeWidth, planeHeight), 
                new THREE.MeshBasicMaterial({color: 0x000000, transparent: true, opacity: 0.0, side: THREE.DoubleSide})
            );
            
            const buttonRect = button.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            const x = (buttonRect.left - containerRect.left) + (planeWidth / 2) - (containerRect.width / 2);
            const y = -((buttonRect.top - containerRect.top) + (planeHeight / 2) - (containerRect.height / 2));

            plane.position.set(x, y, 1);
            plane.name = `choice-${index}`;
            object.add(plane);
            this.interactionPlanes_.push(plane);
        });
    }, 200);
  }

  initializeRenderer_() {
    this.threejs_ = new THREE.WebGLRenderer({
      antialias: false,
    });
    this.threejs_.shadowMap.enabled = true;
    this.threejs_.shadowMap.type = THREE.PCFSoftShadowMap;
    this.threejs_.setPixelRatio(window.devicePixelRatio);
    this.threejs_.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.threejs_.domElement);

    this.cssRenderer_ = new CSS3DRenderer();
    this.cssRenderer_.setSize(window.innerWidth, window.innerHeight);
    this.cssRenderer_.domElement.style.position = 'absolute';
    this.cssRenderer_.domElement.style.top = 0;
    document.body.appendChild(this.cssRenderer_.domElement);

    this.camera_ = new THREE.PerspectiveCamera(
        75, window.innerWidth / window.innerHeight, 1.0, 1000);
    this.scene_ = new THREE.Scene();
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
    this.threejs_.setSize(window.innerWidth, window.innerHeight);
    this.cssRenderer_.setSize(window.innerWidth, window.innerHeight);
  }

  raf_() {
    requestAnimationFrame((t) => {
      if (this.previousRAF_ === null) {
        this.previousRAF_ = t;
      }

      this.step_(t, t - this.previousRAF_);
      this.threejs_.render(this.scene_, this.camera_);
      this.cssRenderer_.render(this.cssScene_, this.camera_);
      this.previousRAF_ = t;
      this.raf_();
    });
  }

  step_(time, timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;
    
    if (this.controls_.isLocked) {
        const speed = 200.0 * timeElapsedS;
        if (this.moveForward) this.controls_.moveForward(speed);
        if (this.moveBackward) this.controls_.moveForward(-speed);
        if (this.moveRight) this.controls_.moveRight(speed);
        if (this.moveLeft) this.controls_.moveRight(-speed);
        if (this.moveUp) this.controls_.getObject().position.y += speed;
        if (this.moveDown) this.controls_.getObject().position.y -= speed;
    }

    if (this.mixers) {
      this.mixers.map(m => m.update(timeElapsedS));
    }
    this.updateInteractions_();
  }

  updateInteractions_() {
    if (this.controls_.isLocked) {
      this.raycaster_.setFromCamera(new THREE.Vector2(), this.camera_);
      const intersects = this.raycaster_.intersectObjects(this.interactionPlanes_, true);

      this.choiceButtons_.forEach(button => button.classList.remove('hovered'));

      if (intersects.length > 0) {
          const object = intersects[0].object;
          if (object.name.startsWith('choice-')) {
            const choiceIndex = parseInt(object.name.split('-')[1]);
            if(this.choiceButtons_[choiceIndex]) {
              this.choiceButtons_[choiceIndex].classList.add('hovered');
            }
          }
      }
    }
  }
}

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new FirstPersonCameraDemo();
});
