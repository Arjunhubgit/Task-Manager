import { BASE_URL } from "./apiPaths";

export const getImageUrl = (url) => {
  if (!url) return null;

  // If the URL is already an absolute path (Google, Cloudinary, etc.), return it as-is
  if (url.startsWith('http') || url.startsWith('https')) {
    return url;
  }

  // If it's a relative path from your Multer upload, prepend backend URL.
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(String(email).toLowerCase());
}

export const addThousandsSeparator = (num) => {
  if (num === null || isNaN(num)) return "";

  const [integerPart, fractionalPart] = num.toString().split(".");
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return fractionalPart
    ? `${formattedInteger}.${fractionalPart}`
    : formattedInteger;
};
