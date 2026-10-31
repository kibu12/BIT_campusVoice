import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * InteractiveStudent3D (Campus Voice AI Robot Companion)
 * Premium 3D Digital Companion Character:
 * - Ceramic white armor body with sapphire blue trim
 * - Distinct articulated mechanical neck with glowing cyan power core
 * - High-clarity curved visor screen with expressive LED eyes, blush cheeks, and dynamic mouth
 * - Dynamic Procedural State Machine: IDLE, WAVE, THINK, LISTENING, RESPONDING
 * - Ultra-smooth cursor tracking and expressive bodily gestures
 */
const InteractiveStudent3D = ({
  currentState = 'idle',
  isSpeaking = false,
  isListening = false,
  isTyping = false,
  onAnimationComplete = () => {}
}) => {
  const mountRef = useRef(null);
  const stateRef = useRef({
    currentState: 'idle',
    targetState: 'idle',
    time: 0,
    mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },
    isSpeaking: false,
    isListening: false,
    isTyping: false,
  });

  useEffect(() => {
    let resolvedState = currentState;
    if (isListening) resolvedState = 'listening';
    else if (isTyping) resolvedState = 'think';
    else if (isSpeaking) resolvedState = 'responding';

    stateRef.current.targetState = resolvedState;
    stateRef.current.isSpeaking = isSpeaking;
    stateRef.current.isListening = isListening;
    stateRef.current.isTyping = isTyping;
  }, [currentState, isSpeaking, isListening, isTyping]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 360;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.35, 3.8);
    camera.lookAt(0, 0.2, 0);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 3. Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 512;
    keyLight.shadow.mapSize.height = 512;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    const blueFillLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    blueFillLight.position.set(-3.5, 2.5, 3);
    scene.add(blueFillLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 2.0);
    rimLight.position.set(0, 3, -3.5);
    scene.add(rimLight);

    // 4. Materials
    const whiteArmorMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.2,
      metalness: 0.15,
    });

    const blueAccentMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.3,
      metalness: 0.25,
    });

    const darkJointMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.6,
    });

    const visorScreenMat = new THREE.MeshStandardMaterial({
      color: 0x030712,
      roughness: 0.05,
      metalness: 0.95,
    });

    const cyanGlowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
    });

    const cyanGlowBrightMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
    });

    const blushGlowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
    });

    // 5. Robot Root Rig
    const robotRoot = new THREE.Group();
    robotRoot.position.y = -0.2;
    scene.add(robotRoot);

    // Ground Shadow Plate
    const shadowGeo = new THREE.PlaneGeometry(1.6, 1.6);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const shadowCtx = shadowCanvas.getContext('2d');
    const grad = shadowCtx.createRadialGradient(64, 64, 10, 64, 64, 60);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.45)');
    grad.addColorStop(0.5, 'rgba(15, 23, 42, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    shadowCtx.fillStyle = grad;
    shadowCtx.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.65;
    robotRoot.add(shadowMesh);

    // =========================================================================
    // TORSO BODY RIG
    // =========================================================================
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 0.1;
    robotRoot.add(torsoGroup);

    // Main Torso Body (Sleek rounded cylinder capsule)
    const bodyGeo = new THREE.CylinderGeometry(0.34, 0.32, 0.48, 24);
    const bodyMesh = new THREE.Mesh(bodyGeo, whiteArmorMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    torsoGroup.add(bodyMesh);

    // Torso Top Dome
    const bodyTopGeo = new THREE.SphereGeometry(0.34, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const bodyTopMesh = new THREE.Mesh(bodyTopGeo, whiteArmorMat);
    bodyTopMesh.position.y = 0.24;
    bodyTopMesh.castShadow = true;
    torsoGroup.add(bodyTopMesh);

    // Torso Bottom Dome
    const bodyBottomGeo = new THREE.SphereGeometry(0.32, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const bodyBottomMesh = new THREE.Mesh(bodyBottomGeo, whiteArmorMat);
    bodyBottomMesh.position.y = -0.24;
    bodyBottomMesh.castShadow = true;
    torsoGroup.add(bodyBottomMesh);

    // Blue Collar Rim (At top of torso)
    const collarGeo = new THREE.TorusGeometry(0.31, 0.06, 16, 32);
    const collarMesh = new THREE.Mesh(collarGeo, blueAccentMat);
    collarMesh.rotation.x = Math.PI / 2;
    collarMesh.position.y = 0.25;
    collarMesh.castShadow = true;
    torsoGroup.add(collarMesh);

    // =========================================================================
    // DISTINCT ARTICULATED NECK (Solves the head-body merging issue)
    // =========================================================================
    const neckGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.16, 20);
    const neckMesh = new THREE.Mesh(neckGeo, darkJointMat);
    neckMesh.position.y = 0.36;
    neckMesh.castShadow = true;
    torsoGroup.add(neckMesh);

    // Glowing Cyan Power Ring around Neck
    const neckRingGeo = new THREE.TorusGeometry(0.155, 0.015, 12, 24);
    const neckRingMesh = new THREE.Mesh(neckRingGeo, cyanGlowBrightMat);
    neckRingMesh.rotation.x = Math.PI / 2;
    neckRingMesh.position.y = 0.36;
    torsoGroup.add(neckRingMesh);

    // Chest Logo Shield (Campus Voice Badge)
    const shieldGeo = new THREE.CircleGeometry(0.11, 24);
    const shieldMesh = new THREE.Mesh(shieldGeo, blueAccentMat);
    shieldMesh.position.set(0, 0.04, 0.35);
    torsoGroup.add(shieldMesh);

    const shieldInnerGeo = new THREE.CircleGeometry(0.07, 24);
    const shieldInnerMesh = new THREE.Mesh(shieldInnerGeo, cyanGlowBrightMat);
    shieldInnerMesh.position.set(0, 0.04, 0.352);
    torsoGroup.add(shieldInnerMesh);

    // Backpack
    const backpackGeo = new THREE.BoxGeometry(0.38, 0.40, 0.20);
    const backpackMesh = new THREE.Mesh(backpackGeo, blueAccentMat);
    backpackMesh.position.set(0, 0.02, -0.32);
    backpackMesh.castShadow = true;
    torsoGroup.add(backpackMesh);

    // =========================================================================
    // HEAD & VISOR FACE (Elevated clearly above neck)
    // =========================================================================
    const headPivot = new THREE.Group();
    headPivot.position.y = 0.62; // Well above torso for clean articulation
    torsoGroup.add(headPivot);

    const headGroup = new THREE.Group();
    headPivot.add(headGroup);

    // Main Rounded White Helmet
    const helmetGeo = new THREE.SphereGeometry(0.50, 32, 28);
    const helmetMesh = new THREE.Mesh(helmetGeo, whiteArmorMat);
    helmetMesh.scale.set(1.08, 0.98, 0.95);
    helmetMesh.castShadow = true;
    helmetMesh.receiveShadow = true;
    headGroup.add(helmetMesh);

    // Dark Visor Face Shield (Front curved glass screen)
    const visorGeo = new THREE.SphereGeometry(0.47, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.58);
    const visorMesh = new THREE.Mesh(visorGeo, visorScreenMat);
    visorMesh.rotation.x = Math.PI / 2;
    visorMesh.position.set(0, 0.02, 0.12);
    visorMesh.scale.set(0.92, 0.88, 0.88);
    headGroup.add(visorMesh);

    // Visor Outer Blue Bezel Ring
    const visorRingGeo = new THREE.TorusGeometry(0.44, 0.03, 16, 36);
    const visorRingMesh = new THREE.Mesh(visorRingGeo, blueAccentMat);
    visorRingMesh.position.set(0, 0.02, 0.25);
    visorRingMesh.scale.set(0.98, 0.86, 1);
    headGroup.add(visorRingMesh);

    // Glowing Neon Cyan LED Eyes (Expressive Capsule Eyes)
    const eyeGeo = new THREE.CapsuleGeometry(0.065, 0.09, 12, 16);
    
    const leftEyeMesh = new THREE.Mesh(eyeGeo, cyanGlowBrightMat);
    leftEyeMesh.position.set(-0.16, 0.06, 0.46);
    headGroup.add(leftEyeMesh);

    const rightEyeMesh = new THREE.Mesh(eyeGeo, cyanGlowBrightMat);
    rightEyeMesh.position.set(0.16, 0.06, 0.46);
    headGroup.add(rightEyeMesh);

    // LED Blush Cheeks (Under eyes for cute persona)
    const blushGeo = new THREE.CircleGeometry(0.045, 16);
    const leftBlush = new THREE.Mesh(blushGeo, blushGlowMat);
    leftBlush.position.set(-0.23, -0.04, 0.44);
    headGroup.add(leftBlush);

    const rightBlush = new THREE.Mesh(blushGeo, blushGlowMat);
    rightBlush.position.set(0.23, -0.04, 0.44);
    headGroup.add(rightBlush);

    // Glowing Mouth (Curved LED smile arc)
    const mouthCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.09, -0.10, 0.46),
      new THREE.Vector3(0, -0.15, 0.48),
      new THREE.Vector3(0.09, -0.10, 0.46),
    ]);
    const mouthGeo = new THREE.TubeGeometry(mouthCurve, 16, 0.018, 8, false);
    const mouthMesh = new THREE.Mesh(mouthGeo, cyanGlowBrightMat);
    headGroup.add(mouthMesh);

    // Left & Right Headphone Earcups
    const earGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.11, 24);
    
    // Left Earphone
    const leftEar = new THREE.Group();
    leftEar.position.set(-0.54, 0.04, 0);
    leftEar.rotation.z = Math.PI / 2;
    const leftEarCup = new THREE.Mesh(earGeo, whiteArmorMat);
    leftEarCup.castShadow = true;
    leftEar.add(leftEarCup);
    const leftEarRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 12, 24), blueAccentMat);
    leftEarRing.position.y = 0.055;
    leftEarRing.rotation.x = Math.PI / 2;
    leftEar.add(leftEarRing);
    const leftEarGlow = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), cyanGlowMat);
    leftEarGlow.position.y = 0.057;
    leftEarGlow.rotation.x = -Math.PI / 2;
    leftEar.add(leftEarGlow);
    headGroup.add(leftEar);

    // Right Earphone
    const rightEar = new THREE.Group();
    rightEar.position.set(0.54, 0.04, 0);
    rightEar.rotation.z = -Math.PI / 2;
    const rightEarCup = new THREE.Mesh(earGeo, whiteArmorMat);
    rightEarCup.castShadow = true;
    rightEar.add(rightEarCup);
    const rightEarRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 12, 24), blueAccentMat);
    rightEarRing.position.y = 0.055;
    rightEarRing.rotation.x = Math.PI / 2;
    rightEar.add(rightEarRing);
    const rightEarGlow = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), cyanGlowMat);
    rightEarGlow.position.y = 0.057;
    rightEarGlow.rotation.x = -Math.PI / 2;
    rightEar.add(rightEarGlow);
    headGroup.add(rightEar);

    // Feather / Leaf Antenna on Right Headphone
    const antennaGroup = new THREE.Group();
    antennaGroup.position.set(0.52, 0.25, 0);
    antennaGroup.rotation.z = -0.32;
    
    const leafGeo = new THREE.ConeGeometry(0.08, 0.26, 16);
    leafGeo.scale(1, 1, 0.35);
    const leafMesh = new THREE.Mesh(leafGeo, cyanGlowBrightMat);
    leafMesh.position.y = 0.13;
    antennaGroup.add(leafMesh);
    headGroup.add(antennaGroup);

    // =========================================================================
    // ARMS & HANDS RIG
    // =========================================================================
    const shoulderJointGeo = new THREE.SphereGeometry(0.10, 16, 16);
    const armGeo = new THREE.CapsuleGeometry(0.075, 0.26, 12, 16);
    const handGeo = new THREE.SphereGeometry(0.10, 16, 16);
    handGeo.scale(1, 1.1, 0.7);

    // Left Arm Rig
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.42, 0.18, 0);
    torsoGroup.add(leftArmPivot);

    const leftShoulderMesh = new THREE.Mesh(shoulderJointGeo, blueAccentMat);
    leftArmPivot.add(leftShoulderMesh);

    const leftArmMesh = new THREE.Mesh(armGeo, whiteArmorMat);
    leftArmMesh.position.y = -0.18;
    leftArmMesh.castShadow = true;
    leftArmPivot.add(leftArmMesh);

    const leftHandMesh = new THREE.Mesh(handGeo, whiteArmorMat);
    leftHandMesh.position.y = -0.38;
    leftHandMesh.castShadow = true;
    leftArmPivot.add(leftHandMesh);

    // Right Arm Rig
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.42, 0.18, 0);
    torsoGroup.add(rightArmPivot);

    const rightShoulderMesh = new THREE.Mesh(shoulderJointGeo, blueAccentMat);
    rightArmPivot.add(rightShoulderMesh);

    const rightArmMesh = new THREE.Mesh(armGeo, whiteArmorMat);
    rightArmMesh.position.y = -0.18;
    rightArmMesh.castShadow = true;
    rightArmPivot.add(rightArmMesh);

    const rightHandMesh = new THREE.Mesh(handGeo, whiteArmorMat);
    rightHandMesh.position.y = -0.38;
    rightHandMesh.castShadow = true;
    rightArmPivot.add(rightHandMesh);

    // =========================================================================
    // LEGS & SNEAKERS RIG
    // =========================================================================
    const legGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.28, 16);
    const kneeGeo = new THREE.SphereGeometry(0.10, 16, 16);
    const shoeGeo = new THREE.BoxGeometry(0.18, 0.12, 0.30);
    const shoeSoleGeo = new THREE.BoxGeometry(0.20, 0.04, 0.32);

    // Left Leg
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.18, -0.22, 0);
    torsoGroup.add(leftLegGroup);

    const leftLegMesh = new THREE.Mesh(legGeo, whiteArmorMat);
    leftLegMesh.position.y = -0.14;
    leftLegMesh.castShadow = true;
    leftLegGroup.add(leftLegMesh);

    const leftKneeMesh = new THREE.Mesh(kneeGeo, blueAccentMat);
    leftKneeMesh.position.y = -0.13;
    leftLegGroup.add(leftKneeMesh);

    const leftShoeMesh = new THREE.Mesh(shoeGeo, whiteArmorMat);
    leftShoeMesh.position.set(0, -0.32, 0.05);
    leftShoeMesh.castShadow = true;
    leftLegGroup.add(leftShoeMesh);

    const leftSoleMesh = new THREE.Mesh(shoeSoleGeo, blueAccentMat);
    leftSoleMesh.position.set(0, -0.38, 0.05);
    leftLegGroup.add(leftSoleMesh);

    // Right Leg
    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.18, -0.22, 0);
    torsoGroup.add(rightLegGroup);

    const rightLegMesh = new THREE.Mesh(legGeo, whiteArmorMat);
    rightLegMesh.position.y = -0.14;
    rightLegMesh.castShadow = true;
    rightLegGroup.add(rightLegMesh);

    const rightKneeMesh = new THREE.Mesh(kneeGeo, blueAccentMat);
    rightKneeMesh.position.y = -0.13;
    rightLegGroup.add(rightKneeMesh);

    const rightShoeMesh = new THREE.Mesh(shoeGeo, whiteArmorMat);
    rightShoeMesh.position.set(0, -0.32, 0.05);
    rightShoeMesh.castShadow = true;
    rightLegGroup.add(rightShoeMesh);

    const rightSoleMesh = new THREE.Mesh(shoeSoleGeo, blueAccentMat);
    rightSoleMesh.position.set(0, -0.38, 0.05);
    rightLegGroup.add(rightSoleMesh);

    // =========================================================================
    // MOUSE CURSOR INTERACTION
    // =========================================================================
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / height) * 2 - 1);
      stateRef.current.mouse.targetX = THREE.MathUtils.clamp(x * 0.55, -0.55, 0.55);
      stateRef.current.mouse.targetY = THREE.MathUtils.clamp(y * 0.4, -0.4, 0.4);
    };

    window.addEventListener('mousemove', handleMouseMove);

    // =========================================================================
    // 60FPS PROCEDURAL ANIMATION ENGINE
    // =========================================================================
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      const s = stateRef.current;

      // Smooth mouse cursor tracking
      s.mouse.x += (s.mouse.targetX - s.mouse.x) * 0.09;
      s.mouse.y += (s.mouse.targetY - s.mouse.y) * 0.09;

      // Natural Breathing & Floating Elevation
      const breathe = Math.sin(time * 2.4) * 0.04;
      const sway = Math.sin(time * 1.5) * 0.02;
      robotRoot.position.y = -0.15 + breathe;
      robotRoot.rotation.z = THREE.MathUtils.lerp(robotRoot.rotation.z, sway, 0.08);
      shadowMesh.scale.set(1 + breathe * 2, 1 + breathe * 2, 1);

      // Antenna Flutter
      antennaGroup.rotation.z = -0.32 + Math.sin(time * 3.8) * 0.1;

      // Leg dangling in air
      leftLegGroup.rotation.x = THREE.MathUtils.lerp(leftLegGroup.rotation.x, 0.15 + Math.sin(time * 2.4) * 0.08, 0.08);
      rightLegGroup.rotation.x = THREE.MathUtils.lerp(rightLegGroup.rotation.x, 0.12 - Math.sin(time * 2.4) * 0.08, 0.08);

      // Animation State Machine
      const st = s.targetState;

      if (st === 'listening') {
        // LISTENING: Curious tilt, lean forward, attentive perked ears & bright eyes
        headPivot.rotation.y = THREE.MathUtils.lerp(headPivot.rotation.y, s.mouse.x * 0.9 + 0.18, 0.12);
        headPivot.rotation.x = THREE.MathUtils.lerp(headPivot.rotation.x, -s.mouse.y * 0.6 + 0.15, 0.12);
        headPivot.rotation.z = THREE.MathUtils.lerp(headPivot.rotation.z, 0.14, 0.12);

        // Arms forward attentively
        leftArmPivot.rotation.z = THREE.MathUtils.lerp(leftArmPivot.rotation.z, 0.35, 0.12);
        rightArmPivot.rotation.z = THREE.MathUtils.lerp(rightArmPivot.rotation.z, -0.35, 0.12);
        leftArmPivot.rotation.x = THREE.MathUtils.lerp(leftArmPivot.rotation.x, 0.45, 0.12);
        rightArmPivot.rotation.x = THREE.MathUtils.lerp(rightArmPivot.rotation.x, 0.45, 0.12);

        // Attentive wide eyes
        leftEyeMesh.scale.set(1.15, 1.25, 1);
        rightEyeMesh.scale.set(1.15, 1.25, 1);
        mouthMesh.scale.set(0.8, 0.6, 0.8);

      } else if (st === 'think') {
        // THINKING: Hand to chin, head tilted upward in thought
        headPivot.rotation.y = THREE.MathUtils.lerp(headPivot.rotation.y, 0.28, 0.1);
        headPivot.rotation.x = THREE.MathUtils.lerp(headPivot.rotation.x, -0.28, 0.1);
        headPivot.rotation.z = THREE.MathUtils.lerp(headPivot.rotation.z, -0.18, 0.1);

        // Right arm touches chin
        rightArmPivot.rotation.x = THREE.MathUtils.lerp(rightArmPivot.rotation.x, 1.95, 0.12);
        rightArmPivot.rotation.z = THREE.MathUtils.lerp(rightArmPivot.rotation.z, -0.9, 0.12);
        rightArmPivot.rotation.y = THREE.MathUtils.lerp(rightArmPivot.rotation.y, 0.7, 0.12);

        // Left arm tucked
        leftArmPivot.rotation.z = THREE.MathUtils.lerp(leftArmPivot.rotation.z, 0.38, 0.1);
        leftArmPivot.rotation.x = THREE.MathUtils.lerp(leftArmPivot.rotation.x, 0.3, 0.1);

        leftEyeMesh.scale.set(1.2, 0.7, 1);
        rightEyeMesh.scale.set(1.2, 0.7, 1);
        mouthMesh.scale.set(0.6, 0.5, 0.6);

      } else if (st === 'responding') {
        // RESPONDING / SPEAKING: Lively interactive hand gestures & rhythmic head nodding
        const talkWave = Math.sin(time * 8.5);
        const talkBob = Math.sin(time * 5.0) * 0.1;

        headPivot.rotation.y = THREE.MathUtils.lerp(headPivot.rotation.y, s.mouse.x * 0.95 + talkBob * 0.8, 0.16);
        headPivot.rotation.x = THREE.MathUtils.lerp(headPivot.rotation.x, -s.mouse.y * 0.7 + talkBob, 0.16);
        headPivot.rotation.z = THREE.MathUtils.lerp(headPivot.rotation.z, talkBob * 0.4, 0.16);

        // Expressive right arm presenting/gesturing
        rightArmPivot.rotation.x = THREE.MathUtils.lerp(rightArmPivot.rotation.x, 0.85 + talkWave * 0.3, 0.18);
        rightArmPivot.rotation.z = THREE.MathUtils.lerp(rightArmPivot.rotation.z, -0.55 - talkWave * 0.15, 0.18);
        rightArmPivot.rotation.y = THREE.MathUtils.lerp(rightArmPivot.rotation.y, 0.3 + talkWave * 0.1, 0.18);
        
        // Expressive left arm gesturing in rhythm
        leftArmPivot.rotation.x = THREE.MathUtils.lerp(leftArmPivot.rotation.x, 0.55 - talkWave * 0.25, 0.18);
        leftArmPivot.rotation.z = THREE.MathUtils.lerp(leftArmPivot.rotation.z, 0.42, 0.18);

        // Dynamic talking mouth and eyes
        mouthMesh.scale.set(1.1 + talkWave * 0.35, 1.2 + talkWave * 0.5, 1);
        leftEyeMesh.scale.set(1, 1 + talkWave * 0.18, 1);
        rightEyeMesh.scale.set(1, 1 + talkWave * 0.18, 1);

      } else if (st === 'wave') {
        // WAVING GREETING
        const waveAngle = Math.sin(time * 9.5) * 0.5;
        headPivot.rotation.y = THREE.MathUtils.lerp(headPivot.rotation.y, s.mouse.x * 0.85 - 0.15, 0.12);
        headPivot.rotation.x = THREE.MathUtils.lerp(headPivot.rotation.x, -s.mouse.y * 0.6, 0.12);
        headPivot.rotation.z = THREE.MathUtils.lerp(headPivot.rotation.z, 0.12, 0.12);

        rightArmPivot.rotation.x = THREE.MathUtils.lerp(rightArmPivot.rotation.x, 2.5, 0.15);
        rightArmPivot.rotation.z = THREE.MathUtils.lerp(rightArmPivot.rotation.z, -0.65 + waveAngle, 0.2);
        rightArmPivot.rotation.y = THREE.MathUtils.lerp(rightArmPivot.rotation.y, 0.25, 0.15);

        leftArmPivot.rotation.z = THREE.MathUtils.lerp(leftArmPivot.rotation.z, 0.28, 0.1);
        leftArmPivot.rotation.x = THREE.MathUtils.lerp(leftArmPivot.rotation.x, 0.1, 0.1);

        leftEyeMesh.scale.set(1.1, 1.1, 1);
        rightEyeMesh.scale.set(1.1, 1.1, 1);
        mouthMesh.scale.set(1.2, 1.1, 1);

      } else {
        // IDLE: Natural breathing, head tracking mouse with cute tilts, subtle blinking
        headPivot.rotation.y = THREE.MathUtils.lerp(headPivot.rotation.y, s.mouse.x * 0.9, 0.08);
        headPivot.rotation.x = THREE.MathUtils.lerp(headPivot.rotation.x, -s.mouse.y * 0.7, 0.08);
        headPivot.rotation.z = THREE.MathUtils.lerp(headPivot.rotation.z, s.mouse.x * 0.15, 0.08);

        const idleArmSway = Math.sin(time * 2.2) * 0.06;
        leftArmPivot.rotation.z = THREE.MathUtils.lerp(leftArmPivot.rotation.z, 0.25 + idleArmSway, 0.08);
        rightArmPivot.rotation.z = THREE.MathUtils.lerp(rightArmPivot.rotation.z, -0.25 - idleArmSway, 0.08);
        leftArmPivot.rotation.x = THREE.MathUtils.lerp(leftArmPivot.rotation.x, 0.1, 0.08);
        rightArmPivot.rotation.x = THREE.MathUtils.lerp(rightArmPivot.rotation.x, 0.1, 0.08);

        // Blinking cycle every ~3.5s
        const blinkPhase = (time * 0.55) % 2;
        const isBlinking = blinkPhase < 0.08;
        const eyeHeight = isBlinking ? 0.08 : 1.0;
        leftEyeMesh.scale.set(1, THREE.MathUtils.lerp(leftEyeMesh.scale.y, eyeHeight, 0.3), 1);
        rightEyeMesh.scale.set(1, THREE.MathUtils.lerp(rightEyeMesh.scale.y, eyeHeight, 0.3), 1);
        mouthMesh.scale.set(1, 1, 1);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className="w-full h-full min-h-[280px] sm:min-h-[340px] flex items-center justify-center select-none pointer-events-auto"
      style={{ touchAction: 'none' }}
    />
  );
};

export default InteractiveStudent3D;
