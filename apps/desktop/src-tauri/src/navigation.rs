//! Top-level WebView navigation is not a substitute for origin-scoped IPC, but
//! it prevents a remote document from replacing the privileged local UI.

use reqwest::Url;

fn permitted_origin(url: &Url, development: bool, windows: bool) -> bool {
    if !url.username().is_empty() || url.password().is_some() {
        return false;
    }
    let (scheme, host, port) = if development {
        ("http", "127.0.0.1", Some(5173))
    } else if windows {
        ("http", "tauri.localhost", Some(80))
    } else {
        ("tauri", "localhost", None)
    };
    url.scheme() == scheme && url.host_str() == Some(host) && url.port_or_known_default() == port
}

pub(crate) fn allows_navigation(url: &Url) -> bool {
    permitted_origin(url, cfg!(debug_assertions), cfg!(target_os = "windows"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn production_uses_only_the_bundled_platform_origin() {
        for (windows, allowed) in [
            (true, "http://tauri.localhost/settings"),
            (false, "tauri://localhost/settings"),
        ] {
            assert!(permitted_origin(
                &Url::parse(allowed).unwrap(),
                false,
                windows
            ));
            // Query/fragment are untrusted route *data*, not a different
            // document origin. Do not break normal client-side routing.
            let query = format!("{allowed}?tab=privacy#section");
            assert!(permitted_origin(
                &Url::parse(&query).unwrap(),
                false,
                windows
            ));
            for rejected in [
                "http://127.0.0.1:5173/",
                "https://tauri.localhost/",
                "http://tauri.localhost.evil.test/",
                "https://example.com/",
                "file:///etc/passwd",
                "data:text/html,evil",
                "about:blank",
                "http://tauri.localhost:8080/",
                "tauri://remote.test/",
            ] {
                if rejected != allowed {
                    assert!(
                        !permitted_origin(&Url::parse(rejected).unwrap(), false, windows),
                        "unexpected production navigation: {rejected}"
                    );
                }
            }
        }
    }

    #[test]
    fn dev_server_is_exact_and_never_authorized_in_production() {
        for allowed in [
            "http://127.0.0.1:5173/",
            "http://127.0.0.1:5173/settings",
            "http://127.0.0.1:5173/#fragment",
            "http://127.0.0.1:5173/?url=https://evil.test",
        ] {
            let url = Url::parse(allowed).unwrap();
            assert!(permitted_origin(&url, true, true));
            assert!(permitted_origin(&url, true, false));
            assert!(!permitted_origin(&url, false, true));
        }
        for rejected in [
            "http://localhost:5173/",
            "http://127.0.0.1:5174/",
            "http://127.0.0.2:5173/",
            "http://127.0.0.1.evil.test:5173/",
            "http://u@127.0.0.1:5173/",
            "https://127.0.0.1:5173/",
            "http://[::1]:5173/",
            "javascript:alert(1)",
        ] {
            assert!(
                !permitted_origin(&Url::parse(rejected).unwrap(), true, true),
                "{rejected}"
            );
        }
        assert!(Url::parse("http://%").is_err());
    }
}
