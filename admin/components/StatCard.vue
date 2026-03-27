<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">{{ label }}</span>
      <span v-if="icon" class="w-8 h-8 flex items-center justify-center rounded-lg" :class="iconBg">
        <span v-html="icon" class="w-4 h-4 text-current"></span>
      </span>
    </div>
    <div class="text-2xl font-bold" :class="valueColor">{{ value }}</div>
    <div v-if="subtitle" class="text-xs text-gray-400 mt-1">{{ subtitle }}</div>
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
  blue: { value: 'text-blue-600', bg: 'bg-blue-50 text-blue-500' },
  green: { value: 'text-green-600', bg: 'bg-green-50 text-green-500' },
  red: { value: 'text-red-600', bg: 'bg-red-50 text-red-500' },
  yellow: { value: 'text-yellow-600', bg: 'bg-yellow-50 text-yellow-500' },
  purple: { value: 'text-purple-600', bg: 'bg-purple-50 text-purple-500' },
  gray: { value: 'text-gray-700', bg: 'bg-gray-50 text-gray-500' },
};

const c = colorMap[props.color || 'blue'];
const valueColor = c.value;
const iconBg = c.bg;
</script>
