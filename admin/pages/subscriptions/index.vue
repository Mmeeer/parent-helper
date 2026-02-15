<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold text-gray-900 mb-2">Subscription Management</h1>
    <p class="text-gray-500 mb-8">View and manage user subscription plans.</p>

    <!-- Plan Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div
        v-for="plan in planSummary"
        :key="plan.name"
        class="bg-white rounded-xl border border-gray-200 p-6"
      >
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium uppercase tracking-wide" :class="plan.color">{{ plan.name }}</span>
          <span class="text-3xl font-bold text-gray-900">{{ plan.count }}</span>
        </div>
        <div class="w-full bg-gray-100 rounded-full h-2">
          <div
            class="h-2 rounded-full transition-all"
            :class="plan.barColor"
            :style="{ width: `${totalUsers > 0 ? (plan.count / totalUsers * 100) : 0}%` }"
          />
        </div>
        <p class="text-xs text-gray-400 mt-2">
          {{ totalUsers > 0 ? Math.round(plan.count / totalUsers * 100) : 0 }}% of users
        </p>
      </div>
    </div>

    <!-- Search -->
    <div class="mb-6">
      <input
        v-model="search"
        type="text"
        placeholder="Search users by name or email..."
        class="w-full md:w-96 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        @input="debouncedSearch"
      />
    </div>

    <!-- Users Table -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div v-if="loading" class="p-12 text-center text-gray-400">Loading...</div>
      <table v-else class="w-full">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50">
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Current Plan</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Children</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Joined</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in users"
            :key="user._id"
            class="border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <td class="px-6 py-4">
              <div class="font-medium text-gray-900">{{ user.name }}</div>
              <div class="text-sm text-gray-500">{{ user.email }}</div>
            </td>
            <td class="px-6 py-4">
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
                :class="planBadgeClass(user.plan)"
              >
                {{ user.plan }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">
              {{ user.childrenCount ?? 0 }}
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">
              {{ formatDate(user.createdAt) }}
            </td>
            <td class="px-6 py-4">
              <select
                :value="user.plan"
                class="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                @change="changePlan(user, ($event.target as HTMLSelectElement).value)"
              >
                <option value="free">Free</option>
                <option value="premium">Premium</option>
                <option value="family">Family</option>
              </select>
            </td>
          </tr>
          <tr v-if="users.length === 0">
            <td colspan="5" class="px-6 py-12 text-center text-gray-400">
              No users found.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between mt-6">
      <p class="text-sm text-gray-500">
        Page {{ page }} of {{ totalPages }} ({{ total }} users)
      </p>
      <div class="flex gap-2">
        <button
          :disabled="page <= 1"
          class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          @click="page--; loadUsers()"
        >
          Previous
        </button>
        <button
          :disabled="page >= totalPages"
          class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          @click="page++; loadUsers()"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { getUsers, updateUserPlan, getAnalytics } = useApi();

const users = ref<any[]>([]);
const loading = ref(true);
const search = ref('');
const page = ref(1);
const total = ref(0);
const totalPages = ref(0);
const totalUsers = ref(0);
const planCounts = ref<Record<string, number>>({});

const planSummary = computed(() => [
  {
    name: 'Free',
    count: planCounts.value.free || 0,
    color: 'text-gray-600',
    barColor: 'bg-gray-400',
  },
  {
    name: 'Premium',
    count: planCounts.value.premium || 0,
    color: 'text-blue-600',
    barColor: 'bg-blue-500',
  },
  {
    name: 'Family',
    count: planCounts.value.family || 0,
    color: 'text-green-600',
    barColor: 'bg-green-500',
  },
]);

function planBadgeClass(plan: string) {
  switch (plan) {
    case 'premium': return 'bg-blue-100 text-blue-700';
    case 'family': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

let searchTimeout: ReturnType<typeof setTimeout>;
function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    page.value = 1;
    loadUsers();
  }, 300);
}

async function loadUsers() {
  loading.value = true;
  try {
    const data = await getUsers(page.value, 20, search.value);
    users.value = data.users;
    total.value = data.total;
    totalPages.value = data.totalPages;
  } catch {
    // Handle error
  } finally {
    loading.value = false;
  }
}

async function loadAnalytics() {
  try {
    const data = await getAnalytics();
    totalUsers.value = data.totalUsers;
    planCounts.value = data.planDistribution;
  } catch {
    // Handle error
  }
}

async function changePlan(user: any, newPlan: string) {
  try {
    await updateUserPlan(user._id, newPlan as 'free' | 'premium' | 'family');
    user.plan = newPlan;
    // Update plan counts
    loadAnalytics();
  } catch {
    // Revert on error
    loadUsers();
  }
}

onMounted(() => {
  loadUsers();
  loadAnalytics();
});
</script>
