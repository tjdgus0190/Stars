// (2026-10-27) 시험용: 지금 판매 값(첫 계절이면 pay.season.amount, 아니면 pay.amount). 화면 app.js와 같은 규칙
const fs = require("fs");
const path = require("path");
const w = {};
new Function("window", fs.readFileSync(path.resolve(__dirname, "..", "..", "products", "strange-oracle", "data.js"), "utf8"))(w);
const P = w.TEXT.pay;
const on = Boolean(P.season) && Date.now() < Date.parse(P.season.until);
const amount = on ? P.season.amount : P.amount;
module.exports = { amount, text: amount.toLocaleString("ko-KR"), regular: P.amount, season: on };
