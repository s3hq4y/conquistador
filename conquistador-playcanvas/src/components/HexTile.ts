import * as pc from 'playcanvas';
import { Tile, TerrainType } from '../core/Tile';

const TERRAIN_COLORS: Record<TerrainType, pc.Color> = {
  PLAINS: new pc.Color(0.2, 0.6, 0.2),
  MOUNTAIN: new pc.Color(0.5, 0.5, 0.5),
  DESERT: new pc.Color(0.9, 0.8, 0.4),
  SHALLOW_SEA: new pc.Color(0.2, 0.4, 0.8),
  DEEP_SEA: new pc.Color(0.1, 0.2, 0.6),
  BARRIER_MOUNTAIN: new pc.Color(0.3, 0.3, 0.3)
};

const OWNER_COLORS: Record<string, pc.Color> = {
  Player: new pc.Color(0.2, 0.6, 1.0),
  Enemy: new pc.Color(1.0, 0.2, 0.2),
  Neutral: new pc.Color(0.5, 0.5, 0.5)
};

export class HexTile {
  private entity: pc.Entity;
  private material: pc.StandardMaterial;
  private meshInstance!: pc.MeshInstance;

  constructor(app: pc.Application, tile: Tile, hexSize: number) {
    this.entity = new pc.Entity(`Tile_${tile.q}_${tile.r}`);
    
    const terrainColor = TERRAIN_COLORS[tile.terrain] || TERRAIN_COLORS.PLAINS;
    
    this.material = new pc.StandardMaterial();
    this.material.diffuse = terrainColor;
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

    // Rotate 30 degrees to match HexGrid's flat-topped layout
    this.entity.setLocalEulerAngles(0, 30, 0);
  }

  private createHexGeometry(device: pc.GraphicsDevice, hexSize: number): void {
    const geometry = new pc.CylinderGeometry({
      // Keep radius aligned with HexGrid.hexToPixel() spacing to avoid triangular gaps.
      radius: hexSize,
      height: Math.max(2, hexSize * 0.08),
      heightSegments: 1,
      capSegments: 6
    });
    const mesh = pc.Mesh.fromGeometry(device, geometry);

    this.meshInstance = new pc.MeshInstance(mesh, this.material);
  }

  setPosition(x: number, y: number): void {
    this.entity.setLocalPosition(x, 0, y);
  }

  setSelected(selected: boolean): void {
    if (selected) {
      this.material.emissiveIntensity = 1.3;
    } else {
      this.material.emissiveIntensity = 1;
    }
    this.material.update();
  }

  setOwner(owner: string): void {
    const ownerColor = OWNER_COLORS[owner] || OWNER_COLORS.Neutral;
    this.material.diffuse = ownerColor;
    this.material.emissive = ownerColor.clone();
    this.material.update();
  }

  getEntity(): pc.Entity {
    return this.entity;
  }
}
