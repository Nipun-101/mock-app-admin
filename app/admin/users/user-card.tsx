"use client";

import { Avatar, Tag, Tooltip } from "antd";
import {
  EnvironmentOutlined,
  ExperimentOutlined,
  MailOutlined,
  PhoneOutlined,
  ReadOutlined,
} from "@ant-design/icons";
import type { AppUser } from "@/app/services/ezprep-api/users";
import { planAccent, planStyle, tierStyle } from "./constants";
import {
  avatarColor,
  formatJoinedDate,
  formatLocation,
  getInitials,
  maskEmail,
  maskPhoneNumber,
  testsAttendedLabel,
} from "./helpers";

export function UserCard({ user }: { user: AppUser }) {
  const plan = planStyle(user.subscription?.plan);
  const tier = tierStyle(user.membershipTier);
  const accent = planAccent(user.subscription?.plan);
  const location = formatLocation(user.location);
  const testsCount = Number.isFinite(user.testsAttendedCount)
    ? Math.max(0, user.testsAttendedCount)
    : 0;
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
        className="absolute inset-x-0 top-1.5 h-24 pointer-events-none"
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
              <h3 className="m-0 text-base font-semibold text-neutral-900 truncate">
                {user.name || "Unnamed learner"}
              </h3>
              <Tag
                color={user.isActive ? "success" : "default"}
                className="m-0 shrink-0"
              >
                {user.isActive ? "Active" : "Inactive"}
              </Tag>
            </div>
            <p className="mt-1 mb-0 flex items-center gap-1.5 text-sm text-neutral-500 truncate">
              <MailOutlined className="shrink-0" />
              <span className="truncate">{email || "No email"}</span>
            </p>
            {phoneNumber ? (
              <p className="mt-0.5 mb-0 flex items-center gap-1.5 text-sm text-neutral-500 truncate">
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
          <p className="mt-3 mb-0 flex items-center gap-1.5 text-xs text-neutral-500">
            <EnvironmentOutlined />
            {location}
          </p>
        ) : null}

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-neutral-100 pt-3">
          <div className="flex items-center gap-2 text-neutral-800">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: `${accent}18`, color: accent }}
            >
              <ExperimentOutlined />
            </span>
            <div>
              <div className="text-xl font-semibold leading-none">
                {testsCount}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-neutral-400">
                {testsAttendedLabel(testsCount).replace(/^\d+\s/, "")}
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-neutral-400">
            Joined {formatJoinedDate(user.createdAt)}
          </div>
        </div>
      </div>
    </article>
  );
}
