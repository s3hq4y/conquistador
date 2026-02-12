import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Country, Faction, CountryTechnology, CountryDiplomacy } from '../core/map/ScenarioTypes';

export type GameMode = 'GAME' | 'RANDOM' | 'CUSTOM';

export interface CountryState {
  resources: Record<string, number>;
  technology?: CountryTechnology;
  diplomacy?: CountryDiplomacy;
  factions?: Faction[];
  stability?: number;
}

export interface CountriesState {
  [countryId: string]: CountryState;
}

export interface GameState {
  turn: number;
  currentOwnerId: string;
  countries: Record<string, Country>;
  countriesState: CountriesState;
}

export const useGameStore = defineStore('game', () => {
  const gameMode = ref<GameMode | null>(null);
  const isGameStarted = ref(false);
  const isPaused = ref(false);
  const turn = ref(1);
  const currentOwnerId = ref<string>('player');
  const countries = ref<Record<string, Country>>({});
  const countriesState = ref<CountriesState>({});

  const isPlaying = computed(() => isGameStarted.value && !isPaused.value);

  const currentCountry = computed(() => countries.value[currentOwnerId.value]);

  const currentState = computed<CountryState>(() => {
    return countriesState.value[currentOwnerId.value] || { resources: {} };
  });

  const currentResources = computed(() => currentState.value.resources || {});

  const currentTechnology = computed(() => currentState.value.technology);

  const currentFactions = computed(() => currentState.value.factions || []);

  const currentStability = computed(() => currentState.value.stability ?? 0.5);

  const allCountries = computed(() => Object.values(countries.value));

  const playerCountries = computed(() => 
    allCountries.value.filter(c => c.id === 'player')
  );

  const aiCountries = computed(() => 
    allCountries.value.filter(c => c.id !== 'player' && c.id !== 'neutral')
  );

  function setGameMode(mode: GameMode) {
    gameMode.value = mode;
    isGameStarted.value = true;
  }

  function pauseGame() {
    isPaused.value = true;
  }

  function resumeGame() {
    isPaused.value = false;
  }

  function resetGame() {
    gameMode.value = null;
    isGameStarted.value = false;
    isPaused.value = false;
    turn.value = 1;
    currentOwnerId.value = 'player';
    countries.value = {};
    countriesState.value = {};
  }

  function setCountries(countriesList: Country[]) {
    countries.value = {};
    for (const country of countriesList) {
      countries.value[country.id] = country;
    }
  }

  function setCountriesState(state: CountriesState) {
    countriesState.value = state;
  }

  function initializeCountriesState(countriesList: Country[]) {
    setCountries(countriesList);
    
    for (const country of countriesList) {
      if (!countriesState.value[country.id]) {
        countriesState.value[country.id] = {
          resources: country.economy?.initialStocks || {},
          technology: country.technology ? { ...country.technology } : { level: 0.3, researchedTechs: [] },
          diplomacy: country.diplomacy ? { ...country.diplomacy } : undefined,
          factions: country.factions ? [...country.factions] : undefined,
          stability: country.politics?.stability ?? 0.5
        };
      }
    }
  }

  function setCurrentOwner(ownerId: string) {
    currentOwnerId.value = ownerId;
  }

  function nextTurn() {
    turn.value++;
    processTurnEnd();
  }

  function processTurnEnd() {
    for (const countryId of Object.keys(countriesState.value)) {
      const state = countriesState.value[countryId];
      const country = countries.value[countryId];
      
      if (state && country) {
        const budget = country.economy?.initialStatistics?.budget || 0;
        const currentDucats = state.resources.ducats || 0;
        state.resources.ducats = currentDucats + budget;
      }
    }
  }

  function getResource(resourceId: string, ownerId?: string): number {
    const owner = ownerId || currentOwnerId.value;
    return countriesState.value[owner]?.resources?.[resourceId] || 0;
  }

  function setResource(resourceId: string, value: number, ownerId?: string) {
    const owner = ownerId || currentOwnerId.value;
    if (!countriesState.value[owner]) {
      countriesState.value[owner] = { resources: {} };
    }
    countriesState.value[owner].resources[resourceId] = value;
  }

  function modifyResource(resourceId: string, delta: number, ownerId?: string): number {
    const owner = ownerId || currentOwnerId.value;
    const current = getResource(resourceId, owner);
    const newValue = Math.max(0, current + delta);
    setResource(resourceId, newValue, owner);
    return newValue;
  }

  function getTechnology(ownerId?: string): CountryTechnology | undefined {
    const owner = ownerId || currentOwnerId.value;
    return countriesState.value[owner]?.technology;
  }

  function setTechnology(tech: CountryTechnology, ownerId?: string) {
    const owner = ownerId || currentOwnerId.value;
    if (!countriesState.value[owner]) {
      countriesState.value[owner] = { resources: {} };
    }
    countriesState.value[owner].technology = tech;
  }

  function getStability(ownerId?: string): number {
    const owner = ownerId || currentOwnerId.value;
    return countriesState.value[owner]?.stability ?? 0.5;
  }

  function setStability(value: number, ownerId?: string) {
    const owner = ownerId || currentOwnerId.value;
    if (!countriesState.value[owner]) {
      countriesState.value[owner] = { resources: {} };
    }
    countriesState.value[owner].stability = Math.max(0, Math.min(1, value));
  }

  function getFactions(ownerId?: string): Faction[] {
    const owner = ownerId || currentOwnerId.value;
    return countriesState.value[owner]?.factions || [];
  }

  function setFactions(factions: Faction[], ownerId?: string) {
    const owner = ownerId || currentOwnerId.value;
    if (!countriesState.value[owner]) {
      countriesState.value[owner] = { resources: {} };
    }
    countriesState.value[owner].factions = factions;
  }

  function getCountry(countryId: string): Country | undefined {
    return countries.value[countryId];
  }

  function getCountryState(countryId: string): CountryState | undefined {
    return countriesState.value[countryId];
  }

  function getRelation(targetCountryId: string, ownerId?: string): number {
    const owner = ownerId || currentOwnerId.value;
    const diplomacy = countriesState.value[owner]?.diplomacy;
    if (diplomacy?.relations) {
      return diplomacy.relations[targetCountryId] || 0;
    }
    return 0;
  }

  function setRelation(targetCountryId: string, value: number, ownerId?: string) {
    const owner = ownerId || currentOwnerId.value;
    if (!countriesState.value[owner]) {
      countriesState.value[owner] = { resources: {} };
    }
    if (!countriesState.value[owner].diplomacy) {
      countriesState.value[owner].diplomacy = { relations: {} };
    }
    if (!countriesState.value[owner].diplomacy!.relations) {
      countriesState.value[owner].diplomacy!.relations = {};
    }
    countriesState.value[owner].diplomacy!.relations![targetCountryId] = Math.max(-100, Math.min(100, value));
  }

  return {
    gameMode,
    isGameStarted,
    isPaused,
    isPlaying,
    turn,
    currentOwnerId,
    countries,
    countriesState,
    currentCountry,
    currentState,
    currentResources,
    currentTechnology,
    currentFactions,
    currentStability,
    allCountries,
    playerCountries,
    aiCountries,
    setGameMode,
    pauseGame,
    resumeGame,
    resetGame,
    setCountries,
    setCountriesState,
    initializeCountriesState,
    setCurrentOwner,
    nextTurn,
    getResource,
    setResource,
    modifyResource,
    getTechnology,
    setTechnology,
    getStability,
    setStability,
    getFactions,
    setFactions,
    getCountry,
    getCountryState,
    getRelation,
    setRelation
  };
});
