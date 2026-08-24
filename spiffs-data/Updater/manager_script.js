window.addEventListener("load", function() {
  loadManagerData();
  var uploadDir = document.getElementById("upload_dir");
  if (uploadDir) {
    uploadDir.addEventListener("change", toggleCustomUploadDir);
  }
});

async function loadManagerData() {
  var payload;
  try {
    var response = await fetch("/manager/api", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }
    payload = await response.text();
  } catch (error) {
    showPageError("Manager-Daten konnten nicht geladen werden (" + error.message + ").");
    return;
  }

  try {
    updateGUI(payload);
  } catch (error) {
    showPageError("Manager-Anzeige fehlgeschlagen (" + error.message + ").");
  }
}

function showPageError(message) {
  var container = document.querySelector(".manager-container");
  if (!container) return;
  var alert = document.createElement("div");
  alert.className = "alert alert-danger";
  alert.textContent = message;
  container.insertBefore(alert, container.firstChild.nextSibling);
}

function toggleCustomUploadDir() {
  var customInput = document.getElementById("upload_dir_custom");
  customInput.style.display =
    document.getElementById("upload_dir").value === "__custom__" ? "block" : "none";
}

function collectDirectories(files) {
  var dirs = { "/": true };
  for (var i = 0; i < files.length; i++) {
    var path = files[i].path;
    var lastSlash = path.lastIndexOf("/");
    if (lastSlash > 0) {
      dirs[path.substring(0, lastSlash)] = true;
    }
  }
  return Object.keys(dirs).sort();
}

function populateUploadDirectories(files) {
  var select = document.getElementById("upload_dir");
  var selectedValue = select.value;
  while (select.options.length > 0) {
    select.remove(0);
  }

  var directories = collectDirectories(files);
  for (var i = 0; i < directories.length; i++) {
    var dir = directories[i];
    var opt = document.createElement("option");
    opt.value = dir;
    opt.innerHTML = dir === "/" ? "/ (Root)" : dir;
    select.appendChild(opt);
  }

  var customOpt = document.createElement("option");
  customOpt.value = "__custom__";
  customOpt.innerHTML = "Eigener Ordner...";
  select.appendChild(customOpt);

  if (selectedValue && Array.from(select.options).some(function(option) {
    return option.value === selectedValue;
  })) {
    select.value = selectedValue;
  } else if (directories.indexOf("/Updater") >= 0) {
    select.value = "/Updater";
  } else {
    select.value = "/";
  }
  toggleCustomUploadDir();
}

function normalizeUploadDir(dir) {
  if (!dir || dir === "/") {
    return "/";
  }
  dir = dir.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!dir || dir.indexOf("..") >= 0) {
    return "/";
  }
  return "/" + dir;
}

function getUploadDir() {
  var select = document.getElementById("upload_dir");
  if (select.value === "__custom__") {
    return normalizeUploadDir(document.getElementById("upload_dir_custom").value);
  }
  return normalizeUploadDir(select.value);
}

function ensureFileTable() {
  var tableBody = document.getElementById("file-table-body");
  if (tableBody) {
    return tableBody;
  }

  var table = document.getElementById("table");
  if (table) {
    tableBody = table.querySelector("tbody");
    if (!tableBody) {
      tableBody = document.createElement("tbody");
      tableBody.id = "file-table-body";
      table.appendChild(tableBody);
    }
    return tableBody;
  }

  var anchor = document.getElementById("info_storage");
  if (!anchor || !anchor.parentNode) {
    return null;
  }

  var host = document.createElement("div");
  host.className = "table-responsive";
  host.id = "file-table-host";
  host.innerHTML =
    '<table class="table table-sm table-hover mb-0" id="table">' +
    '<thead class="thead-light"><tr>' +
    "<th>Datei</th><th>Pfad</th><th class=\"text-right\">Groesse</th>" +
    "</tr></thead>" +
    '<tbody id="file-table-body"></tbody></table>';
  anchor.parentNode.insertBefore(host, anchor.nextSibling);
  return document.getElementById("file-table-body");
}

function requireElement(id, label) {
  var element = document.getElementById(id);
  if (!element) {
    throw new Error(label + " fehlt in manager.html (Datei auf dem Geraet neu hochladen)");
  }
  return element;
}

function updateStorageBar(result) {
  var bar = document.getElementById("storage-progress");
  var badge = document.getElementById("storage-badge");
  if (!bar || !badge) {
    return;
  }

  var used = result.storage.used_bytes_raw || 0;
  var total = result.storage.total_bytes_raw || 0;
  var percent = total > 0 ? (used / total) * 100 : 0;
  var label = percent < 1 && used > 0
    ? percent.toFixed(1) + "%"
    : Math.round(percent) + "%";
  var barWidth = used > 0 ? Math.max(percent, 4) : 0;

  bar.style.width = barWidth + "%";
  bar.textContent = label;
  bar.setAttribute("aria-valuenow", percent.toFixed(1));
  badge.textContent = label + " belegt";

  if (percent >= 90) {
    bar.className = "progress-bar bg-danger";
  } else if (percent >= 75) {
    bar.className = "progress-bar bg-warning";
  } else {
    bar.className = "progress-bar bg-success";
  }
}

function updateGUI(response) {
  var result = JSON.parse(response);
  var files = Array.isArray(result.files) ? result.files : [];

  if (result.error) {
    showPageError("Dateiliste unvollstaendig (" + result.error + ").");
  }

  var infoStorage = requireElement("info_storage", "Speicher-Info");
  var text = infoStorage.innerHTML;
  text = text.replace("#SPIFFS_TOTAL_BYTES", result.storage.SPIFFS_TOTAL_BYTES);
  text = text.replace("#SPIFFS_USED_BYTES", result.storage.SPIFFS_USED_BYTES);
  text = text.replace("#SPIFFS_FREE_BYTES", result.storage.SPIFFS_FREE_BYTES);
  infoStorage.innerHTML = text;
  updateStorageBar(result);

  var tableBody = ensureFileTable();
  if (!tableBody) {
    throw new Error("Manager-Seite unvollstaendig (manager.html neu hochladen)");
  }
  tableBody.innerHTML = "";

  for (var i = 0; i < files.length; i++) {
    if (!files[i] || !files[i].path) {
      continue;
    }
    var row = document.createElement("tr");
    var nameCell = document.createElement("td");
    var pathCell = document.createElement("td");
    var sizeCell = document.createElement("td");

    nameCell.textContent = files[i].name;
    pathCell.innerHTML = "<code>" + files[i].path + "</code>";
    sizeCell.textContent = files[i].size;
    sizeCell.className = "text-right text-muted";

    row.appendChild(nameCell);
    row.appendChild(pathCell);
    row.appendChild(sizeCell);
    tableBody.appendChild(row);
  }

  populateUploadDirectories(files);

  var selectEdit = document.getElementById("edit_path");
  var selectDelete = document.getElementById("delete_path");

  while (selectEdit.options.length > 2) {
    selectEdit.remove(2);
  }
  while (selectDelete.options.length > 1) {
    selectDelete.remove(1);
  }

  for (var j = 0; j < files.length; j++) {
    if (!files[j] || !files[j].path) {
      continue;
    }
    var opt = document.createElement("option");
    opt.value = files[j].path;
    opt.textContent = files[j].name;
    selectEdit.appendChild(opt.cloneNode(true));
    selectDelete.appendChild(opt);
  }
}

function validateFormUpdate() {
  var inputElement = document.getElementById("update");
  var files = inputElement.files;
  if (files.length === 0) {
    alert("Bitte eine Firmware-Datei waehlen.");
    return false;
  }
  var value = inputElement.value;
  var dotIndex = value.lastIndexOf(".") + 1;
  var valueExtension = value.substring(dotIndex);
  if (valueExtension !== "bin") {
    alert("Nur .bin Dateien sind erlaubt.");
    return false;
  }
}

function validateFormUpload() {
  var inputElement = document.getElementById("upload_data");
  if (inputElement.files.length === 0) {
    alert("Bitte mindestens eine Datei waehlen.");
    return false;
  }
  return true;
}

async function startMultiFileUpload() {
  if (!validateFormUpload()) {
    return;
  }

  var inputElement = document.getElementById("upload_data");
  var files = inputElement.files;
  var submitButton = document.getElementById("upload_submit");
  var statusElement = document.getElementById("upload_status");
  var uploadDir = getUploadDir();

  if (document.getElementById("upload_dir").value === "__custom__" &&
      document.getElementById("upload_dir_custom").value.trim() === "") {
    alert("Bitte einen Zielordner eingeben.");
    return;
  }

  submitButton.disabled = true;

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    statusElement.textContent = "Upload " + (i + 1) + "/" + files.length + " nach " +
      uploadDir + ": " + file.name;

    var formData = new FormData();
    formData.append("upload_dir", uploadDir);
    formData.append("upload_data", file, file.name);

    try {
      var response = await fetch("/upload", {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
    } catch (error) {
      statusElement.textContent = "Fehler bei " + file.name + ": " + error.message;
      submitButton.disabled = false;
      return;
    }
  }

  statusElement.textContent = files.length + " Datei(en) hochgeladen. Seite wird neu geladen...";
  window.location.href = "/manager";
}

function validateFormEdit() {
  var allowedExtensions = "txt, h, htm, html, css, cpp, js";
  var editSelectValue = document.getElementById("edit_path").value;
  var dotIndex = editSelectValue.lastIndexOf(".") + 1;
  var editSelectValueExtension = editSelectValue.substring(dotIndex);
  var extIndex = allowedExtensions.indexOf(editSelectValueExtension);

  if (editSelectValue === "choose") {
    alert("Bitte eine Datei waehlen.");
    return false;
  }
  if (extIndex === -1 && editSelectValue !== "/new.txt") {
    alert("Dieser Dateityp kann nicht bearbeitet werden.");
    return false;
  }
}

function validateFormDelete() {
  if (document.getElementById("delete_path").value === "choose") {
    alert("Bitte eine Datei waehlen.");
    return false;
  }
}

function confirmFormat() {
  return confirm("SPIFFS jetzt formatieren? Alle Dateien werden geloescht und der ESP startet neu.");
}

function confirmReboot() {
  if (!confirm("PlantBot jetzt neu starten?")) {
    return;
  }

  var statusElement = document.getElementById("reboot_status");
  var rebootButton = document.getElementById("reboot_submit");
  rebootButton.disabled = true;
  statusElement.textContent = "Neustart angefordert...";

  fetch("/HA/reset").catch(function() {
    statusElement.textContent = "Neustart laeuft oder Verbindung getrennt.";
  });
}
