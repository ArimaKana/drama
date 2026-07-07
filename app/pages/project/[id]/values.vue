<template>
  <div class="h-full min-h-0 px-8 py-8 overflow-y-auto bg-gray-50/30">
    <div class="flex justify-between items-center mb-8">
      <div>
        <h3 class="text-xl font-bold text-gray-900 tracking-tight">数值管理</h3>
        <p class="text-sm text-gray-500 mt-1">管理游戏中的好感度、属性等数值</p>
      </div>
      <button class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0" @click="showDialog = true">
        <span class="text-lg leading-none">+</span> 添加数值
      </button>
    </div>

    <div class="w-full max-w-4xl">
      <div v-for="val in store.currentProject?.gameValues || []" :key="val.id" class="flex items-center p-4 bg-white border border-gray-200/80 rounded-xl mb-3 gap-5 transition-all duration-200 hover:border-blue-300 hover:shadow-md group">
        <div class="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 overflow-hidden text-2xl shrink-0 ring-1 ring-gray-100">
          <img v-if="val.icon" :src="store.getAssetUrl(val.icon)" alt="icon" class="w-full h-full object-cover" />
          <span v-else>📊</span>
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="text-base text-gray-900 font-bold mb-1">{{ val.name }}</h4>
          <div class="flex items-center gap-4 text-sm text-gray-500">
            <span class="inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>默认: <span class="font-medium text-gray-700">{{ val.defaultValue }}</span></span>
            <span class="inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-gray-300"></span>范围: <span class="font-medium text-gray-700">{{ val.minValue }} ~ {{ val.maxValue }}</span></span>
          </div>
        </div>
        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm" @click="editItem(val)" title="编辑">✎</button>
          <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm" @click="openDeleteValueDialog(val.id)" title="删除">🗑</button>
        </div>
      </div>

      <div v-if="!store.currentProject?.gameValues?.length" class="flex flex-col items-center justify-center py-20 text-gray-400 bg-white border border-gray-200 border-dashed rounded-xl">
        <span class="text-5xl mb-4 opacity-50">📈</span>
        <p class="text-base">暂无数值，点击右上角按钮添加</p>
      </div>
    </div>

    <CommonUiDialog v-model="showDialog" :title="isEditing ? '编辑数值' : '添加数值'" width="450px">
      <div class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">数值名称</label>
          <input v-model="form.name" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" placeholder="如：好感度、勇气值" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">图标URL</label>
          <button
            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-300 hover:bg-gray-50 transition-all shadow-sm"
            @click="showIconPicker = true"
          >
            {{ selectedIcon?.name || '选择图标图片' }}
          </button>
          <div v-if="selectedIcon" class="mt-2 flex items-center gap-2">
            <img :src="store.getAssetUrl(selectedIcon.url)" alt="icon preview" class="w-8 h-8 rounded-md object-cover border border-gray-200" />
            <span class="text-xs text-gray-500 truncate">{{ selectedIcon.url }}</span>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">默认值</label>
            <input v-model.number="form.defaultValue" type="number" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">最小值</label>
            <input v-model.number="form.minValue" type="number" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">最大值</label>
            <input v-model.number="form.maxValue" type="number" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" />
          </div>
        </div>
      </div>
      <template #footer>
        <button class="px-5 py-2 text-sm font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors" @click="showDialog = false">取消</button>
        <button class="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-all active:scale-95" @click="saveItem">确定</button>
      </template>
    </CommonUiDialog>

    <CommonUiAssetPickerDialog
      v-model="showIconPicker"
      title="选择图标图片"
      asset-type="image"
      :assets="store.currentProject?.assets.images || []"
      :selected-id="form.icon"
      :allow-none="true"
      none-label="不使用图标"
      @select="handleSelectIcon"
    />

    <CommonDangerConfirmDialog
      v-model="showDeleteValueDialog"
      title="确认删除数值"
      message="确定删除此数值吗？该操作不可撤销。"
      @confirm="confirmDeleteValue"
    />
  </div>
</template>

<script setup lang="ts">
import type { GameValue } from '~/types'
import { useProjectStore } from '~/stores/project'
import { useToast } from '~/composables/useToast'

definePageMeta({ layout: 'editor' })

const store = useProjectStore()
const route = useRoute()
const toast = useToast()

const showDialog = ref(false)
const showIconPicker = ref(false)
const showDeleteValueDialog = ref(false)
const pendingDeleteValueId = ref<string | null>(null)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const form = reactive({
  name: '',
  icon: '',
  defaultValue: 0,
  minValue: 0,
  maxValue: 100,
})

const selectedIcon = computed(() => {
  return (store.currentProject?.assets.images || []).find(i => i.id === form.icon)
})

onMounted(async () => {
  const projectId = route.params.id as string
  if (!store.currentProject || store.currentProject.id !== projectId) {
    await store.openProject(projectId)
  }
})

function editItem(val: GameValue) {
  isEditing.value = true
  editingId.value = val.id
  form.name = val.name
  form.icon = val.icon
  form.defaultValue = val.defaultValue
  form.minValue = val.minValue
  form.maxValue = val.maxValue
  showDialog.value = true
}

function handleSelectIcon(id: string | null) {
  form.icon = id || ''
  showIconPicker.value = false
}

function openDeleteValueDialog(valueId: string) {
  pendingDeleteValueId.value = valueId
  showDeleteValueDialog.value = true
}

function confirmDeleteValue() {
  if (!pendingDeleteValueId.value) return
  store.deleteGameValue(pendingDeleteValueId.value)
  pendingDeleteValueId.value = null
  showDeleteValueDialog.value = false
}

async function saveItem() {
  if (!form.name.trim()) {
    toast.warning('请输入数值名称')
    return
  }
  if (isEditing.value && editingId.value) {
    store.updateGameValue(editingId.value, { ...form })
  } else {
    const val = store.addGameValue(form.name)
    if (val) {
      store.updateGameValue(val.id, {
        icon: form.icon,
        defaultValue: form.defaultValue,
        minValue: form.minValue,
        maxValue: form.maxValue,
      })
    }
  }
  try {
    await store.saveProject()
    showDialog.value = false
    resetForm()
  } catch (error: any) {
    toast.error(error?.message || '自动保存失败')
  }
}

function resetForm() {
  isEditing.value = false
  editingId.value = null
  form.name = ''
  form.icon = ''
  form.defaultValue = 0
  form.minValue = 0
  form.maxValue = 100
}
</script>
