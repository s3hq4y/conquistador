import { GameSystem } from '../core/systems';
import type { GameEngine } from '../core/engine';
import { MapSystem, MovementSystem, UnitRenderSystem, EdgeSystem } from '../core/systems';
import type { SceneData } from '../core/map';
import type { OwnerStates } from '../stores/game';
import { useGameStore } from '../stores/game';
import { useGameEventStore } from '../stores/gameEvent';
import { CombatSystem } from '../core/traits/CombatSystem';
import { TraitManager } from '../core/traits/TraitManager';
import type { UnitInstance } from '../core/map';
import { debug } from '../core/utils/debug';

declare global {
  interface Window {
    __setOwnerStates?: (states: OwnerStates) => void;
    __endTurn?: () => void;
  }
}

export class GameModeSystem extends GameSystem {
  private mapSystem: MapSystem | null = null;
  private movementSystem: MovementSystem | null = null;
  private edgeSystem: EdgeSystem | null = null;
  private unitRenderSystem: UnitRenderSystem | null = null;
  private selectedTileKey: string | null = null;
  private currentTurn: number = 1;
  private combatSystem: CombatSystem | null = null;
  private traitManager: TraitManager | null = null;
  private attackableTiles: Set<string> = new Set();
  private gameStore = useGameStore();
  private gameEventStore = useGameEventStore();

  constructor(engine: GameEngine) {
    super(engine);
  }

  async initialize(): Promise<void> {
    this.mapSystem = this.engine.getSystems().find(s => s instanceof MapSystem) as MapSystem;
    this.movementSystem = this.engine.getSystems().find(s => s instanceof MovementSystem) as MovementSystem;
    this.edgeSystem = this.engine.getSystems().find(s => s instanceof EdgeSystem) as EdgeSystem;
    this.unitRenderSystem = this.engine.getSystems().find(s => s instanceof UnitRenderSystem) as UnitRenderSystem;

    const eventBus = this.engine.getEventBus();
    
    eventBus.on('trait:ready', (...args: unknown[]) => {
      const manager = args[0] as TraitManager;
      this.traitManager = manager;
      this.combatSystem = new CombatSystem(manager);
    });

    const editorSystem = this.engine.getSystems().find(s => s.constructor.name === 'EditorSystem');
    if (editorSystem) {
      const traitManagerProp = (editorSystem as any).traitManager;
      if (traitManagerProp) {
        this.traitManager = traitManagerProp;
        this.combatSystem = new CombatSystem(traitManagerProp);

      }
    }

    if (!this.traitManager) {
      this.traitManager = new TraitManager();
      this.combatSystem = new CombatSystem(this.traitManager);
      console.log('[GameModeSystem] Created new TraitManager');
    }

    this.setupInputHandlers();

    window.__endTurn = () => this.endTurn();
    
    await this.loadDemoScene();
  }

  private setupInputHandlers(): void {
    const eventBus = this.engine.getEventBus();

    console.log('GameModeSystem: Setting up input handlers');
    
    eventBus.on('mousedown', (...args: unknown[]) => {
      console.log('GameModeSystem: mousedown event received');
      const e = args[0] as MouseEvent;
      this.handleMouseDown(e);
    });
  }

  private isCurrentPlayerUnit(unit: UnitInstance): boolean {
    return unit.owner === this.getCurrentPlayerId();
  }

  private handleMouseDown(e: MouseEvent): void {
    if (!this.mapSystem || !this.movementSystem || !this.unitRenderSystem) return;
    if (e.button !== 0) return;

    const camera = this.engine.getCamera();
    const worldPos = camera.screenToWorld(e.clientX, e.clientY);
    const grid = this.mapSystem.getGrid();
    const hexPos = grid.pixelToHex(worldPos.x, worldPos.z);
    const tileKey = `${hexPos.q},${hexPos.r}`;

    const clickedUnit = this.movementSystem.getUnitAt(hexPos.q, hexPos.r);

    if (clickedUnit) {
      if (this.isCurrentPlayerUnit(clickedUnit)) {
        this.clearTileSelection();
        this.clearAttackHighlights();
        this.unitRenderSystem.selectUnit(clickedUnit.id);
        debug.selection('Selected own unit:', clickedUnit.id, 'at', hexPos.q, hexPos.r, 'owner:', clickedUnit.owner, 'currentPlayerId:', this.getCurrentPlayerId());
        
        const unitStats = this.traitManager ? this.traitManager.calculateStats(clickedUnit.traits) : null;
        const maxHp = unitStats?.hp || clickedUnit.hp;
        this.gameEventStore.selectUnit({
          id: clickedUnit.id,
          type: clickedUnit.traits?.[0] || 'infantry',
          owner: clickedUnit.owner,
          hp: clickedUnit.hp,
          maxHp: maxHp,
          attack: unitStats?.attack || 0,
          defense: unitStats?.defense || 0,
          movement: unitStats?.movement || 0,
          range: unitStats?.range || 1,
          traits: clickedUnit.traits || []
        }, {
          hp: maxHp,
          attack: unitStats?.attack || 0,
          defense: unitStats?.defense || 0,
          movement: unitStats?.movement || 0,
          range: unitStats?.range || 1
        });
        
        this.highlightAttackableTiles(clickedUnit);
        return;
      } else {
        const unitStats = this.traitManager ? this.traitManager.calculateStats(clickedUnit.traits) : null;
        const maxHp = unitStats?.hp || clickedUnit.hp;
        this.gameEventStore.selectUnit({
          id: clickedUnit.id,
          type: clickedUnit.traits?.[0] || 'infantry',
          owner: clickedUnit.owner,
          hp: clickedUnit.hp,
          maxHp: maxHp,
          attack: unitStats?.attack || 0,
          defense: unitStats?.defense || 0,
          movement: unitStats?.movement || 0,
          range: unitStats?.range || 1,
          traits: clickedUnit.traits || []
        }, {
          hp: maxHp,
          attack: unitStats?.attack || 0,
          defense: unitStats?.defense || 0,
          movement: unitStats?.movement || 0,
          range: unitStats?.range || 1
        });
        
        if (this.attackableTiles.has(tileKey)) {
          this.executeAttack(this.unitRenderSystem.getSelectedUnitId()!, clickedUnit);
          return;
        }
      }
    }

    const reachableTiles = this.unitRenderSystem.getReachableTiles();

    if (reachableTiles.has(tileKey)) {
      const success = this.unitRenderSystem.moveSelectedUnit(hexPos.q, hexPos.r);
      if (success) {
        debug.movement('Moved to', hexPos.q, hexPos.r);
        const selectedId = this.unitRenderSystem.getSelectedUnitId();
        if (selectedId) {
          this.unitRenderSystem.selectUnit(selectedId);
          const unit = this.movementSystem?.getUnit(selectedId);
          if (unit && this.movementSystem?.canAttack(unit.id)) {
            this.highlightAttackableTiles(unit);
          }
        }
      }
      return;
    }

    this.unitRenderSystem.selectUnit(null);
    this.clearAttackHighlights();
    this.selectTile(tileKey, hexPos.q, hexPos.r);
  }

  private highlightAttackableTiles(unit: UnitInstance): void {
    if (!this.mapSystem || !this.movementSystem) return;

    if (!this.movementSystem.canAttack(unit.id)) {
      this.attackableTiles.clear();
      return;
    }

    this.attackableTiles.clear();
    const unitRange = this.getUnitRange(unit);
    debug.selection('Unit range:', unitRange, 'for unit:', unit.id);
    const unitPos = { q: unit.q, r: unit.r };

    for (let q = unitPos.q - unitRange; q <= unitPos.q + unitRange; q++) {
      for (let r = unitPos.r - unitRange; r <= unitPos.r + unitRange; r++) {
        const distance = (Math.abs(q - unitPos.q) + Math.abs(q + r - unitPos.q - unitPos.r) + Math.abs(r - unitPos.r)) / 2;
        debug.selection('Checking tile:', q, r, 'distance:', distance);
        if (distance <= unitRange && distance > 0) {
          const targetUnit = this.movementSystem.getUnitAt(q, r);
          debug.selection('  has unit:', targetUnit?.id, 'owner:', targetUnit?.owner);
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
    debug.selection('Attackable tiles:', Array.from(this.attackableTiles));
  }

  private clearAttackHighlights(): void {
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

  private getUnitRange(unit: UnitInstance): number {
    if (this.traitManager) {
      const stats = this.traitManager.calculateStats(unit.traits);
      return stats.range ?? 1;
    }
    return 1;
  }

  private executeAttack(attackerId: string, defender: UnitInstance): void {
    if (!this.movementSystem || !this.combatSystem || !this.traitManager) return;

    const attacker = this.movementSystem.getUnit(attackerId);
    if (!attacker) return;

    const attackerStats = this.traitManager.calculateStats(attacker.traits);
    const defenderStats = this.traitManager.calculateStats(defender.traits);

    const distance = this.calculateDistance(attacker.q, attacker.r, defender.q, defender.r);
    const defenderRange = defenderStats.range ?? 1;
    const canDefenderCounterAttack = distance <= defenderRange;

    const attackerCombatUnit = {
      traitIds: attacker.traits,
      stats: attackerStats,
      currentHp: attacker.hp
    };

    const defenderCombatUnit = {
      traitIds: defender.traits,
      stats: defenderStats,
      currentHp: defender.hp
    };

    this.gameEventStore.startCombat(attackerId, defender.id);

    setTimeout(() => {
      const result = this.combatSystem!.executeCombat(attackerCombatUnit, defenderCombatUnit, canDefenderCounterAttack);

      debug.combat('Combat result:', result);
      debug.combat(`Attacker dealt ${result.defenderHpLost} damage, Defender dealt ${result.attackerHpLost} damage`);
      debug.combat(`Distance: ${distance}, Defender range: ${defenderRange}, Can counter: ${canDefenderCounterAttack}`);

      attacker.hp -= result.attackerHpLost;
      defender.hp -= result.defenderHpLost;

      if (this.unitRenderSystem) {
        if (attacker.hp > 0) {
          this.unitRenderSystem.updateUnitHpBar(attackerId);
          this.unitRenderSystem.playDamageAnimation(attackerId);
        }
        if (defender.hp > 0) {
          this.unitRenderSystem.updateUnitHpBar(defender.id);
        }
      }

      if (attacker.hp <= 0) {
        this.movementSystem!.removeUnit(attackerId);
        debug.combat('Attacker died');
      }

      if (defender.hp <= 0) {
        this.movementSystem!.removeUnit(defender.id);
        debug.combat('Defender died');
      }

      if (this.unitRenderSystem) {
        this.unitRenderSystem.selectUnit(null);
      }
      this.clearAttackHighlights();

      if (attacker.hp > 0) {
        this.movementSystem!.setAttacked(attackerId);
        this.movementSystem!.clearMovement(attackerId);
      }

      this.gameEventStore.setCombatResult({
        attackerId,
        defenderId: defender.id,
        damage: result.defenderHpLost,
        defenderDamage: result.attackerHpLost,
        attackerSurvived: attacker.hp > 0,
        defenderSurvived: defender.hp > 0
      });
    }, 300);
  }

  private calculateDistance(q1: number, r1: number, q2: number, r2: number): number {
    const dq = q1 - q2;
    const dr = r1 - r2;
    return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
  }

  private selectTile(key: string, q: number, r: number): void {
    this.clearTileSelection();
    this.selectedTileKey = key;

    if (this.mapSystem) {
      const tileEntities = this.mapSystem.getTileEntities();
      const hexTile = tileEntities.get(key);
      if (hexTile) {
        hexTile.setSelected(true);
        debug.selection('Selected tile:', q, r);
      }
    }
  }

  private clearTileSelection(): void {
    if (this.selectedTileKey && this.mapSystem) {
      const tileEntities = this.mapSystem.getTileEntities();
      const hexTile = tileEntities.get(this.selectedTileKey);
      if (hexTile) {
        hexTile.setSelected(false);
      }
    }
    this.selectedTileKey = null;
  }

  endTurn(): void {
    const isHotseat = this.gameStore.isHotseat;
    
    if (isHotseat) {
      this.gameStore.nextPlayer();
      debug.ui('Hotseat: switched to player:', this.gameStore.getCurrentPlayerId());
      this.gameEventStore.setCurrentPlayer(this.gameStore.getCurrentPlayerId());
    } else {
      this.currentTurn++;
    }

    this.clearTileSelection();
    this.clearAttackHighlights();
    this.unitRenderSystem?.selectUnit(null);

    if (this.movementSystem) {
      this.movementSystem.resetAllMoves();
    }

    const currentPlayerId = this.getCurrentPlayerId();
    if (this.movementSystem && this.unitRenderSystem) {
      const playerUnits = this.movementSystem.getUnitsByOwner(currentPlayerId);
      for (const unit of playerUnits) {
        this.unitRenderSystem.restoreUnitColor(unit.id);
      }
    }

    this.gameEventStore.setTurn(this.currentTurn);
    debug.ui('Turn ended. New turn:', this.currentTurn, 'Current player:', this.getCurrentPlayerId());
  }

  getCurrentTurn(): number {
    return this.currentTurn;
  }

  getCurrentPlayerId(): string {
    return this.gameStore.getCurrentPlayerId();
  }

  update(_dt: number): void {
  }

  dispose(): void {
    const eventBus = this.engine.getEventBus();
    eventBus.off('mousedown', (...args: unknown[]) => {
      const e = args[0] as MouseEvent;
      this.handleMouseDown(e);
    });
    this.clearTileSelection();
    this.clearAttackHighlights();
    window.__endTurn = undefined;
  }

  private async loadDemoScene(): Promise<void> {
    if (!this.mapSystem) return;

    try {
      const { sceneData, ownerStates } = await this.loadSceneFromFolder('example_battlefield');
      this.mapSystem.loadSceneData(sceneData);
      
      if (this.edgeSystem && sceneData.edges) {
        this.edgeSystem.loadFromInstances(sceneData.edges);
      }
      
      if (this.movementSystem && sceneData.units) {
        this.movementSystem.loadFromSceneData(sceneData);
      }

      const traitsData = await fetch('/game_saves/example_battlefield/traits.json').then(r => r.json());
      if (this.traitManager) {
        this.traitManager.loadTraitData(traitsData);
        console.log('Traits loaded:', Object.keys(traitsData.traits).length, 'traits');
      }
      
      if (window.__setOwnerStates) {
        window.__setOwnerStates(ownerStates);
      }
      
      console.log('Demo scene loaded:', sceneData.name, 'edges:', sceneData.edges?.length, 'units:', sceneData.units?.length);
    } catch (error) {
      console.error('Failed to load demo scene:', error);
    }
  }

  private async loadSceneFromFolder(sceneId: string): Promise<{ sceneData: SceneData; ownerStates: OwnerStates }> {
    const basePath = `/game_saves/${sceneId}`;
    
    const [manifest, terrainTypes, ownerTags, tiles, edges, units, terrainGroups, ownerStates] = await Promise.all([
      fetch(`${basePath}/manifest.json`).then(r => r.json()),
      fetch(`${basePath}/terrain_types.json`).then(r => r.json()),
      fetch(`${basePath}/owner_tags.json`).then(r => r.json()),
      fetch(`${basePath}/tiles.json`).then(r => r.json()),
      fetch(`${basePath}/edges.json`).then(r => r.json()).catch(() => []),
      fetch(`${basePath}/units.json`).then(r => r.json()).catch(() => []),
      fetch(`${basePath}/terrain_groups.json`).then(r => r.json()).catch(() => null),
      fetch(`${basePath}/owner_states.json`).then(r => r.json()).catch(() => ({}))
    ]);

    const sceneData: SceneData = {
      version: manifest.version,
      id: manifest.id,
      name: manifest.name,
      description: manifest.description,
      author: manifest.author,
      createdAt: manifest.createdAt,
      modifiedAt: manifest.modifiedAt,
      settings: manifest.settings,
      terrainTypes: terrainTypes as any,
      ownerTags: ownerTags as any,
      tiles: tiles as any[],
      edges: edges as any[],
      units: units as any[],
      terrainGroups: terrainGroups as any
    };

    return { sceneData, ownerStates: ownerStates as OwnerStates };
  }
}
