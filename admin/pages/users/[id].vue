<template>
  <div class="p-8">
    <div class="mb-6">
      <NuxtLink to="/users" class="text-sm text-primary-600 hover:text-primary-800">&larr; Back to Users</NuxtLink>
    </div>

    <div v-if="loading" class="text-center py-20 text-gray-400">Loading...</div>

    <template v-else-if="user">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- User Info -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <div class="flex items-center gap-4 mb-6">
            <div class="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
              <span class="text-xl font-bold text-primary-600">
                {{ user.name?.charAt(0)?.toUpperCase() || '?' }}
              </span>
            </div>
            <div>
              <h2 class="text-lg font-bold text-gray-900">{{ user.name }}</h2>
              <p class="text-sm text-gray-500">{{ user.email }}</p>
            </div>
          </div>

          <div class="space-y-3 text-sm">
            <div class="flex justify-between py-2 border-b border-gray-100">
              <span class="text-gray-500">Plan</span>
              <span class="font-medium capitalize">{{ user.plan }}</span>
            </div>
            <div class="flex justify-between py-2 border-b border-gray-100">
              <span class="text-gray-500">Joined</span>
              <span class="font-medium">{{ formatDate(user.createdAt) }}</span>
            </div>
            <div class="flex justify-between py-2 border-b border-gray-100">
              <span class="text-gray-500">Children</span>
              <span class="font-medium">{{ user.children?.length ?? 0 }}</span>
            </div>
            <div class="flex justify-between py-2">
              <span class="text-gray-500">Devices</span>
              <span class="font-medium">{{ user.devices?.length ?? 0 }}</span>
            </div>
          </div>

          <button
            class="w-full mt-6 px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            @click="handleSuspend"
          >
            Suspend Account
          </button>
        </div>

        <!-- Children -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Children</h3>
          <div v-if="!user.children?.length" class="text-sm text-gray-400 py-4 text-center">
            No children profiles
          </div>
          <div v-for="child in user.children" :key="child._id" class="py-3 border-b border-gray-100 last:border-0">
            <p class="text-sm font-medium text-gray-900">{{ child.name }}</p>
            <p class="text-xs text-gray-500">Age {{ child.age }}</p>
          </div>
        </div>

        <!-- Devices -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Devices</h3>
          <div v-if="!user.devices?.length" class="text-sm text-gray-400 py-4 text-center">
            No paired devices
          </div>
          <div v-for="device in user.devices" :key="device._id" class="py-3 border-b border-gray-100 last:border-0">
            <div class="flex justify-between items-center">
              <div>
                <p class="text-sm font-medium text-gray-900">{{ device.model }}</p>
                <p class="text-xs text-gray-500">{{ device.platform }} {{ device.osVersion }}</p>
              </div>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                :class="device.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
              >
                {{ device.status }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { getUserDetail, suspendUser } = useApi();

const user = ref<any>(null);
const loading = ref(true);

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

async function handleSuspend() {
  if (!confirm('Are you sure you want to suspend this account?')) return;
  try {
    await suspendUser(route.params.id as string);
    alert('Account suspended.');
  } catch (e: any) {
    alert(e.message || 'Failed to suspend account.');
  }
}

onMounted(async () => {
  try {
    user.value = await getUserDetail(route.params.id as string);
  } catch {
    // Handle error
  } finally {
    loading.value = false;
  }
});
</script>
