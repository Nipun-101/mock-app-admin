"use client";

import { Empty, Pagination, Rate, Spin, Typography, message } from "antd";
import { MessageOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { maskEmail } from "@/app/admin/users/helpers";
import {
  FEEDBACK_RATING_FIELDS,
  feedbackApi,
  formatEzPrepError,
  type FeedbackItem,
  type FeedbackSummary,
} from "@/app/services/ezprep-api";

const { Title, Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;

function formatScore(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(1);
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ratingCountLabel(count: number): string {
  return count === 1 ? "1 rating" : `${count} ratings`;
}

export default function FeedbackPage() {
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const listGeneration = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setSummaryLoading(true);
    void feedbackApi
      .summary()
      .then((response) => {
        if (!cancelled) setSummary(response.data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSummary(null);
        message.error(formatEzPrepError(error, "Failed to load feedback summary"));
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchList = useCallback(async () => {
    const generation = ++listGeneration.current;
    setListLoading(true);
    try {
      const response = await feedbackApi.list({ page, limit: pageSize });
      if (generation !== listGeneration.current) return;
      const rows = response.data || [];
      setItems(rows);
      setTotal(response.pagination?.total ?? rows.length);
    } catch (error) {
      if (generation !== listGeneration.current) return;
      setItems([]);
      setTotal(0);
      message.error(formatEzPrepError(error, "Failed to load feedback"));
    } finally {
      if (generation === listGeneration.current) setListLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-[#1677ff]">
          <MessageOutlined className="text-xl" />
          <Text className="text-xs font-semibold uppercase tracking-[0.16em]">
            Learners
          </Text>
        </div>
        <Title level={3} className="!mb-1 !mt-1">
          Feedback
        </Title>
        <Text type="secondary">
          Ratings are averaged from the stars learners chose to give. Written notes stay on each submission.
        </Text>
      </div>

      {summaryLoading && !summary ? (
        <div className="mb-6 flex min-h-[8rem] items-center justify-center rounded-2xl border border-neutral-200 bg-white">
          <Spin />
        </div>
      ) : summary ? (
        <SummaryBand summary={summary} />
      ) : null}

      {listLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spin size="large" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 py-16">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No feedback yet. Submissions from learners will show up here."
          />
        </div>
      ) : (
        <>
          <Text type="secondary" className="mb-3 block">
            Showing {items.length} of {total} submission{total === 1 ? "" : "s"}
          </Text>
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <FeedbackCard key={item.id} item={item} />
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Pagination
              current={page}
              pageSize={pageSize}
              total={total}
              showSizeChanger
              pageSizeOptions={["10", "20", "50"]}
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

function SummaryBand({ summary }: { summary: FeedbackSummary }) {
  return (
    <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="lg:w-56 lg:shrink-0">
          <Text type="secondary">Overall rating</Text>
          <div className="mt-1 flex items-end gap-2">
            <span className="text-5xl font-semibold leading-none text-neutral-900">
              {formatScore(summary.overall)}
            </span>
            <span className="mb-1 text-neutral-400">/ 5</span>
          </div>
          <Rate
            disabled
            allowHalf
            value={summary.overall ?? 0}
            className="mt-2"
          />
          <Text type="secondary" className="mt-2 block">
            {summary.feedbackCount} submission{summary.feedbackCount === 1 ? "" : "s"}
          </Text>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {FEEDBACK_RATING_FIELDS.map((field) => {
            const category = summary[field.key];
            return (
              <div
                key={field.key}
                className="rounded-xl bg-neutral-50 px-3 py-3"
              >
                <div className="text-sm text-neutral-600">{field.label}</div>
                <div className="mt-1 text-2xl font-semibold text-neutral-900">
                  {formatScore(category.average)}
                </div>
                <Rate
                  disabled
                  allowHalf
                  value={category.average ?? 0}
                  className="mt-1 text-sm"
                />
                <div className="mt-1 text-xs text-neutral-500">
                  {ratingCountLabel(category.count)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeedbackCard({ item }: { item: FeedbackItem }) {
  const given = FEEDBACK_RATING_FIELDS.filter(
    (field) => typeof item.ratings[field.key] === "number"
  );

  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-medium text-neutral-900">
            {item.user?.name || "Unknown user"}
          </div>
          {item.user?.email ? (
            <div className="text-sm text-neutral-500">
              {maskEmail(item.user.email)}
            </div>
          ) : null}
        </div>
        <time className="text-sm text-neutral-400" dateTime={item.createdAt}>
          {formatWhen(item.createdAt)}
        </time>
      </div>
      {item.text ? (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-neutral-800">
          {item.text}
        </p>
      ) : (
        <p className="mt-4 text-sm italic text-neutral-400">No written feedback</p>
      )}
      {given.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2 border-t border-neutral-100 pt-4">
          {given.map((field) => (
            <RatingLine
              key={field.key}
              label={field.label}
              value={item.ratings[field.key] as number}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function RatingLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-start sm:gap-4">
      <span className="w-40 text-sm text-neutral-600">{label}</span>
      <Rate disabled value={value} />
      <span className="text-sm font-medium text-neutral-800">{value}</span>
    </div>
  );
}
