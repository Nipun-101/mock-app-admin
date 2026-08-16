"use client";

import "@ant-design/v5-patch-for-react-19";
import { ConfigProvider } from "antd";

export function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider select={{ showSearch: true }}>{children}</ConfigProvider>
  );
}
