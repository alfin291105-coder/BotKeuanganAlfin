export async function kirimPesan(token, chatId, text) {

  const res = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text
      })
    }
  );

  const data = await res.json();

  console.log("TELEGRAM RESPONSE:", data);

  return data;

}

export async function getFile(token, fileId) {

  const res = await fetch(
    `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`
  );

  const data = await res.json();

  if (!data.ok) {
    throw new Error("Gagal mendapatkan file Telegram");
  }

  return data.result;

}