use midir::{MidiOutput, MidiOutputConnection, MidiOutputPort};
#[cfg(target_os = "macos")]
use midir::os::unix::VirtualOutput;
use serde::Serialize;
use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;

#[derive(Serialize)]
struct SynthPluginStatus {
    surge_vst3: bool,
    surge_fx_vst3: bool,
    surge_app: bool,
    plugin_dir: String,
    found_paths: Vec<String>,
    message: String,
}

#[derive(Serialize, Clone)]
struct MidiOutputInfo {
    id: String,
    name: String,
    recommended: bool,
}

#[derive(Serialize, Clone)]
struct VstRackInfo {
    plugins: Vec<String>,
    active_index: Option<usize>,
    active_name: Option<String>,
}

struct MidiState {
    connection: Mutex<Option<MidiOutputConnection>>,
    connected_name: Mutex<Option<String>>,
}

struct VstRackState {
    plugins: Mutex<Vec<String>>,
    active_index: Mutex<Option<usize>>,
}

impl MidiState {
    fn new() -> Self {
        Self {
            connection: Mutex::new(None),
            connected_name: Mutex::new(None),
        }
    }
}

impl VstRackState {
    fn new() -> Self {
        Self {
            plugins: Mutex::new(Vec::new()),
            active_index: Mutex::new(None),
        }
    }
}

fn home_dir() -> Result<PathBuf, String> {
    env::var("HOME")
        .map(PathBuf::from)
        .map_err(|_| "HOME environment variable is not set".to_string())
}

fn surge_plugin_paths() -> Result<(PathBuf, PathBuf, PathBuf), String> {
    let home = home_dir()?;
    let plugin_dir = home.join("Library/Audio/Plug-Ins/VST3");
    let surge_vst3 = plugin_dir.join("Surge XT.vst3");
    let surge_fx_vst3 = plugin_dir.join("Surge XT Effects.vst3");
    Ok((plugin_dir, surge_vst3, surge_fx_vst3))
}

fn surge_app_paths() -> Result<Vec<PathBuf>, String> {
    let home = home_dir()?;
    Ok(vec![
        PathBuf::from("/Applications/Surge XT.app"),
        home.join("Applications/Surge XT.app"),
    ])
}

fn vst_scan_dirs() -> Result<Vec<PathBuf>, String> {
    let home = home_dir()?;
    Ok(vec![
        home.join("Library/Audio/Plug-Ins/VST3"),
        PathBuf::from("/Library/Audio/Plug-Ins/VST3"),
    ])
}

fn scan_vst3_names() -> Result<Vec<String>, String> {
    let dirs = vst_scan_dirs()?;
    let mut names: Vec<String> = Vec::new();

    for dir in dirs {
        if !dir.exists() {
            continue;
        }
        let entries = fs::read_dir(&dir)
            .map_err(|e| format!("Failed to read {}: {}", dir.display(), e))?;
        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
            let path = entry.path();
            if path.extension().and_then(|ext| ext.to_str()) == Some("vst3") {
                if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                    let lower = stem.to_lowercase();
                    let is_effect_only = lower.contains("effect")
                        || lower.ends_with(" fx")
                        || lower.contains("utility")
                        || lower.contains("analyzer");
                    if !is_effect_only {
                        names.push(stem.to_string());
                    }
                }
            }
        }
    }

    names.sort();
    names.dedup();
    Ok(names)
}

fn build_rack_info(state: &tauri::State<VstRackState>) -> Result<VstRackInfo, String> {
    let plugins = state
        .plugins
        .lock()
        .map_err(|_| "VST rack state lock poisoned".to_string())?
        .clone();
    let active_index = *state
        .active_index
        .lock()
        .map_err(|_| "VST rack state lock poisoned".to_string())?;
    let active_name = active_index.and_then(|i| plugins.get(i).cloned());

    Ok(VstRackInfo {
        plugins,
        active_index,
        active_name,
    })
}

fn enumerate_midi_ports(midi_out: &MidiOutput) -> Result<Vec<(String, String, MidiOutputPort)>, String> {
    let ports = midi_out.ports();
    let mut result = Vec::new();

    for (idx, port) in ports.iter().enumerate() {
        let name = midi_out
            .port_name(port)
            .map_err(|e| format!("Cannot read MIDI output name: {}", e))?;
        result.push((idx.to_string(), name, port.clone()));
    }

    Ok(result)
}

fn is_recommended_output(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower.contains("iac")
        || lower.contains("surge")
        || lower.contains("logic")
        || lower.contains("ableton")
        || lower.contains("reaper")
        || lower.contains("midi")
}

fn with_midi_connection<F>(state: &tauri::State<MidiState>, f: F) -> Result<(), String>
where
    F: FnOnce(&mut MidiOutputConnection) -> Result<(), String>,
{
    let mut guard = state
        .connection
        .lock()
        .map_err(|_| "MIDI state lock poisoned".to_string())?;
    let conn = guard
        .as_mut()
        .ok_or_else(|| "No MIDI output connected".to_string())?;
    f(conn)
}

#[tauri::command]
fn get_synth_status() -> Result<SynthPluginStatus, String> {
    let (plugin_dir, surge_vst3, surge_fx_vst3) = surge_plugin_paths()?;
    let app_paths = surge_app_paths()?;

    let surge_vst3_exists = surge_vst3.exists();
    let surge_fx_vst3_exists = surge_fx_vst3.exists();
    let app_path = app_paths.into_iter().find(|path| path.exists());
    let surge_app_exists = app_path.is_some();

    let mut found_paths = Vec::new();
    if surge_vst3_exists {
        found_paths.push(surge_vst3.display().to_string());
    }
    if surge_fx_vst3_exists {
        found_paths.push(surge_fx_vst3.display().to_string());
    }
    if let Some(path) = app_path {
        found_paths.push(path.display().to_string());
    }

    let message = if surge_vst3_exists || surge_fx_vst3_exists {
        if surge_app_exists {
            "Surge XT plugins and standalone app are available".to_string()
        } else {
            "Surge XT VST3 detected, standalone app is missing (host required)".to_string()
        }
    } else {
        "Surge XT VST3 not found in ~/Library/Audio/Plug-Ins/VST3".to_string()
    };

    Ok(SynthPluginStatus {
        surge_vst3: surge_vst3_exists,
        surge_fx_vst3: surge_fx_vst3_exists,
        surge_app: surge_app_exists,
        plugin_dir: plugin_dir.display().to_string(),
        found_paths,
        message,
    })
}

#[tauri::command]
fn list_midi_outputs() -> Result<Vec<MidiOutputInfo>, String> {
    let midi_out = MidiOutput::new("Pulse MIDI Probe")
        .map_err(|e| format!("Failed to initialize MIDI output: {}", e))?;
    let ports = enumerate_midi_ports(&midi_out)?;

    Ok(ports
        .iter()
        .map(|(id, name, _)| MidiOutputInfo {
            id: id.clone(),
            name: name.clone(),
            recommended: is_recommended_output(name),
        })
        .collect())
}

#[tauri::command]
fn scan_vst_rack(state: tauri::State<VstRackState>) -> Result<VstRackInfo, String> {
    let plugins = scan_vst3_names()?;
    {
        let mut guard = state
            .plugins
            .lock()
            .map_err(|_| "VST rack state lock poisoned".to_string())?;
        *guard = plugins;
    }
    {
        let plugins_guard = state
            .plugins
            .lock()
            .map_err(|_| "VST rack state lock poisoned".to_string())?;
        let mut active_guard = state
            .active_index
            .lock()
            .map_err(|_| "VST rack state lock poisoned".to_string())?;
        if plugins_guard.is_empty() {
            *active_guard = None;
        } else if active_guard.is_none() || active_guard.unwrap_or(0) >= plugins_guard.len() {
            *active_guard = Some(0);
        }
    }
    build_rack_info(&state)
}

#[tauri::command]
fn next_vst_in_rack(state: tauri::State<VstRackState>) -> Result<VstRackInfo, String> {
    let len = state
        .plugins
        .lock()
        .map_err(|_| "VST rack state lock poisoned".to_string())?
        .len();
    if len == 0 {
        return build_rack_info(&state);
    }
    let mut active = state
        .active_index
        .lock()
        .map_err(|_| "VST rack state lock poisoned".to_string())?;
    *active = Some(match *active {
        Some(i) => (i + 1) % len,
        None => 0,
    });
    drop(active);
    build_rack_info(&state)
}

#[tauri::command]
fn prev_vst_in_rack(state: tauri::State<VstRackState>) -> Result<VstRackInfo, String> {
    let len = state
        .plugins
        .lock()
        .map_err(|_| "VST rack state lock poisoned".to_string())?
        .len();
    if len == 0 {
        return build_rack_info(&state);
    }
    let mut active = state
        .active_index
        .lock()
        .map_err(|_| "VST rack state lock poisoned".to_string())?;
    *active = Some(match *active {
        Some(0) | None => len - 1,
        Some(i) => i - 1,
    });
    drop(active);
    build_rack_info(&state)
}

#[tauri::command]
fn select_vst_by_hint(state: tauri::State<VstRackState>, hint: String) -> Result<VstRackInfo, String> {
    let hint_l = hint.to_lowercase();
    let plugins = state
        .plugins
        .lock()
        .map_err(|_| "VST rack state lock poisoned".to_string())?
        .clone();
    let idx = plugins
        .iter()
        .position(|name| name.to_lowercase().contains(&hint_l));

    if let Some(i) = idx {
        let mut active = state
            .active_index
            .lock()
            .map_err(|_| "VST rack state lock poisoned".to_string())?;
        *active = Some(i);
    }
    build_rack_info(&state)
}

#[tauri::command]
fn connect_midi_output(state: tauri::State<MidiState>, output_id: String) -> Result<String, String> {
    let midi_out = MidiOutput::new("Pulse MIDI Out")
        .map_err(|e| format!("Failed to initialize MIDI output: {}", e))?;
    let ports = enumerate_midi_ports(&midi_out)?;

    let (_, port_name, port) = ports
        .into_iter()
        .find(|(id, _, _)| *id == output_id)
        .ok_or_else(|| format!("MIDI output id {} not found", output_id))?;

    let conn = midi_out
        .connect(&port, "pulse-midi-connection")
        .map_err(|e| format!("Failed to connect MIDI output {}: {}", port_name, e))?;

    {
        let mut conn_guard = state
            .connection
            .lock()
            .map_err(|_| "MIDI state lock poisoned".to_string())?;
        *conn_guard = Some(conn);
    }

    {
        let mut name_guard = state
            .connected_name
            .lock()
            .map_err(|_| "MIDI state lock poisoned".to_string())?;
        *name_guard = Some(port_name.clone());
    }

    Ok(port_name)
}

#[tauri::command]
fn disconnect_midi_output(state: tauri::State<MidiState>) -> Result<(), String> {
    {
        let mut conn_guard = state
            .connection
            .lock()
            .map_err(|_| "MIDI state lock poisoned".to_string())?;
        *conn_guard = None;
    }
    {
        let mut name_guard = state
            .connected_name
            .lock()
            .map_err(|_| "MIDI state lock poisoned".to_string())?;
        *name_guard = None;
    }
    Ok(())
}

#[tauri::command]
fn start_virtual_midi_output(state: tauri::State<MidiState>, name: Option<String>) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        let midi_out = MidiOutput::new("Pulse Virtual MIDI")
            .map_err(|e| format!("Failed to initialize virtual MIDI output: {}", e))?;
        let virtual_name = name.unwrap_or_else(|| "Pulse Virtual Out".to_string());
        let conn = midi_out
            .create_virtual(&virtual_name)
            .map_err(|e| format!("Failed to create virtual MIDI output: {}", e))?;

        {
            let mut conn_guard = state
                .connection
                .lock()
                .map_err(|_| "MIDI state lock poisoned".to_string())?;
            *conn_guard = Some(conn);
        }
        {
            let mut name_guard = state
                .connected_name
                .lock()
                .map_err(|_| "MIDI state lock poisoned".to_string())?;
            *name_guard = Some(virtual_name.clone());
        }

        return Ok(virtual_name);
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = state;
        let _ = name;
        Err("Virtual MIDI output is currently implemented only for macOS".to_string())
    }
}

#[tauri::command]
fn send_midi_note_on(state: tauri::State<MidiState>, note: u8, velocity: u8) -> Result<(), String> {
    with_midi_connection(&state, |conn| {
        conn.send(&[0x90, note.min(127), velocity.max(1).min(127)])
            .map_err(|e| format!("Failed to send MIDI note on: {}", e))
    })
}

#[tauri::command]
fn send_midi_note_off(state: tauri::State<MidiState>, note: u8) -> Result<(), String> {
    with_midi_connection(&state, |conn| {
        conn.send(&[0x80, note.min(127), 0x00])
            .map_err(|e| format!("Failed to send MIDI note off: {}", e))
    })
}

#[tauri::command]
fn send_midi_program_change(state: tauri::State<MidiState>, program: u8) -> Result<(), String> {
    with_midi_connection(&state, |conn| {
        conn.send(&[0xC0, program.min(127)])
            .map_err(|e| format!("Failed to send MIDI program change: {}", e))
    })
}

#[tauri::command]
fn send_midi_all_notes_off(state: tauri::State<MidiState>) -> Result<(), String> {
    with_midi_connection(&state, |conn| {
        conn.send(&[0xB0, 0x7B, 0x00])
            .map_err(|e| format!("Failed to send MIDI all-notes-off: {}", e))?;
        conn.send(&[0xB0, 0x78, 0x00])
            .map_err(|e| format!("Failed to send MIDI all-sound-off: {}", e))
    })
}

#[tauri::command]
fn launch_surge_xt() -> Result<String, String> {
    let app_paths = surge_app_paths()?;
    let app_path = app_paths
        .into_iter()
        .find(|path| path.exists())
        .ok_or_else(|| "Surge XT.app not found. VST3 installed, but standalone app is unavailable.".to_string())?;

    Command::new("open")
        .arg(&app_path)
        .spawn()
        .map_err(|e| format!("Failed to launch Surge XT: {}", e))?;

    Ok(format!("Launched {}", app_path.display()))
}

#[tauri::command]
fn open_plugin_folder() -> Result<String, String> {
    let (plugin_dir, _, _) = surge_plugin_paths()?;
    Command::new("open")
        .arg(&plugin_dir)
        .spawn()
        .map_err(|e| format!("Failed to open plugin folder: {}", e))?;
    Ok(plugin_dir.display().to_string())
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(MidiState::new())
        .manage(VstRackState::new())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_synth_status,
            scan_vst_rack,
            next_vst_in_rack,
            prev_vst_in_rack,
            select_vst_by_hint,
            list_midi_outputs,
            connect_midi_output,
            disconnect_midi_output,
            start_virtual_midi_output,
            send_midi_note_on,
            send_midi_note_off,
            send_midi_program_change,
            send_midi_all_notes_off,
            launch_surge_xt,
            open_plugin_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
