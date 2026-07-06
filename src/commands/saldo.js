import {
  kirimPesan
} from "../telegram.js";

import {
  getValue
} from "../google.js";

export async function handleSaldo(text, chatId, env) {

  if (text !== "/ceksaldo") {
    return false;
  }

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