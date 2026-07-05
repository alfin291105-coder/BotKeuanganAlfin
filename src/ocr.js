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
