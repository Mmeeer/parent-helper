<template>
  <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-xs"
        :class="{
          'bg-green-600 text-white': t.type === 'success',
          'bg-red-600 text-white': t.type === 'error',
          'bg-gray-800 text-white': t.type === 'info',
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
