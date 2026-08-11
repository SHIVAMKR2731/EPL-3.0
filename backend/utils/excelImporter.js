const XLSX = require('xlsx');
const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

async function parseExcelFile(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  // Try extracting embedded images from Excel ZIP structure (xl/media/)
  const extractedImages = [];
  try {
    const zip = await JSZip.loadAsync(fileBuffer);
    const mediaFiles = Object.keys(zip.files).filter(fileName => fileName.startsWith('xl/media/'));

    // Sort media files numerically (image1, image2, ...)
    mediaFiles.sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
      return numA - numB;
    });

    const uploadsDir = path.join(__dirname, '../../uploads/players');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    for (let i = 0; i < mediaFiles.length; i++) {
      const mediaPath = mediaFiles[i];
      const ext = path.extname(mediaPath) || '.png';
      const fileData = await zip.files[mediaPath].async('nodebuffer');
      const filename = `excel-img-${Date.now()}-${i + 1}${ext}`;
      const destPath = path.join(uploadsDir, filename);
      fs.writeFileSync(destPath, fileData);
      extractedImages.push(`/uploads/players/${filename}`);
    }
  } catch (err) {
    console.warn('Could not extract embedded ZIP media images from Excel:', err.message);
  }

  const mappedPlayers = [];
  const errors = [];

  rawData.forEach((row, index) => {
    // Column normalization helper
    const getVal = (...keys) => {
      for (const key of keys) {
        for (const rowKey of Object.keys(row)) {
          if (rowKey.trim().toLowerCase() === key.toLowerCase()) {
            return String(row[rowKey]).trim();
          }
        }
      }
      return '';
    };

    const name = getVal('name', 'player_name', 'player name', 'full name');
    const contact = getVal('contact', 'contact no', 'contact_number', 'phone', 'mobile');
    const batch = getVal('batch', 'year', 'batch/year');
    const branch = getVal('branch', 'dept', 'department');
    const position = getVal('position', 'playing position', 'playing_position', 'role');
    const basePriceStr = getVal('base price', 'base_price', 'price');
    const imageVal = getVal('image', 'photo', 'profile', 'img', 'picture', 'avatar');

    if (!name) {
      errors.push(`Row ${index + 2}: Missing player name`);
      return;
    }

    const basePrice = parseInt(basePriceStr, 10) || 500;
    const validPositions = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'];
    let formattedPosition = 'Midfielder';
    if (position) {
      const posMatch = validPositions.find(p => p.toLowerCase() === position.toLowerCase());
      if (posMatch) formattedPosition = posMatch;
      else formattedPosition = position;
    }

    // Determine player image
    let finalImage = '/uploads/players/default.png';

    if (imageVal) {
      const trimmed = imageVal.trim();
      if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
        let fileId = null;
        if (trimmed.includes('id=')) {
          const match = trimmed.match(/id=([a-zA-Z0-9_-]+)/);
          if (match && match[1]) fileId = match[1];
        }
        if (!fileId && trimmed.includes('/d/')) {
          const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (match && match[1]) fileId = match[1];
        }
        if (fileId) {
          finalImage = `https://lh3.googleusercontent.com/d/${fileId}`;
        } else {
          finalImage = trimmed;
        }
      } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        finalImage = trimmed;
      } else if (trimmed.startsWith('/uploads/')) {
        finalImage = trimmed;
      } else if (trimmed.includes('.')) {
        finalImage = `/uploads/players/${path.basename(trimmed)}`;
      }
    } else if (extractedImages[mappedPlayers.length]) {
      // Use the corresponding extracted embedded image from Excel if available
      finalImage = extractedImages[mappedPlayers.length];
    }

    mappedPlayers.push({
      name,
      contact_number: contact || '',
      batch: batch || '1st Year',
      branch: branch || 'CSE',
      position: formattedPosition,
      base_price: basePrice,
      image: finalImage
    });
  });

  return { players: mappedPlayers, errors };
}

module.exports = { parseExcelFile };
