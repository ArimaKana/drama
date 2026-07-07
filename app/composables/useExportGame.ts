import type { Project } from '~/types'
import { exportProjectForFolder, sanitizeFilename } from '~/utils/exportGame'

/**
 * 导出当前项目为可玩的 H5 游戏（一个文件夹：index.html + assets/）。
 *
 * 流程：
 *  1. 生成 index.html（资源引用为相对路径 assets/<filename>）+ 需复制的资源文件名列表。
 *  2. 弹目录选择对话框，让用户选择父目录。
 *  3. 在父目录下创建以项目名命名的子文件夹。
 *  4. 调 Rust 命令批量复制资源到 <文件夹>/assets/，再写入 index.html。
 */
export function useExportGame() {
  const isExporting = ref(false)

  async function exportGame(project: Project | null | undefined): Promise<{ ok: boolean; path?: string; error?: string }> {
    if (isExporting.value) return { ok: false }
    if (!project) {
      return { ok: false, error: '请先打开项目' }
    }
    if (!project.path) {
      return { ok: false, error: '当前项目没有本地路径，无法导出' }
    }
    if (!project.chapters || project.chapters.length === 0) {
      return { ok: false, error: '项目中暂无章节，无法导出' }
    }

    isExporting.value = true
    try {
      const { html, assetFiles } = await exportProjectForFolder(project)
      const folderName = sanitizeFilename(project.name || 'game')

      const { open } = await import('@tauri-apps/plugin-dialog')
      const parentDir = await open({ directory: true, multiple: false, title: '选择导出位置' })
      if (!parentDir || (Array.isArray(parentDir) && parentDir.length === 0)) {
        // 用户取消了目录选择
        return { ok: false }
      }
      const parent = Array.isArray(parentDir) ? parentDir[0] : parentDir

      const { join } = await import('@tauri-apps/api/path')
      const { invoke } = await import('@tauri-apps/api/core')
      const targetDir = await join(parent, folderName)

      // 批量复制资源（远程 URL 资源不在此列表内，无需复制）
      await invoke('export_game_assets', {
        projectPath: project.path,
        targetDir,
        assets: assetFiles,
      })

      // 写入 index.html
      const indexHtmlPath = await join(targetDir, 'index.html')
      await invoke('write_export_file', { path: indexHtmlPath, content: html })

      return { ok: true, path: targetDir }
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
