import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface UnitInfo {
  id: string
  type: string
  owner: string
  hp: number
  maxHp: number
  attack: number
  defense: number
  movement: number
  range: number
  traits: string[]
}

export interface CombatResult {
  attackerId: string
  defenderId: string
  damage: number
  defenderDamage: number
  attackerSurvived: boolean
  defenderSurvived: boolean
}

export interface UnitStats {
  hp: number
  attack: number
  defense: number
  movement: number
  range: number
}

export const useGameEventStore = defineStore('gameEvent', () => {
  const selectedUnit = ref<UnitInfo | null>(null)
  const unitStats = ref<UnitStats | null>(null)
  
  const combatResult = ref<CombatResult | null>(null)
  const combatStart = ref<{ attackerId: string; defenderId: string } | null>(null)
  
  const currentPlayerId = ref<string>('')
  const currentTurn = ref(0)
  const isAITurn = ref(false)
  
  const mapData = ref<any>(null)

  function selectUnit(unit: UnitInfo, stats: UnitStats) {
    selectedUnit.value = unit
    unitStats.value = stats
  }

  function clearSelection() {
    selectedUnit.value = null
    unitStats.value = null
  }

  function startCombat(attackerId: string, defenderId: string) {
    combatStart.value = { attackerId, defenderId }
  }

  function setCombatResult(result: CombatResult) {
    combatResult.value = result
  }

  function clearCombatResult() {
    combatResult.value = null
    combatStart.value = null
  }

  function setCurrentPlayer(playerId: string) {
    currentPlayerId.value = playerId
  }

  function setTurn(turn: number) {
    currentTurn.value = turn
  }

  function setAITurn(value: boolean) {
    isAITurn.value = value
  }

  function setMapData(data: any) {
    mapData.value = data
  }

  return {
    selectedUnit,
    unitStats,
    combatResult,
    combatStart,
    currentPlayerId,
    currentTurn,
    isAITurn,
    mapData,
    selectUnit,
    clearSelection,
    startCombat,
    setCombatResult,
    clearCombatResult,
    setCurrentPlayer,
    setTurn,
    setAITurn,
    setMapData
  }
})
