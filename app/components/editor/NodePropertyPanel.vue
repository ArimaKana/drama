<template>
  <div class="p-5" v-if="store.selectedNode">
    <div class="flex justify-between items-center mb-5 pb-4 border-b border-gray-100">
      <h3 class="text-base font-semibold text-gray-800 tracking-tight">节点属性</h3>
      <div class="flex gap-2">
        <button class="px-2.5 py-1 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors" @click="setAsStart">
          设为起始
        </button>
        <button class="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors text-sm" @click="showDeleteNodeDialog = true">🗑</button>
      </div>
    </div>

    <!-- 通用属性 -->
    <div class="space-y-5">
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1.5">节点名称</label>
        <input v-model="nodeData.name" type="text" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" @change="updateField('name', nodeData.name)" />
      </div>

      <!-- 播片节点 -->
      <template v-if="nodeData.type === 'video'">
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1.5">关联视频</label>
          <button
            class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-left hover:border-blue-300 hover:bg-gray-50 transition-all"
            @click="showVideoPicker = true"
          >
            {{ selectedVideo?.name || '选择视频素材' }}
          </button>
          <p v-if="selectedVideo" class="mt-1 text-xs text-gray-500 truncate">{{ selectedVideo.url }}</p>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1.5">下一节点</label>
          <select v-model="nodeData.nextNodeId" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all shadow-sm" @change="updateField('nextNodeId', nodeData.nextNodeId)">
            <option value="">选择节点</option>
            <option v-for="n in otherNodes" :key="n.id" :value="n.id">{{ n.name }}</option>
          </select>
        </div>
        <EditorValueChangeEditor v-model="nodeData.valueChanges" @update:model-value="updateField('valueChanges', nodeData.valueChanges)" />
      </template>

      <!-- 选择节点 -->
      <template v-if="nodeData.type === 'choice'">
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1.5">提示语</label>
          <input v-model="nodeData.prompt" type="text" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" @change="updateField('prompt', nodeData.prompt)" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1.5">倒计时</label>
          <div class="flex items-center gap-3">
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="nodeData.hasCountdown" class="sr-only peer" @change="updateField('hasCountdown', nodeData.hasCountdown)" />
              <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
            <input
              v-if="nodeData.hasCountdown"
              v-model.number="nodeData.countdownSeconds"
              type="number"
              min="1"
              max="60"
              class="w-20 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              @change="updateField('countdownSeconds', nodeData.countdownSeconds)"
            />
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1.5">选项列表</label>
          <div class="w-full space-y-2">
            <div v-for="(opt, idx) in nodeData.options" :key="opt.id" class="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
              <input v-model="opt.text" placeholder="选项文本" class="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" @change="updateOptions" />
              <select v-model="opt.nextNodeId" class="w-28 px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all" @change="updateOptions">
                <option value="">→ 节点</option>
                <option v-for="n in otherNodes" :key="n.id" :value="n.id">{{ n.name }}</option>
              </select>
              <button class="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors text-xs shrink-0" @click="removeOption(idx as number)">🗑</button>
            </div>
            <button class="w-full px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors border-dashed" @click="addOption">+ 添加选项</button>
          </div>
        </div>
      </template>

      <!-- 结局节点 -->
      <template v-if="nodeData.type === 'ending'">
        <div>
          <label class="block text-xs text-gray-500 mb-1">结局标题</label>
          <input v-model="nodeData.title" type="text" class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" @change="updateField('title', nodeData.title)" />
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">结局描述</label>
          <textarea v-model="nodeData.description" rows="3" class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" @change="updateField('description', nodeData.description)"></textarea>
        </div>
      </template>

      <!-- 通关节点 -->
      <template v-if="nodeData.type === 'clear'">
        <div>
          <label class="block text-xs text-gray-500 mb-1">标题</label>
          <input v-model="nodeData.title" type="text" class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" @change="updateField('title', nodeData.title)" />
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">描述</label>
          <textarea v-model="nodeData.description" rows="3" class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" @change="updateField('description', nodeData.description)"></textarea>
        </div>
      </template>

      <!-- 条件分支节点 -->
      <template v-if="nodeData.type === 'condition'">
        <div>
          <label class="block text-xs text-gray-500 mb-1">逻辑关系</label>
          <div class="flex gap-4">
            <label class="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" v-model="nodeData.conditionGroup.logic" value="and" class="accent-blue-500" @change="updateField('conditionGroup', nodeData.conditionGroup)" />
              且 (AND)
            </label>
            <label class="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" v-model="nodeData.conditionGroup.logic" value="or" class="accent-blue-500" @change="updateField('conditionGroup', nodeData.conditionGroup)" />
              或 (OR)
            </label>
          </div>
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">条件列表</label>
          <div class="w-full">
            <div v-for="(cond, idx) in nodeData.conditionGroup.conditions" :key="idx" class="flex gap-1 mb-2 flex-wrap items-center">
              <select v-model="cond.characterId" class="w-20 px-1.5 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" @change="updateConditions">
                <option value="" disabled>角色</option>
                <option v-for="c in store.currentProject?.characters" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <select v-model="cond.valueId" class="w-20 px-1.5 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" @change="updateConditions">
                <option value="" disabled>数值</option>
                <option v-for="v in store.currentProject?.gameValues" :key="v.id" :value="v.id">{{ v.name }}</option>
              </select>
              <select v-model="cond.operator" class="w-17.5 px-1.5 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" @change="updateConditions">
                <option v-for="op in operators" :key="op" :value="op">{{ op }}</option>
              </select>
              <input v-model.number="cond.targetValue" type="number" class="w-15 px-1.5 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" @change="updateConditions" />
              <button class="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 rounded transition text-xs" @click="removeCondition(idx as number)">🗑</button>
            </div>
            <button class="px-2.5 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition" @click="addCondition">+ 添加条件</button>
          </div>
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">满足 → 节点</label>
          <select v-model="nodeData.trueNodeId" class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" @change="updateField('trueNodeId', nodeData.trueNodeId)">
            <option value="">选择节点</option>
            <option v-for="n in otherNodes" :key="n.id" :value="n.id">{{ n.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">不满足 → 节点</label>
          <select v-model="nodeData.falseNodeId" class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" @change="updateField('falseNodeId', nodeData.falseNodeId)">
            <option value="">选择节点</option>
            <option v-for="n in otherNodes" :key="n.id" :value="n.id">{{ n.name }}</option>
          </select>
        </div>
      </template>
    </div>
  </div>

  <CommonUiAssetPickerDialog
    v-model="showVideoPicker"
    title="选择视频素材"
    asset-type="video"
    :assets="store.currentProject?.assets.videos || []"
    :selected-id="nodeData.videoId"
    @select="handleSelectVideo"
  />

  <CommonDangerConfirmDialog
    v-model="showDeleteNodeDialog"
    title="确认删除节点"
    message="确定删除此节点吗？该操作不可撤销。"
    @confirm="confirmDeleteNode"
  />
</template>

<script setup lang="ts">
import { createId } from '~/utils/factory'
import type { ConditionOperator } from '~/types'
import { useProjectStore } from '~/stores/project'
import { useToast } from '~/composables/useToast'

const store = useProjectStore()
const toast = useToast()
const showVideoPicker = ref(false)
const showDeleteNodeDialog = ref(false)

const operators: ConditionOperator[] = ['>', '<', '>=', '<=', '==', '!=']

// 深拷贝当前选中节点数据用于编辑
const nodeData = ref<any>({})

watch(
  () => store.selectedNode,
  (node) => {
    if (node) {
      nodeData.value = JSON.parse(JSON.stringify(node))
    }
  },
  { immediate: true, deep: true },
)

const otherNodes = computed(() => {
  if (!store.currentChapter) return []
  return store.currentChapter.nodes.filter(n => n.id !== store.selectedNodeId)
})

const selectedVideo = computed(() => {
  return (store.currentProject?.assets.videos || []).find(v => v.id === nodeData.value.videoId)
})

function updateField(field: string, value: any) {
  if (!store.selectedNodeId) return
  store.updateNode(store.selectedNodeId, { [field]: value } as any)
}

function handleSelectVideo(id: string | null) {
  if (!id) return
  nodeData.value.videoId = id
  updateField('videoId', id)
  showVideoPicker.value = false
}

function updateOptions() {
  updateField('options', nodeData.value.options)
}

function addOption() {
  nodeData.value.options.push({
    id: createId(),
    text: `选项 ${nodeData.value.options.length + 1}`,
    nextNodeId: null,
    valueChanges: [],
  })
  updateOptions()
}

function removeOption(idx: number) {
  nodeData.value.options.splice(idx, 1)
  updateOptions()
}

function updateConditions() {
  updateField('conditionGroup', nodeData.value.conditionGroup)
}

function addCondition() {
  nodeData.value.conditionGroup.conditions.push({
    characterId: '',
    valueId: '',
    operator: '>=',
    targetValue: 0,
  })
  updateConditions()
}

function removeCondition(idx: number) {
  nodeData.value.conditionGroup.conditions.splice(idx, 1)
  updateConditions()
}

function setAsStart() {
  if (!store.currentChapter || !store.selectedNodeId) return
  store.updateChapter(store.currentChapter.id, { startNodeId: store.selectedNodeId })
  toast.success('已设为起始节点')
}

function handleDelete() {
  if (store.selectedNodeId) {
    store.deleteNode(store.selectedNodeId)
  }
}

function confirmDeleteNode() {
  handleDelete()
  showDeleteNodeDialog.value = false
}
</script>
