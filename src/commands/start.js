import {
  kirimPesan
} from "../telegram.js";

export async function handleStart(text, chatId, env) {

  if (text !== "/start") {
    return false;
  }

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