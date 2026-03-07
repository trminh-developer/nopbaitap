//  ⚠️  THAY URL NÀY bằng Apps Script / backend
const DRIVE_ENDPOINT = "https://script.google.com/macros/s/AKfycbyA6PvKq4qn3T3Tw18Q7GFFKNh0GP9jj_ED7olgDYno/exec";

//  Drag & Drop 
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
let selectedFiles = [];

dropzone.addEventListener("dragover", e => { e.preventDefault(); dropzone.classList.add("drag-over"); });
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"));
dropzone.addEventListener("drop", e => {
    e.preventDefault();
    dropzone.classList.remove("drag-over");
    addFiles([...e.dataTransfer.files]);
});

fileInput.addEventListener("change", () => addFiles([...fileInput.files]));

function addFiles(newFiles) {
    newFiles.forEach(f => {
        if (!selectedFiles.find(x => x.name === f.name && x.size === f.size)) {
            selectedFiles.push(f);
        }
    });
    renderFileList();
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    renderFileList();
}

function renderFileList() {
    const list = document.getElementById("fileList");
    list.innerHTML = "";
    selectedFiles.forEach((f, i) => {
        const ext = f.name.split(".").pop().toLowerCase();
        const emoji = {
            pdf: "📄", doc: "📝", docx: "📝", xls: "📊", xlsx: "📊",
            ppt: "📑", pptx: "📑", zip: "🗜️", jpg: "🖼️", png: "🖼️"
        }[ext] || "📎";
        const size = f.size > 1048576
            ? (f.size / 1048576).toFixed(1) + " MB"
            : (f.size / 1024).toFixed(0) + " KB";

        list.innerHTML += `
        <div class="file-item">
          <span class="file-icon">${emoji}</span>
          <div class="file-info">
            <div class="file-name">${f.name}</div>
            <div class="file-size">${size}</div>
          </div>
          <button class="remove-btn" onclick="removeFile(${i})">✕</button>
        </div>`;
    });
}

//  Submit 
async function handleSubmit() {
    const name = document.getElementById("fullname").value.trim();
    const email = document.getElementById("email").value.trim();
    const note = document.getElementById("note").value.trim();

    if (!name) return showToast("Vui lòng nhập họ tên!", "error");
    if (!email) return showToast("Vui lòng nhập email!", "error");
    if (!selectedFiles.length) return showToast("Chưa có file nào được chọn!", "error");

    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    btn.textContent = "⏳  Đang tải lên...";

    // Giả lập progress bar
    showProgress(0);
    let prog = 0;
    const fakeProgress = setInterval(() => {
        prog = Math.min(prog + Math.random() * 15, 85);
        showProgress(prog);
    }, 300);

    try {
        // Chuyển file → base64 (tránh lỗi CORS với FormData)
        const toBase64 = f => new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result.split(",")[1]);
            r.onerror = rej;
            r.readAsDataURL(f);
        });

        const filesBase64 = await Promise.all(
            selectedFiles.map(async f => ({
                name: f.name,
                type: f.type || "application/octet-stream",
                data: await toBase64(f)
            }))
        );

        const payload = { name, email, note, files: filesBase64 };

        const res = await fetch(DRIVE_ENDPOINT, {
            method: "POST",
            body: JSON.stringify(payload)
            // Không set Content-Type để tránh CORS preflight
        });

        const result = await res.json();
        if (result.status !== "success") throw new Error(result.message || "Upload thất bại");

        clearInterval(fakeProgress);
        showProgress(100);
        showToast("✅ Nộp bài thành công!", "success");

        // Reset form
        setTimeout(() => {
            selectedFiles = [];
            renderFileList();
            document.getElementById("fullname").value = "";
            document.getElementById("email").value = "";
            document.getElementById("note").value = "";
            hideProgress();
            btn.disabled = false;
            btn.innerHTML = "☁️ &nbsp;Nộp bài";
        }, 1500);

    } catch (err) {
        clearInterval(fakeProgress);
        hideProgress();
        showToast("❌ " + err.message, "error");
        btn.disabled = false;
        btn.innerHTML = "☁️ &nbsp;Nộp bài";
    }
}

//  Progress helpers 
function showProgress(pct) {
    document.getElementById("progressWrap").classList.add("show");
    document.getElementById("progressFill").style.width = pct + "%";
}
function hideProgress() {
    document.getElementById("progressWrap").classList.remove("show");
    document.getElementById("progressFill").style.width = "0%";
}

//  Toast 
function showToast(msg, type = "success") {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.className = `toast ${type} show`;
    setTimeout(() => t.classList.remove("show"), 3500);
}