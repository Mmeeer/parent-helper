<template>
  <div>
    <PageHeader :title="user?.name || 'User Detail'" :subtitle="user?.email" :breadcrumbs="[{ label: 'Users', to: '/users' }, { label: user?.name || '...' }]">
      <template #actions>
        <button v-if="user?.refreshToken === null" @click="handleUnsuspend"
          class="px-3 py-2 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition">
          Unsuspend
        </button>
        <button v-else @click="showSuspendModal = true"
          class="px-3 py-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition">
          Suspend
        </button>
      </template>
    </PageHeader>

    <LoadingSkeleton v-if="loading" type="block" :count="2" wrapper-class="space-y-4" />

    <template v-else-if="user">
      <!-- User Info Card -->
      <div class="bg-white rounded-xl border border-ink-100 p-5 mb-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-ink-900 flex items-center justify-center flex-shrink-0">
            <span class="font-serif italic text-lg font-semibold text-white">{{ user.name?.charAt(0)?.toUpperCase() || '?' }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="text-base font-semibold text-ink-800">{{ user.name }}</h2>
            <p class="text-xs text-ink-400">{{ user.email }}</p>
          </div>
          <div class="hidden sm:flex items-center gap-6 text-xs">
            <div class="text-center"><div class="text-ink-400 mb-1">Plan</div><Badge :label="user.subscriptionKey ? 'Subscribed' : 'Free'" :variant="user.subscriptionKey ? 'blue' : 'gray'" /></div>
            <div class="text-center"><div class="text-ink-400 mb-1">Joined</div><div class="font-medium text-ink-700">{{ fmt.formatDate(user.createdAt) }}</div></div>
            <div class="text-center"><div class="text-ink-400 mb-1">Children</div><div class="font-medium text-ink-700">{{ user.children?.length ?? 0 }}</div></div>
            <div class="text-center"><div class="text-ink-400 mb-1">Devices</div><div class="font-medium text-ink-700">{{ user.devices?.length ?? 0 }}</div></div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mb-4 border-b border-ink-200">
        <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
          class="px-4 py-2.5 text-xs font-medium transition border-b-2 -mb-px"
          :class="activeTab === tab.key ? 'text-ac-500 border-ac-500' : 'text-ink-400 border-transparent hover:text-ink-600'">
          {{ tab.label }}
        </button>
      </div>

      <!-- Children Tab -->
      <div v-if="activeTab === 'children'" class="space-y-3">
        <div v-for="item in rulesData" :key="item.child._id" class="bg-white rounded-xl border border-ink-100 p-4">
          <div class="flex items-center justify-between mb-3">
            <div>
              <span class="text-sm font-semibold text-ink-800">{{ item.child.name }}</span>
              <span class="text-xs text-ink-400 ml-2">Age {{ item.child.age }}</span>
            </div>
          </div>
          <div v-if="item.rules" class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div class="bg-ink-50 rounded-lg p-3">
              <div class="text-ink-400 mb-1">Screen Time Limit</div>
              <div class="font-semibold text-ink-700">{{ fmt.formatMinutes(item.rules.screenTime?.dailyLimitMin ?? 120) }} / day</div>
              <div v-if="item.rules.screenTime?.perApp?.length" class="text-ink-400 mt-1">{{ item.rules.screenTime.perApp.length }} app limits</div>
            </div>
            <div class="bg-ink-50 rounded-lg p-3">
              <div class="text-ink-400 mb-1">Blocked Apps</div>
              <div class="font-semibold text-ink-700">{{ item.rules.blockedApps?.length ?? 0 }} apps</div>
            </div>
            <div class="bg-ink-50 rounded-lg p-3">
              <div class="text-ink-400 mb-1">Web Filter</div>
              <div class="font-semibold text-ink-700">{{ item.rules.webFilter?.categories?.length ?? 0 }} categories</div>
              <div class="text-ink-400 mt-1">{{ item.rules.webFilter?.customBlock?.length ?? 0 }} custom blocked</div>
            </div>
          </div>
          <div v-else class="text-xs text-ink-400 italic">No rules configured</div>
        </div>
        <EmptyState v-if="!rulesData.length" title="No children" message="This user hasn't added any children yet" />
      </div>

      <!-- Devices Tab -->
      <div v-if="activeTab === 'devices'" class="space-y-3">
        <div v-for="device in user.devices" :key="device._id" class="bg-white rounded-xl border border-ink-100 p-4">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-sm font-semibold text-ink-800">{{ device.model }}</span>
              <span class="text-xs text-ink-400 ml-2">{{ device.platform }} {{ device.osVersion }}</span>
            </div>
            <Badge :label="device.status" :variant="device.status === 'online' ? 'green' : 'gray'" />
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
            <div><span class="text-ink-400">Battery</span><div class="font-medium text-ink-700">{{ device.batteryLevel != null ? device.batteryLevel + '%' : '-' }}</div></div>
            <div><span class="text-ink-400">Last Seen</span><div class="font-medium text-ink-700">{{ device.lastSeen ? fmt.formatDate(device.lastSeen, 'relative') : '-' }}</div></div>
            <div><span class="text-ink-400">App Version</span><div class="font-medium text-ink-700">{{ device.appVersion || '-' }}</div></div>
            <div><span class="text-ink-400">Installed Apps</span><div class="font-medium text-ink-700">{{ device.installedApps?.length ?? 0 }}</div></div>
          </div>
        </div>
        <EmptyState v-if="!user.devices?.length" title="No devices" message="No devices paired to this account" />
      </div>

      <!-- Activity Tab -->
      <div v-if="activeTab === 'activity'">
        <LoadingSkeleton v-if="activityLoading" type="table" :count="5" wrapper-class="bg-white rounded-xl border border-ink-100 p-4" />
        <div v-else-if="activityLogs.length" class="bg-white rounded-xl border border-ink-100 overflow-hidden">
          <table class="w-full">
            <thead>
              <tr class="bg-ink-50/60 border-b border-ink-100">
                <th class="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Date</th>
                <th class="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Child</th>
                <th class="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Apps Used</th>
                <th class="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Web Visits</th>
                <th class="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Blocked</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ink-50">
              <tr v-for="log in activityLogs" :key="log._id" class="text-xs">
                <td class="px-4 py-2.5 text-ink-600">{{ log.date }}</td>
                <td class="px-4 py-2.5 text-ink-800 font-medium">{{ childName(log.childId) }}</td>
                <td class="px-4 py-2.5 text-ink-600">{{ log.apps?.length ?? 0 }}</td>
                <td class="px-4 py-2.5 text-ink-600">{{ log.web?.length ?? 0 }}</td>
                <td class="px-4 py-2.5"><Badge v-if="log.blockedAttempts?.length" :label="String(log.blockedAttempts.length)" variant="red" /><span v-else class="text-ink-400">0</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState v-else title="No activity" message="No activity logs found for the past 7 days" />
      </div>

      <!-- Alerts Tab -->
      <div v-if="activeTab === 'alerts'">
        <LoadingSkeleton v-if="alertsLoading" type="table" :count="5" wrapper-class="bg-white rounded-xl border border-ink-100 p-4" />
        <div v-else-if="userAlerts.length" class="bg-white rounded-xl border border-ink-100 overflow-hidden">
          <table class="w-full">
            <thead>
              <tr class="bg-ink-50/60 border-b border-ink-100">
                <th class="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Time</th>
                <th class="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Type</th>
                <th class="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Child</th>
                <th class="px-4 py-2.5 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Message</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ink-50">
              <tr v-for="a in userAlerts" :key="a._id" class="text-xs">
                <td class="px-4 py-2.5 text-ink-400">{{ fmt.formatDate(a.createdAt, 'relative') }}</td>
                <td class="px-4 py-2.5"><Badge :label="fmt.formatAlertType(a.type)" :variant="a.type.includes('blocked') || a.type.includes('uninstall') ? 'red' : 'yellow'" /></td>
                <td class="px-4 py-2.5 text-ink-800 font-medium">{{ a.childId?.name || '-' }}</td>
                <td class="px-4 py-2.5 text-ink-500 truncate max-w-xs">{{ a.message }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState v-else title="No alerts" message="No alerts for this user" />
      </div>
    </template>

    <ConfirmModal :show="showSuspendModal" title="Suspend Account" message="This will invalidate the user's session and prevent login. Are you sure?"
      confirm-text="Suspend" variant="danger" @confirm="handleSuspend" @cancel="showSuspendModal = false" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { getUserDetail, getUserRules, getUserActivity, getUserAlerts, suspendUser, unsuspendUser } = useApi();
const fmt = useFormatters();
const toast = useToast();

const user = ref<any>(null);
const loading = ref(true);
const activeTab = ref('children');
const showSuspendModal = ref(false);

const tabs = [
  { key: 'children', label: 'Children & Rules' },
  { key: 'devices', label: 'Devices' },
  { key: 'activity', label: 'Activity' },
  { key: 'alerts', label: 'Alerts' },
];

const rulesData = ref<any[]>([]);
const activityLogs = ref<any[]>([]);
const activityChildren = ref<any[]>([]);
const activityLoading = ref(false);
const userAlerts = ref<any[]>([]);
const alertsLoading = ref(false);

function childName(childId: string): string {
  const c = activityChildren.value.find((ch: any) => ch._id === childId);
  return c?.name || childId;
}

watch(activeTab, async (tab) => {
  const id = route.params.id as string;
  if (tab === 'activity' && !activityLogs.value.length) {
    activityLoading.value = true;
    try {
      const data = await getUserActivity(id);
      activityLogs.value = data.logs;
      activityChildren.value = data.children;
    } catch { }
    finally { activityLoading.value = false; }
  }
  if (tab === 'alerts' && !userAlerts.value.length) {
    alertsLoading.value = true;
    try {
      const data = await getUserAlerts(id);
      userAlerts.value = data.alerts;
    } catch { }
    finally { alertsLoading.value = false; }
  }
});

async function handleSuspend() {
  showSuspendModal.value = false;
  try {
    await suspendUser(route.params.id as string);
    toast.success('Account suspended');
    user.value = await getUserDetail(route.params.id as string);
  } catch (e: any) { toast.error(e.message || 'Failed to suspend'); }
}

async function handleUnsuspend() {
  try {
    await unsuspendUser(route.params.id as string);
    toast.success('Account unsuspended');
    user.value = await getUserDetail(route.params.id as string);
  } catch (e: any) { toast.error(e.message || 'Failed to unsuspend'); }
}

onMounted(async () => {
  const id = route.params.id as string;
  try {
    const [userData, rulesResult] = await Promise.all([
      getUserDetail(id),
      getUserRules(id),
    ]);
    user.value = userData;
    rulesData.value = rulesResult.rules;
  } catch { }
  finally { loading.value = false; }
});
</script>
