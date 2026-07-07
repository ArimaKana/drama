<template>
  <div 
    :class="[
      'node-card min-w-45 border-2 rounded-xl bg-white shadow-sm cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5',
      { 'ring-4 ring-amber-400/30 ring-offset-2': node.data?.isStart }
    ]" 
    :style="{ borderColor: color }"
  >
    <Handle type="target" :position="Position.Top" class="w-3 h-3 bg-white border-2 transition-transform hover:scale-125" :style="{ borderColor: color }" />

    <div class="px-4 py-2.5 rounded-t-[10px] flex items-center gap-2.5" :style="{ background: color }">
      <span class="text-lg drop-shadow-sm">{{ icon }}</span>
      <span class="text-sm text-white font-bold tracking-wide flex-1 drop-shadow-sm">{{ label }}</span>
      <span v-if="node.data?.isStart" class="bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm">
        起始
      </span>
    </div>
    <div class="px-4 py-3.5 min-h-15 flex items-center bg-linear-to-b from-white to-gray-50/50 rounded-b-[10px]">
      <span class="text-sm text-gray-800 font-medium truncate">{{ node.data?.name || '未命名' }}</span>
    </div>

    <!-- 输出 handles -->
    <template v-if="node.data?.type === 'choice'">
      <Handle
        v-for="(opt, idx) in (node.data as any).options"
        :key="opt.id"
        type="source"
        :position="Position.Bottom"
        :id="`option-${opt.id}`"
        class="w-3 h-3 bg-white border-2 transition-transform hover:scale-125"
        :style="{ left: `${(Number(idx) + 1) * 100 / ((node.data as any).options.length + 1)}%`, borderColor: color }"
      />
    </template>
    <template v-else-if="node.data?.type === 'condition'">
      <Handle type="source" :position="Position.Bottom" id="true" class="w-3 h-3 bg-white border-2 transition-transform hover:scale-125" :style="{ left: '30%', borderColor: color }" />
      <Handle type="source" :position="Position.Bottom" id="false" class="w-3 h-3 bg-white border-2 transition-transform hover:scale-125" :style="{ left: '70%', borderColor: color }" />
    </template>
    <template v-else-if="node.data?.type !== 'ending' && node.data?.type !== 'clear'">
      <Handle type="source" :position="Position.Bottom" id="next" class="w-3 h-3 bg-white border-2 transition-transform hover:scale-125" :style="{ borderColor: color }" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

defineProps<{
  node: any
  color: string
  icon: string
  label: string
}>()
</script>

<style scoped>
.node-card {
  box-sizing: border-box;
  min-height: 100px;
  display: flex;
  flex-direction: column;
}
</style>
