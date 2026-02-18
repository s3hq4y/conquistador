import type { Ref } from 'vue';

export const ActivePanelKey = Symbol('ActivePanel');

export type ActivePanelType = 'tools' | 'military' | 'info' | 'help';

export type ActivePanelRef = Ref<ActivePanelType>;
