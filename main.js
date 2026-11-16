// Claude Code / Codex rate-limit quota, as a popup (keys.json: cmd-shift-u → mod.open:usage).
// The numbers come from the ghostty-agent-usage-dashboard reader (`agent-usage --format json`),
// which reads local snapshots only; this mod just draws them and re-reads every 5s while open.
//
// Where the reader is: `reader` in this folder's config.json (see config.example.json),
// otherwise `agent-usage` on PATH.

import { View, div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { exec, home, appHome, readTextFile, theme, settings, props, closeOverlay, checking } from "herdr";

const MOD_NAME = "usage";

async function readerPath() {
  try {
    const text = await readTextFile(`${appHome()}/mods/${MOD_NAME}/config.json`);
    const reader = text ? JSON.parse(text).reader : null;
    if (typeof reader === "string" && reader) return reader.replace(/^~(?=\/)/, home());
  } catch {}
  return "agent-usage";
}
const AGENTS = [["CC", "Claude Code"], ["CX", "Codex"]];
const REFRESH_MS = 5000;

function fmtDuration(sec) {
  if (sec <= 0) return "now";
  const m = Math.floor(sec / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

function fmtAge(sec) {
  if (sec < 60) return `${Math.round(sec)}s`;
  return fmtDuration(sec);
}

const AGE_WORDS = { last_change: "last change", observed: "last observed", snapshot: "snapshot from" };

export default class Usage extends View {
  init(_props, cx) {
    this.data = null;
    this.error = null;
    this.loading = true;
    this.fetchedAt = null;
    this.handle = cx.focus_handle();
    this.handle.focus();
    cx.timer.after(300, () => this.handle.focus());
    if (checking()) return;
    this.refresh(cx);
    cx.timer.every(REFRESH_MS, (cx) => this.refresh(cx));
  }

  refresh(cx) {
    if (this.busy) return;
    this.busy = true;
    cx.spawn(async (cx) => {
      try {
        const reader = await readerPath();
        let r;
        try {
          r = await exec(reader, ["--format", "json"], { timeout: 10000 });
        } catch (e) {
          throw new Error(`cannot run ${reader} (set "reader" in config.json): ${e?.message ?? e}`);
        }
        if (r.code !== 0) throw new Error((r.stderr || r.stdout || `exit ${r.code}`).trim());
        this.data = JSON.parse(r.stdout);
        this.error = null;
        this.fetchedAt = Date.now() / 1000;
      } catch (e) {
        this.error = String(e?.message ?? e);
      }
      this.loading = false;
      this.busy = false;
      cx.notify();
    });
  }

  close() {
    const id = props()?.overlay;
    if (id) closeOverlay(id);
  }

  barColor(t, pct) {
    if (pct >= 90) return t.ansi1;
    if (pct >= 70) return t.ansi3;
    return t.accent;
  }

  windowRow(t, key, w) {
    const now = Date.now() / 1000;
    let pctText, resetText = "", pct = 0, dim = false;
    if (!w || w.state === "absent") {
      pctText = "not reported"; dim = true;
    } else if (w.state !== "ok" || (w.resets_at && w.resets_at < now)) {
      pctText = "–"; dim = true; // the window has reset since this snapshot
    } else {
      pct = Math.max(0, Math.min(100, w.used_pct ?? 0));
      pctText = `${Math.round(pct)}%`;
      resetText = w.resets_at ? `↺ ${fmtDuration(w.resets_at - now)}` : "";
    }
    return h_flex()
      .id(key)
      .h(22)
      .gap(12)
      .items_center()
      .child(div().w(28).text_color(t.muted).child(w?.label ?? ""))
      .child(
        div().flex_1().h(8).rounded(4).bg(t.raised).overflow_hidden()
          .child(div().h_full().w(`${pct}%`).rounded(4).bg(this.barColor(t, pct))),
      )
      .child(div().w(90).flex().justify_end().text_color(dim ? t.dim : t.foreground).child(pctText))
      .child(div().w(70).text_color(t.dim).child(resetText));
  }

  agentBlock(t, code, name) {
    const a = this.data?.[code];
    const title = h_flex().gap(6).items_center()
      .child(div().font_semibold().text_color(t.foreground).child(name))
      .when(!!a?.model, (el) => el.child(div().text_color(t.dim).child(`·  ${a.model}`)));
    const body = v_flex().gap(4).pl(4);
    if (!a) {
      body.child(div().text_color(t.dim).child("no data"));
    } else if (a.error) {
      body.child(div().text_color(t.ansi1).child(a.error));
    } else {
      body.child(this.windowRow(t, `${code}-s`, a.short_window));
      body.child(this.windowRow(t, `${code}-l`, a.long_window));
      if (a.stale && a.age_seconds != null) {
        body.child(div().text_size(11.5).text_color(t.ansi3)
          .child(`↑ ${AGE_WORDS[a.age_kind] ?? "snapshot from"} ${fmtAge(a.age_seconds)} ago`));
      }
    }
    return v_flex().gap(6).child(title).child(body);
  }

  render(cx) {
    const t = theme();
    const mono = settings().font_family;
    const root = v_flex()
      .id("usage")
      .track_focus(this.handle)
      .on_key_down((e, cx) => {
        if (e.key === "escape" || e.key === "q") this.close();
        else if (e.key === "r") this.refresh(cx);
      })
      .size_full()
      .p(18)
      .gap(16)
      .bg(t.popover)
      .text_size(13)
      .when(!!mono, (el) => el.font_family(mono));

    root.child(
      h_flex().items_center().justify_between()
        .child(div().text_size(15).font_semibold().text_color(t.foreground).child("Agent usage"))
        .child(div().id("usage-esc").px(6).py(2).rounded(5).text_size(11).text_color(t.dim).cursor_pointer()
          .hover((s) => s.bg(t.hover).text_color(t.foreground))
          .on_click(() => this.close())
          .child("Esc")),
    );

    if (this.loading && !this.data) {
      root.child(div().text_color(t.dim).child("reading…"));
    } else {
      for (const [code, name] of AGENTS) root.child(this.agentBlock(t, code, name));
    }
    if (this.error) {
      root.child(div().text_size(11.5).text_color(t.ansi1).child(`reader failed: ${this.error}`));
    }

    root.child(div().flex_1());
    root.child(div().text_size(11).text_color(t.dim).child("Esc / q close   ·   r refresh   ·   every 5s"));
    return root;
  }
}
