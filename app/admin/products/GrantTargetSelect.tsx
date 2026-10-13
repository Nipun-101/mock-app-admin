"use client";

import { Spin } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Select } from "@/app/components/SearchableSelect";
import {
  formatEzPrepError,
  grantTargetsApi,
  type EntitlementScopeType,
} from "@/app/services/ezprep-api";
import type { ScopeOption } from "./grant-options";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

type Props = {
  scopeType?: EntitlementScopeType;
  value?: string[];
  onChange?: (ids: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
};

function uniqueIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0))
  );
}

export function GrantTargetSelect({
  scopeType,
  value,
  onChange,
  disabled,
  placeholder = "Search and select one or more targets",
  id,
}: Props) {
  const selectedIds = useMemo(() => uniqueIds(value), [value]);
  const selectedKey = selectedIds.join("|");
  const [searchValue, setSearchValue] = useState("");
  const [results, setResults] = useState<ScopeOption[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const requestSeq = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const labelsRef = useRef<Record<string, string>>({});
  const resolvedIdsKey = useRef("");
  const inFlight = useRef(false);
  const latestQuery = useRef<string | null>(null);
  const scopeTypeRef = useRef(scopeType);
  scopeTypeRef.current = scopeType;

  const rememberLabels = useCallback((rows: ScopeOption[]) => {
    if (rows.length === 0) return;
    const next = { ...labelsRef.current };
    for (const row of rows) next[row.value] = row.label;
    labelsRef.current = next;
    setLabels(next);
  }, []);

  const fetchPage = useCallback(
    async (search: string, nextPage: number, append: boolean) => {
      if (!scopeType) return;
      if (append && inFlight.current) return;

      const seq = ++requestSeq.current;
      const activeScope = scopeType;
      inFlight.current = true;
      setLoading(true);
      if (!append) setError(null);

      try {
        const response = await grantTargetsApi.search({
          scopeType,
          search: search.trim() || undefined,
          page: nextPage,
          limit: PAGE_SIZE,
        });
        if (seq !== requestSeq.current || scopeTypeRef.current !== activeScope) {
          return;
        }

        const rows = (response.data ?? []).map((row) => ({
          value: row.id,
          label: row.label,
        }));
        rememberLabels(rows);
        setResults((prev) => {
          const merged = append ? [...prev, ...rows] : rows;
          const seen = new Set<string>();
          return merged.filter((row) => {
            if (seen.has(row.value)) return false;
            seen.add(row.value);
            return true;
          });
        });
        const pagination = response.pagination;
        const nextTotal = pagination?.total ?? rows.length;
        setTotal(nextTotal);
        setPage(pagination?.page ?? nextPage);
        setHasNextPage(
          pagination?.hasNextPage ??
            nextPage * PAGE_SIZE < nextTotal
        );
      } catch (fetchError) {
        if (seq !== requestSeq.current || scopeTypeRef.current !== activeScope) {
          return;
        }
        setError(
          formatEzPrepError(fetchError, "Couldn't load targets. Try again.")
        );
      } finally {
        if (seq === requestSeq.current) {
          inFlight.current = false;
          setLoading(false);
        }
      }
    },
    [rememberLabels, scopeType]
  );

  useEffect(() => {
    labelsRef.current = {};
    resolvedIdsKey.current = "";
    latestQuery.current = null;
    setLabels({});
    setResults([]);
    setSearchValue("");
    setError(null);
    setTotal(0);
    setPage(1);
    setHasNextPage(false);
    if (!scopeType) {
      setLoading(false);
      return;
    }
    void fetchPage("", 1, false);
  }, [fetchPage, scopeType]);

  useEffect(() => {
    if (!scopeType || selectedKey.length === 0) return;
    const ids = selectedKey.split("|");
    const missing = ids.filter((id) => labelsRef.current[id] == null);
    if (missing.length === 0) return;
    const key = `${scopeType}:${missing.join(",")}`;
    if (resolvedIdsKey.current === key) return;
    resolvedIdsKey.current = key;

    let cancelled = false;
    const activeScope = scopeType;
    void grantTargetsApi
      .search({
        scopeType,
        ids: missing.slice(0, 100).join(","),
      })
      .then((response) => {
        if (cancelled || scopeTypeRef.current !== activeScope) return;
        const next = { ...labelsRef.current };
        const returned = new Set<string>();
        for (const row of response.data ?? []) {
          next[row.id] = row.label;
          returned.add(row.id);
        }
        for (const id of missing) {
          if (!returned.has(id)) next[id] = "";
        }
        labelsRef.current = next;
        setLabels(next);
      })
      .catch(() => {
        if (cancelled || scopeTypeRef.current !== activeScope) return;
        resolvedIdsKey.current = "";
      });

    return () => {
      cancelled = true;
    };
  }, [scopeType, selectedKey]);

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const scheduleSearch = (text: string, immediate: boolean) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const run = () => {
      latestQuery.current = text;
      void fetchPage(text, 1, false);
    };
    if (immediate) {
      run();
      return;
    }
    searchTimer.current = setTimeout(run, DEBOUNCE_MS);
  };

  const options = useMemo(() => {
    const byId = new Map<string, ScopeOption>();
    for (const id of selectedIds) {
      const label = labels[id];
      byId.set(id, { value: id, label: label || id });
    }
    for (const row of results) {
      byId.set(row.value, row);
    }
    return Array.from(byId.values());
  }, [labels, results, selectedIds]);

  const trimmedSearch = searchValue.trim();
  const notFoundContent = loading ? (
    <Spin size="small" />
  ) : error ? (
    <span>{error}</span>
  ) : trimmedSearch ? (
    `No targets match “${trimmedSearch}”`
  ) : (
    "No targets"
  );

  const showCount = total > results.length;

  return (
    <Select
      id={id}
      className="min-w-[280px] flex-1"
      mode="multiple"
      allowClear
      placeholder={scopeType ? placeholder : "Select scope type first"}
      size="large"
      options={options}
      disabled={disabled || !scopeType}
      filterOption={false}
      searchValue={searchValue}
      loading={loading}
      maxTagCount="responsive"
      value={selectedIds}
      notFoundContent={notFoundContent}
      onSearch={(text) => {
        setSearchValue(text);
        if (text === latestQuery.current) return;
        scheduleSearch(text, false);
      }}
      onOpenChange={(open) => {
        if (!open || !scopeType) return;
        setSearchValue("");
        scheduleSearch("", true);
      }}
      onPopupScroll={(event) => {
        if (!hasNextPage || inFlight.current) return;
        const element = event.target as HTMLElement;
        if (element.scrollTop + element.offsetHeight < element.scrollHeight - 24) {
          return;
        }
        void fetchPage(searchValue, page + 1, true);
      }}
      popupRender={(menu) => (
        <div>
          {error ? (
            <div
              className="px-3 py-2 text-xs text-red-600"
              data-testid="grant-target-error"
            >
              {error}
            </div>
          ) : null}
          {menu}
          {showCount && !error ? (
            <div
              className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500"
              data-testid="grant-target-status"
            >
              Showing {results.length} of {total}. Scroll for more or refine the
              search.
            </div>
          ) : null}
        </div>
      )}
      onChange={(nextIds: string[]) => {
        const ids = uniqueIds(nextIds);
        const nextLabels = { ...labelsRef.current };
        for (const id of ids) {
          const match = results.find((row) => row.value === id);
          if (match) nextLabels[id] = match.label;
        }
        labelsRef.current = nextLabels;
        setLabels(nextLabels);
        onChange?.(ids);
      }}
    />
  );
}
