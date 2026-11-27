//! This command validates the app-owned directory and returns readiness only,
//! never a filesystem path or a general file API.

#[cfg(windows)]
use std::os::windows::fs::MetadataExt;
use std::path::Path;

#[cfg(target_os = "macos")]
pub(crate) fn ensure_macos_app_support_parent(path: &Path) -> Result<(), &'static str> {
    const UNAVAILABLE: &str = "app data location unavailable";
    let parent = path.parent().ok_or(UNAVAILABLE)?;
    let grandparent = parent.parent().ok_or(UNAVAILABLE)?;
    // Tauri's macOS data_dir is ~/Library/Application Support. On a fresh
    // profile the latter may not exist; create just that standard component,
    // never a recursive path supplied by the renderer.
    if parent.file_name().and_then(|name| name.to_str()) != Some("Application Support")
        || grandparent.file_name().and_then(|name| name.to_str()) != Some("Library")
    {
        return Err(UNAVAILABLE);
    }
    let library = std::fs::symlink_metadata(grandparent).map_err(|_| UNAVAILABLE)?;
    if !library.is_dir() || library.file_type().is_symlink() {
        return Err(UNAVAILABLE);
    }
    match std::fs::symlink_metadata(parent) {
        Ok(metadata) if metadata.is_dir() && !metadata.file_type().is_symlink() => Ok(()),
        Ok(_) => Err(UNAVAILABLE),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
            use std::os::unix::fs::{DirBuilderExt, PermissionsExt};
            let mut builder = std::fs::DirBuilder::new();
            builder.mode(0o700);
            builder.create(parent).map_err(|_| UNAVAILABLE)?;
            let created = std::fs::symlink_metadata(parent).map_err(|_| UNAVAILABLE)?;
            if !created.is_dir()
                || created.file_type().is_symlink()
                || created.permissions().mode() & 0o7777 != 0o700
            {
                return Err(UNAVAILABLE);
            }
            Ok(())
        }
        Err(_) => Err(UNAVAILABLE),
    }
}

pub(crate) fn ensure_private_directory(path: &Path) -> Result<(), &'static str> {
    const UNAVAILABLE: &str = "app data location unavailable";
    // The OS-provided app-data parent already exists. Create only the final
    // app-owned component: recursive creation could follow an attacker-planted
    // intermediate link. Reject a final symlink/reparse point, not a followed
    // metadata result.
    match std::fs::symlink_metadata(path) {
        Ok(metadata) => {
            if metadata.file_type().is_symlink() || !metadata.is_dir() {
                return Err(UNAVAILABLE);
            }
            #[cfg(windows)]
            if metadata.file_attributes() & 0x400 != 0 {
                // FILE_ATTRIBUTE_REPARSE_POINT
                return Err(UNAVAILABLE);
            }
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                // Never chmod an existing path after a separate pathname
                // check: it could be swapped for a symlink between the check
                // and chmod. Existing directories must already be private.
                if metadata.permissions().mode() & 0o7777 != 0o700 {
                    return Err(UNAVAILABLE);
                }
            }
        }
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
            #[cfg(unix)]
            {
                use std::os::unix::fs::DirBuilderExt;
                let mut builder = std::fs::DirBuilder::new();
                builder.mode(0o700);
                builder.create(path).map_err(|_| UNAVAILABLE)?;
            }
            #[cfg(not(unix))]
            std::fs::create_dir(path).map_err(|_| UNAVAILABLE)?;
        }
        Err(_) => return Err(UNAVAILABLE),
    }

    let metadata = std::fs::symlink_metadata(path).map_err(|_| UNAVAILABLE)?;
    if !metadata.is_dir() || metadata.file_type().is_symlink() {
        return Err(UNAVAILABLE);
    }
    #[cfg(windows)]
    if metadata.file_attributes() & 0x400 != 0 {
        return Err(UNAVAILABLE);
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if metadata.permissions().mode() & 0o7777 != 0o700 {
            return Err(UNAVAILABLE);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn directory_creation_rejects_files_and_accepts_existing_directory() {
        let root = std::env::temp_dir().join(format!("lyceum-desktop-dir-{}", std::process::id()));
        let dir = root.join("private");
        std::fs::create_dir_all(&root).unwrap();
        ensure_private_directory(&dir).unwrap();
        ensure_private_directory(&dir).unwrap();
        assert!(dir.is_dir());
        let file = root.join("not-a-directory");
        std::fs::write(&file, b"fixture").unwrap();
        assert!(ensure_private_directory(&file).is_err());
        std::fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn app_directory_does_not_recursively_create_missing_parents() {
        let root =
            std::env::temp_dir().join(format!("lyceum-desktop-missing-{}", std::process::id()));
        let path = root.join("missing-parent").join("app-data");
        assert!(ensure_private_directory(&path).is_err());
        assert!(!root.join("missing-parent").exists());
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn macos_application_support_parent_is_created_only_under_existing_library() {
        use std::os::unix::fs::PermissionsExt;
        let root = std::env::temp_dir().join(format!(
            "lyceum-desktop-macos-parent-{}",
            std::process::id()
        ));
        if root.exists() {
            std::fs::remove_dir_all(&root).unwrap();
        }
        let library = root.join("Library");
        let support = library.join("Application Support");
        std::fs::create_dir_all(&library).unwrap();
        let app_data = support.join("app.lyceum.desktop");
        ensure_macos_app_support_parent(&app_data).unwrap();
        assert_eq!(
            std::fs::metadata(&support).unwrap().permissions().mode() & 0o7777,
            0o700
        );
        let missing_library = root
            .join("Missing")
            .join("Library")
            .join("Application Support");
        assert!(ensure_macos_app_support_parent(&missing_library.join("app")).is_err());
        assert!(!root.join("Missing").exists());
        std::fs::remove_dir_all(root).unwrap();
    }

    #[cfg(windows)]
    #[test]
    fn windows_app_data_probe_inherits_profile_acl() {
        let parent =
            std::path::PathBuf::from(std::env::var_os("APPDATA").expect("Windows APPDATA"));
        let run = std::env::var("GITHUB_RUN_ID").unwrap_or_else(|_| std::process::id().to_string());
        let path = parent.join(format!("lyceum-m0-005-acl-probe-{run}"));
        ensure_private_directory(&path).unwrap();
        assert!(path.is_dir());
        if std::env::var("LYCEUM_KEEP_ACL_PROBE").as_deref() != Ok("1") {
            std::fs::remove_dir(&path).unwrap();
        }
    }

    #[cfg(unix)]
    #[test]
    fn app_directory_has_private_unix_mode_and_rejects_symlinks() {
        use std::os::unix::fs::{symlink, PermissionsExt};
        let root = std::env::temp_dir().join(format!("lyceum-desktop-unix-{}", std::process::id()));
        let dir = root.join("private");
        std::fs::create_dir_all(&root).unwrap();
        std::fs::create_dir(&dir).unwrap();
        std::fs::set_permissions(&dir, std::fs::Permissions::from_mode(0o755)).unwrap();
        assert!(ensure_private_directory(&dir).is_err());
        std::fs::set_permissions(&dir, std::fs::Permissions::from_mode(0o2700)).unwrap();
        assert!(ensure_private_directory(&dir).is_err());
        std::fs::set_permissions(&dir, std::fs::Permissions::from_mode(0o700)).unwrap();
        ensure_private_directory(&dir).unwrap();
        assert_eq!(
            std::fs::metadata(&dir).unwrap().permissions().mode() & 0o7777,
            0o700
        );
        let link = root.join("link");
        symlink(&dir, &link).unwrap();
        assert!(ensure_private_directory(&link).is_err());
        std::fs::remove_dir_all(root).unwrap();
    }
}
