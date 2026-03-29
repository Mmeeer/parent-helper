<template>
  <div class="bg-white rounded-xl border border-ink-100 p-5">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[10px] font-semibold text-ink-400 uppercase tracking-widest">{{ label }}</span>
      <span v-if="icon" class="w-8 h-8 flex items-center justify-center rounded-lg" :class="iconBg">
        <span v-html="icon" class="w-4 h-4 text-current"></span>
      </span>
    </div>
    <div class="font-display font-bold text-2xl" :class="valueColor">{{ value }}</div>
    <div v-if="subtitle" class="text-xs text-ink-400 mt-1">{{ subtitle }}</div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
}>();

const colorMap: Record<string, { value: string; bg: string }> = {
  blue:   { value: 'text-nest-500',   bg: 'bg-nest-50 text-nest-500' },
  green:  { value: 'text-safe-600',   bg: 'bg-safe-50 text-safe-500' },
  red:    { value: 'text-danger-600', bg: 'bg-danger-50 text-danger-500' },
  yellow: { value: 'text-warm-600',   bg: 'bg-warm-100 text-warm-500' },
  purple: { value: 'text-purple-600', bg: 'bg-purple-50 text-purple-500' },
  gray:   { value: 'text-ink-700',    bg: 'bg-ink-100 text-ink-500' },
};

const c = colorMap[props.color || 'blue'];
const valueColor = c.value;
const iconBg = c.bg;
</script>
