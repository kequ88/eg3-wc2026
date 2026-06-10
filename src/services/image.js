// src/services/image.js
//
// Handles client-side image compression before storing as base64 in Firestore.
//
// WHY COMPRESS?
//   A typical phone photo is 3–8MB.
//   Firestore documents have a 1MB limit per document.
//   We resize to 200×200px and compress to JPEG 70% quality.
//   Result: ~15–30KB — well within Firestore limits.
//
// WHY CLIENT-SIDE?
//   No server needed. The browser's Canvas API does the work.
//   This is a common pattern for file-upload-free apps.

const MAX_WIDTH  = 200; // px
const QUALITY    = 0.7; // 70% JPEG quality
const MIME_TYPE  = 'image/jpeg';

// Compresses a File object and returns a base64 data URL string.
// Usage: const base64 = await compressImage(file);
export const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      // Scale down proportionally
      const scale  = Math.min(1, MAX_WIDTH / img.width);
      const width  = Math.round(img.width  * scale);
      const height = Math.round(img.height * scale);

      // Draw onto a canvas at the new size
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      // Convert canvas to compressed base64
      const base64 = canvas.toDataURL(MIME_TYPE, QUALITY);

      URL.revokeObjectURL(url); // free memory
      resolve(base64);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
