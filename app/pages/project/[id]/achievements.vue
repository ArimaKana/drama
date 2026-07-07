<template>
  <div class="h-full min-h-0 px-8 py-8 overflow-y-auto bg-gray-50/30">
    <div class="flex justify-between items-center mb-8">
      <div>
        <h3 class="text-xl font-bold text-gray-900 tracking-tight">成就管理</h3>
        <p class="text-sm text-gray-500 mt-1">管理游戏中的成就和解锁条件</p>
      </div>
      <button class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0" @click="showDialog = true">
        <span class="text-lg leading-none">+</span> 添加成就
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div v-for="ach in store.currentProject?.achievements || []" :key="ach.id" class="bg-white border border-gray-200/80 rounded-xl p-5 transition-all duration-300 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1 relative group">
        <div class="flex items-start gap-4">
          <div class="w-16 h-16 rounded-2xl bg-linear-to-br from-amber-50 to-orange-50 flex items-center justify-center overflow-hidden text-gray-400 shrink-0 ring-1 ring-amber-100 shadow-inner">
            <img v-if="ach.image" :src="store.getAssetUrl(ach.image)" alt="icon" class="w-full h-full object-cover" />
            <span v-else class="text-3xl drop-shadow-sm">🏆</span>
          </div>
          <div class="flex-1 min-w-0 pt-1">
            <h4 class="text-base text-gray-900 mb-1.5 font-bold truncate">{{ ach.name }}</h4>
            <p class="text-sm text-gray-500 leading-relaxed line-clamp-2">{{ ach.description || '暂无描述' }}</p>
          </div>
        </div>
        <div class="mt-4 pt-4 border-t border-gray-100">
          <div class="flex flex-wrap gap-1.5">
            <span v-for="(cond, idx) in ach.conditions" :key="idx" class="inline-flex items-center px-2 py-1 text-[11px] font-medium rounded-md bg-gray-50 text-gray-600 border border-gray-200/80">
              {{ conditionLabel(cond) }}
            </span>
            <span v-if="!ach.conditions?.length" class="text-xs text-gray-400 italic">无解锁条件</span>
          </div>
        </div>
        <div class="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm" @click="editItem(ach)" title="编辑">✎</button>
          <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm" @click="openDeleteAchievementDialog(ach.id)" title="删除">🗑</button>
        </div>
      </div>

      <div v-if="!store.currentProject?.achievements?.length" class="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 bg-white border border-gray-200 border-dashed rounded-xl">
        <span class="text-5xl mb-4 opacity-50">🏆</span>
        <p class="text-base">暂无成就，点击右上角按钮添加</p>
      </div>
    </div>

    <CommonUiDialog v-model="showDialog" :title="isEditing ? '编辑成就' : '添加成就'" width="600px">
      <div class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">成就名称</label>
          <input v-model="form.name" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" placeholder="请输入成就名称" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">描述</label>
          <CommonAiGenerateTextarea
            v-model="form.description"
            :rows="2"
            placeholder="描述"
            :prompt="achievementDescriptionPrompt"
            prompt-required-message="请先填写成就名称"
            generated-success-message="已生成成就描述"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">图片URL</label>
          <button
            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-300 hover:bg-gray-50 transition-all shadow-sm"
            @click="showImagePicker = true"
          >
            {{ selectedImage?.name || '选择成就图片' }}
          </button>
          <div v-if="selectedImage" class="mt-2 flex items-center gap-2">
            <img :src="store.getAssetUrl(selectedImage.url)" alt="achievement preview" class="w-8 h-8 rounded-md object-cover border border-gray-200" />
            <span class="text-xs text-gray-500 truncate">{{ selectedImage.url }}</span>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">达成条件</label>
          <div class="space-y-2">
            <div v-for="(cond, idx) in form.conditions" :key="idx" class="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100 flex-wrap">
              <select v-model="cond.type" class="px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all" style="width: 110px">
                <option value="value">数值条件</option>
                <option value="chapter_unlock">解锁章节</option>
                <option value="node_played">播放节点</option>
              </select>

              <template v-if="cond.type === 'value'">
                <select v-model="cond.characterId" class="px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all" style="width: 90px">
                  <option value="" disabled>角色</option>
                  <option v-for="c in store.currentProject?.characters" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
                <select v-model="cond.valueId" class="px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all" style="width: 90px">
                  <option value="" disabled>数值</option>
                  <option v-for="v in store.currentProject?.gameValues" :key="v.id" :value="v.id">{{ v.name }}</option>
                </select>
                <select v-model="cond.operator" class="px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all" style="width: 60px">
                  <option v-for="op in operators" :key="op" :value="op">{{ op }}</option>
                </select>
                <input v-model.number="cond.targetValue" type="number" class="px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" style="width: 70px" />
              </template>

              <template v-if="cond.type === 'chapter_unlock'">
                <select v-model="cond.chapterId" class="flex-1 min-w-45 px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all">
                  <option value="" disabled>选择章节</option>
                  <option v-for="ch in store.currentProject?.chapters" :key="ch.id" :value="ch.id">{{ ch.name }}</option>
                </select>
              </template>

              <template v-if="cond.type === 'node_played'">
                <select v-model="cond.nodeId" class="flex-1 min-w-45 px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all">
                  <option value="" disabled>选择节点</option>
                  <template v-for="ch in store.currentProject?.chapters" :key="ch.id">
                    <option v-for="n in ch.nodes" :key="n.id" :value="n.id">{{ ch.name }} / {{ n.name }}</option>
                  </template>
                </select>
              </template>

              <button class="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors text-xs shrink-0 ml-auto" @click="form.conditions.splice(idx, 1)">🗑</button>
            </div>
            <button class="w-full px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors border-dashed" @click="addCondition">+ 添加条件</button>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-1.5 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition" @click="showDialog = false">取消</button>
        <button class="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition" @click="saveItem">确定</button>
      </template>
    </CommonUiDialog>

    <CommonUiAssetPickerDialog
      v-model="showImagePicker"
      title="选择成就图片"
      asset-type="image"
      :assets="store.currentProject?.assets.images || []"
      :selected-id="form.image"
      :allow-none="true"
      none-label="不使用图片"
      @select="handleSelectImage"
    />

    <CommonDangerConfirmDialog
      v-model="showDeleteAchievementDialog"
      title="确认删除成就"
      message="确定删除此成就吗？该操作不可撤销。"
      @confirm="confirmDeleteAchievement"
    />
  </div>
</template>

<script setup lang="ts">
import type { Achievement, AchievementCondition, ConditionOperator } from '~/types'
import { useProjectStore } from '~/stores/project'
import { useToast } from '~/composables/useToast'

definePageMeta({ layout: 'editor' })

const store = useProjectStore()
const route = useRoute()
const toast = useToast()
const operators: ConditionOperator[] = ['>', '<', '>=', '<=', '==', '!=']

const showDialog = ref(false)
const showImagePicker = ref(false)
const showDeleteAchievementDialog = ref(false)
const pendingDeleteAchievementId = ref<string | null>(null)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const form = reactive({
  name: '',
  description: '',
  image: '',
  conditions: [] as AchievementCondition[],
})

const selectedImage = computed(() => {
  return (store.currentProject?.assets.images || []).find(i => i.id === form.image)
})

onMounted(async () => {
  const projectId = route.params.id as string
  if (!store.currentProject || store.currentProject.id !== projectId) {
    await store.openProject(projectId)
  }
})

function conditionLabel(cond: AchievementCondition) {
  if (cond.type === 'value') {
    const char = store.currentProject?.characters.find(c => c.id === cond.characterId)
    const val = store.currentProject?.gameValues.find(v => v.id === cond.valueId)
    return `${char?.name || '?'} ${val?.name || '?'} ${cond.operator} ${cond.targetValue}`
  }
  if (cond.type === 'chapter_unlock') {
    const ch = store.currentProject?.chapters.find(c => c.id === cond.chapterId)
    return `解锁: ${ch?.name || '?'}`
  }
  if (cond.type === 'node_played') {
    return `播放节点: ${cond.nodeId?.slice(0, 8) || '?'}`
  }
  return '未知条件'
}

function editItem(ach: Achievement) {
  isEditing.value = true
  editingId.value = ach.id
  form.name = ach.name
  form.description = ach.description
  form.image = ach.image
  form.conditions = JSON.parse(JSON.stringify(ach.conditions))
  showDialog.value = true
}

function handleSelectImage(id: string | null) {
  form.image = id || ''
  showImagePicker.value = false
}

function openDeleteAchievementDialog(achievementId: string) {
  pendingDeleteAchievementId.value = achievementId
  showDeleteAchievementDialog.value = true
}

function confirmDeleteAchievement() {
  if (!pendingDeleteAchievementId.value) return
  store.deleteAchievement(pendingDeleteAchievementId.value)
  pendingDeleteAchievementId.value = null
  showDeleteAchievementDialog.value = false
}

function addCondition() {
  form.conditions.push({
    type: 'value',
    characterId: '',
    valueId: '',
    operator: '>=',
    targetValue: 0,
  })
}

const achievementDescriptionPrompt = computed(() => {
  if (!form.name.trim()) {
    return ''
  }
  const conditionSummary = form.conditions.length
    ? form.conditions.map((cond) => conditionLabel(cond)).join('；')
    : '无'
  return `请为成就“${form.name}”生成一段成就描述，40-90字，简洁有激励感。解锁条件：${conditionSummary}`
})

async function saveItem() {
  if (!form.name.trim()) {
    toast.warning('请输入成就名称')
    return
  }
  if (isEditing.value && editingId.value) {
    store.updateAchievement(editingId.value, { ...form })
  } else {
    const ach = store.addAchievement(form.name)
    if (ach) {
      store.updateAchievement(ach.id, {
        description: form.description,
        image: form.image,
        conditions: form.conditions,
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
  form.description = ''
  form.image = ''
  form.conditions = []
}
</script>
