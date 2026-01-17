// auto respon jika deteksi kata kata dari keyword
// ~ dyysomnia
// ~ es m

import fs from "fs"
import path from "path"
import { downloadContentFromMessage } from "@dyyxyzz/baileys-mod"

const MEDIA_DIR = "./dyysomnia/media_respon"
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true })
}

async function downloadMedia(msg, type) {
  const stream = await downloadContentFromMessage(msg, type)
  let buffer = Buffer.from([])
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk])
  }
  return buffer
}

function formatTextWithNewlines(text) {
  if (!text) return ""
  
  return text
    .replace(/\\n/g, '\n')
    .replace(/<br>/g, '\n')
    .replace(/<br\s*\/>/g, '\n')
    .replace(/\|\|/g, '\n')
}

function findKeywordInText(text, keywords) {
  const txt = text.trim()
  const lowerText = txt.toLowerCase()
  
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase()
    
    if (txt === keyword || lowerText === lowerKeyword) {
      return keyword
    }
   
    const prefixPattern = new RegExp(`^${lowerKeyword}[\\s\\.,!?;:]`, 'i')
    if (prefixPattern.test(txt)) {
      return keyword
    }
    const standalonePattern = new RegExp(`(^|\\s)${lowerKeyword}(\\s|$|[\\.,!?;:])`, 'i')
    if (standalonePattern.test(txt)) {
      return keyword
    }
   
    if (keyword.includes(' ')) {
      const exactPhrasePattern = new RegExp(`\\b${lowerKeyword}\\b`, 'i')
      if (exactPhrasePattern.test(lowerText)) {
        return keyword
      }
    }
    const commandPattern = new RegExp(`^[\\.!#]?${lowerKeyword}(\\s|$)`, 'i')
    if (commandPattern.test(txt)) {
      return keyword
    }
  }
  
  return null
}

export default {
  name: "autorespon",
  command: [
    "addrespon", "delrespon", "listrespon", 
    "respon", "autorespon", "promosi",
    "addpromo", "delpromo", "listpromo"
  ],
  tags: ["store", "utility"],
  run: async (ev, rt) => {
    const { m, cmd, q, prefix } = ev
    const { db } = rt

    if (["addrespon", "addpromo"].includes(cmd)) {
      if (!ev.isOwner) return m.reply("❌ Fitur ini khusus Owner.")

      const quoted = m.quoted ? m.quoted.raw : null
      const quotedMsg = quoted ? (quoted.message || quoted) : null
      
      const isImage = m.raw.message?.imageMessage || quotedMsg?.imageMessage
      const isVideo = m.raw.message?.videoMessage || quotedMsg?.videoMessage
      const isDocument = m.raw.message?.documentMessage || quotedMsg?.documentMessage
      const isAudio = m.raw.message?.audioMessage || quotedMsg?.audioMessage
      const isPtt = m.raw.message?.pttMessage || quotedMsg?.pttMessage
      
      const split = String(q || "").split("|")
      const keyword = split[0] ? split[0].trim() : ""
      const text = split.slice(1).join("|").trim()

      if (!keyword) {
        return m.reply(`❌ Masukkan keyword.\n\nContoh:\n${prefix}addrespon sc|Jasa SC Murah!\n\nUntuk Audio/VN:\nReply audio lalu\n${prefix}addrespon halo|Salam kenal!`)
      }

      const reservedKeywords = ["menu", "addrespon", "delrespon", "listrespon", "respon", "promo", "addpromo", "delpromo", "listpromo"]
      if (reservedKeywords.includes(keyword.toLowerCase())) {
        return m.reply("❌ Tidak bisa menggunakan keyword yang sama dengan command bot.")
      }

      if (isImage || isVideo || isDocument || isAudio || isPtt) {
        m.reply("⏳ Sedang mengunduh media...")
        
        try {
          let mediaBuffer
          let ext
          let mediaType 
          let filename
          let mimetype = ""
          let isVoiceNote = false

          if (isImage) {
            mediaBuffer = await downloadMedia(isImage, "image")
            ext = "jpg"
            mediaType = "image"
            mimetype = "image/jpeg"
            filename = `${keyword}_${Date.now()}.${ext}`
          } else if (isVideo) {
            mediaBuffer = await downloadMedia(isVideo, "video")
            ext = "mp4"
            mediaType = "video"
            mimetype = "video/mp4"
            filename = `${keyword}_${Date.now()}.${ext}`
          } else if (isDocument) {
            mediaBuffer = await downloadMedia(isDocument, "document")
            const docName = isDocument.fileName || "document"
            ext = docName.split('.').pop() || "bin"
            mediaType = "document"
            mimetype = isDocument.mimetype || "application/octet-stream"
            filename = `${keyword}_${Date.now()}.${ext}`
          } else if (isAudio || isPtt) {
            mediaBuffer = await downloadMedia(isAudio || isPtt, "audio")
            ext = "ogg"
            mediaType = "audio"
            mimetype = isAudio?.mimetype || isPtt?.mimetype || "audio/ogg; codecs=opus"
            filename = `${keyword}_${Date.now()}.${ext}`
            isVoiceNote = !!isPtt 
          }

          const oldData = db.getResponse(keyword)
          if (oldData && typeof oldData === "object" && oldData.path) {
            if (fs.existsSync(oldData.path)) fs.unlinkSync(oldData.path)
          }

          const filepath = path.join(MEDIA_DIR, filename)
          fs.writeFileSync(filepath, mediaBuffer)

          const dataObj = {
            type: mediaType,
            path: filepath,
            filename: filename,
            mimetype: mimetype,
            text: formatTextWithNewlines(text),
            isPtt: isVoiceNote,
            createdAt: Date.now(),
            createdBy: m.sender
          }

          db.addResponse(keyword, dataObj)
          await db.save()

          let replyMsg = `✅ *RESPON BERHASIL DITAMBAHKAN!*\n\n`
          replyMsg += `🔑 *Keyword:* ${keyword}\n`
          replyMsg += `📁 *Tipe:* ${mediaType.toUpperCase()}${isVoiceNote ? ' (Voice Note)' : ''}\n`
          if (text) {
            replyMsg += `📝 *Teks:* ${formatTextWithNewlines(text).substring(0, 50) + "..."}\n`
          }
          replyMsg += `💾 *File:* ${filename}\n`
          replyMsg += `👤 *Ditambah oleh:* @${m.sender.split("@")[0]}\n\n`
          
          replyMsg += `ℹ️ *ATURAN DETEKSI:*\n`
          replyMsg += `• EXACT: "${keyword}"\n`
          replyMsg += `• PREFIX: "${keyword} "\n`
          replyMsg += `• STANDALONE: " ... ${keyword} ... "\n`
          if (keyword.includes(' ')) {
            replyMsg += `• PHRASE: " ... ${keyword} ... "\n`
          }
          replyMsg += `• COMMAND: ".${keyword}" atau "!${keyword}"\n\n`
          replyMsg += `❌ TIDAK AKAN TRIGGER: "per${keyword}" atau "${keyword}at"`

          return m.reply(replyMsg)

        } catch (e) {
          console.error(e)
          return m.reply("❌ Gagal mengunduh media. Coba lagi.")
        }
      } 
      
      else {
        if (!text) return m.reply(`❌ Untuk respon teks, formatnya:\n${prefix}addrespon keyword|teks respon\n\nGunakan \\n untuk enter baru.`)
        
        const oldData = db.getResponse(keyword)
        if (oldData && typeof oldData === "object" && oldData.path) {
          if (fs.existsSync(oldData.path)) fs.unlinkSync(oldData.path)
        }

        const dataObj = {
          type: "text",
          text: formatTextWithNewlines(text),
          createdAt: Date.now(),
          createdBy: m.sender
        }

        db.addResponse(keyword, dataObj)
        await db.save()
        
        let replyMsg = `✅ *RESPON TEKS BERHASIL DITAMBAHKAN!*\n\n`
        replyMsg += `🔑 *Keyword:* ${keyword}\n`
        replyMsg += `📝 *Teks Respon:*\n${formatTextWithNewlines(text)}\n`
        replyMsg += `👤 *Ditambah oleh:* @${m.sender.split("@")[0]}\n\n`

        return m.reply(replyMsg)
      }
    }

    if (["delrespon", "delpromo"].includes(cmd)) {
      if (!ev.isOwner) return m.reply("❌ Fitur ini khusus Owner.")
      
      const keyword = String(q || "").trim()
      if (!keyword) return m.reply(`❌ Masukkan keyword yang mau dihapus.\nContoh: ${prefix}delrespon sc`)

      const data = db.getResponse(keyword)
      if (!data) return m.reply(`❌ Keyword *${keyword}* tidak ditemukan.`)

      if (typeof data === "object" && data.path) {
        if (fs.existsSync(data.path)) {
          fs.unlinkSync(data.path)
        }
      }

      db.delResponse(keyword)
      await db.save()
      
      let replyMsg = `✅ *RESPON BERHASIL DIHAPUS!*\n\n`
      replyMsg += `🔑 *Keyword:* ${keyword}\n`
      replyMsg += `🗑️ *Status:* Terhapus dari database\n`
      if (typeof data === "object" && data.path) {
        replyMsg += `💾 *File:* ${fs.existsSync(data.path) ? "Masih ada di server" : "Sudah dihapus"}\n`
      }
      replyMsg += `👤 *Dihapus oleh:* @${m.sender.split("@")[0]}`

      return m.reply(replyMsg)
    }

    if (["listrespon", "listpromo"].includes(cmd)) {
      const all = db.getAllResponses()
      const keys = Object.keys(all)

      if (keys.length === 0) return m.reply("📭 Belum ada respon yang ditambahkan.")

      const keywordRespon = keys.filter(k => {
        const val = all[k]
        return typeof val === "object" && (val.type === "text" || val.type === "image" || val.type === "video" || val.type === "document" || val.type === "audio")
      })

      if (keywordRespon.length === 0) {
        return m.reply("📭 Belum ada respon keyword yang ditambahkan.")
      }

      let msg = "📋 *LIST RESPON KEYWORD*\n\n"
      msg += `Total: ${keywordRespon.length} respon\n\n`
      
      keywordRespon.forEach((k, i) => {
        const val = all[k]
        const typeEmoji = val.type === "image" ? "🖼️" : 
                         val.type === "video" ? "🎬" : 
                         val.type === "document" ? "📎" : 
                         val.type === "audio" ? (val.isPtt ? "🎤" : "🎵") : "📝"
        const typeText = val.type === "text" ? "TEXT" : 
                        val.type === "audio" ? (val.isPtt ? "VOICE NOTE" : "AUDIO") : 
                        val.type?.toUpperCase()
        
        const preview = typeof val.text === "string" ? 
          (val.text.length > 30 ? val.text.substring(0, 30) + "..." : val.text) : 
          "-"
        
        msg += `${i + 1}. ${typeEmoji} *${k}* [${typeText}]\n`
        if (preview && preview !== "-") {
          msg += `   📝 ${preview}\n`
        }
        msg += `   👤 ${val.createdBy?.split("@")[0] || "-"}\n`
        msg += `   📅 ${val.createdAt ? new Date(val.createdAt).toLocaleDateString("id-ID") : "-"}\n\n`
      })
      
      msg += `\nℹ️ *ATURAN DETEKSI:*\n`
      msg += `• Hanya trigger jika keyword berdiri sendiri\n`
      msg += `• Tidak akan trigger jika keyword bagian dari kata lain\n`
      msg += `• Contoh: keyword "p" tidak akan trigger "pernah"`

      return m.reply(msg.trim())
    }

    if (["respon", "autorespon", "promosi"].includes(cmd)) {
      const keyword = String(q || "").trim()
      
      if (keyword) {
        const data = db.getResponse(keyword)
        if (!data) {
          return m.reply(`❌ Respon untuk keyword *${keyword}* tidak ditemukan.\n\nGunakan ${prefix}listrespon untuk melihat semua respon.`)
        }

        let replyMsg = `🔍 *DETAIL RESPON:* ${keyword}\n\n`
        
        if (typeof data === "string") {
          replyMsg += `📝 *Tipe:* TEXT\n\n`
          replyMsg += `📄 *Isi Respon:*\n${formatTextWithNewlines(data)}\n\n`
          replyMsg += `📅 *Ditambahkan:* Data lama (format string)`
        } 
        else if (typeof data === "object") {
          replyMsg += `📝 *Tipe:* ${data.type?.toUpperCase() || "OBJECT"}${data.isPtt ? ' (Voice Note)' : ''}\n\n`
          
          if (data.text) {
            replyMsg += `📄 *Isi Respon:*\n${formatTextWithNewlines(data.text)}\n\n`
          }
          
          if (data.filename) {
            replyMsg += `📁 *File:* ${data.filename}\n`
          }
          
          if (data.createdAt) {
            replyMsg += `📅 *Ditambahkan:* ${new Date(data.createdAt).toLocaleString("id-ID")}\n`
          }
          
          if (data.createdBy) {
            replyMsg += `👤 *Oleh:* @${data.createdBy.split("@")[0]}\n`
          }
          
          if (data.type === 'audio') {
            replyMsg += `🎵 *Format:* ${data.isPtt ? 'Voice Note (PTT)' : 'Audio'}\n`
          }
        }
        
        replyMsg += `\nℹ️ *ATURAN DETEKSI (KETAT):*\n`
        replyMsg += `✅ AKAN TRIGGER:\n`
        replyMsg += `• "${keyword}" (exact)\n`
        replyMsg += `• "${keyword} " (prefix dengan spasi)\n`
        replyMsg += `• ".${keyword}" (sebagai command)\n`
        replyMsg += `• " ${keyword} " (kata berdiri sendiri)\n\n`
        
        replyMsg += `❌ TIDAK AKAN TRIGGER:\n`
        replyMsg += `• "per${keyword}"\n`
        replyMsg += `• "${keyword}at"\n`
        replyMsg += `• Kata yang mengandung "${keyword}" di tengah`

        return m.reply(replyMsg.trim())
      } else {
        return m.reply(`🔧 *AUTO-RESPON SYSTEM*\n\n` +
                      `Perintah:\n` +
                      `• ${prefix}addrespon keyword|teks → Tambah respon\n` +
                      `• ${prefix}delrespon keyword → Hapus respon\n` +
                      `• ${prefix}listrespon → List semua respon\n` +
                      `• ${prefix}respon keyword → Detail respon\n\n` +
                      `📝 *Format teks:*\n` +
                      `Gunakan \\n untuk enter baru\n\n` +
                      `📁 *Support semua media:*\n` +
                      `• Foto + caption\n` +
                      `• Video + caption\n` +
                      `• Document + caption\n` +
                      `• Audio (Voice Note/MP3) + caption\n\n` +
                      `🔍 *ATURAN DETEKSI (KETAT):*\n` +
                      `• Keyword harus berdiri sendiri\n` +
                      `• Tidak trigger jika keyword bagian dari kata lain\n` +
                      `• Contoh: keyword "p" → trigger "p " tapi tidak trigger "pernah"`)
      }
    }
  },

  middleware: async ({ m, rt }) => {
    if (m.fromMe || !m.text) return

    const txt = m.text.trim()
    const { db, sock } = rt

    const allResponses = db.getAllResponses()
    const keywords = Object.keys(allResponses).filter(k => {
      const val = allResponses[k]
      return typeof val === "object" && (val.type === "text" || val.type === "image" || val.type === "video" || val.type === "document" || val.type === "audio")
    })

    if (keywords.length === 0) return

    const foundKeyword = findKeywordInText(txt, keywords)
    
    if (!foundKeyword) return

    const data = allResponses[foundKeyword]
    if (!data) return

    try {
      console.log(`[AUTO-RESPON] Triggered by: "${txt}" → Keyword: "${foundKeyword}"`)
      
      if (typeof data === "string") {
        await sock.sendMessage(m.chat, { 
          text: formatTextWithNewlines(data)
        }, { quoted: m.raw })
      } 
      else if (typeof data === "object") {
        if (data.type === "text" && data.text) {
          await sock.sendMessage(m.chat, { 
            text: formatTextWithNewlines(data.text)
          }, { quoted: m.raw })
        }
        else if (data.type === "image" && data.path && fs.existsSync(data.path)) {
          const buffer = fs.readFileSync(data.path)
          await sock.sendMessage(m.chat, { 
            image: buffer,
            caption: data.text ? formatTextWithNewlines(data.text) : ""
          }, { quoted: m.raw })
        }
        else if (data.type === "video" && data.path && fs.existsSync(data.path)) {
          const buffer = fs.readFileSync(data.path)
          await sock.sendMessage(m.chat, { 
            video: buffer,
            caption: data.text ? formatTextWithNewlines(data.text) : "",
            mimetype: data.mimetype || "video/mp4"
          }, { quoted: m.raw })
        }
        else if (data.type === "document" && data.path && fs.existsSync(data.path)) {
          const buffer = fs.readFileSync(data.path)
          await sock.sendMessage(m.chat, { 
            document: buffer,
            fileName: data.filename || "document",
            caption: data.text ? formatTextWithNewlines(data.text) : "",
            mimetype: data.mimetype || "application/octet-stream"
          }, { quoted: m.raw })
        }
        else if (data.type === "audio" && data.path && fs.existsSync(data.path)) {
          const buffer = fs.readFileSync(data.path)
          
          if (data.isPtt) {
            await sock.sendMessage(m.chat, { 
              audio: buffer,
              ptt: true,
              mimetype: data.mimetype || 'audio/ogg; codecs=opus'
            }, { quoted: m.raw })
          } else {
            await sock.sendMessage(m.chat, { 
              audio: buffer,
              mimetype: data.mimetype || 'audio/mpeg',
              ...(data.text ? { caption: formatTextWithNewlines(data.text) } : {})
            }, { quoted: m.raw })
          }
        }
        else if (data.text) {
          await sock.sendMessage(m.chat, { 
            text: formatTextWithNewlines(data.text)
          }, { quoted: m.raw })
        }
      }
      
    } catch (error) {
      console.error("[AUTO-RESPON ERROR]", error)
    }
  }
}