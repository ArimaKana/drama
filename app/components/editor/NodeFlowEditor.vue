<template>
  <div class="relative flex-1 w-full h-full overflow-hidden" ref="flowContainer">
    <button
      class="absolute top-3 right-3 z-20 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="!canClearNodes"
      @click="showClearConfirmDialog = true"
    >
      一键清空节点
    </button>
    <VueFlow
      id="editor-flow"
      class="w-full h-full"
      :default-viewport="{ zoom: 0.8, x: 100, y: 100 }"
      :min-zoom="0.2"
      :max-zoom="2"
      :snap-to-grid="true"
      :snap-grid="[20, 20]"
      @node-click="onNodeClick"
      @node-drag-stop="onNodeDragStop"
      @edge-update-start="onEdgeUpdateStart"
      @edge-update-end="onEdgeUpdateEnd"
      @connect="onConnect"
      @pane-click="onPaneClick"
    >
      <Background :gap="20" :size="1" pattern-color="rgba(0,0,0,0.08)" />
      <Controls position="bottom-left" />
      <MiniMap
        position="bottom-right"
        :width="200"
        :height="150"
        :node-color="miniMapNodeColor"
        :mask-color="'rgba(255,255,255,0.7)'"
      />

      <!-- 自定义节点 -->
      <template #node-video="nodeProps">
        <EditorFlowNodeCard :node="nodeProps" color="#3498db" icon="🎬" label="播片" />
      </template>
      <template #node-choice="nodeProps">
        <EditorFlowNodeCard :node="nodeProps" color="#e67e22" icon="🔀" label="选择" />
      </template>
      <template #node-ending="nodeProps">
        <EditorFlowNodeCard :node="nodeProps" color="#9b59b6" icon="🏁" label="结局" />
      </template>
      <template #node-clear="nodeProps">
        <EditorFlowNodeCard :node="nodeProps" color="#2ecc71" icon="🎉" label="通关" />
      </template>
      <template #node-condition="nodeProps">
        <EditorFlowNodeCard :node="nodeProps" color="#f39c12" icon="🔧" label="条件" />
      </template>
    </VueFlow>

    <CommonDangerConfirmDialog
      v-model="showClearConfirmDialog"
      title="确认清空节点"
      message="确认清空当前章节的所有节点吗？该操作不可撤销。"
      confirm-text="确认清空"
      @confirm="onConfirmClearNodes"
    />
  </div>
</template>

<script setup lang="ts">
import { VueFlow, useVueFlow, type Node, type Edge, type Connection } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import type { StoryNode, ChoiceNode, ConditionNode, VideoNode } from '~/types'
import { useProjectStore } from '~/stores/project'

// 导入 Vue Flow 样式
import '@vue-flow/core/dist/style.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

const store = useProjectStore()
const { setNodes, setEdges } = useVueFlow({ id: 'editor-flow' })
const canClearNodes = computed(() => !!store.currentChapter && store.currentChapter.nodes.length > 0)
const showClearConfirmDialog = ref(false)

// 监听 store 变化，通过 Vue Flow API 更新节点（保留内部 dimensions 状态，MiniMap 正常工作）
watch(
  () => store.currentChapter,
  (chapter) => {
    if (!chapter) {
      setNodes([])
      setEdges([])
      return
    }

    // 更新节点
    setNodes(
      chapter.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: { x: node.x, y: node.y },
        data: { ...node, isStart: chapter.startNodeId === node.id },
        label: node.name,
      }))
    )

    // 从节点数据自动生成连线
    const edges: Edge[] = []
    for (const node of chapter.nodes) {
      switch (node.type) {
        case 'video': {
          const vn = node as VideoNode
          if (vn.nextNodeId) {
            edges.push({
              id: `${vn.id}-next-${vn.nextNodeId}`,
              source: vn.id,
              target: vn.nextNodeId,
              sourceHandle: 'next',
              label: '下一步',
              animated: true,
            })
          }
          break
        }
        case 'choice': {
          const cn = node as ChoiceNode
          cn.options.forEach((opt, idx) => {
            if (opt.nextNodeId) {
              edges.push({
                id: `${cn.id}-opt${idx}-${opt.nextNodeId}`,
                source: cn.id,
                target: opt.nextNodeId,
                sourceHandle: `option-${opt.id}`,
                label: opt.text,
                style: { stroke: '#e67e22' },
              })
            }
          })
          break
        }
        case 'condition': {
          const cond = node as ConditionNode
          if (cond.trueNodeId) {
            edges.push({
              id: `${cond.id}-true-${cond.trueNodeId}`,
              source: cond.id,
              target: cond.trueNodeId,
              sourceHandle: 'true',
              label: '满足',
              style: { stroke: '#2ecc71' },
            })
          }
          if (cond.falseNodeId) {
            edges.push({
              id: `${cond.id}-false-${cond.falseNodeId}`,
              source: cond.id,
              target: cond.falseNodeId,
              sourceHandle: 'false',
              label: '不满足',
              style: { stroke: '#e74c3c' },
            })
          }
          break
        }
      }
    }
    setEdges(edges)
  },
  { deep: true, immediate: true }
)

function onNodeClick({ node }: { event: MouseEvent | TouchEvent; node: Node }) {
  store.selectNode(node.id)
}

function onNodeDragStop(event: { node: Node }) {
  store.updateNode(event.node.id, {
    x: event.node.position.x,
    y: event.node.position.y,
  } as any)
}

function onPaneClick() {
  store.selectNode(null)
}

function onEdgeUpdateStart() {}
function onEdgeUpdateEnd() {}

function onConnect(connection: Connection) {
  if (!store.currentChapter || !connection.source || !connection.target) return
  const sourceNode = store.currentChapter.nodes.find(n => n.id === connection.source)
  if (!sourceNode) return

  // 根据源节点类型和 handle 设置连接
  const handle = connection.sourceHandle || 'next'
  switch (sourceNode.type) {
    case 'video':
      store.updateNode(sourceNode.id, { nextNodeId: connection.target } as any)
      break
    case 'choice': {
      const cn = sourceNode as ChoiceNode
      const optId = handle.replace('option-', '')
      const opt = cn.options.find(o => o.id === optId)
      if (opt) opt.nextNodeId = connection.target
      else if (cn.options.length > 0) cn.options[0]!.nextNodeId = connection.target
      store.updateNode(sourceNode.id, { options: cn.options } as any)
      break
    }
    case 'condition':
      if (handle === 'true') store.updateNode(sourceNode.id, { trueNodeId: connection.target } as any)
      else store.updateNode(sourceNode.id, { falseNodeId: connection.target } as any)
      break
  }
}

function onClearNodes() {
  store.clearCurrentChapterNodes()
}

function onConfirmClearNodes() {
  onClearNodes()
  showClearConfirmDialog.value = false
}

function miniMapNodeColor(node: Node) {
  const colors: Record<string, string> = {
    video: '#3498db',
    choice: '#e67e22',
    ending: '#9b59b6',
    clear: '#2ecc71',
    condition: '#f39c12',
  }
  return colors[node.type || ''] || '#666'
}
</script>

<style scoped>
:deep(.vue-flow) {
  background: #f9fafb !important;
}

:deep(.vue-flow__edge-path) {
  stroke: rgba(0, 0, 0, 0.25) !important;
  stroke-width: 2 !important;
}

:deep(.vue-flow__edge) {
  cursor: pointer;
}

:deep(.vue-flow__edge.selected .vue-flow__edge-path) {
  stroke: #3b82f6 !important;
  stroke-width: 3 !important;
}

:deep(.vue-flow__edge-text) {
  fill: #4b5563 !important;
  font-size: 12px !important;
  font-weight: 500;
  background: white;
  padding: 2px 4px;
  border-radius: 2px;
}

:deep(.vue-flow__controls) {
  background: white !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

:deep(.vue-flow__controls button) {
  background: transparent !important;
  color: #374151 !important;
  border: none !important;
  border-bottom: 1px solid #e5e7eb !important;
  width: 32px !important;
  height: 32px !important;
}

:deep(.vue-flow__controls button:last-child) {
  border-bottom: none !important;
}

:deep(.vue-flow__controls button:hover) {
  background: #f3f4f6 !important;
}

:deep(.vue-flow__controls button svg) {
  fill: #374151 !important;
}

:deep(.vue-flow__minimap) {
  background: white !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

:deep(.vue-flow__handle) {
  background: #3b82f6 !important;
  border: 2px solid white !important;
}

:deep(.vue-flow__handle.connecting) {
  background: #ef4444 !important;
}

:deep(.vue-flow__handle.valid .vue-flow__handle-bottom) {
  background: #10b981 !important;
}
</style>
