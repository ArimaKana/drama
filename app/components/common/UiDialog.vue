<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="modelValue" class="fixed inset-0 z-2000 flex items-center justify-center" @click.self="handleOverlayClick">
        <!-- backdrop -->
        <div class="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"></div>
        <!-- dialog -->
        <div class="relative bg-white rounded-2xl shadow-2xl shadow-black/10 transform transition-all" :style="{ width: width || '500px', maxWidth: '90vw' }">
          <!-- header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 class="text-lg font-semibold text-gray-900 tracking-tight">{{ title }}</h3>
            <button class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" @click="close">
              <span class="text-lg leading-none">✕</span>
            </button>
          </div>
          <!-- body -->
          <div class="px-6 py-5 max-h-[65vh] overflow-y-auto">
            <slot />
          </div>
          <!-- footer -->
          <div v-if="$slots.footer" class="px-6 py-4 bg-gray-50/50 border-t border-gray-100 rounded-b-2xl flex justify-end gap-3">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  title?: string
  width?: string
  closeOnClickModal?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function close() {
  emit('update:modelValue', false)
}

function handleOverlayClick() {
  if (props.closeOnClickModal !== false) {
    close()
  }
}
</script>

<style scoped>
.dialog-fade-enter-active {
  transition: opacity 0.2s ease;
}
.dialog-fade-leave-active {
  transition: opacity 0.15s ease;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
</style>
