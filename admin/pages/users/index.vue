<template>
  <div>
    <PageHeader title="Users" subtitle="Manage parent accounts" :breadcrumbs="[{ label: 'Users' }]">
      <template #actions>
        <select v-model="planFilter" @change="page = 1; loadUsers()" class="px-3 py-2 border border-ink-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-ac-500 outline-none text-ink-700">
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="subscribed">Subscribed</option>
        </select>
        <input v-model="search" type="text" placeholder="Search users..."
          class="px-3 py-2 border border-ink-200 rounded-lg text-xs focus:ring-1 focus:ring-ac-500 outline-none w-48 text-ink-700 placeholder:text-ink-300"
          @input="debouncedSearch" />
      </template>
    </PageHeader>

    <div class="bg-white rounded-xl border border-ink-100 overflow-hidden">
      <LoadingSkeleton v-if="loading" type="table" :count="8" wrapper-class="p-4" />

      <table v-else-if="users.length" class="w-full">
        <thead>
          <tr class="border-b border-ink-100 bg-ink-50/60">
            <th class="px-5 py-3 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest cursor-pointer hover:text-ink-600"
              @click="toggleSort('name')">
              User <span v-if="sortBy === 'name'" class="text-ac-500">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th class="px-5 py-3 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Plan</th>
            <th class="px-5 py-3 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Children</th>
            <th class="px-5 py-3 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Devices</th>
            <th class="px-5 py-3 text-left text-[10px] font-semibold text-ink-400 uppercase tracking-widest cursor-pointer hover:text-ink-600"
              @click="toggleSort('createdAt')">
              Joined <span v-if="sortBy === 'createdAt'" class="text-ac-500">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th class="px-5 py-3 text-right text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink-50">
          <tr v-for="user in users" :key="user._id" class="hover:bg-ink-50/40 transition-colors">
            <td class="px-5 py-3.5">
              <p class="text-sm font-medium text-ink-800">{{ user.name || '-' }}</p>
              <p class="text-xs text-ink-400">{{ user.email }}</p>
            </td>
            <td class="px-5 py-3.5">
              <Badge :label="user.subscriptionKey ? 'Subscribed' : 'Free'" :variant="user.subscriptionKey ? 'blue' : 'gray'" />
            </td>
            <td class="px-5 py-3.5 text-sm text-ink-600">{{ user.childrenCount ?? 0 }}</td>
            <td class="px-5 py-3.5 text-sm text-ink-600">{{ user.deviceCount ?? 0 }}</td>
            <td class="px-5 py-3.5 text-xs text-ink-400">{{ fmt.formatDate(user.createdAt) }}</td>
            <td class="px-5 py-3.5 text-right">
              <NuxtLink :to="`/users/${user._id}`" class="text-xs text-ac-500 hover:text-ac-600 font-medium">View</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>

      <EmptyState v-else title="No users found" :message="search ? 'Try a different search term' : 'No users have registered yet'" />

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between px-5 py-3 border-t border-ink-100 bg-ink-50/40">
        <p class="text-xs text-ink-400">Page {{ page }} of {{ totalPages }} ({{ total }} total)</p>
        <div class="flex gap-1.5">
          <button :disabled="page <= 1" @click="page--; loadUsers()"
            class="px-3 py-1.5 text-xs border border-ink-200 rounded-lg disabled:opacity-30 hover:bg-white transition text-ink-600">Prev</button>
          <button :disabled="page >= totalPages" @click="page++; loadUsers()"
            class="px-3 py-1.5 text-xs border border-ink-200 rounded-lg disabled:opacity-30 hover:bg-white transition text-ink-600">Next</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { getUsers } = useApi();
const fmt = useFormatters();

const users = ref<any[]>([]);
const search = ref('');
const planFilter = ref('');
const sortBy = ref('createdAt');
const sortOrder = ref('desc');
const page = ref(1);
const total = ref(0);
const totalPages = ref(1);
const loading = ref(true);

let searchTimeout: ReturnType<typeof setTimeout>;
function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => { page.value = 1; loadUsers(); }, 300);
}

function toggleSort(field: string) {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = field;
    sortOrder.value = 'desc';
  }
  page.value = 1;
  loadUsers();
}

async function loadUsers() {
  loading.value = true;
  try {
    const data = await getUsers(page.value, 20, {
      search: search.value,
      plan: planFilter.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    });
    users.value = data.users;
    total.value = data.total;
    totalPages.value = data.totalPages;
  } catch { }
  finally { loading.value = false; }
}

onMounted(loadUsers);
</script>
