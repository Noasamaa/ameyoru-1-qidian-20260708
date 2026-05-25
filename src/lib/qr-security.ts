import { z } from "zod";

export const qrSecurityCodeSchema = z
  .string()
  .min(6, "收款码安全码至少 6 位")
  .max(32, "收款码安全码不能超过 32 位")
  .regex(/^[\p{L}\p{N}_.@#-]+$/u, "收款码安全码只能包含文字、数字和常用符号");
