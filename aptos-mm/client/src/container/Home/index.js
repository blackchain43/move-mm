/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React from "react";
import styled from "styled-components";
import {
  Collapse,
  Row,
  Col,
  Button,
  InputNumber,
  Table,
  notification,
  Divider,
  Select,
} from "antd";
import { useQuery } from "react-query";
import { useWallet as connectWallet } from "@manahippo/aptos-wallet-adapter";
import { Centrifuge } from "centrifuge";

import useWallet from "../../hooks/useWallet";
import { systemService } from "../../services";
import Container from "../../components/Container";
import { COIN_TYPE_APTOS, COIN_TYPE_TOKEN, WS } from "../../utils/constants";
import SwapFails from "./SwapFails";
import { formatMoney } from "../../utils";

const { Panel } = Collapse;

const Wrapper = styled.div`
  position: relative;
  padding: 30px;
  .ant-collapse-item {
    .ant-collapse-header {
      font-weight: bold;
    }
  }
`;

const Home = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [numGenerate, setNumGenerate] = React.useState(undefined);
  const [amountDeposit, setAmountDeposit] = React.useState(undefined);
  const [coinType, setCoinType] = React.useState(COIN_TYPE_APTOS);
  const [wallets, setWallets] = React.useState([]);
  const [walletsFilter, setWalletsFilter] = React.useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = React.useState([]);
  const [configId, setConfigId] = React.useState(undefined);
  const [filterConfigId, setFilterConfigId] = React.useState(undefined);
  const { getAllWallets } = useWallet();
  const wallet = connectWallet();

  const onSuccess = React.useCallback(async (ctx) => {
    if (ctx.data) {
      notification.success({ message: `Swap ${ctx.data}` });
      setIsLoading(false);
      await refetchData();
    }
  }, []);

  useQuery(
    ["accountService.fetchToken"],
    () =>
      systemService
        .fetchToken({ address: wallet?.account?.address })
        .then(async (result) => {
          if (result?.accessToken) {
            const centrifuge = new Centrifuge(WS, {
              token: result?.accessToken,
            });
            // sub channel swap
            const sub = centrifuge.newSubscription(result?.channel);
            sub.subscribe();
            sub.removeAllListeners();
            sub.on("publication", (ctx) => {
              onSuccess(ctx);
            });

            centrifuge.connect("PontemWallet");
          }
        }),
    {
      staleTime: Infinity,
      refetchOnMount: false,
      enabled: wallet?.connected,
    }
  );

  const {
    data = {},
    isFetching,
    refetch,
  } = useQuery(
    ["systemService.fetchWallets", { address: wallet?.account?.address }],
    ({ queryKey }) => {
      return systemService.fetchWallets({ ...queryKey[1] });
    },
    { enabled: !!wallet.connected }
  );

  const {
    data: dataState,
    refetch: refetchState,
    isFetching: isFetchingState,
  } = useQuery(
    ["systemService.swapState", { address: wallet?.account?.address }],
    ({ queryKey }) => {
      return systemService.swapState({ ...queryKey[1] });
    },
    { enabled: !!wallet.connected }
  );

  const { data: dataConfig } = useQuery(
    [
      "systemService.fetchConfig",
      { requestor: wallet?.account?.address || "" },
    ],
    ({ queryKey }) => {
      return systemService.fetchConfig({ ...queryKey[1] });
    },
    { enabled: !!wallet.connected }
  );

  const getWallets = React.useCallback(async () => {
    setIsLoading(true);
    const items = await getAllWallets(data);
    setWallets(items);
    setIsLoading(false);
  }, [data, getAllWallets]);

  const generateWallets = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await systemService.generateWallets({
        numOfWallets: numGenerate,
        address: wallet?.account?.address,
      });
      if (!!result) {
        await refetchData();
        notification.success({ message: "Generate Wallet Success!" });
      }
    } catch (error) {
      console.log({ error });
      notification.error({ message: "Generate Wallet Fail!" });
    } finally {
      setIsLoading(false);
    }
  }, [numGenerate, wallet]);

  const configs = React.useMemo(() => {
    if (dataConfig?.length > 0) {
      const opts = dataConfig.map((x) => ({
        value: x.id,
        label: x.name,
      }));
      return opts;
    }
    return [];
  }, [dataConfig]);

  const deposit = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await systemService.multiDeposit({
        coinType,
        addresses: selectedRowKeys,
        amounts: [`${amountDeposit}`],
        owner: wallet?.account?.address,
      });
      if (!!result) {
        await refetchData();
        notification.success({ message: "Deposit Success!" });
      }
    } catch (error) {
      console.log({ error });
      notification.error({ message: "Deposit Fail!" });
    } finally {
      setIsLoading(false);
    }
  }, [selectedRowKeys, coinType, amountDeposit, wallet]);

  const withdraw = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await systemService.withdraw({
        coinType,
        addresses: selectedRowKeys,
        targetAddress: wallet?.account?.address,
      });
      if (!!result) {
        await refetchData();
        notification.success({ message: "Withdraw Success!" });
      }
    } catch (error) {
      console.log({ error });
      notification.error({ message: "Withdraw Fail!" });
    } finally {
      setIsLoading(false);
    }
  }, [selectedRowKeys, coinType, wallet]);

  const onSwap = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await systemService.swap({
        walletAddresses: selectedRowKeys,
        configId: configId,
        requestor: wallet?.account?.address,
      });
      if (!!result) {
        await refetchData();
        notification.success({ message: `Swap Success (${result})` });
      }
    } catch (error) {
      console.log({ error });
      notification.error({ message: "Swap Fail!" });
    } finally {
      setIsLoading(false);
    }
  }, [selectedRowKeys, configId, wallet]);

  const killProcess = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await systemService.killSwap({
        address: wallet?.account?.address,
      });
      if (!!result) {
        notification.success({ message: `Kill Process Success!` });
      }
    } catch (error) {
      console.log({ error });
      notification.error({ message: "Kill Process Fail!" });
    }
  }, [wallet]);

  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const selectAll = React.useCallback(() => {
    if (selectedRowKeys?.length === 0) {
      setSelectedRowKeys(walletsFilter?.map((x) => x.address) || []);
    } else {
      setSelectedRowKeys([]);
    }
  }, [walletsFilter, selectedRowKeys]);

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const hasSelected = selectedRowKeys.length > 0;

  const refetchData = React.useCallback(async () => {
    await setFilterConfigId(-1);
    await refetch();
    await setTimeout(() => {
      refetchState();
    }, 1000);
  }, []);

  const onFilter = React.useCallback(async () => {
    setSelectedRowKeys([]);
    if (!filterConfigId || filterConfigId === -1) {
      setWalletsFilter(wallets);
      return;
    }
    const config = dataConfig.find((x) => x.id === filterConfigId);
    const type = config.swapAforB ? config.tokenAType : config.tokenBType;
    const columm = type === COIN_TYPE_APTOS ? "aptBalance" : "tokenBalance";
    const filters = wallets.filter(
      (x) => Number(x[columm]) >= Number(config.upperBound)
    );
    setWalletsFilter(filters);
  }, [dataConfig, filterConfigId, wallets]);

  React.useEffect(() => {
    if (data?.length > 0) getWallets();
  }, [data]);

  React.useEffect(() => {
    if (configs?.length > 0) setConfigId(configs[0].id);
  }, [configs]);

  React.useEffect(() => {
    setWalletsFilter(wallets);
  }, [wallets]);

  if (!wallet.connected)
    return (
      <Container>
        <Wrapper>
          <Row justify="center" style={{ marginTop: 100 }}>
            <Button
              type="primary"
              className="hover-light"
              onClick={() => wallet.connect("PontemWallet")}
            >
              Connect Wallet
            </Button>
          </Row>
        </Wrapper>
      </Container>
    );

  return (
    <Container>
      <Wrapper>
        <Collapse defaultActiveKey={["1", "2"]}>
          <Panel header="Wallets" key="1">
            <Row
              align="middle"
              justify="end"
              style={{ gap: 16, marginBottom: 30 }}
            >
              Number Of Wallets:
              <InputNumber
                value={numGenerate}
                onChange={setNumGenerate}
                style={{ width: 200 }}
              />
              <Button
                type="primary"
                onClick={generateWallets}
                disabled={!numGenerate || numGenerate <= 0}
                loading={isLoading}
              >
                Generate
              </Button>
            </Row>
            <Row align="middle" style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Row align="middle" style={{ gap: 16 }}>
                  <Button
                    type="primary"
                    onClick={refetchData}
                    loading={isLoading}
                  >
                    Reload
                  </Button>
                  <Button
                    type="primary"
                    onClick={selectAll}
                    loading={isLoading}
                  >
                    Select/DeSelect All
                  </Button>
                  <span style={{ marginLeft: 8 }}>
                    Selected {selectedRowKeys.length}/{walletsFilter.length}{" "}
                    items
                  </span>
                </Row>
              </Col>
              <Col span={12}>
                <Row align="middle" justify="end" style={{ gap: 16 }}>
                  <Select
                    value={filterConfigId}
                    style={{ width: 300 }}
                    onChange={setFilterConfigId}
                    options={[{ value: -1, label: "All" }, ...configs]}
                  />
                  <Button
                    type="primary"
                    onClick={onFilter}
                    loading={isLoading}
                    disabled={!filterConfigId}
                  >
                    Filter
                  </Button>
                </Row>
              </Col>
            </Row>
            <Row style={{ marginBottom: 16 }}>
              <Col span={24}>
                <Table
                  loading={isFetching || isLoading}
                  rowKey="address"
                  columns={[
                    {
                      title: "Address",
                      key: "Address",
                      dataIndex: "address",
                    },
                    {
                      title: "APT",
                      key: "APT",
                      dataIndex: "aptBalance",
                      render: (apt) => <span>{formatMoney(apt)}</span>,
                    },
                    {
                      title: "TOKEN",
                      key: "TOKEN",
                      dataIndex: "tokenBalance",
                      render: (token) => <span>{formatMoney(token)}</span>,
                    },
                  ]}
                  dataSource={walletsFilter}
                  rowSelection={rowSelection}
                />
              </Col>
            </Row>
            <Divider orientation="right" plain>
              Deposit
            </Divider>
            <Row
              align="middle"
              justify="end"
              style={{ gap: 16, marginBottom: 16 }}
            >
              Coin Type:
              <Select
                value={coinType}
                style={{ width: 120 }}
                onChange={setCoinType}
                options={[
                  {
                    value: COIN_TYPE_APTOS,
                    label: "APT",
                  },
                  {
                    value: COIN_TYPE_TOKEN,
                    label: "TOKEN",
                  },
                ]}
              />
              Amount:
              <InputNumber
                value={amountDeposit}
                onChange={setAmountDeposit}
                style={{ width: 200 }}
              />
              <Button
                type="primary"
                onClick={deposit}
                loading={isLoading}
                disabled={!hasSelected || !amountDeposit || amountDeposit <= 0}
              >
                Deposit
              </Button>
              <Button
                type="primary"
                danger
                onClick={withdraw}
                loading={isLoading}
              >
                Withdraw
              </Button>
            </Row>
            <Divider orientation="right" plain>
              Swap
            </Divider>
            <Row
              align="middle"
              justify="end"
              style={{ gap: 16, marginBottom: 16 }}
            >
              Config:
              <Select
                value={configId}
                style={{ width: 300 }}
                onChange={setConfigId}
                options={configs}
              />
              <Button
                type="primary"
                onClick={onSwap}
                loading={isLoading || !!dataState?.isProcessing}
                disabled={!configId || selectedRowKeys.length === 0}
              >
                {dataState?.isProcessing ? "Processing ..." : "Swap"}
              </Button>
              {dataState?.isProcessing && (
                <Button
                  type="primary"
                  onClick={refetchData}
                  loading={isLoading || isFetchingState}
                >
                  Reload
                </Button>
              )}
              {dataState?.isProcessing && (
                <Button
                  type="primary"
                  danger
                  onClick={killProcess}
                  loading={isLoading}
                >
                  Kill Process
                </Button>
              )}
            </Row>
          </Panel>
          <Panel header="Swap Histories" key="2">
            <SwapFails />
          </Panel>
        </Collapse>
      </Wrapper>
    </Container>
  );
};

export default Home;
