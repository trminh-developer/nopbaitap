const { google } = require('googleapis');
const http = require('http');
const url = require('url');

// BẠN CẦN THAY THẾ CLIENT_ID VÀ CLIENT_SECRET Ở ĐÂY
const CLIENT_ID = 'YOUR_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

async function getRefreshToken() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Bắt buộc để lấy refresh token
    scope: SCOPES,
  });

  console.log('\n======================================================');
  console.log('Vui lòng mở đường link sau trong trình duyệt của bạn:');
  console.log('👉', authUrl);
  console.log('======================================================\n');

  const server = http.createServer(async (req, res) => {
    try {
      if (req.url.indexOf('/oauth2callback') > -1) {
        const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
        const code = qs.get('code');
        console.log('Đã nhận được mã code, đang lấy Refresh Token...');
        
        res.end('Xac thuc thanh cong! Ban co the tat tab nay va quay lai Terminal.');
        server.destroy();

        const { tokens } = await oauth2Client.getToken(code);
        
        console.log('\n✅ THÀNH CÔNG! Dưới đây là thông tin của bạn:');
        console.log('------------------------------------------------------');
        console.log('REFRESH_TOKEN =', tokens.refresh_token);
        console.log('------------------------------------------------------');
        console.log('Hãy lưu lại REFRESH_TOKEN này để cấu hình Backend nhé!\n');
        process.exit(0);
      }
    } catch (e) {
      console.error('Lỗi:', e.message);
      process.exit(1);
    }
  });

  // Hỗ trợ đóng server
  require('server-destroy')(server);
  server.listen(3000, () => {
    console.log('Đang chờ bạn xác thực trên trình duyệt (Cổng 3000)...');
  });
}

if (CLIENT_ID === 'YOUR_CLIENT_ID') {
  console.log('⚠️ BẠN CHƯA ĐIỀN CLIENT_ID VÀ CLIENT_SECRET VÀO FILE NÀY!');
} else {
  getRefreshToken();
}
