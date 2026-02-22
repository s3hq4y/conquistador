<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import * as pc from 'playcanvas';
import { HexGrid, Tile, TerrainTypeDefinition, hexToRgb } from '../../core/map';
import { Camera } from '../../core/camera';

const router = useRouter();

let app: pc.Application | null = null;
let grid: HexGrid | null = null;
let camera: Camera | null = null;
let tileEntities: Map<string, { entity: pc.Entity; material: pc.StandardMaterial; tile: Tile }> = new Map();

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

const selectedTile = ref<{ q: number; r: number; terrain: string; terrainName: string } | null>(null);
const scenarioName = ref('加载中...');
const terrainStats = ref<Map<string, number>>(new Map());

const hexSize = 50;
const terrainTypes: Map<string, TerrainTypeDefinition> = new Map();

const getTerrainDef = (id: string): TerrainTypeDefinition => {
  return terrainTypes.get(id) || terrainTypes.get('plains')!;
};

function hexToPlayCanvas(hex: string): pc.Color {
  const rgb = hexToRgb(hex);
  return new pc.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255);
}

function createHexGeometry(device: pc.GraphicsDevice, size: number): pc.Mesh {
  const geometry = new pc.CylinderGeometry({
    radius: size,
    height: Math.max(2, size * 0.08),
    heightSegments: 1,
    capSegments: 6
  });
  return pc.Mesh.fromGeometry(device, geometry);
}

function createTileEntity(
  app: pc.Application,
  tile: Tile,
  terrainDef: TerrainTypeDefinition
): { entity: pc.Entity; material: pc.StandardMaterial; tile: Tile } {
  const entity = new pc.Entity(`Tile_${tile.q}_${tile.r}`);
  
  const terrainColor = hexToPlayCanvas(terrainDef.color);
  
  const material = new pc.StandardMaterial();
  material.diffuse = terrainColor.clone();
  material.useLighting = false;
  material.emissive = terrainColor.clone();
  material.emissiveIntensity = 1;
  material.update();

  const mesh = createHexGeometry(app.graphicsDevice, hexSize);
  const meshInstance = new pc.MeshInstance(mesh, material);

  entity.addComponent('render', {
    meshInstances: [meshInstance],
    castShadows: false,
    receiveShadows: false
  });

  entity.setLocalEulerAngles(0, 30, 0);

  return { entity, material, tile };
}

async function loadScenario(): Promise<void> {
  if (!app || !grid) return;

  try {
    const [manifestRes, terrainRes, tilesRes] = await Promise.all([
      fetch('/scenarios/example_battlefield/manifest.json'),
      fetch('/scenarios/example_battlefield/terrain_types.json'),
      fetch('/scenarios/example_battlefield/tiles.json')
    ]);

    const manifest = await manifestRes.json();
    const terrainData = await terrainRes.json();
    const tilesData = await tilesRes.json();

    scenarioName.value = manifest.name;

    terrainTypes.clear();
    Object.entries(terrainData).forEach(([id, instance]: [string, any]) => {
      terrainTypes.set(id, {
        id,
        name: instance.components.name,
        description: instance.components.description,
        color: instance.components.color,
        icon: instance.components.icon,
        isWater: instance.components.isWater || false,
        isPassable: instance.components.isPassable !== false,
        movementCost: instance.components.movementCost || 1
      });
    });

    grid.clear();
    tileEntities.forEach(({ entity }) => entity.destroy());
    tileEntities.clear();
    terrainStats.value.clear();

    for (const tileData of tilesData) {
      const [q, r] = tileData.pos;
      const tile = new Tile(q, r);
      tile.terrain = tileData.components.terrain;
      
      grid.addTile(tile);
      
      const terrainDef = getTerrainDef(tile.terrain);
      
      const tileEntity = createTileEntity(app, tile, terrainDef);
      const pos = grid.hexToPixel(tile.q, tile.r);
      tileEntity.entity.setLocalPosition(pos.x, 0, pos.y);
      
      app.root.addChild(tileEntity.entity);
      tileEntities.set(tile.getKey(), tileEntity);

      const count = terrainStats.value.get(tile.terrain) || 0;
      terrainStats.value.set(tile.terrain, count + 1);
    }
  } catch (error) {
    console.error('Failed to load scenario:', error);
    scenarioName.value = '加载失败';
  }
}

function clearHighlights(): void {
  tileEntities.forEach(({ material, tile }) => {
    const terrainDef = getTerrainDef(tile.terrain);
    const terrainColor = hexToPlayCanvas(terrainDef.color);
    material.diffuse = terrainColor.clone();
    material.emissive = terrainColor.clone();
    material.emissiveIntensity = 1;
    material.update();
  });
}

function handleCanvasMouseDown(event: MouseEvent): void {
  if (event.button === 0) {
    isDragging = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  }
}

function handleCanvasMouseUp(event: MouseEvent): void {
  if (event.button === 0) {
    const dx = Math.abs(event.clientX - lastMouseX);
    const dy = Math.abs(event.clientY - lastMouseY);
    
    if (dx < 5 && dy < 5) {
      handleCanvasClick(event);
    }
    isDragging = false;
  }
}

function handleCanvasMouseMove(event: MouseEvent): void {
  if (isDragging && camera) {
    const dx = event.clientX - lastMouseX;
    const dy = event.clientY - lastMouseY;

    const pos = camera.getPosition();
    const zoom = camera.getZoom();

    camera.setPosition(pos.x - dx / zoom, pos.y - dy / zoom);

    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  }
}

function handleCanvasWheel(event: WheelEvent): void {
  if (camera) {
    const zoom = camera.getZoom();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    camera.setZoom(zoom + delta);
  }
}

function handleCanvasClick(event: MouseEvent): void {
  if (!app || !grid || !camera) return;

  const worldPos = camera.screenToWorld(event.clientX, event.clientY);
  
  const hexCoord = grid.pixelToHex(worldPos.x, worldPos.z);
  const tile = grid.getTile(hexCoord.q, hexCoord.r);
  
  if (!tile) return;

  clearHighlights();
  
  const terrainDef = getTerrainDef(tile.terrain);
  selectedTile.value = { 
    q: tile.q, 
    r: tile.r, 
    terrain: tile.terrain,
    terrainName: terrainDef.name
  };
  
  const tileEntity = tileEntities.get(tile.getKey());
  if (tileEntity) {
    tileEntity.material.emissive = new pc.Color(0.2, 0.8, 1);
    tileEntity.material.emissiveIntensity = 1.5;
    tileEntity.material.update();
  }
}

function resetSelection(): void {
  clearHighlights();
  selectedTile.value = null;
}

function goBack(): void {
  router.push('/beta');
}

onMounted(async () => {
  const canvas = document.getElementById('betaCanvas') as HTMLCanvasElement;
  if (!canvas) return;

  app = new pc.Application(canvas, {
    graphicsDeviceOptions: {
      alpha: false,
      antialias: false,
      depth: true,
      stencil: true
    }
  });
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);

  const onResize = () => app!.resizeCanvas();
  window.addEventListener('resize', onResize);
  app.resizeCanvas();

  camera = new Camera(app);

  grid = new HexGrid(10, hexSize);

  app.start();

  await loadScenario();

  canvas.addEventListener('mousedown', handleCanvasMouseDown);
  canvas.addEventListener('mouseup', handleCanvasMouseUp);
  canvas.addEventListener('mousemove', handleCanvasMouseMove);
  canvas.addEventListener('wheel', handleCanvasWheel);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
});

onUnmounted(() => {
  if (app) {
    tileEntities.forEach(({ entity }) => entity.destroy());
    tileEntities.clear();
    app.destroy();
    app = null;
  }
  grid = null;
  camera = null;
});
</script>

<template>
  <div class="beta-page">
    <div class="beta-header">
      <button class="back-btn" @click="goBack">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
        </svg>
        返回
      </button>
      <div class="beta-title">
        <span class="beta-badge">BETA</span>
        <h1>地形查看器</h1>
      </div>
      <div class="scenario-name">{{ scenarioName }}</div>
    </div>

    <canvas id="betaCanvas"></canvas>

    <div class="beta-panel">
      <div class="panel-section">
        <h3>操作说明</h3>
        <ul>
          <li>拖动鼠标移动视角</li>
          <li>滚轮缩放视角</li>
          <li>点击地块查看地形</li>
        </ul>
      </div>

      <div class="panel-section">
        <h3>当前状态</h3>
        <div class="status-grid">
          <div class="status-item">
            <span class="status-label">坐标</span>
            <span class="status-value" v-if="selectedTile">
              ({{ selectedTile.q }}, {{ selectedTile.r }})
            </span>
            <span class="status-value empty" v-else>未选择</span>
          </div>
          <div class="status-item">
            <span class="status-label">地形</span>
            <span class="status-value" v-if="selectedTile">
              {{ selectedTile.terrainName }}
            </span>
            <span class="status-value empty" v-else>--</span>
          </div>
        </div>
      </div>

      <div class="panel-section">
        <h3>地形统计</h3>
        <div class="terrain-stats">
          <div 
            v-for="(count, terrainId) in terrainStats" 
            :key="terrainId" 
            class="terrain-stat"
          >
            <span class="terrain-dot" :style="{ background: terrainTypes.get(terrainId)?.color || '#888' }"></span>
            <span class="terrain-name">{{ terrainTypes.get(terrainId)?.name || terrainId }}</span>
            <span class="terrain-count">{{ count }}</span>
          </div>
        </div>
      </div>

      <button class="reset-btn" @click="resetSelection">
        重置选择
      </button>
    </div>
  </div>
</template>

<style scoped>
.beta-page {
  width: 100%;
  height: 100vh;
  position: relative;
  background: #0a0a0f;
}

#betaCanvas {
  width: 100%;
  height: 100%;
  display: block;
}

.beta-header {
  position: fixed;
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

.beta-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.beta-badge {
  padding: 4px 8px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #fff;
}

.beta-title h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: #e0e0e0;
  letter-spacing: 0.5px;
}

.scenario-name {
  margin-left: auto;
  padding: 6px 12px;
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px;
  color: #60a5fa;
  font-size: 13px;
}

.beta-panel {
  position: fixed;
  top: 80px;
  right: 20px;
  width: 280px;
  background: rgba(15, 15, 20, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  z-index: 100;
  backdrop-filter: blur(12px);
}

.panel-section {
  margin-bottom: 20px;
}

.panel-section h3 {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: #808080;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.panel-section ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.panel-section li {
  padding: 6px 0;
  font-size: 13px;
  color: #b0b0b0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.panel-section li:last-child {
  border-bottom: none;
}

.status-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}

.status-label {
  font-size: 12px;
  color: #808080;
}

.status-value {
  font-size: 13px;
  font-weight: 500;
  color: #e0e0e0;
  font-family: 'SF Mono', 'Consolas', monospace;
}

.status-value.empty {
  color: #606060;
  font-style: italic;
}

.terrain-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.terrain-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
}

.terrain-dot {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
}

.terrain-name {
  flex: 1;
  font-size: 12px;
  color: #b0b0b0;
}

.terrain-count {
  font-size: 12px;
  font-weight: 500;
  color: #808080;
  font-family: 'SF Mono', 'Consolas', monospace;
}

.reset-btn {
  width: 100%;
  padding: 12px;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #f87171;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn:hover {
  background: rgba(239, 68, 68, 0.3);
  border-color: rgba(239, 68, 68, 0.5);
}
</style>
