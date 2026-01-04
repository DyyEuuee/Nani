import { jidNormalizedUser, getUserKey, unwrapMessage } from "../../lib/helper.js"

function checkAdmin(participants, targetJid) {
  const target = getUserKey(targetJid)
  return participants.some(p => {
    const pKey = getUserKey(p.id || p.jid)
    const role = String(p.admin ?? "").toLowerCase()
    const isAdmin = role === "admin" || role === "superadmin" || p.admin === true
    return isAdmin && pKey === target
  })
}

export default {
  name: "antimedia",
  tags: ["group"],
  command: ["antisticker", "antifoto", "antivideo", "antiaudio", "antivn"],
  groupOnly: true,
  middleware: async ({ m, rt }) => {
    const { sock, db } = rt
    const chat = m.chat

    if (!chat || !String(chat).endsWith("@g.us")) return
    if (m.fromMe) return
    const g = db.getGroup(chat)
    if (!g) return
    if (!g.antiSticker && !g.antiImage && !g.antiVideo && !g.antiAudio) return
    const msg = unwrapMessage(m.raw?.message)
    if (!msg) return
    let isProhibited = false
    let typeDetected = ""
    if (g.antiSticker && msg.stickerMessage) {
      isProhibited = true
      typeDetected = "Sticker"
    }
    
    else if (g.antiImage && msg.imageMessage) {
      isProhibited = true
      typeDetected = "Foto"
    }
  
    else if (g.antiVideo && (msg.videoMessage || msg.ptvMessage)) {
      isProhibited = true
      typeDetected = "Video"
    }
    
    else if (g.antiAudio && msg.audioMessage) {
      isProhibited = true
      typeDetected = "Audio"
    }

    if (!isProhibited) return

    // admin & owner kebal
    const isOwner = (rt.config.owner || []).some(o => m.sender.includes(o))
    if (isOwner) return

    let participants = []
    try {
      const meta = await sock.groupMetadata(chat)
      participants = meta?.participants || []
    } catch { return }

    const senderIsAdmin = checkAdmin(participants, m.sender)
    if (senderIsAdmin) return

    try {
      await sock.sendMessage(chat, { delete: m.raw.key })
      console.log(`[AntiMedia] Menghapus ${typeDetected} dari ${m.sender}`)
    } catch (e) {
      console.error(`[AntiMedia] Gagal hapus pesan:`, e)
    }
  },

  // run nya
  run: async (ev, rt) => {
    const { m, args, cmd, isOwner } = ev
    const { sock, db } = rt
    const chat = m.chat
    const metadata = await sock.groupMetadata(chat)
    const participants = metadata?.participants || []
    const senderIsAdmin = checkAdmin(participants, m.sender)

    if (!senderIsAdmin && !isOwner) return m.reply("❌ Khusus Admin Grup!")

    const g = db.getGroup(chat)
    const input = args[0] ? args[0].toLowerCase() : ""
    const isOn = ["on", "1", "enable"].includes(input)
    const isOff = ["off", "0", "disable"].includes(input)
    const replyStatus = (name, status) => {
      m.reply(`✅ ${name}: *${status ? "ON" : "OFF"}*`)
    }

    if (cmd === "antisticker" || cmd === "antistik") {
      if (isOn) { g.antiSticker = true; await db.save(); return replyStatus("Anti Sticker", true) }
      if (isOff) { g.antiSticker = false; await db.save(); return replyStatus("Anti Sticker", false) }
      return m.reply(`Status Anti Sticker: *${g.antiSticker ? "ON" : "OFF"}*\nGunakan: .antisticker on/off`)
    }

    if (cmd === "antiimage" || cmd === "antifoto") {
      if (isOn) { g.antiImage = true; await db.save(); return replyStatus("Anti Image", true) }
      if (isOff) { g.antiImage = false; await db.save(); return replyStatus("Anti Image", false) }
      return m.reply(`Status Anti Image: *${g.antiImage ? "ON" : "OFF"}*\nGunakan: .antifoto on/off`)
    }

    if (cmd === "antivideo") {
      if (isOn) { g.antiVideo = true; await db.save(); return replyStatus("Anti Video", true) }
      if (isOff) { g.antiVideo = false; await db.save(); return replyStatus("Anti Video", false) }
      return m.reply(`Status Anti Video: *${g.antiVideo ? "ON" : "OFF"}*\nGunakan: .antivideo on/off`)
    }

    if (cmd === "antiaudio" || cmd === "antivn") {
      if (isOn) { g.antiAudio = true; await db.save(); return replyStatus("Anti Audio", true) }
      if (isOff) { g.antiAudio = false; await db.save(); return replyStatus("Anti Audio", false) }
      return m.reply(`Status Anti Audio: *${g.antiAudio ? "ON" : "OFF"}*\nGunakan: .antiaudio on/off`)
    }
  }
}