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
          pemasukan += Number(trx.nominal);
        } else {
          pengeluaran += Number(Math.abs(trx.nominal));
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
// /laporanmingguan
// ==========================

if (text === "/laporanmingguan") {

  try {

    const data = await getTransactions(env);

    const sekarang = new Date();

    // awal minggu (Senin)
    const awal = new Date(sekarang);
    const hari = awal.getDay();
    const selisih = hari === 0 ? 6 : hari - 1;
    awal.setDate(awal.getDate() - selisih);

    awal.setHours(0, 0, 0, 0);

    const akhir = new Date(awal);
    akhir.setDate(akhir.getDate() + 6);
    akhir.setHours(23, 59, 59, 999);

    let pesan =
`📅 LAPORAN MINGGUAN

    Periode :
    ${awal.toLocaleDateString("id-ID")} - ${akhir.toLocaleDateString("id-ID")}

    ────────────────

`;

    let pemasukan = 0;
    let pengeluaran = 0;
    let jumlah = 0;

    scanTransaksi(data, (trx) => {

        const tgl = new Date(trx.tanggal);

      if (tgl < awal || tgl > akhir) return;

      jumlah++;

      if (trx.jenis === "Pemasukan") {
        pemasukan += Number(trx.nominal);
      } else {
        pengeluaran += Number(Math.abs(trx.nominal));
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

      pesan += "Belum ada transaksi minggu ini.";

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

if (text === "/laporanbulanan") {

  try {

    const data = await getTransactions(env);

    const bulanTrx = tgl.getMonth() + 1;
const tahunTrx = tgl.getFullYear();

if (bulanTrx !== Number(bulan) || tahunTrx !== Number(tahun)) return;

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

    scanTransaksi(data, (trx) => {

        const tgl = new Date(trx.tanggal);

        const bulanTrx = String(tgl.getMonth() + 1).padStart(2, "0");
        const tahunTrx = String(tgl.getFullYear());

        if (bulanTrx !== bulan || tahunTrx !== tahun) {
     return;
    }

      jumlah++;

      if (trx.jenis === "Pemasukan") {
        pemasukan += Number(trx.nominal);
      } else {
        pengeluaran += Number(Math.abs(trx.nominal));
      }

      const transaksi =
`${trx.jenis === "Pemasukan" ? "🟢" : "🔴"} ${trx.kode}

🏪 ${trx.sumber}
📝 ${trx.keterangan}
💰 Rp${Math.abs(trx.nominal).toLocaleString("id-ID")}

────────────────

`;

      if (pesan.length + transaksi.length >= MAX) {

          kirimPesan(
          env.BOT_TOKEN,
          chatId,
          pesan
        );

        pesan = "";

      }

      pesan += transaksi;

    });

    if (jumlah === 0) {

      pesan +=
        "Belum ada transaksi pada bulan ini.";

    } else {

      pesan +=
`📊 RINGKASAN

────────────────

🟢 Pemasukan : Rp${pemasukan.toLocaleString("id-ID")}
🔴 Pengeluaran : Rp${pengeluaran.toLocaleString("id-ID")}
💰 Saldo : Rp${(pemasukan-pengeluaran).toLocaleString("id-ID")}

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
// /laporantahunan
// ==========================

if (text === "/laporantahunan") {

  try {

    const data = await getTransactions(env);

    const tahun = new Date().getFullYear();

    const MAX = 3500;

    let header =
`📅 LAPORAN TAHUNAN

Periode : ${tahun}

────────────────

`;

    let pesan = header;

    let pemasukan = 0;
    let pengeluaran = 0;
    let jumlah = 0;

    scanTransaksi(data, (trx) => {

        const tgl = new Date(trx.tanggal);

        if (tgl.getFullYear() !== tahun) {
    return;
}

      jumlah++;

      if (trx.jenis === "Pemasukan") {
        pemasukan += Number(trx.nominal);
      } else {
        pengeluaran += Number(Math.abs(trx.nominal));
      }

      const transaksi =
`${trx.jenis === "Pemasukan" ? "🟢" : "🔴"} ${trx.kode}

🏪 ${trx.sumber}
📝 ${trx.keterangan}
💰 Rp${Math.abs(trx.nominal).toLocaleString("id-ID")}

────────────────

`;

      if (pesan.length + transaksi.length >= MAX) {

          kirimPesan(
          env.BOT_TOKEN,
          chatId,
          pesan
        );

        pesan = "";

      }

      pesan += transaksi;

    });

    if (jumlah === 0) {

      pesan +=
        "Belum ada transaksi pada tahun ini.";

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