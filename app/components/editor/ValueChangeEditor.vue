<template>
  <div class="mt-4 pt-4 border-t border-gray-100">
    <h4 class="text-xs font-medium text-gray-500 mb-3">数值变更</h4>
    <div class="space-y-2">
      <div v-for="(vc, idx) in modelValue" :key="idx" class="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
        <select v-model="vc.characterId" class="flex-1 min-w-[70px] px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all" @change="emit('update:modelValue', modelValue)">
          <option value="" disabled>角色</option>
          <option v-for="c in store.currentProject?.characters" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select v-model="vc.valueId" class="flex-1 min-w-[70px] px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all" @change="emit('update:modelValue', modelValue)">
          <option value="" disabled>数值</option>
          <option v-for="v in store.currentProject?.gameValues" :key="v.id" :value="v.id">{{ v.name }}</option>
        </select>
        <input v-model.number="vc.delta" type="number" class="w-16 px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-center" @change="emit('update:modelValue', modelValue)" />
        <button class="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors text-xs shrink-0" @click="remove(idx)">🗑</button>
      </div>
      <button class="w-full px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors border-dashed" @click="add">+ 添加变更</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ValueChange } from '~/types'

const props = defineProps<{
  modelValue: ValueChange[]
}>()
const emit = defineEmits<{
  'update:modelValue': [value: ValueChange[]]
}>()

const store = useProjectStore()

function add() {
  const newList = [...props.modelValue, { characterId: '', valueId: '', delta: 0 }]
  emit('update:modelValue', newList)
}

function remove(idx: number) {
  const newList = props.modelValue.filter((_, i) => i !== idx)
  emit('update:modelValue', newList)
}
</script>

