import copy from "copy-to-clipboard";

export const copyToClipboard = (text, id, setPopoverId) => {
  copy(text);
  setPopoverId(id);
  setTimeout(() => {
    setPopoverId(-1);
  }, 1000);
};

function truncateToDecimals(num, dec = 2) {
  // eslint-disable-next-line no-restricted-properties
  const calcDec = Math.pow(10, 5);
  return (Math.trunc(Number(num).toFixed(5) * calcDec) / calcDec).toFixed(dec);
}

export const formatMoney = (value, defaultValue = "0") => {
  if (!value || Number.isNaN(Number(value))) return defaultValue;
  const floatValue = parseFloat(truncateToDecimals(value, 3));
  return floatValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export const shorten = (text, start = 6, end = 6) => {
  if (!text) return "N/A";
  const n = text.length;
  return `${text.substr(0, start)}...${text.substr(n - end)}`;
};

export const formatNumber = (value) => {
  const isLongerThan2 = value?.toString()?.split(".")?.[1]?.length > 2;
  if (isLongerThan2) {
    const split = value?.toString()?.split(".");
    return `${split[0]}.${split[1].substring(0, 2)}`;
  }
  return value;
};

export const validateInputNumber = (evt, allowDot = true) => {
  const ignoreKeyCode = [8, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 110];
  const theEvent = evt || window.event;
  let key = theEvent.keyCode || theEvent.which;

  // Handle key press
  key = String.fromCharCode(key);
  const regex = /[0-9]/;
  if (
    !regex.test(key) &&
    !ignoreKeyCode.includes(theEvent.keyCode) &&
    (allowDot ? theEvent.keyCode !== 190 : true)
  ) {
    theEvent.returnValue = false;
    if (theEvent.preventDefault) theEvent.preventDefault();
  }
};
