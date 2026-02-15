<template>
  <div class="p-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Users</h1>
      <div class="flex gap-3">
        <input
          v-model="search"
          type="text"
          placeholder="Search by email or name..."
          class="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none w-64"
          @input="debouncedSearch"
        />
      </div>
    </div>

    <!-- Users Table -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="bg-gray-50 border-b border-gray-200">
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Children</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="loading" class="text-center">
            <td colspan="5" class="px-6 py-12 text-gray-400">Loading...</td>
          </tr>
          <tr v-else-if="users.length === 0" class="text-center">
            <td colspan="5" class="px-6 py-12 text-gray-400">No users found</td>
          </tr>
          <tr v-for="user in users" :key="user._id" class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4">
              <div>
                <p class="text-sm font-medium text-gray-900">{{ user.name }}</p>
                <p class="text-xs text-gray-500">{{ user.email }}</p>
              </div>
            </td>
            <td class="px-6 py-4">
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                :class="planBadgeClass(user.plan)"
              >
                {{ user.plan }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">
              {{ user.childrenCount ?? '-' }}
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">
              {{ formatDate(user.createdAt) }}
            </td>
            <td class="px-6 py-4">
              <NuxtLink
                :to="`/users/${user._id}`"
                class="text-sm text-primary-600 hover:text-primary-800 font-medium"
              >
                View
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
        <p class="text-sm text-gray-500">
          Page {{ page }} of {{ totalPages }} ({{ total }} total)
        </p>
        <div class="flex gap-2">
          <button
            :disabled="page <= 1"
            class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-white transition-colors"
            @click="page--; loadUsers()"
          >
            Previous
          </button>
          <button
            :disabled="page >= totalPages"
            class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-white transition-colors"
            @click="page++; loadUsers()"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { getUsers } = useApi();

const users = ref<any[]>([]);
const search = ref('');
const page = ref(1);
const total = ref(0);
const totalPages = ref(1);
const loading = ref(true);

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

function planBadgeClass(plan: string) {
  switch (plan) {
    case 'premium': return 'bg-primary-100 text-primary-700';
    case 'family': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

onMounted(loadUsers);
</script>
