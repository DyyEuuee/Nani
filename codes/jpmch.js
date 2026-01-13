// broadcast ke channel yang terdaftar di database
// by dyysomn_

// in helper.js //
export function unwrapMessage(message) {
  let m = message || {}
  if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message
  if (m.viewOnceMessage?.message) m = m.viewOnceMessage.message
  if (m.viewOnceMessageV2?.message) m = m.viewOnceMessageV2.message
  if (m.viewOnceMessageV2Extension?.message) m = m.viewOnceMessageV2Extension.message
  if (m.editedMessage) m = m.editedMessage.message?.protocolMessage?.editedMessage || m.editedMessage
  return m
}

// in media.js //
export const audioToPttOpus = async (buffer, ext = ".mp3") => {
  const inFile = createTmpFile(ext)
  const outFile = createTmpFile(".ogg")

  try {
    await fs.promises.writeFile(inFile, buffer)
    await new Promise((resolve, reject) => {
      ffmpeg(inFile)
        .audioCodec("libopus")
        .audioBitrate("48k")
        .outputOptions(["-vn", "-ar", "48000", "-ac", "1", "-f", "ogg"])
        .on("end", resolve)
        .on("error", reject)
        .save(outFile)
    })
    return await fs.promises.readFile(outFile)
  } finally {
    await cleanTmpFiles(inFile, outFile)
  }
}
export const videoToSquare = async (buffer, size = 480, dur = 120) => {
  const ext = await detectExt(buffer, ".mp4")
  const inFile = createTmpFile(ext)
  const outFile = createTmpFile(".mp4")

  try {
    await fs.promises.writeFile(inFile, buffer)
    await new Promise((resolve, reject) => {
      ffmpeg(inFile)
        .outputOptions([
          "-t", String(dur),
          "-c:v", "libx264",
          "-preset", "veryfast",
          "-crf", "30",
          "-c:a", "aac",
          "-b:a", "64k",
          "-movflags", "+faststart",
          "-vf", `scale=${size}:${size}:force_original_aspect_ratio=increase,crop=${size}:${size},fps=24`
        ])
        .on("end", resolve)
        .on("error", reject)
        .save(outFile)
    })
    return await fs.promises.readFile(outFile)
  } finally {
    await cleanTmpFiles(inFile, outFile)
  }
}

export const videoToMp3 = async buffer => {
  const ext = await detectExt(buffer, ".mp4")
  const inFile = createTmpFile(ext)
  const outFile = createTmpFile(".mp3")

  try {
    await fs.promises.writeFile(inFile, buffer)
    await new Promise((resolve, reject) => {
      ffmpeg(inFile)
        .noVideo()
        .audioCodec("libmp3lame")
        .audioBitrate("128k")
        .outputOptions(["-vn"])
        .on("end", resolve)
        .on("error", reject)
        .save(outFile)
    })
    return await fs.promises.readFile(outFile)
  } finally {
    await cleanTmpFiles(inFile, outFile)
  }
}

// in plugins //
import { downloadContentFromMessage } from "@dyyxyzz/baileys-mod"
import { videoToSquare, audioToPttOpus, videoToMp3 } from "../../lib/media.js" 
import { unwrapMessage } from "../../lib/helper.js"

function getChannelJidFromMsg(m) {
  return (
    m.contextInfo?.forwardedNewsletterMessageInfo?.newsletterJid ||
    m.quoted?.contextInfo?.forwardedNewsletterMessageInfo?.newsletterJid ||
    null
  )
}

function getChannelNameFromMsg(m) {
  return (
    m.contextInfo?.forwardedNewsletterMessageInfo?.newsletterName ||
    m.quoted?.contextInfo?.forwardedNewsletterMessageInfo?.newsletterName ||
    "Unknown Channel"
  )
}

export default {
  name: "channel_manager",
  command: ["upch", "addch", "delch", "listch"],
  tags: ["tools"],
  run: async (ev, rt) => {
    const { m, args, cmd, q } = ev
    const { sock, db } = rt
    
    const d = db.data()
    if (!d.jpmchannels) d.jpmchannels = []

    if (cmd === "addch") {
      const detectedJid = getChannelJidFromMsg(m.raw) || (args[0] && args[0].endsWith("@newsletter") ? args[0] : null)
      const detectedName = getChannelNameFromMsg(m.raw)
      if (!detectedJid) return m.reply(`❌ Gagal mendeteksi JID Channel.`)
      if (d.jpmchannels.some(c => c.jid === detectedJid)) return m.reply("⚠️ Channel ini sudah tersimpan.")
      d.jpmchannels.push({ jid: detectedJid, name: detectedName, addedAt: Date.now() })
      await db.save()
      return m.reply(`✅ Channel Disimpan:\n${detectedName}\n${detectedJid}`)
    }

    if (cmd === "delch") {
      if (!args[0]) return m.reply("❌ Masukkan nomor urut channel.")
      const index = parseInt(args[0]) - 1
      if (isNaN(index) || index < 0 || index >= d.jpmchannels.length) return m.reply("❌ Nomor tidak valid.")
      const deleted = d.jpmchannels.splice(index, 1)
      await db.save()
      return m.reply(`✅ Berhasil menghapus: ${deleted[0].name}`)
    }

    if (cmd === "listch") {
      if (!d.jpmchannels.length) return m.reply("📂 Belum ada channel.")
      let txt = "📋 *LIST CHANNEL*\n\n"
      d.jpmchannels.forEach((c, i) => { txt += `${i + 1}. ${c.name}\n` })
      return m.reply(txt)
    }

    if (cmd === "upch") {
      if (!d.jpmchannels.length) return m.reply("❌ Simpan channel dulu dengan .addch")
      
      const targets = d.jpmchannels
      const quoted = m.quoted
      const extraText = q.replace(/--(ptv|vn|mp3)/g, "").trim()

      await m.react("⏳")

      try {
        if (!quoted) {
            const broadcastText = extraText || q
            if (!broadcastText) return m.reply("❌ Tidak ada isi pesan.")
            let ok = 0
            for (const ch of targets) {
                try { 
                    await sock.sendMessage(ch.jid, { text: broadcastText })
                    ok++ 
                } catch (e) {}
            }
            await m.react("✅")
            return m.reply(`📢 Broadcast selesai. Berhasil: ${ok}/${targets.length}`)
        }
        const rawObj = quoted.raw?.message || quoted.raw
        const msgContent = rawObj?.viewOnceMessageV2?.message || rawObj?.viewOnceMessage?.message || rawObj
        const map = {
            imageMessage: "image",
            videoMessage: "video",
            ptvMessage: "video",
            audioMessage: "audio",
            documentMessage: "document",
            stickerMessage: "sticker"
        }
        const qType = Object.keys(msgContent).find(key => map[key])
        if (!qType) return m.reply(`❌ Jenis pesan (${Object.keys(msgContent)[0]}) tidak didukung.`)

        const node = msgContent[qType]
        const dlType = map[qType]

        let buffer = Buffer.from([])
        try {
            const stream = await downloadContentFromMessage(node, dlType)
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
        } catch (e) {
            return m.reply("❌ Gagal mendeteksi stream media. Silahkan kirim ulang media lalu reply.")
        }
        if (!buffer.length) return m.reply("❌ Buffer kosong.")
        let finalType = dlType
        const isPtv = qType === "ptvMessage" || q.toLowerCase().includes("--ptv") || !!node.ptv
        if (dlType === "video" && q.toLowerCase().includes("--ptv") && qType !== "ptvMessage") {
            try { buffer = await videoToSquare(buffer) } catch (e) {
                return m.reply("❌ Gagal convert ke format PTV.")
            }
        }

        const caption = isPtv ? "" : (extraText || node.caption || "")
        let ok = 0

        for (const ch of targets) {
            try {
                if (isPtv) {
                    await sock.sendMessage(ch.jid, { video: buffer, ptv: true })
                } else if (finalType === "image") {
                    await sock.sendMessage(ch.jid, { image: buffer, caption })
                } else if (finalType === "video") {
                    await sock.sendMessage(ch.jid, { video: buffer, caption, mimetype: node.mimetype || "video/mp4" })
                } else if (finalType === "audio") {
                    await sock.sendMessage(ch.jid, { audio: buffer, mimetype: node.mimetype || "audio/ogg; codecs=opus", ptt: !!node.ptt })
                } else if (finalType === "document") {
                    await sock.sendMessage(ch.jid, { document: buffer, mimetype: node.mimetype || "application/octet-stream", fileName: node.fileName || "file", caption })
                } else if (finalType === "sticker") {
                    await sock.sendMessage(ch.jid, { sticker: buffer })
                }
                ok++
            } catch (e) {
                console.log(`Gagal ke ${ch.name}:`, e.message)
            }
            await new Promise(r => setTimeout(r, 2000))
        }

        await m.react("✅")
        return m.reply(`📢 Broadcast selesai. Berhasil: ${ok}/${targets.length}`)

      } catch (e) {
        console.error(e)
        await m.react("❌")
        m.reply(`❌ Error: ${e.message}`)
      }
    }
  }
}