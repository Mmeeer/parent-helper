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
  green:  'bg-safe-50 text-safe-700',
  red:    'bg-danger-50 text-danger-700',
  yellow: 'bg-warm-100 text-warm-700',
  blue:   'bg-nest-50 text-nest-600',
  gray:   'bg-ink-100 text-ink-500',
  purple: 'bg-purple-50 text-purple-700',
};

const classes = variantMap[props.variant || 'gray'];
</script>
