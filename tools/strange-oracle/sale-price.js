// (2026-10-27) 시험용: 지금 판매 값(첫 계절이면 pay.season.amount, 아니면 pay.amount). 화면 app.js와 같은 규칙
const fs = require("fs");
const path = require("path");
const w = {};
new Function("window", fs.readFileSync(path.resolve(__dirname, "..", "..", "products", "strange-oracle", "data.js"), "utf8"))(w);
const P = w.TEXT.pay;
// (2026-11-14) pay.dust.on이면 책은 별가루 49개로 연다 → 화면의 {price}원 자리는 "별가루 49개". SO_DUST=off(옛 페이앱 길 시험, mock-server --dust off)면 예전 값
const dust = P.dust && P.dust.on && process.env.SO_DUST !== "off";
const on = !dust && Boolean(P.season) && Date.now() < Date.parse(P.season.until);
const amount = dust ? P.dust.cost * 100 : on ? P.season.amount : P.amount;
module.exports = { amount, text: dust ? P.dust.price.replace("{n}", P.dust.cost) : amount.toLocaleString("ko-KR"), regular: P.amount, season: on, dust };
