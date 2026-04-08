const { google } = require("googleapis");

const credentials = process.env.GOOGLE_CREDENTIALS_JSON
  ? JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
  : null;

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

async function getFirstSheetTitle(spreadsheetId) {
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  return res.data.sheets?.[0]?.properties?.title || null;
}

async function getSheetData(spreadsheetId, range) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return res.data.values || [];
  } catch (error) {
    console.error(
      `Error getting sheet data for range ${range}:`,
      error.message,
    );

    if (error.message.includes("Unable to parse range")) {
      const firstTitle = await getFirstSheetTitle(spreadsheetId);
      if (firstTitle) {
        const fallbackRange = range.includes("!")
          ? `${firstTitle}!${range.split("!").pop()}`
          : `${firstTitle}!${range}`;
        console.warn(`Falling back to first sheet title: ${fallbackRange}`);
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: fallbackRange,
        });
        return res.data.values || [];
      }
    }

    throw error;
  }
}

async function updateCell(spreadsheetId, range, value) {
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: {
        values: [[value]],
      },
    });
  } catch (error) {
    console.error(`Error updating cell ${range}:`, error.message);

    if (error.message.includes("Unable to parse range")) {
      const firstTitle = await getFirstSheetTitle(spreadsheetId);
      if (firstTitle) {
        const fallbackRange = range.includes("!")
          ? `${firstTitle}!${range.split("!").pop()}`
          : `${firstTitle}!${range}`;
        console.warn(
          `Retrying update with first sheet title: ${fallbackRange}`,
        );
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: fallbackRange,
          valueInputOption: "RAW",
          requestBody: {
            values: [[value]],
          },
        });
        return;
      }
    }

    throw error;
  }
}

async function appendRow(spreadsheetId, values) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A1",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [values] },
    });
  } catch (error) {
    console.error("Error appending row:", error.message);
    throw error;
  }
}

module.exports = { getSheetData, updateCell, appendRow };
