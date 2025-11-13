const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("app.db");

function createTable() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS Records(
RecNo INTEGER PRIMARY KEY AUTOINCREMENT,
Code TEXT NOT NULL,
CodeType TEXT NOT NULL,
IsPrinted INTEGER DEFAULT 0,
DownloadDate DATETIME DEFAULT CURRENT_TIMESTAMP,
PrintDate DATETIME)`);
  });
}

function bulkInsert(items, cb) {
  const stmt = db.prepare("INSERT INTO Records (Code, CodeType) VALUES (?,?)");
  db.serialize(() => {
    items.forEach((i) => stmt.run(i.Code, i.CodeType));
    stmt.finalize(cb);
  });
}

function deleteRecord(id, cb) {
  db.run("DELETE FROM Records WHERE RecNo=?", id, cb);
}

function deleteAllRecords(cb) {
  db.run("DELETE FROM Records", cb);
}

function markAsPrinted(id, cb) {
  db.run(
    "UPDATE Records SET IsPrinted=1, PrintDate=CURRENT_TIMESTAMP WHERE RecNo=?",
    id,
    cb
  );
}

function fetchByStatus(isPrinted, cb) {
  db.all("SELECT * FROM Records WHERE IsPrinted=?", isPrinted, cb);
}

module.exports = {
  createTable,
  bulkInsert,
  deleteRecord,
  deleteAllRecords,
  markAsPrinted,
  fetchByStatus,
};
