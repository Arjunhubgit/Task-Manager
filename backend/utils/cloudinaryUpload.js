const crypto = require("crypto");

const DEFAULT_FOLDER = "taskmanager/profile-pictures";

const fetchFn = (...args) => {
  if (typeof fetch === "function") {
    return fetch(...args);
  }
  return import("node-fetch").then(({ default: nodeFetch }) => nodeFetch(...args));
};

const toSafePublicId = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);

const hasCloudinaryConfig = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      (process.env.CLOUDINARY_UPLOAD_PRESET ||
        (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET))
  );

const createSignature = (params, apiSecret) => {
  const serializedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto.createHash("sha1").update(`${serializedParams}${apiSecret}`).digest("hex");
};

const buildUploadBody = ({ file, folder, publicId, overwrite, invalidate }) => {
  const cloudinaryBody = new URLSearchParams();
  const timestamp = Math.floor(Date.now() / 1000);

  cloudinaryBody.append("file", file);
  if (folder) cloudinaryBody.append("folder", folder);
  if (publicId) cloudinaryBody.append("public_id", publicId);
  if (overwrite) cloudinaryBody.append("overwrite", "true");
  if (invalidate) cloudinaryBody.append("invalidate", "true");

  if (process.env.CLOUDINARY_UPLOAD_PRESET) {
    cloudinaryBody.append("upload_preset", process.env.CLOUDINARY_UPLOAD_PRESET);
    return cloudinaryBody;
  }

  const { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error(
      "Cloudinary credentials are missing. Set CLOUDINARY_UPLOAD_PRESET or CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET."
    );
  }

  const signatureParams = { timestamp };
  if (folder) signatureParams.folder = folder;
  if (publicId) signatureParams.public_id = publicId;
  if (overwrite) signatureParams.overwrite = "true";
  if (invalidate) signatureParams.invalidate = "true";

  const signature = createSignature(signatureParams, CLOUDINARY_API_SECRET);
  cloudinaryBody.append("timestamp", String(timestamp));
  cloudinaryBody.append("api_key", CLOUDINARY_API_KEY);
  cloudinaryBody.append("signature", signature);

  return cloudinaryBody;
};

const uploadToCloudinary = async ({
  file,
  folder = DEFAULT_FOLDER,
  publicId,
  overwrite = true,
  invalidate = true,
}) => {
  if (!hasCloudinaryConfig()) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME plus either CLOUDINARY_UPLOAD_PRESET or CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET."
    );
  }

  if (!file) {
    throw new Error("Missing file for Cloudinary upload.");
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
  const body = buildUploadBody({ file, folder, publicId, overwrite, invalidate });
  const response = await fetchFn(endpoint, {
    method: "POST",
    body,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.secure_url) {
    const cloudinaryMessage = payload?.error?.message || "Cloudinary upload failed.";
    throw new Error(cloudinaryMessage);
  }

  return payload;
};

const uploadBufferImageToCloudinary = async ({
  buffer,
  mimeType = "image/jpeg",
  folder = DEFAULT_FOLDER,
  publicId,
  overwrite = true,
  invalidate = true,
}) => {
  if (!buffer) {
    throw new Error("No file buffer provided.");
  }

  const base64 = Buffer.from(buffer).toString("base64");
  const dataUri = `data:${mimeType};base64,${base64}`;

  return uploadToCloudinary({ file: dataUri, folder, publicId, overwrite, invalidate });
};

const uploadImageUrlToCloudinary = async ({
  imageUrl,
  folder = DEFAULT_FOLDER,
  publicId,
  overwrite = true,
  invalidate = true,
}) => {
  if (!imageUrl) {
    throw new Error("Image URL is required.");
  }

  return uploadToCloudinary({ file: imageUrl, folder, publicId, overwrite, invalidate });
};

module.exports = {
  DEFAULT_FOLDER,
  hasCloudinaryConfig,
  toSafePublicId,
  uploadBufferImageToCloudinary,
  uploadImageUrlToCloudinary,
};
