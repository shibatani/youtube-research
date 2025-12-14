import { google } from "googleapis";
import { JWT } from "google-auth-library";
import * as fs from "fs";
import * as path from "path";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

/**
 * Google Sheets API の認証クライアントを作成
 * サービスアカウントの認証情報を使用
 * 1. ローカルの credentials.json を優先
 * 2. なければ環境変数から読み込み
 */
const getAuthClient = (): JWT => {
  let credentials: { client_email: string; private_key: string };

  const credentialsPath = path.join(process.cwd(), "credentials.json");
  if (fs.existsSync(credentialsPath)) {
    credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
  } else {
    credentials = {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n") || "",
    };
  }

  return new google.auth.JWT(credentials.client_email, undefined, credentials.private_key, [
    "https://www.googleapis.com/auth/spreadsheets",
  ]);
};

/**
 * スプレッドシートにデータを追記
 */
export const appendToSheet = async ({
  sheetName,
  values,
}: {
  sheetName: string;
  values: (string | number)[][];
}): Promise<void> => {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values,
    },
  });
};

/**
 * スプレッドシートの特定範囲を更新
 */
export const updateSheet = async ({
  range,
  values,
}: {
  range: string;
  values: (string | number)[][];
}): Promise<void> => {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values,
    },
  });
};

/**
 * スプレッドシートからデータを読み取り
 */
export const readSheet = async ({
  range,
}: {
  range: string;
}): Promise<(string | number)[][] | null> => {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });

  return (response.data.values as (string | number)[][]) ?? null;
};

/**
 * スプレッドシートをクリア
 */
export const clearSheet = async ({ range }: { range: string }): Promise<void> => {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
};
