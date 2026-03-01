<template>
  <div class="w-full max-w-sm">
    <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <h1 class="text-2xl font-bold text-gray-900 text-center mb-2">Admin Panel</h1>
      <p class="text-sm text-gray-500 text-center mb-8">Sign in with your admin account</p>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            placeholder="admin@parenthelper.com"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            placeholder="Enter password"
          />
        </div>

        <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
        <p v-if="success" class="text-sm text-green-600">{{ success }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <div class="mt-6 pt-4 border-t border-gray-100">
        <p class="text-xs text-gray-400 text-center mb-3">First time setup?</p>
        <button
          :disabled="seeding"
          class="w-full text-sm text-gray-500 border border-gray-200 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          @click="handleSeed"
        >
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
const email = ref('');
const password = ref('');
const loading = ref(false);
const seeding = ref(false);
const error = ref('');
const success = ref('');

async function handleLogin() {
  loading.value = true;
  error.value = '';
  success.value = '';
  try {
    const data = await login(email.value, password.value);
    if (data.user?.role !== 'admin') {
      // Not an admin — clear the token and show error
      const token = useCookie('admin_token');
      token.value = null;
      error.value = 'Access denied. Admin account required.';
      return;
    }
    navigateTo('/');
  } catch (e: any) {
    error.value = e?.data?.error || e.message || 'Invalid credentials';
  } finally {
    loading.value = false;
  }
}

async function handleSeed() {
  seeding.value = true;
  error.value = '';
  success.value = '';
  try {
    const res = await $fetch<{ message: string; email: string }>(`${config.public.apiBaseUrl}/admin/seed`, {
      method: 'POST',
    });
    success.value = `Admin account created: ${res.email}. Default password: admin123456`;
    email.value = res.email;
  } catch (e: any) {
    const msg = e?.data?.error || e.message || 'Failed to create admin account';
    if (msg.includes('already exists')) {
      error.value = 'Admin account already exists. Please sign in.';
    } else {
      error.value = msg;
    }
  } finally {
    seeding.value = false;
  }
}
</script>
