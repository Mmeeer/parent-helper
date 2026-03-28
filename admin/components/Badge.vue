<template>
  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide" :class="classes">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string;
  variant?: 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple';
}>();

const variantMap: Record<string, string> = {
  green: 'bg-green-50 text-green-700',
  red: 'bg-red-50 text-red-700',
  yellow: 'bg-yellow-50 text-yellow-700',
  blue: 'bg-ac-500/10 text-ac-600',
  gray: 'bg-ink-100 text-ink-500',
  purple: 'bg-purple-50 text-purple-700',
};

const classes = variantMap[props.variant || 'gray'];
</script>
