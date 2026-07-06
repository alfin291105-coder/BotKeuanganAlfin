import {
  kirimPesan
} from "./telegram.js";

import {
  getValue,
  getTransactions
} from "./google.js";

import {
  formatTanggal,
  scanTransaksi
} from "./utils.js";

export async function handleCommand(text, chatId, env) {

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
/laporantahunan
/hapus Laporan`
    );

    return true;
  }

// ==========================
// /ceksaldo
// ==========================

  if (text === "/ceksaldo") {

    try {

      const data =
        await getValue(
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
        "❌ " + err.message
      );

    }

    return true;

  }

  return false;

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

  return true;

}

// ==========================
// /laporanbulanan
// ==========================