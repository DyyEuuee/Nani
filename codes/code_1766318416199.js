import fetch from "node-fetch"
import axios from "axios"
import { jidNormalizedUser } from "../../lib/helper.js"

function cap(s = "") {
  s = String(s || "").trim()
  if (!s) return ""
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function fmtDateOnly(ms) {
  try {
    return new Date(ms).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })
  } catch {
    return new Date(ms).toISOString().split("T")[0]
  }
}

function parseIsoToMs(iso) {
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : 0
}

function addDays(ms, days) {
  return ms + days * 24 * 60 * 60 * 1000
}

function envPick(rt, keys = []) {
  for (const k of keys) {
    const v = rt?.config?.[k] ?? process.env[k]
    if (String(v || "").trim()) return String(v).trim()
  }
  return ""
}

function mustConfig(rt) {
  const domain = envPick(rt, ["domain", "DOMAIN", "PTERO_DOMAIN", "PTERO_URL", "PANEL_URL"]).replace(/\/+$/, "")
  const apikey = envPick(rt, ["apikey", "APIKEY", "PTERO_APIKEY", "PTERO_APPKEY", "PTERODACTYL_APIKEY"])
  const capikey = envPick(rt, ["capikey", "CAPIKEY", "PTERO_CLIENTKEY", "PTERO_CKEY", "PTERODACTYL_CLIENTKEY"])
  const nestid = envPick(rt, ["nestid", "NEST_ID", "PTERO_NEST"])
  const egg = envPick(rt, ["egg", "EGG_ID", "PTERO_EGG"])
  const loc = envPick(rt, ["loc", "LOCATION_ID", "PTERO_LOCATION"])
  return { domain, apikey, capikey, nestid, egg, loc }
}

async function apiJson(url, opt) {
  const res = await fetch(url, opt)
  let j = null
  try {
    j = await res.json()
  } catch {
    j = null
  }
  return { ok: res.ok, status: res.status, json: j }
}

async function ensureOnWA(sock, jid) {
  const num = String(jid || "").split("@")[0]
  const chk = await sock.onWhatsApp(num)
  return Array.isArray(chk) && chk.length > 0
}

const presetMap = {
  "1gb": { ram: 1000, disk: 500, cpu: 50 },
  "2gb": { ram: 2000, disk: 700, cpu: 50 },
  "3gb": { ram: 3000, disk: 900, cpu: 60 },
  "4gb": { ram: 4000, disk: 1000, cpu: 80 },
  "5gb": { ram: 5000, disk: 2000, cpu: 100 },
  "6gb": { ram: 6000, disk: 3000, cpu: 120 },
  "7gb": { ram: 7000, disk: 4000, cpu: 140 },
  "8gb": { ram: 8000, disk: 5000, cpu: 160 },
  "9gb": { ram: 9000, disk: 6000, cpu: 180 },
  "10gb": { ram: 10000, disk: 7000, cpu: 200 },
  "unlimited": { ram: 0, disk: 0, cpu: 0 },
  "unli": { ram: 0, disk: 0, cpu: 0 }
}

function fmtSpec({ ram, disk, cpu }) {
  const r = ram === 0 ? "Unlimited" : `${ram / 1000}GB`
  const d = disk === 0 ? "Unlimited" : `${disk / 1000}GB`
  const c = cpu === 0 ? "Unlimited" : `${cpu}%`
  return { r, d, c }
}

function getDb(rt) {
  return rt?.db || rt?.DB || rt?.database || null
}

function dbHasPanel(db) {
  return !!(db && typeof db.setPanelServer === "function" && typeof db.getPanelServer === "function")
}

function storePanelCreate(rt, payload) {
  const db = getDb(rt)
  if (!dbHasPanel(db)) return
  const sid = String(payload.serverId || "")
  const uid = String(payload.userId || "")
  if (sid) {
    db.setPanelServer(sid, {
      serverId: sid,
      userId: uid || null,
      username: payload.username || null,
      targetJid: payload.targetJid || null,
      ram: payload.ram,
      disk: payload.disk,
      cpu: payload.cpu,
      createdAt: payload.createdAt,
      expiredAt: payload.expiredAt
    })
  }
  if (uid) {
    db.setPanelUser(uid, {
      userId: uid,
      username: payload.username || null,
      targetJid: payload.targetJid || null,
      createdAt: payload.createdAt,
      expiredAt: payload.expiredAt
    })
  }
}

function deletePanelRecord(rt, serverId, userId) {
  const db = getDb(rt)
  if (!dbHasPanel(db)) return
  if (serverId) db.deletePanelServer(String(serverId))
  if (userId) db.deletePanelUser(String(userId))
}

function getPanelRecord(rt, serverId) {
  const db = getDb(rt)
  if (!dbHasPanel(db)) return null
  return db.getPanelServer(String(serverId)) || null
}

async function upsertPanelRecordByUser(rt, userId, patch) {
  const db = getDb(rt)
  if (!dbHasPanel(db)) return
  const uid = String(userId || "")
  if (!uid) return
  const prev = db.getPanelUser(uid) || { userId: uid }
  db.setPanelUser(uid, { ...prev, ...patch })
}

function ownerOnly(ev) {
  return !!ev?.isOwner
}

function parsePanelSetSpec(raw = "") {
  const s = String(raw || "").trim()
  if (!s) return null

  const seg = s.split("|").map(v => v.trim()).filter(Boolean)
  if (!seg.length) return null

  const presetKey = String(seg[0] || "").toLowerCase()
  const preset = presetMap[presetKey]
  if (!preset) return null

  const ram = seg[1] != null && seg[1] !== "" ? Number(String(seg[1]).replace(/[^\d]/g, "")) : preset.ram
  const disk = seg[2] != null && seg[2] !== "" ? Number(String(seg[2]).replace(/[^\d]/g, "")) : preset.disk
  const cpu = seg[3] != null && seg[3] !== "" ? Number(String(seg[3]).replace(/[^\d]/g, "")) : preset.cpu

  if (!Number.isFinite(ram) || ram < 0) return null
  if (!Number.isFinite(disk) || disk < 0) return null
  if (!Number.isFinite(cpu) || cpu < 0) return null

  return { presetKey, ram, disk, cpu }
}

function parseUserTarget(text = "", m) {
  const parts = String(text || "").split(",").map(x => x.trim()).filter(Boolean)
  let username = ""
  let targetJid = ""
  if (parts.length >= 2) {
    username = String(parts[0] || "").toLowerCase()
    targetJid = jidNormalizedUser(String(parts[1] || "").replace(/[^\d]/g, ""))
  } else {
    username = String(text || "").toLowerCase()
    targetJid = m.group ? jidNormalizedUser(m.sender) : jidNormalizedUser(m.chat)
  }
  username = username.toLowerCase().replace(/[^a-z0-9._-]/g, "")
  return { username, targetJid }
}

async function handlePanelSet(ev, rt) {
  const m = ev.m
  const cfg = mustConfig(rt)

  if (!cfg.domain || !cfg.apikey || !cfg.nestid || !cfg.egg || !cfg.loc) {
    return m.reply("Config panel belum lengkap (domain/apikey/nestid/egg/loc).")
  }

  const input = String(ev.q || "").trim()
  if (!input) {
    return m.reply("Contoh: .panelset 2gb|1000|100, username, 6283xxxx\nFormat: .panelset preset|ramMB|diskMB|cpu, username, nomor")
  }

  const firstComma = input.indexOf(",")
  if (firstComma < 0) {
    return m.reply("Format salah.\nContoh: .panelset 2gb|1000|100, username, 6283xxxx")
  }

  const specPart = input.slice(0, firstComma).trim()
  const rest = input.slice(firstComma + 1).trim()

  const spec = parsePanelSetSpec(specPart)
  if (!spec) {
    return m.reply("Spec tidak valid.\nContoh: .panelset 2gb|1000|100, username, 6283xxxx\nPreset: 1gb..10gb, unli\nAngka: ram/disk dalam MB, cpu dalam %")
  }

  const parts = rest.split(",").map(x => x.trim()).filter(Boolean)
  if (parts.length < 1) {
    return m.reply("Username wajib.\nContoh: .panelset 2gb|1000|100, username, 6283xxxx")
  }

  const usernameRaw = parts[0]
  const nomorRaw = parts[1] || ""

  const username = String(usernameRaw || "").toLowerCase().replace(/[^a-z0-9._-]/g, "")
  if (!username) return m.reply("Username tidak valid.")

  const targetJid = nomorRaw
    ? jidNormalizedUser(String(nomorRaw).replace(/[^\d]/g, ""))
    : (m.group ? jidNormalizedUser(m.sender) : jidNormalizedUser(m.chat))

  try {
    const ok = await ensureOnWA(rt.sock, targetJid)
    if (!ok) return m.reply("Nomor target tidak terdaftar di WhatsApp!")
  } catch (err) {
    return m.reply("Gagal cek nomor WhatsApp: " + (err?.message || String(err)))
  }

  const email = `${username}@gmail.com`
  const name = `${cap(username)} Server`
  const password = `${username}001`

  await m.react("⏳").catch(() => {})

  const u = await apiJson(`${cfg.domain}/api/application/users`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apikey}`
    },
    body: JSON.stringify({
      email,
      username,
      first_name: name,
      last_name: "Server",
      language: "en",
      password
    })
  })

  if (!u.ok) {
    const e0 = u.json?.errors?.[0] || u.json || { status: u.status }
    await m.react("❌").catch(() => {})
    return m.reply("Gagal buat user panel:\n" + JSON.stringify(e0, null, 2))
  }

  const user = u.json?.attributes
  if (!user?.id) {
    await m.react("❌").catch(() => {})
    return m.reply("Gagal buat user panel: response tidak valid.")
  }

  const eggRes = await apiJson(`${cfg.domain}/api/application/nests/${cfg.nestid}/eggs/${cfg.egg}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apikey}`
    }
  })

  if (!eggRes.ok) {
    const e0 = eggRes.json?.errors?.[0] || eggRes.json || { status: eggRes.status }
    await m.react("❌").catch(() => {})
    return m.reply("Gagal ambil egg/startup:\n" + JSON.stringify(e0, null, 2))
  }

  const startup_cmd = eggRes.json?.attributes?.startup || "npm start"

  const createdAt = Date.now()
  const expiredAt = addDays(createdAt, 30)
  const createdStr = fmtDateOnly(createdAt)
  const expiredStr = fmtDateOnly(expiredAt)

  const s = await apiJson(`${cfg.domain}/api/application/servers`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apikey}`
    },
    body: JSON.stringify({
      name,
      description: `Created: ${createdStr} | Exp: ${expiredStr}`,
      user: user.id,
      egg: parseInt(cfg.egg),
      docker_image: "ghcr.io/parkervcp/yolks:nodejs_20",
      startup: startup_cmd,
      environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
      limits: { memory: spec.ram, swap: 0, disk: spec.disk, io: 500, cpu: spec.cpu },
      feature_limits: { databases: 5, backups: 5, allocations: 5 },
      deploy: { locations: [parseInt(cfg.loc)], dedicated_ip: false, port_range: [] }
    })
  })

  if (!s.ok) {
    const e0 = s.json?.errors?.[0] || s.json || { status: s.status }
    await m.react("❌").catch(() => {})
    return m.reply("Gagal buat server panel:\n" + JSON.stringify(e0, null, 2))
  }

  const server = s.json?.attributes
  if (!server?.id) {
    await m.react("❌").catch(() => {})
    return m.reply("Gagal buat server: response tidak valid.")
  }

  storePanelCreate(rt, {
    serverId: server.id,
    userId: user.id,
    username: user.username,
    targetJid,
    ram: spec.ram,
    disk: spec.disk,
    cpu: spec.cpu,
    createdAt,
    expiredAt
  })

  const specFmt = fmtSpec({ ram: spec.ram, disk: spec.disk, cpu: spec.cpu })

  const teks =
`✅ Berhasil membuat panel

Server ID: ${server.id}
Username: ${user.username}
Password: ${password}

Created : ${createdStr}
Expired : ${expiredStr} (30 hari)

Spesifikasi
RAM : ${specFmt.r}
Disk: ${specFmt.d}
CPU : ${specFmt.c}
Panel: ${cfg.domain}
`

  try {
    await rt.sock.sendMessage(targetJid, { text: teks }, { quoted: m.raw })
  } catch {
    await m.reply("Tidak bisa kirim DM ke target, aku kirim di sini:\n\n" + teks)
  }

  if (targetJid !== m.chat) {
    await m.reply(`Berhasil membuat akun panel\nData akun terkirim ke: ${targetJid.split("@")[0]}`)
  }

  await m.react("✅").catch(() => {})
}

async function handleCreatePanel(ev, rt) {
  const m = ev.m
  const cmd = String(ev.cmd || "").toLowerCase()
  const cfg = mustConfig(rt)

  if (!cfg.domain || !cfg.apikey || !cfg.nestid || !cfg.egg || !cfg.loc) {
    return m.reply("Config panel belum lengkap (domain/apikey/nestid/egg/loc).")
  }

  const text = String(ev.q || "").trim()
  if (!text) return m.reply(`Contoh:\n• .${cmd} username,6283xxxx\n• .${cmd} username`)

  const { username, targetJid } = parseUserTarget(text, m)
  if (!username) return m.reply("Username tidak valid.")

  try {
    const ok = await ensureOnWA(rt.sock, targetJid)
    if (!ok) return m.reply("Nomor target tidak terdaftar di WhatsApp!")
  } catch (err) {
    return m.reply("Gagal cek nomor WhatsApp: " + (err?.message || String(err)))
  }

  const preset = presetMap[cmd] || presetMap["unli"]
  const { ram, disk, cpu } = preset
  const specFmt = fmtSpec(preset)

  const email = `${username}@gmail.com`
  const name = `${cap(username)} Server`
  const password = `${username}001`

  await m.react("⏳").catch(() => {})

  const u = await apiJson(`${cfg.domain}/api/application/users`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apikey}`
    },
    body: JSON.stringify({
      email,
      username,
      first_name: name,
      last_name: "Server",
      language: "en",
      password
    })
  })

  if (!u.ok) {
    const e0 = u.json?.errors?.[0] || u.json || { status: u.status }
    await m.react("❌").catch(() => {})
    return m.reply("Gagal buat user panel:\n" + JSON.stringify(e0, null, 2))
  }

  const user = u.json?.attributes
  if (!user?.id) {
    await m.react("❌").catch(() => {})
    return m.reply("Gagal buat user panel: response tidak valid.")
  }

  const eggRes = await apiJson(`${cfg.domain}/api/application/nests/${cfg.nestid}/eggs/${cfg.egg}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apikey}`
    }
  })

  if (!eggRes.ok) {
    const e0 = eggRes.json?.errors?.[0] || eggRes.json || { status: eggRes.status }
    await m.react("❌").catch(() => {})
    return m.reply("Gagal ambil egg/startup:\n" + JSON.stringify(e0, null, 2))
  }

  const startup_cmd = eggRes.json?.attributes?.startup || "npm start"

  const createdAt = Date.now()
  const expiredAt = addDays(createdAt, 30)
  const createdStr = fmtDateOnly(createdAt)
  const expiredStr = fmtDateOnly(expiredAt)

  const s = await apiJson(`${cfg.domain}/api/application/servers`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apikey}`
    },
    body: JSON.stringify({
      name,
      description: `Created: ${createdStr} | Exp: ${expiredStr}`,
      user: user.id,
      egg: parseInt(cfg.egg),
      docker_image: "ghcr.io/parkervcp/yolks:nodejs_20",
      startup: startup_cmd,
      environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
      limits: { memory: ram, swap: 0, disk, io: 500, cpu },
      feature_limits: { databases: 5, backups: 5, allocations: 5 },
      deploy: { locations: [parseInt(cfg.loc)], dedicated_ip: false, port_range: [] }
    })
  })

  if (!s.ok) {
    const e0 = s.json?.errors?.[0] || s.json || { status: s.status }
    await m.react("❌").catch(() => {})
    return m.reply("Gagal buat server panel:\n" + JSON.stringify(e0, null, 2))
  }

  const server = s.json?.attributes
  if (!server?.id) {
    await m.react("❌").catch(() => {})
    return m.reply("Gagal buat server: response tidak valid.")
  }

  storePanelCreate(rt, {
    serverId: server.id,
    userId: user.id,
    username: user.username,
    targetJid,
    ram,
    disk,
    cpu,
    createdAt,
    expiredAt
  })

  const teks =
`✅ Berhasil membuat panel

Server ID: ${server.id}
Username: ${user.username}
Password: ${password}

Created : ${createdStr}
Expired : ${expiredStr} (30 hari)

Spesifikasi
RAM : ${specFmt.r}
Disk: ${specFmt.d}
CPU : ${specFmt.c}
Panel: ${cfg.domain}
`

  try {
    await rt.sock.sendMessage(targetJid, { text: teks }, { quoted: m.raw })
  } catch {
    await m.reply("Tidak bisa kirim DM ke target, aku kirim di sini:\n\n" + teks)
  }

  if (targetJid !== m.chat) {
    await m.reply(`Berhasil membuat akun panel\nData akun terkirim ke: ${targetJid.split("@")[0]}`)
  }

  await m.react("✅").catch(() => {})
}

async function handleListPanel(ev, rt) {
  const m = ev.m
  const cfg = mustConfig(rt)
  if (!cfg.domain || !cfg.apikey) return m.reply("Config panel belum lengkap (domain/apikey).")

  await m.react("⏳").catch(() => {})

  const res = await apiJson(`${cfg.domain}/api/application/servers`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apikey}`
    }
  })

  const servers = res.json?.data || []
  if (!servers.length) {
    await m.react("✅").catch(() => {})
    return m.reply("Tidak ada server panel!")
  }

  let out = `LIST SERVER PANEL\nTotal: ${servers.length}\n`
  for (const srv of servers) {
    const s = srv.attributes || {}
    const sid = String(s.id ?? "")
    const rec = sid ? getPanelRecord(rt, sid) : null

    let createdAtMs = rec?.createdAt || 0
    let expiredAtMs = rec?.expiredAt || 0

    if (!createdAtMs) {
      const createdMs = parseIsoToMs(s.created_at)
      if (createdMs) {
        createdAtMs = createdMs
        expiredAtMs = addDays(createdMs, 30)
      }
    }

    const created = createdAtMs ? fmtDateOnly(createdAtMs) : "-"
    const expired = expiredAtMs ? fmtDateOnly(expiredAtMs) : "-"

    const ram =
      s.limits?.memory === 0 ? "Unlimited" :
      s.limits?.memory >= 1024 ? `${Math.floor(s.limits.memory / 1024)} GB` :
      `${s.limits?.memory ?? 0} MB`

    const disk =
      s.limits?.disk === 0 ? "Unlimited" :
      s.limits?.disk >= 1024 ? `${Math.floor(s.limits.disk / 1024)} GB` :
      `${s.limits?.disk ?? 0} MB`

    const cpu = s.limits?.cpu === 0 ? "Unlimited" : `${s.limits?.cpu ?? 0}%`

    out += `\nID: ${s.id ?? "-"}\nNama: ${s.name ?? "-"}\nRAM: ${ram} | Disk: ${disk} | CPU: ${cpu}\nCreated: ${created}\nExpired: ${expired}\n`
  }

  await m.reply(out.trim())
  await m.react("✅").catch(() => {})
}

async function handleDelPanel(ev, rt) {
  const m = ev.m
  const cfg = mustConfig(rt)
  if (!cfg.domain || !cfg.apikey) return m.reply("Config panel belum lengkap (domain/apikey).")

  await m.react("⏳").catch(() => {})

  const res = await apiJson(`${cfg.domain}/api/application/servers`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apikey}`
    }
  })

  const servers = res.json?.data || []
  if (!servers.length) {
    await m.react("✅").catch(() => {})
    return m.reply("Tidak ada server panel!")
  }

  let out = `DEL PANEL\nTotal server: ${servers.length}\n\nCara hapus:\n.delpanel-response <id>\n.delpanel-all\n\nList (max 50):\n`
  for (const srv of servers.slice(0, 50)) {
    const s = srv.attributes || {}
    const sid = String(s.id ?? "")
    const rec = sid ? getPanelRecord(rt, sid) : null
    let expiredAtMs = rec?.expiredAt || 0
    if (!expiredAtMs) {
      const createdMs = parseIsoToMs(s.created_at)
      expiredAtMs = createdMs ? addDays(createdMs, 30) : 0
    }
    const exp = expiredAtMs ? fmtDateOnly(expiredAtMs) : "-"
    out += `- ${s.name || "-"} | ID: ${s.id || "-"} | Exp: ${exp}\n`
  }
  if (servers.length > 50) out += `...dan ${servers.length - 50} lainnya`

  await m.reply(out.trim())
  await m.react("✅").catch(() => {})
}

async function handleDelPanelResponse(ev, rt) {
  const m = ev.m
  const id = String(ev.q || "").trim()
  if (!id || isNaN(Number(id))) return m.reply("Contoh: .delpanel-response 12")

  const cfg = mustConfig(rt)
  if (!cfg.domain || !cfg.apikey) return m.reply("Config panel belum lengkap (domain/apikey).")

  await m.react("⏳").catch(() => {})

  const list = await apiJson(`${cfg.domain}/api/application/servers`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apikey}`
    }
  })

  const servers = list.json?.data || []
  const found = servers.find(x => Number(x?.attributes?.id) === Number(id))
  if (!found) {
    await m.react("❌").catch(() => {})
    return m.reply("ID server tidak ditemukan.")
  }

  const serverName = found.attributes?.name || "-"
  const ownerUserId = found.attributes?.user

  const delSrv = await fetch(`${cfg.domain}/api/application/servers/${id}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apikey}`
    }
  })

  let userDeleted = false
  if (ownerUserId) {
    try {
      const delUser = await fetch(`${cfg.domain}/api/application/users/${ownerUserId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.apikey}`
        }
      })
      userDeleted = delUser.ok
    } catch {}
  }

  if (!delSrv.ok) {
    await m.react("❌").catch(() => {})
    return m.reply(`Gagal hapus server.\nStatus: ${delSrv.status}`)
  }

  deletePanelRecord(rt, id, ownerUserId)

  await m.reply(`Berhasil Menghapus Server Panel\nID: ${id}\nNama: ${cap(serverName)}\nUserDeleted: ${userDeleted ? "Yes" : "No/Skipped"}`)
  await m.react("✅").catch(() => {})
}

async function handleDelPanelAll(ev, rt) {
  const m = ev.m
  const cfg = mustConfig(rt)
  if (!cfg.domain || !cfg.apikey) return m.reply("Config panel belum lengkap (domain/apikey).")

  await m.reply("Memproses penghapusan semua user & server panel yang bukan admin...").catch(() => {})
  await m.react("⏳").catch(() => {})

  const headers = {
    Authorization: `Bearer ${cfg.apikey}`,
    "Content-Type": "application/json",
    Accept: "application/json"
  }

  async function getUsers() {
    try {
      const res = await axios.get(`${cfg.domain}/api/application/users`, { headers })
      return res.data?.data || []
    } catch {
      return []
    }
  }

  async function getServers() {
    try {
      const res = await axios.get(`${cfg.domain}/api/application/servers`, { headers })
      return res.data?.data || []
    } catch {
      return []
    }
  }

  async function deleteServer(serverId) {
    try {
      await axios.delete(`${cfg.domain}/api/application/servers/${serverId}`, { headers })
      return true
    } catch {
      return false
    }
  }

  async function deleteUser(userId) {
    try {
      await axios.delete(`${cfg.domain}/api/application/users/${userId}`, { headers })
      return true
    } catch {
      return false
    }
  }

  const users = await getUsers()
  const servers = await getServers()

  let totalSrv = 0
  let totalUsr = 0

  for (const u of users) {
    const ua = u.attributes
    if (ua?.root_admin) continue

    const userId = ua?.id
    if (!userId) continue

    const userServers = servers.filter(srv => srv?.attributes?.user === userId)
    for (const s of userServers) {
      const sid = s.attributes?.id
      const ok = await deleteServer(sid)
      if (ok) {
        totalSrv++
        deletePanelRecord(rt, sid, null)
      }
    }

    const okU = await deleteUser(userId)
    if (okU) {
      totalUsr++
      deletePanelRecord(rt, null, userId)
    }
  }

  await m.reply(`Selesai.\nServer terhapus: ${totalSrv}\nUser terhapus: ${totalUsr}`).catch(() => {})
  await m.react("✅").catch(() => {})
}

export default {
  name: "panel",
  command: [
    "panelset",
    "1gb","2gb","3gb","4gb","5gb","6gb","7gb","8gb","9gb","10gb",
    "unlimited","unli",
    "delpanel","delpanel-response","delpanel-all",
    "listpanel","listserver"
  ],
  tags: ["panel"],
  run: async (ev, rt) => {
    if (!ownerOnly(ev)) return ev.m.reply("Owner only.")

    const cmd = String(ev.cmd || "").toLowerCase()

    try {
      if (cmd === "panelset") return await handlePanelSet(ev, rt)
      if (presetMap[cmd]) return await handleCreatePanel(ev, rt)
      if (cmd === "listpanel" || cmd === "listserver") return await handleListPanel(ev, rt)
      if (cmd === "delpanel") return await handleDelPanel(ev, rt)
      if (cmd === "delpanel-response") return await handleDelPanelResponse(ev, rt)
      if (cmd === "delpanel-all") return await handleDelPanelAll(ev, rt)
      return ev.m.reply("Command panel tidak dikenali.")
    } catch (e) {
      const msg = e?.output?.payload?.message || e?.message || String(e)
      await ev.m.reply("Terjadi kesalahan: " + msg)
      await ev.m.react("❌").catch(() => {})
    }
  }
}