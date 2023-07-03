import React from "react";
import { Row, Col, Button, Modal, Table, notification } from "antd";
import { useQuery } from "react-query";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { useWallet } from "@manahippo/aptos-wallet-adapter";

import { systemService } from "../../services";

const { confirm } = Modal;

const SwapFails = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const wallet = useWallet();

  const {
    data = {},
    isFetching,
    refetch,
  } = useQuery(
    [
      "systemService.fetchSwapHistory",
      { status: 0, requestor: wallet?.account?.address },
    ],
    ({ queryKey }) => {
      return systemService.fetchSwapHistory({ ...queryKey[1] });
    }
  );

  const items = React.useMemo(() => {
    if (data?.length > 0) return data;
    return [];
  }, [data]);

  const onDelete = React.useCallback(async () => {
    confirm({
      title: "Are you sure delete fail histories?",
      icon: <ExclamationCircleOutlined />,
      okText: "Yes",
      okType: "danger",
      cancelText: "No",
      onOk: async () => {
        setIsLoading(true);
        try {
          const result = await systemService.deleteHistory(
            wallet?.account?.address
          );
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
  }, [refetch, wallet]);

  return (
    <>
      <Row
        align="middle"
        style={{ gap: 16, marginBottom: 16 }}
        justify="space-between"
      >
        <Button type="primary" onClick={refetch} loading={isLoading}>
          Reload
        </Button>
        <Button type="primary" danger onClick={onDelete} loading={isLoading}>
          Delete
        </Button>
      </Row>
      <Row style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Table
            loading={isFetching || isLoading}
            rowKey="id"
            columns={[
              {
                title: "Id",
                dataIndex: "id",
              },
              {
                title: "Address",
                dataIndex: "address",
              },
              {
                title: "Action",
                dataIndex: "configName",
              },
            ]}
            dataSource={items}
          />
        </Col>
      </Row>
    </>
  );
};

export default SwapFails;
