import {
  handleCommand
} from "./commandHandler.js";

import {
  scanAzureVision,
  parseStruk
} from "./ocr.js";

import {
  kirimPesan,
  getFile
} from "./telegram.js";

import {
  appendRow,
  getValue,
  getColumn,
  getTransactions,
  deleteRow
} from "./google.js";

import {
  formatJam,
  formatTanggal,
  formatBulanTahun,
  scanTransaksi
} from "./utils.js";

async function generateKode(env, jenis) {

  const tanggal = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const prefix = jenis === "Pemasukan"
    ? "IN"
    : "OUT";

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  const daftarKode =
    await getColumn(env, "'Data Transaksi'!G:G");

  while (true) {

    let random = "";

    for (let i = 0; i < 4; i++) {

      random += chars[
        Math.floor(Math.random() * chars.length)
      ];

    }

    const kode =
      `ALF-${prefix}-${tanggal}-${random}`;

    if (!daftarKode.includes(kode)) {
      return kode;
    }

  }

}

export default {
  async fetch(request, env) {

  if (request.method !== "POST") {
    return new Response("Bot Telegram Cloudflare Aktif ✅");
  }

  let update = {};

  try {
    update = await request.json();
  } catch (e) {
    return new Response("OK - no JSON");
  }

  if (!update.message) {
    return new Response("OK");
  }

  const chatId = Number(update.message.chat.id);
  const text = update.message.text || "";

  console.log("UPDATE:", JSON.stringify(update));
  console.log("CHAT_ID:", chatId);
  console.log("TEXT:", text);

    // Hanya pemilik
    if (chatId !== 8081656707) {
      await kirimPesan(
        env.BOT_TOKEN,
        chatId,
        "❌ Bot ini khusus untuk pemilik. Silahkan hubungi pemilik @Alfin291100 agar segera bisa di gunakan publik"
      );
      return new Response("OK");
    }

if (await handleCommand(text, chatId, env)) {
  return new Response("OK");
}

// ==========================
// /hapus
// ==========================

if (text.startsWith("/hapus")) {

  const bagian = text.trim().split(" ");

  if (bagian.length !== 2) {

    await kirimPesan(
      env.BOT_TOKEN,
      chatId,
`Gunakan format:

/hapus KODE_TRANSAKSI

Contoh:
/hapus ALF-OUT-20260705-ABCD`
    );

    return new Response("OK");

  }

  const kode = bagian[1].trim();

  try {

    const data = await getTransactions(env);

    let rowIndex = -1;

    for (let i = 1; i < data.length; i++) {

      if (data[i][6] === kode) {

        rowIndex = i;

        break;

      }

    }

    if (rowIndex === -1) {

      await kirimPesan(
        env.BOT_TOKEN,
        chatId,
        "❌ Kode transaksi tidak ditemukan."
      );

      return new Response("OK");

    }

    await deleteRow(env, rowIndex);

    await kirimPesan(
      env.BOT_TOKEN,
      chatId,
      `✅ Transaksi ${kode} berhasil dihapus.`
    );

  } catch (err) {

    await kirimPesan(
      env.BOT_TOKEN,
      chatId,
      "❌ " + err.message
    );

  }

  return new Response("OK");

}

// ==========================
// Scan transaksi
// ==========================

if (update.message.photo) {

  try {

    const photo =
      update.message.photo[
        update.message.photo.length - 1
      ];

    const file = await getFile(
      env.BOT_TOKEN,
      photo.file_id
    );

    const imageUrl =
      `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.file_path}`;

    console.log("URL Gambar:", imageUrl);

    const lines = await scanAzureVision(
      imageUrl,
      env
    );

    const data = parseStruk(lines);

    // Nama toko
const toko = lines.find(
  x => x.includes("ALFAMART")
);

if (toko) {
  data.toko = toko.split("/")[0].trim();
}

    const kode = await generateKode(
  env,
  data.jenis
);

const nilai =
  data.jenis === "Pemasukan"
    ? data.total
    : -data.total;

await appendRow(env, [

  data.tanggal,
  data.jam,
  data.toko,
  data.jenis,
  nilai,
  data.keterangan,
  kode

]);

    await kirimPesan(
  env.BOT_TOKEN,
  chatId,
`🏪 ${data.toko}

💰 Rp${data.total.toLocaleString("id-ID")}

📅 ${data.tanggal}

🕒 ${data.jam}

💳 ${data.metode}

📝 ${data.keterangan}`
);

  } catch (err) {

    console.error(err);

    await kirimPesan(
      env.BOT_TOKEN,
      chatId,
      "❌ " + err.message
    );

  }

  return new Response("OK");

}

    // ==========================
    // Format transaksi
    // ==========================

    const regex = /^\((masuk|keluar)\)\s*\((\d+)\)\s*\(([^)]+)\)\s*\(([^)]+)\)$/i;

    const cocok = text.match(regex);

    if (cocok) {

      const jenis =
        cocok[1].toLowerCase() === "masuk"
          ? "Pemasukan"
          : "Pengeluaran";

      const nominal = Number(cocok[2]);

      const sumber = cocok[3];

      const keterangan = cocok[4];

      const tanggal = formatTanggal();
const jam = formatJam();

const kode = await generateKode(env, jenis);

const nilai = jenis === "Pemasukan"
    ? nominal
    : -nominal;

try {

  const hasil = await appendRow(env, [

    tanggal,
    jam,
    sumber,
    jenis,
    nilai,
    keterangan,
    kode

  ]);

  console.log(hasil);

  await kirimPesan(
  env.BOT_TOKEN,
  chatId,
`✅ Transaksi berhasil disimpan

🆔 Kode : ${kode}
📂 Kategori : ${jenis}
💰 Nominal : Rp${nominal.toLocaleString("id-ID")}
🏪 Toko/Sumber : ${sumber}
📝 Keterangan : ${keterangan}`
);

} catch (err) {

  console.error(err);

  await kirimPesan(
    env.BOT_TOKEN,
    chatId,
    "❌ Gagal menyimpan ke Google Sheets.\n\n" + err.message
  );

}

      return new Response("OK");
    }

    return new Response("OK");

  }
};



