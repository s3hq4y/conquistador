export interface PlayerData {
  id: string;
  name: string;
  resources: {
    money: number;
    food: number;
    metal: number;
    precious: number;
    consumer: number;
    energy: number;
    oil: number;
    fuel: number;
    industry: number;
    pop: number;
    science: number;
    civilization: number;
  };
  deltas: {
    money: number;
    food: number;
    metal: number;
    precious: number;
    consumer: number;
    energy: number;
    oil: number;
    fuel: number;
    industry: number;
    pop: number;
    science: number;
    civilization: number;
  };
  diplomacyPowerMax: number;
  diplomacyPowerLeft: number;
  buildPowerMax: number;
}

export class Player implements PlayerData {
  id: string;
  name: string;
  resources: {
    money: number;
    food: number;
    metal: number;
    precious: number;
    consumer: number;
    energy: number;
    oil: number;
    fuel: number;
    industry: number;
    pop: number;
    science: number;
    civilization: number;
  };
  deltas: {
    money: number;
    food: number;
    metal: number;
    precious: number;
    consumer: number;
    energy: number;
    oil: number;
    fuel: number;
    industry: number;
    pop: number;
    science: number;
    civilization: number;
  };
  diplomacyPowerMax: number;
  diplomacyPowerLeft: number;
  buildPowerMax: number;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
    this.resources = {
      money: 1000,
      food: 100,
      metal: 50,
      precious: 0,
      consumer: 0,
      energy: 0,
      oil: 0,
      fuel: 0,
      industry: 100,
      pop: 100,
      science: 0,
      civilization: 0
    };
    this.deltas = {
      money: 0,
      food: 0,
      metal: 0,
      precious: 0,
      consumer: 0,
      energy: 0,
      oil: 0,
      fuel: 0,
      industry: 0,
      pop: 0,
      science: 0,
      civilization: 0
    };
    this.diplomacyPowerMax = 3;
    this.diplomacyPowerLeft = 3;
    this.buildPowerMax = 25;
  }

  getResource(key: keyof typeof this.resources): number {
    return this.resources[key];
  }

  setResource(key: keyof typeof this.resources, value: number): void {
    this.resources[key] = value;
  }

  addResource(key: keyof typeof this.resources, amount: number): void {
    this.resources[key] += amount;
  }

  resetDeltas(): void {
    for (const key in this.deltas) {
      this.deltas[key as keyof typeof this.deltas] = 0;
    }
  }

  applyDeltas(): void {
    for (const key in this.resources) {
      this.resources[key as keyof typeof this.resources] += this.deltas[key as keyof typeof this.deltas];
    }
  }

  resetDiplomacyPower(): void {
    this.diplomacyPowerLeft = this.diplomacyPowerMax;
  }

  useDiplomacyPower(amount: number): void {
    this.diplomacyPowerLeft = Math.max(0, this.diplomacyPowerLeft - amount);
  }
}
