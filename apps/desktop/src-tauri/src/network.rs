//! Native HTTP is explicit, bounded and independent of arbitrary renderer URLs.
//! Provider hosts, secrets and consent are NOT configured in this M0 task.

use reqwest::{redirect::Policy, Client, Method, Url};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    net::{IpAddr, SocketAddr, ToSocketAddrs},
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex,
    },
    time::Duration,
};
use tokio::sync::{oneshot, Semaphore};

const MAX_RESPONSE_BYTES: usize = 256 * 1024;
const MAX_REQUEST_BYTES: usize = 16 * 1024;
const MAX_URL_BYTES: usize = 2048;
const MAX_CONCURRENT_REQUESTS: usize = 8;
const TOTAL_TIMEOUT: Duration = Duration::from_secs(8);

#[derive(Clone)]
struct Destination {
    url: Url,
    allow_post: bool,
}

#[derive(Default)]
pub(crate) struct AllowedDestinations(HashMap<String, Destination>);

impl AllowedDestinations {
    /// Only Rust may configure destinations; no frontend command can add one.
    /// The documentation fixture is deliberately not a provider integration.
    pub(crate) fn bundled() -> Self {
        let mut policy = Self::default();
        policy
            .insert("documentation-example", "https://example.com/", false)
            .expect("fixed bundled HTTP destination must be valid");
        policy
    }

    fn insert(&mut self, id: &str, raw: &str, allow_post: bool) -> Result<(), &'static str> {
        if !safe_id(id) || raw.len() > MAX_URL_BYTES {
            return Err("destination configuration rejected");
        }
        let url = Url::parse(raw).map_err(|_| "destination configuration rejected")?;
        let hostname = url.host_str().ok_or("destination configuration rejected")?;
        if url.scheme() != "https"
            || hostname.parse::<IpAddr>().is_ok()
            || hostname == "localhost"
            || hostname.ends_with(".localhost")
            || hostname.ends_with(".local")
            || !url.username().is_empty()
            || url.password().is_some()
            || url.fragment().is_some()
            || url.query().is_some()
            || url.port_or_known_default() != Some(443)
        {
            return Err("destination configuration rejected");
        }
        if self.0.contains_key(id) {
            return Err("duplicate destination identifier");
        }
        self.0
            .insert(id.to_owned(), Destination { url, allow_post });
        Ok(())
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct NativeHttpRequest {
    destination_id: String,
    method: String,
    body: Option<String>,
    request_id: String,
}

#[derive(Serialize)]
pub(crate) struct NativeHttpResponse {
    status: u16,
    body: String,
}

pub(crate) struct ActiveRequests {
    requests: Mutex<HashMap<String, (u64, oneshot::Sender<()>)>>,
    next_token: AtomicU64,
    // A cancelled request can drop the Tokio JoinHandle but cannot stop a
    // blocking OS DNS resolver. The resolver owns its permit until it exits.
    dns_slots: Arc<Semaphore>,
}

impl Default for ActiveRequests {
    fn default() -> Self {
        Self {
            requests: Mutex::default(),
            next_token: AtomicU64::new(0),
            dns_slots: Arc::new(Semaphore::new(MAX_CONCURRENT_REQUESTS)),
        }
    }
}

struct ActiveRequestGuard<'a> {
    active: &'a ActiveRequests,
    id: &'a str,
    token: u64,
}

impl Drop for ActiveRequestGuard<'_> {
    fn drop(&mut self) {
        if let Ok(mut requests) = self.active.requests.lock() {
            // A cancelled ID may be reused before the original future drops.
            // The original guard must not erase the replacement registration.
            if requests
                .get(self.id)
                .is_some_and(|(token, _)| *token == self.token)
            {
                requests.remove(self.id);
            }
        }
    }
}

fn safe_id(value: &str) -> bool {
    (1..=64).contains(&value.len())
        && value
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}

fn validate_request(
    request: &NativeHttpRequest,
    allowed: &AllowedDestinations,
) -> Result<(Url, Method, Option<String>), &'static str> {
    if !safe_id(&request.destination_id) || !safe_id(&request.request_id) {
        return Err("request identifier rejected");
    }
    let destination = allowed
        .0
        .get(&request.destination_id)
        .ok_or("destination not authorized")?;
    let method = match request.method.as_str() {
        "GET" => Method::GET,
        "POST" if destination.allow_post => Method::POST,
        _ => return Err("request method not authorized"),
    };
    let body = request.body.clone();
    if body
        .as_ref()
        .is_some_and(|value| value.len() > MAX_REQUEST_BYTES)
        || (method == Method::GET && body.is_some())
        || (method == Method::POST && body.is_none())
    {
        return Err("request body rejected");
    }
    Ok((destination.url.clone(), method, body))
}

fn public_destination_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(addr) => {
            let [a, b, c, _] = addr.octets();
            // Conservative deny of non-public, shared, benchmark, documentation,
            // multicast and reserved ranges. Private or local results cause an
            // entire hostname to be rejected, including mixed public/private.
            (1..=223).contains(&a)
                && a != 10
                && a != 127
                && !(a == 100 && (64..=127).contains(&b))
                && !(a == 169 && b == 254)
                && !(a == 172 && (16..=31).contains(&b))
                && !(a == 192 && (b == 0 || b == 168))
                && !(a == 192 && b == 88 && c == 99) // retired 6to4 anycast relay
                && !(a == 198 && (b == 18 || b == 19))
                && !(a == 192 && b == 0 && c == 2)
                && !(a == 198 && b == 51 && c == 100)
                && !(a == 203 && b == 0 && c == 113)
        }
        IpAddr::V6(addr) => {
            let bytes = addr.octets();
            // Conservative 2000::/3 only; deny all 2001::/23 IETF
            // protocol-assignment addresses (including 2001:2::/48),
            // documentation and 6to4 IPv4-embedded tunnels.
            (bytes[0] & 0xe0) == 0x20
                && !(bytes[0] == 0x20 && bytes[1] == 0x01 && bytes[2] <= 0x01)
                && !(bytes[0] == 0x20 && bytes[1] == 0x01 && bytes[2] == 0x0d && bytes[3] == 0xb8)
                && !(bytes[0] == 0x20 && bytes[1] == 0x02)
        }
    }
}

fn vetted_dns_addresses(addresses: Vec<SocketAddr>) -> Result<Vec<SocketAddr>, &'static str> {
    if addresses.is_empty()
        || addresses.len() > 32
        || addresses
            .iter()
            .any(|addr| addr.port() != 443 || !public_destination_ip(addr.ip()))
    {
        return Err("destination resolution rejected");
    }
    Ok(addresses)
}

async fn resolve_pinned(
    host: String,
    dns_slots: Arc<Semaphore>,
) -> Result<Vec<SocketAddr>, &'static str> {
    let permit = tokio::time::timeout(Duration::from_secs(2), dns_slots.acquire_owned())
        .await
        .map_err(|_| "destination resolution unavailable")?
        .map_err(|_| "destination resolution unavailable")?;
    let task = tauri::async_runtime::spawn_blocking(move || {
        let _permit = permit;
        let addresses = (host.as_str(), 443)
            .to_socket_addrs()
            .map_err(|_| "destination resolution unavailable")?
            // Read at most one beyond the allowed 32; avoid unbounded
            // intermediate allocation before checking the DNS answer cap.
            .take(33)
            .collect::<Vec<SocketAddr>>();
        vetted_dns_addresses(addresses)
    });
    tokio::time::timeout(Duration::from_secs(2), task)
        .await
        .map_err(|_| "destination resolution unavailable")?
        .map_err(|_| "destination resolution unavailable")?
}

async fn perform_request(
    url: Url,
    method: Method,
    body: Option<String>,
    dns_slots: Arc<Semaphore>,
) -> Result<NativeHttpResponse, &'static str> {
    let hostname = url
        .host_str()
        .ok_or("destination not authorized")?
        .to_owned();
    let addresses = resolve_pinned(hostname.clone(), dns_slots).await?;
    let client = Client::builder()
        .redirect(Policy::none())
        .no_proxy()
        .connect_timeout(Duration::from_secs(3))
        .timeout(Duration::from_secs(7))
        // TLS still validates the trusted hostname; DNS is never looked up
        // again during this request, so rebinding cannot redirect to local IPs.
        .resolve_to_addrs(&hostname, &addresses)
        .build()
        .map_err(|_| "network unavailable")?;
    let mut builder = client.request(method.clone(), url);
    if method == Method::POST {
        builder = builder
            .header(reqwest::header::CONTENT_TYPE, "application/json")
            .body(body.unwrap_or_default());
    }
    let mut response = builder.send().await.map_err(|_| "network unavailable")?;
    let status = response.status().as_u16();
    if (300..400).contains(&status) {
        return Err("redirect not permitted");
    }
    if response
        .content_length()
        .is_some_and(|n| n > MAX_RESPONSE_BYTES as u64)
    {
        return Err("response exceeded size limit");
    }
    let mut collected = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(|_| "network unavailable")? {
        if chunk.len() > MAX_RESPONSE_BYTES - collected.len() {
            return Err("response exceeded size limit");
        }
        collected.extend_from_slice(&chunk);
    }
    let body = String::from_utf8(collected).map_err(|_| "response was not UTF-8")?;
    Ok(NativeHttpResponse { status, body })
}

#[tauri::command]
pub(crate) async fn native_http_request(
    webview: tauri::WebviewWindow,
    request: NativeHttpRequest,
    allowed: tauri::State<'_, AllowedDestinations>,
    active: tauri::State<'_, ActiveRequests>,
) -> Result<NativeHttpResponse, &'static str> {
    crate::security::require_trusted_invoker(&webview)?;
    let (url, method, body) = validate_request(&request, &allowed)?;
    let (sender, receiver) = oneshot::channel();
    let token = active.next_token.fetch_add(1, Ordering::Relaxed);
    {
        let mut requests = active.requests.lock().map_err(|_| "request unavailable")?;
        if requests.len() >= MAX_CONCURRENT_REQUESTS || requests.contains_key(&request.request_id) {
            return Err("request limit reached");
        }
        requests.insert(request.request_id.clone(), (token, sender));
    }
    // This guard also unregisters an abandoned request if its Rust future
    // is dropped before the timeout or callback completes.
    let _guard = ActiveRequestGuard {
        active: &active,
        id: &request.request_id,
        token,
    };
    let dns_slots = active.dns_slots.clone();
    let result = tokio::select! {
        _ = receiver => Err("request cancelled"),
        result = tokio::time::timeout(TOTAL_TIMEOUT, perform_request(url, method, body, dns_slots)) =>
            result.unwrap_or(Err("network timeout")),
    };
    result
}

#[tauri::command]
pub(crate) fn cancel_http_request(
    webview: tauri::WebviewWindow,
    request_id: String,
    active: tauri::State<'_, ActiveRequests>,
) -> Result<bool, &'static str> {
    crate::security::require_trusted_invoker(&webview)?;
    if !safe_id(&request_id) {
        return Err("request identifier rejected");
    }
    let mut requests = active.requests.lock().map_err(|_| "request unavailable")?;
    if let Some((_, sender)) = requests.remove(&request_id) {
        let _ = sender.send(());
        return Ok(true);
    }
    Ok(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::{Ipv4Addr, Ipv6Addr};

    fn test_request(destination_id: &str, method: &str, body: Option<&str>) -> NativeHttpRequest {
        NativeHttpRequest {
            destination_id: destination_id.into(),
            method: method.into(),
            body: body.map(str::to_owned),
            request_id: "synthetic-01".into(),
        }
    }

    #[test]
    fn fail_closed_by_default_and_explicit_bundled_destination() {
        let request = test_request("documentation-example", "GET", None);
        assert!(validate_request(&request, &AllowedDestinations::default()).is_err());
        let policy = AllowedDestinations::bundled();
        assert_eq!(
            validate_request(&request, &policy).unwrap().0.as_str(),
            "https://example.com/"
        );
        assert!(validate_request(&test_request("other", "GET", None), &policy).is_err());
        assert!(validate_request(
            &test_request("documentation-example", "POST", Some("{}")),
            &policy
        )
        .is_err());
    }

    #[test]
    fn destination_configuration_rejects_scheme_host_and_url_ambiguities() {
        let mut policy = AllowedDestinations::default();
        for rejected in [
            "http://api.example.test/",
            "https://api.example.test:8443/",
            "https://evil.test@api.example.test/",
            "https://api.example.test/#foo",
            "https://api.example.test/?token=secret",
            "https://127.0.0.1/",
            "https://localhost/",
            "https://foo.local/",
            "https://api.example.test.evil.test/",
            "file:///etc/passwd",
        ] {
            if rejected == "https://api.example.test.evil.test/" {
                // A distinct valid host is not a bypass: it must be explicitly
                // approved under its own destination ID.
                continue;
            }
            assert!(
                policy.insert("test", rejected, false).is_err(),
                "{rejected}"
            );
        }
        policy
            .insert("test", "https://api.example.test/v1", true)
            .unwrap();
        assert!(policy.insert("test", "https://other.test/", true).is_err());
        assert!(validate_request(&test_request("test", "POST", Some("{}")), &policy).is_ok());
        assert!(validate_request(&test_request("test", "GET", Some("{}")), &policy).is_err());
        assert!(validate_request(&test_request("test", "DELETE", None), &policy).is_err());
        assert!(validate_request(
            &test_request("test", "POST", Some(&"X".repeat(MAX_REQUEST_BYTES + 1))),
            &policy
        )
        .is_err());
        let raw = r#"{"destinationId":"test","method":"GET","requestId":"id","authorization":"Bearer secret"}"#;
        assert!(serde_json::from_str::<NativeHttpRequest>(raw).is_err());
    }

    #[test]
    fn public_dns_pinning_rejects_private_and_mixed_results() {
        for forbidden in [
            "127.0.0.1",
            "10.0.0.1",
            "192.168.0.1",
            "169.254.169.254",
            "100.64.0.1",
            "172.20.0.1",
            "198.18.0.1",
            "192.88.99.5",
            "192.0.2.42",
            "198.51.100.2",
            "203.0.113.42",
            "0.0.0.0",
            "::1",
            "fd00::1",
            "fe80::1",
            "2001:db8::5",
            "2001:2::1",
            "2001:20::1",
            "2002:c0a8:0101::1",
            "::ffff:127.0.0.1",
        ] {
            assert!(
                !public_destination_ip(forbidden.parse().unwrap()),
                "{forbidden}"
            );
        }
        assert!(public_destination_ip(IpAddr::V4(Ipv4Addr::new(8, 8, 8, 8))));
        assert!(public_destination_ip(IpAddr::V6(
            "2606:4700:4700::1111".parse::<Ipv6Addr>().unwrap()
        )));
        let valid: SocketAddr = "8.8.8.8:443".parse().unwrap();
        let unsafe_addr: SocketAddr = "127.0.0.1:443".parse().unwrap();
        assert!(vetted_dns_addresses(vec![valid]).is_ok());
        assert!(vetted_dns_addresses(vec![valid, unsafe_addr]).is_err());
        assert!(vetted_dns_addresses(vec![]).is_err());
    }

    #[test]
    fn cancellation_cleanup_does_not_erase_a_reused_request_id() {
        let active = ActiveRequests::default();
        let (old_sender, _old_receiver) = oneshot::channel();
        let (new_sender, _new_receiver) = oneshot::channel();
        let id = "synthetic-request";
        active
            .requests
            .lock()
            .unwrap()
            .insert(id.into(), (1, old_sender));
        let guard = ActiveRequestGuard {
            active: &active,
            id,
            token: 1,
        };
        let _old = active.requests.lock().unwrap().remove(id);
        active
            .requests
            .lock()
            .unwrap()
            .insert(id.into(), (2, new_sender));
        drop(guard);
        assert_eq!(
            active.requests.lock().unwrap().get(id).map(|entry| entry.0),
            Some(2)
        );
    }

    #[test]
    fn cancelled_dns_tasks_cannot_unbound_blocking_resolvers() {
        let active = ActiveRequests::default();
        let permits: Vec<_> = (0..MAX_CONCURRENT_REQUESTS)
            .map(|_| active.dns_slots.clone().try_acquire_owned().unwrap())
            .collect();
        assert!(active.dns_slots.clone().try_acquire_owned().is_err());
        // Dropping the request/JoinHandle alone must not release a permit:
        // only completion of the underlying OS blocking resolver does.
        assert_eq!(active.dns_slots.available_permits(), 0);
        drop(permits);
        assert_eq!(
            active.dns_slots.available_permits(),
            MAX_CONCURRENT_REQUESTS
        );
    }
}
