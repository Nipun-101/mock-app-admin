"use client";

import { Button, Empty, Spin, Typography, message } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";
import {
  EzPrepApiError,
  formatEzPrepError,
  usersApi,
  type AppUserDetail,
} from "@/app/services/ezprep-api";
import { normalizeUserDetail } from "../details-helpers";
import { UserDetailView } from "./user-detail-view";

const { Title, Text } = Typography;

export default function UserDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [failed, setFailed] = useState(false);
  const [detail, setDetail] = useState<AppUserDetail | null>(null);
  const fetchGeneration = useRef(0);

  const fetchDetail = useCallback(async () => {
    const generation = ++fetchGeneration.current;
    if (!params.id) {
      setDetail(null);
      setNotFound(true);
      setFailed(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFailed(false);
    try {
      const response = await usersApi.get(params.id);
      if (generation !== fetchGeneration.current) {
        return;
      }
      const normalized = normalizeUserDetail(response.data);
      if (!normalized) {
        setDetail(null);
        setNotFound(true);
        return;
      }
      setDetail(normalized);
      setNotFound(false);
    } catch (error) {
      if (generation !== fetchGeneration.current) {
        return;
      }
      setDetail(null);
      if (error instanceof EzPrepApiError && error.status === 404) {
        setNotFound(true);
        setFailed(false);
        return;
      }
      setNotFound(false);
      setFailed(true);
      message.error(formatEzPrepError(error, "Failed to load learner"));
    } finally {
      if (generation === fetchGeneration.current) {
        setLoading(false);
      }
    }
  }, [params.id]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  return (
    <div className="w-full">
      <div className="mb-4">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 no-underline hover:text-[#1677ff]"
        >
          <ArrowLeftOutlined />
          Learners
        </Link>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spin size="large" />
        </div>
      ) : notFound ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-16">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="This learner could not be found."
          />
        </div>
      ) : failed || !detail ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-16 text-center">
          <Title level={4} className="!mb-1">
            Could not load this learner
          </Title>
          <Text type="secondary" className="mb-4 block">
            The directory is unchanged. Try again when the connection is back.
          </Text>
          <Button type="primary" onClick={() => void fetchDetail()}>
            Try again
          </Button>
        </div>
      ) : (
        <UserDetailView detail={detail} />
      )}
    </div>
  );
}
