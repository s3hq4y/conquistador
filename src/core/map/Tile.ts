import { TileInstance } from './SceneData';

export class Tile {
  q: number;
  r: number;
  terrain: string;
  owner: string;
  building: string | null;
  district: string | null;
  deposit: string | null;

  constructor(q: number, r: number) {
    this.q = q;
    this.r = r;
    this.terrain = 'plains';
    this.owner = 'neutral';
    this.building = null;
    this.district = null;
    this.deposit = null;
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
      pos: [this.q, this.r],
      components: {
        terrain: this.terrain,
        owner: this.owner,
        building: this.building,
        district: this.district,
        deposit: this.deposit
      }
    };
  }

  static fromJSON(data: TileInstance): Tile {
    const [q, r] = data.pos;
    const tile = new Tile(q, r);
    tile.terrain = data.components.terrain;
    tile.owner = data.components.owner;
    tile.building = data.components.building;
    tile.district = data.components.district;
    tile.deposit = data.components.deposit;
    return tile;
  }
}
