<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold text-gray-900 mb-8">Analytics</h1>

    <div v-if="loading" class="text-center py-20 text-gray-400">Loading analytics...</div>

    <template v-else>
      <!-- Key Metrics -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div v-for="metric in metrics" :key="metric.label" class="bg-white rounded-xl border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-3">
            <span class="text-2xl">{{ metric.icon }}</span>
          </div>
          <p class="text-3xl font-bold text-gray-900">{{ metric.value }}</p>
          <p class="text-sm text-gray-500 mt-1">{{ metric.label }}</p>
        </div>
      </div>

      <!-- Plan Breakdown -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-6">Plan Distribution</h2>
          <div class="space-y-4">
            <div v-for="(count, plan) in analytics?.planDistribution" :key="plan">
              <div class="flex justify-between text-sm mb-2">
                <span class="font-medium text-gray-700 capitalize">{{ plan }}</span>
                <span class="text-gray-500">
                  {{ count }} ({{ totalUsers > 0 ? Math.round(count / totalUsers * 100) : 0 }}%)
                </span>
              </div>
              <div class="w-full bg-gray-100 rounded-full h-3">
                <div
                  class="h-3 rounded-full transition-all duration-500"
                  :class="planBarColor(plan as string)"
                  :style="{ width: `${totalUsers > 0 ? (count / totalUsers * 100) : 0}%` }"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-6">Platform Summary</h2>
          <div class="space-y-4 text-sm">
            <div class="flex justify-between py-3 border-b border-gray-100">
              <span class="text-gray-600">Total Parent Accounts</span>
              <span class="font-bold text-gray-900">{{ analytics?.totalUsers ?? 0 }}</span>
            </div>
            <div class="flex justify-between py-3 border-b border-gray-100">
              <span class="text-gray-600">Child Profiles Created</span>
              <span class="font-bold text-gray-900">{{ analytics?.totalChildren ?? 0 }}</span>
            </div>
            <div class="flex justify-between py-3 border-b border-gray-100">
              <span class="text-gray-600">Devices Paired</span>
              <span class="font-bold text-gray-900">{{ analytics?.totalDevices ?? 0 }}</span>
            </div>
            <div class="flex justify-between py-3 border-b border-gray-100">
              <span class="text-gray-600">New Registrations (7d)</span>
              <span class="font-bold text-gray-900">{{ analytics?.recentRegistrations ?? 0 }}</span>
            </div>
            <div class="flex justify-between py-3">
              <span class="text-gray-600">Avg Children/User</span>
              <span class="font-bold text-gray-900">
                {{ analytics?.totalUsers ? (analytics.totalChildren / analytics.totalUsers).toFixed(1) : '-' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { getAnalytics } = useApi();

const analytics = ref<any>(null);
const loading = ref(true);

const totalUsers = computed(() => analytics.value?.totalUsers ?? 0);

const metrics = computed(() => [
  { label: 'Total Users', value: analytics.value?.totalUsers ?? '-', icon: '👥' },
  { label: 'Active Users (30d)', value: analytics.value?.activeUsers ?? '-', icon: '📱' },
  { label: 'Children Profiles', value: analytics.value?.totalChildren ?? '-', icon: '👶' },
  { label: 'Paired Devices', value: analytics.value?.totalDevices ?? '-', icon: '📟' },
]);

function planBarColor(plan: string) {
  switch (plan) {
    case 'premium': return 'bg-primary-500';
    case 'family': return 'bg-green-500';
    default: return 'bg-gray-400';
  }
}

onMounted(async () => {
  try {
    analytics.value = await getAnalytics();
  } catch {
    // Handle error
  } finally {
    loading.value = false;
  }
});
</script>
