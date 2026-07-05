import {
  appendRow,
  getValue,
  getColumn,
  getTransactions,
  deleteRow
} from "./google.js";

  function formatJam() {
  return new Date().toLocaleTimeString("id-ID", {
    hour12: false,
    timeZone: "Asia/Jakarta"
  });
}

function formatTanggal() {

  const sekarang = new Date();

  return sekarang.toLocaleDateString("id-ID",{
    timeZone:"Asia/Jakarta",
    day:"2-digit",
    month:"2-digit",
    year:"numeric"
  }).replace(/\//g,"-");

}

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

function formatBulanTahun() {

  const sekarang = new Date();

  return {
    bulan: String(sekarang.getMonth() + 1).padStart(2, "0"),
    tahun: String(sekarang.getFullYear())
  };

}

function scanTransaksi(data, callback) {

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    if (!row || row.length < 7) continue;

    const tanggal = String(row[0] || "");

    if (!tanggal.includes("-")) continue;

    const pecah = tanggal.split("-");

    if (pecah.length !== 3) continue;

    callback({

      tanggal,
      hari: pecah[0],
      bulan: pecah[1],
      tahun: pecah[2],

      waktu: row[1],
      sumber: row[2],
      jenis: row[3],

      nominal:
        Number(
          String(row[4]).replace(/[^\d-]/g, "")
        ) || 0,

      keterangan: row[5],
      kode: row[6]

    });

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

    // ==========================
    // /start
    // ==========================
    if (text === "/start") {

      await kirimPesan(
        env.BOT_TOKEN,
        chatId,
`🤖 Bot Catatan Keuangan Alfin

📝 CARA PENULISAN

✅ Pemasukan
(masuk) (100000) (Gaji) (Bonus)

❌ Pengeluaran
(keluar) (25000) (Toko) (Makan&Minum)

📊 PERINTAH

/ceksaldo
/laporanharian
/laporanbulanan
/laporantahunan`
      );

      return new Response("OK");
    }

    // ==========================
    // /ceksaldo
    // ==========================


    if (text === "/ceksaldo") {

  try {

    const data = await getValue(
      env,
      "'Data Transaksi'!H2"
    );

    const saldo =
      data[0]?.[0] || "Rp0";

    await kirimPesan(
      env.BOT_TOKEN,
      chatId,
`💰 SALDO SAAT INI

${saldo}

🏦 BANK BNI
1811280080`
    );

  } catch (err) {

    await kirimPesan(
      env.BOT_TOKEN,
      chatId,
      "❌ Gagal membaca saldo.\n\n" + err.message
    );

  }

  return new Response("OK");
}

// ==========================
// /laporanharian
// ==========================

if (text === "/laporanharian") {

  try {

    const data = await getTransactions(env);
    const hariIni = formatTanggal();

    let pesan =
`📅 LAPORAN HARIAN

Tanggal : ${hariIni}

`;

    let pemasukan = 0;
    let pengeluaran = 0;
    let jumlah = 0;

    scanTransaksi(data, (trx) => {

  if (trx.tanggal !== hariIni) return;

  jumlah++;

  if (trx.jenis === "Pemasukan") {
    pemasukan += trx.nominal;
  } else {
    pengeluaran += Math.abs(trx.nominal);
  }

  pesan +=
`${trx.jenis === "Pemasukan" ? "🟢" : "🔴"} ${trx.kode}

🏪 ${trx.sumber}
📝 ${trx.keterangan}
💰 Rp${Math.abs(trx.nominal).toLocaleString("id-ID")}

────────────────

`;

});
    if (jumlah === 0) {

      pesan += "Belum ada transaksi hari ini.";

    } else {

      pesan +=
`📊 RINGKASAN

🟢 Pemasukan : Rp${pemasukan.toLocaleString("id-ID")}
🔴 Pengeluaran : Rp${pengeluaran.toLocaleString("id-ID")}
💰 Saldo : Rp${(pemasukan - pengeluaran).toLocaleString("id-ID")}

📄 Total Transaksi : ${jumlah}`;

    }

    await kirimPesan(
      env.BOT_TOKEN,
      chatId,
      pesan
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
// /laporanbulanan
// ==========================

if (text === "/laporanbulanan") {

  try {

    const data = await getTransactions(env);

    const { bulan, tahun } = formatBulanTahun();

    const MAX = 3500;

    let header =
`📅 LAPORAN BULANAN

Periode : ${bulan}-${tahun}

────────────────

`;

    let pesan = header;

    let pemasukan = 0;
    let pengeluaran = 0;
    let jumlah = 0;

    for (let i = 1; i < data.length; i++) {

      const row = data[i];

      if (!row || row.length < 7) continue;

      const tanggal = String(row[0] || "");

      if (!tanggal.includes("-")) continue;

      const pecah = tanggal.split("-");

      if (pecah.length !== 3) continue;

      if (pecah[1] !== bulan || pecah[2] !== tahun) continue;

      const sumber = row[2];
      const jenis = row[3];
      const ket = row[5];
      const kode = row[6];

      const nominal = Number(
        String(row[4]).replace(/[^\d-]/g, "")
      ) || 0;

      if (jenis === "Pemasukan") {
        pemasukan += nominal;
      } else {
        pengeluaran += Math.abs(nominal);
      }

      jumlah++;

      const transaksi =
`${jenis === "Pemasukan" ? "🟢" : "🔴"} ${kode}

🏪 ${sumber}
📝 ${ket}
💰 Rp${Math.abs(nominal).toLocaleString("id-ID")}

────────────────

`;

      // Kirim pesan jika transaksi berikutnya membuat pesan terlalu panjang
      if (pesan.length + transaksi.length >= MAX) {

        await kirimPesan(
          env.BOT_TOKEN,
          chatId,
          pesan
        );

        // pesan berikutnya dimulai TANPA header
        pesan = "";

      }

      pesan += transaksi;

    }

    if (jumlah === 0) {

      pesan += "Belum ada transaksi pada bulan ini.";

    } else {

      pesan +=
`📊 RINGKASAN

────────────────

🟢 Pemasukan   : Rp${pemasukan.toLocaleString("id-ID")}
🔴 Pengeluaran : Rp${pengeluaran.toLocaleString("id-ID")}
💰 Saldo       : Rp${(pemasukan - pengeluaran).toLocaleString("id-ID")}

📄 Total Transaksi : ${jumlah}`;

    }

    await kirimPesan(
      env.BOT_TOKEN,
      chatId,
      pesan
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
// /laporantahunan
// ==========================

if (text === "/laporantahunan") {

  try {

    const data = await getTransactions(env);

    const tahun = String(new Date().getFullYear());

    let pesan =
`📅 LAPORAN TAHUNAN

Periode : ${tahun}

`;

    let pemasukan = 0;
    let pengeluaran = 0;
    let jumlah = 0;

    for (let i = 1; i < data.length; i++) {

      const row = data[i];

      if (!row || row.length < 7) continue;

      const tanggal = String(row[0] || "");

      if (!tanggal.includes("-")) continue;

      const pecah = tanggal.split("-");

      if (pecah.length !== 3) continue;

      // hanya cek tahun
      if (pecah[2] !== tahun) continue;

      const sumber = row[2];
      const jenis = row[3];
      const ket = row[5];
      const kode = row[6];

      const nominal = Number(
        String(row[4]).replace(/[^\d-]/g, "")
      ) || 0;

      if (jenis === "Pemasukan") {
        pemasukan += nominal;
      } else {
        pengeluaran += Math.abs(nominal);
      }

      jumlah++;

      const transaksi =
`${jenis === "Pemasukan" ? "🟢" : "🔴"} ${kode}

🏪 ${sumber}
📝 ${ket}
💰 Rp${Math.abs(nominal).toLocaleString("id-ID")}

────────────────

`;

      // Hindari batas karakter Telegram
      if ((pesan + transaksi).length > 3500) {

        await kirimPesan(
          env.BOT_TOKEN,
          chatId,
          pesan
        );

        pesan = "";

      }

      pesan += transaksi;

    }

    if (jumlah === 0) {

      pesan += "Belum ada transaksi pada tahun ini.";

    } else {

      pesan +=
`📊 RINGKASAN

────────────────

🟢 Pemasukan : Rp${pemasukan.toLocaleString("id-ID")}
🔴 Pengeluaran : Rp${pengeluaran.toLocaleString("id-ID")}
💰 Saldo : Rp${(pemasukan - pengeluaran).toLocaleString("id-ID")}

📄 Total Transaksi : ${jumlah}`;

    }

    await kirimPesan(
      env.BOT_TOKEN,
      chatId,
      pesan
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

async function kirimPesan(token, chatId, text) {

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  });

  const data = await res.json();
  console.log("TELEGRAM RESPONSE:", data);
}

async function getFile(token, fileId) {

  const res = await fetch(
    `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`
  );

  const data = await res.json();

  if (!data.ok) {
    throw new Error("Gagal mendapatkan file Telegram");
  }

  return data.result;

}

async function scanAzureVision(imageUrl, env) {

  const endpoint =
    `${env.AZURE_VISION_ENDPOINT}computervision/imageanalysis:analyze?api-version=2024-02-01&features=read`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": env.AZURE_VISION_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: imageUrl
    })
  });

  const data = await res.json();

  const lines =
    data.readResult?.blocks?.flatMap(
      block => block.lines.map(line => line.text)
    ) || [];

  return lines;

}

function parseStruk(lines) {

  const data = {
  jenis: "Pengeluaran",
  toko: "",
  tanggal: "",
  jam: "",
  total: 0,
  metode: "",
  keterangan: ""
};

 for (const line of lines) {

  // Lewati informasi toko
  if (
    line.includes("ALFAMART") ||
    line.includes("Alfamart") ||
    line.includes("Kasir") ||
    line.includes("Bon") ||
    line.includes("QRIS") ||
    line.includes("Total") ||
    line.includes("Tgl.") ||
    line.includes("MEMBER") ||
    line.includes("Voucher") ||
    line.includes("A-POIN")
  ) {
    continue;
  }

  const skip = [
  "ALFAMART",
  "Alfamart",
  "ALFA TOWER",
  "KP.",
  "NPWP",
  "Kasir",
  "Bon",
  "QRIS",
  "Total",
  "Tgl.",
  "MEMBER",
  "Voucher",
  "A-POIN",
  "PPN",
  "DPP",
  "Kembalian"
];

for (let i = 0; i < lines.length; i++) {

  const line = lines[i];

  if (skip.some(x => line.includes(x))) {
    continue;
  }

  // nama barang biasanya diikuti jumlah lalu harga
  if (
    i + 3 < lines.length &&
    /^\d+$/.test(lines[i + 1]) &&
    /^[\d,.]+$/.test(lines[i + 2]) &&
    /^[\d,.]+$/.test(lines[i + 3])
  ) {

    data.keterangan = line;
    break;

  }

}

}

  // Cari QRIS
  const index = lines.findIndex(
    x => x.includes("QRIS")
  );

  if (index !== -1) {

    data.metode = lines[index];

    data.total = Number(
      lines[index + 1]
        .replace(/\./g, "")
        .replace(/,/g, "")
    );

  }

  // Cari tanggal
  const tgl = lines.find(
    x => x.startsWith("Tgl.")
  );

  if (tgl) {

    const cocok = tgl.match(
      /(\d{2}-\d{2}-\d{4})\s+(\d{2}:\d{2}:\d{2})/
    );

    if (cocok) {

      data.tanggal = cocok[1];
      data.jam = cocok[2];

    }

  }

  return data;

}

