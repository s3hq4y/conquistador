import * as pc from 'playcanvas';
import type { MapSystem } from './MapSystem';
import { Tile } from '../map';
import { debugConfig } from '../config';
import { 
  EdgeData, 
  EdgeType, 
  EdgeConfig,
  getEdgeConfig,
  createEdgeKey
} from '../map/Edge';
import type { EdgeInstance } from '../map/SceneData';

export class EdgeSystem {
  private mapSystem: MapSystem | null = null;
  private app: pc.Application | null = null;
  private graphicsDevice: pc.GraphicsDevice | null = null;
  private edges: Map<string, EdgeData> = new Map();
  private edgeEntities: Map<string, pc.Entity[]> = new Map();

  constructor() {
  }

  setMapSystem(mapSystem: MapSystem | null): void {
    this.mapSystem = mapSystem;
  }

  setApp(app: pc.Application): void {
    this.app = app;
    this.graphicsDevice = app.graphicsDevice;
  }

  getEdges(): EdgeData[] {
    return Array.from(this.edges.values());
  }

  getEdgesByType(type: EdgeType): EdgeData[] {
    return Array.from(this.edges.values()).filter(e => e.type === type);
  }

  hasEdge(tileA: { q: number; r: number }, tileB: { q: number; r: number }): boolean {
    const key = createEdgeKey(tileA, tileB);
    return this.edges.has(key);
  }

  getEdge(tileA: { q: number; r: number }, tileB: { q: number; r: number }): EdgeData | undefined {
    const key = createEdgeKey(tileA, tileB);
    return this.edges.get(key);
  }

  addEdge(tileA: Tile, tileB: Tile, type: EdgeType, properties?: Record<string, unknown>): boolean {
    if (debugConfig.editor.edgeSystem) {
      console.log('[EdgeSystem] addEdge called:', tileA.getKey(), tileB.getKey(), type);
    }
    if (!this.mapSystem) {
      if (debugConfig.editor.edgeSystem) {
        console.warn('[EdgeSystem] No mapSystem');
      }
      return false;
    }

    const grid = this.mapSystem.getGrid();
    
    if (!grid.areNeighbors(tileA, tileB)) {
      console.warn('边只能添加在相邻地块之间');
      return false;
    }

    const key = createEdgeKey(tileA, tileB);
    if (debugConfig.editor.edgeSystem) {
      console.log('[EdgeSystem] Edge key:', key);
    }
    
    if (this.edges.has(key)) {
      if (debugConfig.editor.edgeSystem) {
        console.warn('[EdgeSystem] Edge already exists:', key);
      }
      return false;
    }

    const sharedEdge = grid.getSharedEdge(tileA, tileB);
    if (!sharedEdge) {
      if (debugConfig.editor.edgeSystem) {
        console.warn('[EdgeSystem] No shared edge found');
      }
      return false;
    }
    if (debugConfig.editor.edgeSystem) {
      console.log('[EdgeSystem] Shared edge:', sharedEdge);
    }

    const edgeData: EdgeData = {
      tileA: { q: tileA.q, r: tileA.r },
      tileB: { q: tileB.q, r: tileB.r },
      type,
      properties
    };

    this.edges.set(key, edgeData);
    if (debugConfig.editor.edgeSystem) {
      console.log('[EdgeSystem] Edge added, total edges:', this.edges.size);
    }
    this.renderEdge(edgeData, sharedEdge.edgeA, sharedEdge.edgeB);

    return true;
  }

  removeEdge(tileA: { q: number; r: number }, tileB: { q: number; r: number }): boolean {
    const key = createEdgeKey(tileA, tileB);
    
    if (!this.edges.has(key)) {
      return false;
    }

    const entities = this.edgeEntities.get(key);
    entities?.forEach(entity => entity.destroy());
    this.edgeEntities.delete(key);
    this.edges.delete(key);

    return true;
  }

  toggleEdge(tileA: Tile, tileB: Tile, type: EdgeType): boolean {
    const existingEdge = this.getEdge(tileA, tileB);
    if (existingEdge) {
      return this.removeEdge(tileA, tileB);
    } else {
      return this.addEdge(tileA, tileB, type);
    }
  }

  loadFromInstances(instances: EdgeInstance[]): void {
    if (debugConfig.editor.edgeSystem) {
      console.log('[EdgeSystem] loadFromInstances called, count:', instances.length);
    }
    this.clearAllEdges();
    
    for (const instance of instances) {
      const tileA = { q: instance.tiles[0][0], r: instance.tiles[0][1] };
      const tileB = { q: instance.tiles[1][0], r: instance.tiles[1][1] };
      const key = createEdgeKey(tileA, tileB);
      
      if (debugConfig.editor.edgeSystem) {
        console.log('[EdgeSystem] Loading edge:', key, instance.type);
      }
      
      const edgeData: EdgeData = {
        tileA,
        tileB,
        type: instance.type,
        properties: instance.properties
      };
      
      this.edges.set(key, edgeData);
    }
    
    if (debugConfig.editor.edgeSystem) {
      console.log('[EdgeSystem] Total edges loaded:', this.edges.size);
    }
    this.renderAllEdges();
  }

  toInstances(): EdgeInstance[] {
    return Array.from(this.edges.values()).map(edge => ({
      tiles: [[edge.tileA.q, edge.tileA.r], [edge.tileB.q, edge.tileB.r]] as [[number, number], [number, number]],
      type: edge.type,
      properties: edge.properties
    }));
  }

  private renderAllEdges(): void {
    if (!this.mapSystem) return;
    
    const grid = this.mapSystem.getGrid();
    
    for (const edge of this.edges.values()) {
      const tileA = grid.getTile(edge.tileA.q, edge.tileA.r);
      const tileB = grid.getTile(edge.tileB.q, edge.tileB.r);
      
      if (!tileA || !tileB) continue;
      
      const sharedEdge = grid.getSharedEdge(tileA, tileB);
      if (!sharedEdge) continue;
      
      this.renderEdge(edge, sharedEdge.edgeA, sharedEdge.edgeB);
    }
  }

  private renderEdge(edge: EdgeData, edgeA: number, edgeB: number): void {
    if (!this.mapSystem || !this.app || !this.graphicsDevice) return;

    const grid = this.mapSystem.getGrid();
    const hexSize = grid.getHexSize();
    const config = getEdgeConfig(edge.type);

    const posA = grid.hexToPixel(edge.tileA.q, edge.tileA.r);
    const posB = grid.hexToPixel(edge.tileB.q, edge.tileB.r);

    const key = createEdgeKey(edge.tileA, edge.tileB);

    const entitiesA = this.createEdgeVisual(posA.x, posA.y, edgeA, hexSize, config, edge.type);
    const entitiesB = this.createEdgeVisual(posB.x, posB.y, edgeB, hexSize, config, edge.type);

    const allEntities = [...entitiesA, ...entitiesB];
    this.edgeEntities.set(key, allEntities);
  }

  private getHexCorner(index: number, hexSize: number): { x: number; z: number } {
    const angleDeg = 60 * index - 30;
    const angleRad = Math.PI / 180 * angleDeg;
    return {
      x: hexSize * Math.cos(angleRad),
      z: hexSize * Math.sin(angleRad)
    };
  }

  private createTrapezoidMesh(
    p0x: number, p0z: number,
    p1x: number, p1z: number,
    q0x: number, q0z: number,
    q1x: number, q1z: number
  ): pc.Mesh {
    const positions = new Float32Array([
      p0x, 0, p0z,
      p1x, 0, p1z,
      q1x, 0, q1z,
      q0x, 0, q0z
    ]);

    const normals = new Float32Array([
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
      0, 1, 0
    ]);

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    const vertexFormat = new pc.VertexFormat(this.graphicsDevice!, [
      { semantic: pc.SEMANTIC_POSITION, components: 3, type: pc.TYPE_FLOAT32 },
      { semantic: pc.SEMANTIC_NORMAL, components: 3, type: pc.TYPE_FLOAT32 }
    ]);

    const vertexBuffer = new pc.VertexBuffer(this.graphicsDevice!, vertexFormat, 4);
    const vertexData = new Float32Array(vertexBuffer.lock());
    
    for (let i = 0; i < 4; i++) {
      vertexData[i * 6 + 0] = positions[i * 3 + 0];
      vertexData[i * 6 + 1] = positions[i * 3 + 1];
      vertexData[i * 6 + 2] = positions[i * 3 + 2];
      vertexData[i * 6 + 3] = normals[i * 3 + 0];
      vertexData[i * 6 + 4] = normals[i * 3 + 1];
      vertexData[i * 6 + 5] = normals[i * 3 + 2];
    }
    vertexBuffer.unlock();

    const indexBuffer = new pc.IndexBuffer(this.graphicsDevice!, pc.INDEXFORMAT_UINT16, 6);
    const indexData = new Uint16Array(indexBuffer.lock());
    indexData.set(indices);
    indexBuffer.unlock();

    const mesh = new pc.Mesh(this.graphicsDevice!);
    mesh.vertexBuffer = vertexBuffer;
    mesh.indexBuffer[0] = indexBuffer;
    mesh.primitive[0] = {
      type: pc.PRIMITIVE_TRIANGLES,
      base: 0,
      baseVertex: 0,
      count: 6,
      indexed: true
    };
    mesh.aabb = new pc.BoundingBox();

    return mesh;
  }

  private createEdgeVisual(
    centerX: number, 
    centerZ: number, 
    edgeIndex: number, 
    hexSize: number,
    config: EdgeConfig,
    edgeType: EdgeType
  ): pc.Entity[] {
    if (!this.app || !this.graphicsDevice) return [];

    const entities: pc.Entity[] = [];
    
    const p0 = this.getHexCorner(edgeIndex, hexSize);
    const p1 = this.getHexCorner((edgeIndex + 1) % 6, hexSize);
    
    const prevCorner = this.getHexCorner((edgeIndex + 5) % 6, hexSize);
    const nextCorner = this.getHexCorner((edgeIndex + 2) % 6, hexSize);
    
    const ex = p1.x - p0.x;
    const ez = p1.z - p0.z;
    const edgeLen = Math.max(1e-6, Math.hypot(ex, ez));
    
    let nx = -ez / edgeLen;
    let nz = ex / edgeLen;
    
    const midX = (p0.x + p1.x) / 2;
    const midZ = (p0.z + p1.z) / 2;
    const dot = nx * (-midX) + nz * (-midZ);
    
    if (dot < 0) {
      nx = -nx;
      nz = -nz;
    }
    
    const tx = ex / edgeLen;
    const tz = ez / edgeLen;
    
    const edgeWidth = hexSize * config.width;
    const layers = config.layers;
    
    for (let k = 1; k <= layers; k++) {
      const offset = edgeWidth * (k / layers);
      const alpha = config.alpha * (1 - (k - 1) / layers * 0.5);
      
      const a0x = p0.x + nx * offset;
      const a0z = p0.z + nz * offset;
      
      const d0x = p0.x - prevCorner.x;
      const d0z = p0.z - prevCorner.z;
      const d1x = nextCorner.x - p1.x;
      const d1z = nextCorner.z - p1.z;
      
      const cross = (ax: number, az: number, bx: number, bz: number) => ax * bz - az * bx;
      const denom0 = cross(tx, tz, d0x, d0z);
      const denom1 = cross(tx, tz, d1x, d1z);
      
      let u0 = denom0 !== 0 ? cross(p0.x - a0x, p0.z - a0z, d0x, d0z) / denom0 : 0;
      let u1 = denom1 !== 0 ? cross(p1.x - a0x, p1.z - a0z, d1x, d1z) / denom1 : 0;
      
      let q0x = a0x + tx * u0;
      let q0z = a0z + tz * u0;
      let q1x = a0x + tx * u1;
      let q1z = a0z + tz * u1;
      
      if (!isFinite(u0)) {
        q0x = p0.x + nx * offset;
        q0z = p0.z + nz * offset;
      }
      if (!isFinite(u1)) {
        q1x = p1.x + nx * offset;
        q1z = p1.z + nz * offset;
      }
      
      const mesh = this.createTrapezoidMesh(
        q0x, q0z,
        q1x, q1z,
        p0.x, p0.z,
        p1.x, p1.z
      );
      
      const material = new pc.StandardMaterial();
      material.diffuse = new pc.Color(config.color.r, config.color.g, config.color.b);
      material.useLighting = false;
      material.emissive = new pc.Color(config.color.r * 0.5, config.color.g * 0.5, config.color.b * 0.5);
      material.emissiveIntensity = 0.5;
      material.opacity = alpha;
      material.blendType = pc.BLEND_NORMAL;
      material.depthWrite = false;
      material.update();
      
      const meshInstance = new pc.MeshInstance(mesh, material);
      
      const entity = new pc.Entity(`Edge_${edgeType}_${edgeIndex}_${k}`);
      entity.addComponent('render', {
        meshInstances: [meshInstance],
        castShadows: false,
        receiveShadows: false
      });
      
      entity.setLocalPosition(centerX, 3, centerZ);
      entity.setLocalEulerAngles(0, 30, 0);
      entity.enabled = true;
      
      this.app.root.addChild(entity);
      entities.push(entity);
    }
    
    return entities;
  }

  private clearAllEdges(): void {
    this.edgeEntities.forEach(entities => {
      entities.forEach(entity => entity.destroy());
    });
    this.edgeEntities.clear();
    this.edges.clear();
  }

  clear(): void {
    this.clearAllEdges();
  }

  dispose(): void {
    this.clearAllEdges();
  }
}
