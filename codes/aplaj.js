case "belipanel":
case "buypanel": {
  if (m.isGroup) return reply(mess.private);
  if (dbTransaksi[m.sender]) return reply(`Masih ada transaksi yang belum diselesaikan.\nketik *.batalbeli* untuk membatalkan transaksi sebelumnya`);
  if (!text) return reply(`Masukan username\n*Contoh :* ${cmd} dyysomnia`);
  if (args.length > 1) return reply("Username dilarang menggunakan spasi!");
  const hargaDasar = global.hargaPanel || 1000; // Harga per 1GB
  if (!text.includes("|")) {
    let usn = text.toLowerCase();
    const rows = [];
    rows.push({
      title: "Ram ∞ || Cpu ∞ || Disk ∞",
      description: `Rp${(hargaDasar * 11).toLocaleString("id-ID")}`,
      id: `.buypanel unlimited|${usn}`
    });
    for (let i = 1; i <= 10; i++) {
      const harga = hargaDasar * i;
      rows.push({
        title: `Ram ${i}GB || Cpu ${40 + (i - 1) * 20}% || Disk ${i <= 2 ? i : Math.floor(i / 2)}GB`,
        description: `Rp${harga.toLocaleString("id-ID")}`,
        id: `.buypanel ${i}gb|${usn}`
      });
    }
    return sock.sendMessage(
      m.chat,
      {
        buttons: [
          {
            buttonId: "action",
            buttonText: { displayText: "Pilih RAM Panel" },
            type: 4,
            nativeFlowInfo: {
              name: "single_select",
              paramsJson: JSON.stringify({
                title: "Pilih Ram Server",
                sections: [{ highlight_label: "High Quality", rows }],
              }),
            },
          },
        ],
        headerType: 1,
        viewOnce: true,
        text: `\nPilih Ram Server Panel Pterodactyl\n`,
        contextInfo: { isForwarded: true, mentionedJid: [m.sender] },
      },
      { quoted: null }
    );
  }
  const [cmds, username] = text.split("|");
  const ram = cmds.toLowerCase();
  const match = ram.match(/^(\d+)gb$/);
  const isUnlimited = ram === "unli" || ram === "unlimited";
  if (!match && !isUnlimited) return reply("Pilihan RAM tidak valid!");
  const size = match ? parseInt(match[1]) : 0;
  const harga = isUnlimited ? hargaDasar * 11 : hargaDasar * size;
  const Obj = {
    username,
    ram: isUnlimited ? "0" : `${size * 1000}`,
    disk: isUnlimited ? "0" : `${size <= 2 ? 1000 : Math.floor(size / 2) * 1000}`,
    cpu: isUnlimited ? "0" : `${40 + (size - 1) * 20}`,
    harga: harga + global.generateRandomNumber(110, 250),
  };
  try {
    const qris = await createdQris(Obj.harga, {
      apikey: global.ApikeyRestApi,
      username: global.usernameOrderkuota,
      token: global.tokenOrderkuota,
    });
    const teks3 = `
*INFORMASI PEMBAYARAN*
- ID: *${qris.idtransaksi}*
- Total Pembayaran: *Rp${await toRupiah(qris.jumlah)}*
- Barang: *Panel Pterodactyl (${Obj.ram == "0" ? "Unlimited" : Obj.ram / 1000 + "GB"})*
- Username: *${Obj.username}*
- Expired QRIS: *5 menit*
`;
    const msgQr = await sock.sendMessage(m.chat, {
      buttons: [
        { buttonId: `.batalbeli`, buttonText: { displayText: "Batalkan Pembelian" }, type: 1 },
      ],
      headerType: 1,
      viewOnce: true,
      image: { url: qris.imageqris },
      caption: teks3,
      contextInfo: { mentionedJid: [m.sender], isForwarded: true },
    });
    dbTransaksi[m.sender] = {
      msg: msgQr,
      chat: m.sender,
      idDeposit: qris.idtransaksi,
      amount: qris.jumlah.toString(),
      status: true,
      exp: setTimeout(async () => {
        if (dbTransaksi[m.sender] && dbTransaksi[m.sender].status) {
          await sock.sendMessage(dbTransaksi[m.sender].chat, { text: "⚠️ QRIS Pembayaran Telah Expired.\nTransaksi Dibatalkan!" }, { quoted: dbTransaksi[m.sender].msg });
          await sock.sendMessage(dbTransaksi[m.sender].chat, { delete: dbTransaksi[m.sender].msg.key });
          delete dbTransaksi[m.sender];
        }
      }, 250000),
    };
    while (dbTransaksi[m.sender] && dbTransaksi[m.sender].status && dbTransaksi[m.sender].amount) {
      await sleep(7000);
      const success = await cekStatus(sock, m.sender, {
        apikey: global.ApikeyRestApi,
        username: global.usernameOrderkuota,
        token: global.tokenOrderkuota,
      });
      if (success) {
        dbTransaksi[m.sender].status = false;
        clearTimeout(dbTransaksi[m.sender].exp);
        await sock.sendMessage(dbTransaksi[m.sender].chat, {
          text: `*PEMBAYARAN BERHASIL ✅*\n\n- ID: *${dbTransaksi[m.sender].idDeposit}*\n- Total: *Rp${await toRupiah(dbTransaksi[m.sender].amount)}*\n- Barang: *Panel Pterodactyl*\n- Username: *${Obj.username}*`,
        }, { quoted: dbTransaksi[m.sender].msg });
        const email = `${Obj.username}@gmail.com`;
        const name = capital(Obj.username) + " Server";
        const password = Obj.username + "001";
        const userReq = await fetch(domain + "/api/application/users", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: "Bearer " + apikey,
          },
          body: JSON.stringify({
            email,
            username: Obj.username.toLowerCase(),
            first_name: name,
            last_name: "Server",
            language: "en",
            password,
          }),
        });
        const userData = await userReq.json();
        if (userData.errors) return reply(JSON.stringify(userData.errors[0], null, 2));
        const usr_id = userData.attributes.id;
        const eggReq = await fetch(domain + `/api/application/nests/${nestid}/eggs/${egg}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: "Bearer " + apikey,
          },
        });
        const eggData = await eggReq.json();
        const startup = eggData.attributes.startup;
        const serverReq = await fetch(domain + "/api/application/servers", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: "Bearer " + apikey,
          },
          body: JSON.stringify({
            name,
            description: tanggal(Date.now()),
            user: usr_id,
            egg: parseInt(egg),
            docker_image: "ghcr.io/parkervcp/yolks:nodejs_20",
            startup,
            environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
            limits: { memory: Obj.ram, swap: 0, disk: Obj.disk, io: 500, cpu: Obj.cpu },
            feature_limits: { databases: 5, backups: 5, allocations: 5 },
            deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] },
          }),
        });
        const serverData = await serverReq.json();
        if (serverData.errors) return reply(JSON.stringify(serverData.errors[0], null, 2));
        const s = serverData.attributes;
        const detail = `
*Berikut detail akun panel kamu*
*📡 Server ID:* ${s.id}
*👤 Username:* ${userData.attributes.username}
*🔐 Password:* ${password}
*🗓️ Aktivasi:* ${global.tanggal(Date.now())}
⚙️ *Spesifikasi*
- RAM: ${Obj.ram == "0" ? "Unlimited" : Obj.ram / 1000 + "GB"}
- DISK: ${Obj.disk == "0" ? "Unlimited" : Obj.disk / 1000 + "GB"}
- CPU: ${Obj.cpu == "0" ? "Unlimited" : Obj.cpu + "%"}
- ${global.domain}
*Syarat & Ketentuan Pembelian*
- Masa aktif 30 hari
- Garansi 15 hari (1x replace)
- Simpan data ini baik-baik
`;
let msg = await generateWAMessageFromContent(dbTransaksi[m.sender].chat, {
    viewOnceMessage: {
        message: {
            interactiveMessage: {
                body: { text: detail },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: `{"display_text":"Copy Username","copy_code":"${userData.attributes.username}"}`
                        },
                        {
                            name: "cta_copy",
                            buttonParamsJson: `{"display_text":"Copy Password","copy_code":"${password}"}`
                        },
                        {
                            name: "cta_url",
                            buttonParamsJson: `{"display_text":"Login Panel","url":"${global.domain}"}`
                        }
                    ]
                }
            }
        }
    }
}, {});
await sock.relayMessage(dbTransaksi[m.sender].chat, msg.message, { messageId: msg.key.id });
        await sock.sendMessage(dbTransaksi[m.sender].chat, { delete: dbTransaksi[m.sender].msg.key });
        delete dbTransaksi[m.sender];
      }
    }
  } catch (err) {
    console.error(err);
    reply("Terjadi kesalahan saat memproses pembayaran.");
  }
}
break;

case "buyadp":
case "buyadminpanel": {
  if (m.isGroup) return reply(mess.private);
  if (dbTransaksi[m.sender]) return reply(`Masih ada transaksi yang belum diselesaikan.\nketik *.batalbeli* untuk membatalkan transaksi sebelumnya`);
  if (!text) return reply(`Masukan username\n*Contoh :* ${cmd} skyzopedia`);
  if (args.length > 1) return reply("Username dilarang menggunakan spasi!");
  const username = text.toLowerCase();
  const Obj = {
    username,
    ram: "0",
    disk: "0",
    cpu: "0",
    harga: global.hargaAdp + global.generateRandomNumber(110, 250),
  };
  try {
    const qris = await createdQris(Obj.harga, {
      apikey: global.ApikeyRestApi,
      username: global.usernameOrderkuota,
      token: global.tokenOrderkuota,
    });
    const teks3 = `
*INFORMASI PEMBAYARAN*
- ID: *${qris.idtransaksi}*
- Total Pembayaran: *Rp${await toRupiah(qris.jumlah)}*
- Barang: *Admin Panel Pterodactyl*
- Username: *${text.toLowerCase()}*
- Expired QRIS: *5 menit*
`;
    const msgQr = await sock.sendMessage(m.chat, {
      buttons: [
        { buttonId: `.batalbeli`, buttonText: { displayText: "Batalkan Pembelian" }, type: 1 },
      ],
      headerType: 1,
      viewOnce: true,
      image: { url: qris.imageqris },
      caption: teks3,
      contextInfo: { mentionedJid: [m.sender], isForwarded: true },
    });
    dbTransaksi[m.sender] = {
      msg: msgQr,
      chat: m.sender,
      idDeposit: qris.idtransaksi,
      amount: qris.jumlah.toString(),
      status: true,
      exp: setTimeout(async () => {
        if (dbTransaksi[m.sender] && dbTransaksi[m.sender].status) {
          await sock.sendMessage(dbTransaksi[m.sender].chat, { text: "⚠️ QRIS Pembayaran Telah Expired.\nTransaksi Dibatalkan!" }, { quoted: dbTransaksi[m.sender].msg });
          await sock.sendMessage(dbTransaksi[m.sender].chat, { delete: dbTransaksi[m.sender].msg.key });
          delete dbTransaksi[m.sender];
        }
      }, 250000),
    };
    while (dbTransaksi[m.sender] && dbTransaksi[m.sender].status && dbTransaksi[m.sender].amount) {
      await sleep(7000);
      const success = await cekStatus(sock, m.sender, {
        apikey: global.ApikeyRestApi,
        username: global.usernameOrderkuota,
        token: global.tokenOrderkuota,
      });
      if (success) {
        dbTransaksi[m.sender].status = false;
        clearTimeout(dbTransaksi[m.sender].exp);
        await sock.sendMessage(dbTransaksi[m.sender].chat, {
          text: `*PEMBAYARAN BERHASIL ✅*\n\n- ID: *${dbTransaksi[m.sender].idDeposit}*\n- Total: *Rp${await toRupiah(dbTransaksi[m.sender].amount)}*\n- Barang: *Admin Panel Pterodactyl*\n- Username: *${Obj.username}*`,
        }, { quoted: dbTransaksi[m.sender].msg });
        let email = `${Obj.username}@gmail.com`;
        let name = capital(Obj.username) + " AdminPanel";
        let password = Obj.username + "001";
        let f = await fetch(domain + "/api/application/users", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: "Bearer " + apikey,
          },
          body: JSON.stringify({
            email,
            username: Obj.username.toLowerCase(),
            first_name: name,
            last_name: "Adp",
            language: "en",
            password,
          }),
        });
        let data = await f.json();
        if (data.errors) return Reply(JSON.stringify(data.errors[0], null, 2));
        let user = data.attributes;
        let desc = tanggal(Date.now());
        let usr_id = user.id;
        let f1 = await fetch(domain + `/api/application/nests/${nestid}/eggs/${egg}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: "Bearer " + apikey,
          },
        });
        let data2 = await f1.json();
        let startup_cmd = data2.attributes.startup;
        let f2 = await fetch(domain + "/api/application/servers", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: "Bearer " + apikey,
          },
          body: JSON.stringify({
            name,
            description: desc,
            user: usr_id,
            egg: parseInt(egg),
            docker_image: "ghcr.io/parkervcp/yolks:nodejs_20",
            startup: startup_cmd,
            environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
            limits: { memory: Obj.ram, swap: 0, disk: Obj.disk, io: 500, cpu: Obj.cpu },
            feature_limits: { databases: 10, backups: 10, allocations: 10 },
            deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] },
          }),
        });
        let result = await f2.json();
        if (result.errors) return Reply(JSON.stringify(result.errors[0], null, 2));
        let server = result.attributes;
        const tekspanel = `
*Berikut detail akun Admin Panel kamu*
*📡 Server ID:* ${server.id}
*👤 Username:* ${user.username}
*🔐 Password:* ${password}
*🗓️ Tanggal Aktivasi:* ${global.tanggal(Date.now())}
⚙️ *Spesifikasi*
- RAM: Unlimited
- DISK: Unlimited
- CPU: Unlimited
- ${global.domain}
*Syarat & Ketentuan Pembelian*
- Masa aktif 30 hari
- Garansi 15 hari (1x replace)
- Simpan data ini baik-baik
`;
let msg = await generateWAMessageFromContent(dbTransaksi[m.sender].chat, {
    viewOnceMessage: {
        message: {
            interactiveMessage: {
                body: { text: tekspanel },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: `{"display_text":"Copy Username","copy_code":"${user.username}"}`
                        },
                        {
                            name: "cta_copy",
                            buttonParamsJson: `{"display_text":"Copy Password","copy_code":"${password}"}`
                        },
                        {
                            name: "cta_url",
                            buttonParamsJson: `{"display_text":"Login Panel","url":"${global.domain}"}`
                        }
                    ]
                }
            }
        }
    }
}, {});
await sock.relayMessage(dbTransaksi[m.sender].chat, msg.message, { messageId: msg.key.id });
        await sock.sendMessage(dbTransaksi[m.sender].chat, { delete: dbTransaksi[m.sender].msg.key });
        delete dbTransaksi[m.sender];
      }
    }
  } catch (err) {
    console.error("Terjadi kesalahan (buyadminpanel):", err);
    reply("Terjadi kesalahan saat memproses pembayaran.");
  }
}
break;