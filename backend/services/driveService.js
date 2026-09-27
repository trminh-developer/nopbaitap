const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Đường dẫn tới file credentials (bạn sẽ cần tạo file này sau)
const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials.json');

// Khởi tạo Drive API Client
let driveClient = null;

try {
  if (fs.existsSync(CREDENTIALS_PATH)) {
    const auth = new google.auth.GoogleAuth({
      keyFile: CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    driveClient = google.drive({ version: 'v3', auth });
    console.log('✅ Google Drive API Client đã khởi tạo thành công.');
  } else {
    console.warn('⚠️ CẢNH BÁO: Không tìm thấy credentials.json. Chức năng upload lên Drive sẽ bị vô hiệu hóa.');
  }
} catch (error) {
  console.error('❌ Lỗi khi khởi tạo Google Drive API:', error.message);
}

const { Readable } = require('stream');

/**
 * Upload một file lên Google Drive từ bộ nhớ (Buffer)
 * @param {Buffer} fileBuffer Dữ liệu file trên RAM
 * @param {string} originalName Tên file gốc
 * @param {string} mimeType Loại MIME của file
 * @param {string} folderId ID của thư mục Google Drive
 * @returns {Promise<Object>} Trả về thông tin file trên Drive
 */
const uploadFileToDrive = async (fileBuffer, originalName, mimeType, folderId) => {
  if (!driveClient) {
    throw new Error('Google Drive API chưa được cấu hình. Thiếu credentials.json');
  }

  const fileMetadata = {
    name: originalName,
    parents: [folderId],
  };

  const media = {
    mimeType: mimeType,
    body: Readable.from(fileBuffer),
  };

  try {
    const response = await driveClient.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });
    return response.data;
  } catch (error) {
    console.error(`❌ Lỗi upload file ${originalName} lên Drive:`, error.message);
    throw error;
  }
};

module.exports = {
  uploadFileToDrive,
};
