<script setup lang="ts">
/**
 * 六边形几何查看器
 * 
 * 展示 PlayCanvas 渲染的原始尖顶六边形和旋转后的平顶六边形的对应点和边
 * - 左侧：原始尖顶六边形（未旋转）
 * - 右侧：旋转后的平顶六边形（Y轴旋转30°）
 */
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import * as pc from 'playcanvas';

const router = useRouter();

let app: pc.Application | null = null;

const hexSize = 80;

/**
 * 计算六边形顶点坐标（尖顶公式）
 * angleDeg = 60 * index - 30
 */
function getHexCorner(index: number): { x: number; z: number } {
  const angleDeg = 60 * index - 30;
  const angleRad = Math.PI / 180 * angleDeg;
  return {
    x: hexSize * Math.cos(angleRad),
    z: hexSize * Math.sin(angleRad)
  };
}

/**
 * HSL 转 RGB 颜色
 */
function hslToRgb(h: number, s: number, l: number): pc.Color {
  let r: number, g: number, b: number;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return new pc.Color(r + m, g + m, b + m);
}

/**
 * 根据边索引计算颜色
 */
function getEdgeColor(edgeIndex: number): pc.Color {
  const hue = (edgeIndex / 6) * 360;
  return hslToRgb(hue, 1, 0.5);
}

/**
 * 创建六边形地块实体
 */
function createHexEntity(
  app: pc.Application,
  position: { x: number; z: number },
  rotation: number,
  label: string,
  showLabels: boolean
): pc.Entity {
  const entity = new pc.Entity(`Hex_${label}`);
  
  // 创建六边形几何体
  const geometry = new pc.CylinderGeometry({
    radius: hexSize,
    height: 10,
    heightSegments: 1,
    capSegments: 6
  });
  const mesh = pc.Mesh.fromGeometry(app.graphicsDevice, geometry);
  
  // 创建材质
  const material = new pc.StandardMaterial();
  material.diffuse = new pc.Color(0.3, 0.3, 0.35);
  material.useLighting = false;
  material.emissive = new pc.Color(0.2, 0.2, 0.25);
  material.emissiveIntensity = 1;
  material.update();
  
  const meshInstance = new pc.MeshInstance(mesh, material);
  
  entity.addComponent('render', {
    meshInstances: [meshInstance],
    castShadows: false,
    receiveShadows: false
  });
  
  entity.setLocalPosition(position.x, 0, position.z);
  entity.setLocalEulerAngles(0, rotation, 0);
  
  app.root.addChild(entity);
  
  // 创建顶点标记
  for (let i = 0; i < 6; i++) {
    const corner = getHexCorner(i);
    const vertexEntity = new pc.Entity(`Vertex_${label}_${i}`);
    
    // 创建小球表示顶点
    const sphereGeometry = new pc.SphereGeometry({
      radius: 6
    });
    const sphereMesh = pc.Mesh.fromGeometry(app.graphicsDevice, sphereGeometry);
    
    // 顶点颜色：使用与边相同的颜色方案
    const vertexColor = getEdgeColor(i);
    
    const vertexMaterial = new pc.StandardMaterial();
    vertexMaterial.diffuse = vertexColor;
    vertexMaterial.useLighting = false;
    vertexMaterial.emissive = vertexColor;
    vertexMaterial.emissiveIntensity = 1;
    vertexMaterial.update();
    
    const sphereMeshInstance = new pc.MeshInstance(sphereMesh, vertexMaterial);
    
    vertexEntity.addComponent('render', {
      meshInstances: [sphereMeshInstance],
      castShadows: false,
      receiveShadows: false
    });
    
    vertexEntity.setLocalPosition(corner.x, 15, corner.z);
    entity.addChild(vertexEntity);
    
    // 创建顶点编号标签
    if (showLabels) {
      const labelEntity = new pc.Entity(`VertexLabel_${label}_${i}`);
      labelEntity.setLocalPosition(corner.x * 1.15, 25, corner.z * 1.15);
      entity.addChild(labelEntity);
    }
  }
  
  // 创建边线
  for (let i = 0; i < 6; i++) {
    const p0 = getHexCorner(i);
    const p1 = getHexCorner((i + 1) % 6);
    
    const edgeColor = getEdgeColor(i);
    
    // 创建边的线条
    const lineEntity = new pc.Entity(`Edge_${label}_${i}`);
    
    // 计算边的中点和长度
    const midX = (p0.x + p1.x) / 2;
    const midZ = (p0.z + p1.z) / 2;
    const edgeLength = Math.sqrt((p1.x - p0.x) ** 2 + (p1.z - p0.z) ** 2);
    const angle = Math.atan2(p1.z - p0.z, p1.x - p0.x);
    
    // 创建盒子表示边
    const boxGeometry = new pc.BoxGeometry({
      width: edgeLength,
      height: 4,
      depth: 4
    });
    const boxMesh = pc.Mesh.fromGeometry(app.graphicsDevice, boxGeometry);
    
    const edgeMaterial = new pc.StandardMaterial();
    edgeMaterial.diffuse = edgeColor;
    edgeMaterial.useLighting = false;
    edgeMaterial.emissive = edgeColor;
    edgeMaterial.emissiveIntensity = 1;
    edgeMaterial.opacity = 0.8;
    edgeMaterial.blendType = pc.BLEND_NORMAL;
    edgeMaterial.update();
    
    const boxMeshInstance = new pc.MeshInstance(boxMesh, edgeMaterial);
    
    lineEntity.addComponent('render', {
      meshInstances: [boxMeshInstance],
      castShadows: false,
      receiveShadows: false
    });
    
    lineEntity.setLocalPosition(midX, 20, midZ);
    lineEntity.setLocalEulerAngles(0, -angle * 180 / Math.PI, 0);
    entity.addChild(lineEntity);
    
    // 创建边编号标签
    if (showLabels) {
      const labelEntity = new pc.Entity(`EdgeLabel_${label}_${i}`);
      // 边标签放在边的外侧
      const nx = -Math.sin(angle);
      const nz = Math.cos(angle);
      labelEntity.setLocalPosition(midX + nx * 15, 30, midZ + nz * 15);
      entity.addChild(labelEntity);
    }
  }
  
  return entity;
}

/**
 * 创建文字标签（使用3D文字近似）
 */
function createTextLabel(
  app: pc.Application,
  text: string,
  position: { x: number; y: number; z: number },
  color: pc.Color
): pc.Entity {
  const entity = new pc.Entity(`Label_${text}`);
  
  // 使用平面几何体作为标签背景
  const planeGeometry = new pc.PlaneGeometry({
    width: 20,
    height: 10
  });
  const planeMesh = pc.Mesh.fromGeometry(app.graphicsDevice, planeGeometry);
  
  const material = new pc.StandardMaterial();
  material.diffuse = color;
  material.useLighting = false;
  material.emissive = color;
  material.emissiveIntensity = 1;
  material.update();
  
  const meshInstance = new pc.MeshInstance(planeMesh, material);
  
  entity.addComponent('render', {
    meshInstances: [meshInstance],
    castShadows: false,
    receiveShadows: false
  });
  
  entity.setLocalPosition(position.x, position.y, position.z);
  entity.setLocalEulerAngles(-90, 0, 0); // 面向上方
  
  app.root.addChild(entity);
  
  return entity;
}

/**
 * 初始化 PlayCanvas 应用
 */
function initPlayCanvas() {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) return;
  
  app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    touch: new pc.TouchDevice(canvas)
  });
  
  // 设置画布大小
  app.setCanvasFillMode(pc.FILLMODE_NONE);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  // 创建相机
  const camera = new pc.Entity('Camera');
  camera.addComponent('camera', {
    clearColor: new pc.Color(0.05, 0.05, 0.08),
    orthographic: true,
    orthoHeight: 200
  });
  camera.setLocalPosition(0, 400, 0);
  camera.setLocalEulerAngles(-90, 0, 0);
  app.root.addChild(camera);
  
  // 创建光源
  const light = new pc.Entity('Light');
  light.addComponent('light', {
    type: pc.LIGHTTYPE_DIRECTIONAL,
    color: new pc.Color(1, 1, 1),
    intensity: 1
  });
  light.setLocalEulerAngles(45, 30, 0);
  app.root.addChild(light);
  
  // 创建左侧尖顶六边形（未旋转）
  createHexEntity(app, { x: -150, z: 0 }, 0, 'Pointy', true);
  
  // 创建右侧平顶六边形（旋转30°）
  createHexEntity(app, { x: 150, z: 0 }, 30, 'Flat', true);
  
  // 创建标题标签
  createTextLabel(app, '尖顶 (原始)', { x: -150, y: 5, z: -120 }, new pc.Color(0.8, 0.8, 0.8));
  createTextLabel(app, '平顶 (旋转30°)', { x: 150, y: 5, z: -120 }, new pc.Color(0.8, 0.8, 0.8));
  
  // 添加鼠标拖拽平移
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;
  let cameraX = 0;
  let cameraZ = 0;
  
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  
  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    cameraX -= dx * 0.5;
    cameraZ -= dy * 0.5;
    camera.setLocalPosition(cameraX, 400, cameraZ);
    lastX = e.clientX;
    lastY = e.clientY;
  });
  
  canvas.addEventListener('mouseup', () => {
    isDragging = false;
  });
  
  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
  });
  
  // 添加滚轮缩放
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const cameraComponent = camera.camera;
    if (cameraComponent && cameraComponent.orthoHeight) {
      let orthoHeight = cameraComponent.orthoHeight;
      orthoHeight += e.deltaY * 0.5;
      orthoHeight = Math.max(100, Math.min(500, orthoHeight));
      cameraComponent.orthoHeight = orthoHeight;
    }
  });
  
  // 开始渲染循环
  app.start();
}

function goBack() {
  router.push('/beta');
}

onMounted(() => {
  initPlayCanvas();
});

onUnmounted(() => {
  if (app) {
    app.destroy();
    app = null;
  }
});
</script>

<template>
  <div class="hex-viewer">
    <div class="viewer-header">
      <button class="back-btn" @click="goBack">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
        </svg>
        返回
      </button>
      <h1>六边形几何查看器</h1>
    </div>
    
    <canvas id="gameCanvas"></canvas>
    
    <div class="info-panel">
      <div class="info-section">
        <h3>顶点编号与颜色</h3>
        <div class="legend">
          <div class="legend-item" v-for="i in 6" :key="'v' + i">
            <span class="legend-dot" :style="{ backgroundColor: getEdgeColorHex(i - 1) }"></span>
            <span>顶点 {{ i - 1 }}</span>
          </div>
        </div>
      </div>
      
      <div class="info-section">
        <h3>边编号与颜色</h3>
        <div class="legend">
          <div class="legend-item" v-for="i in 6" :key="'e' + i">
            <span class="legend-line" :style="{ backgroundColor: getEdgeColorHex(i - 1) }"></span>
            <span>边 {{ i - 1 }}</span>
          </div>
        </div>
      </div>
      
      <div class="info-section">
        <h3>公式</h3>
        <p class="formula">angleDeg = 60 * index - 30</p>
        <p class="formula-desc">尖顶六边形顶点角度计算公式</p>
      </div>
      
      <div class="info-section">
        <h3>旋转</h3>
        <p class="formula">setLocalEulerAngles(0, 30, 0)</p>
        <p class="formula-desc">Y轴旋转30°将尖顶转为平顶</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// 辅助函数：获取边颜色的十六进制值
function getEdgeColorHex(edgeIndex: number): string {
  const hue = (edgeIndex / 6) * 360;
  const h = hue / 360;
  const s = 1;
  const l = 0.5;
  
  let r: number, g: number, b: number;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 360 / 60) % 2) - 1));
  const m = l - c / 2;

  if (hue < 60) { r = c; g = x; b = 0; }
  else if (hue < 120) { r = x; g = c; b = 0; }
  else if (hue < 180) { r = 0; g = c; b = x; }
  else if (hue < 240) { r = 0; g = x; b = c; }
  else if (hue < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export default {
  methods: {
    getEdgeColorHex
  }
};
</script>

<style scoped>
.hex-viewer {
  width: 100%;
  height: 100vh;
  position: relative;
  background: #0a0a0f;
}

#gameCanvas {
  width: 100%;
  height: 100%;
  display: block;
}

.viewer-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  background: rgba(10, 10, 15, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 100;
  backdrop-filter: blur(8px);
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #a0a0a0;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.viewer-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: #e0e0e0;
  letter-spacing: 0.5px;
}

.info-panel {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(15, 15, 20, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  min-width: 200px;
  backdrop-filter: blur(8px);
}

.info-section {
  margin-bottom: 16px;
}

.info-section:last-child {
  margin-bottom: 0;
}

.info-section h3 {
  margin: 0 0 10px 0;
  font-size: 12px;
  font-weight: 600;
  color: #808080;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #c0c0c0;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-line {
  width: 24px;
  height: 4px;
  border-radius: 2px;
}

.formula {
  margin: 0;
  padding: 8px 12px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  color: #f59e0b;
}

.formula-desc {
  margin: 6px 0 0 0;
  font-size: 11px;
  color: #606060;
}
</style>
