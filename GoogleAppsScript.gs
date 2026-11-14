var UPLOAD_FOLDER_ID = "1fDd3ajTrj-DZvHM6_hCBXDLzhICMuZq3";
var UPLOAD_MAX_SIZE = 1024 * 1024 * 1024;
var UPLOAD_CHUNK_SIZE = 8 * 1024 * 1024;
var UPLOAD_PROTOCOL = "resumable-v3";

// Chỉ kiểm tra phiên bản và khả năng truy cập API; không đọc hoặc tạo file Drive.
function doGet() {
  return jsonResponse({
    service: "nop-bai",
    status: "online",
    maxFiles: 10,
    maxFileSize: UPLOAD_MAX_SIZE,
    chunkSize: UPLOAD_CHUNK_SIZE,
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents)
      throw new Error("Không nhận được dữ liệu nộp bài.");
    var data = JSON.parse(e.postData.contents);
    if (!data || typeof data !== "object")
      throw new Error("Dữ liệu nộp bài không hợp lệ.");
    if (data.action === "start") return jsonResponse(startUploads_(data));
    if (data.action === "chunk") return jsonResponse(uploadChunk_(data));
    if (data.action === "status")
      return jsonResponse(uploadStatus_(readTicket_(data.ticket)));
    throw new Error("Yêu cầu nộp bài không hợp lệ. Vui lòng tải lại trang.");
  } catch (error) {
    return jsonResponse({
      success: false,
      message: error.message || error.toString(),
      retryable: error.retryable === true,
    });
  }
}

function startUploads_(data) {
  if (!Array.isArray(data.files) || !data.files.length)
    throw new Error("Không nhận được file. Hãy gửi trường files dạng mảng.");
  if (data.files.length > 10)
    throw new Error("Chỉ gửi tối đa 10 file mỗi lần.");
  var studentName =
    typeof data.studentName === "string" ? data.studentName.trim() : "";
  var studentId =
    typeof data.studentId === "string" ? data.studentId.trim() : "";
  if (!studentName || studentName.length > 150)
    throw new Error("Vui lòng nhập họ tên hợp lệ.");
  if (!studentId || studentId.length > 64)
    throw new Error("Vui lòng nhập mã sinh viên (tối đa 64 ký tự).");
  var studentClass =
    typeof data.studentClass === "string"
      ? data.studentClass.trim().toUpperCase()
      : "";
  if (
    !studentClass ||
    studentClass.length > 64 ||
    /[\r\n\t]/.test(studentClass)
  )
    throw new Error("Vui lòng nhập lớp hợp lệ (tối đa 64 ký tự).");
  var course =
    typeof data.course === "string"
      ? data.course.trim().substring(0, 150).replace(/\s+/g, " ") || "NoCourse"
      : "NoCourse";
  // Chỉ nhận metadata tại bước này; không nạp nguyên file vào Apps Script.
  var files = data.files.map(function (f) {
    if (
      !f ||
      typeof f.name !== "string" ||
      !f.name.trim() ||
      f.name.length > 255 ||
      !Number.isInteger(f.size) ||
      f.size < 0 ||
      f.size > UPLOAD_MAX_SIZE
    )
      throw new Error("File không hợp lệ hoặc vượt quá 1 GB.");
    var mimeType =
      typeof f.mimeType === "string" &&
      /^[a-zA-Z0-9.+_-]+\/[a-zA-Z0-9.+_-]+$/.test(f.mimeType) &&
      f.mimeType.indexOf("application/vnd.google-apps.") !== 0
        ? f.mimeType
        : "application/octet-stream";
    return {
      name:
        "[" +
        studentClass +
        "]-[" +
        course +
        "] " +
        studentId +
        "_" +
        studentName +
        "_" +
        f.name,
      sourceName: f.name,
      size: f.size,
      mimeType: mimeType,
    };
  });
  DriveApp.getFolderById(UPLOAD_FOLDER_ID).getName();
  var uploads = files.map(function (file) {
    var response = driveFetch_(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,size,webViewLink,parents",
      {
        method: "post",
        contentType: "application/json",
        headers: {
          Authorization: "Bearer " + ScriptApp.getOAuthToken(),
          "X-Upload-Content-Type": file.mimeType,
          "X-Upload-Content-Length": String(file.size),
        },
        payload: JSON.stringify({
          name: file.name,
          mimeType: file.mimeType,
          parents: [UPLOAD_FOLDER_ID],
          description:
            "Student ID: " +
            studentId +
            "\nHọ tên: " +
            studentName +
            "\nLớp: " +
            studentClass +
            "\nHọc phần: " +
            course,
        }),
      },
    );
    if (response.getResponseCode() !== 200) throwDriveError_(response);
    var sessionUrl = responseHeader_(response, "location");
    if (!validSessionUrl_(sessionUrl))
      throw new Error("Google Drive chưa tạo được phiên tải file.");
    var ticket = signTicket_({
      sessionUrl: sessionUrl,
      size: file.size,
      mimeType: file.mimeType,
      folderId: UPLOAD_FOLDER_ID,
      issuedAt: Date.now(),
    });
    return { ticket: ticket, size: file.size };
  });
  // Tạo phiên chưa đồng nghĩa file đã được lưu.
  return { success: true, stage: "ready", uploads: uploads };
}

function uploadChunk_(data) {
  var ticket = readTicket_(data.ticket);
  if (
    !Number.isInteger(data.offset) ||
    data.offset < 0 ||
    data.offset > ticket.size ||
    typeof data.base64 !== "string" ||
    data.base64.length > Math.ceil(UPLOAD_CHUNK_SIZE / 3) * 4
  )
    throw new Error("Phần dữ liệu tải lên không hợp lệ.");
  var bytes = Utilities.base64Decode(data.base64);
  if (data.offset === ticket.size && ticket.size > 0 && bytes.length === 0)
    return uploadStatus_(ticket);
  var end = data.offset + bytes.length;
  if (
    bytes.length > UPLOAD_CHUNK_SIZE ||
    end > ticket.size ||
    (!bytes.length && ticket.size > 0) ||
    (end < ticket.size && bytes.length % (256 * 1024) !== 0)
  )
    throw new Error("Dung lượng phần tải lên không hợp lệ.");
  var range =
    ticket.size === 0
      ? "bytes */0"
      : "bytes " + data.offset + "-" + (end - 1) + "/" + ticket.size;
  var response = driveFetch_(ticket.sessionUrl, {
    method: "put",
    contentType: ticket.mimeType,
    headers: { "Content-Range": range },
    payload: bytes,
  });
  return parseUploadResult_(response, ticket);
}

function uploadStatus_(ticket) {
  var response = driveFetch_(ticket.sessionUrl, {
    method: "put",
    contentType: ticket.mimeType,
    headers: { "Content-Range": "bytes */" + ticket.size },
    payload: "",
  });
  return parseUploadResult_(response, ticket);
}

function parseUploadResult_(response, ticket) {
  var code = response.getResponseCode();
  if (code === 308) {
    var range = responseHeader_(response, "range");
    var match = range && range.match(/^bytes=0-(\d+)$/);
    if (range && !match)
      throw new Error("Drive trả về tiến trình không hợp lệ.");
    var uploadedBytes = match ? Number(match[1]) + 1 : 0;
    if (!Number.isInteger(uploadedBytes) || uploadedBytes > ticket.size)
      throw new Error("Dung lượng đã tải không hợp lệ.");
    return { success: true, complete: false, uploadedBytes: uploadedBytes };
  }
  if (code !== 200 && code !== 201) throwDriveError_(response);
  var file = JSON.parse(response.getContentText());
  if (
    !file.id ||
    !file.name ||
    Number(file.size) !== ticket.size ||
    !Array.isArray(file.parents) ||
    file.parents.indexOf(ticket.folderId) < 0
  )
    throw new Error(
      "Drive chưa xác nhận đủ dung lượng hoặc đúng thư mục nhận bài.",
    );
  return {
    success: true,
    complete: true,
    files: [
      {
        id: file.id,
        name: file.name,
        size: Number(file.size),
        url:
          file.webViewLink ||
          "https://drive.google.com/file/d/" +
            encodeURIComponent(file.id) +
            "/view",
      },
    ],
  };
}

function validSessionUrl_(url) {
  return (
    typeof url === "string" &&
    /^https:\/\/www\.googleapis\.com\/upload\/drive\/v3\/files\?[^#]*\bupload_id=[a-zA-Z0-9._~%-]+(?:&[^#]*)?$/.test(
      url,
    )
  );
}

function signTicket_(data) {
  var payload = Utilities.base64EncodeWebSafe(
    JSON.stringify(data),
    Utilities.Charset.UTF_8,
  );
  var signature = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(payload, uploadSecret_()),
  );
  return payload + "." + signature;
}

function readTicket_(value) {
  if (typeof value !== "string" || value.length > 8192)
    throw new Error("Phiên tải lên không hợp lệ.");
  var parts = value.split(".");
  if (parts.length !== 2) throw new Error("Phiên tải lên không hợp lệ.");
  var expected = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(parts[0], uploadSecret_()),
  );
  var difference = parts[1].length ^ expected.length;
  for (var i = 0; i < expected.length; i++)
    difference |= expected.charCodeAt(i) ^ (parts[1].charCodeAt(i) || 0);
  if (difference) throw new Error("Phiên tải lên không hợp lệ.");
  var ticket = JSON.parse(
    Utilities.newBlob(
      Utilities.base64DecodeWebSafe(parts[0]),
    ).getDataAsString(),
  );
  if (
    !validSessionUrl_(ticket.sessionUrl) ||
    !Number.isInteger(ticket.size) ||
    ticket.size < 0 ||
    ticket.size > UPLOAD_MAX_SIZE ||
    ticket.folderId !== UPLOAD_FOLDER_ID ||
    !Number.isFinite(ticket.issuedAt) ||
    Date.now() - ticket.issuedAt > 7 * 24 * 60 * 60 * 1000 ||
    ticket.issuedAt > Date.now() + 60000
  )
    throw new Error(
      "Phiên tải lên đã hết hạn hoặc không hợp lệ. Vui lòng chọn và gửi lại file chưa hoàn tất.",
    );
  return ticket;
}

function uploadSecret_() {
  var properties = PropertiesService.getScriptProperties();
  var secret = properties.getProperty("UPLOAD_SIGNING_SECRET");
  if (secret) return secret;
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    secret = properties.getProperty("UPLOAD_SIGNING_SECRET");
    if (!secret) {
      secret = Utilities.getUuid() + Utilities.getUuid();
      properties.setProperty("UPLOAD_SIGNING_SECRET", secret);
    }
    return secret;
  } finally {
    lock.releaseLock();
  }
}

function driveFetch_(url, options) {
  options.muteHttpExceptions = true;
  options.followRedirects = false;
  try {
    return UrlFetchApp.fetch(url, options);
  } catch (_) {
    var error = new Error("Kết nối Google Drive bị gián đoạn.");
    error.retryable = true;
    throw error;
  }
}

function responseHeader_(response, name) {
  var headers = response.getHeaders();
  for (var key in headers)
    if (key.toLowerCase() === name) return String(headers[key]);
  return "";
}

function throwDriveError_(response) {
  var code = response.getResponseCode();
  var error = new Error(
    code === 404 || code === 410
      ? "Phiên tải lên đã hết hạn. Vui lòng gửi lại file chưa hoàn tất."
      : "Google Drive chưa nhận được bài (HTTP " + code + ").",
  );
  error.retryable = code === 429 || code >= 500;
  throw error;
}

// Chạy một lần trong trình soạn thảo để cấp quyền trước khi triển khai.
function authorizeUpload() {
  DriveApp.getFolderById(UPLOAD_FOLDER_ID).getName();
  uploadSecret_();
  var response = driveFetch_(
    "https://www.googleapis.com/drive/v3/about?fields=user",
    { headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() } },
  );
  if (response.getResponseCode() !== 200) throwDriveError_(response);
}

function jsonResponse(data) {
  data.protocol = UPLOAD_PROTOCOL;
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
