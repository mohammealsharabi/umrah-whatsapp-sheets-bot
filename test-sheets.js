import 'dotenv/config';
import { GoogleSheetsService } from './src/sheets.js';
const names = [
  'صفيه بجاش قاسم الفهيدي',
  'عدنان صادق سيف عبدالله',
  'محمد فرحان قائد محمود',
  'احمد مهيوب علي عبداللطيف',
  'عبدالملك قاسم احمد عبدالقادر',
  'فاطمة ناجي عبده محمد غالب',
  'مجيب عبدالرحمن احمد محمد'
];
const sheetsService = new GoogleSheetsService({
  serviceAccountFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
  spreadsheetId: process.env.SPREADSHEET_ID,
  sheetName: process.env.SHEET_NAME,
  matchWordCount: process.env.MATCH_WORD_COUNT,
  nameColumn: process.env.NAME_COLUMN,
  colorColumn: process.env.COLOR_COLUMN
});
for (const name of names) {
  try {
    const result = await sheetsService.verifyAndColor(`${name}.pdf`);
    if (result.ok) {
      console.log(`✅ تم التحقق: ${result.name} | الصف: ${result.rowNumber}`);
    } else {
      console.log(`❌ لم يتم العثور: ${name} | الثلاثي: ${result.key}`);
    }
  } catch (error) {
    console.error(`⚠️ خطأ مع الاسم: ${name}`);
    console.error(error.message);
  }
}
