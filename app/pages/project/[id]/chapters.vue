<template>
  <div class="flex h-full bg-white">
    <!-- 左侧章节列表 -->
    <aside class="w-64 border-r border-gray-200/80 flex flex-col bg-gray-50/50 backdrop-blur-sm shadow-[inset_-1px_0_0_rgba(0,0,0,0.05)]">
      <div class="h-14 px-5 flex items-center justify-between border-b border-gray-200/80 shrink-0 bg-white/50">
        <h3 class="font-bold text-gray-800 tracking-wide">章节列表</h3>
        <button class="w-8 h-8 flex items-center justify-center text-lg text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all duration-200 shadow-sm" @click="handleAddChapter" title="新建章节">+</button>
      </div>
      <div class="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        <div
          v-for="chapter in store.currentProject?.chapters || []"
          :key="chapter.id"
          :class="['px-3 py-2.5 cursor-pointer rounded-lg flex items-center justify-between group transition-all duration-200', store.currentChapterId === chapter.id ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-500/20' : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900']"
          @click="store.selectChapter(chapter.id)"
        >
          <div class="flex items-center gap-2 overflow-hidden">
            <span class="text-lg opacity-60 group-hover:opacity-100 transition-opacity" :class="store.currentChapterId === chapter.id ? 'text-blue-500' : 'text-gray-400'">📄</span>
            <span class="text-sm font-medium truncate">{{ chapter.name }}</span>
          </div>
          <div class="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" @click.stop>
            <button class="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-100/50 rounded-md transition-colors text-sm" @click="editChapter(chapter)" title="编辑">✎</button>
            <button class="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors text-sm" @click="openDeleteChapterDialog(chapter.id)" title="删除">🗑</button>
          </div>
        </div>
        <div v-if="!store.currentProject?.chapters?.length" class="px-4 py-12 flex flex-col items-center justify-center text-gray-400 text-sm">
          <span class="text-4xl mb-3 opacity-50">📂</span>
          <p>暂无章节</p>
          <button class="mt-4 px-4 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors" @click="handleAddChapter">立即创建</button>
        </div>
      </div>
    </aside>

    <!-- 右侧节点编辑器 -->
    <div class="flex-1 flex flex-col">
      <template v-if="store.currentChapter">
        <!-- 节点工具栏 -->
        <div class="h-14 px-6 flex items-center gap-3 bg-white/90 backdrop-blur-sm border-b border-gray-200/80 shrink-0 overflow-x-auto shadow-sm z-10">
          <div class="flex items-center gap-2 pr-4 border-r border-gray-200/80">
            <span class="text-sm font-medium text-gray-600 whitespace-nowrap shrink-0">添加节点</span>
          </div>
          <div class="flex items-center gap-2">
            <button class="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all duration-200 whitespace-nowrap active:scale-95" @click="addNode('video')">
              <span class="text-blue-500">🎬</span> 播片
            </button>
            <button class="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all duration-200 whitespace-nowrap active:scale-95" @click="addNode('choice')">
              <span class="text-purple-500">🔀</span> 选择
            </button>
            <button class="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all duration-200 whitespace-nowrap active:scale-95" @click="addNode('ending')">
              <span class="text-red-500">🏁</span> 结局
            </button>
            <button class="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all duration-200 whitespace-nowrap active:scale-95" @click="addNode('clear')">
              <span class="text-orange-500">🎉</span> 通关
            </button>
            <button class="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all duration-200 whitespace-nowrap active:scale-95" @click="addNode('condition')">
              <span class="text-cyan-500">🔧</span> 条件分支
            </button>
          </div>
          <div class="ml-auto flex items-center pl-4 border-l border-gray-200/80">
            <span
              v-if="store.currentChapter.startNodeId"
              class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full whitespace-nowrap shadow-sm"
            >
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              起始节点: {{ getNodeName(store.currentChapter.startNodeId) }}
            </span>
            <span v-else class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-full whitespace-nowrap shadow-sm">
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
              未设置起始节点
            </span>
          </div>
        </div>
        <!-- 流程图编辑器 -->
        <EditorNodeFlowEditor />
      </template>
      <div v-else class="flex-1 flex flex-col items-center justify-center text-gray-400">
        <span class="text-5xl">📄</span>
        <p class="mt-3">请选择或创建一个章节</p>
      </div>
    </div>

    <!-- 浮动节点属性面板（可拖拽） -->
    <div
      v-if="store.currentChapter && store.selectedNode"
      class="fixed bg-white border border-gray-200 rounded-lg shadow-2xl overflow-hidden z-50"
      :style="{ top: panelPos.y + 'px', left: panelPos.x + 'px', width: '320px' }"
    >
      <!-- 拖拽手柄 -->
      <div
        class="h-8 bg-gray-50 border-b border-gray-200 cursor-move flex items-center px-3 select-none"
        @mousedown="onPanelDragStart"
      >
        <span class="text-xs text-gray-400 flex items-center gap-1">⋮⋮ 节点属性</span>
        <button
          class="ml-auto w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
          @click="store.selectNode(null)"
        >
          <span class="text-sm leading-none">✕</span>
        </button>
      </div>
      <div class="overflow-y-auto" style="max-height: calc(80vh - 32px)">
        <EditorNodePropertyPanel />
      </div>
    </div>

    <!-- 章节编辑对话框 -->
    <CommonUiDialog v-model="showChapterDialog" :title="isEditingChapter ? '编辑章节' : '新建章节'" width="400px">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">章节名称</label>
          <input v-model="chapterForm.name" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="请输入章节名称" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">章节描述</label>
          <CommonAiGenerateTextarea
            v-model="chapterForm.description"
            :rows="3"
            placeholder="请输入章节描述"
            :prompt="chapterDescriptionPrompt"
            prompt-required-message="请先填写章节名称"
            generated-success-message="已生成章节简介"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">背景音乐</label>
          <button
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-blue-300 transition-colors"
            @click="showAudioPicker = true"
          >
            {{ selectedBackgroundAudio?.name || '不使用背景音乐' }}
          </button>
          <p v-if="selectedBackgroundAudio" class="mt-1 text-xs text-gray-500 truncate">{{ selectedBackgroundAudio.url }}</p>
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-1.5 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition" @click="showChapterDialog = false">取消</button>
        <button class="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition" @click="saveChapter">确定</button>
      </template>
    </CommonUiDialog>

    <CommonUiAssetPickerDialog
      v-model="showAudioPicker"
      title="选择背景音乐"
      asset-type="audio"
      :assets="store.currentProject?.assets.audios || []"
      :selected-id="chapterForm.backgroundAudioId"
      :allow-none="true"
      none-label="不使用背景音乐"
      @select="handleSelectBackgroundAudio"
    />

    <CommonDangerConfirmDialog
      v-model="showDeleteChapterDialog"
      title="确认删除章节"
      message="确定删除此章节吗？该操作不可撤销。"
      @confirm="confirmDeleteChapter"
    />
  </div>
</template>

<script setup lang="ts">
import type { Chapter } from '~/types'

definePageMeta({ layout: 'editor' })

const store = useProjectStore()
const route = useRoute()
const toast = useToast()

// 浮动面板拖拽
const panelPos = reactive({ x: 0, y: 0 })
const panelInitialized = ref(false)
const isDragging = ref(false)
const dragOffset = reactive({ x: 0, y: 0 })

function initPanelPosition() {
  if (!panelInitialized.value) {
    panelPos.x = window.innerWidth - 360
    panelPos.y = 120
    panelInitialized.value = true
  }
}

function onPanelDragStart(e: MouseEvent) {
  isDragging.value = true
  dragOffset.x = e.clientX - panelPos.x
  dragOffset.y = e.clientY - panelPos.y
  document.addEventListener('mousemove', onPanelDrag)
  document.addEventListener('mouseup', onPanelDragEnd)
}

function onPanelDrag(e: MouseEvent) {
  if (!isDragging.value) return
  panelPos.x = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 340))
  panelPos.y = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 100))
}

function onPanelDragEnd() {
  isDragging.value = false
  document.removeEventListener('mousemove', onPanelDrag)
  document.removeEventListener('mouseup', onPanelDragEnd)
}

watch(() => store.selectedNode, (node) => {
  if (node) initPanelPosition()
})

const showChapterDialog = ref(false)
const showAudioPicker = ref(false)
const showDeleteChapterDialog = ref(false)
const pendingDeleteChapterId = ref<string | null>(null)
const isEditingChapter = ref(false)
const editingChapterId = ref<string | null>(null)
const chapterForm = reactive({ name: '', description: '', backgroundAudioId: null as string | null })

const selectedBackgroundAudio = computed(() => {
  return (store.currentProject?.assets.audios || []).find(a => a.id === chapterForm.backgroundAudioId)
})

// 确保项目已加载
onMounted(async () => {
  const projectId = route.params.id as string
  if (!store.currentProject || store.currentProject.id !== projectId) {
    await store.openProject(projectId)
  }
  store.selectNode(null)
})

onBeforeRouteLeave(() => {
  store.selectNode(null)
})

function handleAddChapter() {
  isEditingChapter.value = false
  editingChapterId.value = null
  chapterForm.name = ''
  chapterForm.description = ''
  chapterForm.backgroundAudioId = null
  showChapterDialog.value = true
}

function editChapter(chapter: Chapter) {
  isEditingChapter.value = true
  editingChapterId.value = chapter.id
  chapterForm.name = chapter.name
  chapterForm.description = chapter.description
  chapterForm.backgroundAudioId = chapter.backgroundAudioId ?? null
  showChapterDialog.value = true
}

function handleSelectBackgroundAudio(id: string | null) {
  chapterForm.backgroundAudioId = id
  showAudioPicker.value = false
}

function openDeleteChapterDialog(chapterId: string) {
  pendingDeleteChapterId.value = chapterId
  showDeleteChapterDialog.value = true
}

function confirmDeleteChapter() {
  if (!pendingDeleteChapterId.value) return
  store.deleteChapter(pendingDeleteChapterId.value)
  pendingDeleteChapterId.value = null
  showDeleteChapterDialog.value = false
}

const chapterDescriptionPrompt = computed(() => {
  if (!chapterForm.name.trim()) {
    return ''
  }
  return `请为章节“${chapterForm.name}”生成一段章节简介，80-140字，突出剧情氛围与核心目标。背景音乐：${selectedBackgroundAudio.value?.name || '无'}`
})

async function saveChapter() {
  if (!chapterForm.name.trim()) {
    toast.warning('请输入章节名称')
    return
  }
  if (isEditingChapter.value && editingChapterId.value) {
    store.updateChapter(editingChapterId.value, {
      name: chapterForm.name,
      description: chapterForm.description,
      backgroundAudioId: chapterForm.backgroundAudioId,
    })
  } else {
    const chapter = store.addChapter(chapterForm.name)
    if (chapter) {
      store.updateChapter(chapter.id, {
        description: chapterForm.description,
        backgroundAudioId: chapterForm.backgroundAudioId,
      })
    }
  }
  try {
    await store.saveProject()
    showChapterDialog.value = false
  } catch (error: any) {
    toast.error(error?.message || '自动保存失败')
  }
}

async function addNode(type: string) {
  // 计算随机偏移位置
  const x = 200 + Math.random() * 400
  const y = 100 + Math.random() * 300
  const node = store.addNode(type, x, y)
  if (!node) return
  try {
    await store.saveProject()
  } catch (error: any) {
    toast.error(error?.message || '自动保存失败')
  }
}

function getNodeName(nodeId: string) {
  return store.currentChapter?.nodes.find(n => n.id === nodeId)?.name || '未知'
}
</script>


