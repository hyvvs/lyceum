mod app_data;
mod credentials;
mod navigation;
mod network;
mod security;
#[cfg(target_os = "windows")]
mod webview_request_guard;

#[cfg(all(target_os = "windows", feature = "native-smoke"))]
use std::path::PathBuf;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use tauri::Manager;

#[tauri::command]
fn app_data_directory(
    app: tauri::AppHandle,
    webview: tauri::WebviewWindow,
) -> Result<(), &'static str> {
    security::require_trusted_invoker(&webview)?;
    let path = app
        .path()
        .app_data_dir()
        .map_err(|_| "app data location unavailable")?;
    #[cfg(target_os = "macos")]
    app_data::ensure_macos_app_support_parent(&path)?;
    app_data::ensure_private_directory(&path)?;
    // The renderer only needs to know that the scoped directory is ready.
    // Never disclose the user/profile path over native IPC.
    #[cfg(feature = "native-smoke")]
    if std::env::var_os("LYCEUM_DESKTOP_IPC_SMOKE").is_some() {
        let key_id = format!("native-smoke-{}", std::process::id());
        credentials::synthetic_smoke_round_trip(&key_id)?;
        use std::io::Write;
        let mut stdout = std::io::stdout().lock();
        let _ = writeln!(stdout, "LYCEUM_NATIVE_IPC_READY");
        let _ = stdout.flush();
    }
    Ok(())
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
            let main = main.clone();
            #[cfg(target_os = "windows")]
            let mut main = main;
            let bootstrap = Arc::new(AtomicBool::new(cfg!(target_os = "windows")));
            #[cfg(target_os = "windows")]
            {
                // Start hidden at about:blank so the HTTP(S) request guard is
                // installed before any bundled renderer script can execute.
                main.visible = false;
                main.url = tauri::WebviewUrl::External(
                    reqwest::Url::parse("about:blank").expect("about:blank is a valid URL"),
                );
            }
            let bootstrap_for_navigation = Arc::clone(&bootstrap);
            // A manually created window is needed: Tauri's automatically
            // constructed windows cannot receive these two security hooks.
            let window_builder = tauri::WebviewWindowBuilder::from_config(app, &main)?;
            #[cfg(all(target_os = "windows", feature = "native-smoke"))]
            let window_builder = if std::env::var_os("LYCEUM_DESKTOP_IPC_SMOKE").is_some() {
                let data_directory = std::env::var_os("LYCEUM_WEBVIEW2_USER_DATA_DIR")
                    .map(PathBuf::from)
                    .ok_or_else(|| {
                        std::io::Error::new(
                            std::io::ErrorKind::InvalidInput,
                            "native smoke requires an isolated WebView2 data directory",
                        )
                    })?;
                let cdp_port = std::env::var("LYCEUM_WEBVIEW2_CDP_PORT")
                    .map_err(|error| {
                        std::io::Error::new(
                            std::io::ErrorKind::InvalidInput,
                            format!("native smoke requires a WebView2 CDP port: {error}"),
                        )
                    })?
                    .parse::<u16>()
                    .map_err(|error| {
                        std::io::Error::new(
                            std::io::ErrorKind::InvalidInput,
                            format!("native smoke supplied an invalid WebView2 CDP port: {error}"),
                        )
                    })?;
                if cdp_port == 0 {
                    return Err(std::io::Error::new(
                        std::io::ErrorKind::InvalidInput,
                        "native smoke WebView2 CDP port must be nonzero",
                    )
                    .into());
                }
                let mut smoke_builder = window_builder;
                smoke_builder = smoke_builder.data_directory(data_directory);
                let additional_browser_args = format!(
                    "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --remote-debugging-address=127.0.0.1 --remote-debugging-port={cdp_port}"
                );
                smoke_builder.additional_browser_args(&additional_browser_args)
            } else {
                window_builder
            };
            let window = window_builder
                .on_navigation(move |url| {
                    if bootstrap_for_navigation.load(Ordering::Acquire)
                        && url.as_str() == "about:blank"
                    {
                        true
                    } else {
                        navigation::allows_navigation(url)
                    }
                })
                .on_new_window(|_, _| tauri::webview::NewWindowResponse::Deny)
                .build()?;

            #[cfg(target_os = "windows")]
            {
                let app_handle = app.handle().clone();
                let window_to_show = window.clone();
                let bootstrap_after_install = Arc::clone(&bootstrap);
                window.with_webview(move |webview| {
                    if let Err(error) = webview_request_guard::install(webview) {
                        eprintln!("failed to install WebView2 request guard: {error}");
                        app_handle.exit(1);
                        return;
                    }
                    bootstrap_after_install.store(false, Ordering::Release);
                    if let Err(error) = window_to_show.navigate(navigation::app_url()) {
                        eprintln!("failed to navigate to the bundled Lyceum origin: {error}");
                        app_handle.exit(1);
                        return;
                    }
                    if let Err(error) = window_to_show.show() {
                        eprintln!("failed to show the guarded Lyceum window: {error}");
                        app_handle.exit(1);
                        #[cfg(feature = "native-smoke")]
                        return;
                    }
                    #[cfg(feature = "native-smoke")]
                    if std::env::var_os("LYCEUM_DESKTOP_IPC_SMOKE").is_some() {
                        use std::io::Write;
                        let mut stdout = std::io::stdout().lock();
                        let _ = writeln!(stdout, "LYCEUM_WEBVIEW_REQUEST_GUARD_READY");
                        let _ = stdout.flush();
                    }
                })?;
            }

            #[cfg(not(target_os = "windows"))]
            window.show()?;
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
