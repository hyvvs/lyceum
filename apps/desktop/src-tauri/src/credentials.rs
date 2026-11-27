//! No password, credential-store error detail, or raw identifier is ever logged.

const SERVICE_NAME: &str = "app.lyceum.desktop";

fn valid_key_id(key_id: &str) -> bool {
    (1..=64).contains(&key_id.len())
        && key_id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
}

fn entry(key_id: &str) -> Result<keyring::Entry, &'static str> {
    if !valid_key_id(key_id) {
        return Err("invalid credential identifier");
    }
    #[cfg(not(any(windows, target_os = "macos")))]
    return Err("credential store unavailable");
    #[cfg(any(windows, target_os = "macos"))]
    keyring::Entry::new(SERVICE_NAME, key_id).map_err(|_| "credential store unavailable")
}

#[tauri::command]
pub(crate) fn credential_set(
    webview: tauri::WebviewWindow,
    key_id: String,
    secret: String,
) -> Result<(), &'static str> {
    crate::security::require_trusted_invoker(&webview)?;
    credential_set_native(&key_id, &secret)
}

fn credential_set_native(key_id: &str, secret: &str) -> Result<(), &'static str> {
    if secret.is_empty() || secret.len() > 16 * 1024 {
        return Err("invalid credential value");
    }
    entry(key_id)?
        .set_password(secret)
        .map_err(|_| "credential store unavailable")
}

// Native-only lookup. Raw secrets never cross the JS IPC boundary. Later
// provider-authorized native requests may retrieve them here, not through JS.
#[allow(dead_code)]
pub(crate) fn credential_get_native(key_id: &str) -> Result<Option<String>, &'static str> {
    match entry(key_id)?.get_password() {
        Ok(secret) => Ok(Some(secret)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(_) => Err("credential store unavailable"),
    }
}

#[tauri::command]
pub(crate) fn credential_has(
    webview: tauri::WebviewWindow,
    key_id: String,
) -> Result<bool, &'static str> {
    crate::security::require_trusted_invoker(&webview)?;
    Ok(credential_get_native(&key_id)?.is_some())
}

#[tauri::command]
pub(crate) fn credential_delete(
    webview: tauri::WebviewWindow,
    key_id: String,
) -> Result<bool, &'static str> {
    crate::security::require_trusted_invoker(&webview)?;
    credential_delete_native(&key_id)
}

fn credential_delete_native(key_id: &str) -> Result<bool, &'static str> {
    match entry(key_id)?.delete_credential() {
        Ok(()) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(_) => Err("credential store unavailable"),
    }
}

#[cfg(feature = "native-smoke")]
pub(crate) fn synthetic_smoke_round_trip(key_id: &str) -> Result<(), &'static str> {
    struct Cleanup(String);
    impl Drop for Cleanup {
        fn drop(&mut self) {
            let _ = credential_delete_native(&self.0);
        }
    }
    let _cleanup = Cleanup(key_id.to_owned());
    const SYNTHETIC_SECRET: &str = "synthetic-only-native-smoke-value";
    credential_set_native(key_id, SYNTHETIC_SECRET)?;
    let round_trip = credential_get_native(key_id)?;
    let deleted = credential_delete_native(key_id)?;
    let absent = credential_get_native(key_id)?.is_none();
    if round_trip.as_deref() != Some(SYNTHETIC_SECRET) || !deleted || !absent {
        return Err("credential store unavailable");
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keys_are_scoped_to_a_single_safe_identifier() {
        for invalid in [
            "",
            "../keys",
            "spaces not allowed",
            "a.b",
            "/root",
            "é",
            "\n",
        ] {
            assert!(!valid_key_id(invalid));
            assert!(entry(invalid).is_err());
        }
        assert!(!valid_key_id(&"x".repeat(65)));
        assert!(valid_key_id("provider_One-02"));
    }

    #[test]
    fn invalid_input_never_reaches_native_store() {
        assert_eq!(
            credential_set_native("valid", ""),
            Err("invalid credential value")
        );
        assert_eq!(
            credential_set_native("valid", &"x".repeat(16 * 1024 + 1)),
            Err("invalid credential value")
        );
        assert!(credential_get_native("../invalid").is_err());
        assert!(credential_delete_native("../invalid").is_err());
    }

    // This is not a mock: with the opt-in environment flag the test touches
    // Windows Credential Manager or the macOS login Keychain. The credential
    // contains no personal/API data; no assertion prints its value.
    #[cfg(any(windows, target_os = "macos"))]
    #[test]
    fn real_os_keychain_synthetic_round_trip_when_explicitly_enabled() {
        if std::env::var("LYCEUM_RUN_KEYCHAIN_TESTS").as_deref() != Ok("1") {
            return;
        }
        let key_id = format!(
            "synthetic-test-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        );
        struct Cleanup(String);
        impl Drop for Cleanup {
            fn drop(&mut self) {
                let _ = super::credential_delete_native(&self.0);
            }
        }
        let _cleanup = Cleanup(key_id.clone());
        let first = "synthetic-nonsecret-test-value";
        let updated = "synthetic-replacement-nonsecret-value";
        assert!(credential_get_native(&key_id).unwrap().is_none());
        credential_set_native(&key_id, first).expect("native keychain write failed");
        assert!(credential_get_native(&key_id).unwrap().as_deref() == Some(first));
        credential_set_native(&key_id, updated).expect("native keychain update failed");
        assert!(credential_get_native(&key_id).unwrap().as_deref() == Some(updated));
        assert_eq!(credential_delete_native(&key_id), Ok(true));
        assert!(credential_get_native(&key_id).unwrap().is_none());
        assert_eq!(credential_delete_native(&key_id), Ok(false));
    }
}
