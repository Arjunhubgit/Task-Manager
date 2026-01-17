export const getImageUrl = (url) => {
  if (!url) return null;

  // If the URL is already an absolute path (Google, Cloudinary, etc.), return it as-is
  if (url.startsWith('http') || url.startsWith('https')) {
    return url;
  }

  // If it's a relative path from your Multer upload, prepend your backend BASE URL
  // Replace 'http://localhost:5000' with your actual production backend URL later
  const BACKEND_URL = "http://localhost:5000"; 
  return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
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