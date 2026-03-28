<template>
  <div class="animate-pulse" :class="wrapperClass">
    <template v-if="type === 'cards'">
      <div v-for="i in count" :key="i" class="bg-white rounded-xl border border-ink-100 p-5">
        <div class="h-2.5 bg-ink-100 rounded w-20 mb-3"></div>
        <div class="h-7 bg-ink-100 rounded w-16 mb-2"></div>
        <div class="h-2 bg-ink-50 rounded w-24"></div>
      </div>
    </template>
    <template v-if="type === 'table'">
      <div v-for="i in count" :key="i" class="flex items-center gap-4 py-3 border-b border-ink-100">
        <div class="h-3 bg-ink-100 rounded flex-1"></div>
        <div class="h-3 bg-ink-100 rounded w-20"></div>
        <div class="h-3 bg-ink-50 rounded w-16"></div>
        <div class="h-3 bg-ink-50 rounded w-24"></div>
      </div>
    </template>
    <template v-if="type === 'block'">
      <div v-for="i in count" :key="i" class="bg-white rounded-xl border border-ink-100 p-5">
        <div class="h-4 bg-ink-100 rounded w-32 mb-4"></div>
        <div class="space-y-2">
          <div class="h-3 bg-ink-50 rounded w-full"></div>
          <div class="h-3 bg-ink-50 rounded w-3/4"></div>
          <div class="h-3 bg-ink-50 rounded w-5/6"></div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  type?: 'cards' | 'table' | 'block';
  count?: number;
  wrapperClass?: string;
}>();
</script>
