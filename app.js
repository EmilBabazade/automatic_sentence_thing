// Holds all rows for the current session
// Each row = [left, right, tag]
const allRows = [];

document.addEventListener('DOMContentLoaded', () => {
  const norskInput   = document.getElementById('norsk');
  const englishInput = document.getElementById('english');
  const tagInput     = document.getElementById('tag');
  const previewBox   = document.getElementById('preview');

  const addBtn      = document.getElementById('addBtn');
  const clearBtn    = document.getElementById('clearBtn');
  const downloadBtn = document.getElementById('downloadBtn');

  addBtn.addEventListener('click', () => {
    const norskRaw   = norskInput.value;
    const englishRaw = englishInput.value;
    const tagRaw     = tagInput.value;

    if (!norskRaw.trim() || !englishRaw.trim()) {
      alert('Need both Norwegian and English.');
      return;
    }

    // Clean spaces
    const norsk   = String(norskRaw).trim().replace(/\s+/g, ' ');
    const english = String(englishRaw).trim().replace(/\s+/g, ' ');
    const tag     = String(tagRaw).trim();

    const rowsForSentence = genClozeRows(norsk, english, tag);
    for (const r of rowsForSentence) {
      allRows.push(r);
    }

    updatePreview(previewBox);

    // Optional: clear Norwegian/English but keep tag for next sentence
    norskInput.value = '';
    englishInput.value = '';
    norskInput.focus();
  });

  clearBtn.addEventListener('click', () => {
    allRows.length = 0;
    updatePreview(previewBox);
  });

  downloadBtn.addEventListener('click', () => {
    if (allRows.length === 0) {
      alert('No rows to download.');
      return;
    }

    const tsv = rowsToTsv(allRows);
    downloadTextFile(tsv, 'sentences.tsv');
  });
});

/**
 * Generates rows like your GEN_CLOZE:
 * 1) norsk   -> english  (with tag)
 * 2) english -> norsk    (no tag)
 * 3) each word masked -> norsk (no tag)
 */
function genClozeRows(norsk, english, tag) {
  const rows = [];
  const words = norsk.split(' ');

  // Row 1: full NO -> EN with tag
  rows.push([norsk, english, tag]);

  // Row 2: full EN -> NO, no tag
  rows.push([english, norsk, '']);

  // Cloze rows: each word replaced by "_"
  for (let i = 0; i < words.length; i++) {
    const maskedWords = [];
    for (let j = 0; j < words.length; j++) {
      maskedWords.push(j === i ? '_' : words[j]);
    }
    const masked = maskedWords.join(' ');
    rows.push([masked, norsk, '']);
  }

  return rows;
}

/**
 * Update preview textarea with current TSV.
 */
function updatePreview(previewEl) {
  if (allRows.length === 0) {
    previewEl.value = '';
    return;
  }
  previewEl.value = rowsToTsv(allRows);
}

/**
 * Convert 2D array to TSV string.
 */
function rowsToTsv(rows) {
  return rows
    .map(cols =>
      cols
        .map(c => sanitizeCell(c))
        .join('\t')
    )
    .join('\n');
}

/**
 * Basic sanitizing: remove newlines/tabs inside cells.
 */
function sanitizeCell(value) {
  return String(value || '')
    .replace(/\r?\n/g, ' ')
    .replace(/\t/g, ' ');
}

/**
 * Trigger a download of a text file.
 */
function downloadTextFile(text, filename) {
  const blob = new Blob([text], { type: 'text/tab-separated-values;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}
