import jpeg from "jpeg-js";
export function sanitizeProfileImage(
  bytes: Uint8Array,
  kind: "avatar" | "banner",
) {
  if (
    bytes.length > 524288 ||
    bytes.length < 4 ||
    bytes[0] !== 255 ||
    bytes[1] !== 216
  )
    throw new Error("Upload a JPEG image under 512 KB.");
  const image = jpeg.decode(bytes, {
    useTArray: true,
    maxResolutionInMP: 0.4,
    maxMemoryUsageInMB: 32,
    tolerantDecoding: false,
  });
  const maxWidth = kind === "avatar" ? 384 : 960,
    maxHeight = kind === "avatar" ? 384 : 320;
  if (
    image.width < 32 ||
    image.height < 32 ||
    image.width > maxWidth ||
    image.height > maxHeight ||
    image.width !== image.height * (kind === "avatar" ? 1 : 3)
  )
    throw new Error("The image dimensions or crop are invalid.");
  const clean = jpeg.encode(
    { data: image.data, width: image.width, height: image.height },
    75,
  ).data;
  if (clean.length > (kind === "avatar" ? 204800 : 512000))
    throw new Error("Image is too detailed. Choose a smaller crop.");
  return clean;
}
