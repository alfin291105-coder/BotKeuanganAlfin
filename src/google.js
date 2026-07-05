import { SignJWT, importPKCS8 } from "jose";

const SCOPES = "https://www.googleapis.com/auth/spreadsheets";

const SPREADSHEET_ID =
  "1-pjFmtnzCALeqFPQUvEGa3E5RapIeQ1H3aQNHHO-PvI";

const SHEET_ID = 0;

export async function getAccessToken(env) {
  const creds = JSON.parse(env.GOOGLE_CREDENTIALS);

  const now = Math.floor(Date.now() / 1000);

  const privateKey = await importPKCS8(
    creds.private_key,
    "RS256"
  );

  const jwt = await new SignJWT({
    scope: SCOPES
  })
    .setProtectedHeader({
      alg: "RS256",
      typ: "JWT"
    })
    .setIssuer(creds.client_email)
    .setSubject(creds.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const body = new URLSearchParams();

  body.set(
    "grant_type",
    "urn:ietf:params:oauth:grant-type:jwt-bearer"
  );

  body.set("assertion", jwt);

  const res = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      body
    }
  );

  const data = await res.json();

  if (!data.access_token) {
    throw new Error(JSON.stringify(data));
  }

  return data.access_token;
}

export async function appendRow(env, values) {

  const token = await getAccessToken(env);

  const range = encodeURIComponent("'Data Transaksi'!A:G");

  const url =
`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      values: [values]
    })
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data;
}

export async function getValue(env, range) {

  const token = await getAccessToken(env);

    const url = 
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data.values || [];
}

export async function getColumn(env, range) {

  const values = await getValue(env, range);

  return values.flat();

}

export async function getTransactions(env) {

  return await getValue(
    env,
    "'Data Transaksi'!A:G"
  );

}

export async function deleteRow(env, rowIndex) {

  const token = await getAccessToken(env);

  const url =
`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: SHEET_ID,
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1
            }
          }
        }
      ]
    })
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data;

}