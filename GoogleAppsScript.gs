function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var studentName = data.studentName || "NoName";
    var studentClass = data.studentClass || "NoClass";
    var course = data.course || "NoCourse";
    var files = data.files || [];
    
    // Thay ID thư mục Drive của bạn vào đây:
    var FOLDER_ID = "1fDd3ajTrj-DZvHM6_hCBXDLzhICMuZq3"; 
    var folder = DriveApp.getFolderById(FOLDER_ID);
    
    var uploadedIds = [];
    
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      var base64Data = f.base64.split(',')[1] || f.base64;
      var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), f.mimeType, "[" + studentClass + "]-[" + course + "] " + studentName + "_" + f.name);
      
      var file = folder.createFile(blob);
      uploadedIds.push({
        name: file.getName(),
        url: file.getUrl()
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Thành công!",
      files: uploadedIds
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Hàm này để xử lý lỗi CORS (Bắt buộc phải có)
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON);
}
