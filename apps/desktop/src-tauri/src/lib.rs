use std::sync::Mutex;
#[cfg(not(debug_assertions))]
use std::net::TcpListener;
#[cfg(not(debug_assertions))]
use tauri::Manager;

#[cfg(not(debug_assertions))]
use std::process::{Child, Command};

#[allow(dead_code)]
struct ServerState {
    #[cfg(not(debug_assertions))]
    child: Mutex<Option<Child>>,
    #[cfg(debug_assertions)]
    _child: Mutex<Option<()>>,
    port: u16,
}

// Find an available TCP port starting from the given port
#[cfg(not(debug_assertions))]
fn find_open_port(start_port: u16) -> u16 {
    let mut port = start_port;
    loop {
        if TcpListener::bind(("127.0.0.1", port)).is_ok() {
            return port;
        }
        port += 1;
        if port == 0 { // wrapped around
            panic!("No open ports found");
        }
    }
}

fn get_configured_port() -> Option<u16> {
    // 1. Check command line arguments: --port, -p, or --gateway-port
    let args: Vec<String> = std::env::args().collect();
    for i in 0..args.len() {
        if (args[i] == "--port" || args[i] == "-p" || args[i] == "--gateway-port") && i + 1 < args.len() {
            if let Ok(p) = args[i + 1].parse::<u16>() {
                return Some(p);
            }
        }
    }

    // 2. Check environment variable GATEWAY_PORT
    if let Ok(val) = std::env::var("GATEWAY_PORT") {
        if let Ok(p) = val.parse::<u16>() {
            return Some(p);
        }
    }

    None
}

#[tauri::command]
fn get_server_port(_state: tauri::State<'_, ServerState>) -> u16 {
    _state.port
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let server_port = if let Some(custom_port) = get_configured_port() {
        custom_port
    } else {
        #[cfg(not(debug_assertions))]
        {
            find_open_port(3000)
        }
        #[cfg(debug_assertions)]
        {
            3000
        }
    };

    println!("[Tauri] Active server port: {}", server_port);

    tauri::Builder::default()
        .manage(ServerState {
            #[cfg(not(debug_assertions))]
            child: Mutex::new(None),
            #[cfg(debug_assertions)]
            _child: Mutex::new(None),
            port: server_port,
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_server_port])
        .setup(move |app| {
            // Only spawn background server in release (non-debug) mode
            #[cfg(not(debug_assertions))]
            {
                let app_handle = app.handle();
                let resource_dir = app_handle.path().resource_dir().expect("failed to get resource dir");
                
                // 1. Resolve paths to node and server entrypoint
                let is_windows = cfg!(target_os = "windows");
                let node_bin_name = if is_windows { "node.exe" } else { "node" };
                
                let node_path = resource_dir.join("_up_").join("resources").join("bin").join(node_bin_name);
                let server_path = resource_dir.join("_up_").join("resources").join("server").join("dist").join("main.js");

                println!("[Tauri] Resolved node path: {:?}", node_path);
                println!("[Tauri] Resolved server path: {:?}", server_path);
                
                // Ensure Node executable permissions on Linux/macOS
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    if let Ok(metadata) = std::fs::metadata(&node_path) {
                        let mut perms = metadata.permissions();
                        if perms.mode() & 0o111 != 0o111 {
                            perms.set_mode(perms.mode() | 0o111);
                            let _ = std::fs::set_permissions(&node_path, perms);
                        }
                    }
                }

                // 2. Resolve writable app data directory (so database is saved here)
                let app_data_dir = app_handle.path().app_local_data_dir().expect("failed to get app local data dir");
                let db_dir = app_data_dir.join("data");
                if !db_dir.exists() {
                    std::fs::create_dir_all(&db_dir).expect("failed to create db directory");
                }

                // 3. Spawn the server process on the detected open port
                let mut cmd = Command::new(&node_path);
                cmd.envs(std::env::vars()) // Inherit parent environment FIRST
                    .arg(&server_path)
                    .current_dir(&app_data_dir) // Run inside local data folder
                    .env("NODE_ENV", "production")
                    .env("GATEWAY_PORT", server_port.to_string())
                    .env("CLIENT_URL", "tauri://localhost,https://tauri.localhost");

                // On Linux, register the death signal so the server terminates if the parent dies
                #[cfg(target_os = "linux")]
                {
                    use std::os::unix::process::CommandExt;
                    extern "C" {
                        fn prctl(
                            option: std::os::raw::c_int,
                            arg2: std::os::raw::c_ulong,
                            arg3: std::os::raw::c_ulong,
                            arg4: std::os::raw::c_ulong,
                            arg5: std::os::raw::c_ulong,
                        ) -> std::os::raw::c_int;
                    }
                    const PR_SET_PDEATHSIG: std::os::raw::c_int = 1;
                    const SIGTERM: std::os::raw::c_ulong = 15;
                    
                    unsafe {
                        cmd.pre_exec(move || {
                            prctl(PR_SET_PDEATHSIG, SIGTERM, 0, 0, 0);
                            Ok(())
                        });
                    }
                }

                // On Windows, prevent cmd window popup
                #[cfg(target_os = "windows")]
                {
                    use std::os::windows::process::CommandExt;
                    const CREATE_NO_WINDOW: u32 = 0x08000000;
                    cmd.creation_flags(CREATE_NO_WINDOW);
                }

                let child = cmd.spawn();

                match child {
                    Ok(child_proc) => {
                        println!("[Tauri] NestJS background server spawned successfully on port {}.", server_port);
                        let state = app_handle.state::<ServerState>();
                        *state.child.lock().unwrap() = Some(child_proc);
                    }
                    Err(err) => {
                        eprintln!("[Tauri] Failed to spawn NestJS background server: {:?}", err);
                    }
                }
            }
            
            // In debug mode, ignore unused `app`
            #[cfg(debug_assertions)]
            let _ = app;
            
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(move |app_handle, event| {
            // Ensure NestJS server is killed when Tauri application exits
            if let tauri::RunEvent::Exit = event {
                #[cfg(not(debug_assertions))]
                {
                    let state = app_handle.state::<ServerState>();
                    let mut child_to_kill = None;
                    if let Ok(mut lock) = state.child.lock() {
                        child_to_kill = lock.take();
                    }
                    if let Some(mut child) = child_to_kill {
                        let _ = child.kill();
                        println!("[Tauri] NestJS background server stopped.");
                    }
                }
                #[cfg(debug_assertions)]
                let _ = app_handle;
            }
        });
}
