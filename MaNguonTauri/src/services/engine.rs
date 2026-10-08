use std::path::{Path, PathBuf};

pub fn find_engine(name: &str, resource_dir: Option<&Path>) -> Result<PathBuf, String> {
    find_optional_engine(name, resource_dir).ok_or_else(|| {
        format!(
            "Không tìm thấy {}. Đặt engine trong DuLieu/ThucThi hoặc chạy CapNhatEngine.bat.",
            if cfg!(windows) {
                format!("{}.exe", name)
            } else {
                name.to_string()
            }
        )
    })
}

pub fn find_optional_engine(name: &str, resource_dir: Option<&Path>) -> Option<PathBuf> {
    let filename = if cfg!(windows) {
        format!("{}.exe", name)
    } else {
        name.to_string()
    };
    if let Some(path) = std::env::var_os(format!(
        "OMNI_{}_PATH",
        name.replace('-', "_").to_uppercase()
    )) {
        let path = PathBuf::from(path);
        if path.is_file() {
            return Some(path);
        }
    }
    let mut starts = Vec::new();
    if let Some(dir) = resource_dir {
        starts.push(dir.to_path_buf());
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            starts.push(dir.to_path_buf());
        }
    }
    if let Ok(cwd) = std::env::current_dir() {
        starts.push(cwd);
    }
    starts.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")));
    for start in starts {
        if let Some(path) = find_under(&start, &filename) {
            return Some(path);
        }
    }
    std::env::var_os("PATH").and_then(|paths| {
        std::env::split_paths(&paths)
            .map(|dir| dir.join(&filename))
            .find(|p| p.is_file())
    })
}

fn find_under(start: &Path, filename: &str) -> Option<PathBuf> {
    for dir in start.ancestors() {
        for subdir in ["DuLieu/ThucThi", "data/bin", "ThucThi", "bin", ""] {
            let candidate = dir.join(subdir).join(filename);
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn resolves_vietnamese_layout_from_deep_build_directory() {
        let root = std::env::temp_dir().join(format!("omni-engine-test-{}", std::process::id()));
        let bin = root.join("DuLieu/ThucThi");
        std::fs::create_dir_all(&bin).unwrap();
        std::fs::write(bin.join("yt-dlp.exe"), b"fixture").unwrap();
        assert_eq!(
            find_under(&root.join("MaNguonTauri/target/debug"), "yt-dlp.exe"),
            Some(bin.join("yt-dlp.exe"))
        );
        std::fs::remove_dir_all(root).unwrap();
    }
}
