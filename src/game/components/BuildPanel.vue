<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useGameStore } from '@/stores/game';

interface BuildableItem {
  traitId: string;
  name: string;
  icon: string;
  description?: string;
  cost: Record<string, number>;
  canBuild: boolean;
  reason?: string;
}

const { t } = useI18n();
const gameStore = useGameStore();

const props = defineProps<{
  visible: boolean;
  buildableItems: BuildableItem[];
  position: { q: number; r: number } | null;
}>();

const emit = defineEmits<{
  (e: 'build', traitId: string): void;
  (e: 'close'): void;
}>();

const selectedItem = ref<BuildableItem | null>(null);

const currentResources = computed(() => {
  const owner = gameStore.currentOwner;
  return {
    ducat: gameStore.getResource('ducat', owner),
    food: gameStore.getResource('food', owner),
    metal: gameStore.getResource('metal', owner),
  };
});

const canBuild = computed(() => {
  if (!selectedItem.value) return false;
  if (!selectedItem.value.canBuild) return false;
  
  for (const [resource, amount] of Object.entries(selectedItem.value.cost)) {
    if ((currentResources.value[resource as keyof typeof currentResources.value] || 0) < amount) {
      return false;
    }
  }
  return true;
});

function getResourceIcon(resource: string): string {
  const icons: Record<string, string> = {
    ducat: '🪙',
    food: '🍞',
    metal: '⛓️',
    precious: '💎',
    consumer: '📦',
    energy: '⚡',
    oil: '🛢️',
    fuel: '⛽',
    industry: '🏭',
    pop: '👥',
    science: '🔬',
    civilization: '📜',
  };
  return icons[resource] || '📦';
}

function canAffordResource(resource: string, cost: number): boolean {
  return (currentResources.value[resource as keyof typeof currentResources.value] || 0) >= cost;
}

function selectBuild(item: BuildableItem) {
  if (item.canBuild) {
    selectedItem.value = item;
  }
}

function confirmBuild() {
  if (!selectedItem.value || !canBuild.value) return;
  emit('build', selectedItem.value.traitId);
  selectedItem.value = null;
}

function close() {
  selectedItem.value = null;
  emit('close');
}

function formatName(item: BuildableItem): string {
  if (typeof item.name === 'string') {
    return item.name;
  }
  return item.name.zh || item.name.en || item.traitId;
}
</script>

<template>
  <div v-if="visible" class="build-panel" @click.self="close">
    <div class="panel-content">
      <div class="panel-header">
        <h3>{{ t('build.title') || '建造' }}</h3>
        <button class="close-btn" @click="close">×</button>
      </div>

      <div v-if="position" class="position-info">
        {{ t('build.position') || '位置' }}: ({{ position.q }}, {{ position.r }})
      </div>

      <div class="resource-display">
        <span 
          v-for="(amount, resource) in currentResources" 
          :key="resource"
          class="resource-item"
        >
          {{ getResourceIcon(resource) }} {{ amount }}
        </span>
      </div>

      <div class="build-list">
        <div 
          v-for="item in buildableItems" 
          :key="item.traitId"
          class="build-item"
          :class="{ 
            disabled: !item.canBuild,
            selected: selectedItem?.traitId === item.traitId 
          }"
          @click="selectBuild(item)"
        >
          <div class="item-icon">{{ item.icon }}</div>
          <div class="item-info">
            <div class="item-name">{{ formatName(item) }}</div>
            <div class="item-cost">
              <span 
                v-for="(cost, resource) in item.cost" 
                :key="resource"
                :class="{ insufficient: !canAffordResource(resource, cost) }"
              >
                {{ getResourceIcon(resource) }} {{ cost }}
              </span>
            </div>
          </div>
          <div v-if="!item.canBuild" class="item-reason">
            {{ item.reason }}
          </div>
        </div>
      </div>

      <div v-if="selectedItem" class="confirm-section">
        <div class="confirm-info">
          <div class="confirm-name">
            {{ selectedItem.icon }} {{ formatName(selectedItem) }}
          </div>
          <div v-if="selectedItem.description" class="confirm-desc">
            {{ selectedItem.description }}
          </div>
          <div class="cost-summary">
            <span 
              v-for="(cost, resource) in selectedItem.cost" 
              :key="resource"
              :class="{ insufficient: !canAffordResource(resource, cost) }"
            >
              {{ getResourceIcon(resource) }} -{{ cost }}
            </span>
          </div>
        </div>
        <button 
          class="build-btn" 
          :disabled="!canBuild"
          @click="confirmBuild"
        >
          {{ t('build.confirm') || '建造' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.build-panel {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  pointer-events: auto;
}

.panel-content {
  background: rgba(30, 30, 30, 0.95);
  border-radius: 12px;
  padding: 20px;
  min-width: 320px;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
  color: #fff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #fff;
}

.position-info {
  font-size: 12px;
  color: #888;
  margin-bottom: 12px;
}

.resource-display {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 16px;
}

.resource-item {
  font-size: 14px;
}

.build-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.build-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.build-item:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.15);
}

.build-item.selected {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.2);
}

.build-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.item-icon {
  font-size: 32px;
  margin-right: 12px;
}

.item-info {
  flex: 1;
}

.item-name {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.item-cost {
  display: flex;
  gap: 8px;
  font-size: 13px;
  color: #aaa;
}

.insufficient {
  color: #ff6b6b;
}

.item-reason {
  font-size: 11px;
  color: #ff6b6b;
  margin-left: 8px;
}

.confirm-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.confirm-info {
  margin-bottom: 12px;
}

.confirm-name {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.confirm-desc {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 8px;
}

.cost-summary {
  display: flex;
  gap: 12px;
  font-size: 14px;
}

.build-btn {
  width: 100%;
  padding: 12px;
  background: #4caf50;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.build-btn:hover:not(:disabled) {
  background: #45a049;
}

.build-btn:disabled {
  background: #555;
  cursor: not-allowed;
}
</style>
