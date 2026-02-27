import { GameSystem } from '../../core/systems';
import type { GameEngine } from '../../core/engine';
import { MapSystem, MovementSystem, UnitRenderSystem } from '../../core/systems';
import type { UnitInstance } from '../../core/map';
import { TraitManager } from '../../core/traits/TraitManager';
import { useGameEventStore, type TileUnitInfo } from '../../stores/gameEvent';
import { debug } from '../../core/utils/debug';

export class SelectionSystem extends GameSystem {
  private mapSystem: MapSystem | null = null;
  private movementSystem: MovementSystem | null = null;
  private unitRenderSystem: UnitRenderSystem | null = null;
  private traitManager: TraitManager | null = null;
  private selectedTileKey: string | null = null;
  private attackableTiles: Set<string> = new Set();
  private gameEventStore = useGameEventStore();

  private getCurrentPlayerIdFn: (() => string) | null = null;
  private getUnitRangeFn: ((unit: UnitInstance) => number) | null = null;

  constructor(engine: GameEngine) {
    super(engine);
  }

  async initialize(): Promise<void> {
    this.mapSystem = this.engine.getSystems().find(s => s instanceof MapSystem) as MapSystem;
    this.movementSystem = this.engine.getSystems().find(s => s instanceof MovementSystem) as MovementSystem;
    this.unitRenderSystem = this.engine.getSystems().find(s => s instanceof UnitRenderSystem) as UnitRenderSystem;
  }

  setDependencies(
    getCurrentPlayerIdFn: () => string,
    getUnitRangeFn: (unit: UnitInstance) => number,
    traitManager: TraitManager
  ): void {
    this.getCurrentPlayerIdFn = getCurrentPlayerIdFn;
    this.getUnitRangeFn = getUnitRangeFn;
    this.traitManager = traitManager;
  }

  private getCurrentPlayerId(): string {
    return this.getCurrentPlayerIdFn?.() ?? 'player';
  }

  private getUnitRange(unit: UnitInstance): number {
    return this.getUnitRangeFn?.(unit) ?? 1;
  }

  isCurrentPlayerUnit(unit: UnitInstance): boolean {
    return unit.owner === this.getCurrentPlayerId();
  }

  selectUnit(unit: UnitInstance): void {
    if (!this.unitRenderSystem || !this.traitManager) return;

    this.clearAttackHighlights();
    this.unitRenderSystem.selectUnit(unit.id);

    const unitStats = this.traitManager.calculateStats(unit.traits, this.calculateUnitStateValues(unit));
    const maxHp = this.getUnitMaxHp(unit);

    this.gameEventStore.selectUnit({
      id: unit.id,
      type: unit.traits?.[0] || 'infantry',
      owner: unit.owner,
      hp: unit.hp,
      maxHp: maxHp,
      attack: unitStats?.attack || 0,
      defense: unitStats?.defense || 0,
      movement: unitStats?.movement || 0,
      range: unitStats?.range || 1,
      traits: unit.traits || []
    }, {
      hp: maxHp,
      attack: unitStats?.attack || 0,
      defense: unitStats?.defense || 0,
      movement: unitStats?.movement || 0,
      range: unitStats?.range || 1
    });

    this.highlightAttackableTiles(unit);
    debug.selection('Selected unit:', unit.id, 'owner:', unit.owner, 'currentPlayerId:', this.getCurrentPlayerId());
  }

  selectEnemyUnit(unit: UnitInstance): void {
    if (!this.traitManager) return;

    const unitStats = this.traitManager.calculateStats(unit.traits, this.calculateUnitStateValues(unit));
    const maxHp = this.getUnitMaxHp(unit);

    this.gameEventStore.selectUnit({
      id: unit.id,
      type: unit.traits?.[0] || 'infantry',
      owner: unit.owner,
      hp: unit.hp,
      maxHp: maxHp,
      attack: unitStats?.attack || 0,
      defense: unitStats?.defense || 0,
      movement: unitStats?.movement || 0,
      range: unitStats?.range || 1,
      traits: unit.traits || []
    }, {
      hp: maxHp,
      attack: unitStats?.attack || 0,
      defense: unitStats?.defense || 0,
      movement: unitStats?.movement || 0,
      range: unitStats?.range || 1
    });
  }

  deselectUnit(): void {
    this.unitRenderSystem?.selectUnit(null);
    this.clearAttackHighlights();
  }

  selectTile(key: string, q: number, r: number): void {
    this.clearTileSelection();
    this.selectedTileKey = key;

    if (this.mapSystem) {
      const tileEntities = this.mapSystem.getTileEntities();
      const hexTile = tileEntities.get(key);
      if (hexTile) {
        hexTile.setSelected(true);
        
        const tile = hexTile.getTile();
        const capacity = this.movementSystem?.getTileCapacity(q, r) || null;
        
        this.gameEventStore.selectTile({
          q: tile.q,
          r: tile.r,
          terrain: tile.terrain || 'plains',
          owner: tile.owner || 'neutral',
          capacity: capacity || undefined
        });
        
        const unitsOnTile = this.movementSystem?.getUnitsAt(q, r) || [];
        if (unitsOnTile.length > 1) {
          this.showTileUnitsPanel(q, r, unitsOnTile);
        } else if (unitsOnTile.length === 1) {
          const unit = unitsOnTile[0];
          if (this.isCurrentPlayerUnit(unit)) {
            this.selectUnit(unit);
          } else {
            this.selectEnemyUnit(unit);
          }
        }
        
        debug.selection('Selected tile:', q, r, 'terrain:', tile.terrain, 'owner:', tile.owner, 'units:', unitsOnTile.length);
      }
    }
  }

  private showTileUnitsPanel(q: number, r: number, units: UnitInstance[]): void {
    if (!this.traitManager) return;

    const tileUnits: TileUnitInfo[] = units.map(unit => {
      const maxHp = this.getUnitMaxHp(unit);
      return {
        id: unit.id,
        type: unit.traits?.[0] || 'infantry',
        owner: unit.owner,
        hp: unit.hp,
        maxHp: maxHp,
        traits: unit.traits || [],
        isTop: false
      };
    });

    const tile = this.movementSystem?.getTileAt(q, r);
    if (tile && tile.unitOrder.length > 0) {
      const topUnitId = tile.unitOrder[0];
      const topUnit = tileUnits.find(u => u.id === topUnitId);
      if (topUnit) {
        topUnit.isTop = true;
      }
    }

    this.gameEventStore.selectTileUnits(tileUnits, { q, r });
    debug.selection('Show tile units panel:', q, r, 'units:', units.map(u => u.id).join(', '));
  }

  setTopUnit(unitId: string): void {
    if (!this.movementSystem || !this.selectedTileKey) return;

    const [q, r] = this.selectedTileKey.split(',').map(Number);
    const units = this.movementSystem.getUnitsAt(q, r);
    const currentOrder = units.map(u => u.id);
    
    const currentIndex = currentOrder.indexOf(unitId);
    if (currentIndex <= 0) return;

    const newOrder = [unitId];
    for (const id of currentOrder) {
      if (id !== unitId) {
        newOrder.push(id);
      }
    }

    this.movementSystem.reorderUnitsOnTile(q, r, newOrder);
    this.gameEventStore.reorderTileUnits(newOrder);

    const unit = this.movementSystem.getUnit(unitId);
    if (unit && this.isCurrentPlayerUnit(unit)) {
      this.selectUnit(unit);
    }

    debug.selection('Set top unit:', unitId);
  }

  handleTileUnitSelected(unitId: string): void {
    if (!this.movementSystem) return;

    const unit = this.movementSystem.getUnit(unitId);
    if (!unit) return;

    this.gameEventStore.clearTileUnits();

    if (this.isCurrentPlayerUnit(unit)) {
      this.selectUnit(unit);
    } else {
      this.selectEnemyUnit(unit);
    }
  }

  clearTileSelection(): void {
    if (this.selectedTileKey && this.mapSystem) {
      const tileEntities = this.mapSystem.getTileEntities();
      const hexTile = tileEntities.get(this.selectedTileKey);
      if (hexTile) {
        hexTile.setSelected(false);
      }
    }
    this.selectedTileKey = null;
    this.gameEventStore.clearTileSelection();
    this.gameEventStore.clearTileUnits();
  }

  clearSelection(): void {
    this.clearTileSelection();
    this.clearAttackHighlights();
  }

  highlightAttackableTiles(unit: UnitInstance): void {
    if (!this.mapSystem || !this.movementSystem) return;

    if (!this.movementSystem.canAttack(unit.id)) {
      this.attackableTiles.clear();
      return;
    }

    this.attackableTiles.clear();
    const unitRange = this.getUnitRange(unit);
    const unitPos = { q: unit.q, r: unit.r };

    for (let q = unitPos.q - unitRange; q <= unitPos.q + unitRange; q++) {
      for (let r = unitPos.r - unitRange; r <= unitPos.r + unitRange; r++) {
        const distance = (Math.abs(q - unitPos.q) + Math.abs(q + r - unitPos.q - unitPos.r) + Math.abs(r - unitPos.r)) / 2;
        if (distance <= unitRange && distance > 0) {
          const targetUnit = this.movementSystem.getUnitAt(q, r);
          if (targetUnit && targetUnit.owner !== unit.owner) {
            const tileKey = `${q},${r}`;
            this.attackableTiles.add(tileKey);
            const tileEntities = this.mapSystem.getTileEntities();
            const hexTile = tileEntities.get(tileKey);
            if (hexTile) {
              hexTile.setAttackableHighlight(true);
            }
          }
        }
      }
    }
  }

  clearAttackHighlights(): void {
    if (!this.mapSystem) return;

    for (const key of this.attackableTiles) {
      const tileEntities = this.mapSystem.getTileEntities();
      const hexTile = tileEntities.get(key);
      if (hexTile) {
        hexTile.setAttackableHighlight(false);
      }
    }
    this.attackableTiles.clear();
  }

  isTileAttackable(tileKey: string): boolean {
    return this.attackableTiles.has(tileKey);
  }

  getSelectedUnitId(): string | null {
    return this.unitRenderSystem?.getSelectedUnitId() ?? null;
  }

  getReachableTiles(): Set<string> {
    return this.unitRenderSystem?.getReachableTiles() ?? new Set();
  }

  private calculateUnitStateValues(unit: UnitInstance): Map<string, number> {
    if (!this.traitManager) return new Map();

    const baseStats = this.traitManager.calculateStats(unit.traits);
    const maxHp = baseStats.hp ?? unit.hp;
    const hpPercent = (unit.hp / maxHp) * 100;

    const stateValues = new Map<string, number>();
    stateValues.set('hp', hpPercent);

    return stateValues;
  }

  private getUnitMaxHp(unit: UnitInstance): number {
    if (!this.traitManager) return unit.hp;
    const baseStats = this.traitManager.calculateStats(unit.traits);
    return baseStats.hp ?? unit.hp;
  }

  update(_dt: number): void {
  }

  dispose(): void {
    this.clearSelection();
  }
}
