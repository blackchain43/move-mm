import React from "react";
import styled from "styled-components";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import {
  Collapse,
  Row,
  Col,
  Table,
  Button,
  notification,
  Modal,
  Drawer,
  Pagination,
} from "antd";
import { useQuery } from "react-query";
import { useWallet as connectWallet } from "@manahippo/aptos-wallet-adapter";

import { systemService } from "../../services";
import Container from "../../components/Container";
import DrawerTask from "./DrawerTask";
import useWallet from "../../hooks/useWallet";
import moment from "moment";
import { formatMoney, shorten } from "../../utils";
import { formatUnits } from "ethers";
import { TOKENS } from "../../utils/constants";

const { Panel } = Collapse;
const { confirm } = Modal;

const getStatus = (status) => {
  switch (status) {
    case 0:
      return "CANCELED";
    case 1:
      return "ON_PLAN";
    case 2:
      return "IN_PROGRESS";
    default:
      return "COMPLETED";
  }
};

const Wrapper = styled.div`
  position: relative;
  padding: 30px;
  .ant-collapse-item {
    .ant-collapse-header {
      font-weight: bold;
    }
  }
  .ant-input-number {
    width: 100%;
  }
  .ant-form-item-label > label {
    width: 150px;
  }
  .actions {
    display: flex;
    gap: 16px;
  }
  .red,
  .CANCELED {
    color: red;
  }
  .green,
  .COMPLETED {
    color: green;
  }
  .IN_PROGRESS {
    color: #faad14;
  }
`;

const Task = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState(undefined);
  const [dataSearch, setDataSearch] = React.useState({
    page: 1,
    size: 10,
  });

  const [selectedTaskHistory, setSelectedTaskHistory] =
    React.useState(undefined);
  const [wallets, setWallets] = React.useState([]);
  const wallet = connectWallet();
  const { getAllWallets } = useWallet();

  const {
    data = {},
    isFetching,
    refetch,
  } = useQuery(
    ["systemService.fetchTask", { requestor: wallet?.account?.address || "" }],
    ({ queryKey }) => {
      return systemService.fetchTask({ ...queryKey[1] });
    },
    { enabled: !!wallet?.connected }
  );

  const {
    data: histories,
    isFetching: isFetchingHistory,
    refetch: refetchHistory,
  } = useQuery(
    ["systemService.fetchTaskHistory", dataSearch],
    ({ queryKey }) => {
      return systemService.fetchTaskHistory({ ...queryKey[1] });
    },
    { enabled: !!dataSearch?.taskId, keepPreviousData: true }
  );

  const { data: dataWallets, isFetching: isFetchingWallets } = useQuery(
    ["systemService.fetchWallets", { address: wallet?.account?.address }],
    ({ queryKey }) => {
      return systemService.fetchWallets({ ...queryKey[1] });
    },
    { enabled: !!wallet.connected }
  );

  const { data: dataConfig, isFetching: isFetchingConfig } = useQuery(
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
    const ws = await getAllWallets(dataWallets);
    setWallets(ws);
    setIsLoading(false);
  }, [dataWallets, getAllWallets]);

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

  const items = React.useMemo(() => {
    if (data?.length > 0) return data;
    return [];
  }, [data]);

  const { items: itemHistories, total = 0 } = histories;

  const onClose = React.useCallback(() => {
    setSelectedTask(undefined);
    setOpen(false);
  }, []);

  const onAdd = React.useCallback(() => {
    setOpen(true);
  }, []);
  const onEdit = React.useCallback((task) => {
    setSelectedTask(task);
    setOpen(true);
  }, []);

  const onResue = React.useCallback((task) => {
    setSelectedTask({ ...task, isResue: true, startTime: undefined });
    setOpen(true);
  }, []);

  const onViewHistory = React.useCallback((task) => {
    setSelectedTaskHistory(task);
    setDataSearch((current) => ({
      ...current,
      page: 1,
      taskId: task?.id,
    }));
  }, []);

  const handleChangePage = React.useCallback((page) => {
    setDataSearch((current) => ({
      ...current,
      page: page,
    }));
  }, []);

  const onDelete = React.useCallback(
    async (id) => {
      confirm({
        title: "Are you sure delete this task?",
        icon: <ExclamationCircleOutlined />,
        okText: "Yes",
        okType: "danger",
        cancelText: "No",
        onOk: async () => {
          setIsLoading(true);
          try {
            const result = await systemService.deleteTask({
              id,
            });
            if (result) {
              await refetch();
              notification.success({
                message: "Delete Success!",
              });
            }
          } catch (error) {
            console.log(error);
          } finally {
            setIsLoading(false);
          }
        },
        onCancel() {
          console.log("Cancel");
        },
      });
    },
    [refetch]
  );

  const onCancel = React.useCallback(
    async (id) => {
      confirm({
        title: "Are you sure cancel this task?",
        icon: <ExclamationCircleOutlined />,
        okText: "Yes",
        okType: "danger",
        cancelText: "No",
        onOk: async () => {
          setIsLoading(true);
          try {
            const result = await systemService.cancelTask({
              id,
            });
            if (result) {
              await refetch();
              notification.success({
                message: "Cancel Success!",
              });
            }
          } catch (error) {
            console.log(error);
          } finally {
            setIsLoading(false);
          }
        },
        onCancel() {
          console.log("Cancel");
        },
      });
    },
    [refetch]
  );

  const reset = React.useCallback(async () => {
    setOpen(false);
    await refetch();
  }, [refetch]);

  React.useEffect(() => {
    if (dataWallets?.length > 0) getWallets();
  }, [dataWallets, getWallets]);

  return (
    <Container>
      <Wrapper>
        <Collapse defaultActiveKey={["1", "2"]}>
          <Panel header="Config" key="1">
            <Row style={{ marginBottom: 16 }} justify="space-between">
              <Button type="primary" onClick={refetch} loading={isFetching}>
                Reload
              </Button>
              <Button
                type="primary"
                onClick={onAdd}
                loading={isLoading}
                disabled={!wallet?.connected}
              >
                Add Task
              </Button>
            </Row>
            <Row style={{ marginBottom: 16 }}>
              <Col span={24}>
                <Table
                  tableLayout="fixed"
                  loading={isFetching || isLoading}
                  rowKey="id"
                  columns={[
                    {
                      title: "Name",
                      dataIndex: "name",
                    },
                    {
                      title: "Start Time",
                      dataIndex: "startTime",
                      render: (startTime) => (
                        <span>
                          {moment(startTime).format("YYYY-MM-DD HH:mm:ss")}
                        </span>
                      ),
                    },
                    {
                      title: "Duration",
                      dataIndex: "duration",
                      render: (duration) => <span>{duration} ms</span>,
                    },
                    {
                      title: "Strategies",
                      dataIndex: "strategyNames",
                      render: (strategyNames) => (
                        <span>{strategyNames.join(", ")}</span>
                      ),
                    },
                    {
                      title: "Status",
                      dataIndex: "status",
                      render: (status) => (
                        <span className={getStatus(status)}>
                          {getStatus(status)}
                        </span>
                      ),
                    },
                    {
                      title: "Action",
                      dataIndex: "id",
                      width: 550,
                      render: (data, task) => (
                        <div className="actions">
                          <Button type="primary" onClick={() => onEdit(task)}>
                            View Config
                          </Button>
                          <Button
                            type="primary"
                            onClick={() => onViewHistory(task)}
                          >
                            View History
                          </Button>
                          <Button type="primary" onClick={() => onResue(task)}>
                            Reuse
                          </Button>
                          <Button
                            type="primary"
                            danger
                            onClick={() => onCancel(data)}
                            disabled={task?.status !== 2}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="primary"
                            danger
                            onClick={() => onDelete(data)}
                            disabled={task?.status === 2}
                          >
                            Delete
                          </Button>
                        </div>
                      ),
                    },
                  ]}
                  dataSource={items}
                  pagination={false}
                />
              </Col>
            </Row>
            <Drawer
              title={
                !!selectedTask
                  ? selectedTask?.isResue
                    ? `Reuse ${selectedTask?.name}`
                    : `Edit ${selectedTask?.name}`
                  : "Add Task"
              }
              placement="right"
              onClose={onClose}
              open={open}
              width="min(80%, 1100px)"
            >
              <DrawerTask
                selectedTask={selectedTask}
                configs={configs}
                wallets={wallets}
                isLoading={isFetchingWallets || isFetchingConfig}
                reset={reset}
                key={`${selectedTask?.id} ${selectedTask?.isResue}`}
              />
            </Drawer>
          </Panel>
          <Panel header={`History ${selectedTaskHistory?.name || ""}`} key="2">
            <Row justify="end" style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                onClick={refetchHistory}
                loading={isFetchingHistory}
                disabled={!selectedTaskHistory}
              >
                Reload
              </Button>
            </Row>
            <Row style={{ marginBottom: 16 }}>
              <Col span={24}>
                <Table
                  tableLayout="fixed"
                  loading={isFetchingHistory || isLoading}
                  rowKey="_id"
                  key={selectedTaskHistory?.id}
                  columns={[
                    {
                      title: "Task",
                      dataIndex: "taskName",
                    },
                    {
                      title: "Config Name",
                      dataIndex: "configName",
                    },
                    {
                      title: "Wallet",
                      dataIndex: "walletAddress",
                      render: (w) => <span>{shorten(w)}</span>,
                    },
                    {
                      title: "Time",
                      dataIndex: "createdAt",
                      render: (createdAt) => (
                        <span>
                          {moment(createdAt).format("YYYY-MM-DD HH:mm:ss")}
                        </span>
                      ),
                    },
                    {
                      title: TOKENS[1].name,
                      dataIndex: "tokenAChange",
                      render: (value) => (
                        <span
                          className={value.indexOf("-") > -1 ? "red" : "green"}
                        >
                          {formatMoney(formatUnits(value, TOKENS[1].decimals))}
                        </span>
                      ),
                    },
                    {
                      title: TOKENS[0].name,
                      dataIndex: "tokenBChange",
                      render: (value) => (
                        <span
                          className={value.indexOf("-") > -1 ? "red" : "green"}
                        >
                          {formatMoney(formatUnits(value, TOKENS[0].decimals))}
                        </span>
                      ),
                    },
                    {
                      title: "Gas",
                      dataIndex: "gasUsed",
                      render: (value) => (
                        <span>
                          {formatMoney(formatUnits(value, TOKENS[0].decimals))}
                        </span>
                      ),
                    },
                  ]}
                  dataSource={itemHistories}
                  pagination={false}
                />
              </Col>
            </Row>
            {total > 10 && (
              <Row justify="end">
                <Pagination
                  {...dataSearch}
                  total={total}
                  onChange={handleChangePage}
                  showSizeChanger={false}
                />
              </Row>
            )}
          </Panel>
        </Collapse>
      </Wrapper>
    </Container>
  );
};

export default Task;
