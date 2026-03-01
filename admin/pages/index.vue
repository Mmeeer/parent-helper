<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div v-for="stat in stats" :key="stat.label" class="bg-white rounded-xl border border-gray-200 p-6">
        <p class="text-sm text-gray-500 mb-1">{{ stat.label }}</p>
        <p class="text-3xl font-bold text-gray-900">{{ stat.value }}</p>
        <p v-if="stat.change" class="text-xs mt-2" :class="stat.positive ? 'text-green-600' : 'text-red-500'">
          {{ stat.change }}
        </p>
      </div>
    </div>

    <!-- Plan Distribution -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white rounded-xl border border-gray-200 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Plan Distribution</h2>
        <div class="space-y-3">
          <div v-for="(count, plan) in analytics?.planDistribution" :key="plan">
            <div class="flex justify-between text-sm mb-1">
              <span class="font-medium text-gray-700 capitalize">{{ plan }}</span>
              <span class="text-gray-500">{{ count }} users</span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2.5">
              <div
                class="h-2.5 rounded-full"
                :class="planColors[plan as string] || 'bg-gray-400'"
                :style="{ width: `${totalUsers > 0 ? (count / totalUsers * 100) : 0}%` }"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Quick Info</h2>
        <div class="space-y-4">
          <div class="flex justify-between items-center py-2 border-b border-gray-100">
            <span class="text-sm text-gray-600">Total Children Profiles</span>
            <span class="font-semibold text-gray-900">{{ analytics?.totalChildren ?? '-' }}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-100">
            <span class="text-sm text-gray-600">Total Paired Devices</span>
            <span class="font-semibold text-gray-900">{{ analytics?.totalDevices ?? '-' }}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-100">
            <span class="text-sm text-gray-600">Recent Registrations (7d)</span>
            <span class="font-semibold text-gray-900">{{ analytics?.recentRegistrations ?? '-' }}</span>
          </div>
          <div class="flex justify-between items-center py-2">
            <span class="text-sm text-gray-600">Active Users (30d)</span>
            <span class="font-semibold text-gray-900">{{ analytics?.activeUsers ?? '-' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { getAnalytics } = useApi();

const analytics = ref<any>(null);
const loading = ref(true);

const planColors: Record<string, string> = {
  free: 'bg-gray-400',
  premium: 'bg-primary-500',
  family: 'bg-green-500',
};

const totalUsers = computed(() => analytics.value?.totalUsers ?? 0);

const stats = computed(() => [
  { label: 'Total Users', value: analytics.value?.totalUsers ?? '-' },
  { label: 'Active Users', value: analytics.value?.activeUsers ?? '-' },
  { label: 'Total Children', value: analytics.value?.totalChildren ?? '-' },
  { label: 'Paired Devices', value: analytics.value?.totalDevices ?? '-' },
]);

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
