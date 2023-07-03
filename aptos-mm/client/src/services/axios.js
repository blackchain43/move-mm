import { notification } from "antd";
import { stringify } from "query-string";
import axios from "axios";

import { REACT_APP_API_URL } from "../utils/constants";

const onError = ({ response }) => {
  if (response) {
    const { status, data, statusText } = response;
    if (status < 500) {
      var message = `${status} - ${
        statusText || data.message || data?.errors?._?.[0]
      }`;
      notification.error({ key: "axios", message });
    } else {
      notification.error({
        key: "axios",
        message: `${status} - ${statusText || data.message}`,
      });
    }
  } else {
    notification.error({ key: "axios", message: "Cannot connect to Server" });
  }
  return Promise.reject(response);
};

const beforeRequest = (config) => {
  Object.assign(config.headers, { "x-api-key": `@hihihehe@` });
  return config;
};

const client = axios.create({
  baseURL: REACT_APP_API_URL,
  paramsSerializer: (params) => stringify(params, { arrayFormat: "" }),
});
client.interceptors.request.use(beforeRequest);

[client].forEach((client) => {
  client.interceptors.response.use(({ data: response }) => {
    const { success, data } = response;
    if (success) return data;
    else {
      return Promise.reject({});
    }
  }, onError);
});

export { client };
