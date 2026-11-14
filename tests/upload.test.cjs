const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const student = {
  studentName: "Nguyễn Văn A",
  studentId: "SV001",
  studentClass: "AI25DA",
  course: "Lập trình Web",
};
function makeFile(size = 2, virtual = false) {
  return {
    name: "baitap.txt",
    type: "text/plain",
    size,
    mimeType: "text/plain",
    slice(start, end) {
      return {
        size: end - start,
        base64: virtual ? "aGk=" : Buffer.alloc(end - start).toString("base64"),
      };
    },
  };
}
const file = makeFile();
const receipt = (id) => ({
  id,
  name: "baitap.txt",
  url: "https://drive.google.com/file/d/" + id + "/view",
});

function backend(options = {}) {
  const created = [];
  const properties = new Map([["UPLOAD_SIGNING_SECRET", "test-secret"]]);
  const response = (code, data = {}, headers = {}) => ({
    getResponseCode: () => code,
    getContentText: () => JSON.stringify(data),
    getHeaders: () => headers,
  });
  const metadata = (entry) => ({
    id: entry.id,
    name: entry.name,
    size: String(options.wrongSize ? entry.size + 1 : entry.size),
    parents: [options.wrongFolder ? "other-folder" : entry.folder],
    webViewLink: receipt(entry.id).url,
  });
  const context = {
    DriveApp: {
      getFolderById() {
        if (options.denied) throw new Error("Access denied");
        return { getName: () => "Assignments" };
      },
    },
    ScriptApp: { getOAuthToken: () => "test-token" },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => properties.get(key),
        setProperty: (key, value) => properties.set(key, value),
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: {
      Charset: { UTF_8: "UTF-8" },
      getUuid: () => crypto.randomUUID(),
      base64Decode: (value) => Buffer.from(value, "base64"),
      base64DecodeWebSafe: (value) => Buffer.from(value, "base64url"),
      base64EncodeWebSafe: (value) => Buffer.from(value).toString("base64url"),
      computeHmacSha256Signature: (value, key) =>
        crypto.createHmac("sha256", key).update(value).digest(),
      newBlob: (bytes) => ({
        getDataAsString: () => Buffer.from(bytes).toString("utf8"),
      }),
    },
    UrlFetchApp: {
      fetch(url, request) {
        if (request.method === "post") {
          const meta = JSON.parse(request.payload);
          const id = "file_" + (created.length + 1);
          created.push({
            id,
            name: meta.name,
            description: meta.description,
            folder: meta.parents[0],
            size: Number(request.headers["X-Upload-Content-Length"]),
            offset: 0,
            chunks: [],
            done: false,
          });
          return response(
            200,
            {},
            {
              Location:
                "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=" +
                id,
            },
          );
        }
        const id = new URL(url).searchParams.get("upload_id");
        const entry = created.find((item) => item.id === id);
        if (!entry) return response(404);
        if (
          options.failAfter !== undefined &&
          created.indexOf(entry) >= options.failAfter
        )
          return response(403);
        if (entry.done) return response(200, metadata(entry));
        if (request.payload !== "") {
          const bytes = request.payload;
          if (!entry.size && request.headers["Content-Range"] === "bytes */0")
            entry.done = true;
          else {
            const range = request.headers["Content-Range"].match(
              /^bytes (\d+)-(\d+)\/(\d+)$/,
            );
            if (
              !range ||
              Number(range[1]) !== entry.offset ||
              Number(range[3]) !== entry.size ||
              Number(range[2]) - Number(range[1]) + 1 !== bytes.length
            )
              return response(400);
            entry.offset += bytes.length;
            entry.chunks.push(bytes.length);
            entry.done = entry.offset === entry.size;
          }
        }
        return entry.done
          ? response(200, metadata(entry))
          : response(
              308,
              {},
              entry.offset ? { Range: "bytes=0-" + (entry.offset - 1) } : {},
            );
      },
    },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput(text) {
        return {
          text,
          setMimeType() {
            return this;
          },
        };
      },
    },
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "GoogleAppsScript.gs"), "utf8"),
    context,
  );
  return {
    created,
    context,
    post: (body) =>
      JSON.parse(
        context.doPost({
          postData: { contents: JSON.stringify({ action: "start", ...body }) },
        }).text,
      ),
  };
}

function client(fetch, reads = []) {
  const context = {
    URL,
    fetch,
    setTimeout: (callback) => {
      callback();
    },
    FileReader: class {
      readAsDataURL(input) {
        reads.push(input.size);
        this.result = "data:application/octet-stream;base64," + input.base64;
        this.onload();
      }
    },
  };
  if (fetch) {
    context.axios = {
      post: async (url, data, config = {}) => {
        const res = await fetch(url, {
          method: "POST",
          headers: config.headers || {},
          body: data,
        });
        const status = res.status !== undefined ? res.status : (res.ok ? 200 : 500);
        let textData = "";
        if (status >= 200 && status < 300 && res.json) {
          try {
            const j = await res.json();
            textData = JSON.stringify(j);
          } catch (_) {
            textData = "Invalid JSON response";
          }
        }
        return {
          status,
          data: textData,
          headers: res.headers || {},
        };
      },
    };
  }
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "frontend/upload-core.js"), "utf8"),
    context,
  );
  return context.UploadCore;
}

for (const files of [undefined, [], "file", { length: 1 }]) {
  test(
    "backend rejects missing, empty or non-array files: " +
      JSON.stringify(files),
    () => {
      const api = backend();
      assert.equal(api.post({ ...student, files }).success, false);
      assert.equal(api.created.length, 0);
    },
  );
}
test("backend validates all files before writing any of them", () => {
  const api = backend();
  assert.equal(
    api.post({ ...student, files: [file, { name: "broken.txt" }] }).success,
    false,
  );
  assert.equal(api.created.length, 0);
});
test("backend reports Drive permission errors", () => {
  const result = backend({ denied: true }).post({ ...student, files: [file] });
  assert.equal(result.success, false);
  assert.match(result.message, /Access denied/);
});
test("client preserves receipts for earlier files when a later Drive upload fails", async () => {
  const api = backend({ failAfter: 1 });
  const core = client(async (_url, request) => ({
    ok: true,
    json: async () => api.post(JSON.parse(request.body)),
  }));
  await assert.rejects(
    core.sendSubmission("https://example.invalid", student, [
      file,
      { ...file, name: "second.txt" },
    ]),
    (error) => {
      assert.equal(error.uploadedFiles.length, 1);
      assert.equal(error.uploadedFiles[0].sourceIndex, 0);
      return true;
    },
  );
});
test("backend accepts Student ID and includes it in the saved filename", () => {
  const api = backend();
  const result = api.post({ ...student, files: [file] });
  assert.equal(result.success, true);
  assert.equal(result.stage, "ready");
  assert.equal(result.files, undefined);
  assert.match(api.created[0].name, /SV001/);
  assert.equal(api.created[0].done, false);
});
test("client rejects success without file receipts", () => {
  assert.throws(
    () => client().validateResponse({ success: true, files: [] }, 1),
    /Chưa xác nhận/,
  );
});
test("client rejects partial and duplicate file receipts", () => {
  const core = client();
  assert.throws(() =>
    core.validateResponse({ success: true, files: [receipt("one")] }, 2),
  );
  assert.throws(() =>
    core.validateResponse(
      { success: true, files: [receipt("one"), receipt("one")] },
      2,
    ),
  );
});
test("client requires boolean success and an actual Drive file link", () => {
  const core = client();
  assert.throws(() =>
    core.validateResponse({ success: "true", files: [receipt("one")] }, 1),
  );
  for (const url of [
    "javascript:alert(1)",
    "https://evil.example/file/d/one",
    "https://drive.google.com/drive/folders/one",
  ]) {
    assert.throws(() =>
      core.validateResponse(
        { success: true, files: [{ name: "file", url }] },
        1,
      ),
    );
  }
});
test("file selection enforces size, count and deduplication", () => {
  const core = client();
  const oversized = { ...file, name: "big.zip", size: 1073741825 };
  const selected = core.mergeFiles([file], [file, oversized]);
  assert.equal(selected.files.length, 1);
  assert.equal(selected.warnings.length, 1);
  assert.equal(
    core.mergeFiles([], [{ ...file, size: 1073741824 }]).files.length,
    1,
  );
  assert.equal(
    core.mergeFiles(
      [],
      Array.from({ length: 11 }, (_, i) => ({ ...file, name: i + ".txt" })),
    ).files.length,
    10,
  );
});
test("client-to-script chunked contract confirms the actual Drive file", async () => {
  const api = backend();
  const stages = [];
  const core = client(async (_url, request) => {
    assert.equal(request.method, "POST");
    assert.match(request.headers["Content-Type"], /^text\/plain/);
    return { ok: true, json: async () => api.post(JSON.parse(request.body)) };
  });
  const result = await core.sendSubmission(
    "https://example.invalid",
    student,
    [file],
    (value) => stages.push(value),
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "file_1");
  assert.equal(stages[0], 1);
  assert.equal(stages.at(-1), 100);
  assert.equal(api.created[0].offset, file.size);
});
test("HTTP 200 with no saved file never reaches 100 percent", async () => {
  const stages = [];
  const core = client(async (_url, request) => ({
    ok: true,
    json: async () =>
      JSON.parse(request.body).action === "start"
        ? {
            protocol: "resumable-v3",
            success: true,
            stage: "ready",
            uploads: [{ ticket: "test", size: 2 }],
          }
        : {
            protocol: "resumable-v3",
            success: true,
            complete: true,
            files: [],
          },
  }));
  await assert.rejects(
    core.sendSubmission("https://example.invalid", student, [file], (value) =>
      stages.push(value),
    ),
    /Chưa xác nhận/,
  );
  assert.equal(stages.includes(100), false);
});
test("an HTTP error cannot be treated as successful upload", async () => {
  const core = client(async () => ({
    ok: false,
    status: 500,
    json: async () => ({ success: true, files: [receipt("one")] }),
  }));
  await assert.rejects(
    core.sendSubmission("https://example.invalid", student, [file]),
    /HTTP 500/,
  );
});

test("an HTML 404 is reported as a missing API before attempting JSON parsing", async () => {
  let parsed = false;
  const core = client(async () => ({ ok: false, status: 404, json: async () => { parsed = true; throw new SyntaxError('HTML response'); } }));
  await assert.rejects(core.sendSubmission('https://example.invalid', student, [file]), error => {
    assert.match(error.message, /Không tìm thấy API.*HTTP 404/);
    assert.equal(error.retryable, false);
    return true;
  });
  assert.equal(parsed, false);
});

test("access-denied API errors are reported distinctly", async () => {
  const core = client(async () => ({ ok: false, status: 403 }));
  await assert.rejects(core.sendSubmission('https://example.invalid', student, [file]), /chưa cho phép truy cập.*HTTP 403/);
});

test("an unreachable API at startup is not reported as a definite network interruption", async () => {
  const core = client(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(core.sendSubmission('https://example.invalid', student, [file]), error => {
    assert.equal(error.code, 'API_UNREACHABLE');
    assert.match(error.message, /Địa chỉ API hoặc quyền truy cập/);
    assert.equal(error.retryable, false);
    return true;
  });
});

test("GET health reports the deployed protocol without creating Drive files", () => {
  const api = backend();
  const data = JSON.parse(api.context.doGet().text);
  assert.equal(data.service, 'nop-bai');
  assert.equal(data.status, 'online');
  assert.equal(data.protocol, 'resumable-v3');
  assert.equal(data.maxFileSize, 1073741824);
  assert.equal(api.created.length, 0);
});

test("backend rejects missing Student ID and validates the 1 GB boundary", () => {
  const api = backend();
  for (const studentId of ["", " ", undefined, "x".repeat(65)])
    assert.equal(
      api.post({ ...student, studentId, files: [file] }).success,
      false,
    );
  assert.equal(
    api.post({ ...student, files: [{ ...file, size: 1073741825 }] }).success,
    false,
  );
  assert.equal(
    api.post({ ...student, files: [{ ...file, size: 1073741824 }] }).success,
    true,
  );
});

test("a file larger than one chunk uses bounded reads and exact ranges", async () => {
  const api = backend();
  const reads = [];
  const core = client(
    async (_url, request) => ({
      ok: true,
      json: async () => api.post(JSON.parse(request.body)),
    }),
    reads,
  );
  const result = await core.sendSubmission("https://example.invalid", student, [
    makeFile(8 * 1024 * 1024 + 3),
  ]);
  assert.equal(result[0].size, 8 * 1024 * 1024 + 3);
  assert.deepEqual(reads, [8 * 1024 * 1024, 3]);
  assert.deepEqual(api.created[0].chunks, reads);
});

test("1 GB virtual file is read in 128 bounded chunks instead of one allocation", async () => {
  const reads = [];
  let chunks = 0;
  const core = client(async (_url, request) => {
    const data = JSON.parse(request.body);
    if (data.action === "start")
      return {
        ok: true,
        json: async () => ({
          protocol: "resumable-v3",
          success: true,
          stage: "ready",
          uploads: [{ ticket: "test", size: 1073741824 }],
        }),
      };
    chunks++;
    const uploadedBytes = Math.min(data.offset + 8 * 1024 * 1024, 1073741824);
    return {
      ok: true,
      json: async () => ({
        protocol: "resumable-v3",
        success: true,
        complete: uploadedBytes === 1073741824,
        uploadedBytes,
        files: [{ ...receipt("large"), size: 1073741824 }],
      }),
    };
  }, reads);
  await core.sendSubmission("https://example.invalid", student, [
    makeFile(1073741824, true),
  ]);
  assert.equal(chunks, 128);
  assert.equal(reads.length, 128);
  assert.equal(Math.max(...reads), 8 * 1024 * 1024);
});

test("lost completion response queries Drive status without sending the file twice", async () => {
  const api = backend();
  const actions = [];
  let lost = false;
  const core = client(async (_url, request) => {
    const data = JSON.parse(request.body);
    actions.push(data.action);
    const result = api.post(data);
    if (data.action === "chunk" && !lost) {
      lost = true;
      throw new Error("Network disconnected");
    }
    return { ok: true, json: async () => result };
  });
  const result = await core.sendSubmission("https://example.invalid", student, [
    file,
  ]);
  assert.equal(result.length, 1);
  assert.deepEqual(actions, ["start", "chunk", "status"]);
  assert.equal(api.created[0].chunks.length, 1);
});

test("backend rejects modified or expired upload tickets", () => {
  const api = backend();
  const ticket = api.post({ ...student, files: [file] }).uploads[0].ticket;
  const parts = ticket.split(".");
  const forged = Buffer.from(parts[0], "base64url");
  const data = JSON.parse(forged.toString());
  data.size = 1073741825;
  const tampered =
    Buffer.from(JSON.stringify(data)).toString("base64url") + "." + parts[1];
  assert.equal(api.post({ action: "status", ticket: tampered }).success, false);
  data.size = 2;
  data.issuedAt = Date.now() - 8 * 86400000;
  assert.equal(
    api.post({ action: "status", ticket: api.context.signTicket_(data) })
      .success,
    false,
  );
});

test("backend rejects oversized chunks before sending bytes to Drive", () => {
  const api = backend();
  const ticket = api.post({
    ...student,
    files: [{ ...file, size: 1073741824 }],
  }).uploads[0].ticket;
  const result = api.post({
    action: "chunk",
    ticket,
    offset: 0,
    base64: "a".repeat(Math.ceil((8 * 1024 * 1024) / 3) * 4 + 1),
  });
  assert.equal(result.success, false);
  assert.equal(api.created[0].offset, 0);
});

for (const option of ["wrongSize", "wrongFolder"])
  test("Drive completion rejects " + option, async () => {
    const api = backend({ [option]: true });
    const core = client(async (_url, request) => ({
      ok: true,
      json: async () => api.post(JSON.parse(request.body)),
    }));
    await assert.rejects(
      core.sendSubmission("https://example.invalid", student, [file]),
      /chưa xác nhận/,
    );
  });

for (const protocol of [undefined, "resumable-v1", "resumable-v2"])
  test(
    "an old deployed script produces a clear update error: " + protocol,
    async () => {
      const core = client(async () => ({
        ok: true,
        json: async () => ({
          protocol,
          success: true,
          stage: "ready",
          uploads: [{ ticket: "old", size: 2 }],
        }),
      }));
      await assert.rejects(
        core.sendSubmission("https://example.invalid", student, [file]),
        /chưa được cập nhật/,
      );
    },
  );

test("zero-byte files can be completed without an invalid negative range", async () => {
  const api = backend();
  const core = client(async (_url, request) => ({
    ok: true,
    json: async () => api.post(JSON.parse(request.body)),
  }));
  const result = await core.sendSubmission("https://example.invalid", student, [
    makeFile(0),
  ]);
  assert.equal(result[0].size, 0);
});


test("backend validates the class before starting uploads", () => {
  for (const studentClass of ["", " ", undefined, "x".repeat(65), "AI25\nDA"]) {
    const api = backend();
    assert.equal(api.post({ ...student, studentClass, files: [file] }).success, false);
    assert.equal(api.created.length, 0);
  }
});

test("backend saves the normalized class and free-text course", () => {
  const api = backend();
  const result = api.post({ ...student, studentClass: " ai25da ", course: "Lập trình Python\nChương 1", files: [file] });
  assert.equal(result.success, true);
  assert.match(api.created[0].name, /^\[AI25DA\]-\[Lập trình Python Chương 1\]/);
  assert.match(api.created[0].description, /Lớp: AI25DA/);
  assert.match(api.created[0].description, /Học phần: Lập trình Python Chương 1/);
});

test("client only sends the current student fields", async () => {
  const api = backend();
  let start;
  const core = client(async (_url, request) => {
    const data = JSON.parse(request.body);
    if (data.action === "start") start = data;
    return { ok: true, json: async () => api.post(data) };
  });
  await core.sendSubmission("https://example.invalid", { ...student, faculty: "unused", studentMajor: "unused", extra: "unused" }, [file]);
  assert.deepEqual(Object.keys(start).sort(), ["action", "course", "files", "studentClass", "studentId", "studentName"]);
});

test("client rejects an empty class before sending data", async () => {
  let requests = 0;
  const core = client(async () => { requests++; throw new Error("Should not send"); });
  await assert.rejects(core.sendSubmission("https://example.invalid", { ...student, studentClass: " " }, [file]), /nhập lớp/);
  assert.equal(requests, 0);
});


function formHarness({ omitScripts = [], missingIds = [] } = {}) {
  class Element {
    constructor() {
      this.value = ""; this.disabled = false; this.hidden = false;
      this.children = []; this.listeners = {}; this.dataset = {}; this.style = {};
      this.classList = { remove() {}, toggle() {} };
    }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    addEventListener(event, handler) { (this.listeners[event] ||= []).push(handler); }
    removeAttribute() {}
    setAttribute() {}
    focus() {}
    dispatch(event, details = {}) {
      return Promise.all((this.listeners[event] || []).map(handler => handler({ target: this, preventDefault() {}, ...details })));
    }
  }
  const html = fs.readFileSync(path.join(root, "frontend/index.html"), "utf8");
  const elements = new Map();
  for (const match of html.matchAll(/<([a-z][\w:-]*)\b([^>]*\bid="([^"]+)"[^>]*)>/gi)) {
    const element = new Element();
    element.tagName = match[1].toUpperCase();
    element.type = (match[2].match(/\btype="([^"]+)"/) || [null, "text"])[1];
    element.disabled = /(?:^|\s)disabled(?:\s|=|$)/.test(match[2]);
    element.hidden = /(?:^|\s)hidden(?:\s|=|$)/.test(match[2]);
    elements.set(match[3], element);
  }
  for (const id of missingIds) elements.delete(id);
  elements.get("uploadForm").reset = () => {
    for (const id of ["studentName", "studentId", "studentClass", "course"]) if (elements.has(id)) elements.get(id).value = "";
  };
  const api = backend();
  const context = {
    document: { getElementById: id => elements.get(id), createElement: () => new Element() },
    bootstrap: { Modal: class {
      constructor(element) { this.element = element; }
      show() { this.element.dispatch("shown.bs.modal"); }
      hide() { this.element.dispatch("hidden.bs.modal"); }
    } },
    URL,
    location: { href: "http://localhost/" },
    navigator: { userAgent: "node" },
    setTimeout: callback => callback(),
    fetch: async (_url, request) => ({ ok: true, json: async () => api.post(JSON.parse(request.body)) }),
    FileReader: class {
      readAsDataURL(input) { this.result = "data:application/octet-stream;base64," + input.base64; this.onload(); }
    }
  };
  context.window = context;
  context.globalThis = context;
  const scripts = Array.from(html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/gi), match => match[1])
    .filter(src => !/^(?:https?:)?\/\//i.test(src)).map(src => src.split(/[?#]/)[0]);
  for (const script of scripts.filter(src => !omitScripts.includes(src))) {
    vm.runInNewContext(fs.readFileSync(path.join(root, "frontend", script), "utf8"), context);
  }
  if (context.axios) {
    context.axios.post = async (_url, data) => ({
      status: 200,
      data: JSON.stringify(api.post(JSON.parse(data))),
    });
  }
  return { get: id => elements.get(id), api };
}

function fillSubmission(form) {
  form.get("studentName").value = student.studentName;
  form.get("studentId").value = student.studentId;
  form.get("studentClass").value = " ai25da ";
  form.get("course").value = "Lập trình Python - Chương 1";
  form.get("fileInput").files = [file];
  form.get("fileInput").dispatch("change");
}

test("form starts with text inputs for class and course", () => {
  const form = formHarness();
  assert.equal(form.get("studentClass").tagName, "INPUT");
  assert.equal(form.get("studentClass").type, "text");
  assert.equal(form.get("studentClass").disabled, false);
  assert.equal(form.get("course").tagName, "INPUT");
  assert.equal(form.get("course").type, "text");
  assert.equal(form.get("faculty"), undefined);
  assert.equal(form.get("studentMajor"), undefined);
  assert.equal(form.get("formFields").disabled, false);
  assert.equal(form.get("appError").hidden, true);
});

test("confirmation uses the entered class and free-text course", () => {
  const form = formHarness();
  fillSubmission(form);
  form.get("uploadForm").dispatch("submit");
  const values = form.get("confirmDetails").children.map(element => element.textContent);
  assert.equal(values.includes("Lớp"), true);
  assert.equal(values.includes("AI25DA"), true);
  assert.equal(values.includes("Lập trình Python - Chương 1"), true);
  assert.equal(values.includes("Khoa"), false);
  assert.equal(values.includes("Ngành"), false);
  assert.equal(form.get("studentClass").value, "AI25DA");
});

test("the simplified form completes an upload and resets", async () => {
  const form = formHarness();
  fillSubmission(form);
  await form.get("uploadForm").dispatch("submit");
  await form.get("confirmSubmit").dispatch("click");
  assert.equal(form.get("resultTitle").textContent, "Nộp bài thành công!");
  assert.equal(form.get("formFields").disabled, false);
  assert.equal(form.get("fileSection").hidden, true);
  assert.equal(form.get("studentClass").disabled, false);
  assert.equal(form.get("studentClass").value, "");
  assert.equal(form.get("course").value, "");
  assert.equal(form.api.created[0].done, true);
});

test("a missing upload script disables submission with an accurate message", () => {
  const form = formHarness({ omitScripts: ["upload-core.js"] });
  assert.equal(form.get("appError").hidden, false);
  assert.match(form.get("appError").textContent, /chức năng nộp bài/);
  assert.equal(form.get("formFields").disabled, true);
});

test("an incomplete HTML form fails clearly during startup", () => {
  const form = formHarness({ missingIds: ["studentClass"] });
  assert.equal(form.get("appError").hidden, false);
  assert.match(form.get("appError").textContent, /phiên bản cũ/);
  assert.equal(form.get("formFields").disabled, true);
});
