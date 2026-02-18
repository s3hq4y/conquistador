<script setup lang="ts">
defineProps<{
  activePanel: 'tools' | 'military' | 'info' | 'help';
}>();

const emit = defineEmits<{
  (e: 'update:activePanel', panel: 'tools' | 'military' | 'info' | 'help'): void;
}>();

const handleNavClick = (panel: 'tools' | 'military' | 'info' | 'help') => {
  emit('update:activePanel', panel);
};
</script>

<template>
  <div class="bottom-nav">
    <button
      :class="['bottom-nav-btn', { active: activePanel === 'tools' }]"
      @click="handleNavClick('tools')"
    >
      <span class="nav-icon">🛠️</span>
      <span class="nav-label">工具</span>
    </button>
    <button
      :class="['bottom-nav-btn', { active: activePanel === 'military' }]"
      @click="handleNavClick('military')"
    >
      <span class="nav-icon">⚔️</span>
      <span class="nav-label">军事</span>
    </button>
    <button
      :class="['bottom-nav-btn', { active: activePanel === 'info' }]"
      @click="handleNavClick('info')"
    >
      <span class="nav-icon">ℹ️</span>
      <span class="nav-label">信息</span>
    </button>
    <button
      :class="['bottom-nav-btn', { active: activePanel === 'help' }]"
      @click="handleNavClick('help')"
    >
      <span class="nav-icon">❓</span>
      <span class="nav-label">帮助</span>
    </button>
  </div>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  background: var(--editor-bg-primary);
  border: 1px solid var(--editor-border-primary);
  border-radius: var(--editor-radius-xl);
  padding: 8px 16px;
  gap: 8px;
  backdrop-filter: var(--editor-blur);
  box-shadow: var(--editor-shadow-secondary);
  z-index: 1001;
}

.bottom-nav-btn {
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-radius: var(--editor-radius-lg);
  color: var(--editor-text-secondary);
  font-size: 11px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: var(--editor-transition);
}

.bottom-nav-btn:hover {
  background: var(--editor-bg-secondary);
}

.bottom-nav-btn.active {
  color: var(--editor-accent-text);
  background: var(--editor-accent-bg-hover);
}

.nav-icon {
  font-size: 16px;
}

.nav-label {
  font-size: 11px;
}
</style>
