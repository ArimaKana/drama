use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::AppHandle;
use tauri::Manager;
use tokio::net::TcpListener;
use tokio::sync::oneshot;
use base64::Engine;
use warp::Filter;

#[derive(Serialize, Deserialize, Default)]
struct WorkspaceConfig {
    projects: Vec<String>,
}

fn get_workspace_file(app: &AppHandle) -> PathBuf {
    let app_data = app
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");
    fs::create_dir_all(&app_data).ok();
    app_data.join("workspace.json")
}

fn load_workspace(app: &AppHandle) -> WorkspaceConfig {
    let file = get_workspace_file(app);
    if let Ok(content) = fs::read_to_string(file) {
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        WorkspaceConfig::default()
    }
}

fn save_workspace(app: &AppHandle, config: &WorkspaceConfig) -> Result<(), String> {
    let file = get_workspace_file(app);
    let content = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(file, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_project(app: AppHandle, name: String, parent_dir: String) -> Result<String, String> {
    let parent = PathBuf::from(parent_dir);
    if !parent.exists() {
        return Err("父目录不存在".to_string());
    }

    let project_dir = parent.join(&name);
    if project_dir.exists() {
        return Err("项目目录已存在".to_string());
    }

    fs::create_dir_all(project_dir.join("assets")).map_err(|e| e.to_string())?;

    let project_path = project_dir.to_string_lossy().to_string();
    let mut workspace = load_workspace(&app);
    if !workspace.projects.iter().any(|p| p == &project_path) {
        workspace.projects.push(project_path.clone());
        save_workspace(&app, &workspace)?;
    }

    Ok(project_path)
}

#[tauri::command]
pub fn save_project(app: AppHandle, path: String, data: String) -> Result<(), String> {
    let project_dir = PathBuf::from(&path);
    if !project_dir.exists() {
        fs::create_dir_all(&project_dir).map_err(|e| e.to_string())?;
    }
    fs::create_dir_all(project_dir.join("assets")).map_err(|e| e.to_string())?;

    let project_file = project_dir.join("project.json");
    fs::write(project_file, data).map_err(|e| e.to_string())?;

    let mut workspace = load_workspace(&app);
    if !workspace.projects.iter().any(|p| p == &path) {
        workspace.projects.push(path);
        save_workspace(&app, &workspace)?;
    }

    Ok(())
}

#[tauri::command]
pub fn load_project(path: String) -> Result<String, String> {
    let project_file = PathBuf::from(path).join("project.json");
    fs::read_to_string(project_file).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_projects(app: AppHandle) -> Result<Vec<String>, String> {
    let mut workspace = load_workspace(&app);
    let mut result = Vec::new();
    let mut valid_paths = Vec::new();

    for project_path in &workspace.projects {
        let project_file = PathBuf::from(project_path).join("project.json");
        if let Ok(content) = fs::read_to_string(&project_file) {
            if let Ok(mut json) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(obj) = json.as_object_mut() {
                    obj.insert(
                        "path".to_string(),
                        serde_json::Value::String(project_path.clone()),
                    );
                }
                if let Ok(serialized) = serde_json::to_string(&json) {
                    result.push(serialized);
                } else {
                    result.push(content);
                }
                valid_paths.push(project_path.clone());
            }
        }
    }

    if valid_paths.len() != workspace.projects.len() {
        workspace.projects = valid_paths;
        save_workspace(&app, &workspace)?;
    }

    Ok(result)
}

#[tauri::command]
pub fn delete_project(app: AppHandle, path: String, remove_dir: Option<bool>) -> Result<(), String> {
    let mut workspace = load_workspace(&app);
    workspace.projects.retain(|p| p != &path);
    save_workspace(&app, &workspace)?;

    if remove_dir.unwrap_or(false) {
        let project_dir = PathBuf::from(path);
        if project_dir.exists() {
            fs::remove_dir_all(project_dir).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

pub struct ServerState {
    pub stop_tx: Mutex<Option<oneshot::Sender<()>>>,
}

impl Default for ServerState {
    fn default() -> Self {
        Self {
            stop_tx: Mutex::new(None),
        }
    }
}

#[tauri::command]
pub async fn start_asset_server(app: AppHandle, path: String) -> Result<String, String> {
    if let Some(tx) = app.state::<ServerState>().stop_tx.lock().map_err(|e| e.to_string())?.take() {
        let _ = tx.send(());
    }

    let assets_dir = PathBuf::from(path).join("assets");
    fs::create_dir_all(&assets_dir).map_err(|e| e.to_string())?;

    let listener = TcpListener::bind(("127.0.0.1", 0))
        .await
        .map_err(|e| e.to_string())?;
    let addr = listener.local_addr().map_err(|e| e.to_string())?;

    let cors = warp::cors()
        .allow_origin("http://localhost:3000")
        .allow_origin("http://127.0.0.1:3000")
        .allow_methods(vec!["GET", "HEAD", "OPTIONS"]);

    let routes = warp::fs::dir(assets_dir).with(cors);
    let (stop_tx, stop_rx) = oneshot::channel::<()>();
    *app.state::<ServerState>()
        .stop_tx
        .lock()
        .map_err(|e| e.to_string())? = Some(stop_tx);

    tauri::async_runtime::spawn(async move {
        warp::serve(routes)
            .incoming(listener)
            .graceful(async {
                let _ = stop_rx.await;
            })
            .run()
            .await;
    });

    Ok(format!("http://{}", addr))
}

#[tauri::command]
pub fn stop_asset_server(app: AppHandle) -> Result<(), String> {
    if let Some(tx) = app
        .state::<ServerState>()
        .stop_tx
        .lock()
        .map_err(|e| e.to_string())?
        .take()
    {
        let _ = tx.send(());
    }

    Ok(())
}

#[tauri::command]
pub fn copy_asset(project_path: String, source_path: String, filename: String) -> Result<String, String> {
    let assets_dir = PathBuf::from(project_path).join("assets");
    fs::create_dir_all(&assets_dir).map_err(|e| e.to_string())?;

    let dest = assets_dir.join(filename.clone());
    fs::copy(source_path, dest).map_err(|e| e.to_string())?;

    Ok(filename)
}

#[tauri::command]
pub fn save_base64_asset(project_path: String, base64_data: String, filename: String) -> Result<String, String> {
    if filename.contains('/') || filename.contains('\\') || filename.contains("..") {
        return Err("文件名不合法".to_string());
    }

    let assets_dir = PathBuf::from(project_path).join("assets");
    fs::create_dir_all(&assets_dir).map_err(|e| e.to_string())?;

    let payload = if let Some((_, data)) = base64_data.split_once("base64,") {
        data.trim()
    } else {
        base64_data.trim()
    };

    if payload.is_empty() {
        return Err("图片数据为空".to_string());
    }

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(payload)
        .or_else(|_| base64::engine::general_purpose::URL_SAFE.decode(payload))
        .map_err(|e| format!("Base64 解码失败: {}", e))?;

    let dest = assets_dir.join(filename.clone());
    fs::write(dest, bytes).map_err(|e| e.to_string())?;

    Ok(filename)
}

fn guess_mime(filename: &str) -> &'static str {
    let lower = filename.to_lowercase();
    if lower.ends_with(".mp4") {
        "video/mp4"
    } else if lower.ends_with(".webm") {
        "video/webm"
    } else if lower.ends_with(".mov") {
        "video/quicktime"
    } else if lower.ends_with(".png") {
        "image/png"
    } else if lower.ends_with(".jpg") || lower.ends_with(".jpeg") {
        "image/jpeg"
    } else if lower.ends_with(".gif") {
        "image/gif"
    } else if lower.ends_with(".webp") {
        "image/webp"
    } else if lower.ends_with(".svg") {
        "image/svg+xml"
    } else if lower.ends_with(".bmp") {
        "image/bmp"
    } else if lower.ends_with(".mp3") {
        "audio/mpeg"
    } else if lower.ends_with(".wav") {
        "audio/wav"
    } else if lower.ends_with(".ogg") {
        "audio/ogg"
    } else if lower.ends_with(".srt") || lower.ends_with(".txt") {
        "text/plain"
    } else if lower.ends_with(".json") {
        "application/json"
    } else {
        "application/octet-stream"
    }
}

/// 读取项目 assets 目录下的资源文件，返回可内联的 data URI。
#[tauri::command]
pub fn read_asset_as_base64(project_path: String, filename: String) -> Result<String, String> {
    if filename.contains("..") {
        return Err("文件名不合法".to_string());
    }
    let trimmed = filename.trim_start_matches(['/', '\\']);
    let file_path = PathBuf::from(&project_path).join("assets").join(trimmed);
    if !file_path.exists() {
        return Err(format!("资源文件不存在: {}", filename));
    }
    let bytes = fs::read(&file_path).map_err(|e| e.to_string())?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    let mime = guess_mime(&file_path.to_string_lossy());
    Ok(format!("data:{};base64,{}", mime, b64))
}

/// 将导出的 HTML 字符串写入用户选择的路径。
#[tauri::command]
pub fn write_export_file(path: String, content: String) -> Result<(), String> {
    let file_path = PathBuf::from(&path);
    if let Some(parent) = file_path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    fs::write(file_path, content).map_err(|e| e.to_string())?;
    Ok(())
}
