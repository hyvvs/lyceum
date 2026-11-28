//! Windows WebView2 request filtering.
//!
//! WebView2 may issue a GET while the host is handling NavigationStarting.
//! The navigation callback prevents an untrusted document from replacing the
//! local UI, while this earlier WebResourceRequested hook prevents the HTTP(S)
//! request itself from reaching an unapproved destination.

use crate::navigation;
use reqwest::Url;
use tauri::webview::PlatformWebview;
use webview2_com::{
    CoTaskMemPWSTR,
    Microsoft::Web::WebView2::Win32::{
        ICoreWebView2Environment, ICoreWebView2WebResourceRequestedEventArgs, ICoreWebView2_22,
        COREWEBVIEW2_WEB_RESOURCE_CONTEXT, COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL,
        COREWEBVIEW2_WEB_RESOURCE_CONTEXT_FETCH,
        COREWEBVIEW2_WEB_RESOURCE_REQUEST_SOURCE_KINDS_ALL,
    },
    WebResourceRequestedEventHandler,
};

#[cfg(feature = "native-smoke")]
use webview2_com::Microsoft::Web::WebView2::Win32::COREWEBVIEW2_WEB_RESOURCE_CONTEXT_XML_HTTP_REQUEST;
use windows::{
    core::{Interface, HSTRING, PWSTR},
    Win32::System::Com::IStream,
};

fn deny_request(
    environment: &ICoreWebView2Environment,
    args: &ICoreWebView2WebResourceRequestedEventArgs,
) -> windows::core::Result<()> {
    let response = unsafe {
        environment.CreateWebResourceResponse(
            None::<&IStream>,
            403,
            &HSTRING::from("Forbidden"),
            &HSTRING::from("Content-Type: text/plain; charset=utf-8\r\nCache-Control: no-store"),
        )?
    };
    unsafe { args.SetResponse(&response)? };
    Ok(())
}

fn deny_request_or_exit(
    environment: &ICoreWebView2Environment,
    args: &ICoreWebView2WebResourceRequestedEventArgs,
) {
    if deny_request(environment, args).is_err() {
        eprintln!("LYCEUM_WEB_RESOURCE_GUARD_FATAL: unable to synthesize a deny response");
        std::process::exit(1);
    }
}

pub(crate) fn install(webview: PlatformWebview) -> windows::core::Result<()> {
    let controller = webview.controller();
    let core = unsafe { controller.CoreWebView2()? };
    let environment = webview.environment();
    #[cfg(feature = "native-smoke")]
    let smoke_redirect_source = std::env::var("LYCEUM_WEBVIEW2_SMOKE_REDIRECT_SOURCE")
        .ok()
        .filter(|source| {
            Url::parse(source).is_ok_and(|url| {
                url.scheme() == "http"
                    && url.host_str() == Some("127.0.0.1")
                    && url.port().is_some()
                    && url.path() == "/native-smoke-redirect-source"
                    && url.username().is_empty()
                    && url.password().is_none()
                    && url.query().is_none()
            })
        });

    // API22 is required for cross-origin iframe and worker request sources.
    // Do not fall back to the legacy filter: that would silently weaken the
    // egress boundary on older WebView2 runtimes.
    let core = core.cast::<ICoreWebView2_22>()?;
    let http_filter = HSTRING::from("http://*/*");
    let https_filter = HSTRING::from("https://*/*");
    unsafe {
        core.AddWebResourceRequestedFilterWithRequestSourceKinds(
            &http_filter,
            COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL,
            COREWEBVIEW2_WEB_RESOURCE_REQUEST_SOURCE_KINDS_ALL,
        )?;
        core.AddWebResourceRequestedFilterWithRequestSourceKinds(
            &https_filter,
            COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL,
            COREWEBVIEW2_WEB_RESOURCE_REQUEST_SOURCE_KINDS_ALL,
        )?;
    }

    let handler = WebResourceRequestedEventHandler::create(Box::new(move |_, args| {
        let Some(args) = args else {
            eprintln!("LYCEUM_WEB_RESOURCE_GUARD_FATAL: missing event arguments");
            std::process::exit(1);
        };

        let inspection: windows::core::Result<(String, String, COREWEBVIEW2_WEB_RESOURCE_CONTEXT)> =
            (|| {
                let request = unsafe { args.Request()? };
                let mut raw_uri = PWSTR::null();
                unsafe { request.Uri(&mut raw_uri)? };
                let uri = CoTaskMemPWSTR::from(raw_uri).to_string();
                let mut raw_method = PWSTR::null();
                unsafe { request.Method(&mut raw_method)? };
                let method = CoTaskMemPWSTR::from(raw_method).to_string();
                let mut resource_context = COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL;
                unsafe { args.ResourceContext(&mut resource_context)? };
                Ok((uri, method, resource_context))
            })();
        let (uri, method, resource_context) = match inspection {
            Ok(details) => details,
            Err(_) => {
                deny_request_or_exit(&environment, &args);
                return Ok(());
            }
        };
        let fetch = resource_context == COREWEBVIEW2_WEB_RESOURCE_CONTEXT_FETCH;

        #[cfg(feature = "native-smoke")]
        if uri.starts_with("http://127.0.0.1:")
            && std::env::var_os("LYCEUM_DESKTOP_IPC_SMOKE").is_some()
        {
            use std::io::Write;
            let mut stdout = std::io::stdout().lock();
            let _ = writeln!(
                stdout,
                "LYCEUM_GUARD_OBSERVED_LOOPBACK method={} fetch={fetch}",
                method
            );
            let _ = stdout.flush();
        }

        #[cfg(feature = "native-smoke")]
        let smoke_redirect_source_allowed = std::env::var_os("LYCEUM_DESKTOP_IPC_SMOKE").is_some()
            && smoke_redirect_source.as_deref() == Some(uri.as_str())
            && method == "GET"
            && (fetch || resource_context == COREWEBVIEW2_WEB_RESOURCE_CONTEXT_XML_HTTP_REQUEST);
        #[cfg(not(feature = "native-smoke"))]
        let smoke_redirect_source_allowed = false;
        let allowed = smoke_redirect_source_allowed
            || Url::parse(&uri)
                .is_ok_and(|url| navigation::allows_web_resource_request(&url, fetch, &method));

        #[cfg(feature = "native-smoke")]
        if smoke_redirect_source_allowed {
            use std::io::Write;
            let mut stdout = std::io::stdout().lock();
            let _ = writeln!(stdout, "LYCEUM_REDIRECT_SOURCE_ALLOWED");
            let _ = stdout.flush();
        }

        if !allowed {
            deny_request_or_exit(&environment, &args);

            #[cfg(feature = "native-smoke")]
            if uri.starts_with("http://127.0.0.1:")
                && std::env::var_os("LYCEUM_DESKTOP_IPC_SMOKE").is_some()
            {
                use std::io::Write;
                let mut stdout = std::io::stdout().lock();
                let _ = writeln!(stdout, "LYCEUM_WEB_RESOURCE_PROBE_BLOCKED");
                let _ = stdout.flush();
            }
        }

        Ok(())
    }));

    let mut token = 0i64;
    unsafe { core.add_WebResourceRequested(&handler, &mut token)? };
    Ok(())
}
