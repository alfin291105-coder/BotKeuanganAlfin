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

  if (
    text.includes("WONDR") ||
    text.includes("TRANSFER BERHASIL") ||
    text.includes("REF ID")) {
    return "WONDR";
  }

  if (
  text.includes("TARIK TUNAI") ||
  text.includes("ATMI") ||
  text.includes("ATMI")
) {
  return "ATM";
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

function parseWondr(lines) {

  const data = {
    jenis: "Pemasukan",
    toko: "BNI WONDR",
    tanggal: "",
    jam: "",
    total: 0,
    metode: "Transfer Bank",
    keterangan: ""
  };

  for (const line of lines) {

    // Nominal
    if (line.includes("Rp")) {

      const m = line.match(/Rp([\d.]+)/);

      if (m && data.total === 0) {
        data.total = Number(
          m[1].replace(/\./g, "")
        );
      }

    }

    // tanggal
    if (line.includes("Jul") && line.includes("WIB")) {

      const m = line.match(
        /(\d{2})\s(\w+)\s(\d{4}).*(\d{2}:\d{2}:\d{2})/
      );

      if (m) {

        const bulan = {
          Jan:"01",
          Feb:"02",
          Mar:"03",
          Apr:"04",
          Mei:"05",
          Jun:"06",
          Jul:"07",
          Agu:"08",
          Sep:"09",
          Okt:"10",
          Nov:"11",
          Des:"12"
        };

        data.tanggal =
          `${m[1]}/${bulan[m[2]]}/${m[3]}`;

        data.jam = m[4];

      }

    }

    // Sumber dana
const idx = lines.findIndex(
  x => x.toUpperCase().includes("SUMBER DANA")
);

if (idx !== -1) {

  for (let i = idx + 1; i < lines.length; i++) {

    const nama = lines[i].trim();

    // Lewati baris yang bukan nama
    if (
      nama === "" ||
      nama.includes("BNI") ||
      nama.includes("*") ||
      nama.includes("DETAIL") ||
      nama.includes("NOMINAL")
    ) {
      continue;
    }

    data.keterangan = "Transfer dari " + nama;
    break;
  }

}

  }

  return data;

}

function parseATM(lines) {

  const data = {
    jenis: "Pengeluaran",
    toko: "ATM BNI",
    tanggal: "",
    jam: "",
    total: 0,
    metode: "Tarik Tunai",
    keterangan: "Tarik Tunai ATM"
  };

  for (let i = 0; i < lines.length; i++) {

    // tanggal
    if (/^\d{2}\/\d{2}\/\d{2}$/.test(lines[i])) {
      data.tanggal = lines[i];
    }

    // jam
    if (/^\d{2}:\d{2}$/.test(lines[i])) {
      data.jam = lines[i];
    }

    // nominal
    if (
      lines[i].toUpperCase() === "JUMLAH" &&
      lines[i + 1]
    ) {

      const m = lines[i + 1].match(/RP\s*([\d.]+)/i);

      if (m) {
        data.total = Number(
          m[1].replace(/\./g, "")
        );
      }

    }

    // lokasi ATM
    if (
      lines[i].includes("IDM") ||
      lines[i].includes("ATM")
    ) {
      data.toko = lines[i];
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
  console.log("RECEIPT TYPE:", tipe);

  switch (tipe) {

    case "PERTAMINA":
      return parsePertamina(lines);

    case "ALFAMART":
      return parseAlfamart(lines);

    case "WONDR":
      return parseWondr(lines);

    case "ATM":
      return parseATM(lines);

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
