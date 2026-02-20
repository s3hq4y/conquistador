<script setup lang="ts">
import { computed } from 'vue';
import type { SelectedUnit } from '../EditorUI';
import type { Trait, TraitTypeDefinition } from '../../core/traits';

const props = defineProps<{
  unit: SelectedUnit;
  traits: Record<string, Trait>;
  traitTypes: Record<string, TraitTypeDefinition>;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const ownerColors: Record<string, string> = {
  neutral: '#808080',
  player: '#268ceb',
  enemy: '#eb3838'
};

const ownerNames: Record<string, string> = {
  neutral: '中立',
  player: '玩家',
  enemy: '敌人'
};

const ownerColor = computed(() => {
  return ownerColors[props.unit.owner] || '#808080';
});

const ownerName = computed(() => {
  return ownerNames[props.unit.owner] || props.unit.owner;
});

const traitNames = computed(() => {
  return props.unit.traits.map(id => {
    const trait = props.traits[id];
    return trait ? trait.name : id;
  });
});

const getTraitType = (traitId: string): string => {
  const trait = props.traits[traitId];
  if (!trait) return '';
  const typeDef = props.traitTypes[trait.type];
  return typeDef ? `${typeDef.icon} ${typeDef.name}` : trait.type;
};

const hpPercent = computed(() => {
  const maxHp = props.unit.stats.hp || 100;
  return Math.round((props.unit.hp / maxHp) * 100);
});
</script>

<template>
  <div class="unit-info">
    <div class="unit-header">
      <div class="unit-icon" :style="{ background: ownerColor }">⚔️</div>
      <div class="unit-title">
        <div class="unit-id">{{ unit.id.slice(0, 12) }}...</div>
        <div class="unit-owner">
          <span class="owner-dot" :style="{ background: ownerColor }"></span>
          {{ ownerName }}
        </div>
      </div>
      <button class="close-btn" @click="emit('close')">×</button>
    </div>

    <div class="hp-section">
      <label class="section-label">生命值</label>
      <div class="hp-bar-container">
        <div class="hp-bar" :style="{ width: `${hpPercent}%` }"></div>
        <span class="hp-text">{{ unit.hp }} / {{ unit.stats.hp }}</span>
      </div>
    </div>

    <div class="stats-section">
      <label class="section-label">属性</label>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-icon">❤️</span>
          <span class="stat-value">{{ unit.stats.hp }}</span>
          <span class="stat-label">生命</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">⚔️</span>
          <span class="stat-value">{{ unit.stats.attack }}</span>
          <span class="stat-label">攻击</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">🛡️</span>
          <span class="stat-value">{{ unit.stats.defense }}</span>
          <span class="stat-label">防御</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">👟</span>
          <span class="stat-value">{{ unit.stats.movement }}</span>
          <span class="stat-label">移动</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">🎯</span>
          <span class="stat-value">{{ unit.stats.range }}</span>
          <span class="stat-label">射程</span>
        </div>
      </div>
    </div>

    <div class="traits-section">
      <label class="section-label">特性</label>
      <div class="traits-list">
        <div 
          v-for="traitId in unit.traits" 
          :key="traitId" 
          class="trait-item"
        >
          <span class="trait-type">{{ getTraitType(traitId) }}</span>
          <span class="trait-name">{{ traitNames[unit.traits.indexOf(traitId)] }}</span>
        </div>
      </div>
    </div>

    <div class="position-section">
      <label class="section-label">位置</label>
      <div class="position-info">
        Q: {{ unit.q }}, R: {{ unit.r }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.unit-info {
  background: var(--editor-bg-secondary);
  border: 1px solid var(--editor-border-secondary);
  border-radius: var(--editor-radius-md);
  padding: 12px;
  margin-bottom: 12px;
}

.unit-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--editor-border-secondary);
}

.unit-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.unit-title {
  flex: 1;
}

.unit-id {
  font-size: 12px;
  font-weight: 600;
  color: var(--editor-text-primary);
}

.unit-owner {
  font-size: 11px;
  color: var(--editor-text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.owner-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.close-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--editor-text-muted);
  font-size: 18px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--editor-bg-tertiary);
  color: var(--editor-text-primary);
}

.section-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--editor-text-muted);
  margin-bottom: 6px;
  display: block;
}

.hp-section {
  margin-bottom: 12px;
}

.hp-bar-container {
  position: relative;
  height: 20px;
  background: var(--editor-bg-tertiary);
  border-radius: var(--editor-radius-sm);
  overflow: hidden;
}

.hp-bar {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #4ade80);
  transition: width 0.3s ease;
}

.hp-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.stats-section {
  margin-bottom: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  background: var(--editor-bg-tertiary);
  border-radius: var(--editor-radius-sm);
}

.stat-icon {
  font-size: 14px;
  margin-bottom: 2px;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--editor-text-primary);
}

.stat-label {
  font-size: 9px;
  color: var(--editor-text-muted);
}

.traits-section {
  margin-bottom: 12px;
}

.traits-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trait-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--editor-bg-tertiary);
  border-radius: var(--editor-radius-sm);
}

.trait-type {
  font-size: 10px;
  color: var(--editor-text-muted);
  min-width: 60px;
}

.trait-name {
  font-size: 12px;
  color: var(--editor-text-primary);
}

.position-section {
  padding-top: 8px;
  border-top: 1px solid var(--editor-border-secondary);
}

.position-info {
  font-size: 12px;
  color: var(--editor-text-secondary);
  font-family: monospace;
}
</style>
