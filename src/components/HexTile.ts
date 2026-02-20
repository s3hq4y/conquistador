import * as pc from 'playcanvas';
import { Tile, TerrainTypeDefinition, OwnerTagDefinition, hexToRgb } from '../core/map';

function hexToPlayCanvas(hex: string): pc.Color {
  const rgb = hexToRgb(hex);
  return new pc.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255);
}

export class HexTile {
  private entity: pc.Entity;
  private material: pc.StandardMaterial;
  private meshInstance!: pc.MeshInstance;
  private tile: Tile;
  private selected: boolean = false;
  private hovered: boolean = false;
  private borderEntities: pc.Entity[] = [];
  private reachableHighlight: pc.Entity | null = null;
  private attackableHighlight: pc.Entity | null = null;
  private selectedBorderEntities: pc.Entity[] = [];
  private ownerDef: OwnerTagDefinition | null = null;
  private borderEdges: number[] = [];
  private hexSize: number = 0;
  private graphicsDevice: pc.GraphicsDevice | null = null;

  private static readonly BORDER_LAYERS = 6;
  private static readonly BORDER_STEP_FACTOR = 0.05;
  private static readonly BORDER_ALPHA_START = 0.45;

  constructor(
    app: pc.Application, 
    tile: Tile, 
    hexSize: number,
    terrainDef: TerrainTypeDefinition,
    ownerDef: OwnerTagDefinition
  ) {
    this.entity = new pc.Entity(`Tile_${tile.q}_${tile.r}`);
    this.tile = tile;
    this.ownerDef = ownerDef;
    this.hexSize = hexSize;
    this.graphicsDevice = app.graphicsDevice;
    
    const terrainColor = hexToPlayCanvas(terrainDef.color);
    
    this.material = new pc.StandardMaterial();
    this.material.diffuse = terrainColor.clone();
    this.material.useLighting = false;
    this.material.emissive = terrainColor.clone();
    this.material.emissiveIntensity = 1;
    this.material.opacity = 1.0;
    this.material.update();

    this.createHexGeometry(app.graphicsDevice, hexSize);

    this.entity.addComponent('render', {
      meshInstances: [this.meshInstance],
      castShadows: false,
      receiveShadows: false
    });

    this.entity.setLocalEulerAngles(0, 30, 0);

    const label = new pc.Entity();
    label.name = `label_${tile.q}_${tile.r}`;
    this.entity.addChild(label);
  }

  private createHexGeometry(device: pc.GraphicsDevice, hexSize: number): void {
    const geometry = new pc.CylinderGeometry({
      radius: hexSize,
      height: Math.max(2, hexSize * 0.08),
      heightSegments: 1,
      capSegments: 6
    });
    const mesh = pc.Mesh.fromGeometry(device, geometry);

    this.meshInstance = new pc.MeshInstance(mesh, this.material);
  }

  private getHexCorner(index: number): { x: number; z: number } {
    const angleDeg = 60 * index - 30;
    const angleRad = Math.PI / 180 * angleDeg;
    return {
      x: this.hexSize * Math.cos(angleRad),
      z: this.hexSize * Math.sin(angleRad)
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

  private createBorderTrapezoids(edgeIndex: number, ownerColor: pc.Color, overrideAlpha?: number): pc.Entity[] {
    const entities: pc.Entity[] = [];
    
    const p0 = this.getHexCorner(edgeIndex);
    const p1 = this.getHexCorner((edgeIndex + 1) % 6);
    
    const prevCorner = this.getHexCorner((edgeIndex + 5) % 6);
    const nextCorner = this.getHexCorner((edgeIndex + 2) % 6);
    
    const ex = p1.x - p0.x;
    const ez = p1.z - p0.z;
    const edgeLen = Math.max(1e-6, Math.hypot(ex, ez));
    
    let nx = -ez / edgeLen;
    let nz = ex / edgeLen;
    
    const centerX = 0;
    const centerZ = 0;
    const midX = (p0.x + p1.x) / 2;
    const midZ = (p0.z + p1.z) / 2;
    const dot = nx * (centerX - midX) + nz * (centerZ - midZ);
    
    if (dot < 0) {
      nx = -nx;
      nz = -nz;
    }
    
    const tx = ex / edgeLen;
    const tz = ez / edgeLen;
    
    const step = this.hexSize * HexTile.BORDER_STEP_FACTOR;
    const layers = HexTile.BORDER_LAYERS;
    
    for (let k = 1; k <= layers; k++) {
      const offset = k * step;
      const alpha = overrideAlpha !== undefined ? overrideAlpha : HexTile.BORDER_ALPHA_START * (1 - (k - 1) / layers);
      
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
      material.diffuse = new pc.Color(ownerColor.r, ownerColor.g, ownerColor.b);
      material.useLighting = false;
      material.emissive = new pc.Color(ownerColor.r, ownerColor.g, ownerColor.b);
      material.emissiveIntensity = 1;
      material.opacity = alpha;
      material.blendType = pc.BLEND_NORMAL;
      material.depthWrite = false;
      material.update();
      
      const meshInstance = new pc.MeshInstance(mesh, material);
      
      const entity = new pc.Entity(`BorderTrapezoid_${this.tile.q}_${this.tile.r}_${edgeIndex}_${k}`);
      entity.addComponent('render', {
        meshInstances: [meshInstance],
        castShadows: false,
        receiveShadows: false
      });
      
      entity.setLocalPosition(0, 2, 0);
      entity.enabled = true;
      
      entities.push(entity);
    }
    
    return entities;
  }

  private clearBorderEntities(): void {
    this.borderEntities.forEach(entity => entity.destroy());
    this.borderEntities = [];
  }

  private ensureBorderEntities(): void {
    this.clearBorderEntities();
    
    if (!this.graphicsDevice || !this.ownerDef || this.ownerDef.id === 'neutral') {
      return;
    }
    
    if (this.borderEdges.length === 0) {
      return;
    }
    
    const ownerColor = hexToPlayCanvas(this.ownerDef.color);
    
    for (const edgeIndex of this.borderEdges) {
      const trapezoids = this.createBorderTrapezoids(edgeIndex, ownerColor);
      trapezoids.forEach(entity => {
        this.entity.addChild(entity);
        this.borderEntities.push(entity);
      });
    }
  }

  setPosition(x: number, y: number): void {
    this.entity.setLocalPosition(x, 0, y);
  }

  setSelected(selected: boolean): void {
    this.selected = selected;
    if (selected) {
      this.showSelectedBorder();
    } else {
      this.hideSelectedBorder();
    }
  }

  setHovered(hovered: boolean): void {
    this.hovered = hovered;
    this.updateEmissive();
  }

  private updateEmissive(): void {
    let intensity = 1;
    if (this.selected) {
      intensity = 1.5;
    } else if (this.hovered) {
      intensity = 1.2;
    }
    this.material.emissiveIntensity = intensity;
    this.material.update();
  }

  setTerrain(terrainDef: TerrainTypeDefinition): void {
    this.tile.terrain = terrainDef.id;
    const terrainColor = hexToPlayCanvas(terrainDef.color);
    this.material.diffuse = terrainColor.clone();
    this.material.emissive = terrainColor.clone();
    this.updateEmissive();
  }

  setOwner(ownerDef: OwnerTagDefinition): void {
    this.tile.owner = ownerDef.id;
    this.ownerDef = ownerDef;
  }

  setBorderState(_isBorder: boolean, _distanceFromBorder: number, borderEdges?: number[]): void {
    this.borderEdges = borderEdges || [];
    this.ensureBorderEntities();
  }

  setReachableHighlight(enabled: boolean): void {
    if (!this.graphicsDevice) return;

    if (enabled && !this.reachableHighlight) {
      const material = new pc.StandardMaterial();
      material.diffuse = new pc.Color(0, 0.8, 0);
      material.useLighting = false;
      material.emissive = new pc.Color(0, 0.8, 0);
      material.emissiveIntensity = 0.5;
      material.opacity = 0.3;
      material.blendType = pc.BLEND_NORMAL;
      material.depthWrite = false;
      material.update();

      const geometry = new pc.CylinderGeometry({
        radius: this.hexSize * 0.85,
        height: 1,
        heightSegments: 1,
        capSegments: 6
      });
      const mesh = pc.Mesh.fromGeometry(this.graphicsDevice, geometry);
      const meshInstance = new pc.MeshInstance(mesh, material);

      this.reachableHighlight = new pc.Entity(`Reachable_${this.tile.q}_${this.tile.r}`);
      this.reachableHighlight.addComponent('render', {
        meshInstances: [meshInstance],
        castShadows: false,
        receiveShadows: false
      });
      this.reachableHighlight.setLocalPosition(0, 1.5, 0);
      this.entity.addChild(this.reachableHighlight);
    } else if (!enabled && this.reachableHighlight) {
      this.reachableHighlight.destroy();
      this.reachableHighlight = null;
    }
  }

  setAttackableHighlight(enabled: boolean): void {
    if (!this.graphicsDevice) return;

    if (enabled && !this.attackableHighlight) {
      const material = new pc.StandardMaterial();
      material.diffuse = new pc.Color(1, 0.2, 0);
      material.useLighting = false;
      material.emissive = new pc.Color(1, 0.2, 0);
      material.emissiveIntensity = 0.5;
      material.opacity = 0.4;
      material.blendType = pc.BLEND_NORMAL;
      material.depthWrite = false;
      material.update();

      const geometry = new pc.CylinderGeometry({
        radius: this.hexSize * 0.85,
        height: 1,
        heightSegments: 1,
        capSegments: 6
      });
      const mesh = pc.Mesh.fromGeometry(this.graphicsDevice, geometry);
      const meshInstance = new pc.MeshInstance(mesh, material);

      this.attackableHighlight = new pc.Entity(`Attackable_${this.tile.q}_${this.tile.r}`);
      this.attackableHighlight.addComponent('render', {
        meshInstances: [meshInstance],
        castShadows: false,
        receiveShadows: false
      });
      this.attackableHighlight.setLocalPosition(0, 1.5, 0);
      this.entity.addChild(this.attackableHighlight);
    } else if (!enabled && this.attackableHighlight) {
      this.attackableHighlight.destroy();
      this.attackableHighlight = null;
    }
  }

  private showSelectedBorder(): void {
    this.hideSelectedBorder();
    if (!this.graphicsDevice) return;

    const selectedColor = new pc.Color(1, 1, 0);

    for (let edgeIndex = 0; edgeIndex < 6; edgeIndex++) {
      const trapezoids = this.createBorderTrapezoids(edgeIndex, selectedColor, 0.7);
      trapezoids.forEach(entity => {
        this.entity.addChild(entity);
        this.selectedBorderEntities.push(entity);
      });
    }
  }

  private hideSelectedBorder(): void {
    this.selectedBorderEntities.forEach(entity => entity.destroy());
    this.selectedBorderEntities = [];
  }

  getTile(): Tile {
    return this.tile;
  }

  getEntity(): pc.Entity {
    return this.entity;
  }

  destroy(): void {
    this.clearBorderEntities();
    this.hideSelectedBorder();
    if (this.reachableHighlight) {
      this.reachableHighlight.destroy();
      this.reachableHighlight = null;
    }
    if (this.attackableHighlight) {
      this.attackableHighlight.destroy();
      this.attackableHighlight = null;
    }
    this.entity.destroy();
  }
}
