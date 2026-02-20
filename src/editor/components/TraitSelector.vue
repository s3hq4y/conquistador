<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Trait, TraitTypeDefinition, UnitStats } from '../../core/traits';

const props = defineProps<{
  traits: Record<string, Trait>;
  traitTypes: Record<string, TraitTypeDefinition>;
  selectedTraits: string[];
}>();

const emit = defineEmits<{
  (e: 'update:selectedTraits', traits: string[]): void;
}>();

const localSelectedTraits = ref<string[]>([...props.selectedTraits]);

watch(() => props.selectedTraits, (newVal) => {
  localSelectedTraits.value = [...newVal];
}, { deep: true });

const traitsByType = computed(() => {
  const grouped: Record<string, Trait[]> = {};
  for (const trait of Object.values(props.traits)) {
    if (!grouped[trait.type]) {
      grouped[trait.type] = [];
    }
    grouped[trait.type].push(trait);
  }
  return grouped;
});

const orderedTypes = computed(() => {
  const order = ['soldierType', 'weapon', 'armor', 'ability', 'tag'];
  return order.filter(t => traitsByType.value[t] && traitsByType.value[t].length > 0);
});

const getTraitTypeLabel = (typeId: string): TraitTypeDefinition => {
  return props.traitTypes[typeId] || { id: typeId, name: typeId, icon: '📌' };
};

const isSelected = (traitId: string): boolean => {
  return localSelectedTraits.value.includes(traitId);
};

const toggleTrait = (traitId: string) => {
  const index = localSelectedTraits.value.indexOf(traitId);
  if (index === -1) {
    localSelectedTraits.value.push(traitId);
  } else {
    localSelectedTraits.value.splice(index, 1);
  }
  emit('update:selectedTraits', [...localSelectedTraits.value]);
};

const removeTrait = (traitId: string) => {
  const index = localSelectedTraits.value.indexOf(traitId);
  if (index !== -1) {
    localSelectedTraits.value.splice(index, 1);
    emit('update:selectedTraits', [...localSelectedTraits.value]);
  }
};

const getTrait = (traitId: string): Trait | undefined => {
  return props.traits[traitId];
};

const canSelectTrait = (trait: Trait): boolean => {
  if (!trait.requires || trait.requires.length === 0) {
    return true;
  }
  return trait.requires.some(reqId => localSelectedTraits.value.includes(reqId));
};

const getRequirementHint = (trait: Trait): string => {
  if (!trait.requires || trait.requires.length === 0) {
    return '';
  }
  const missingReqs = trait.requires.filter(reqId => !localSelectedTraits.value.includes(reqId));
  if (missingReqs.length === 0) {
    return '';
  }
  const missingNames = missingReqs.map(id => props.traits[id]?.name || id);
  return `需要: ${missingNames.join(', ')}`;
};

const calculateStats = computed((): UnitStats => {
  const stats: UnitStats = { hp: 0, attack: 0, defense: 0, movement: 0, range: 0 };
  for (const traitId of localSelectedTraits.value) {
    const trait = props.traits[traitId];
    if (trait?.stats) {
      stats.hp = (stats.hp ?? 0) + (trait.stats.hp ?? 0);
      stats.attack = (stats.attack ?? 0) + (trait.stats.attack ?? 0);
      stats.defense = (stats.defense ?? 0) + (trait.stats.defense ?? 0);
      stats.movement = (stats.movement ?? 0) + (trait.stats.movement ?? 0);
      stats.range = (stats.range ?? 0) + (trait.stats.range ?? 0);
    }
  }
  return stats;
});

const hasValidStats = computed(() => {
  return calculateStats.value.hp && calculateStats.value.hp > 0;
});
</script>

<template>
  <div class="trait-selector">
    <div class="trait-type-section" v-for="typeId in orderedTypes" :key="typeId">
      <label class="section-label">
        <span class="type-icon">{{ getTraitTypeLabel(typeId).icon }}</span>
        {{ getTraitTypeLabel(typeId).name }}
      </label>
      <div class="trait-grid">
        <button
          v-for="trait in traitsByType[typeId]"
          :key="trait.id"
          :class="['trait-btn', { 
            selected: isSelected(trait.id),
            disabled: !canSelectTrait(trait) && !isSelected(trait.id)
          }]"
          :disabled="!canSelectTrait(trait) && !isSelected(trait.id)"
          :title="getRequirementHint(trait) || trait.description"
          @click="toggleTrait(trait.id)"
        >
          {{ trait.name }}
        </button>
      </div>
    </div>

    <div class="selected-traits" v-if="localSelectedTraits.length > 0">
      <label class="section-label">已选特性</label>
      <div class="selected-tags">
        <span
          v-for="traitId in localSelectedTraits"
          :key="traitId"
          class="trait-tag"
        >
          {{ getTrait(traitId)?.name || traitId }}
          <button class="remove-btn" @click.stop="removeTrait(traitId)">×</button>
        </span>
      </div>
    </div>

    <div class="stats-preview" v-if="hasValidStats">
      <label class="section-label">属性预览</label>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">生命</span>
          <span class="stat-value">{{ calculateStats.hp }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">攻击</span>
          <span class="stat-value">{{ calculateStats.attack }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">防御</span>
          <span class="stat-value">{{ calculateStats.defense }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">移动</span>
          <span class="stat-value">{{ calculateStats.movement }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">射程</span>
          <span class="stat-value">{{ calculateStats.range }}</span>
        </div>
      </div>
    </div>
    <div class="stats-preview invalid" v-else>
      <div class="invalid-hint">请选择兵种特性以获得基础属性</div>
    </div>
  </div>
</template>

<style scoped>
.trait-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trait-type-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--editor-text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.type-icon {
  font-size: 12px;
}

.trait-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.trait-btn {
  padding: 4px 8px;
  background: var(--editor-bg-secondary);
  border: 1px solid var(--editor-border-secondary);
  border-radius: var(--editor-radius-sm);
  color: var(--editor-text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: var(--editor-transition);
}

.trait-btn:hover:not(.disabled) {
  background: var(--editor-accent-bg-hover);
  border-color: var(--editor-accent-border);
}

.trait-btn.selected {
  background: var(--editor-accent-bg);
  border-color: var(--editor-accent-border);
  color: var(--editor-accent-text);
}

.trait-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.selected-traits {
  padding-top: 8px;
  border-top: 1px solid var(--editor-border-secondary);
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.trait-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background: var(--editor-accent-bg);
  border: 1px solid var(--editor-accent-border);
  border-radius: var(--editor-radius-sm);
  font-size: 10px;
  color: var(--editor-accent-text);
}

.remove-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--editor-text-muted);
  font-size: 12px;
  cursor: pointer;
  border-radius: 50%;
}

.remove-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.stats-preview {
  padding-top: 8px;
  border-top: 1px solid var(--editor-border-secondary);
}

.stats-preview.invalid {
  padding: 8px;
  background: var(--editor-bg-tertiary);
  border-radius: var(--editor-radius-sm);
}

.invalid-hint {
  font-size: 11px;
  color: var(--editor-text-muted);
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 4px;
  background: var(--editor-bg-tertiary);
  border-radius: var(--editor-radius-sm);
}

.stat-label {
  font-size: 9px;
  color: var(--editor-text-muted);
  text-transform: uppercase;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--editor-text-primary);
}
</style>
