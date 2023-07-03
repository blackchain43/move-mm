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

export const REACT_APP_API_URL = "http://192.168.1.103:6003/api";

export const COIN_TYPE_SUI = "0x2::sui::SUI";
export const COIN_TYPE_TOKEN =
  "0x5580c843b6290acb2dbc7d5bf8ab995d4d4b6ba107e2a283b4d481aab1564d68::brt::BRT";
export const DECIMALS = "Mwei";
export const DECIMAL_NUMBER = 6;
export const WS = "ws://192.168.1.103:30000/connection/websocket";
export const TOKENS = [
  {
    name: "SUI",
    token: COIN_TYPE_SUI,
    decimals: 9,
    format: "Gwei",
  },
  {
    name: "BRT",
    token: COIN_TYPE_TOKEN,
    decimals: 6,
    format: DECIMALS,
  },
];
