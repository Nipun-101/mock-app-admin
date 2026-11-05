"use client";

import { Button, Empty, Input, Pagination, Space, Spin, Typography, message } from "antd";
import { SearchOutlined, TeamOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  formatEzPrepError,
  usersApi,
  type AppUser,
  type AppUsersActiveSummary,
} from "@/app/services/ezprep-api";
import { excludeAdmins } from "./helpers";
import { UserCard } from "./user-card";

const { Title, Text } = Typography;

const DEFAULT_PAGE_SIZE = 12;

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [activeSummary, setActiveSummary] = useState<AppUsersActiveSummary | null>(
    null
  );
  const [summaryLoading, setSummaryLoading] = useState(true);
  const fetchGeneration = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setSummaryLoading(true);
    void usersApi
      .activeSummary()
      .then((response) => {
        if (!cancelled) setActiveSummary(response.data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setActiveSummary(null);
        message.error(formatEzPrepError(error, "Failed to load active users"));
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchUsers = useCallback(async () => {
    const generation = ++fetchGeneration.current;
    setLoading(true);
    try {
      const response = await usersApi.list({
        page,
        limit: pageSize,
        search: search || undefined,
      });
      if (generation !== fetchGeneration.current) {
        return;
      }
      const learners = excludeAdmins(response.data || []);
      setUsers(learners);
      setTotal(response.pagination?.total ?? learners.length);
    } catch (error) {
      if (generation !== fetchGeneration.current) {
        return;
      }
      setUsers([]);
      setTotal(0);
      message.error(formatEzPrepError(error, "Failed to fetch users"));
    } finally {
      if (generation === fetchGeneration.current) {
        setLoading(false);
      }
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (value: string) => {
    setPage(1);
    setSearch(value.trim());
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#1677ff]">
            <TeamOutlined className="text-xl" />
            <Text className="text-xs font-semibold uppercase tracking-[0.16em]">
              Learners
            </Text>
          </div>
          <Title level={3} className="!mb-1 !mt-1">
            Users
          </Title>
          <Text type="secondary">
            Learners using the app. Open a card to review profile and recent scores.
          </Text>
        </div>
        <Space.Compact className="w-full sm:w-80">
          <Input
            allowClear
            placeholder="Search name, email, or phone"
            prefix={<SearchOutlined className="text-neutral-400" />}
            value={searchInput}
            onChange={(event) => {
              const value = event.target.value;
              setSearchInput(value);
              if (!value) {
                handleSearch("");
              }
            }}
            onPressEnter={() => handleSearch(searchInput)}
          />
          <Button
            type="primary"
            className="bg-blue-600 hover:!bg-blue-700"
            onClick={() => handleSearch(searchInput)}
          >
            Search
          </Button>
        </Space.Compact>
      </div>

      {summaryLoading && !activeSummary ? (
        <div className="mb-6 flex min-h-[5.5rem] items-center justify-center rounded-2xl border border-neutral-200 bg-white">
          <Spin />
        </div>
      ) : activeSummary ? (
        <ActiveUsersStrip summary={activeSummary} />
      ) : null}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spin size="large" />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 py-16">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              search
                ? "No learners match that search."
                : "No learners yet. Students appear here after they sign up."
            }
          />
        </div>
      ) : (
        <>
          <Text type="secondary" className="mb-3 block">
            Showing {users.length} of {total} learner{total === 1 ? "" : "s"}
          </Text>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {users.map((user) => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Pagination
              current={page}
              pageSize={pageSize}
              total={total}
              showSizeChanger
              pageSizeOptions={["12", "24", "48"]}
              onChange={(nextPage, nextSize) => {
                setPage(nextPage);
                setPageSize(nextSize);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ActiveUsersStrip({ summary }: { summary: AppUsersActiveSummary }) {
  return (
    <section
      aria-label="Active learners"
      className="mb-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white"
    >
      <div className="grid grid-cols-1 divide-y divide-neutral-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <ActiveMetric
          label="Active last 1 day"
          value={summary.last1Day}
          hint="Unique learners with activity in the past 24 hours"
        />
        <ActiveMetric
          label="Active last 7 days"
          value={summary.last7Days}
          hint="Unique learners with activity in the past week"
        />
      </div>
    </section>
  );
}

function ActiveMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <span className="shrink-0 text-3xl font-semibold tabular-nums leading-none text-neutral-900">
        {value.toLocaleString("en-IN")}
      </span>
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
          {label}
        </div>
        <div className="mt-0.5 text-xs leading-snug text-neutral-400">{hint}</div>
      </div>
    </div>
  );
}
