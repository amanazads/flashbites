const hasSignature = (buffer, signature) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < signature.length) {
    return false;
  }
  return signature.every((byte, index) => buffer[index] === byte);
};

const detectFileTypeBySignature = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return null;

  if (hasSignature(buffer, [0x25, 0x50, 0x44, 0x46])) return 'application/pdf';
  if (hasSignature(buffer, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (hasSignature(buffer, [0x89, 0x50, 0x4e, 0x47])) return 'image/png';
  if (hasSignature(buffer, [0x47, 0x49, 0x46, 0x38])) return 'image/gif';

  const isWebp = hasSignature(buffer, [0x52, 0x49, 0x46, 0x46])
    && buffer.length >= 12
    && String.fromCharCode(buffer[8], buffer[9], buffer[10], buffer[11]) === 'WEBP';
  if (isWebp) return 'image/webp';

  return null;
};

const ensureAllowedFile = (file, allowedMimeTypes, fieldName = 'file') => {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw new Error(`Missing upload buffer for ${fieldName}`);
  }

  const detected = detectFileTypeBySignature(file.buffer);
  if (!detected || !allowedMimeTypes.includes(detected)) {
    throw new Error(`Invalid file content for ${fieldName}. Allowed: ${allowedMimeTypes.join(', ')}`);
  }

  if (file.mimetype && !allowedMimeTypes.includes(file.mimetype)) {
    throw new Error(`MIME type mismatch for ${fieldName}`);
  }

  return detected;
};

module.exports = {
  detectFileTypeBySignature,
  ensureAllowedFile
};