<template>
  <CommonUiDialog
    :model-value="modelValue"
    :title="title || '确认删除'"
    :width="width || '420px'"
    :close-on-click-modal="closeOnClickModal"
    @update:model-value="handleUpdate"
  >
    <div class="text-sm text-gray-700 leading-6">{{ message || '该操作不可撤销，是否继续？' }}</div>
    <template #footer>
      <button class="px-4 py-1.5 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition" @click="emit('update:modelValue', false)">
        {{ cancelText || '取消' }}
      </button>
      <button class="px-4 py-1.5 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition" @click="handleConfirm">
        {{ confirmText || '确认删除' }}
      </button>
    </template>
  </CommonUiDialog>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  width?: string
  closeOnClickModal?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()

function handleUpdate(value: boolean) {
  emit('update:modelValue', value)
}

function handleConfirm() {
  emit('confirm')
  emit('update:modelValue', false)
}
</script>
