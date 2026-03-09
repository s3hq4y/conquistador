/**
 * UnitManager - 单位管理模块
 * 
 * 管理单位的 CRUD 操作和位置查询
 */

import type { UnitInstance } from '../../map/SceneData';
import type { Tile } from '../../map';

export class UnitManager {
  private units: Map<string, UnitInstance> = new Map();

  getAll(): UnitInstance[] {
    return Array.from(this.units.values());
  }

  get(id: string): UnitInstance | undefined {
    return this.units.get(id);
  }

  getAt(q: number, r: number): UnitInstance | undefined {
    for (const unit of this.units.values()) {
      if (unit.q === q && unit.r === r) {
        return unit;
      }
    }
    return undefined;
  }

  getAllAt(q: number, r: number): UnitInstance[] {
    return Array.from(this.units.values()).filter(u => u.q === q && u.r === r);
  }

  getTopAt(tile: Tile | undefined): UnitInstance | undefined {
    if (!tile || tile.unitOrder.length === 0) return undefined;
    const topUnitId = tile.unitOrder[0];
    return this.units.get(topUnitId);
  }

  getByOwner(owner: string): UnitInstance[] {
    return Array.from(this.units.values()).filter(u => u.owner === owner);
  }

  add(unit: UnitInstance): void {
    this.units.set(unit.id, { ...unit });
  }

  remove(id: string): UnitInstance | undefined {
    const unit = this.units.get(id);
    this.units.delete(id);
    return unit;
  }

  updatePosition(id: string, q: number, r: number): boolean {
    const unit = this.units.get(id);
    if (!unit) return false;
    unit.q = q;
    unit.r = r;
    return true;
  }

  has(id: string): boolean {
    return this.units.has(id);
  }

  clear(): void {
    this.units.clear();
  }

  getCount(): number {
    return this.units.size;
  }
}
