*FITUR QC NOKIA*
_by dyysomnia_

// =============== QC NOKIA ===============
async function generateNokiaQcImage(text) {
  const width = 512;
  const height = 512;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // background hitam (area luar HP)
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // ukuran "layar" Nokia
  const screenW = 380;
  const screenH = 260;
  const screenX = (width - screenW) / 2;
  const screenY = (height - screenH) / 2;

  const headerH = 40;
  const footerH = 36;
  const bodyH = screenH - headerH - footerH;
  const bodyY = screenY + headerH;

  // --- HEADER: TULIS PESAN + JAM ---
  const headerGradient = ctx.createLinearGradient(
    screenX,
    screenY,
    screenX,
    screenY + headerH
  );
  headerGradient.addColorStop(0, "#9cc7ff");
  headerGradient.addColorStop(1, "#335a9f");
  ctx.fillStyle = headerGradient;
  ctx.fillRect(screenX, screenY, screenW, headerH);

  ctx.fillStyle = "#ffffcc";
  ctx.font = "bold 20px Arial";
  ctx.textBaseline = "middle";
  ctx.fillText("Tulis Pesan", screenX + 10, screenY + headerH / 2);

  const now = new Date();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const timeStr = `${hh}:${mm}`;

  const timeWidth = ctx.measureText(timeStr).width;
  ctx.fillText(timeStr, screenX + screenW - 10 - timeWidth, screenY + headerH / 2);

  // --- BODY: area teks bergaris biru gelap ---
  ctx.fillStyle = "#021633";
  ctx.fillRect(screenX, bodyY, screenW, bodyH);

  // garis horizontal
  ctx.strokeStyle = "rgba(120, 150, 255, 0.7)";
  ctx.lineWidth = 1;
  for (let y = bodyY + 30; y < bodyY + bodyH; y += 28) {
    ctx.beginPath();
    ctx.moveTo(screenX, y);
    ctx.lineTo(screenX + screenW, y);
    ctx.stroke();
  }

  // label kecil di pojok atas body: "ABC" dan counter
  ctx.fillStyle = "#9cc7ff";
  ctx.font = "16px Arial";
  ctx.textBaseline = "top";
  ctx.fillText("ABC", screenX + 8, bodyY + 4);

  const maxChars = 99;
  const len = (text || "").length;
  const counterStr = `${Math.min(len, maxChars)}[1]`; // mirip di gambar
  const counterWidth = ctx.measureText(counterStr).width;
  ctx.fillText(counterStr, screenX + screenW - 8 - counterWidth, bodyY + 4);

  // --- TEKS UTAMA ---
  ctx.fillStyle = "#ffffff";
  ctx.font = "20px 'DejaVu Sans Mono', monospace";
  const lineHeight = 26;

  const paddingX = 10;
  const areaX = screenX + paddingX;
  const areaY = bodyY + 30; // mulai di bawah "ABC"
  const areaW = screenW - paddingX * 2;
  const areaBottom = screenY + screenH - footerH - 10;

  const rawWords = (text || "").split(/\s+/);
  const lines = [];
  let line = "";

  for (const w of rawWords) {
    const test = line + w + " ";
    const testWidth = ctx.measureText(test).width;
    if (testWidth > areaW && line !== "") {
      lines.push(line.trim());
      line = w + " ";
    } else {
      line = test;
    }
  }
  if (line) lines.push(line.trim());

  // maksimal baris supaya nggak keluar layar
  const maxLines = Math.floor((areaBottom - areaY) / lineHeight);
  let drawLines = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    // tambahkan "..." di baris terakhir
    const lastIdx = drawLines.length - 1;
    let last = drawLines[lastIdx];
    const dotsWidth = ctx.measureText("...").width;
    while (
      ctx.measureText(last + "...").width > areaW &&
      last.length > 0
    ) {
      last = last.slice(0, -1);
    }
    drawLines[lastIdx] = last + "...";
  }

  let curY = areaY;
  for (const ln of drawLines) {
    ctx.fillText(ln, areaX, curY);
    curY += lineHeight;
  }

  // --- FOOTER: PILIHAN / BERSIH ---
  const footerGradient = ctx.createLinearGradient(
    screenX,
    screenY + screenH - footerH,
    screenX,
    screenY + screenH
  );
  footerGradient.addColorStop(0, "#234169");
  footerGradient.addColorStop(1, "#0c1f35");
  ctx.fillStyle = footerGradient;
  ctx.fillRect(screenX, screenY + screenH - footerH, screenW, footerH);

  ctx.fillStyle = "#ffffff";
  ctx.font = "18px Arial";
  ctx.textBaseline = "middle";

  ctx.fillText("pilihan", screenX + 10, screenY + screenH - footerH / 2);

  const bersihWidth = ctx.measureText("Bersih").width;
  ctx.fillText(
    "Bersih",
    screenX + screenW - 10 - bersihWidth,
    screenY + screenH - footerH / 2
  );

  // garis tipis di sekeliling layar
  ctx.strokeStyle = "#7fa8ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(screenX - 2, screenY - 2, screenW + 4, screenH + 4);

  return canvas.toBuffer("image/png");
}

case "qcnokia": {
  try {
    // ambil teks: dari reply dulu, kalau nggak ada pakai argumen
    let teks = text && text.trim();
    if (m.quoted) {
      const qTxt =
        m.quoted.text ||
        m.quoted.caption ||
        m.quoted.message?.conversation ||
        m.quoted.message?.extendedTextMessage?.text ||
        "";
      if (qTxt) teks = teks ? `${qTxt} ${teks}` : qTxt;
    }

    if (!teks) {
      return m.reply(
        "📟 *QC Nokia Jadul*\n\n" +
        `• Ketik: *${m.prefix}qcnokia teks kamu*\n` +
        `• Atau reply pesan lalu ketik: *${m.prefix}qcnokia*`
      );
    }

    // 1) generate gambar nokia (PNG)
    const pngBuffer = await generateNokiaQcImage(teks);

    // 2) simpan sementara & convert ke WEBP sticker via ffmpeg
    const tmpDir = path.join(__dirname, "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const inFile = path.join(tmpDir, `qcnokia-in-${Date.now()}.png`);
    const outFile = path.join(tmpDir, `qcnokia-out-${Date.now()}.webp`);

    fs.writeFileSync(inFile, pngBuffer);

    const cmd =
      `ffmpeg -y -i "${inFile}" ` +
      `-vcodec libwebp ` +
      `-lossless 1 -compression_level 6 -qscale 50 -preset picture ` +
      `-loop 0 -an -vsync 0 -s 512:512 "${outFile}"`;

    exec(cmd, async (err, stdout, stderr) => {
      if (fs.existsSync(inFile)) fs.unlinkSync(inFile);

      if (err) {
        console.error("ffmpeg QC NOKIA error:", err, stderr);
        return m.reply(
          "❌ Gagal mengonversi QC Nokia ke sticker.\n" +
          "Pastikan *ffmpeg* sudah terinstall di VPS."
        );
      }

      if (!fs.existsSync(outFile)) {
        return m.reply("❌ File sticker QC Nokia tidak ditemukan setelah konversi.");
      }

      const stickerBuf = fs.readFileSync(outFile);

      await sock.sendMessage(
        m.chat,
        { sticker: stickerBuf },
        { quoted: m }
      );

      fs.unlinkSync(outFile);
    });
  } catch (e) {
    console.error("QCNOKIA ERROR:", e);
    m.reply("❌ Terjadi kesalahan saat membuat QC Nokia.");
  }
}
break;