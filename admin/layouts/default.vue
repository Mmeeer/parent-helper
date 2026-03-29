<template>
  <div class="min-h-screen bg-ink-50 flex font-sans">
    <!-- Mobile overlay -->
    <div v-if="sidebarOpen" class="fixed inset-0 bg-black/50 z-30 lg:hidden" @click="sidebarOpen = false"></div>

    <!-- Sidebar -->
    <aside
      class="fixed lg:static inset-y-0 left-0 z-40 w-56 bg-ink-900 flex flex-col transform transition-transform duration-200 lg:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <!-- Logo -->
      <div class="px-6 py-5 border-b border-white/10">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg bg-nest-500 flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5L12 1zm-2 16l-3.5-3.5 1.41-1.41L10 14.17l5.59-5.59L17 10l-7 7z"/></svg>
          </div>
          <div>
            <h1 class="font-display font-bold text-sm text-white leading-none">Prime Kids</h1>
            <p class="text-[9px] text-white/40 tracking-widest uppercase mt-0.5">Admin Console</p>
          </div>
        </div>
      </div>

      <!-- Admin user info -->
      <div v-if="user" class="px-4 py-3 border-b border-white/[0.07]">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-full bg-nest-500/20 flex items-center justify-center flex-shrink-0">
            <span class="text-[11px] font-bold text-nest-400">{{ user.name?.charAt(0)?.toUpperCase() || 'A' }}</span>
          </div>
          <div class="min-w-0">
            <div class="text-xs font-medium text-white/80 truncate">{{ user.name || 'Admin' }}</div>
            <div class="text-[10px] text-white/40 truncate">{{ user.email }}</div>
          </div>
        </div>
      </div>

      <nav class="flex-1 py-3 overflow-y-auto space-y-0.5 px-2">
        <NuxtLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-3 px-3 py-2 text-[11px] font-medium tracking-wide transition-all rounded-lg"
          :class="isActive(item.path)
            ? 'text-white bg-nest-500/20 border-l-2 border-nest-400 pl-[10px]'
            : 'text-white/50 hover:text-white/80 hover:bg-white/5 border-l-2 border-transparent'"
          @click="sidebarOpen = false"
        >
          <span class="w-4 h-4 flex-shrink-0" v-html="item.icon"></span>
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="px-2 py-3 border-t border-white/[0.07]">
        <button
          class="w-full flex items-center gap-3 px-3 py-2 text-[11px] text-white/40 hover:text-danger-400 hover:bg-white/5 rounded-lg transition-all"
          @click="handleLogout"
        >
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Sign Out
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Mobile header -->
      <header class="lg:hidden flex items-center gap-3 px-4 py-3 bg-ink-900 border-b border-white/10">
        <button @click="sidebarOpen = true" class="p-1.5 rounded-lg hover:bg-white/10 transition">
          <svg class="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-md bg-nest-500 flex items-center justify-center">
            <svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5L12 1z"/></svg>
          </div>
          <span class="font-display font-bold text-white text-sm">Prime Kids</span>
        </div>
      </header>

      <main class="flex-1 overflow-auto p-5 sm:p-7">
        <slot />
      </main>
    </div>

    <!-- Toast notifications -->
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { logout } = useApi();
const { user } = useAuth();

const sidebarOpen = ref(false);

const navItems = [
  { path: '/', label: 'Dashboard', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>' },
  { path: '/users', label: 'Users', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>' },
  { path: '/activity', label: 'Activity', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>' },
  { path: '/alerts', label: 'Alerts', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>' },
  { path: '/analytics', label: 'Analytics', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>' },
  { path: '/subscriptions', label: 'Subscriptions', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>' },
  { path: '/health', label: 'System Health', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>' },
  { path: '/filters', label: 'Content Filters', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>' },
];

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/';
  return route.path.startsWith(path);
}

function handleLogout() {
  const { clearUser } = useAuth();
  clearUser();
  logout();
}
</script>
