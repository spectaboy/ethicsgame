import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { ScenarioTree } from './scenarios.js';
import { sendGameDataToMindStudio } from './js/analysis.js';

class FirstPersonCameraDemo {
  constructor() {
    this.initialize_();
    this.currentScenario = 'exam_malpractice';
    this.startTime = Date.now();
    this.decisionStartTime = null;
    this.analysis_ = null; 
    this.analysisSidebarEl_ = null;
    this.analysisHitboxes_ = []; 

    this.metrics = {
      decisions: [],
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
    const menu = document.getElementById('menu');
    const menuContent = document.getElementById('menu-content');

    this.controls_ = new PointerLockControls(this.camera_, document.body);
    this.scene_.add(this.controls_.getObject()); // This line is critical and must be restored.

    this.controls_.addEventListener('lock', () => {
        menu.style.display = 'none';
        document.body.classList.add('pointer-lock-mode'); // Restore this for the crosshair
    });

    this.controls_.addEventListener('unlock', () => {
        menuContent.innerHTML = '<h1>Paused</h1><p>Click to Resume</p>';
        menu.style.display = 'flex';
        document.body.classList.remove('pointer-lock-mode'); // Restore this for the crosshair
    });
    
    menu.addEventListener('click', () => {
      this.controls_.lock();
    });

    this.raycaster_ = new THREE.Raycaster();

    document.addEventListener('click', () => {
      if (!this.controls_.isLocked) {
        this.controls_.lock();
        return;
      }

      this.raycaster_.setFromCamera(new THREE.Vector2(), this.camera_);
      
      const targets = this.hitboxGroup_.children;
      const intersects = this.raycaster_.intersectObjects(targets, true);

      if (intersects.length > 0) {
        const object = intersects[0].object;
        if (object.name.startsWith('choice-')) {
          const choiceIndex = parseInt(object.name.split('-')[1]);
          if (this.choiceButtons_[choiceIndex]) {
            const timeSpent = Date.now() - this.decisionStartTime;
            const scenario = ScenarioTree[this.currentScenario];
            const choice = scenario.choices[choiceIndex];

            const isContinueChoice = choice.text.toLowerCase().includes('continue');

            if (!isContinueChoice) {
              const metricsBefore = {
                academicStanding: this.metrics.academicStanding,
                peerReputation: this.metrics.peerReputation,
                integrity: this.metrics.integrity
              };
              
              if (choice.metrics) {
                this.metrics.academicStanding += choice.metrics.academicStanding || 0;
                this.metrics.peerReputation += choice.metrics.peerReputation || 0;
                this.metrics.integrity += choice.metrics.integrity || 0;
              }

              this.metrics.decisions.push({
                scenarioId: this.currentScenario,
                title: scenario.situation.substring(0, 30) + '...', // Use a snippet as title
                choice: choice.text,
                timeTaken: Math.round(timeSpent / 1000),
                context: {
                  academicStandingBefore: metricsBefore.academicStanding,
                  academicStandingAfter: this.metrics.academicStanding,
                  peerReputationBefore: metricsBefore.peerReputation,
                  peerReputationAfter: this.metrics.peerReputation,
                  integrityBefore: metricsBefore.integrity,
                  integrityAfter: this.metrics.integrity
                },
                outcome: "Choice made.",
                notes: "Player made a decision."
              });
            }

            if (choice.nextId === 'end') {
              this.endGame_();
            } else {
              this.showOutcome_(choice.nextId);
            }
          }
        } else if (object.name.startsWith('analysis-')) {
          if (!this.analysis_) return;
          const scenarioIndex = object.name.split('-')[1];
          const container = document.querySelector('.analysis-scene');
          if (!container) return;
          
          const buttons = container.querySelectorAll('.scenario-btn');
          buttons.forEach(btn => btn.classList.remove('active'));
          
          const clickedButton = container.querySelector(`[data-scenario="${scenarioIndex}"]`);
          if (clickedButton) clickedButton.classList.add('active');
      
          const insightsDisplay = container.querySelector('#insights-display');
          if (!insightsDisplay) return;
      
          const overallInsight = this.analysis_.result.response.overallInsight || 'No overall insights available.';
          
          if (scenarioIndex === 'overall') {
            insightsDisplay.innerHTML = `
              <h2>Your Journey Analysis</h2>
              <div class="insights-text">${overallInsight}</div>
            `;
          } else {
            const scenarioInsightData = this.analysis_.result.response.scenarioInsights[scenarioIndex];
            const scenarioTitle = this.metrics.decisions[scenarioIndex]?.title || 'Scenario Analysis';
            const insightText = scenarioInsightData?.insight || 'No specific insights available for this scenario.';
            insightsDisplay.innerHTML = `
              <h2>${scenarioTitle}</h2>
              <div class="insights-text">${insightText}</div>
            `;
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
        case 'KeyP':
          const pos = this.camera_.position;
          console.log(`position ${pos.x.toFixed(2)} ${pos.y.toFixed(2)} ${pos.z.toFixed(2)}`);
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
    this.hitboxGroup_ = new THREE.Group();
    this.scene_.add(this.hitboxGroup_);
  }

  initializeScene_() {
    const loader = new GLTFLoader();
    loader.load('/resources/classroom/scene.gltf', (gltf) => {
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
    fbxLoader.load('/resources/isometric-bedroom (1)/source/cameretta.fbx', (fbx) => {
      this.scene_.add(fbx);

      // Set the camera position for the bedroom scene
      this.camera_.position.set(-32.11, 62.32, -27.35);
      
      const nextScenarioId = ScenarioTree[this.currentScenario].choices[0].nextId;
      this.displayScenario_(nextScenarioId);
    });
  }

  displayScenario_(scenarioId) {
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
    this.decisionStartTime = Date.now(); // Start decision timer
  }

  showOutcome_(outcomeId) {
    if (outcomeId === 'end') {
        this.endGame_();
        return;
    }
    
    this.controls_.lock();
    this.currentScenario = outcomeId;
    const outcomeScenario = ScenarioTree[outcomeId];
    if (!outcomeScenario) {
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

  async endGame_() {
    this.controls_.unlock();
    this.clearUI_();
    
    const totalDecisions = this.metrics.decisions.length;
    const totalTimeOnDecisions = this.metrics.decisions.reduce((sum, d) => sum + d.timeTaken, 0);
    const averageTimePerDecision = totalDecisions > 0 ? (totalTimeOnDecisions / totalDecisions).toFixed(1) : 0;

    const gameData = {
      sessionId: this.sessionId,
      totalPlayTime: Math.round((Date.now() - this.startTime) / 1000),
      scenarios: this.metrics.decisions,
      overallStats: {
        averageTimePerDecision: parseFloat(averageTimePerDecision),
        academicStanding: this.metrics.academicStanding,
        peerReputation: this.metrics.peerReputation,
        integrity: this.metrics.integrity
      }
    };

    try {
      this.clearUI_();
      
      const { container, object } = this.createUIContainer_();
      
      // Display a temporary loading message inside our 3D UI while the API call is in flight.
      container.innerHTML = `<div class="end-screen"><h2>Analyzing your journey...</h2></div>`;

      this.analysis_ = await sendGameDataToMindStudio(gameData);
      
      const sidebarButtons = gameData.scenarios.map((decision, index) => {
        let cleanTitle = decision.title || `Scenario ${index + 1}`;
        cleanTitle = cleanTitle.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
        return `<button class="scenario-btn" data-scenario="${index}">${cleanTitle}</button>`;
      }).join('');

      container.innerHTML = `
        <div class="analysis-scene">
          <div class="analysis-sidebar">
            <button class="scenario-btn overall-btn active" data-scenario="overall">OVERALL RESULTS</button>
            ${sidebarButtons}
            <button class="scenario-btn play-again" onclick="window.location.reload()">Play Again</button>
          </div>
          <div class="analysis-content">
            <div class="final-metrics-panel">
              <h2>Final Scores</h2>
              <div class="metrics-display">
                <p>🎓 Academic Standing: ${gameData.overallStats.academicStanding}</p>
                <p>👥 Peer Reputation: ${gameData.overallStats.peerReputation}</p>
                <p>⭐ Integrity: ${gameData.overallStats.integrity}</p>
              </div>
            </div>
            <div id="insights-display">
              <h2>Your Journey Analysis</h2>
              <div class="insights-text">
                ${this.analysis_.result.response.overallInsight || 'No overall insights available.'}
              </div>
            </div>
          </div>
        </div>
      `;
      
      this.realignAnalysisHitboxes_(container, object);

    } catch (error) {
      console.error("Error during endGame analysis display:", error);
      this.clearUI_();
      const { container } = this.createUIContainer_();
      container.innerHTML = `
        <div class="end-screen">
          <h2>Error</h2>
          <p>Could not retrieve analysis. Please try again later.</p>
          <button id="restart-btn" class="choice-btn" onclick="window.location.reload()">Play Again</button>
        </div>
      `;
    }
  }

  clearUI_() {
    this.cssScene_.children.forEach(c => this.cssScene_.remove(c));
    this.choiceButtons_ = [];
    this.hitboxGroup_.clear();
  }
  
  createUIContainer_() {
    const container = document.createElement('div');
    container.className = 'scene';
    const object = new CSS3DObject(container);

    if (this.currentScene === 'classroom') {
      object.position.set(-71.27, 158.84, 520.03);
      object.lookAt(this.camera_.position);
      // Sync the hitbox container to the UI's transform
      this.hitboxGroup_.position.copy(object.position);
      this.hitboxGroup_.quaternion.copy(object.quaternion);
    } else { // This will now apply to bedroom
      container.classList.add('bedroom-scene');
      object.position.set(-65.31, 345.56, -28.84);
      object.lookAt(this.camera_.position);
      // Sync the bedroom's mirror container to the UI's transform
      this.hitboxGroup_.position.copy(object.position);
      this.hitboxGroup_.quaternion.copy(object.quaternion);
    }

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

    const getGradeColor = (grade) => {
      switch (grade) {
        case 'A+':
        case 'A':
          return '#4CAF50'; // Green
        case 'B':
          return '#8BC34A'; // Light Green
        case 'C':
          return '#FFC107'; // Orange
        case 'D':
          return '#FF5722'; // Deep Orange
        case 'F':
          return '#F44336'; // Red
        default:
          return '#607D8B'; // Grey for fallback
      }
    };

    const currentGrade = getLetterGrade(this.metrics.academicStanding);
    const gradeColor = getGradeColor(currentGrade);

    const gradePanel = document.createElement('div');
    gradePanel.className = 'current-grade';
    gradePanel.innerHTML = `<h3>Current Grade</h3><div class="grade" style="background-color: ${gradeColor}; color: #FFFFFF;">${currentGrade}</div>`;
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
    this.hitboxGroup_.clear();

    setTimeout(() => {
        // This sync is still required to place the hitbox group correctly.
        this.hitboxGroup_.position.copy(object.position);
        this.hitboxGroup_.quaternion.copy(object.quaternion);

        const buttons = this.choiceButtons_;
        const numButtons = buttons.length;
        const planeMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide }); // BRIGHT PINK

        buttons.forEach((button, index) => {
            button.classList.remove('disabled');
            let plane;

            // BRUTE FORCE LOGIC based on number of buttons
            if (numButtons === 1) {
                // Assumed to be "Continue..." or a single final choice.
                plane = new THREE.Mesh(new THREE.PlaneGeometry(950, 70), planeMat);
                plane.position.set(0, -245, 1); 
            } else if (numButtons === 2) {
                // Standard two-choice layout
                const planeGeo = new THREE.PlaneGeometry(460, 70);
                plane = new THREE.Mesh(planeGeo, planeMat);
                const xPos = (index === 0) ? -245 : 245;
                plane.position.set(xPos, -210, 1);
            } else if (numButtons === 3) {
                 // The layout for the first scenario
                if (index < 2) { // The top two buttons
                    const planeGeo = new THREE.PlaneGeometry(460, 70);
                    plane = new THREE.Mesh(planeGeo, planeMat);
                    const xPos = (index === 0) ? -245 : 245;
                    plane.position.set(xPos, -180, 1);
                } else { // The bottom, full-width button
                    plane = new THREE.Mesh(new THREE.PlaneGeometry(950, 70), planeMat);
                    plane.position.set(0, -265, 1);
                }
            } else {
                 // Fallback for any other number of buttons. It will just stack them.
                const planeGeo = new THREE.PlaneGeometry(950, 70);
                plane = new THREE.Mesh(planeGeo, planeMat);
                plane.position.set(0, -180 - (index * 85), 1);
            }
            
            if (plane) {
                plane.name = `choice-${index}`;
                this.hitboxGroup_.add(plane);
            }
        });
    }, 500);
  }

  realignAnalysisHitboxes_(container, object) {
    this.hitboxGroup_.clear();
    this.analysisHitboxes_ = [];
    this.analysisSidebarEl_ = container.querySelector('.analysis-sidebar');

    setTimeout(() => {
        this.hitboxGroup_.position.copy(object.position);
        this.hitboxGroup_.quaternion.copy(object.quaternion);
        
        const buttons = this.analysisSidebarEl_.querySelectorAll('.scenario-btn:not(.play-again)');
        const planeMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide });

        buttons.forEach(button => {
            const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), planeMat); // Start with size 1, will be updated
            plane.name = `analysis-${button.dataset.scenario}`;
            this.hitboxGroup_.add(plane);
            this.analysisHitboxes_.push({ plane, button });
        });
        
        const scrollPlaneMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
        const sidebarRect = this.analysisSidebarEl_.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const scrollHitboxWidth = sidebarRect.width;
        const x_center_sidebar = (sidebarRect.left + sidebarRect.width/2) - (containerRect.left + containerRect.width/2);

        const topScrollPlane = new THREE.Mesh(new THREE.PlaneGeometry(scrollHitboxWidth, 50), scrollPlaneMat);
        topScrollPlane.position.set(x_center_sidebar, (containerRect.height / 2) - 25, 2);
        topScrollPlane.name = 'scroll-up';
        this.hitboxGroup_.add(topScrollPlane);

        const bottomScrollPlane = new THREE.Mesh(new THREE.PlaneGeometry(scrollHitboxWidth, 50), scrollPlaneMat);
        bottomScrollPlane.position.set(x_center_sidebar, (-containerRect.height / 2) + 25, 2);
        bottomScrollPlane.name = 'scroll-down';
        this.hitboxGroup_.add(bottomScrollPlane);

        this.updateAnalysisHitboxPositions_(); // Initial alignment
    }, 500);
  }

  updateAnalysisHitboxPositions_() {
    if (!this.analysisSidebarEl_ || this.analysisHitboxes_.length === 0) return;
    
    const container = this.analysisSidebarEl_.parentElement; // This is the main .analysis-scene div
    const scrollOffset = this.analysisSidebarEl_.scrollTop;

    this.analysisHitboxes_.forEach(item => {
      const { plane, button } = item;

      // Use offset properties which are stable and not affected by CSS 3D transforms.
      const hitboxWidth = button.offsetWidth;
      const hitboxHeight = button.offsetHeight;
      
      // Position relative to the container's top-left corner
      const x_in_container = button.offsetLeft + (hitboxWidth / 2);
      const y_in_container = button.offsetTop - scrollOffset + (hitboxHeight / 2);
      
      // Now, convert this to be relative to the container's center (which is the origin of the hitboxGroup)
      const x = x_in_container - (container.offsetWidth / 2);
      const y = -(y_in_container - (container.offsetHeight / 2));
      
      plane.scale.set(hitboxWidth, hitboxHeight, 1);
      plane.position.set(x, y, 2); // Use z=2 to ensure it's in front of scroll hitboxes

      // Visibility check based on scroll position
      const sidebarTop = this.analysisSidebarEl_.scrollTop;
      const sidebarBottom = sidebarTop + this.analysisSidebarEl_.offsetHeight;
      const buttonTop = button.offsetTop;
      const buttonBottom = buttonTop + button.offsetHeight;
      
      if (buttonBottom < sidebarTop || buttonTop > sidebarBottom) {
        plane.visible = false;
      } else {
        plane.visible = true;
      }
    });
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
    this.updateAnalysisHitboxPositions_();
  }

  updateInteractions_(time) {
    if (this.controls_.isLocked) {
      this.raycaster_.setFromCamera(new THREE.Vector2(), this.camera_);
      
      const targets = this.hitboxGroup_.children;
      const intersects = this.raycaster_.intersectObjects(targets, true);

      // --- Handle continuous scroll on hover ---
      const isHoveringScrollUp = intersects.some(intersect => intersect.object.name === 'scroll-up');
      const isHoveringScrollDown = intersects.some(intersect => intersect.object.name === 'scroll-down');
      if (this.analysisSidebarEl_) {
        if (isHoveringScrollUp) {
          this.analysisSidebarEl_.scrollTop -= 5;
        } else if (isHoveringScrollDown) {
          this.analysisSidebarEl_.scrollTop += 5;
        }
      }
      // --- End scroll logic ---

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
