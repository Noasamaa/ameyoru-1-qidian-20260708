/** 简短 ID(URL 安全,约 80 bit 熵) */
export function nanoid(size = 16): string {
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < size; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/** 7 位数字会员号(避免首位 0) */
export function generateMemberNo(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  // 取 32-bit 数 + 偏移到 7 位数范围 [1000000, 9999999]
  const n =
    1000000 +
    ((bytes[0] << 24) ^ (bytes[1] << 16) ^ (bytes[2] << 8) ^ bytes[3]) %
      9000000;
  return Math.abs(n).toString();
}
