<template>
  <div class="bg-white border border-ink-200 rounded-2xl p-8 shadow-sm">
    <h2 class="text-sm font-semibold text-ink-800 mb-1">Sign in</h2>
    <p class="text-xs text-ink-400 mb-6">Enter your admin credentials to continue</p>

    <form @submit.prevent="handleLogin" class="space-y-4">
      <div>
        <label for="email" class="block text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">Email</label>
        <input id="email" v-model="email" type="email" required placeholder="admin@example.com"
          class="w-full px-3.5 py-2.5 bg-ink-50 border border-ink-200 rounded-xl text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:border-ink-400 focus:ring-1 focus:ring-ink-300 transition" />
      </div>
      <div>
        <label for="password" class="block text-[10px] font-medium text-ink-400 uppercase tracking-widest mb-1.5">Password</label>
        <input id="password" v-model="password" type="password" required placeholder="••••••••"
          class="w-full px-3.5 py-2.5 bg-ink-50 border border-ink-200 rounded-xl text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:border-ink-400 focus:ring-1 focus:ring-ink-300 transition" />
      </div>
      <button type="submit" :disabled="loading"
        class="w-full bg-ink-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-ink-800 disabled:opacity-50 transition mt-1">
        {{ loading ? 'Signing in...' : 'Sign In' }}
      </button>
    </form>

    <div class="mt-5 pt-4 border-t border-ink-100">
      <p class="text-[11px] text-ink-400 text-center mb-2">First time setup?</p>
      <button :disabled="seeding" @click="handleSeed"
        class="w-full text-xs text-ink-500 border border-ink-200 py-2 rounded-xl hover:bg-ink-50 disabled:opacity-50 transition">
        {{ seeding ? 'Creating...' : 'Create Admin Account' }}
      </button>
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
