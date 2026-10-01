import { Avatar, Tag } from "antd";
import type { AppUserDetail, FinishedAttempt, PaperPerformance } from "@/app/services/ezprep-api/users";
import { planAccent, planStyle, tierStyle } from "../constants";
import {
  attemptContext,
  attemptStatusLabel,
  formatDateTime,
  formatDuration,
  formatPercent,
  formatScoreLine,
  genderLabel,
  performanceSummary,
  recentAttemptsCaption,
  studyTimeLabel,
  subscriptionStatusLabel,
  trendLabel,
} from "../details-helpers";
import {
  avatarColor,
  formatJoinedDate,
  formatLocation,
  getInitials,
  quantityLabel,
} from "../helpers";

function percentTone(value: number | null): string {
  if (value == null) {
    return "text-neutral-400";
  }
  if (value >= 70) {
    return "text-emerald-700";
  }
  if (value >= 40) {
    return "text-amber-700";
  }
  return "text-red-600";
}

function barTone(value: number | null): string {
  if (value == null) {
    return "bg-neutral-300";
  }
  if (value >= 70) {
    return "bg-emerald-500";
  }
  if (value >= 40) {
    return "bg-amber-500";
  }
  return "bg-red-500";
}

function trendColor(trend: PaperPerformance["trend"]): string {
  switch (trend) {
    case "improving":
      return "success";
    case "declining":
      return "error";
    case "steady":
      return "processing";
    default:
      return "default";
  }
}

function Fact({ label, value }: { label: string; value?: string | null }) {
  if (!value) {
    return null;
  }
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </dt>
      <dd className="mb-0 mt-0.5 break-words text-sm text-neutral-900">{value}</dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-neutral-50 px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div
        className={`mt-1 text-base font-semibold tabular-nums ${
          value === "—" ? "text-neutral-400" : "text-neutral-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function PerformanceCard({
  title,
  noun,
  performance,
}: {
  title: string;
  noun: { singular: string; plural: string };
  performance: PaperPerformance;
}) {
  const summary = performanceSummary(performance, noun);
  return (
    <section
      className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5"
      aria-label={title}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="m-0 text-base font-semibold text-neutral-900">{title}</h3>
        <Tag color={trendColor(performance.trend)} className="m-0">
          {trendLabel(performance.trend)}
        </Tag>
      </div>
      <p className="mb-0 mt-2 text-sm leading-relaxed text-neutral-600">{summary}</p>
      {performance.finishedCount > 0 ? (
        <>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <div className={`text-3xl font-semibold tabular-nums ${percentTone(performance.percentage)}`}>
                {formatPercent(performance.percentage)}
              </div>
              <div className="text-sm text-neutral-500">
                Combined {formatScoreLine(performance.score, performance.totalMarks)} marks
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Metric label="Average" value={formatPercent(performance.averagePercentage)} />
            <Metric label="Best" value={formatPercent(performance.bestPercentage)} />
            <Metric label="Latest" value={formatPercent(performance.latestPercentage)} />
          </div>
          <p className="mb-0 mt-4 text-sm text-neutral-600">
            {performance.accuracy == null
              ? "No answers recorded"
              : `Accuracy ${formatPercent(performance.accuracy)}`}
            {" · "}
            {quantityLabel(performance.correct, "correct", "correct")}
            {" · "}
            {quantityLabel(performance.incorrect, "wrong", "wrong")}
            {" · "}
            {quantityLabel(performance.unanswered, "skipped", "skipped")}
          </p>
          {performance.gradedCount > 0 ? (
            <p className="mb-0 mt-1 text-sm text-neutral-600">
              Passed {performance.passedCount} of {performance.gradedCount} with a pass mark
            </p>
          ) : null}
          {performance.trend !== "insufficient" ? (
            <p className="mb-0 mt-3 text-xs text-neutral-400">
              Recent form compares the latest scored test with the oldest scored test in the last five.
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function AttemptCard({
  attempt,
  position,
}: {
  attempt: FinishedAttempt;
  position: number;
}) {
  const context = attemptContext(attempt);
  const when = formatDateTime(attempt.submittedAt || attempt.startedAt);
  const taken = formatDuration(attempt.timeConsumedSeconds);
  const timing = [
    when,
    taken ? `${taken} taken` : null,
    attempt.durationInMinutes > 0 ? `${attempt.durationInMinutes}m limit` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const width = Math.min(100, Math.max(0, attempt.percentage ?? 0));

  return (
    <article
      className="rounded-2xl border border-neutral-200 bg-white p-4"
      data-testid="finished-attempt"
      aria-label={`${attempt.title}, ${formatScoreLine(attempt.score, attempt.totalMarks)}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold tabular-nums text-neutral-600">
            {position}
          </span>
          <div className="min-w-0">
            <h4 className="m-0 break-words text-sm font-semibold text-neutral-900">
              {attempt.title}
            </h4>
            {context ? (
              <p className="mb-0 mt-1 break-words text-xs text-neutral-500">{context}</p>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 sm:text-right">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            Score
          </div>
          <div className="text-xl font-semibold tabular-nums leading-tight text-neutral-900">
            {formatScoreLine(attempt.score, attempt.totalMarks)}
          </div>
          <div className={`mt-0.5 text-sm font-medium tabular-nums ${percentTone(attempt.percentage)}`}>
            {formatPercent(attempt.percentage)}
          </div>
        </div>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100"
        role="presentation"
      >
        <div
          className={`h-full rounded-full ${barTone(attempt.percentage)}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Tag className="m-0">{attemptStatusLabel(attempt.status)}</Tag>
        {attempt.passed === true ? (
          <Tag color="success" className="m-0">
            Passed
          </Tag>
        ) : null}
        {attempt.passed === false ? (
          <Tag color="error" className="m-0">
            Not passed
          </Tag>
        ) : null}
      </div>
      <p className="mb-0 mt-3 text-xs text-neutral-500">
        {quantityLabel(attempt.correct, "correct", "correct")}
        {" · "}
        {quantityLabel(attempt.incorrect, "wrong", "wrong")}
        {" · "}
        {quantityLabel(attempt.unanswered, "skipped", "skipped")}
        {attempt.totalQuestions > 0 ? ` · ${attempt.totalQuestions} questions` : ""}
      </p>
      {timing ? <p className="mb-0 mt-1 text-xs text-neutral-400">{timing}</p> : null}
    </article>
  );
}

function AttemptSection({
  title,
  description,
  emptyLabel,
  attempts,
  finishedCount,
  testId,
}: {
  title: string;
  description: string;
  emptyLabel: string;
  attempts: FinishedAttempt[];
  finishedCount: number;
  testId: string;
}) {
  const caption = recentAttemptsCaption(attempts.length, finishedCount);
  return (
    <section data-testid={testId} aria-label={title}>
      <div className="mb-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h3 className="m-0 text-base font-semibold text-neutral-900">{title}</h3>
          {caption ? <p className="mb-0 text-xs text-neutral-500">{caption}</p> : null}
        </div>
        <p className="mb-0 mt-1 text-sm text-neutral-500">{description}</p>
      </div>
      {attempts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500">
          {emptyLabel}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {attempts.map((attempt, index) => (
            <AttemptCard key={attempt.id} attempt={attempt} position={index + 1} />
          ))}
        </div>
      )}
    </section>
  );
}

export function UserDetailView({ detail }: { detail: AppUserDetail }) {
  const { profile, analysis } = detail;
  const plan = planStyle(profile.subscription?.plan);
  const tier = tierStyle(profile.membershipTier);
  const accent = planAccent(profile.subscription?.plan);
  const location = formatLocation(profile.location);
  const activity = profile.testActivity;
  const subscriptionStatus = subscriptionStatusLabel(profile.subscription?.status);
  const studyTime = studyTimeLabel(profile.study?.studyTime);
  const weeklyGoal =
    profile.study?.weeklyStudyGoalHours && profile.study.weeklyStudyGoalHours > 0
      ? `${profile.study.weeklyStudyGoalHours} hours / week`
      : null;
  const autoRenew =
    typeof profile.subscription?.autoRenew === "boolean"
      ? profile.subscription.autoRenew
        ? "On"
        : "Off"
      : null;

  return (
    <div className="w-full space-y-6" data-testid="user-detail">
      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="h-1.5 w-full" style={{ background: accent }} />
        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <Avatar
              size={64}
              src={profile.avatarUrl || undefined}
              style={{
                backgroundColor: avatarColor(profile.id || profile.name),
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {getInitials(profile.name)}
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="m-0 break-words text-xl font-semibold text-neutral-900 sm:text-2xl">
                  {profile.name || "Unnamed learner"}
                </h2>
                <Tag color={profile.isActive ? "success" : "default"} className="m-0">
                  {profile.isActive ? "Active" : "Inactive"}
                </Tag>
              </div>
              <p className="mb-0 mt-1 break-all text-sm text-neutral-500">
                {profile.email || "No email"}
              </p>
              {profile.phoneNumber ? (
                <p className="mb-0 mt-0.5 text-sm text-neutral-500">{profile.phoneNumber}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <Tag className="m-0 border-0" style={{ color: plan.color, background: plan.background }}>
              {plan.label}
            </Tag>
            <Tag className="m-0 border-0" style={{ color: tier.color, background: tier.background }}>
              {tier.label}
            </Tag>
            {subscriptionStatus ? <Tag className="m-0">{subscriptionStatus}</Tag> : null}
            {profile.targetExam?.name ? <Tag className="m-0">{profile.targetExam.name}</Tag> : null}
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Fact label="Gender" value={genderLabel(profile.gender)} />
            <Fact label="Date of birth" value={profile.dateOfBirth ? formatJoinedDate(profile.dateOfBirth) : null} />
            <Fact label="Location" value={location} />
            <Fact label="Timezone" value={profile.location?.timezone} />
            <Fact
              label="Target exam date"
              value={profile.targetExamDate ? formatJoinedDate(profile.targetExamDate) : null}
            />
            <Fact label="Study time" value={studyTime} />
            <Fact label="Weekly goal" value={weeklyGoal} />
            <Fact label="Badges" value={quantityLabel(profile.badgesEarnedCount ?? 0, "badge", "badges")} />
            <Fact
              label="Subscription started"
              value={
                profile.subscription?.startedAt
                  ? formatJoinedDate(profile.subscription.startedAt)
                  : null
              }
            />
            <Fact
              label="Subscription expires"
              value={
                profile.subscription?.expiresAt
                  ? formatJoinedDate(profile.subscription.expiresAt)
                  : null
              }
            />
            <Fact
              label="Trial ends"
              value={
                profile.subscription?.trialEndsAt
                  ? formatJoinedDate(profile.subscription.trialEndsAt)
                  : null
              }
            />
            <Fact label="Auto-renew" value={autoRenew} />
            <Fact label="Joined" value={formatJoinedDate(profile.createdAt)} />
            <Fact label="Updated" value={profile.updatedAt ? formatJoinedDate(profile.updatedAt) : null} />
          </dl>

          {profile.bio ? (
            <p className="mb-0 mt-5 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
              {profile.bio}
            </p>
          ) : null}

          {activity ? (
            <div className="mt-5 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
              <div className="rounded-xl bg-neutral-50 px-3 py-2.5" aria-label="Full mock activity">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                  Full mocks
                </div>
                <p className="mb-0 mt-1 text-sm text-neutral-700">
                  {quantityLabel(
                    activity.fullExam.finished + activity.fullExam.open,
                    "attended",
                    "attended"
                  )}
                  {" · "}
                  {activity.fullExam.finished} finished · {activity.fullExam.open} in progress
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2.5" aria-label="Topic test activity">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                  Topic tests
                </div>
                <p className="mb-0 mt-1 text-sm text-neutral-700">
                  {quantityLabel(
                    activity.topicWise.finished + activity.topicWise.open,
                    "attempted",
                    "attempted"
                  )}
                  {" · "}
                  {activity.topicWise.finished} finished · {activity.topicWise.open} in progress
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2.5" aria-label="Sprint test activity">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                  Sprint tests
                </div>
                <p className="mb-0 mt-1 text-sm text-neutral-700">
                  {quantityLabel(
                    activity.sprint.finished + activity.sprint.open,
                    "attended",
                    "attended"
                  )}
                  {" · "}
                  {activity.sprint.finished} finished · {activity.sprint.open} in progress
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-3" data-testid="performance-analysis">
        <div>
          <h2 className="m-0 text-lg font-semibold text-neutral-900">Performance</h2>
          <p className="mb-0 mt-1 text-sm text-neutral-500">
            Scores use finished tests only. A test is finished when it is submitted or the time expires.
          </p>
        </div>
        <PerformanceCard
          title="Overall"
          noun={{ singular: "test", plural: "tests" }}
          performance={analysis.overall}
        />
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
          <div className="space-y-4">
            <PerformanceCard
              title="Topic tests"
              noun={{ singular: "topic test", plural: "topic tests" }}
              performance={analysis.topicWise}
            />
            <AttemptSection
              title="Each topic test"
              description="Score on each of the last 5 finished topic tests, newest first."
              emptyLabel="This learner has not finished a topic test."
              attempts={detail.recentTopicWiseAttempts}
              finishedCount={analysis.topicWise.finishedCount}
              testId="topic-attempts"
            />
          </div>
          <div className="space-y-4">
            <PerformanceCard
              title="Full mocks"
              noun={{ singular: "full mock", plural: "full mocks" }}
              performance={analysis.fullExam}
            />
            <AttemptSection
              title="Each full mock"
              description="Score on each of the last 5 finished full mocks, newest first."
              emptyLabel="This learner has not finished a full mock."
              attempts={detail.recentFullExamAttempts}
              finishedCount={analysis.fullExam.finishedCount}
              testId="full-exam-attempts"
            />
          </div>
          <div className="space-y-4">
            <PerformanceCard
              title="Sprint tests"
              noun={{ singular: "sprint test", plural: "sprint tests" }}
              performance={analysis.sprint}
            />
            <AttemptSection
              title="Each sprint test"
              description="Score on each of the last 5 finished sprint tests, newest first."
              emptyLabel="This learner has not finished a sprint test."
              attempts={detail.recentSprintAttempts}
              finishedCount={analysis.sprint.finishedCount}
              testId="sprint-attempts"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
