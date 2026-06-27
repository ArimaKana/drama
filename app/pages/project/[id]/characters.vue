<template>
  <div class="flex-1 px-8 py-8 overflow-y-auto bg-gray-50/30">
    <div class="flex justify-between items-center mb-8">
      <div>
        <h3 class="text-xl font-bold text-gray-900 tracking-tight">角色管理</h3>
        <p class="text-sm text-gray-500 mt-1">管理游戏中的所有登场角色</p>
      </div>
      <button class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0" @click="showDialog = true">
        <span class="text-lg leading-none">+</span> 添加角色
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div v-for="char in store.currentProject?.characters || []" :key="char.id" class="bg-white border border-gray-200/80 rounded-xl p-5 transition-all duration-300 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1 relative group">
        <div class="flex items-start gap-4">
          <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden text-gray-400 shrink-0 ring-4 ring-gray-50">
            <img v-if="char.avatar" :src="store.getAssetUrl(char.avatar)" alt="avatar" class="w-full h-full object-cover" />
            <span v-else class="text-3xl">👤</span>
          </div>
          <div class="flex-1 min-w-0 pt-1">
            <h4 class="text-base text-gray-900 mb-1.5 font-bold truncate">{{ char.name }}</h4>
            <span class="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full" :class="char.gender === 'male' ? 'bg-blue-50 text-blue-700 border border-blue-100' : char.gender === 'female' ? 'bg-pink-50 text-pink-700 border border-pink-100' : 'bg-gray-50 text-gray-600 border border-gray-200'">
              {{ genderLabel(char.gender) }}
            </span>
          </div>
        </div>
        <div class="mt-4">
          <p class="text-sm text-gray-500 leading-relaxed line-clamp-2">{{ char.description || '暂无简介' }}</p>
        </div>
        <div class="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm" @click="editItem(char)" title="编辑">✎</button>
          <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm" @click="openDeleteCharacterDialog(char.id)" title="删除">🗑</button>
        </div>
      </div>

      <div v-if="!store.currentProject?.characters?.length" class="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 bg-white border border-gray-200 border-dashed rounded-xl">
        <span class="text-5xl mb-4 opacity-50">👥</span>
        <p class="text-base">暂无角色，点击右上角按钮添加</p>
      </div>
    </div>

    <CommonUiDialog v-model="showDialog" :title="isEditing ? '编辑角色' : '添加角色'" width="500px">
      <div class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">角色名</label>
          <input v-model="form.name" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" placeholder="请输入角色名" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">性别</label>
          <div class="flex gap-6 bg-gray-50 p-3 rounded-lg border border-gray-100">
            <label class="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" v-model="form.gender" value="male" class="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" /> 男</label>
            <label class="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" v-model="form.gender" value="female" class="w-4 h-4 text-pink-600 focus:ring-pink-500 border-gray-300" /> 女</label>
            <label class="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" v-model="form.gender" value="other" class="w-4 h-4 text-gray-600 focus:ring-gray-500 border-gray-300" /> 其他</label>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">头像URL</label>
          <button
            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-300 hover:bg-gray-50 transition-all shadow-sm"
            @click="showAvatarPicker = true"
          >
            {{ selectedAvatar?.name || '选择头像图片' }}
          </button>
          <div v-if="selectedAvatar" class="mt-2 flex items-center gap-2">
            <img :src="store.getAssetUrl(selectedAvatar.url)" alt="avatar preview" class="w-8 h-8 rounded-full object-cover border border-gray-200" />
            <span class="text-xs text-gray-500 truncate">{{ selectedAvatar.url }}</span>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">简介</label>
          <CommonAiGenerateTextarea
            v-model="form.description"
            :rows="3"
            placeholder="请输入角色简介"
            :prompt="characterDescriptionPrompt"
            prompt-required-message="请先填写角色名"
            generated-success-message="已生成角色简介"
          />
        </div>
      </div>
      <template #footer>
        <button class="px-5 py-2 text-sm font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors" @click="showDialog = false">取消</button>
        <button class="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-all active:scale-95" @click="saveItem">确定</button>
      </template>
    </CommonUiDialog>

    <CommonUiAssetPickerDialog
      v-model="showAvatarPicker"
      title="选择头像图片"
      asset-type="image"
      :assets="store.currentProject?.assets.images || []"
      :selected-id="form.avatar"
      :allow-none="true"
      none-label="不使用头像"
      @select="handleSelectAvatar"
    />

    <CommonDangerConfirmDialog
      v-model="showDeleteCharacterDialog"
      title="确认删除角色"
      message="确定删除此角色吗？该操作不可撤销。"
      @confirm="confirmDeleteCharacter"
    />
  </div>
</template>

<script setup lang="ts">
import type { Character, Gender } from '~/types'
import { useProjectStore } from '~/stores/project'
import { useToast } from '~/composables/useToast'

definePageMeta({ layout: 'editor' })

const store = useProjectStore()
const route = useRoute()
const toast = useToast()

const showDialog = ref(false)
const showAvatarPicker = ref(false)
const showDeleteCharacterDialog = ref(false)
const pendingDeleteCharacterId = ref<string | null>(null)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const form = reactive({
  name: '',
  gender: 'other' as Gender,
  avatar: '',
  description: '',
})

const selectedAvatar = computed(() => {
  return (store.currentProject?.assets.images || []).find(i => i.id === form.avatar)
})

onMounted(async () => {
  const projectId = route.params.id as string
  if (!store.currentProject || store.currentProject.id !== projectId) {
    await store.openProject(projectId)
  }
})

function genderLabel(g: Gender) {
  return g === 'male' ? '男' : g === 'female' ? '女' : '其他'
}

function editItem(char: Character) {
  isEditing.value = true
  editingId.value = char.id
  form.name = char.name
  form.gender = char.gender
  form.avatar = char.avatar
  form.description = char.description
  showDialog.value = true
}

function handleSelectAvatar(id: string | null) {
  form.avatar = id || ''
  showAvatarPicker.value = false
}

function openDeleteCharacterDialog(characterId: string) {
  pendingDeleteCharacterId.value = characterId
  showDeleteCharacterDialog.value = true
}

function confirmDeleteCharacter() {
  if (!pendingDeleteCharacterId.value) return
  store.deleteCharacter(pendingDeleteCharacterId.value)
  pendingDeleteCharacterId.value = null
  showDeleteCharacterDialog.value = false
}

const characterDescriptionPrompt = computed(() => {
  if (!form.name.trim()) {
    return ''
  }
  return `请为角色“${form.name}”生成一段角色简介，80-140字，突出性格、身份和剧情作用。性别：${genderLabel(form.gender)}`
})

async function saveItem() {
  if (!form.name.trim()) {
    toast.warning('请输入角色名')
    return
  }
  if (isEditing.value && editingId.value) {
    store.updateCharacter(editingId.value, { ...form })
  } else {
    const char = store.addCharacter(form.name)
    if (char) {
      store.updateCharacter(char.id, {
        gender: form.gender,
        avatar: form.avatar,
        description: form.description,
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
  form.gender = 'other'
  form.avatar = ''
  form.description = ''
}
</script>
