<template>
  <div class="mb-6">
    <nav v-if="breadcrumbs.length" class="text-xs text-ink-400 mb-2 flex items-center gap-1">
      <NuxtLink to="/" class="hover:text-nest-500 transition">Dashboard</NuxtLink>
      <template v-for="(crumb, i) in breadcrumbs" :key="i">
        <span>/</span>
        <NuxtLink v-if="crumb.to" :to="crumb.to" class="hover:text-nest-500 transition">{{ crumb.label }}</NuxtLink>
        <span v-else class="text-ink-500">{{ crumb.label }}</span>
      </template>
    </nav>
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="font-display font-bold text-xl text-ink-900">{{ title }}</h1>
        <p v-if="subtitle" class="text-xs text-ink-400 mt-0.5">{{ subtitle }}</p>
      </div>
      <div class="flex items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; to?: string }>;
}>(), {
  breadcrumbs: () => [],
});
</script>
