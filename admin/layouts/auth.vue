<template>
  <div class="min-h-screen bg-ink-50 flex items-center justify-center font-sans relative overflow-hidden">
    <div class="absolute -top-48 -right-48 w-96 h-96 bg-ac-500/5 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-48 -left-48 w-96 h-96 bg-ink-200/50 rounded-full blur-3xl pointer-events-none"></div>
    <div class="relative w-full max-w-sm px-4">
      <div class="text-center mb-8">
        <h1 class="font-serif italic text-4xl text-ink-900 font-semibold">Prime Kids</h1>
        <p class="text-[10px] text-ink-400 tracking-widest uppercase mt-2">Admin Console</p>
      </div>
      <slot />
    </div>
  </div>
</template>
