<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import * as pc from 'playcanvas';
import { HexGrid, Tile, TerrainTypeDefinition, OwnerTagDefinition, hexToRgb } from '../../../core/map';
import { Camera } from '../../../core/camera';
import { PathfindingSystem } from './PathfindingSystem';

const router = useRouter();

let app: pc.Application | null = null;
let grid: HexGrid | null = null;
let camera: Camera | null = null;
let tileEntities: Map<string, { entity: pc.Entity; material: pc.StandardMaterial; tile: Tile }> = new Map();
let pathfinding: PathfindingSystem | null = null;

const startTile = ref<{ q: number; r: number } | null>(null);
const endTile = ref<{ q: number; r: number } | null>(null);
const currentPath = ref<{ q: number; r: number }[]>([]);
const pathLength = ref(0);
const scenarioName = ref('加载中...');

const hexSize = 50;
const terrainTypes: Map<string, TerrainTypeDefinition> = new Map();
const ownerTags: Map<string, OwnerTagDefinition> = new Map();

const getTerrainDef = (id: string): TerrainTypeDefinition => {
  return terrainTypes.get(id) || terrainTypes.get('plains')!;
};

const getOwnerDef = (id: string): OwnerTagDefinition => {
  return ownerTags.get(id) || ownerTags.get('neutral')!;
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
  terrainDef: TerrainTypeDefinition,
  _ownerDef: OwnerTagDefinition
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
    const [manifestRes, terrainRes, ownerRes, tilesRes] = await Promise.all([
      fetch('/scenarios/example_battlefield/manifest.json'),
      fetch('/scenarios/example_battlefield/terrain_types.json'),
      fetch('/scenarios/example_battlefield/owner_tags.json'),
      fetch('/scenarios/example_battlefield/tiles.json')
    ]);

    const manifest = await manifestRes.json();
    const terrainData = await terrainRes.json();
    const ownerData = await ownerRes.json();
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

    ownerTags.clear();
    Object.entries(ownerData).forEach(([id, instance]: [string, any]) => {
      ownerTags.set(id, {
        id,
        name: instance.components.name,
        description: instance.components.description,
        color: instance.components.color,
        icon: instance.components.icon,
        isPlayer: instance.components.isPlayer || false,
        isAI: instance.components.isAI || false
      });
    });

    grid.clear();
    tileEntities.forEach(({ entity }) => entity.destroy());
    tileEntities.clear();

    for (const tileData of tilesData) {
      const [q, r] = tileData.pos;
      const tile = new Tile(q, r);
      tile.terrain = tileData.components.terrain;
      tile.owner = tileData.components.owner;
      
      grid.addTile(tile);
      
      const terrainDef = getTerrainDef(tile.terrain);
      const ownerDef = getOwnerDef(tile.owner);
      
      const tileEntity = createTileEntity(app, tile, terrainDef, ownerDef);
      const pos = grid.hexToPixel(tile.q, tile.r);
      tileEntity.entity.setLocalPosition(pos.x, 0, pos.y);
      
      app.root.addChild(tileEntity.entity);
      tileEntities.set(tile.getKey(), tileEntity);
    }

    pathfinding!.setGrid(grid);
  } catch (error) {
    console.error('Failed to load scenario:', error);
    scenarioName.value = '加载失败';
  }
}

function clearPathHighlights(): void {
  tileEntities.forEach(({ material, tile }) => {
    const terrainDef = getTerrainDef(tile.terrain);
    const terrainColor = hexToPlayCanvas(terrainDef.color);
    material.diffuse = terrainColor.clone();
    material.emissive = terrainColor.clone();
    material.emissiveIntensity = 1;
    material.update();
  });
}

function highlightPath(path: { q: number; r: number }[]): void {
  for (let i = 0; i < path.length; i++) {
    const { q, r } = path[i];
    const key = `${q},${r}`;
    const tileEntity = tileEntities.get(key);
    
    if (tileEntity) {
      const isStart = i === 0;
      const isEnd = i === path.length - 1;
      
      if (isStart) {
        tileEntity.material.emissive = new pc.Color(0.2, 1, 0.2);
        tileEntity.material.emissiveIntensity = 1.5;
      } else if (isEnd) {
        tileEntity.material.emissive = new pc.Color(1, 0.2, 0.2);
        tileEntity.material.emissiveIntensity = 1.5;
      } else {
        tileEntity.material.emissive = new pc.Color(1, 1, 0.2);
        tileEntity.material.emissiveIntensity = 1.3;
      }
      tileEntity.material.update();
    }
  }
}

function handleCanvasClick(event: MouseEvent): void {
  if (!app || !grid || !pathfinding || !camera) return;

  const worldPos = camera.screenToWorld(event.clientX, event.clientY);
  
  const hexCoord = grid.pixelToHex(worldPos.x, worldPos.z);
  const tile = grid.getTile(hexCoord.q, hexCoord.r);
  
  if (!tile) return;

  if (!startTile.value) {
    clearPathHighlights();
    startTile.value = { q: tile.q, r: tile.r };
    endTile.value = null;
    currentPath.value = [{ q: tile.q, r: tile.r }];
    pathLength.value = 1;
    
    const key = tile.getKey();
    const tileEntity = tileEntities.get(key);
    if (tileEntity) {
      tileEntity.material.emissive = new pc.Color(0.2, 1, 0.2);
      tileEntity.material.emissiveIntensity = 1.5;
      tileEntity.material.update();
    }
  } else if (!endTile.value) {
    if (startTile.value.q === tile.q && startTile.value.r === tile.r) {
      return;
    }
    
    endTile.value = { q: tile.q, r: tile.r };
    
    const path = pathfinding.findPathWithParentTracking(
      startTile.value.q,
      startTile.value.r,
      endTile.value.q,
      endTile.value.r
    );
    
    if (path) {
      currentPath.value = path;
      pathLength.value = path.length;
      highlightPath(path);
    } else {
      currentPath.value = [];
      pathLength.value = 0;
    }
  } else {
    clearPathHighlights();
    startTile.value = { q: tile.q, r: tile.r };
    endTile.value = null;
    currentPath.value = [{ q: tile.q, r: tile.r }];
    pathLength.value = 1;
    
    const key = tile.getKey();
    const tileEntity = tileEntities.get(key);
    if (tileEntity) {
      tileEntity.material.emissive = new pc.Color(0.2, 1, 0.2);
      tileEntity.material.emissiveIntensity = 1.5;
      tileEntity.material.update();
    }
  }
}

function resetSelection(): void {
  clearPathHighlights();
  startTile.value = null;
  endTile.value = null;
  currentPath.value = [];
  pathLength.value = 0;
}

function goBack(): void {
  router.push('/');
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
  pathfinding = new PathfindingSystem();

  app.start();

  await loadScenario();

  canvas.addEventListener('click', handleCanvasClick);
});

onUnmounted(() => {
  if (app) {
    tileEntities.forEach(({ entity }) => entity.destroy());
    tileEntities.clear();
    app.destroy();
    app = null;
  }
  grid = null;
  pathfinding = null;
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
        返回主页
      </button>
      <div class="beta-title">
        <span class="beta-badge">BETA</span>
        <h1>路径查找测试</h1>
      </div>
      <div class="scenario-name">{{ scenarioName }}</div>
    </div>

    <canvas id="betaCanvas"></canvas>

    <div class="beta-panel">
      <div class="panel-section">
        <h3>操作说明</h3>
        <ul>
          <li>点击第一个地块设置起点（绿色）</li>
          <li>点击第二个地块设置终点（红色）</li>
          <li>路径将以黄色显示</li>
        </ul>
      </div>

      <div class="panel-section">
        <h3>当前状态</h3>
        <div class="status-grid">
          <div class="status-item">
            <span class="status-label">起点</span>
            <span class="status-value" v-if="startTile">
              ({{ startTile.q }}, {{ startTile.r }})
            </span>
            <span class="status-value empty" v-else>未选择</span>
          </div>
          <div class="status-item">
            <span class="status-label">终点</span>
            <span class="status-value" v-if="endTile">
              ({{ endTile.q }}, {{ endTile.r }})
            </span>
            <span class="status-value empty" v-else>未选择</span>
          </div>
          <div class="status-item">
            <span class="status-label">路径长度</span>
            <span class="status-value">{{ pathLength }} 格</span>
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
