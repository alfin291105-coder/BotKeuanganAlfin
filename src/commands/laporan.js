import {
  kirimPesan
} from "../telegram.js";

import {
  getTransactions
} from "../google.js";

import {
  formatTanggal,
  formatBulanTahun,
  scanTransaksi
} from "../utils.js";

export async function handleLaporan(
  text,
  chatId,
  env
) {

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

  return false;

}