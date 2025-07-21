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
    this.currentScene = 'classroom';

    this.previousRAF_ = null;
    this.raf_();
    this.onWindowResize_();
  }

  initializeDemo_() {
    this.controls_ = new PointerLockControls(this.camera_, document.body);
    this.scene_.add(this.controls_.getObject());

    this.controls_.addEventListener('lock', () => {
        document.body.classList.add('pointer-lock-mode');
    });

    this.controls_.addEventListener('unlock', () => {
        document.body.classList.remove('pointer-lock-mode');
    });

    this.raycaster_ = new THREE.Raycaster();

    document.addEventListener('click', () => {
      // If we are not in first-person mode, this click is for locking the cursor.
      if (!this.controls_.isLocked) {
        this.controls_.lock();
        return;
      }
    
      // If we are already locked, this click is for an in-game interaction.
      // We perform a raycast from the center of the screen to see what is being looked at.
      this.raycaster_.setFromCamera(new THREE.Vector2(), this.camera_);
      const intersects = this.raycaster_.intersectObjects(this.interactionPlanes_, true);
    
      if (intersects.length > 0) {
        const object = intersects[0].object;
        if (object.name.startsWith('choice-')) {
          const choiceIndex = parseInt(object.name.split('-')[1]);
          if (this.choiceButtons_[choiceIndex]) {
            console.log('--------------------');
            console.log(`[CLICK] Interaction click detected! Current scenario: ${this.currentScenario}`);
            const scenarioData = ScenarioTree[this.currentScenario];
            if (!scenarioData) {
              console.error('No scenario data found for current scenario.');
              return;
            }
    
            // Case 1: The user is clicking on a choice in a main scenario.
            if (!this.currentScenario.includes('_outcome')) {
              console.log('[FLOW] Logic determined: This is a CHOICE click.');
              const choice = scenarioData.choices[choiceIndex];
              if (choice) {
                console.log(`[DATA] Clicked choice text: "${choice.text}"`);
                console.log(`[FLOW] Preparing to show outcome: ${choice.nextId}`);
                if (choice.metrics) {
                  this.metrics.academicStanding += choice.metrics.academicStanding || 0;
                  this.metrics.peerReputation += choice.metrics.peerReputation || 0;
                  this.metrics.integrity += choice.metrics.integrity || 0;
                }
                this.showOutcome_(choice.nextId);
              }
            }
            // Case 2: The user is clicking "Continue..." on an outcome screen.
            else {
              console.log('[FLOW] Logic determined: This is a CONTINUE click.');
              const nextScenarioId = scenarioData.choices[0].nextId;

              if (this.currentScenario.startsWith('exam_malpractice_outcome')) {
                console.log('[FLOW] Special case: exam_malpractice_outcome. Preparing to change scene.');
                this.loadNextScene_();
              } else {
                console.log(`[FLOW] Standard continue. Preparing to display next scenario: ${nextScenarioId}`);
                this.displayScenario_(nextScenarioId);
              }
            }
            console.log('--------------------');
          }
        }
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
    console.log(`%c[ACTION] loadNextScene_() called. Current scenario is: ${this.currentScenario}`, 'color: red; font-weight: bold;');
    this.currentScene = 'bedroom';
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
      
      const nextScenarioId = ScenarioTree[this.currentScenario].choices[0].nextId;
      console.log(`[EVENT] 3D model loaded. Next scenario to display is: ${nextScenarioId}`);
      this.displayScenario_(nextScenarioId);
    });
  }

  displayScenario_(scenarioId) {
    console.log(`%c[UI] displayScenario_() called with: ${scenarioId}`, 'color: blue;');
    if (scenarioId === 'end') {
        console.log('[FLOW] Scenario is "end", calling loadNextScene_().');
        this.loadNextScene_();
        return;
    }
    this.controls_.lock();
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
    console.log(`%c[UI] showOutcome_() called with: ${outcomeId}`, 'color: green;');
    this.currentScenario = outcomeId;
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
    outcomeScenario.choices.forEach((choice, index) => {
        const button = this.createButton_(choice.text);
        choices.appendChild(button);
        this.choiceButtons_.push(button);
    });
    dialogueBox.appendChild(choices);

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
    if(this.currentScene === 'classroom') {
        object.position.set(-71.27, 158.84, 520.03);
    } else {
        object.position.set(-45, 100, -15.83);
    }
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
    button.className = 'choice-btn disabled'; // Start as disabled
    button.textContent = text;
    return button;
  }

  realignHitboxes_(container, object) {
    this.interactionPlanes_.forEach(plane => plane.parent.remove(plane));
    this.interactionPlanes_ = [];

    setTimeout(() => {
        this.cssScene_.updateMatrixWorld(true);
        this.choiceButtons_.forEach((button, index) => {
            button.classList.remove('disabled');

            // --- BRUTE FORCE FIX ---
            // This is the special case for the "Continue" button, which is always alone.
            if (this.choiceButtons_.length === 1) {
              const plane = new THREE.Mesh(
                  new THREE.PlaneGeometry(946, 46), // Use the exact size from the debug logs
                  new THREE.MeshBasicMaterial({color: 0x000000, transparent: true, opacity: 0.0, side: THREE.DoubleSide}) // Make it invisible
              );
              // Manually calculated position to align with the button at the bottom of the dialog.
              plane.position.set(0, -220, 1);
              plane.name = `choice-${index}`;
              object.add(plane);
              this.interactionPlanes_.push(plane);
            } 
            // This is the normal case for the multiple-choice buttons, which we know works.
            else {
              const planeWidth = button.offsetWidth;
              const planeHeight = button.offsetHeight;

              const plane = new THREE.Mesh(
                  new THREE.PlaneGeometry(planeWidth, planeHeight), 
                  new THREE.MeshBasicMaterial({color: 0x000000, transparent: true, opacity: 0.0, side: THREE.DoubleSide})
              );
              
              const buttonRect = button.getBoundingClientRect();
              const containerRect = container.getBoundingClientRect();
              const x = buttonRect.left + (buttonRect.width / 2) - containerRect.left - (containerRect.width / 2);
              const y = -(buttonRect.top + (buttonRect.height / 2) - containerRect.top - (containerRect.height / 2));
              plane.position.set(x, y, 1);

              plane.name = `choice-${index}`;
              object.add(plane);
              this.interactionPlanes_.push(plane);
            }
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
    this.updateInteractions_(time);
  }

  updateInteractions_(time) {
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
