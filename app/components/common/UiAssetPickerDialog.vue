<template>
  <CommonUiDialog :model-value="modelValue" :title="title" width="720px" @update:model-value="emit('update:modelValue', $event)">
    <div class="space-y-4">
      <div v-if="assetType === 'image'" class="gap-2 bg-white p-1.5 rounded-lg border border-gray-200/80 inline-flex">
        <button
          v-for="opt in imageFilterOptions"
          :key="opt.value"
          class="px-3 py-1 text-xs font-medium rounded-md transition-all"
          :class="imageFilter === opt.value ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
          @click="imageFilter = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>

      <div class="flex justify-end gap-1.5">
        <button
          class="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
          @click="goToAssets"
        >
          去添加素材
        </button>
        <button
          v-if="allowNone"
          class="px-3 py-1.5 text-xs border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 transition-colors"
          @click="emit('select', null)"
        >
          {{ noneLabel || '清空选择' }}
        </button>
      </div>

      <div v-if="filteredAssets.length" class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          v-for="asset in filteredAssets"
          :key="asset.id"
          class="text-left p-3 rounded-lg border transition-all"
          :class="asset.id === selectedId
            ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-500/20'
            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'"
          @click="emit('select', asset.id)"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center overflow-hidden shrink-0">
              <img
                v-if="assetType === 'image' && asset.url"
                :src="store.getAssetUrl(asset.url)"
                alt="asset"
                class="w-full h-full object-cover"
              />
              <span v-else class="text-base">{{ assetEmoji }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-800 truncate">{{ asset.name }}</p>
              <p class="text-xs text-gray-500 truncate">{{ asset.url }}</p>
            </div>
          </div>
        </button>
      </div>

      <div v-else class="py-10 text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
        暂无可选素材
      </div>

    </div>
  </CommonUiDialog>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  title: string
  assetType: 'video' | 'image' | 'audio' | 'subtitle'
  assets: Array<{ id: string; name: string; url: string; category?: string }>
  selectedId?: string | null
  allowNone?: boolean
  noneLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  select: [id: string | null]
}>()

const store = useProjectStore()
const imageFilter = ref('all')

const imageFilterOptions = [
  { value: 'all', label: '全部' },
  { value: 'character', label: '角色' },
  { value: 'ui', label: 'UI' },
  { value: 'icon', label: '图标' },
  { value: 'scene', label: '场景' },
  { value: 'storyboard', label: '分镜' },
]

const filteredAssets = computed(() => {
  if (props.assetType !== 'image') return props.assets
  if (imageFilter.value === 'all') return props.assets
  return props.assets.filter(asset => asset.category === imageFilter.value)
})

const assetEmoji = computed(() => {
  if (props.assetType === 'video') return '🎬'
  if (props.assetType === 'audio') return '🎵'
  if (props.assetType === 'subtitle') return '💬'
  return '🖼'
})

const goToAssets = () => {
  emit('update:modelValue', false)
  const tabMap: Record<string, string> = {
    video: 'videos',
    image: 'images',
    audio: 'audios',
    subtitle: 'subtitles'
  }
  const tab = tabMap[props.assetType] || 'images'
  const projectId = store.currentProject?.id
  if (projectId) {
    navigateTo(`/project/${projectId}/assets?tab=${tab}`)
  }
}
</script>
