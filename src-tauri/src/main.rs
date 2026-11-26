// Sin consola en Windows al abrir la app.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    app_fct_lib::run()
}
