<template>
  <div>
    <PageHeader title="System Health" subtitle="Real-time monitoring and system metrics" :breadcrumbs="[{ label: 'Health' }]">
      <template #actions>
        <button @click="loadHealth"
          class="px-3 py-2 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition">
          Refresh
        </button>
      </template>
    </PageHeader>

    <LoadingSkeleton v-if="loading" type="cards" :count="4" wrapper-class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" />

    <template v-else-if="health">
      <!-- Status Banner -->
      <div class="rounded-xl p-4 mb-6 flex items-center gap-3"
        :class="allHealthy ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'">
        <div class="w-8 h-8 rounded-full flex items-center justify-center" :class="allHealthy ? 'bg-green-100' : 'bg-yellow-100'">
          <svg v-if="allHealthy" class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
          <svg v-else class="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
        </div>
        <div>
          <p class="text-sm font-semibold" :class="allHealthy ? 'text-green-800' : 'text-yellow-800'">
            {{ allHealthy ? 'All Systems Operational' : 'Some Devices Offline' }}
          </p>
          <p class="text-xs" :class="allHealthy ? 'text-green-600' : 'text-yellow-600'">
            Server uptime: {{ fmt.formatUptime(health.uptime) }} &middot; Last checked: {{ fmt.formatTime(health.serverTime) }}
          </p>
        </div>
      </div>

      <!-- Metrics -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Devices Online" :value="health.devices.online" :subtitle="`of ${health.devices.total} paired`" color="green"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>' />
        <StatCard label="Devices Offline" :value="health.devices.offline" :subtitle="`of ${health.devices.total} paired`" :color="health.devices.offline > 0 ? 'red' : 'gray'"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>' />
        <StatCard label="Alerts Today" :value="health.alerts.today" color="yellow"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>' />
        <StatCard label="Activity Logs Today" :value="health.activity.logsToday" color="blue"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>' />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Device Status Gauge -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 class="text-sm font-semibold text-gray-800 mb-4">Device Status</h2>
          <div class="flex items-center gap-6">
            <div class="relative w-28 h-28">
              <svg viewBox="0 0 36 36" class="w-28 h-28 transform -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" stroke-width="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#22C55E" stroke-width="3"
                  :stroke-dasharray="`${onlinePct} ${100 - onlinePct}`" stroke-linecap="round" />
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-lg font-bold text-gray-900">{{ Math.round(onlinePct) }}%</span>
              </div>
            </div>
            <div class="space-y-2.5 text-xs">
              <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span class="text-gray-600">Online: {{ health.devices.online }}</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span class="text-gray-600">Offline: {{ health.devices.offline }}</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full bg-gray-300" />
                <span class="text-gray-600">Total: {{ health.devices.total }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Alert Distribution -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 class="text-sm font-semibold text-gray-800 mb-4">Alerts This Week (by type)</h2>
          <div v-if="Object.keys(health.alerts.byType).length" class="space-y-2.5">
            <div v-for="(count, type) in health.alerts.byType" :key="type">
              <div class="flex justify-between text-xs mb-1">
                <span class="font-medium text-gray-700">{{ fmt.formatAlertType(type as string) }}</span>
                <span class="text-gray-400">{{ count }}</span>
              </div>
              <div class="w-full bg-gray-100 rounded-full h-1.5">
                <div class="h-1.5 rounded-full" :class="alertBarColor(type as string)"
                  :style="{ width: `${maxAlertCount > 0 ? ((count as number) / maxAlertCount * 100) : 0}%` }" />
              </div>
            </div>
          </div>
          <EmptyState v-else title="No alerts" message="No alerts in the last 7 days" />
        </div>
      </div>

      <!-- Server Info -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 class="text-sm font-semibold text-gray-800 mb-4">Server Information</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div><span class="text-gray-400">Server Time</span><div class="font-semibold text-gray-700 mt-0.5">{{ fmt.formatTime(health.serverTime) }}</div></div>
          <div><span class="text-gray-400">Uptime</span><div class="font-semibold text-gray-700 mt-0.5">{{ fmt.formatUptime(health.uptime) }}</div></div>
          <div><span class="text-gray-400">New Users This Week</span><div class="font-semibold text-gray-700 mt-0.5">{{ health.users.newThisWeek }}</div></div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { getSystemHealth } = useApi();
const fmt = useFormatters();

const health = ref<any>(null);
const loading = ref(true);

const allHealthy = computed(() => !health.value || health.value.devices.offline === 0);
const onlinePct = computed(() => {
  if (!health.value || health.value.devices.total === 0) return 0;
  return (health.value.devices.online / health.value.devices.total) * 100;
});
const maxAlertCount = computed(() => {
  if (!health.value) return 0;
  return Math.max(...(Object.values(health.value.alerts.byType) as number[]), 1);
});

function alertBarColor(type: string) {
  const colors: Record<string, string> = {
    screen_time_limit: 'bg-yellow-400', new_app_installed: 'bg-blue-400',
    blocked_content: 'bg-red-400', geofence_trigger: 'bg-primary-400',
    device_offline: 'bg-gray-400', unusual_pattern: 'bg-red-500', uninstall_attempt: 'bg-red-600',
  };
  return colors[type] || 'bg-gray-400';
}

async function loadHealth() {
  loading.value = true;
  try { health.value = await getSystemHealth(); }
  catch { }
  finally { loading.value = false; }
}

let refreshInterval: ReturnType<typeof setInterval>;
onMounted(() => {
  loadHealth();
  refreshInterval = setInterval(loadHealth, 30000);
});
onUnmounted(() => clearInterval(refreshInterval));
</script>
