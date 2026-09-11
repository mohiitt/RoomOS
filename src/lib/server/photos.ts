import "server-only";

export function extensionForPhoto(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName) && fromName.length <= 5) {
    return fromName;
  }
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/heic" || file.type === "image/heif") return "heic";
  return "jpg";
}

export const ALLOWED_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
]);

export function assertPhotoFile(file: File) {
  if (file.type && !ALLOWED_PHOTO_TYPES.has(file.type)) {
    throw new Error("Choose a photo");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Keep photos under 8 MB");
  }
}
