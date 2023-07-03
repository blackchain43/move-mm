import { client } from "./axios";

const fetchWallets = (params) => client.get(`/wallet`, { params });
const generateWallets = (body) => client.post(`/wallet`, body);
const multiDeposit = (body) => client.post(`/wallet/multi-send`, body);
const withdraw = (body) => client.post(`/wallet/claim`, body);

const fetchConfig = (params) => client.get(`/admin`, { params });
const saveConfig = (body) => client.post(`/admin/mmconfig`, body);
const deleteConfig = ({ id }) => client.delete(`/admin/${id}`);

const fetchTask = (params) => client.get(`/task`, { params });
const fetchTaskHistory = (params) =>
  client.get(`/task/stats/changes`, { params });
const saveTask = (body) => client.post(`/task`, body);
const deleteTask = ({ id }) => client.delete(`/task/${id}`);
const cancelTask = ({ id }) => client.delete(`/task/cancel/${id}`);
const reuseTask = (body) => client.post(`/task/reuse`, body);

const fetchSwapHistory = (params) =>
  client.get(`/dex/swap-histories`, { params });
const deleteHistory = (requestor) =>
  client.delete(`/dex/fail-swaps`, {
    data: {
      requestor,
      deleteAllPool: true,
    },
  });

const swap = (body) => client.post(`/dex/swap`, body);
const swapState = ({ address }) => client.get(`/dex/swap-state/${address}`);
const killSwap = ({ address }) =>
  client.get(`/dex/kill-swap-process/${address}`);
const fetchToken = ({ address }) =>
  client.get(`/admin/access-token/${address}`);

const systemService = {
  fetchWallets,
  generateWallets,
  multiDeposit,
  fetchConfig,
  fetchSwapHistory,
  saveConfig,
  deleteConfig,
  swap,
  deleteHistory,
  withdraw,
  swapState,
  fetchToken,
  killSwap,
  fetchTask,
  saveTask,
  deleteTask,
  cancelTask,
  fetchTaskHistory,
  reuseTask,
};

export default systemService;
