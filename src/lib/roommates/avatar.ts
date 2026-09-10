const AVATAR_COLORS = [
  "bg-[#C45C26] text-white",
  "bg-[#3F6B4D] text-white",
  "bg-[#3D5A80] text-white",
  "bg-[#B08900] text-white",
  "bg-[#6B3FA0] text-white",
];

export function initialsFor(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function avatarClassFor(name: string): string {
  const sum = Array.from(name).reduce((total, char) => total + char.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}
