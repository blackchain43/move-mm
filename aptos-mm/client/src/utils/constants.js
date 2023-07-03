export const isMobile = () => {
  const mobiles = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i,
  ];
  return mobiles.some((matches) => navigator.userAgent.match(matches));
};

export const REACT_APP_API_URL = "http://192.168.31.126:6003/api";

export const COIN_TYPE_APTOS = "0x1::aptos_coin::AptosCoin";
export const COIN_TYPE_TOKEN =
  "0x43417434fd869edee76cca2a4d2301e528a1551b1d719b75c350c3c97d15b8b9::coins::USDT";
export const WS = "ws://192.168.1.103:30000/connection/websocket";
export const TOKENS = [
  {
    name: "APT",
    token: COIN_TYPE_APTOS,
    decimals: 8,
    coinStore: `0x1::coin::CoinStore<${COIN_TYPE_APTOS}>`,
  },
  {
    name: "USDT",
    token: COIN_TYPE_TOKEN,
    decimals: 6,
    coinStore: `0x1::coin::CoinStore<${COIN_TYPE_TOKEN}>`,
  },
];
