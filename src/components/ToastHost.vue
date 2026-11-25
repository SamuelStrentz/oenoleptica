<script setup lang="ts">
import { useUiStore } from '@/stores/ui'
const ui = useUiStore()
</script>

<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in ui.toasts" :key="t.id" class="toast" :class="t.type">{{ t.texte }}</div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: calc(var(--bas-sur) + 104px);
  display: grid;
  gap: 8px;
  z-index: 45; /* sous le menu du bouton central */
  pointer-events: none;
}
.toast {
  justify-self: center;
  background: var(--texte);
  color: #fff;
  padding: 12px 18px;
  border-radius: 14px;
  box-shadow: var(--ombre-forte);
  font-size: 0.93rem;
  max-width: 100%;
}
.toast.erreur {
  background: var(--danger);
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
