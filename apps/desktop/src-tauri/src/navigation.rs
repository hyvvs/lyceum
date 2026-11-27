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

fn permitted_ipc_request(url: &Url, method: &str) -> bool {
    // Tauri 2.12.7's IPC protocol encodes the command name in the path
    // (`ipc://localhost/{command}`); Wry 0.57.4 maps it to this HTTP origin.
    // The command segment is therefore intentionally variable, but must be
    // exactly one non-empty segment. The protocol accepts POST and OPTIONS.
    url.username().is_empty()
        && url.password().is_none()
        && url.scheme() == "http"
        && url.host_str() == Some("ipc.localhost")
        && url.port_or_known_default() == Some(80)
        && url.query().is_none()
        && url.fragment().is_none()
        && matches!(method, "POST" | "OPTIONS")
        && url.path_segments().is_some_and(|mut segments| {
            let Some(command) = segments.next() else {
                return false;
            };
            !command.is_empty()
                && !command.to_ascii_lowercase().contains("%2f")
                && !command.to_ascii_lowercase().contains("%5c")
                && segments.next().is_none()
        })
}

fn permitted_web_resource(
    url: &Url,
    development: bool,
    windows: bool,
    fetch: bool,
    method: &str,
) -> bool {
    permitted_origin(url, development, windows) || (fetch && permitted_ipc_request(url, method))
}

pub(crate) fn allows_web_resource_request(url: &Url, fetch: bool, method: &str) -> bool {
    permitted_web_resource(
        url,
        cfg!(debug_assertions),
        cfg!(target_os = "windows"),
        fetch,
        method,
    )
}

pub(crate) fn app_url() -> Url {
    let origin = if cfg!(debug_assertions) {
        "http://127.0.0.1:5173/"
    } else if cfg!(target_os = "windows") {
        "http://tauri.localhost/"
    } else {
        "tauri://localhost/"
    };
    Url::parse(origin).expect("the bundled Lyceum origin is a valid URL")
}

pub(crate) fn allows_navigation(url: &Url) -> bool {
    let allowed = permitted_origin(url, cfg!(debug_assertions), cfg!(target_os = "windows"));
    #[cfg(feature = "native-smoke")]
    if !allowed
        && url.host_str() == Some("127.0.0.1")
        && std::env::var_os("LYCEUM_DESKTOP_IPC_SMOKE").is_some()
    {
        use std::io::Write;
        let mut stdout = std::io::stdout().lock();
        let _ = writeln!(stdout, "LYCEUM_NAVIGATION_PROBE_DENIED");
        let _ = stdout.flush();
    }
    allowed
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

    #[test]
    fn web_resource_guard_allows_only_app_and_fetch_ipc_requests() {
        for (raw, development, windows, fetch, method, expected) in [
            ("http://tauri.localhost/", false, true, false, "GET", true),
            ("http://127.0.0.1:5173/", true, true, false, "GET", true),
            (
                "http://ipc.localhost/__invoke",
                false,
                true,
                true,
                "POST",
                true,
            ),
            (
                "http://ipc.localhost/plugin%3A__TAURI_CHANNEL__%7Cfetch",
                false,
                true,
                true,
                "POST",
                true,
            ),
            (
                "http://ipc.localhost/__invoke",
                false,
                true,
                true,
                "OPTIONS",
                true,
            ),
            (
                "http://ipc.localhost/__invoke",
                false,
                true,
                true,
                "GET",
                false,
            ),
            (
                "http://ipc.localhost/__invoke",
                false,
                true,
                true,
                "PUT",
                false,
            ),
            ("http://ipc.localhost/", false, true, true, "POST", false),
            (
                "http://ipc.localhost/arbitrary/path",
                false,
                true,
                true,
                "POST",
                false,
            ),
            (
                "http://ipc.localhost/arbitrary%2fpath",
                false,
                true,
                true,
                "POST",
                false,
            ),
            (
                "http://ipc.localhost/arbitrary%5cpath",
                false,
                true,
                true,
                "POST",
                false,
            ),
            (
                "http://ipc.localhost/__invoke?next=https://evil.test",
                false,
                true,
                true,
                "POST",
                false,
            ),
            (
                "http://ipc.localhost/__invoke#fragment",
                false,
                true,
                true,
                "POST",
                false,
            ),
            (
                "http://ipc.localhost/__invoke",
                false,
                true,
                false,
                "POST",
                false,
            ),
            ("http://127.0.0.1:65534/", false, true, false, "GET", false),
            ("https://example.com/", false, true, false, "GET", false),
            (
                "http://tauri.localhost.evil.test/",
                false,
                true,
                false,
                "GET",
                false,
            ),
        ] {
            assert_eq!(
                permitted_web_resource(
                    &Url::parse(raw).unwrap(),
                    development,
                    windows,
                    fetch,
                    method,
                ),
                expected,
                "unexpected web resource policy for {method} {raw}"
            );
        }
    }
}
