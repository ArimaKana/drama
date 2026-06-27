<template>
  <Teleport to="body">
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-9999 flex flex-col gap-2 items-center pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="pointer-events-auto px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 min-w-50 max-w-100"
          :class="toastClass(t.type)"
        >
          {{ t.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const { toasts } = useToast()

function toastClass(type: string) {
  switch (type) {
    case 'success': return 'bg-green-50 text-green-700 border border-green-200'
    case 'warning': return 'bg-yellow-50 text-yellow-700 border border-yellow-200'
    case 'error': return 'bg-red-50 text-red-700 border border-red-200'
    default: return 'bg-blue-50 text-blue-700 border border-blue-200'
  }
}
</script>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease;
}
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-12px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
