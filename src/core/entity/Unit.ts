import { TraitManager, UnitStats, createEmptyStats } from '../traits';

export interface Regiment {
  type: string;
  hp: number;
  maxHp: number;
}

export interface UnitData {
  id: string;
  q: number;
  r: number;
  owner: string;
  comp: {
    support: (string | null)[];
    main: (string | null)[];
  };
  hp: number;
  maxHp: number;
  moves: number;
  maxMoves: number;
}

export interface UnitTraitData {
  id: string;
  q: number;
  r: number;
  owner: string;
  traits: string[];
  hp: number;
}

export class Unit implements UnitData {
  id: string;
  q: number;
  r: number;
  owner: string;
  comp: {
    support: (string | null)[];
    main: (string | null)[];
  };
  hp: number;
  maxHp: number;
  moves: number;
  maxMoves: number;

  traits: string[] = [];
  private traitManager: TraitManager | null = null;
  private cachedStats: UnitStats | null = null;

  constructor(id: string, q: number, r: number, owner: string) {
    this.id = id;
    this.q = q;
    this.r = r;
    this.owner = owner;
    this.comp = { support: Array(5).fill(null), main: Array(25).fill(null) };
    this.hp = 100;
    this.maxHp = 100;
    this.moves = 6;
    this.maxMoves = 6;
  }

  static fromTraitData(data: UnitTraitData, traitManager: TraitManager): Unit {
    const unit = new Unit(data.id, data.q, data.r, data.owner);
    unit.setTraitManager(traitManager);
    unit.setTraits(data.traits);
    unit.hp = data.hp;
    return unit;
  }

  setTraitManager(manager: TraitManager): void {
    this.traitManager = manager;
    this.invalidateStatsCache();
  }

  setTraits(traitIds: string[]): void {
    this.traits = traitIds;
    this.invalidateStatsCache();
    this.updateStatsToProperties();
  }

  addTrait(traitId: string): void {
    if (!this.traits.includes(traitId)) {
      this.traits.push(traitId);
      this.invalidateStatsCache();
      this.updateStatsToProperties();
    }
  }

  removeTrait(traitId: string): boolean {
    const index = this.traits.indexOf(traitId);
    if (index !== -1) {
      this.traits.splice(index, 1);
      this.invalidateStatsCache();
      this.updateStatsToProperties();
      return true;
    }
    return false;
  }

  private invalidateStatsCache(): void {
    this.cachedStats = null;
  }

  private updateStatsToProperties(): void {
    const stats = this.getStats();
    this.maxHp = stats.hp ?? 100;
    this.maxMoves = stats.movement ?? 6;
    if (this.hp > this.maxHp) {
      this.hp = this.maxHp;
    }
    if (this.moves > this.maxMoves) {
      this.moves = this.maxMoves;
    }
  }

  getStats(): UnitStats {
    if (this.cachedStats) {
      return this.cachedStats;
    }

    if (this.traitManager) {
      this.cachedStats = this.traitManager.calculateStats(this.traits);
    } else {
      this.cachedStats = createEmptyStats();
    }

    return this.cachedStats;
  }

  getAttack(): number {
    return this.getStats().attack ?? 0;
  }

  getDefense(): number {
    return this.getStats().defense ?? 0;
  }

  getRange(): number {
    return this.getStats().range ?? 1;
  }

  getMovement(): number {
    return this.getStats().movement ?? 6;
  }

  getAllTraitIds(): string[] {
    if (this.traitManager) {
      return this.traitManager.getUnitAllTraitIds(this.traits);
    }
    return [...this.traits];
  }

  hasTrait(traitId: string): boolean {
    if (this.traitManager) {
      return this.traitManager.hasTrait(this.traits, traitId);
    }
    return this.traits.includes(traitId);
  }

  getPosition(): { q: number; r: number } {
    return { q: this.q, r: this.r };
  }

  setPosition(q: number, r: number): void {
    this.q = q;
    this.r = r;
  }

  isAlive(): boolean {
    return this.hp > 0;
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  resetMoves(): void {
    this.moves = this.maxMoves;
  }

  useMoves(amount: number): void {
    this.moves = Math.max(0, this.moves - amount);
  }

  hasMoves(): boolean {
    return this.moves > 0;
  }

  toTraitData(): UnitTraitData {
    return {
      id: this.id,
      q: this.q,
      r: this.r,
      owner: this.owner,
      traits: [...this.traits],
      hp: this.hp,
    };
  }
}
