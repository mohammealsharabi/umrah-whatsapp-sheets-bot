import 'dotenv/config';
import express from 'express';
import { GoogleSheetsService } from './sheets.js';
import { WhatsAppService } from './whatsapp.js';
import { BatchStore, formatReport } from './batch-store.js';
import { isPdfDocument } from './name-utils.js';

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = Number(process.env.PORT || 3000);
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const REPORT_DELAY_MINUTES = Number(process.env.REPORT_DELAY_MINUTES || 5);
const MATCH_WORD_COUNT = Number(process.env.MATCH_WORD_COUNT || 3);
const ALLOWED_NUMBERS = (process.env.ALLOWED_NUMBERS || '')
  .split(',')
  .map(v => v.trim())
  .filter(Boolean);

const sheetsService = new GoogleSheetsService({
  serviceAccountFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
  spreadsheetId: process.env.SPREADSHEET_ID,
  sheetName: process.env.SHEET_NAME,
  matchWordCount: MATCH_WORD_COUNT,
  nameColumn: process.env.NAME_COLUMN || 'E',
  colorColumn: process.env.COLOR_COLUMN || 'D'
});

const whatsappService = new WhatsAppService({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  apiVersion: process.env.WHATSAPP_API_VERSION || 'v23.0'
});

const batchStore = new BatchStore({
  delayMs: REPORT_DELAY_MINUTES * 60 * 1000,
  onFlush: async (sender, batch) => {
    const report = formatReport(batch);
    try {
      await whatsappService.sendText(sender, report);
    } catch (error) {
      console.error('WhatsApp report failed, but bot will continue:', error.message);
      console.log('Report content:');
      console.log(report);
    }
  }
});

function isAllowedSender(sender) {
  if (ALLOWED_NUMBERS.length === 0) return true;
  return ALLOWED_NUMBERS.includes(sender);
}

// Meta webhook verification endpoint.
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// Direct server-side test endpoint for Render.
app.get('/test-color', async (req, res) => {
  try {
    if (req.query.token !== VERIFY_TOKEN) {
      return res.sendStatus(403);
    }
    const filename = req.query.filename;
    if (!filename) {
      return res.status(400).json({
        ok: false,
        error: 'filename_required'
      });
    }
    const result = await sheetsService.verifyAndColor(filename);
    console.log('TEST_COLOR_RESULT:', JSON.stringify(result));
    return res.json(result);
  } catch (error) {
    console.error('TEST_COLOR_ERROR:', error);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});// WhatsApp incoming messages endpoint.
app.post('/webhook', async (req, res) => {
  // Respond fast so Meta does not retry while we process.
  res.sendStatus(200);

  try {
    const entries = req.body?.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        const messages = change.value?.messages || [];

        for (const message of messages) {
          const sender = message.from;

          if (!sender) continue;

          if (!isAllowedSender(sender)) {
            await whatsappService.sendText(sender, 'ط؛ظٹط± ظ…طµط±ط­ ظ„ظƒ ط¨ط§ط³طھط®ط¯ط§ظ… ظ‡ط°ط§ ط§ظ„ط¨ظˆطھ.');
            continue;
          }

          if (!isPdfDocument(message)) {
            await whatsappService.sendText(sender, 'ط§ظ„ط±ط¬ط§ط، ط¥ط±ط³ط§ظ„ ط£ظˆ طھط­ظˆظٹظ„ ظ…ظ„ظپط§طھ PDF ظپظ‚ط·.');
            continue;
          }

          const filename = message.document?.filename;

          if (!filename) {
            batchStore.addResult(sender, {
              ok: false,
              status: 'missing_filename',
              filename: 'ط¨ط¯ظˆظ† ط§ط³ظ… ظ…ظ„ظپ',
              name: 'ظ„ظ… ظٹطµظ„ ط§ط³ظ… ط§ظ„ظ…ظ„ظپ ظ…ظ† ظˆط§طھط³ط§ط¨'
            });
            continue;
          }

          const result = await sheetsService.verifyAndColor(filename);
          batchStore.addResult(sender, result);
        }
      }
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
  }
});

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'umrah-whatsapp-sheets-bot' });
});

app.listen(PORT, () => {
  console.log(`Umrah WhatsApp Sheets Bot running on port ${PORT}`);
});




