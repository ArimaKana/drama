<template>
  <div class="min-h-screen bg-white overflow-y-auto">
    <CommonToastContainer />
    <div class="px-10 py-20 text-center mb-12 bg-linear-to-b from-blue-50/50 to-transparent">
      <h1 class="text-5xl text-gray-900 mb-4 font-extrabold tracking-tight">
        🎬 <span class="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600">互动影游</span> 编辑器
      </h1>
      <p class="text-gray-500 text-lg max-w-2xl mx-auto">轻松创建、管理和发布你的互动影游项目，释放无限创意</p>
    </div>

    <div class="flex justify-center mb-12">
      <button class="inline-flex items-center gap-2.5 px-8 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0" @click="showCreateDialog = true">
        <span class="text-xl leading-none">+</span>
        新建项目
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-6xl mx-auto px-10 pb-10" :class="{ 'opacity-50 pointer-events-none': store.isLoading }">
      <div v-if="store.isLoading" class="col-span-full text-center py-20 text-gray-400">
        <div class="w-8 h-8 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p>加载中...</p>
      </div>
      <template v-else>
        <div
          v-for="project in store.projects"
          :key="project.id"
          class="bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-400 hover:shadow-xl relative group"
          @click="openProject(project.id)"
        >
          <div class="h-48 bg-gray-50 relative overflow-hidden">
            <img v-if="project.cover" :src="store.getAssetUrl(project.cover)" alt="cover" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div v-else class="h-full flex flex-col items-center justify-center text-gray-300 bg-linear-to-br from-gray-50 to-gray-100">
              <span class="text-6xl mb-2 transition-transform duration-300 group-hover:scale-110">🎬</span>
              <span class="text-sm font-medium text-gray-400">暂无封面</span>
            </div>
            <!-- 遮罩层 -->
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300"></div>
          </div>
          <div class="p-5">
            <h3 class="text-lg text-gray-900 mb-3 font-bold line-clamp-1 group-hover:text-blue-600 transition-colors">{{ project.name }}</h3>
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center text-xs text-gray-500">
                <span class="w-12 text-gray-400">创建于</span>
                <span>{{ formatDate(project.createdAt) }}</span>
              </div>
              <div class="flex items-center text-xs text-gray-500">
                <span class="w-12 text-gray-400">更新于</span>
                <span>{{ formatDate(project.updatedAt) }}</span>
              </div>
            </div>
          </div>
          <div class="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" @click.stop>
            <button class="w-8 h-8 flex items-center justify-center rounded-full bg-white/90 backdrop-blur shadow-sm text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all" @click="handleDelete(project.id)">
              <span class="text-sm">🗑</span>
            </button>
          </div>
        </div>

        <div v-if="store.projects.length === 0" class="col-span-full text-center py-20 text-gray-400">
          <span class="text-6xl">📂</span>
          <p class="mt-4 text-base">暂无项目，点击上方按钮创建</p>
        </div>
      </template>
    </div>

    <!-- 创建项目对话框 -->
    <CommonUiDialog
      v-model="showCreateDialog"
      title="新建项目"
      width="400px"
      :close-on-click-modal="false"
    >
      <form @submit.prevent="handleCreate">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">项目名称</label>
          <input
            v-model="newProjectName"
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="请输入项目名称"
            autofocus
          />
        </div>
        <div class="mb-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">项目位置</label>
          <div class="flex gap-2">
            <input
              v-model="newProjectDir"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-500"
              placeholder="请选择项目存放目录"
              readonly
            />
            <button type="button" class="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50" @click="selectDir">
              选择
            </button>
          </div>
        </div>
      </form>
      <template #footer>
        <button class="px-4 py-1.5 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition" @click="showCreateDialog = false">取消</button>
        <button class="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition disabled:opacity-50" :disabled="!newProjectName.trim() || !newProjectDir" @click="handleCreate">
          创建
        </button>
      </template>
    </CommonUiDialog>

    <CommonProjectDeleteDialog
      v-model="showDeleteDialog"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { isTauriRuntime } from '~/utils/runtime'
import { useProjectStore } from '~/stores/project'
import { useToast } from '~/composables/useToast'

const router = useRouter()
const store = useProjectStore()
const toast = useToast()

const showCreateDialog = ref(false)
const newProjectName = ref('')
const newProjectDir = ref('')
const showDeleteDialog = ref(false)
const pendingDeleteProjectId = ref<string | null>(null)

onMounted(() => {
  store.loadProjects()
})

async function selectDir() {
  if (isTauriRuntime()) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const selected = await open({
        directory: true,
        multiple: false,
      })
      if (selected) {
        newProjectDir.value = selected as string
      }
    } catch (e: any) {
      toast.error(e?.message || '目录选择失败，请检查 Tauri 插件配置')
    }
  } else {
    toast.error('浏览器环境不支持选择本地目录')
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function handleCreate() {
  if (!newProjectName.value.trim() || !newProjectDir.value) return
  try {
    const project = await store.newProject(newProjectName.value.trim(), newProjectDir.value)
    showCreateDialog.value = false
    newProjectName.value = ''
    newProjectDir.value = ''
    router.push(`/project/${project.id}/chapters`)
  } catch (e: any) {
    toast.error(e.message || '创建失败')
  }
}

async function openProject(id: string) {
  await store.openProject(id)
  router.push(`/project/${id}/chapters`)
}

function handleDelete(id: string) {
  pendingDeleteProjectId.value = id
  showDeleteDialog.value = true
}

async function confirmDelete(removeDirectory: boolean) {
  if (!pendingDeleteProjectId.value) return
  await store.deleteProject(pendingDeleteProjectId.value, removeDirectory)
  showDeleteDialog.value = false
  pendingDeleteProjectId.value = null
  toast.success(removeDirectory ? '已删除（含本地目录）' : '已删除')
}
</script>


