"use client";

import { Card, Tag, Typography } from "antd";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  WEBHOOK_REENABLE_NOTE,
  commerceHealthApi,
  healthCards,
  type CommerceHealthReport,
  type HealthCardModel,
} from "@/app/services/ezprep-api/commerce-health";
import { formatEzPrepError } from "@/app/services/ezprep-api";

const { Title, Text, Paragraph } = Typography;

export default function CommerceHealthPage() {
  const [report, setReport] = useState<CommerceHealthReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    commerceHealthApi
      .get()
      .then((response) => {
        if (!cancelled) setReport(response.data);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(formatEzPrepError(reason, "Failed to load commerce health"));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <Paragraph type="danger">{error}</Paragraph>;
  }
  if (!report) {
    return <Paragraph>Loading commerce health</Paragraph>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Title level={4} className="mb-0">
          Commerce health
        </Title>
        <Tag color={report.status === "degraded" ? "red" : "green"}>{report.status}</Tag>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {healthCards(report).map((item) => (
          <HealthCardView key={item.key} card={item} />
        ))}
      </div>

      <Card title="Webhooks" className="shadow-sm">
        <div className="space-y-2">
          <div>
            <Text type="secondary">Last processed </Text>
            <Text>{formatWhen(report.webhook.lastWebhookProcessedAt)}</Text>
          </div>
          <div>
            <Text type="secondary">Signature rejections </Text>
            <Text>
              {report.webhook.signatureRejections1h} in the last hour,{" "}
              {report.webhook.signatureRejections24h} in 24 hours
            </Text>
          </div>
          <div>
            <Text type="secondary">Failed / ignored (24 hours) </Text>
            <Text>
              {report.webhook.failed24h} failed, {report.webhook.ignored24h} ignored
            </Text>
          </div>
          <div>
            <Text type="secondary">Silent while paid </Text>
            <Text>{report.webhook.webhookSilentWhilePaid ? "Yes" : "No"}</Text>
          </div>
          <Paragraph className="mb-0 text-sm text-gray-600">{WEBHOOK_REENABLE_NOTE}</Paragraph>
        </div>
      </Card>

      <Card title="Effective flags" className="shadow-sm">
        <dl className="grid gap-2 sm:grid-cols-2">
          {Object.entries(report.flags).map(([key, value]) => (
            <div key={key}>
              <dt className="text-xs text-gray-500">{key}</dt>
              <dd className="text-sm text-gray-900">{String(value)}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}

function HealthCardView({ card }: { card: HealthCardModel }) {
  return (
    <Card title={card.title} className="shadow-sm" extra={<Tag>{card.count}</Tag>}>
      <div className="space-y-2 text-sm">
        <div>
          <Text type="secondary">Oldest </Text>
          <Text>{card.oldestAt ? formatWhen(card.oldestAt) : "—"}</Text>
        </div>
        {card.detail ? <Text type="secondary">{card.detail}</Text> : null}
        {card.orderNumbers.length > 0 ? (
          <ul className="space-y-1">
            {card.orderNumbers.map((orderNumber) => (
              <li key={orderNumber}>
                <Link href={`/admin/orders?search=${encodeURIComponent(orderNumber)}`}>
                  {orderNumber}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {card.flag ? (
          <Link href={`/admin/orders?flag=${card.flag}`}>Filtered orders</Link>
        ) : null}
      </div>
    </Card>
  );
}

function formatWhen(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN");
}
