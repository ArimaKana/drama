<template>
  <CommonUiDialog
    :model-value="modelValue"
    title="删除项目"
    width="420px"
    :close-on-click-modal="false"
    @update:model-value="value => emit('update:modelValue', value)"
  >
    <div class="text-sm text-gray-700 mb-4">确定删除该项目吗？</div>
    <label v-if="isTauri" class="flex items-center gap-2 text-sm text-gray-600 select-none">
      <input v-model="removeDirectory" type="checkbox" class="accent-blue-500" />
      同时删除本地项目目录（含 assets 资源）
    </label>
    <template #footer>
      <button class="px-4 py-1.5 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition" @click="handleCancel">取消</button>
      <button class="px-4 py-1.5 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition" @click="handleConfirm">删除</button>
    </template>
  </CommonUiDialog>
</template>

<script setup lang="ts">
import { isTauriRuntime } from '~/utils/runtime'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [removeDirectory: boolean]
}>()

const isTauri = ref(false)
const removeDirectory = ref(false)

onMounted(() => {
  isTauri.value = isTauriRuntime()
})

watch(() => props.modelValue, (visible) => {
  if (visible) {
    removeDirectory.value = false
  }
})

function handleCancel() {
  emit('update:modelValue', false)
}

function handleConfirm() {
  emit('confirm', removeDirectory.value)
}
</script>
