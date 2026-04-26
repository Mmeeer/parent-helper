<template>
  <div class="min-h-screen bg-ink-50 flex items-center justify-center font-sans relative overflow-hidden">
    <div class="absolute -top-48 -right-48 w-96 h-96 bg-nest-500/5 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-48 -left-48 w-96 h-96 bg-nest-200/20 rounded-full blur-3xl pointer-events-none"></div>
    <div class="relative w-full max-w-sm px-4">
      <div class="text-center mb-8">
        <img src="/logo-mark.png" alt="Prime Kids" class="h-14 w-14 mx-auto mb-3" />
        <h1 class="font-display font-bold text-2xl text-ink-900">Prime Kids</h1>
        <p class="text-[10px] text-ink-400 tracking-widest uppercase mt-1">Admin Console</p>
      </div>
      <slot />
    </div>
  </div>
</template>
