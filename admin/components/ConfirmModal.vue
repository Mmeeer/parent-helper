<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="cancel">
      <div class="fixed inset-0 bg-black/40"></div>
      <div class="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
        <h3 class="text-base font-semibold text-gray-800 mb-2">{{ title }}</h3>
        <p class="text-sm text-gray-500 mb-5">{{ message }}</p>
        <div class="flex justify-end gap-2">
          <button @click="cancel" class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
            Cancel
          </button>
          <button @click="confirmAction" class="px-4 py-2 text-sm font-medium text-white rounded-lg transition"
            :class="variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'">
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
