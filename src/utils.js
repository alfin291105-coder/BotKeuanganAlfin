export function formatJam() {
  return new Date().toLocaleTimeString("id-ID", {
    hour12: false,
    timeZone: "Asia/Jakarta"
  });
}

export function formatTanggal() {
  const sekarang = new Date();

  return sekarang
    .toLocaleDateString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
    .replace(/\//g, "-");
}

export function formatBulanTahun() {
  const sekarang = new Date();

  return {
    bulan: String(sekarang.getMonth() + 1).padStart(2, "0"),
    tahun: String(sekarang.getFullYear())
  };
}

export function scanTransaksi(data, callback) {
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