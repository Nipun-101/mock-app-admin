"use client";

import { Button, Empty, Input, Pagination, Space, Spin, Typography, message } from "antd";
import { SearchOutlined, TeamOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  formatEzPrepError,
  usersApi,
  type AppUser,
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
  const fetchGeneration = useRef(0);

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
            Learners using the app actively.
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
