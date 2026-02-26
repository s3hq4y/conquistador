import * as pc from 'playcanvas';
import type { MapSystem } from '../../core/systems';
import { Tile } from '../../core/map';
import { getHexCorner } from '../../core/utils/HexUtils';

export class DebugEdgeSystem {
  private mapSystem: MapSystem | null = null;
  private enabled: boolean = false;
  private selectedTiles: Tile[] = [];
  private edgeHighlightEntities: pc.Entity[] = [];
  private app: pc.Application | null = null;
  private graphicsDevice: pc.GraphicsDevice | null = null;

  private static readonly BORDER_LAYERS = 6;
  private static readonly BORDER_STEP_FACTOR = 0.05;
  private static readonly BORDER_ALPHA_START = 0.6;

  constructor() {
  }

  setMapSystem(mapSystem: MapSystem | null): void {
    this.mapSystem = mapSystem;
  }

  setApp(app: pc.Application): void {
    this.app = app;
    this.graphicsDevice = app.graphicsDevice;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearSelection();
    }
  }

  toggle(): void {
    this.setEnabled(!this.enabled);
  }

  handleTileClick(q: number, r: number): void {
    if (!this.enabled || !this.mapSystem) return;

    const grid = this.mapSystem.getGrid();
    const tile = grid.getTile(q, r);
    
    if (!tile) return;

    if (this.selectedTiles.length === 0) {
      this.selectedTiles.push(tile);
      this.highlightTile(tile, true);
    } else if (this.selectedTiles.length === 1) {
      const firstTile = this.selectedTiles[0];
      
      if (firstTile.q === q && firstTile.r === r) {
        this.highlightTile(firstTile, false);
        this.selectedTiles = [];
        return;
      }

      if (grid.areNeighbors(firstTile, tile)) {
        this.selectedTiles.push(tile);
        this.highlightTile(tile, true);
        this.showSharedEdge(firstTile, tile);
      } else {
        this.highlightTile(firstTile, false);
        this.selectedTiles = [tile];
        this.highlightTile(tile, true);
        this.clearEdgeHighlights();
      }
    } else {
      this.clearSelection();
      this.selectedTiles.push(tile);
      this.highlightTile(tile, true);
    }
  }

  private highlightTile(tile: Tile, highlight: boolean): void {
    if (!this.mapSystem) return;
    
    const tileEntities = this.mapSystem.getTileEntities();
    const hexTile = tileEntities.get(tile.getKey());
    
    if (hexTile) {
      hexTile.setSelected(highlight);
    }
  }

  private showSharedEdge(tileA: Tile, tileB: Tile): void {
    if (!this.mapSystem || !this.app || !this.graphicsDevice) return;

    const grid = this.mapSystem.getGrid();
    const sharedEdge = grid.getSharedEdge(tileA, tileB);
    
    if (!sharedEdge) return;

    this.clearEdgeHighlights();

    const hexSize = grid.getHexSize();
    
    const posA = grid.hexToPixel(tileA.q, tileA.r);
    const posB = grid.hexToPixel(tileB.q, tileB.r);

    const edgeAEntities = this.createEdgeHighlight(posA.x, posA.y, sharedEdge.edgeA, hexSize);
    const edgeBEntities = this.createEdgeHighlight(posB.x, posB.y, sharedEdge.edgeB, hexSize);

    edgeAEntities.forEach(entity => this.edgeHighlightEntities.push(entity));
    edgeBEntities.forEach(entity => this.edgeHighlightEntities.push(entity));
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

  private createEdgeHighlight(centerX: number, centerZ: number, edgeIndex: number, hexSize: number): pc.Entity[] {
    if (!this.app || !this.graphicsDevice) return [];

    const entities: pc.Entity[] = [];
    
    const p0 = getHexCorner(edgeIndex, hexSize);
    const p1 = getHexCorner((edgeIndex + 1) % 6, hexSize);

    const prevCorner = getHexCorner((edgeIndex + 5) % 6, hexSize);
    const nextCorner = getHexCorner((edgeIndex + 2) % 6, hexSize);
    
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
    
    const step = hexSize * DebugEdgeSystem.BORDER_STEP_FACTOR;
    const layers = DebugEdgeSystem.BORDER_LAYERS;
    
    const highlightColor = new pc.Color(1, 1, 0);
    
    for (let k = 1; k <= layers; k++) {
      const offset = k * step;
      const alpha = DebugEdgeSystem.BORDER_ALPHA_START * (1 - (k - 1) / layers);
      
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
      material.diffuse = new pc.Color(highlightColor.r, highlightColor.g, highlightColor.b);
      material.useLighting = false;
      material.emissive = new pc.Color(highlightColor.r, highlightColor.g, highlightColor.b);
      material.emissiveIntensity = 2;
      material.opacity = alpha;
      material.blendType = pc.BLEND_NORMAL;
      material.depthWrite = false;
      material.update();
      
      const meshInstance = new pc.MeshInstance(mesh, material);
      
      const entity = new pc.Entity(`DebugEdge_${edgeIndex}_${k}`);
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

  private clearEdgeHighlights(): void {
    this.edgeHighlightEntities.forEach(entity => entity.destroy());
    this.edgeHighlightEntities = [];
  }

  clearSelection(): void {
    this.selectedTiles.forEach(tile => this.highlightTile(tile, false));
    this.selectedTiles = [];
    this.clearEdgeHighlights();
  }

  dispose(): void {
    this.clearSelection();
  }
}
