export async function scanAzureVision(imageUrl, env) {

  const endpoint =
    `${env.AZURE_VISION_ENDPOINT}computervision/imageanalysis:analyze?api-version=2024-02-01&features=read`;

  console.log("OCR Endpoint:", endpoint);

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

console.log("Status:", res.status);

const text = await res.text();
console.log("Raw Azure:", text);

const data = JSON.parse(text);

console.log("AZURE RESPONSE:", JSON.stringify(data, null, 2));

const lines =
  data.readResult?.blocks?.flatMap(
    block => block.lines.map(line => line.text)
  ) || [];

console.log("OCR LINES:", JSON.stringify(lines, null, 2));

return lines;

}

function detectReceiptType(lines) {

  const text = lines.join(" ").toUpperCase();

  if (text.includes("PERTAMINA") || text.includes("SPBU")) {
    return "PERTAMINA";
  }

  if (text.includes("ALFAMART")) {
    return "ALFAMART";
  }

  if (text.includes("INDOMARET")) {
    return "INDOMARET";
  }

  return "UNKNOWN";

}

function parsePertamina(lines) {

  const data = {
    jenis: "Pengeluaran",
    toko: "PERTAMINA",
    tanggal: "",
    jam: "",
    total: 0,
    metode: "",
    keterangan: ""
  };

  for (const line of lines) {

    if (line.startsWith("Waktu:")) {

      const m = line.match(
        /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}:\d{2})/
      );

      if (m) {
        data.tanggal = m[1];
        data.jam = m[2];
      }

    }

    if (line.startsWith("Nama Produk:")) {
      data.keterangan =
        line.replace("Nama Produk:", "").trim();
    }

    if (line.startsWith("Total Harga")) {

      const m = line.match(/([\d,.]+)$/);

      if (m) {
        data.total = Number(
          m[1]
            .replace(/\./g, "")
            .replace(/,/g, "")
        );
      }

    }

    if (
      line === "CASH" ||
      line.includes("QRIS") ||
      line.includes("DEBIT")
    ) {
      data.metode = line;
    }

  }

  return data;

}


function parseAlfamart(lines) {

  const data = {
    jenis: "Pengeluaran",
    toko: "",
    tanggal: "",
    jam: "",
    total: 0,
    metode: "",
    keterangan: ""
  };

  // Nama toko
  const toko = lines.find(
    x => x.toUpperCase().includes("ALFAMART")
  );

  if (toko) {
    data.toko = toko;
  }

  // Barang
  const skip = [
    "ALFAMART",
    "ALFA TOWER",
    "QRIS",
    "TOTAL",
    "TGL.",
    "KASIR",
    "BON",
    "MEMBER",
    "VOUCHER",
    "A-POIN",
    "PPN",
    "DPP",
    "KEMBALIAN"
  ];

  for (let i = 0; i < lines.length - 3; i++) {

    if (
      skip.some(x =>
        lines[i].toUpperCase().includes(x)
      )
    ) continue;

    if (
      /^\d+$/.test(lines[i + 1]) &&
      /^[\d,.]+$/.test(lines[i + 2]) &&
      /^[\d,.]+$/.test(lines[i + 3])
    ) {

      data.keterangan = lines[i];
      break;

    }

  }

  // QRIS
  const index =
    lines.findIndex(
      x => x.toUpperCase().includes("QRIS")
    );

  if (index !== -1 && lines[index + 1]) {

    data.metode = lines[index];

    data.total = Number(
      lines[index + 1]
        .replace(/\./g, "")
        .replace(/,/g, "")
    );

  }

  // Tanggal
  const tgl =
    lines.find(
      x => x.startsWith("Tgl.")
    );

  if (tgl) {

    const m =
      tgl.match(
        /(\d{2}-\d{2}-\d{4})\s+(\d{2}:\d{2}:\d{2})/
      );

    if (m) {

      data.tanggal = m[1];
      data.jam = m[2];

    }

  }

  return data;

}


export function parseStruk(lines) {

  const tipe = detectReceiptType(lines);

  switch (tipe) {

    case "PERTAMINA":
      return parsePertamina(lines);

    case "ALFAMART":
      return parseAlfamart(lines);

    default:
      return {
        jenis: "Pengeluaran",
        toko: "",
        tanggal: "",
        jam: "",
        total: 0,
        metode: "",
        keterangan: ""
      };

  }

}
