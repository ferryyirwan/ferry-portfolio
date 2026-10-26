// Approved V1.1 geometry, extracted without topology/material/camera-depth changes.
export function buildLattice(THREE, compact, camera, SETTINGS) {
  const group = new THREE.Group();
  // A cut crown, long right shoulder and offset foot define the asymmetric frame.
  // Two coherent eight-corner rings leave the portrait void open; no cross-body ties.
  const outline = [
    [-2.28, 1.78], [-1.14, 2.98], [1.16, 2.58], [2.42, .93],
    [2.02, -1.88], [.34, -2.93], [-1.88, -2.36], [-2.56, -.28]
  ];
  const points = [];
  for (let layer = 0; layer < 2; layer++) {
    outline.forEach(([x, y], i) => points.push(new THREE.Vector3(
      x * (1 - layer * .075) - layer * .24,
      y * (1 - layer * .055) + layer * .14,
      .82 - layer * 1.76 + Math.sin(i * 1.7 + layer) * .10
    )));
  }
  // The primary rim is physically heavier. Depth brightness is calculated later,
  // in camera space, independently of which ring an edge originally belonged to.
  const beams = [], ties = [];
  for (let layer = 0; layer < 2; layer++) {
    for (let i = 0; i < 8; i++) beams.push({ a: layer * 8 + i, b: layer * 8 + (i + 1) % 8, radius: layer ? .010 : .019, weight: layer ? .83 : 1 });
  }
  const struts = compact ? [0, 2, 4, 7] : [0, 1, 2, 3, 4, 5, 6, 7];
  struts.forEach(i => beams.push({ a: i, b: 8 + i, radius: .008, weight: .72 }));
  // Sparse triangulation of adjacent crown/shoulder bays only; the foot stays clear.
  (compact ? [0, 2, 7] : [0, 1, 2, 3, 7]).forEach(i => ties.push([i, 8 + (i + 1) % 8]));
  const steel = new THREE.MeshStandardMaterial({ color: '#FFFFFF', metalness: .50, roughness: .46, transparent: true, opacity: .92 });
  const beamMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6, 1), steel, beams.length);
  const dummy = new THREE.Object3D(), axis = new THREE.Vector3(0, 1, 0), vector = new THREE.Vector3();
  const beamCenters = [];
  beams.forEach(({ a, b, radius }, index) => {
    vector.subVectors(points[b], points[a]);
    dummy.position.copy(points[a]).add(points[b]).multiplyScalar(.5);
    beamCenters.push(dummy.position.clone());
    dummy.quaternion.setFromUnitVectors(axis, vector.clone().normalize());
    dummy.scale.set(radius, vector.length(), radius);
    dummy.updateMatrix();beamMesh.setMatrixAt(index, dummy.matrix);
    beamMesh.setColorAt(index, new THREE.Color());
  });
  beamMesh.instanceMatrix.needsUpdate = true;
  beamMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  group.add(beamMesh);

  const linePositions = [];
  ties.forEach(([a, b]) => [a, b].forEach(index => {
    const p = points[index];linePositions.push(p.x, p.y, p.z);
  }));
  const tieGeometry = new THREE.BufferGeometry();
  tieGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  const tieColors = new THREE.Float32BufferAttribute(new Float32Array(linePositions.length), 3);
  tieColors.setUsage(THREE.DynamicDrawUsage);
  tieGeometry.setAttribute('color', tieColors);
  const tieMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .42, depthWrite: false });
  const tieMesh = new THREE.LineSegments(tieGeometry, tieMaterial);
  group.add(tieMesh);

  const nodeMaterial = new THREE.MeshStandardMaterial({ color: '#FFFFFF', metalness: .40, roughness: .35 });
  const nodes = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), nodeMaterial, points.length);
  const selected = new Set([0, 2, 4, 7]);
  points.forEach((p, index) => {
    dummy.position.copy(p);dummy.quaternion.identity();dummy.scale.setScalar(selected.has(index) ? .050 : .021);
    dummy.updateMatrix();nodes.setMatrixAt(index, dummy.matrix);
    nodes.setColorAt(index, new THREE.Color());
  });
  nodes.instanceMatrix.needsUpdate = true;
  nodes.instanceColor.setUsage(THREE.DynamicDrawUsage);
  group.add(nodes);

  // Partial, off-axis sweeps remain subordinate to the polygon, never full rings.
  const orbits = [];
  for (let arc = 0; arc < (compact ? 1 : 2); arc++) {
    const vertices = [];
    for (let i = 0; i <= 48; i++) {
      const angle = (i / 48 * .92 + (arc ? .73 : .09)) * Math.PI;
      vertices.push(new THREE.Vector3(Math.cos(angle) * 2.98, Math.sin(angle) * 1.18, Math.sin(angle) * .95 - .1));
    }
    const curve = new THREE.BufferGeometry().setFromPoints(vertices);
    const material = new THREE.LineBasicMaterial({ color: arc ? '#8DAEB5' : '#658794', transparent: true, opacity: arc ? .15 : .23, depthWrite: false });
    const orbit = new THREE.Line(curve, material);
    orbit.rotation.z = arc ? -.42 : .28;
    orbit.position.y = arc ? 1.25 : -1.35;
    group.add(orbit);orbits.push(orbit);
  }

  // Only a few dozen reusable vectors/colors are updated per rendered frame.
  // Transform into camera space after the current group rotation/scale is applied.
  // Fixed camera-distance bounds prevent brightness from normalizing away rotation.
  const viewMatrix = new THREE.Matrix4(), viewPoint = new THREE.Vector3();
  const rearColor = new THREE.Color('#29434D'), nearColor = new THREE.Color('#9EC7C9');
  const nodeRear = new THREE.Color('#304B54'), nodeNear = new THREE.Color('#D0E5E2');
  const color = new THREE.Color();
  const lastRotation = new THREE.Euler(NaN, NaN, NaN);
  let lastScale = NaN;
  const depthSamples = [{ node: 0, depth: 0, strength: 0 }, { node: 4, depth: 0, strength: 0 }];
  function cameraDepth(p) {
    viewPoint.copy(p).applyMatrix4(viewMatrix);
    return -viewPoint.z;
  }
  function prominence(depth) {
    return THREE.MathUtils.smoothstep(SETTINGS.cameraDistance + 1.85 - depth, 0, 3.7);
  }
  function updateDepth() {
    if (group.rotation.equals(lastRotation) && group.scale.x === lastScale) return;
    lastRotation.copy(group.rotation);lastScale = group.scale.x;
    group.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    viewMatrix.multiplyMatrices(camera.matrixWorldInverse, group.matrixWorld);
    beamCenters.forEach((p, i) => {
      color.copy(rearColor).lerp(nearColor, prominence(cameraDepth(p))).multiplyScalar(beams[i].weight);
      beamMesh.setColorAt(i, color);
    });
    beamMesh.instanceColor.needsUpdate = true;
    ties.forEach((pair, i) => pair.forEach((index, end) => {
      color.copy(rearColor).lerp(nearColor, prominence(cameraDepth(points[index]))).multiplyScalar(.78);
      tieColors.setXYZ(i * 2 + end, color.r, color.g, color.b);
    }));
    tieColors.needsUpdate = true;
    points.forEach((p, i) => {
      const depth = cameraDepth(p), strength = prominence(depth);
      color.copy(nodeRear).lerp(nodeNear, strength).multiplyScalar(selected.has(i) ? 1 : .58);
      nodes.setColorAt(i, color);
      // Two equal-role joints on opposite shoulders demonstrate orientation response.
      if (i === 0 || i === 4) {
        const sample = depthSamples[i === 0 ? 0 : 1];
        sample.depth = depth;sample.strength = strength;
      }
    });
    nodes.instanceColor.needsUpdate = true;
  }
  return { group, beamMesh, tieMesh, nodes, steel, tieMaterial, beams: beams.length, ties: ties.length, nodeCount: points.length, orbits, updateDepth, depthSamples };
}
