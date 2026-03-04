export type TagType = "Topic" | "Tone";

export const TAG_COLOR_MAP: Record<
  TagType,
  {
    bg: string;
    text: string;
    border?: string;
  }
> = {
  Topic: {
    bg: "bg-blue-100",
    text: "text-blue-700",
  },
  Tone: {
    bg: "bg-green-100",
    text: "text-green-700",
  },
};

export function getTagClasses(type?: TagType) {
  if (!type) {
    return "bg-gray-100 text-gray-700";
  }

  const color = TAG_COLOR_MAP[type];
  return `${color.bg} ${color.text}`;
}
