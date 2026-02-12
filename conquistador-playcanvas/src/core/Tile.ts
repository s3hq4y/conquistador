export type TerrainType = 'PLAINS' | 'MOUNTAIN' | 'DESERT' | 'SHALLOW_SEA' | 'DEEP_SEA' | 'BARRIER_MOUNTAIN';

export interface TileData {
  q: number;
  r: number;
  terrain: TerrainType;
  owner: string;
  building: string | null;
  districtKey: string | null;
  preciousDeposit: boolean;
  oilDeposit: boolean;
}

export class Tile implements TileData {
  q: number;
  r: number;
  terrain: TerrainType;
  owner: string;
  building: string | null;
  districtKey: string | null;
  preciousDeposit: boolean;
  oilDeposit: boolean;

  constructor(q: number, r: number) {
    this.q = q;
    this.r = r;
    this.terrain = 'PLAINS';
    this.owner = 'Neutral';
    this.building = null;
    this.districtKey = null;
    this.preciousDeposit = false;
    this.oilDeposit = false;
  }

  getKey(): string {
    return `${this.q},${this.r}`;
  }
}
