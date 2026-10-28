import { Tag } from "antd";

const TAG_COLORS = [
  "magenta",
  "cyan",
  "geekblue",
  "gold",
  "lime",
  "volcano",
  "purple",
  "blue",
  "green",
  "orange",
];

export function questionTagColor(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  return TAG_COLORS[hash % TAG_COLORS.length];
}

export function questionTagLabels(tags?: unknown): string[] {
  if (!Array.isArray(tags)) return [];

  const labels: string[] = [];
  const seen = new Set<string>();
  for (const tag of tags) {
    const label =
      typeof tag === "string"
        ? tag.trim()
        : tag && typeof tag === "object" && "name" in tag && typeof tag.name === "string"
          ? tag.name.trim()
          : "";
    if (!label || /^[a-f\d]{24}$/i.test(label) || seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  return labels;
}

export function QuestionTags({ tags }: { tags?: unknown }) {
  const labels = questionTagLabels(tags);
  if (labels.length === 0) {
    return <Tag>No Tags</Tag>;
  }

  return (
    <span className="inline-flex flex-wrap gap-1">
      {labels.map((label) => (
        <Tag key={label} color={questionTagColor(label)}>
          {label}
        </Tag>
      ))}
    </span>
  );
}

export function questionTagsColumn() {
  return {
    title: "Tags",
    dataIndex: "tags",
    key: "tags",
    render: (tags?: unknown) => <QuestionTags tags={tags} />,
  };
}
