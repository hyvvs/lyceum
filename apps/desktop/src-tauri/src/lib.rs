mod app_data;
mod credentials;
mod navigation;
mod network;
mod security;

use tauri::Manager;

#[tauri::command]
fn app_data_directory(
    app: tauri::AppHandle,
    webview: tauri::WebviewWindow,
) -> Result<String, &'static str> {
    security::require_trusted_invoker(&webview)?;
    let path = app
        .path()
        .app_data_dir()
        .map_err(|_| "app data location unavailable")?;
    app_data::ensure_private_directory(&path)?;
    Ok(path.to_string_lossy().into_owned())
}

pub fn run() {
    tauri::Builder::default()
        // Only a fixed, synthetic documentation destination is provisioned
        // (no provider, no secret and no automatic request). The native-only
        // policy cannot be changed from the renderer.
        .manage(network::AllowedDestinations::bundled())
        .manage(network::ActiveRequests::default())
        .setup(|app| {
            let main = app
                .config()
                .app
                .windows
                .iter()
                .find(|window| window.label == "main")
                .ok_or("main window configuration unavailable")?;
            // A manually created window is needed: Tauri's automatically
            // constructed windows cannot receive these two security hooks.
            tauri::WebviewWindowBuilder::from_config(app, main)?
                .on_navigation(navigation::allows_navigation)
                .on_new_window(|_, _| tauri::webview::NewWindowResponse::Deny)
                .build()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            credentials::credential_set,
            credentials::credential_has,
            credentials::credential_delete,
            network::native_http_request,
            network::cancel_http_request,
            app_data_directory
        ])
        .run(tauri::generate_context!())
        .expect("failed to initialize Lyceum desktop shell");
}
