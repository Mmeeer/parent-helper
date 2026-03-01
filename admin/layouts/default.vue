<template>
  <div class="min-h-screen bg-gray-50 flex">
    <!-- Sidebar -->
    <aside class="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div class="p-6 border-b border-gray-200">
        <h1 class="text-xl font-bold text-primary-600">Parent Helper</h1>
        <p class="text-xs text-gray-400 mt-1">Admin Panel</p>
      </div>

      <nav class="flex-1 py-4">
        <NuxtLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors"
          :class="$route.path === item.path
            ? 'text-primary-600 bg-primary-50 border-r-2 border-primary-600'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
        >
          <span class="text-lg">{{ item.icon }}</span>
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="p-4 border-t border-gray-200">
        <button
          class="w-full text-left px-4 py-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
          @click="handleLogout"
        >
          Sign Out
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const { logout } = useApi();

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/users', label: 'Users', icon: '👥' },
  { path: '/analytics', label: 'Analytics', icon: '📈' },
  { path: '/subscriptions', label: 'Subscriptions', icon: '💳' },
  { path: '/health', label: 'System Health', icon: '🖥️' },
  { path: '/filters', label: 'Content Filters', icon: '🛡️' },
];

function handleLogout() {
  logout();
}
</script>
