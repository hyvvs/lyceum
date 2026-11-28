//! The webview's label and *current* top-level origin gate every custom IPC.
//! A Tauri capability with no remote URLs is additionally kept in config.

use reqwest::Url;
pub(crate) fn is_trusted_invoker(label: &str, url: &Url) -> bool {
    label == "main" && crate::navigation::allows_navigation(url)
}

pub(crate) fn require_trusted_invoker(webview: &tauri::WebviewWindow) -> Result<(), &'static str> {
    let url = webview.url().map_err(|_| "desktop IPC unavailable")?;
    if is_trusted_invoker(webview.label(), &url) {
        Ok(())
    } else {
        Err("desktop IPC unavailable")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_main_window_at_compiled_origin_gets_native_commands() {
        let allowed = if cfg!(debug_assertions) {
            "http://127.0.0.1:5173/settings"
        } else if cfg!(windows) {
            "http://tauri.localhost/settings"
        } else {
            "tauri://localhost/settings"
        };
        let local = Url::parse(allowed).unwrap();
        assert!(is_trusted_invoker("main", &local));
        assert!(!is_trusted_invoker("secondary", &local));
        assert!(!is_trusted_invoker(
            "main",
            &Url::parse("https://evil.test").unwrap()
        ));
    }
}
