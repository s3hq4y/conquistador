import { TileInstance } from './SceneData';

export class Tile implements TileInstance {
  q: number;
  r: number;
  terrainId: string;
  ownerId: string;
  building: string | null;
  districtKey: string | null;
  preciousDeposit: boolean;
  oilDeposit: boolean;

  constructor(q: number, r: number) {
    this.q = q;
    this.r = r;
    this.terrainId = 'plains';
    this.ownerId = 'neutral';
    this.building = null;
    this.districtKey = null;
    this.preciousDeposit = false;
    this.oilDeposit = false;
  }

  getKey(): string {
    return `${this.q},${this.r}`;
  }

  static fromKey(key: string): { q: number; r: number } {
    const [q, r] = key.split(',').map(Number);
    return { q, r };
  }

  toJSON(): TileInstance {
    return {
      q: this.q,
      r: this.r,
      terrainId: this.terrainId,
      ownerId: this.ownerId,
      building: this.building,
      districtKey: this.districtKey,
      preciousDeposit: this.preciousDeposit,
      oilDeposit: this.oilDeposit
    };
  }

  static fromJSON(data: TileInstance): Tile {
    const tile = new Tile(data.q, data.r);
    tile.terrainId = data.terrainId;
    tile.ownerId = data.ownerId;
    tile.building = data.building;
    tile.districtKey = data.districtKey;
    tile.preciousDeposit = data.preciousDeposit;
    tile.oilDeposit = data.oilDeposit;
    return tile;
  }
}
