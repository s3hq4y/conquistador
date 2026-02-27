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

export interface TileInfo {
  q: number
  r: number
  terrain: string
  owner: string
  capacity?: {
    army: number
    building: number
    armyCount: number
    buildingCount: number
  }
}

export interface TileUnitInfo {
  id: string
  type: string
  owner: string
  hp: number
  maxHp: number
  traits: string[]
  isTop: boolean
}

export const useGameEventStore = defineStore('gameEvent', () => {
  const selectedUnit = ref<UnitInfo | null>(null)
  const unitStats = ref<UnitStats | null>(null)
  const selectedTile = ref<TileInfo | null>(null)
  
  const combatResult = ref<CombatResult | null>(null)
  const combatStart = ref<{ attackerId: string; defenderId: string } | null>(null)
  
  const currentPlayerId = ref<string>('')
  const currentTurn = ref(0)
  const isAITurn = ref(false)
  
  const mapData = ref<any>(null)

  const tileUnits = ref<TileUnitInfo[]>([])
  const showTileUnits = ref(false)
  const tileUnitsPosition = ref<{ q: number; r: number } | null>(null)

  let onTileUnitSelect: ((unitId: string) => void) | null = null
  let onTileUnitReorder: ((newOrder: string[]) => void) | null = null

  function setTileUnitCallbacks(
    onSelect: (unitId: string) => void,
    onReorder: (newOrder: string[]) => void
  ) {
    onTileUnitSelect = onSelect
    onTileUnitReorder = onReorder
  }

  function selectUnit(unit: UnitInfo, stats: UnitStats) {
    selectedUnit.value = unit
    unitStats.value = stats
  }

  function selectTile(tile: TileInfo) {
    selectedTile.value = tile
  }

  function clearTileSelection() {
    selectedTile.value = null
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

  function selectTileUnits(units: TileUnitInfo[], position: { q: number; r: number }) {
    tileUnits.value = units
    showTileUnits.value = true
    tileUnitsPosition.value = position
  }

  function clearTileUnits() {
    tileUnits.value = []
    showTileUnits.value = false
    tileUnitsPosition.value = null
  }

  function reorderTileUnits(newOrder: string[]) {
    if (tileUnits.value.length === 0) return
    const reordered: TileUnitInfo[] = []
    for (let i = 0; i < newOrder.length; i++) {
      const unitId = newOrder[i]
      const unit = tileUnits.value.find(u => u.id === unitId)
      if (unit) {
        reordered.push({
          ...unit,
          isTop: i === 0
        })
      }
    }
    tileUnits.value = reordered
    if (onTileUnitReorder) {
      onTileUnitReorder(newOrder)
    }
  }

  function triggerTileUnitSelect(unitId: string) {
    if (onTileUnitSelect) {
      onTileUnitSelect(unitId)
    }
  }

  return {
    selectedUnit,
    unitStats,
    selectedTile,
    combatResult,
    combatStart,
    currentPlayerId,
    currentTurn,
    isAITurn,
    mapData,
    tileUnits,
    showTileUnits,
    tileUnitsPosition,
    selectUnit,
    selectTile,
    clearTileSelection,
    clearSelection,
    startCombat,
    setCombatResult,
    clearCombatResult,
    setCurrentPlayer,
    setTurn,
    setAITurn,
    setMapData,
    selectTileUnits,
    clearTileUnits,
    reorderTileUnits,
    setTileUnitCallbacks,
    triggerTileUnitSelect
  }
})
