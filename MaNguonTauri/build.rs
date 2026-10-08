use std::{env, fs, path::PathBuf};

fn main() {
    let manifest = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").expect("Missing Cargo manifest directory"));
    let frontend = manifest.join("../GiaoDien");
    // Check at build time so an incomplete frontend cannot produce a broken EXE.
    let files = [
        "index.html", "DinhDang.css", "KetNoiTauri.js", "TienIch.js",
        "HieuUngAmThanh.js", "GoiYAmNhac.js", "KhamPhaNhac.js", "UngDung.js", "favicon-32x32.png",
    ];
    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-changed=tauri.conf.json");
    if manifest.join("tauri.windows.conf.json").is_file() {
        println!("cargo:rerun-if-changed=tauri.windows.conf.json");
    }
    println!("cargo:rerun-if-changed={}", frontend.display());
    for name in files {
        let path = frontend.join(name);
        println!("cargo:rerun-if-changed={}", path.display());
        let metadata = fs::metadata(&path).unwrap_or_else(|_| {
            panic!("Missing frontend file: {}. Copy the complete GiaoDien folder beside MaNguonTauri before building.", path.display())
        });
        assert!(metadata.is_file() && metadata.len() > 0, "Empty frontend file: {}", path.display());
    }
    tauri_build::build();
}
