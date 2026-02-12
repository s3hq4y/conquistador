import * as pc from 'playcanvas';
import { Tile } from '../core/Tile';
import { TerrainTypeDefinition, OwnerTagDefinition, hexToRgb } from '../core/SceneData';

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

  constructor(
    app: pc.Application, 
    tile: Tile, 
    hexSize: number,
    terrainDef: TerrainTypeDefinition,
    _ownerDef: OwnerTagDefinition
  ) {
    this.entity = new pc.Entity(`Tile_${tile.q}_${tile.r}`);
    this.tile = tile;
    
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

  setPosition(x: number, y: number): void {
    this.entity.setLocalPosition(x, 0, y);
  }

  setSelected(selected: boolean): void {
    this.selected = selected;
    this.updateEmissive();
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
    this.tile.terrainId = terrainDef.id;
    const terrainColor = hexToPlayCanvas(terrainDef.color);
    this.material.diffuse = terrainColor.clone();
    this.material.emissive = terrainColor.clone();
    this.updateEmissive();
  }

  setOwner(ownerDef: OwnerTagDefinition): void {
    this.tile.ownerId = ownerDef.id;
  }

  getTile(): Tile {
    return this.tile;
  }

  getEntity(): pc.Entity {
    return this.entity;
  }

  destroy(): void {
    this.entity.destroy();
  }
}
