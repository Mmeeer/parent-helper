<template>
  <div class="w-full max-w-sm">
    <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <h1 class="text-xl font-bold text-gray-900 text-center mb-1">Admin Panel</h1>
      <p class="text-xs text-gray-400 text-center mb-6">Sign in with your admin account</p>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input v-model="email" type="email" required placeholder="admin@parenthelper.com"
            class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Password</label>
          <input v-model="password" type="password" required placeholder="Enter password"
            class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary-500 outline-none" />
        </div>
        <button type="submit" :disabled="loading"
          class="w-full bg-primary-600 text-white py-2.5 rounded-xl font-semibold text-xs hover:bg-primary-700 disabled:opacity-50 transition">
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <div class="mt-5 pt-4 border-t border-gray-100">
        <p class="text-[11px] text-gray-400 text-center mb-2">First time setup?</p>
        <button :disabled="seeding" @click="handleSeed"
          class="w-full text-xs text-gray-500 border border-gray-200 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition">
          {{ seeding ? 'Creating...' : 'Create Admin Account' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' });

const { login } = useApi();
const config = useRuntimeConfig();
const toast = useToast();

const email = ref('');
const password = ref('');
const loading = ref(false);
const seeding = ref(false);

async function handleLogin() {
  loading.value = true;
  try {
    const data = await login(email.value, password.value);
    if (data.user?.role !== 'admin') {
      const token = useCookie('admin_token');
      token.value = null;
      toast.error('Access denied. Admin account required.');
      return;
    }
    navigateTo('/');
  } catch (e: any) {
    toast.error(e?.data?.error || e.message || 'Invalid credentials');
  } finally {
    loading.value = false;
  }
}

async function handleSeed() {
  seeding.value = true;
  try {
    const res = await $fetch<{ message: string; email: string }>(`${config.public.apiBaseUrl}/admin/seed`, {
      method: 'POST',
    });
    toast.success(`Admin account created: ${res.email}. Default password: admin123456`);
    email.value = res.email;
  } catch (e: any) {
    const msg = e?.data?.error || e.message || 'Failed to create admin account';
    if (msg.includes('already exists')) {
      toast.error('Admin account already exists. Please sign in.');
    } else {
      toast.error(msg);
    }
  } finally {
    seeding.value = false;
  }
}
</script>
