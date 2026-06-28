import type { Project } from '~/types'
import { isTauriRuntime } from '~/utils/runtime'
import { exportProjectAsHtml } from '~/utils/exportGame'

/**
 * 导出当前项目为可玩的 H5 游戏（单文件 HTML）。
 * - 桌面端（Tauri）：弹出保存对话框，将自包含 HTML 写入用户选择的路径。
 * - 浏览器端：作为 .html 文件下载。
 */
export function useExportGame() {
  const isExporting = ref(false)

  async function exportGame(project: Project | null | undefined): Promise<{ ok: boolean; path?: string; error?: string }> {
    if (isExporting.value) return { ok: false }
    if (!project) {
      return { ok: false, error: '请先打开项目' }
    }
    if (!project.chapters || project.chapters.length === 0) {
      return { ok: false, error: '项目中暂无章节，无法导出' }
    }

    isExporting.value = true
    try {
      const { html, filename } = await exportProjectAsHtml(project)

      if (isTauriRuntime()) {
        const savedPath = await saveViaTauri(html, filename)
        if (!savedPath) {
          // 用户取消了保存对话框
          return { ok: false }
        }
        return { ok: true, path: savedPath }
      }

      downloadInBrowser(html, filename)
      return { ok: true }
    } catch (error: any) {
      return { ok: false, error: error?.message || '导出失败' }
    } finally {
      isExporting.value = false
    }
  }

  return {
    isExporting,
    exportGame,
  }
}

async function saveViaTauri(html: string, defaultFilename: string): Promise<string | null> {
  const { save } = await import('@tauri-apps/plugin-dialog')
  const filePath = await save({
    defaultPath: defaultFilename,
    filters: [{ name: 'HTML', extensions: ['html'] }],
  })
  if (!filePath) return null

  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('write_export_file', { path: filePath, content: html })
  return filePath
}

function downloadInBrowser(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
