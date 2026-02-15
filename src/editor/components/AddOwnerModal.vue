<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm', owner: { id: string; name: string; color: string }): void;
}>();

const ownerId = ref('');
const ownerName = ref('');
const ownerColor = ref('#808080');

const handleConfirm = () => {
  if (!ownerId.value || !ownerName.value) {
    return;
  }
  emit('confirm', {
    id: ownerId.value,
    name: ownerName.value,
    color: ownerColor.value
  });
  ownerId.value = '';
  ownerName.value = '';
  ownerColor.value = '#808080';
};
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <h4 class="modal-title">添加所有者标签</h4>
      
      <div class="form-group">
        <label class="form-label">ID</label>
        <input
          v-model="ownerId"
          type="text"
          class="form-input"
          placeholder="例如: ally"
        >
      </div>
      
      <div class="form-group">
        <label class="form-label">名称</label>
        <input
          v-model="ownerName"
          type="text"
          class="form-input"
          placeholder="例如: 盟友"
        >
      </div>
      
      <div class="form-group">
        <label class="form-label">颜色</label>
        <input
          v-model="ownerColor"
          type="color"
          class="form-color"
        >
      </div>
      
      <div class="button-row">
        <button class="btn btn-secondary" @click="emit('close')">取消</button>
        <button class="btn btn-primary" @click="handleConfirm">确认</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--editor-bg-overlay);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: var(--editor-bg-modal);
  border: 1px solid var(--editor-border-primary);
  border-radius: var(--editor-radius-xl);
  padding: 20px;
  max-width: 400px;
  width: 90%;
}

.modal-title {
  margin: 0 0 16px 0;
  color: var(--editor-text-primary);
  font-size: 16px;
}

.form-group {
  margin-bottom: 12px;
}

.form-label {
  font-size: 12px;
  color: var(--editor-text-secondary);
  display: block;
  margin-bottom: 4px;
}

.form-input {
  width: 100%;
  padding: 8px;
  background: var(--editor-bg-secondary);
  border: 1px solid var(--editor-border-secondary);
  border-radius: var(--editor-radius-md);
  color: var(--editor-text-primary);
  font-size: 13px;
  box-sizing: border-box;
}

.form-color {
  width: 100%;
  height: 36px;
  padding: 2px;
  background: var(--editor-bg-secondary);
  border: 1px solid var(--editor-border-secondary);
  border-radius: var(--editor-radius-md);
  cursor: pointer;
}

.button-row {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.btn {
  flex: 1;
  padding: 10px;
  border-radius: var(--editor-radius-md);
  font-size: 13px;
  cursor: pointer;
  transition: var(--editor-transition);
}

.btn-secondary {
  background: var(--editor-bg-tertiary);
  border: none;
  color: var(--editor-text-secondary);
}

.btn-secondary:hover {
  background: var(--editor-border-primary);
}

.btn-primary {
  background: var(--editor-success-gradient);
  border: none;
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}
</style>
