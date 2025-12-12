*##---SAVEKONTAK ANGGOTA GROUP:  [vcf|csv]---##*

case "savekontak": {
  // contoh: .savekontak vcf   atau  .savekontak csv
  if (!m.isGroup) return m.reply("Perintah ini hanya bisa dijalankan di grup.");
  // Optional: batasi hanya admin/owner:
  if (!m.isAdmin && !isOwner) return m.reply(mess.admin || "Hanya admin grup yang boleh menjalankan perintah ini.");

  // format pilihan
  const fmt = (text || "vcf").toLowerCase().trim();
  if (!["vcf", "csv"].includes(fmt)) return m.reply("Format tidak dikenal. Gunakan: vcf atau csv\nContoh: .savekontak vcf");

  try {
    await sock.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

    // ambil metadata grup (participants)
    let metadata = m.metadata;
    if (!metadata || !metadata.participants) {
      // fallback: fetch langsung dari server
      metadata = await sock.groupMetadata(m.chat).catch(() => null);
      if (!metadata || !metadata.participants) {
        return m.reply("Gagal mengambil daftar member grup.");
      }
    }

    const participants = metadata.participants || [];
    if (!participants.length) return m.reply("Tidak ada member di grup ini.");

    // helper: bersihkan nomor dari jid (contoh: 62812xxx@s.whatsapp.net -> +62812xxx)
    const jidToPhone = (jid) => {
      const num = String(jid).split("@")[0].replace(/^0+/, (m) => m); // keep leading zeros if any
      // pastikan awalan +, WhatsApp biasanya pakai country code (e.g. 62...). Jika mulai dengan '0', tidak kita ubah otomatis kecuali user mau
      if (/^\d+$/.test(num)) {
        if (num.startsWith("0")) return "+" + num; // best-effort
        if (!num.startsWith("+")) return "+" + num;
      }
      return num;
    };

    // buat isi vCard atau CSV
    if (fmt === "vcf") {
      let vcardAll = "";
      for (const p of participants) {
        const jid = p.jid || p.id || p;
        const phone = jidToPhone(jid).replace(/@.*$/, "");
        // Nama: coba ambil notify/name jika ada, fallback ke nomor
        const name =
          (p?.notify || p?.vname || p?.pushname || p?.name || "").trim() ||
          phone.replace(/^\+/, "");

        // buat vCard minimal (VERSION:3.0 kompatibel Google Contacts)
        const vcard = [
          "BEGIN:VCARD",
          "VERSION:3.0",
          `FN:${escapeVcard(name)}`,
          `N:${escapeVcard(name)};;;;`,
          `TEL;TYPE=CELL:${phone}`,
          `END:VCARD`,
        ].join("\r\n");

        vcardAll += vcard + "\r\n";
      }

      // tulis file sementara
      const filename = `kontak-${(metadata.subject || m.chat).replace(/[/\\?%*:|"<>]/g, "_").slice(0,40)}.vcf`;
      const filepath = path.join(__dirname, filename);
      fs.writeFileSync(filepath, vcardAll, "utf8");

      // kirim file
      const docBuffer = fs.readFileSync(filepath);
      await sock.sendMessage(m.chat, {
        document: docBuffer,
        fileName: filename,
        mimetype: "text/vcard",
        caption: `Berhasil membuat file vCard (${participants.length} kontak). Import file .vcf ini ke Google Contacts -> Import.`,
      }, { quoted: m });

      // hapus file sementara kalau mau
      try { fs.unlinkSync(filepath); } catch (e) {}

      return;
    } else if (fmt === "csv") {
      // CSV format compatible Google Contacts (minimal columns)
      // header mengikuti format Google CSV (versi sederhana)
      const header = [
        "Name",
        "Given Name",
        "Family Name",
        "Phone 1 - Value",
        "Phone 1 - Type"
      ].join(",");

      const lines = [header];
      for (const p of participants) {
        const jid = p.jid || p.id || p;
        const phone = jidToPhone(jid).replace(/@.*$/, "");
        const name = (p?.notify || p?.vname || p?.pushname || p?.name || "").trim() || phone.replace(/^\+/, "");

        // escape double quotes
        const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;

        const row = [
          esc(name),
          esc(name), // Given Name (we put full name as given name for simplicity)
          esc(""),
          esc(phone),
          esc("mobile")
        ].join(",");

        lines.push(row);
      }

      const csvContent = lines.join("\r\n");
      const filename = `kontak-${(metadata.subject || m.chat).replace(/[/\\?%*:|"<>]/g, "_").slice(0,40)}.csv`;
      const filepath = path.join(__dirname, filename);
      fs.writeFileSync(filepath, csvContent, "utf8");

      const docBuffer = fs.readFileSync(filepath);
      await sock.sendMessage(m.chat, {
        document: docBuffer,
        fileName: filename,
        mimetype: "text/csv",
        caption: `Berhasil membuat file CSV (${participants.length} kontak). Import file .csv ini ke Google Contacts -> Import (pilih CSV).`,
      }, { quoted: m });

      try { fs.unlinkSync(filepath); } catch (e) {}
      return;
    }
  } catch (err) {
    console.error("savekontak error:", err);
    return m.reply("Terjadi kesalahan saat membuat file kontak.");
  }

  // helper kecil: escape untuk vCard (newline/comma/semicolon handling)
  function escapeVcard(str) {
    if (!str) return "";
    return String(str)
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");
  }
}
break;

> @DyySilence