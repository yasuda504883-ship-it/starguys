window.STAR_GUYS_AREA_URLS = {
  "大阪 ミナミ": "https://www.star-guys.jp/kansai/osakaminami/",
  "大阪 キタ": "https://www.star-guys.jp/kansai/osakakita/",
  "京都 祇園": "https://www.star-guys.jp/kansai/kyoto/",
  "神戸": "https://www.star-guys.jp/kansai/kobe/",
  "歌舞伎町": "https://www.star-guys.jp/kanto/kabukicho/",
  "六本木": "https://www.star-guys.jp/kanto/roppongi/",
  "池袋": "https://www.star-guys.jp/kanto/ikebukuro/",
  "千葉": "https://www.star-guys.jp/kanto/chiba/",
  "神奈川／横浜・川崎": "https://www.star-guys.jp/kanto/kanagawa/",
  "埼玉／大宮": "https://www.star-guys.jp/kanto/saitama/",
  "名古屋 栄・錦": "https://www.star-guys.jp/tokai/nagoya/",
  "石川／金沢": "https://www.star-guys.jp/hokuriku/ishikawa/",
  "岡山": "https://www.star-guys.jp/chugoku_shikoku/okayama/",
  "香川／高松": "https://www.star-guys.jp/chugoku_shikoku/kagawa/",
  "愛媛／松山": "https://www.star-guys.jp/chugoku_shikoku/ehime/",
  "広島／流川・福山": "https://www.star-guys.jp/chugoku_shikoku/hiroshima/",
  "徳島": "https://www.star-guys.jp/chugoku_shikoku/tokushima/",
  "すすきの": "https://www.star-guys.jp/hokkaido/susukino/",
  "熊本": "https://www.star-guys.jp/kyushu/kumamoto/",
  "鹿児島": "https://www.star-guys.jp/kyushu/kagoshima/",
  "沖縄／那覇": "https://www.star-guys.jp/okinawa/naha/"
};

window.STAR_GUYS_STORE_URLS = {
  "大阪 ミナミ__A-TOP -MONSTAR-": "https://www.star-guys.jp/kansai/osakaminami/a_top/",
  "大阪 ミナミ__Ai": "https://www.star-guys.jp/kansai/osakaminami/ai/",
  "大阪 ミナミ__IR": "https://www.star-guys.jp/kansai/osakaminami/ir/",
  "大阪 ミナミ__Ai$": "https://www.star-guys.jp/kansai/osakaminami/aidoru/",
  "大阪 ミナミ__ACQUA-OSAKA HONTEN-": "https://www.star-guys.jp/kansai/osakaminami/acqua_osaka_honten/",
  "大阪 ミナミ__ACQUA -本店-": "https://www.star-guys.jp/kansai/osakaminami/acqua/",
  "大阪 ミナミ__ASK": "https://www.star-guys.jp/kansai/osakaminami/ask/",
  "大阪 ミナミ__ADAM": "https://www.star-guys.jp/kansai/osakaminami/adam/",
  "大阪 ミナミ__ADAM RISE": "https://www.star-guys.jp/kansai/osakaminami/adam_rise/",
  "大阪 ミナミ__ADAM REX": "https://www.star-guys.jp/kansai/osakaminami/adam_rex/",
  "大阪 ミナミ__Addiction": "https://www.star-guys.jp/kansai/osakaminami/addiction/",
  "大阪 ミナミ__ATOM": "https://www.star-guys.jp/kansai/osakaminami/atom/",
  "大阪 ミナミ__ATOM-ALLES-": "https://www.star-guys.jp/kansai/osakaminami/atom_alles/",
  "大阪 ミナミ__ATOM-VENUS-": "https://www.star-guys.jp/kansai/osakaminami/atom_venus/",
  "大阪 ミナミ__ATOM-Travis-": "https://www.star-guys.jp/kansai/osakaminami/travis/",
  "大阪 ミナミ__ATOM-PLACE-": "https://www.star-guys.jp/kansai/osakaminami/atom_place/",
  "大阪 ミナミ__ATOM-ROYAL-": "https://www.star-guys.jp/kansai/osakaminami/atom_royal/",
  "大阪 ミナミ__ATOM-CASTLE-": "https://www.star-guys.jp/kansai/osakaminami/atom_castle/",
  "大阪 ミナミ__AVALANCHE": "https://www.star-guys.jp/kansai/osakaminami/avalanche/",
  "大阪 ミナミ__AMATERAS": "https://www.star-guys.jp/kansai/osakaminami/amateras/",
  "大阪 ミナミ__ETERNAL": "https://www.star-guys.jp/kansai/osakaminami/eternal/",
  "大阪 ミナミ__EDENOsaka": "https://www.star-guys.jp/kansai/osakaminami/edenosaka/",
  "広島／流川・福山__Avid": "https://www.star-guys.jp/chugoku_shikoku/hiroshima/avid/"
};

window.getStarGuysStoreLink = function (area, name) {
  const key = `${area}__${name}`;
  const exactUrl = window.STAR_GUYS_STORE_URLS[key] || "";
  const areaUrl = window.STAR_GUYS_AREA_URLS[area] || "https://www.star-guys.jp/main.html";
  return {
    url: exactUrl || areaUrl,
    exact: Boolean(exactUrl)
  };
};