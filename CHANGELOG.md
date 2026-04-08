# Changelog

## v1.0.0 (2025-07-11)

### Features
- Multi-tab SSH terminal — open multiple sessions side by side
- SSH authentication via password and key (Ed25519 / ECDSA / RSA)
- SSH key manager — generate, import, and manage keys in-app
- SFTP file browser — browse, upload, download, rename, delete remote files
- Connection status indicator on each tab (green = connected, red = disconnected)
- Reconnect button shown on disconnect
- Parallel connections — connect to multiple hosts simultaneously
- Keyboard shortcuts: `Ctrl+T`, `Ctrl+W`, `Ctrl+Tab`, `Ctrl+Shift+Tab`, `` Ctrl+` ``
- Shortcuts reference modal (keyboard icon in sidebar)
- Dark / light theme

### Improvements
- Connection and reconnect timeout set to 15 seconds with clear error message
- Closing the last tab automatically returns to the host list
