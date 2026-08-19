use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You are successfully connected to the Tauri Rust Backend.", name)
}

#[tauri::command]
fn list_win_printers() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let output = Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-Command", "Get-CimInstance Win32_Printer | Select-Object Name, PrinterStatus, PortName | ConvertTo-Json -Compress"])
            .output();
        match output {
            Ok(out) => {
                if out.status.success() {
                    Ok(String::from_utf8_lossy(&out.stdout).to_string())
                } else {
                    let alt_output = Command::new("powershell")
                        .creation_flags(CREATE_NO_WINDOW)
                        .args(["-Command", "Get-Printer | Select-Object Name, PrinterStatus, PortName | ConvertTo-Json -Compress"])
                        .output();
                    match alt_output {
                        Ok(alt_out) if alt_out.status.success() => {
                            Ok(String::from_utf8_lossy(&alt_out.stdout).to_string())
                        }
                        _ => Err("Failed to query printers".into())
                    }
                }
            }
            Err(_) => Err("Failed to execute command".into())
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok("[]".to_string())
    }
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let _ = Command::new("cmd")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["/C", "start", "", &url])
            .spawn();
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = std::process::Command::new("open").arg(&url).spawn();
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_single_instance::init(|app, _args, _new_dir| {
      let _ = app.get_webview_window("main").map(|w| {
        let _ = w.show();
        let _ = w.set_focus();
      });
    }))
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .invoke_handler(tauri::generate_handler![greet, list_win_printers, open_external_url])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
