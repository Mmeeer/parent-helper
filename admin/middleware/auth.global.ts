export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie('admin_token');

  // Allow access to login page without auth
  if (to.path === '/login') {
    // If already authenticated, redirect to dashboard
    if (token.value) {
      return navigateTo('/');
    }
    return;
  }

  // All other pages require authentication
  if (!token.value) {
    return navigateTo('/login');
  }
});
