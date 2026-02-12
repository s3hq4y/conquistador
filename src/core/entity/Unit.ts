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
}
