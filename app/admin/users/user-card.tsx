"use client";

import { Avatar, Tag, Tooltip } from "antd";
import {
  EnvironmentOutlined,
  MailOutlined,
  PhoneOutlined,
  ReadOutlined,
} from "@ant-design/icons";
import type { AttemptStatusCounts, AppUser } from "@/app/services/ezprep-api/users";
import { planAccent, planStyle, tierStyle } from "./constants";
import {
  attendedTotal,
  avatarColor,
  formatJoinedDate,
  formatLocation,
  getInitials,
  maskEmail,
  maskPhoneNumber,
  normalizeTestActivity,
  quantityLabel,
} from "./helpers";

function ActivityTile({
  title,
  attendedNoun,
  counts,
  accent,
}: {
  title: string;
  attendedNoun: { singular: string; plural: string };
  counts: AttemptStatusCounts;
  accent: string;
}) {
  const attended = attendedTotal(counts);

  return (
    <div
      className="min-w-0 rounded-xl bg-neutral-50 px-3 py-2.5"
      aria-label={`${quantityLabel(attended, attendedNoun.singular, attendedNoun.plural)}, ${quantityLabel(counts.finished, "finished", "finished")}, ${quantityLabel(counts.open, "in progress", "in progress")}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          {title}
        </span>
        <span
          className="text-lg font-semibold tabular-nums leading-none"
          style={{ color: accent }}
        >
          {attended}
        </span>
      </div>
      <div className="mt-2 flex flex-col gap-0.5 text-xs text-neutral-500 sm:flex-row sm:flex-wrap sm:gap-x-3">
        <span>
          <span className="font-medium tabular-nums text-emerald-700">
            {counts.finished}
          </span>{" "}
          finished
        </span>
        <Tooltip title="Started, in progress, or paused">
          <span>
            <span className="font-medium tabular-nums text-amber-700">
              {counts.open}
            </span>{" "}
            in progress
          </span>
        </Tooltip>
      </div>
    </div>
  );
}

export function UserCard({ user }: { user: AppUser }) {
  const plan = planStyle(user.subscription?.plan);
  const tier = tierStyle(user.membershipTier);
  const accent = planAccent(user.subscription?.plan);
  const location = formatLocation(user.location);
  const activity = normalizeTestActivity(user.testActivity);
  const finishedTotal = activity.fullExam.finished + activity.topicWise.finished;
  const openTotal = activity.fullExam.open + activity.topicWise.open;
  const email = maskEmail(user.email);
  const phoneNumber = maskPhoneNumber(user.phoneNumber);

  return (
    <article
      className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
      style={{ opacity: user.isActive ? 1 : 0.78 }}
      data-testid="user-card"
      data-user-id={user.id}
    >
      <div className="h-1.5 w-full" style={{ background: accent }} />
      <div
        className="pointer-events-none absolute inset-x-0 top-1.5 h-24"
        style={{
          background: `linear-gradient(180deg, ${accent}14 0%, #ffffff 100%)`,
        }}
      />

      <div className="relative p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Avatar
            size={56}
            src={user.avatarUrl || undefined}
            style={{
              backgroundColor: avatarColor(user.id || user.name),
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {getInitials(user.name)}
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="m-0 truncate text-base font-semibold text-neutral-900">
                {user.name || "Unnamed learner"}
              </h3>
              <Tag
                color={user.isActive ? "success" : "default"}
                className="m-0 shrink-0"
              >
                {user.isActive ? "Active" : "Inactive"}
              </Tag>
            </div>
            <p className="mb-0 mt-1 flex items-center gap-1.5 truncate text-sm text-neutral-500">
              <MailOutlined className="shrink-0" />
              <span className="truncate">{email || "No email"}</span>
            </p>
            {phoneNumber ? (
              <p className="mb-0 mt-0.5 flex items-center gap-1.5 truncate text-sm text-neutral-500">
                <PhoneOutlined className="shrink-0" />
                <span className="truncate">{phoneNumber}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Tag
            className="m-0 border-0"
            style={{ color: plan.color, background: plan.background }}
          >
            {plan.label}
          </Tag>
          <Tag
            className="m-0 border-0"
            style={{ color: tier.color, background: tier.background }}
          >
            {tier.label}
          </Tag>
          {user.targetExam?.name ? (
            <Tooltip title="Target exam">
              <Tag className="m-0" icon={<ReadOutlined />}>
                {user.targetExam.name}
              </Tag>
            </Tooltip>
          ) : null}
        </div>

        {location ? (
          <p className="mb-0 mt-3 flex items-center gap-1.5 text-xs text-neutral-500">
            <EnvironmentOutlined />
            {location}
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
          <ActivityTile
            title="Full mocks"
            attendedNoun={{
              singular: "full mock attended",
              plural: "full mocks attended",
            }}
            counts={activity.fullExam}
            accent={accent}
          />
          <ActivityTile
            title="Topic tests"
            attendedNoun={{
              singular: "topic test attempted",
              plural: "topic tests attempted",
            }}
            counts={activity.topicWise}
            accent={accent}
          />
        </div>

        <div className="mt-3 flex flex-col gap-1 border-t border-neutral-100 pt-3 text-xs text-neutral-400 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
          <span>
            {quantityLabel(finishedTotal, "finished", "finished")}
            {" · "}
            {quantityLabel(openTotal, "in progress", "in progress")}
          </span>
          <span className="shrink-0">Joined {formatJoinedDate(user.createdAt)}</span>
        </div>
      </div>
    </article>
  );
}
