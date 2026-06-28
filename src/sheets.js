import { google } from 'googleapis';
import { firstWords, normalizeArabicName } from './name-utils.js';
export class GoogleSheetsService {
  constructor({ serviceAccountFile, spreadsheetId, sheetName, matchWordCount, nameColumn, colorColumn }) {
    this.spreadsheetId = spreadsheetId;
    this.sheetName = sheetName || 'الورقة1';
    this.matchWordCount = Number(matchWordCount || 3);
    this.nameColumn = String(nameColumn || 'E').toUpperCase();
    this.colorColumn = String(colorColumn || 'D').toUpperCase();
    const authOptions = {
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    };
    if (process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
      authOptions.credentials = JSON.parse(
        Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
      );
    } else {
      authOptions.keyFile = serviceAccountFile;
    }
    const auth = new google.auth.GoogleAuth(authOptions);
    this.sheets = google.sheets({ version: 'v4', auth });
    this.cachedSheetId = null;
  }
  async getSheetId() {
    if (this.cachedSheetId !== null) return this.cachedSheetId;
    const res = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      fields: 'sheets(properties(sheetId,title))'
    });
    const sheet = res.data.sheets.find(s => s.properties.title === this.sheetName);
    if (!sheet) {
      throw new Error(`Sheet tab not found: ${this.sheetName}`);
    }
    this.cachedSheetId = sheet.properties.sheetId;
    return this.cachedSheetId;
  }
  columnLetterToIndex(columnLetter) {
    let index = 0;
    const clean = String(columnLetter).toUpperCase().replace(/[^A-Z]/g, '');
    for (let i = 0; i < clean.length; i++) {
      index = index * 26 + (clean.charCodeAt(i) - 64);
    }
    return index - 1;
  }
  async readNamesColumn() {
    const range = `${this.sheetName}!${this.nameColumn}:${this.nameColumn}`;
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range
    });
    return res.data.values || [];
  }
  async findFromBottomByTriple(filenameOrName) {
    const targetFull = normalizeArabicName(filenameOrName);
    const targetKey = firstWords(targetFull, this.matchWordCount);
    if (!targetKey) {
      return { found: false, reason: 'empty_name', targetFull, targetKey };
    }
    const rows = await this.readNamesColumn();
    const matches = [];
    for (let i = rows.length - 1; i >= 0; i--) {
      const sheetName = rows[i]?.[0] || '';
      const sheetFull = normalizeArabicName(sheetName);
      const sheetKey = firstWords(sheetFull, this.matchWordCount);
      if (sheetKey && sheetKey === targetKey) {
        matches.push({
          rowIndex: i,
          rowNumber: i + 1,
          sheetName: sheetFull,
          sheetKey
        });
      }
    }
    if (matches.length === 0) {
      return { found: false, reason: 'not_found', targetFull, targetKey };
    }
    return {
      found: true,
      targetFull,
      targetKey,
      chosen: matches[0],
      totalMatches: matches.length,
      allMatches: matches
    };
  }
  async colorTargetCellYellow(rowIndex) {
    const sheetId = await this.getSheetId();
    const colorColumnIndex = this.columnLetterToIndex(this.colorColumn);
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: rowIndex,
                endRowIndex: rowIndex + 1,
                startColumnIndex: colorColumnIndex,
                endColumnIndex: colorColumnIndex + 1
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 1,
                    green: 1,
                    blue: 0
                  }
                }
              },
              fields: 'userEnteredFormat.backgroundColor'
            }
          }
        ]
      }
    });
  }
  async verifyAndColor(filename) {
    const match = await this.findFromBottomByTriple(filename);
    if (!match.found) {
      return {
        ok: false,
        status: match.reason,
        filename,
        name: match.targetFull,
        key: match.targetKey
      };
    }
    await this.colorTargetCellYellow(match.chosen.rowIndex);
    return {
      ok: true,
      status: 'verified_colored',
      filename,
      name: match.chosen.sheetName,
      key: match.targetKey,
      rowNumber: match.chosen.rowNumber,
      totalMatches: match.totalMatches,
      coloredCell: `${this.colorColumn}${match.chosen.rowNumber}`,
      searchedCell: `${this.nameColumn}${match.chosen.rowNumber}`
    };
  }
}

