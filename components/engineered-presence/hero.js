// Homepage enhancement, adapted from the approved Engineered Presence V1.1.
// Pinned runtime dependency: Three.js 0.180.0. No production imports from prototypes/.
import { buildLattice } from './lattice.js';
import { createHeroContinuity } from './continuity.js';

export function mountEngineeredPresence() {
  const SETTINGS = Object.freeze({
    entranceSeconds: 1.35,
    cameraFov: 38,
    cameraDistance: 10.9,
    maxDpr: 1.5,
    mobileDpr: 1.25,
    mobileBreakpoint: 768,
    basePitch: .055,
    baseYaw: -.18,
    baseRoll: -.045,
    idleYaw: .065,
    idlePitch: .018,
    cursorYaw: .075,
    cursorPitch: .045,
    dragSensitivity: .003,
    yawLimit: .48,
    pitchLimit: .24,
    damping: 8
  });
  // Optical framing for the static phone composition; desktop settings stay intact.
  const COMPACT_VIEW = Object.freeze({ pitch: .02, yaw: -.04, roll: 0, zoom: .84, x: .10, y: .28 });

  const stage = document.getElementById('hero-scene-stage');
  const space = document.getElementById('hero-scene-space');
  const status = document.getElementById('hero-scene-status');
  const hint = document.getElementById('hero-scene-help');
  const controls = document.getElementById('hero-scene-controls');
  const motionButton = document.getElementById('hero-motion-toggle');
  const resetButton = document.getElementById('hero-reset-view');
  const hero = stage?.closest('.home-hero');
  if (!stage || !space || !status || !hint || !controls || !motionButton || !resetButton || !hero || stage.dataset.presenceMounted === 'true') return;
  stage.dataset.presenceMounted = 'true';
  const query = new URLSearchParams(location.search);
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const pointerPreference = matchMedia('(hover: hover) and (pointer: fine)');
  const events = new AbortController();
  const state = {
    compact: innerWidth < SETTINGS.mobileBreakpoint,
    reduced: preference.matches || query.get('hero-motion') === 'reduce',
    paused: query.get('hero-motion') === 'pause',
    visible: true, disposed: false, ready: false, dragging: false,
    manualYaw: 0, manualPitch: 0, lookYaw: 0, lookPitch: 0,
    yaw: 0, pitch: 0, clock: 0, entrance: 0, frames: 0
  };
  let THREE, renderer, scene, camera, architecture, frame = 0, lastTime = 0;
  let resizeObserver, visibilityObserver;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const listen = (target, name, fn, options = {}) => target.addEventListener(name, fn, { ...options, signal: events.signal });
  const interactive = () => !state.compact && !state.reduced && pointerPreference.matches && state.ready;
  const ambient = () => !state.compact && !state.reduced && !state.paused && pointerPreference.matches;
  const continuity = createHeroContinuity({
    hero,
    getState: () => ({ ready: state.ready && !state.disposed, paused: state.paused, reduced: state.reduced,
      compact: state.compact || !pointerPreference.matches }),
    onProgress: requestRender,
    debug: query.has('hero-debug')
  });

  function diagnostics() {
    return { version: THREE?.REVISION, frames: state.frames, mode: stage.dataset.mode,
      beams: architecture?.beams, ties: architecture?.ties, nodes: architecture?.nodeCount,
      drawCalls: renderer?.info.render.calls, triangles: renderer?.info.render.triangles,
      geometries: renderer?.info.memory.geometries, dpr: renderer?.getPixelRatio(),
      yaw: state.yaw, pitch: state.pitch, manualYaw: state.manualYaw, manualPitch: state.manualPitch,
      lookYaw: state.lookYaw, lookPitch: state.lookPitch,
      entrance: state.entrance, recession: continuity.recession, cameraDepth: architecture?.depthSamples,
      dragging: state.dragging, visible: state.visible, disposed: state.disposed };
  }

  function reviewSnapshot() {
    // Opt-in DOM mirror for browser QA; no per-frame DOM writes in the normal preview.
    if (query.has('hero-debug')) stage.dataset.diagnostics = JSON.stringify(diagnostics());
  }

  function disposeObject(object) {
    const geometries = new Set(), materials = new Set();
    object.traverse((child) => {
      if (child.geometry) geometries.add(child.geometry);
      if (child.material) (Array.isArray(child.material) ? child.material : [child.material]).forEach(m => materials.add(m));
    });
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
  }

  function stopFrame() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  }

  function dispose() {
    if (state.disposed) return;
    state.disposed = true;
    continuity.dispose();
    stopFrame();
    events.abort();
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    if (architecture) disposeObject(architecture.group);
    renderer?.dispose();
    renderer?.domElement.remove();
  }

  function fallback(reason) {
    state.ready = false;
    hero.classList.remove('has-hero-webgl');
    stage.classList.remove('has-webgl', 'is-interactive', 'is-dragging');
    stage.removeAttribute('tabindex');
    stage.removeAttribute('role');
    stage.removeAttribute('aria-label');
    stage.removeAttribute('aria-describedby');
    if (controls.contains(document.activeElement) || stage === document.activeElement) status.focus({ preventScroll: true });
    controls.hidden = true;
    status.textContent = 'Static structure · 3D unavailable';
    hint.textContent = 'The portrait, introduction and links remain available.';
    stage.dataset.mode = 'fallback';
    dispose();
    reviewSnapshot();
    console.info('Engineered Presence: static fallback.', reason.message);
  }


  function updateControls() {
    const enabled = interactive();
    if (!enabled && (controls.contains(document.activeElement) || stage === document.activeElement)) status.focus({ preventScroll: true });
    stage.classList.toggle('is-interactive', enabled);
    controls.hidden = !enabled;
    if (enabled) {
      stage.tabIndex = 0;
      stage.setAttribute('role', 'group');
      stage.setAttribute('aria-label', 'Rotate the engineering lattice');
      stage.setAttribute('aria-describedby', 'hero-scene-help');
    } else {
      stage.removeAttribute('tabindex');stage.removeAttribute('role');
      stage.removeAttribute('aria-label');stage.removeAttribute('aria-describedby');
    }
    motionButton.textContent = state.paused ? 'Resume motion' : 'Pause motion';
    motionButton.setAttribute('aria-pressed', String(state.paused));
    const mode = state.reduced ? 'reduced' : state.compact ? 'compact' : !pointerPreference.matches ? 'touch' : state.paused ? 'paused' : 'interactive';
    stage.dataset.mode = mode;
    status.textContent = state.reduced ? 'Static 3D · reduced motion' : state.compact ? 'Static 3D · mobile composition' : !pointerPreference.matches ? 'Static 3D · touch composition' : state.paused ? '3D structure · motion paused' : 'Interactive 3D structure';
    hint.textContent = enabled ? 'Drag or focus the structure and use arrow keys. Home resets the view.' : 'Static composition. Scroll and explore the portfolio normally.';
    continuity.refresh();
  }

  function requestRender() {
    if (!frame && !state.disposed && state.visible && !document.hidden) frame = requestAnimationFrame(render);
  }

  function render(now) {
    frame = 0;
    if (state.disposed || !state.visible || document.hidden) return;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, .05) : 1 / 60;
    lastTime = now;
    if (ambient()) { state.clock += dt;state.entrance = Math.min(1, state.entrance + dt / SETTINGS.entranceSeconds); }
    else state.entrance = 1;
    const settle = 1 - Math.pow(1 - state.entrance, 3);
    const yawTarget = state.manualYaw + state.lookYaw + (ambient() ? Math.sin(state.clock * .22) * SETTINGS.idleYaw : 0);
    const pitchTarget = state.manualPitch + state.lookPitch + (ambient() ? Math.sin(state.clock * .18) * SETTINGS.idlePitch : 0);
    const amount = state.reduced || state.compact || !pointerPreference.matches ? 1 : 1 - Math.exp(-SETTINGS.damping * dt);
    state.yaw += (yawTarget - state.yaw) * amount;
    state.pitch += (pitchTarget - state.pitch) * amount;
    architecture.group.rotation.set(
      (state.compact ? COMPACT_VIEW.pitch : SETTINGS.basePitch) + state.pitch - (1 - settle) * .045,
      (state.compact ? COMPACT_VIEW.yaw : SETTINGS.baseYaw) + state.yaw - (1 - settle) * .16,
      state.compact ? COMPACT_VIEW.roll : SETTINGS.baseRoll
    );
    // Temporary scroll composition over the approved pose; camera, optical
    // offsets and assembly clock stay independent of the reversible timeline.
    const recession = continuity.recession;
    architecture.group.position.set(state.compact ? COMPACT_VIEW.x : 0, state.compact ? COMPACT_VIEW.y : 0, -1.1 * recession);
    architecture.group.scale.setScalar((.95 + settle * .05) * (1 - .08 * recession));
    architecture.beamMesh.count = Math.max(1, Math.ceil(architecture.beams * settle));
    architecture.nodes.count = Math.max(1, Math.ceil(architecture.nodeCount * clamp((settle - .08) / .92, 0, 1)));
    architecture.tieMesh.geometry.setDrawRange(0, Math.floor(architecture.ties * clamp((settle - .15) / .85, 0, 1)) * 2);
    architecture.steel.opacity = .25 + .67 * settle;
    architecture.tieMaterial.opacity = .42 * settle;
    architecture.updateDepth();
    try {
      renderer.render(scene, camera);
      state.frames++;
      if (!state.ready) { state.ready = true;stage.classList.add('has-webgl');hero.classList.add('has-hero-webgl');updateControls(); }
      if (state.frames === 1 || state.frames % 30 === 0 || !ambient()) reviewSnapshot();
    } catch (error) { fallback(error);return; }
    if (ambient() || Math.abs(yawTarget - state.yaw) + Math.abs(pitchTarget - state.pitch) > .0005) requestRender();
    else lastTime = 0;
  }

  function resize() {
    if (state.disposed) return;
    const compact = innerWidth < SETTINGS.mobileBreakpoint;
    if (!architecture || compact !== state.compact) {
      if (architecture) { scene.remove(architecture.group);disposeObject(architecture.group); }
      state.compact = compact;
      architecture = buildLattice(THREE, compact, camera, SETTINGS);scene.add(architecture.group);
      state.manualYaw = state.manualPitch = state.lookYaw = state.lookPitch = 0;
    }
    const canvasBounds = space.getBoundingClientRect();
    const copyBounds = hero.querySelector('.hero-introduction').getBoundingClientRect();
    // The approved homepage has a narrower column gap than the prototype. Keep
    // every rotated view out of the copy, without moving either column or camera.
    const besideCopy = copyBounds.left >= stage.getBoundingClientRect().right;
    space.style.clipPath = besideCopy ? `inset(0 ${Math.max(0, canvasBounds.right - copyBounds.left + 8)}px 0 0)` : 'none';
    const { width, height } = canvasBounds;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, state.compact ? SETTINGS.mobileDpr : SETTINGS.maxDpr));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.zoom = state.compact ? COMPACT_VIEW.zoom : 1;
    camera.updateProjectionMatrix();
    if (state.ready) updateControls();
    requestRender();
  }

  function resetView() {
    state.manualYaw = state.manualPitch = state.lookYaw = state.lookPitch = 0;
    requestRender();
  }

  async function start() {
    try {
      THREE = await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');
      if (state.disposed) return;
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.setAttribute('aria-hidden', 'true');
      space.append(renderer.domElement);
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(SETTINGS.cameraFov, 1, .1, 40);
      camera.position.set(0, .02, SETTINGS.cameraDistance);camera.lookAt(0, -.03, 0);
      scene.add(new THREE.HemisphereLight('#C2DADD', '#172528', 1.6));
      const key = new THREE.DirectionalLight('#F6F5F1', 3.1);key.position.set(-3, 5, 5);scene.add(key);
      const rim = new THREE.DirectionalLight('#739AA9', 2.2);rim.position.set(4, -1, -3);scene.add(rim);
      listen(renderer.domElement, 'webglcontextlost', event => { event.preventDefault();fallback(new Error('Graphics context lost; reload to retry')); });

      let dragOrigin;
      listen(stage, 'pointerdown', event => {
        if (!interactive() || event.button !== 0 || event.pointerType === 'touch' || event.target.closest('figcaption')) return;
        state.dragging = true;state.lookYaw = state.lookPitch = 0;
        dragOrigin = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: state.manualYaw, pitch: state.manualPitch };
        stage.setPointerCapture(event.pointerId);stage.classList.add('is-dragging');
      });
      listen(stage, 'pointermove', event => {
        if (!interactive() || event.pointerType === 'touch') return;
        if (state.dragging && event.pointerId === dragOrigin.id) {
          state.manualYaw = clamp(dragOrigin.yaw + (event.clientX - dragOrigin.x) * SETTINGS.dragSensitivity, -SETTINGS.yawLimit, SETTINGS.yawLimit);
          state.manualPitch = clamp(dragOrigin.pitch + (event.clientY - dragOrigin.y) * SETTINGS.dragSensitivity, -SETTINGS.pitchLimit, SETTINGS.pitchLimit);
        } else {
          const rect = stage.getBoundingClientRect();
          state.lookYaw = clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1) * SETTINGS.cursorYaw;
          state.lookPitch = clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1) * SETTINGS.cursorPitch;
        }
        requestRender();
      });
      const release = event => {
        if (!state.dragging || event.pointerId !== dragOrigin.id) return;
        state.dragging = false;stage.classList.remove('is-dragging');
        if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
        state.lookYaw = state.lookPitch = 0;requestRender();
      };
      listen(stage, 'pointerup', release);listen(stage, 'pointercancel', release);
      listen(stage, 'lostpointercapture', release);
      listen(stage, 'pointerleave', () => { if (!state.dragging) { state.lookYaw = state.lookPitch = 0;requestRender(); } });
      listen(stage, 'keydown', event => {
        if (!interactive() || event.target !== stage) return;
        const arrows = { ArrowLeft: [-.075, 0], ArrowRight: [.075, 0], ArrowUp: [0, -.055], ArrowDown: [0, .055] };
        if (event.key === 'Home') { event.preventDefault();resetView();return; }
        if (!arrows[event.key]) return;
        event.preventDefault();
        state.manualYaw = clamp(state.manualYaw + arrows[event.key][0], -SETTINGS.yawLimit, SETTINGS.yawLimit);
        state.manualPitch = clamp(state.manualPitch + arrows[event.key][1], -SETTINGS.pitchLimit, SETTINGS.pitchLimit);
        state.lookYaw = state.lookPitch = 0;requestRender();
      });
      listen(motionButton, 'click', () => { state.paused = !state.paused;state.entrance = 1;updateControls();requestRender(); });
      listen(resetButton, 'click', resetView);
      listen(preference, 'change', () => {
        state.reduced = preference.matches || query.get('hero-motion') === 'reduce';
        resetView();updateControls();requestRender();
      });
      listen(pointerPreference, 'change', () => { resetView();updateControls(); });
      listen(document, 'visibilitychange', () => { if (document.hidden) stopFrame();else requestRender();reviewSnapshot(); });
      listen(window, 'pagehide', event => { stopFrame();if (!event.persisted) dispose(); });
      listen(window, 'pageshow', () => requestRender());
      if ('ResizeObserver' in window) { resizeObserver = new ResizeObserver(resize);resizeObserver.observe(space); }
      else listen(window, 'resize', resize, { passive: true });
      if ('IntersectionObserver' in window) {
        visibilityObserver = new IntersectionObserver(([entry]) => { state.visible = entry.isIntersecting;if (state.visible) requestRender();else stopFrame();reviewSnapshot(); }, { threshold: .01 });
        visibilityObserver.observe(stage);
      }
      // Opt-in local QA only; normal homepage visits expose no diagnostic global.
      if (query.has('hero-debug')) Object.defineProperty(window, 'homepagePresence', { configurable: true, value: Object.freeze({
        get diagnostics() { return diagnostics(); }
      }) });
      resize();
    } catch (error) { fallback(error); }
  }

  // Import/renderer failure leaves the approved static homepage intact.
  start();
}

mountEngineeredPresence();
