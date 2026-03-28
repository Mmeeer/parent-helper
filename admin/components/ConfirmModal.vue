<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="cancel">
      <div class="fixed inset-0 bg-ink-900/40 backdrop-blur-sm"></div>
      <div class="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-ink-100">
        <h3 class="font-serif italic text-lg font-semibold text-ink-900 mb-2">{{ title }}</h3>
        <p class="text-sm text-ink-500 mb-5">{{ message }}</p>
        <div class="flex justify-end gap-2">
          <button @click="cancel" class="px-4 py-2 text-xs font-medium text-ink-600 bg-ink-100 rounded-lg hover:bg-ink-200 transition">
            Cancel
          </button>
          <button @click="confirmAction" class="px-4 py-2 text-xs font-medium text-white rounded-lg transition"
            :class="variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-ink-900 hover:bg-ink-800'">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean;
  title: string;
  message: string;
  confirmText?: string;
  variant?: 'danger' | 'primary';
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

function confirmAction() { emit('confirm'); }
function cancel() { emit('cancel'); }
</script>
