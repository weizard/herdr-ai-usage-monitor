# herdr-ai-usage-monitor

A Herdr mod that shows how much of your Claude Code and Codex
rate-limit windows (5h / 7d) you have used, in a popup summoned by a key.

```
Agent usage                                          Esc
Claude Code · opus
  5h  ██████████░░░░░░░░░░░    49%   ↺ 1h 55m
  7d  ██████░░░░░░░░░░░░░░░    29%   ↺ 2d 6h
Codex · gpt-6-astra (high)
  5h  ███████████████░░░░░░    75%   ↺ 3h 5m
  7d  ██░░░░░░░░░░░░░░░░░░░    12%   ↺ 6d 22h
Esc / q close   ·   r refresh   ·   every 5s
```

The numbers come from the reader of
[ghostty-agent-usage-dashboard](https://github.com/weizard/ghostty-agent-usage-dashboard)
(`agent-usage --format json`). It reads only local snapshots the agents leave behind and
calls no network API; see that project for how the numbers are collected (Claude Code
needs its status line wrapped by `statusline-tap`, Codex needs nothing). This mod only
draws them, re-reading every 5 seconds while the popup is open.

Bars turn yellow at 70% and red at 90%. A reading older than 30 minutes is marked with
its age, a window that has reset since the snapshot shows `–`, and a window the agent
did not report shows `not reported`.

## Install

1. Install [ghostty-agent-usage-dashboard](https://github.com/weizard/ghostty-agent-usage-dashboard)
   and check that `agent-usage --format json` prints readings.

2. Clone this repository as the `usage` mod:

   ```sh
   git clone https://github.com/weizard/herdr-ai-usage-monitor ~/.config/herdr-app/mods/usage
   ```

   The folder must be named `usage`.

3. If `agent-usage` is not on your `PATH`, point the mod at it:

   ```sh
   cd ~/.config/herdr-app/mods/usage
   cp config.example.json config.json   # then edit "reader"
   ```

4. Bind a key in `~/.config/herdr-app/keys.json`, under `global`:

   ```json
   "cmd-shift-u": "mod.open:usage"
   ```

   Pressing it again closes the popup. Note that editing `keys.json` makes the whole file
   yours: Herdr stops adding new default shortcuts to it on upgrade.

5. Check it:

   ```sh
   herdr-app check ~/.config/herdr-app/mods/usage
   ```

## Use

| Key | |
|---|---|
| `cmd-shift-u` (or your key) | open / close |
| `Esc` / `q` | close |
| `r` | refresh now |

The key works while the Herdr window has focus; it is not a system-wide hotkey.

## Requirements

- Herdr with mod support
- macOS (tested). The reader needs Python 3.9+.

## License

MIT
