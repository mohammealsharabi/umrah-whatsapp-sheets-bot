export class BatchStore {
  constructor({ delayMs, onFlush }) {
    this.delayMs = delayMs;
    this.onFlush = onFlush;
    this.batches = new Map();
  }

  addResult(sender, result) {
    const existing = this.batches.get(sender) || this.createBatch();

    const key = result.key || result.name || result.filename;
    const alreadySeen = existing.seenKeys.has(key);

    if (alreadySeen) {
      existing.duplicates.push(result);
    } else {
      existing.seenKeys.add(key);

      if (result.ok) {
        existing.verified.push(result);
      } else {
        existing.failed.push(result);
      }
    }

    if (existing.timer) clearTimeout(existing.timer);
    existing.timer = setTimeout(async () => {
      const batch = this.batches.get(sender);
      this.batches.delete(sender);
      await this.onFlush(sender, batch);
    }, this.delayMs);

    this.batches.set(sender, existing);
  }

  createBatch() {
    return {
      verified: [],
      failed: [],
      duplicates: [],
      seenKeys: new Set(),
      timer: null
    };
  }
}

export function formatReport(batch) {
  const lines = [];
  const total = batch.verified.length + batch.failed.length + batch.duplicates.length;

  lines.push('تقرير التحقق من تأشيرات العمرة:');
  lines.push('');

  lines.push(`✅ تم التحقق والتلوين: ${batch.verified.length}`);
  if (batch.verified.length) {
    batch.verified.forEach((item, index) => {
      const duplicateNote = item.totalMatches > 1 ? ' — تنبيه: أكثر من تطابق، تم اختيار الأقرب من أسفل الشيت' : '';
      lines.push(`${index + 1}. ${item.name}${duplicateNote}`);
    });
  }

  lines.push('');
  lines.push(`❌ لم أستطع التحقق: ${batch.failed.length}`);
  if (batch.failed.length) {
    batch.failed.forEach((item, index) => {
      const name = item.name || item.filename || 'اسم غير معروف';
      lines.push(`${index + 1}. ${name}`);
    });
  }

  if (batch.duplicates.length) {
    lines.push('');
    lines.push(`⚠️ ملفات مكررة تم تجاهلها: ${batch.duplicates.length}`);
    batch.duplicates.forEach((item, index) => {
      const name = item.name || item.filename || 'اسم غير معروف';
      lines.push(`${index + 1}. ${name}`);
    });
  }

  lines.push('');
  lines.push(`الإجمالي: ${total}`);

  return lines.join('\n');
}
