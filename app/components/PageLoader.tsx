"use client";

import { Spin } from "antd";

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] w-full">
      <Spin size="large" />
    </div>
  );
}

/** Keeps Ant Design Form mounted while data loads so `useForm` stays connected. */
export function EditPageShell({
  loading,
  children,
}: {
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <Spin spinning={loading} size="large">
      <div className={loading ? "min-h-[50vh] invisible" : undefined}>
        {children}
      </div>
    </Spin>
  );
}
