<template>
  <div class="p-8">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">System Health</h1>
        <p class="text-gray-500 mt-1">Real-time monitoring and system metrics.</p>
      </div>
      <button
        class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
        @click="loadHealth"
      >
        Refresh
      </button>
    </div>

    <div v-if="loading" class="text-center py-20 text-gray-400">Loading...</div>
    <template v-else-if="health">
      <!-- Status Banner -->
      <div
        class="rounded-xl p-4 mb-8 flex items-center gap-3"
        :class="allHealthy ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'"
      >
        <span class="text-2xl">{{ allHealthy ? '✅' : '⚠️' }}</span>
        <div>
          <p class="font-semibold" :class="allHealthy ? 'text-green-800' : 'text-yellow-800'">
            {{ allHealthy ? 'All Systems Operational' : 'Some Devices Offline' }}
          </p>
          <p class="text-sm" :class="allHealthy ? 'text-green-600' : 'text-yellow-600'">
            Server uptime: {{ formatUptime(health.uptime) }}
            &middot; Last checked: {{ formatTime(health.serverTime) }}
          </p>
        </div>
      </div>

      <!-- Metrics Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <p class="text-sm text-gray-500 mb-1">Devices Online</p>
          <p class="text-3xl font-bold text-green-600">{{ health.devices.online }}</p>
          <p class="text-xs text-gray-400 mt-1">of {{ health.devices.total }} paired</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <p class="text-sm text-gray-500 mb-1">Devices Offline</p>
          <p class="text-3xl font-bold" :class="health.devices.offline > 0 ? 'text-red-500' : 'text-gray-400'">
            {{ health.devices.offline }}
          </p>
          <p class="text-xs text-gray-400 mt-1">of {{ health.devices.total }} paired</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <p class="text-sm text-gray-500 mb-1">Alerts Today</p>
          <p class="text-3xl font-bold text-yellow-600">{{ health.alerts.today }}</p>
          <p class="text-xs text-gray-400 mt-1">across all users</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <p class="text-sm text-gray-500 mb-1">Activity Logs Today</p>
          <p class="text-3xl font-bold text-blue-600">{{ health.activity.logsToday }}</p>
          <p class="text-xs text-gray-400 mt-1">synced from devices</p>
        </div>
      </div>

      <!-- Device Status Gauge -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Device Status</h2>
          <div class="flex items-center gap-6">
            <div class="relative w-32 h-32">
              <svg viewBox="0 0 36 36" class="w-32 h-32 transform -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" stroke-width="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke="#22C55E" stroke-width="3"
                  :stroke-dasharray="`${onlinePct} ${100 - onlinePct}`"
                  stroke-linecap="round"
                />
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-xl font-bold text-gray-900">{{ Math.round(onlinePct) }}%</span>
              </div>
            </div>
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-green-500" />
                <span class="text-sm text-gray-600">Online: {{ health.devices.online }}</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-red-400" />
                <span class="text-sm text-gray-600">Offline: {{ health.devices.offline }}</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-gray-300" />
                <span class="text-sm text-gray-600">Total: {{ health.devices.total }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Alert Distribution -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Alerts This Week (by type)</h2>
          <div v-if="Object.keys(health.alerts.byType).length === 0" class="text-center py-8 text-gray-400">
            No alerts in the last 7 days.
          </div>
          <div v-else class="space-y-3">
            <div v-for="(count, type) in health.alerts.byType" :key="type">
              <div class="flex justify-between text-sm mb-1">
                <span class="font-medium text-gray-700">{{ formatAlertType(type as string) }}</span>
                <span class="text-gray-500">{{ count }}</span>
              </div>
              <div class="w-full bg-gray-100 rounded-full h-2">
                <div
                  class="h-2 rounded-full"
                  :class="alertBarColor(type as string)"
                  :style="{ width: `${maxAlertCount > 0 ? ((count as number) / maxAlertCount * 100) : 0}%` }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Server Info -->
      <div class="bg-white rounded-xl border border-gray-200 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Server Information</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p class="text-sm text-gray-500">Server Time</p>
            <p class="font-medium text-gray-900">{{ formatTime(health.serverTime) }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Uptime</p>
            <p class="font-medium text-gray-900">{{ formatUptime(health.uptime) }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">New Users This Week</p>
            <p class="font-medium text-gray-900">{{ health.users.newThisWeek }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { getSystemHealth } = useApi();

const health = ref<any>(null);
const loading = ref(true);

const allHealthy = computed(() => {
  if (!health.value) return true;
  return health.value.devices.offline === 0;
});

const onlinePct = computed(() => {
  if (!health.value || health.value.devices.total === 0) return 0;
  return (health.value.devices.online / health.value.devices.total) * 100;
});

const maxAlertCount = computed(() => {
  if (!health.value) return 0;
  const counts = Object.values(health.value.alerts.byType) as number[];
  return Math.max(...counts, 1);
});

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatTime(isoStr: string) {
  return new Date(isoStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
    hour12: true,
  });
}

function formatAlertType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function alertBarColor(type: string) {
  const colors: Record<string, string> = {
    screen_time_limit: 'bg-yellow-400',
    new_app_installed: 'bg-blue-400',
    blocked_content: 'bg-red-400',
    geofence_trigger: 'bg-primary-400',
    device_offline: 'bg-gray-400',
    unusual_pattern: 'bg-red-500',
    uninstall_attempt: 'bg-red-600',
  };
  return colors[type] || 'bg-gray-400';
}

async function loadHealth() {
  loading.value = true;
  try {
    health.value = await getSystemHealth();
  } catch {
    // Handle error
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadHealth();
});
</script>
