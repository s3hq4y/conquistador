import { TileInstance } from './SceneData';

export type UnitCategory = 'army' | 'building';

export class Tile {
  q: number;
  r: number;
  terrain: string;
  owner: string;
  building: string | null;
  district: string | null;
  deposit: string | null;
  capacity: {
    army: number;
    building: number;
  };
  unitOrder: string[];

  constructor(q: number, r: number) {
    this.q = q;
    this.r = r;
    this.terrain = 'plains';
    this.owner = 'neutral';
    this.building = null;
    this.district = null;
    this.deposit = null;
    this.capacity = { army: 1, building: 1 };
    this.unitOrder = [];
  }

  getKey(): string {
    return `${this.q},${this.r}`;
  }

  static fromKey(key: string): { q: number; r: number } {
    const [q, r] = key.split(',').map(Number);
    return { q, r };
  }

  getArmyCount(): number {
    return this.unitOrder.length;
  }

  getBuildingCount(): number {
    return this.building ? 1 : 0;
  }

  getArmyCapacity(): number {
    return this.capacity.army;
  }

  getBuildingCapacity(): number {
    return this.capacity.building;
  }

  canAddArmy(): boolean {
    return this.getArmyCount() < this.capacity.army;
  }

  canAddBuilding(): boolean {
    return this.getBuildingCount() < this.capacity.building;
  }

  getTopUnitId(): string | null {
    return this.unitOrder.length > 0 ? this.unitOrder[0] : null;
  }

  addUnit(unitId: string): boolean {
    if (!this.canAddArmy()) return false;
    if (this.unitOrder.includes(unitId)) return false;
    this.unitOrder.push(unitId);
    return true;
  }

  removeUnit(unitId: string): boolean {
    const index = this.unitOrder.indexOf(unitId);
    if (index === -1) return false;
    this.unitOrder.splice(index, 1);
    return true;
  }

  setUnitOrder(order: string[]): void {
    this.unitOrder = [...order];
  }

  hasMultipleUnits(): boolean {
    return this.unitOrder.length > 1;
  }

  toJSON(): TileInstance {
    return {
      pos: [this.q, this.r],
      components: {
        terrain: this.terrain,
        owner: this.owner,
        building: this.building,
        district: this.district,
        deposit: this.deposit,
        capacity: this.capacity,
        unitOrder: this.unitOrder.length > 0 ? this.unitOrder : undefined
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
    if (data.components.capacity) {
      tile.capacity = data.components.capacity;
    }
    if (data.components.unitOrder && data.components.unitOrder.length > 0) {
      tile.unitOrder = data.components.unitOrder;
    }
    return tile;
  }
}
