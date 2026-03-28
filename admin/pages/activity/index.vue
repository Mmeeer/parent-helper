<template>
  <div>
    <PageHeader title="Activity Monitoring" subtitle="Platform-wide usage analytics" :breadcrumbs="[{ label: 'Activity' }]">
      <template #actions>
        <select v-model="period" @change="load()" class="px-3 py-2 border border-ink-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-ac-500 outline-none text-ink-700">
          <option value="1d">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="14d">Last 14 days</option>
          <option value="30d">Last 30 days</option>
        </select>
      </template>
    </PageHeader>

    <LoadingSkeleton v-if="loading" type="cards" :count="4" wrapper-class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" />

    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Activity Logs" :value="data?.stats.totalLogs ?? 0" color="blue"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>' />
        <StatCard label="App Usage" :value="`${data?.stats.totalAppHours ?? 0}h`" color="green"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>' />
        <StatCard label="Web Visits" :value="data?.stats.totalWebVisits ?? 0" color="purple"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>' />
        <StatCard label="Blocked Attempts" :value="data?.stats.totalBlocked ?? 0" color="red"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>' />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Top Apps -->
        <div class="bg-white rounded-xl border border-ink-100 p-5">
          <h2 class="text-sm font-semibold text-ink-800 mb-4">Most Used Apps</h2>
          <div v-if="data?.topApps?.length" class="space-y-2 max-h-80 overflow-y-auto">
            <div v-for="(app, i) in data.topApps" :key="app.packageName" class="flex items-center gap-3 py-1.5">
              <span class="text-xs text-ink-400 w-5 text-right font-semibold">{{ i + 1 }}</span>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-medium text-ink-800 truncate">{{ app.appName || app.packageName }}</div>
                <div class="text-[11px] text-ink-400">{{ app.uniqueChildren }} children</div>
              </div>
              <span class="text-xs font-semibold text-ink-600">{{ fmt.formatMinutes(app.totalMinutes) }}</span>
            </div>
          </div>
          <EmptyState v-else title="No app data" message="No app usage recorded for this period" />
        </div>

        <!-- Top Domains -->
        <div class="bg-white rounded-xl border border-ink-100 p-5">
          <h2 class="text-sm font-semibold text-ink-800 mb-4">Most Visited Domains</h2>
          <div v-if="data?.topDomains?.length" class="space-y-2 max-h-80 overflow-y-auto">
            <div v-for="(d, i) in data.topDomains" :key="d.domain" class="flex items-center gap-3 py-1.5">
              <span class="text-xs text-ink-400 w-5 text-right font-semibold">{{ i + 1 }}</span>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-medium text-ink-800 truncate">{{ d.domain }}</div>
                <div v-if="d.blockedCount" class="text-[11px] text-red-400">{{ d.blockedCount }} blocked</div>
              </div>
              <span class="text-xs font-semibold text-ink-600">{{ d.visits }} visits</span>
            </div>
          </div>
          <EmptyState v-else title="No web data" message="No web visits recorded for this period" />
        </div>

        <!-- Top Blocked -->
        <div class="lg:col-span-2 bg-white rounded-xl border border-ink-100 p-5">
          <h2 class="text-sm font-semibold text-ink-800 mb-4">Most Blocked Content</h2>
          <div v-if="data?.topBlocked?.length" class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-ink-100">
                  <th class="pb-2 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">#</th>
                  <th class="pb-2 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Target</th>
                  <th class="pb-2 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Type</th>
                  <th class="pb-2 text-right text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Count</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-ink-50">
                <tr v-for="(b, i) in data.topBlocked" :key="i" class="text-xs">
                  <td class="py-2 text-ink-400">{{ i + 1 }}</td>
                  <td class="py-2 text-ink-800 font-medium truncate max-w-xs">{{ b.target }}</td>
                  <td class="py-2"><Badge :label="b.type" :variant="b.type === 'web' ? 'purple' : b.type === 'app' ? 'blue' : 'red'" /></td>
                  <td class="py-2 text-right font-semibold text-ink-600">{{ b.count }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <EmptyState v-else title="No blocked content" message="No blocked attempts recorded for this period" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { getActivitySummary } = useApi();
const fmt = useFormatters();

const data = ref<any>(null);
const loading = ref(true);
const period = ref('7d');

async function load() {
  loading.value = true;
  try { data.value = await getActivitySummary(period.value); }
  catch { }
  finally { loading.value = false; }
}

onMounted(load);
</script>
