<template>
  <div>
    <PageHeader title="Dashboard" subtitle="Platform overview at a glance" />

    <!-- Loading -->
    <LoadingSkeleton v-if="loading" type="cards" :count="4" wrapper-class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" />

    <template v-else>
      <!-- Stats Row -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Users" :value="data?.stats.totalUsers ?? 0" :subtitle="`+${data?.stats.recentRegistrations ?? 0} this week`" color="blue"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>' />
        <StatCard label="Active Users (30d)" :value="data?.stats.activeUsers ?? 0" color="green"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>' />
        <StatCard label="Devices Online" :value="`${data?.stats.onlineDevices ?? 0} / ${data?.stats.totalDevices ?? 0}`" color="purple"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>' />
        <StatCard label="Alerts Today" :value="data?.stats.alertsToday ?? 0" :color="(data?.stats.alertsToday ?? 0) > 10 ? 'red' : 'yellow'"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>' />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- Recent Alerts Feed -->
        <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-semibold text-gray-800">Recent Alerts</h2>
            <NuxtLink to="/alerts" class="text-xs text-primary-500 hover:text-primary-600 font-medium">View all</NuxtLink>
          </div>
          <div v-if="data?.recentAlerts?.length" class="space-y-1 max-h-80 overflow-y-auto">
            <div v-for="alert in data.recentAlerts.slice(0, 10)" :key="alert._id"
              class="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition">
              <span class="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" :class="alertDotColor(alert.type)"></span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <Badge :label="fmt.formatAlertType(alert.type)" :variant="alertBadgeVariant(alert.type)" />
                  <span v-if="alert.childId" class="text-xs text-gray-400">{{ alert.childId.name }}</span>
                </div>
                <p class="text-xs text-gray-500 mt-0.5 truncate">{{ alert.message }}</p>
              </div>
              <span class="text-[11px] text-gray-400 flex-shrink-0">{{ fmt.formatDate(alert.createdAt, 'relative') }}</span>
            </div>
          </div>
          <EmptyState v-else title="No recent alerts" message="Alerts from the past 7 days will appear here" />
        </div>

        <!-- System Status -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-semibold text-gray-800">System Status</h2>
            <NuxtLink to="/health" class="text-xs text-primary-500 hover:text-primary-600 font-medium">Details</NuxtLink>
          </div>

          <!-- Device donut -->
          <div class="flex items-center justify-center mb-4">
            <div class="relative w-28 h-28">
              <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#f3f4f6" stroke-width="3" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#22c55e" stroke-width="3"
                  :stroke-dasharray="`${onlinePct * 0.88} 88`" stroke-linecap="round" />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-lg font-bold text-gray-800">{{ onlinePct }}%</span>
                <span class="text-[10px] text-gray-400">online</span>
              </div>
            </div>
          </div>

          <div class="space-y-2 text-xs">
            <div class="flex justify-between"><span class="text-gray-500">Children</span><span class="font-medium">{{ data?.stats.totalChildren ?? 0 }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Devices Online</span><span class="font-medium text-green-600">{{ data?.stats.onlineDevices ?? 0 }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Devices Offline</span><span class="font-medium text-gray-400">{{ (data?.stats.totalDevices ?? 0) - (data?.stats.onlineDevices ?? 0) }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Uptime</span><span class="font-medium">{{ fmt.formatUptime(data?.uptime ?? 0) }}</span></div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Plan Distribution -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 class="text-sm font-semibold text-gray-800 mb-4">Plan Distribution</h2>
          <div class="space-y-3">
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="font-medium text-gray-700">Free</span>
                <span class="text-gray-400">{{ data?.planDistribution.free ?? 0 }} users</span>
              </div>
              <div class="w-full bg-gray-100 rounded-full h-2">
                <div class="h-2 rounded-full bg-gray-400" :style="{ width: planPct('free') + '%' }"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="font-medium text-gray-700">Subscribed</span>
                <span class="text-gray-400">{{ data?.planDistribution.subscribed ?? 0 }} users</span>
              </div>
              <div class="w-full bg-gray-100 rounded-full h-2">
                <div class="h-2 rounded-full bg-primary-500" :style="{ width: planPct('subscribed') + '%' }"></div>
              </div>
            </div>
          </div>
          <div class="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3 text-xs">
            <div><span class="text-gray-400">Total Keys</span><div class="font-semibold">{{ data?.planDistribution.totalKeys ?? 0 }}</div></div>
            <div><span class="text-gray-400">Active Keys</span><div class="font-semibold text-green-600">{{ data?.planDistribution.activeKeys ?? 0 }}</div></div>
          </div>
        </div>

        <!-- Alerts by Type (today) -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-semibold text-gray-800">Alerts by Type (Today)</h2>
            <NuxtLink to="/alerts" class="text-xs text-primary-500 hover:text-primary-600 font-medium">View all</NuxtLink>
          </div>
          <div v-if="Object.keys(data?.alertsByType ?? {}).length" class="space-y-2.5">
            <div v-for="(count, type) in data.alertsByType" :key="type">
              <div class="flex justify-between text-xs mb-1">
                <span class="font-medium text-gray-700">{{ fmt.formatAlertType(type as string) }}</span>
                <span class="text-gray-400">{{ count }}</span>
              </div>
              <div class="w-full bg-gray-100 rounded-full h-1.5">
                <div class="h-1.5 rounded-full bg-yellow-400" :style="{ width: Math.min(100, (count as number / maxAlertCount) * 100) + '%' }"></div>
              </div>
            </div>
          </div>
          <EmptyState v-else title="No alerts today" message="All quiet on the platform" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { getDashboard } = useApi();
const fmt = useFormatters();

const data = ref<any>(null);
const loading = ref(true);
const error = ref('');

const onlinePct = computed(() => {
  const total = data.value?.stats.totalDevices ?? 0;
  if (!total) return 0;
  return Math.round((data.value.stats.onlineDevices / total) * 100);
});

const maxAlertCount = computed(() => {
  const types = data.value?.alertsByType ?? {};
  return Math.max(1, ...Object.values(types) as number[]);
});

function planPct(key: string): number {
  const total = data.value?.stats.totalUsers ?? 0;
  if (!total) return 0;
  return Math.round(((data.value?.planDistribution?.[key] ?? 0) / total) * 100);
}

function alertDotColor(type: string): string {
  const map: Record<string, string> = {
    screen_time_limit: 'bg-yellow-400', blocked_content: 'bg-red-400',
    new_app_installed: 'bg-blue-400', geofence_trigger: 'bg-purple-400',
    device_offline: 'bg-gray-400', unusual_pattern: 'bg-orange-400',
    uninstall_attempt: 'bg-red-500',
  };
  return map[type] || 'bg-gray-300';
}

function alertBadgeVariant(type: string): 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple' {
  const map: Record<string, any> = {
    screen_time_limit: 'yellow', blocked_content: 'red',
    new_app_installed: 'blue', geofence_trigger: 'purple',
    device_offline: 'gray', unusual_pattern: 'yellow',
    uninstall_attempt: 'red',
  };
  return map[type] || 'gray';
}

async function load() {
  loading.value = true;
  try {
    data.value = await getDashboard();
  } catch (e: any) {
    error.value = e.message || 'Failed to load dashboard';
  } finally {
    loading.value = false;
  }
}

let interval: ReturnType<typeof setInterval>;
onMounted(() => {
  load();
  interval = setInterval(load, 60000);
});
onUnmounted(() => clearInterval(interval));
</script>
