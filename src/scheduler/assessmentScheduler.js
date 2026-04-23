const cron = require("node-cron");
const moment = require("moment");
const { getSheetData, updateCell } = require("../google");
const { sendWhatsApp } = require("../whatsapp");

const SHEET_PARTNER_ID = "1pP8U6y-JP8cc_kY2VZmXAo85DOKa0F6H8OSeqxNuUoE";
const SHEET_ASSESSMENT_ID = "1180QY5Hl6woKCJlFsWfwr2O1UCMhfjSbr-oIwJDTda8";
const SHEET_SUPERNOTES_ID = "1MgWID7enOpyZQj2_sOwL203OJUVH-jpxmVxTi5603zo";

const PARTNER_RANGE = "Sheet1!A2:M";
const ASSESSMENT_RANGE = "'Form Responses 1'!A2:Z";
const SUPERNOTES_RANGE = "Sheet1!A2:Z";

// Template 1 (career_starter_kit_invitee) is sent via /api/customers/partner_lead
// when the website form is submitted — not by this scheduler.
const TEMPLATE_2 = "career_project_completion_next_steps";
const TEMPLATE_2_URL = "https://empower.supernotes.info";
const TEMPLATE_2_VIDEO = "https://supernotes.onrender.com/img/career_project_completion.mp4";
const TEMPLATE_3 = "career_project_reminder_24h";
const TEMPLATE_3_URL = "https://simplebooklet.com/project1essentials";
const TEMPLATE_3_SUPPORT_URL = "https://chat.whatsapp.com/KQD9BeV0m3F3YVif0uI9dK";
const TEMPLATE_3_IMAGE = "https://supernotes.onrender.com/img/2.png";
const TEMPLATE_4 = "career_project_reminder_48h";
const TEMPLATE_4_IMAGE = "https://supernotes.onrender.com/img/career_project_reminder_48h.png";
const TEMPLATE_5 = "address_reminder_72h";
const TEMPLATE_5_VIDEO = "https://supernotes.onrender.com/img/address_reminder_72h.mp4";

// Partner Supernotes column indices (0-based):
// A=0 datetime, E=4 whatsapp, F=5 email, J=9 status, K=10 R1, L=11 R2, M=12 R3
const TIMESTAMP_COL = 0;
const PHONE_COL = 4;
const EMAIL_COL = 5;
const STATUS_COL = 9;
const R1_COL = 10;
const R2_COL = 11;
const R3_COL = 12;

function normalizeEmail(value) {
  return (value || "").toString().toLowerCase().trim();
}

function normalizePhone(value) {
  if (!value) return "";
  return value.toString().replace(/[^0-9+]/g, "");
}

function toFlag(value) {
  if (!value) return "0";
  const text = value.toString().trim();
  return text === "1" || text.toLowerCase() === "true" ? "1" : "0";
}

// Handles both ISO ("2026-03-29T09:13:13.588Z") and Google Sheets ("4/8/2026 17:50:45") formats
function parseMoment(value) {
  if (!value) return moment.invalid();
  return moment(
    value,
    [moment.ISO_8601, "M/D/YYYY HH:mm:ss", "MM/DD/YYYY HH:mm:ss"],
    true,
  );
}

cron.schedule("*/3 * * * *", async () => {
  if (!SHEET_PARTNER_ID || !SHEET_ASSESSMENT_ID || !SHEET_SUPERNOTES_ID) {
    console.error(
      "Missing required sheet config: SHEET_PARTNER_ID, SHEET_ASSESSMENT_ID, SHEET_SUPERNOTES_ID",
    );
    return;
  }

  console.log("\n────────────────────────────────────────");
  console.log("⏳ Assessment scheduler running...");
  console.log("────────────────────────────────────────");

  try {
    const partnerRows = await getSheetData(SHEET_PARTNER_ID, PARTNER_RANGE);
    const assessmentRows = await getSheetData(
      SHEET_ASSESSMENT_ID,
      ASSESSMENT_RANGE,
    );
    const superNotesRows = await getSheetData(
      SHEET_SUPERNOTES_ID,
      SUPERNOTES_RANGE,
    );

    console.log(
      `📋 Fetched ${partnerRows.length} Partner rows, ${assessmentRows.length} Assessment rows, ${superNotesRows.length} Supernotes New rows`,
    );

    // Map email → earliest assessment submission timestamp (column A=index 0, B=index 1)
    const assessmentMap = {};
    for (const row of assessmentRows) {
      const email = normalizeEmail(row[1]);
      if (email && !assessmentMap[email]) {
        assessmentMap[email] = row[0];
      }
    }

    // Set of emails that filled Supernotes New (column D = index 3)
    const superNotesEmails = new Set(
      superNotesRows.map((row) => normalizeEmail(row[3])).filter(Boolean),
    );

    console.log(
      `📝 Assessment emails found: ${Object.keys(assessmentMap).length} | Supernotes New emails found: ${superNotesEmails.size}`,
    );

    for (let index = 0; index < partnerRows.length; index++) {
      const row = partnerRows[index];
      const rowNumber = index + 2;

      const timestampValue = row[TIMESTAMP_COL];
      const phone = normalizePhone(row[PHONE_COL]);
      const email = normalizeEmail(row[EMAIL_COL]);
      const status = toFlag(row[STATUS_COL]);
      const r1 = toFlag(row[R1_COL]);
      const r2 = toFlag(row[R2_COL]);
      const r3 = toFlag(row[R3_COL]);

      if (!phone || !email || !timestampValue) {
        console.log(
          `⚠️  Row ${rowNumber}: Skipping — missing phone/email/timestamp (phone="${row[PHONE_COL]}", email="${row[EMAIL_COL]}", timestamp="${timestampValue}")`,
        );
        continue;
      }

      const submittedAt = parseMoment(timestampValue);
      if (!submittedAt.isValid()) {
        console.log(
          `⚠️  Row ${rowNumber} [${email}]: Skipping — could not parse timestamp "${timestampValue}"`,
        );
        continue;
      }

      const hoursSinceSubmission = moment().diff(submittedAt, "hours");
      const assessmentTimestamp = assessmentMap[email];
      const assessmentCompleted = !!assessmentTimestamp;
      const finalFormCompleted = superNotesEmails.has(email);

      console.log(
        `👤 Row ${rowNumber} | email: ${email} | phone: ${phone} | submitted: ${hoursSinceSubmission}h ago | assessmentDone: ${assessmentCompleted} | finalFormDone: ${finalFormCompleted} | flags: status=${status} R1=${r1} R2=${r2} R3=${r3}`,
      );

      // Assessment completed → send Template 2 and mark status = 1
      if (assessmentCompleted && status === "0") {
        console.log(
          `✅ Row ${rowNumber} [${email}]: Assessment completed — sending Template 2 (${TEMPLATE_2}) to ${phone}`,
        );
        const sent = await sendWhatsApp(phone, TEMPLATE_2, [TEMPLATE_2_URL], TEMPLATE_2_VIDEO, "video");
        if (sent) {
          await updateCell(SHEET_PARTNER_ID, `Sheet1!J${rowNumber}`, "1");
          console.log(
            `📌 Row ${rowNumber} [${email}]: Marked Assignment Status (J) = 1`,
          );
        } else {
          console.log(
            `⚠️  Row ${rowNumber} [${email}]: WhatsApp failed — skipping flag update for J`,
          );
        }
        continue;
      }

      // Reminder 1 (Template 3) — 24h after form submission, assessment still not done
      if (!assessmentCompleted && hoursSinceSubmission >= 24 && r1 === "0") {
        console.log(
          `🔔 Row ${rowNumber} [${email}]: ${hoursSinceSubmission}h since submission, no assessment — sending Reminder 1 (${TEMPLATE_3}) to ${phone}`,
        );
        const sent = await sendWhatsApp(phone, TEMPLATE_3, [TEMPLATE_3_URL, TEMPLATE_3_SUPPORT_URL], TEMPLATE_3_IMAGE);
        if (sent) {
          await updateCell(SHEET_PARTNER_ID, `Sheet1!K${rowNumber}`, "1");
          console.log(
            `📌 Row ${rowNumber} [${email}]: Marked Reminder 1 Sent (K) = 1`,
          );
        } else {
          console.log(
            `⚠️  Row ${rowNumber} [${email}]: WhatsApp failed — skipping flag update for K`,
          );
        }
      }

      // Reminder 2 (Template 4) — 48h after form submission, assessment still not done
      if (!assessmentCompleted && hoursSinceSubmission >= 48 && r2 === "0") {
        console.log(
          `🔔 Row ${rowNumber} [${email}]: ${hoursSinceSubmission}h since submission, no assessment — sending Reminder 2 (${TEMPLATE_4}) to ${phone}`,
        );
        const sent = await sendWhatsApp(phone, TEMPLATE_4, [TEMPLATE_3_URL, TEMPLATE_3_SUPPORT_URL], TEMPLATE_4_IMAGE);
        if (sent) {
          await updateCell(SHEET_PARTNER_ID, `Sheet1!L${rowNumber}`, "1");
          console.log(
            `📌 Row ${rowNumber} [${email}]: Marked Reminder 2 Sent (L) = 1`,
          );
        } else {
          console.log(
            `⚠️  Row ${rowNumber} [${email}]: WhatsApp failed — skipping flag update for L`,
          );
        }
      }

      // Final reminder (Template 5) — 72h after assessment was completed, Supernotes New not filled
      if (assessmentCompleted && !finalFormCompleted && r3 === "0") {
        const assessmentAt = parseMoment(assessmentTimestamp);
        if (!assessmentAt.isValid()) {
          console.log(
            `⚠️  Row ${rowNumber} [${email}]: Could not parse assessment timestamp "${assessmentTimestamp}" for final reminder`,
          );
        } else {
          const hoursSinceAssessment = moment().diff(assessmentAt, "hours");
          if (hoursSinceAssessment >= 72) {
            console.log(
              `🔔 Row ${rowNumber} [${email}]: ${hoursSinceAssessment}h since assessment, Supernotes New not filled — sending Final Reminder (${TEMPLATE_5}) to ${phone}`,
            );
            const sent = await sendWhatsApp(phone, TEMPLATE_5, [], TEMPLATE_5_VIDEO, "video");
            if (sent) {
              await updateCell(SHEET_PARTNER_ID, `Sheet1!M${rowNumber}`, "1");
              console.log(
                `📌 Row ${rowNumber} [${email}]: Marked Final Reminder Sent (M) = 1`,
              );
            } else {
              console.log(
                `⚠️  Row ${rowNumber} [${email}]: WhatsApp failed — skipping flag update for M`,
              );
            }
          } else {
            console.log(
              `⏳ Row ${rowNumber} [${email}]: Assessment done ${hoursSinceAssessment}h ago — final reminder will trigger at 72h`,
            );
          }
        }
      }
    }

    console.log("✅ Assessment scheduler run complete");
    console.log("────────────────────────────────────────\n");
  } catch (error) {
    console.error(
      "❌ Error running assessment scheduler:",
      error.message || error,
    );
  }
});
