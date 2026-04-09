# GSS — Get Shit SSH

A lightweight SSH client and SFTP file manager for desktop, built with Go + React + Wails.

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Go](https://img.shields.io/badge/Go-1.21+-00ADD8)
![React](https://img.shields.io/badge/React-18-61DAFB)

## Features

- **Multi-tab terminal** — open multiple SSH sessions side by side, switch with `Ctrl+Tab`
- **SSH authentication** — password and SSH key (Ed25519 / ECDSA / RSA)
- **SSH key manager** — generate, import, and manage keys in-app
- **SFTP file browser** — browse, upload, download, rename, delete remote files
- **Connection test** — verify credentials before saving a host
- **Session history** — log of past connections
- **Dark / light theme**
- **Keyboard shortcuts** — `Ctrl+T`, `Ctrl+W`, `Ctrl+Tab`, and more

## Screenshots

> Coming soon

## Installation

### Download

Pre-built binaries are available on the [Releases](https://github.com/weiness/get-shit-ssh/releases) page.

| Platform | Architecture | File |
|----------|-------------|------|
| Windows  | x64 (Intel/AMD) | `gss-windows-amd64.exe` |
| Windows  | ARM64 | `gss-windows-arm64.exe` |
| macOS    | Intel | `gss-macos-intel.app.zip` |
| macOS    | Apple Silicon (M1/M2/M3) | `gss-macos-apple-silicon.app.zip` |

### Build from source

**Prerequisites**

- [Go 1.21+](https://go.dev/dl/)
- [Node.js 18+](https://nodejs.org/)
- [Wails v2](https://wails.io/docs/gettingstarted/installation)

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

**Build**

```bash
git clone https://github.com/weiness/get-shit-ssh.git
cd get-shit-ssh

# Install frontend dependencies
cd frontend && npm install && cd ..

# Development (hot reload)
wails dev

# Production build
wails build
```

Output binary is in `build/bin/`.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+T` | New connection tab |
| `Ctrl+W` | Close current tab |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |
| `` Ctrl+` `` | Toggle host panel |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | [Wails v2](https://wails.io) |
| Backend | Go, `golang.org/x/crypto/ssh` |
| Frontend | React 18, TypeScript, Tailwind CSS |
| Terminal | [xterm.js](https://xtermjs.org/) |
| State | Zustand |
| Storage | SQLite (via `modernc.org/sqlite`) |

## Project Structure

```
get-shit-ssh/
├── app.go              # Wails IPC bindings
├── main.go
├── internal/
│   ├── ssh/            # SSH client, PTY terminal, SFTP
│   ├── store/          # SQLite: hosts, keys, sessions
│   └── crypto/         # Credential encryption
└── frontend/
    └── src/
        ├── components/ # UI components
        ├── stores/     # Zustand state
        └── hooks/      # useTerminalIO, etc.
```

## Security Notes

- Credentials are encrypted at rest using AES-GCM before being stored in SQLite
- Host key verification is currently set to `InsecureIgnoreHostKey` — strict host key checking is planned

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

```bash
git checkout -b feature/your-feature
git commit -m "feat: describe your change"
git push origin feature/your-feature
```

## License

[MIT](LICENSE)
