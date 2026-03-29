<template>
  <div>
    <PageHeader title="Analytics" subtitle="Platform metrics and subscription overview" :breadcrumbs="[{ label: 'Analytics' }]" />

    <LoadingSkeleton v-if="loading" type="cards" :count="4" wrapper-class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" />

    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Users" :value="analytics?.totalUsers ?? 0" color="blue"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>' />
        <StatCard label="Active Users (30d)" :value="analytics?.activeUsers ?? 0" color="green"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>' />
        <StatCard label="Children Profiles" :value="analytics?.totalChildren ?? 0" color="purple"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>' />
        <StatCard label="Paired Devices" :value="analytics?.totalDevices ?? 0" color="gray"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>' />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Subscription Stats -->
        <div class="bg-white rounded-xl border border-ink-100 p-5">
          <h2 class="text-sm font-semibold text-ink-800 mb-4">Subscription Overview</h2>
          <div class="space-y-3">
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="text-ink-700 font-medium">Free Users</span>
                <span class="text-ink-400">{{ freeUsers }}</span>
              </div>
              <div class="w-full bg-ink-100 rounded-full h-1.5">
                <div class="h-1.5 rounded-full bg-ink-300" :style="{ width: pct(freeUsers) + '%' }"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="text-ink-700 font-medium">Subscribed Users</span>
                <span class="text-ink-400">{{ analytics?.subscriptions?.subscribed ?? 0 }}</span>
              </div>
              <div class="w-full bg-ink-100 rounded-full h-1.5">
                <div class="h-1.5 rounded-full bg-nest-500" :style="{ width: pct(analytics?.subscriptions?.subscribed ?? 0) + '%' }"></div>
              </div>
            </div>
          </div>
          <div class="mt-4 pt-3 border-t border-ink-100 grid grid-cols-2 gap-3 text-xs">
            <div><span class="text-ink-400">Total Keys Created</span><div class="font-semibold text-ink-800">{{ analytics?.subscriptions?.totalKeys ?? 0 }}</div></div>
            <div><span class="text-ink-400">Active Keys</span><div class="font-semibold text-green-600">{{ analytics?.subscriptions?.activeKeys ?? 0 }}</div></div>
          </div>
        </div>

        <!-- Platform Summary -->
        <div class="bg-white rounded-xl border border-ink-100 p-5">
          <h2 class="text-sm font-semibold text-ink-800 mb-4">Platform Summary</h2>
          <div class="space-y-0 text-xs">
            <div class="flex justify-between py-2.5 border-b border-ink-50">
              <span class="text-ink-500">Total Parent Accounts</span>
              <span class="font-semibold text-ink-800">{{ analytics?.totalUsers ?? 0 }}</span>
            </div>
            <div class="flex justify-between py-2.5 border-b border-ink-50">
              <span class="text-ink-500">Child Profiles Created</span>
              <span class="font-semibold text-ink-800">{{ analytics?.totalChildren ?? 0 }}</span>
            </div>
            <div class="flex justify-between py-2.5 border-b border-ink-50">
              <span class="text-ink-500">Devices Paired</span>
              <span class="font-semibold text-ink-800">{{ analytics?.totalDevices ?? 0 }}</span>
            </div>
            <div class="flex justify-between py-2.5 border-b border-ink-50">
              <span class="text-ink-500">New Registrations (7d)</span>
              <span class="font-semibold text-ink-800">{{ analytics?.recentRegistrations ?? 0 }}</span>
            </div>
            <div class="flex justify-between py-2.5">
              <span class="text-ink-500">Avg Children / User</span>
              <span class="font-semibold text-ink-800">{{ avgChildren }}</span>
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
const freeUsers = computed(() => totalUsers.value - (analytics.value?.subscriptions?.subscribed ?? 0));
const avgChildren = computed(() => totalUsers.value ? (analytics.value.totalChildren / totalUsers.value).toFixed(1) : '-');

function pct(count: number): number {
  if (!totalUsers.value) return 0;
  return Math.round((count / totalUsers.value) * 100);
}

onMounted(async () => {
  try { analytics.value = await getAnalytics(); }
  catch { }
  finally { loading.value = false; }
});
</script>
