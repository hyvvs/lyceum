//! This command exposes only the app-owned directory path, never a file API.

#[cfg(windows)]
use std::os::windows::fs::MetadataExt;
use std::path::Path;

pub(crate) fn ensure_private_directory(path: &Path) -> Result<(), &'static str> {
    const UNAVAILABLE: &str = "app data location unavailable";
    // Reject an existing symlink/reparse point and non-directory, not just a
    // followed metadata result. Parent folders belong to the operating system.
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
        }
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
            #[cfg(unix)]
            {
                use std::os::unix::fs::DirBuilderExt;
                let mut builder = std::fs::DirBuilder::new();
                builder.recursive(true).mode(0o700);
                builder.create(path).map_err(|_| UNAVAILABLE)?;
            }
            #[cfg(not(unix))]
            std::fs::create_dir_all(path).map_err(|_| UNAVAILABLE)?;
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
        // Existing app-owned directories may have been created too broadly.
        std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o700))
            .map_err(|_| UNAVAILABLE)?;
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

    #[cfg(unix)]
    #[test]
    fn app_directory_has_private_unix_mode_and_rejects_symlinks() {
        use std::os::unix::fs::{symlink, PermissionsExt};
        let root = std::env::temp_dir().join(format!("lyceum-desktop-unix-{}", std::process::id()));
        let dir = root.join("private");
        std::fs::create_dir_all(&root).unwrap();
        std::fs::create_dir(&dir).unwrap();
        std::fs::set_permissions(&dir, std::fs::Permissions::from_mode(0o755)).unwrap();
        ensure_private_directory(&dir).unwrap();
        assert_eq!(
            std::fs::metadata(&dir).unwrap().permissions().mode() & 0o777,
            0o700
        );
        let link = root.join("link");
        symlink(&dir, &link).unwrap();
        assert!(ensure_private_directory(&link).is_err());
        std::fs::remove_dir_all(root).unwrap();
    }
}
