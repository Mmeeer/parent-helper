<template>
  <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id"
        class="pointer-events-auto px-4 py-3 rounded-xl shadow-lg text-xs font-medium max-w-xs border"
        :class="{
          'bg-white border-green-200 text-green-700': t.type === 'success',
          'bg-white border-red-200 text-red-600': t.type === 'error',
          'bg-ink-900 border-ink-700 text-white': t.type === 'info',
        }">
        {{ t.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
const { toasts } = useToast();
</script>

<style scoped>
.toast-enter-active { transition: all 0.3s ease; }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from { transform: translateX(100%); opacity: 0; }
.toast-leave-to { opacity: 0; transform: translateY(-10px); }
</style>
