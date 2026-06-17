import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type DiscountTarget = "course" | "subscription";
export type DiscountType = "fixed" | "percentage";
export type DiscountScope = "all" | DiscountTarget;

type DiscountCodeDoc = {
  code?: string;
  title?: string;
  active?: boolean;
  appliesTo?: DiscountScope | string;
  targetCourseIds?: unknown;
  discountType?: DiscountType | string;
  discountValue?: number | string;
  minAmount?: number | string;
  maxDiscount?: number | string;
  startsAt?: unknown;
  endsAt?: unknown;
};

type DiscountValidationSuccess = {
  ok: true;
  code: string;
  title: string | null;
  scope: DiscountScope;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  finalAmount: number;
};

type DiscountValidationFailure = {
  ok: false;
  code: string;
  error: string;
};

export type DiscountValidationResult = DiscountValidationSuccess | DiscountValidationFailure;

const FALLBACK_ERROR = "Gagal memeriksa kode unik. Coba lagi.";

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const normalized = value.replace(/[^\d.-]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const toMillis = (value: unknown): number | null => {
  if (!value) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const maybeTimestamp = value as { toMillis?: () => number };
  if (typeof maybeTimestamp.toMillis === "function") {
    const parsed = maybeTimestamp.toMillis();
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const normalizeAmount = (amount: number) => Math.max(0, Math.floor(amount));
const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : [];

export const normalizeDiscountCode = (code: string) =>
  code.trim().toUpperCase().replace(/\s+/g, "");

const resolveScope = (raw: unknown): DiscountScope => {
  if (raw === "course" || raw === "subscription" || raw === "all") return raw;
  return "all";
};

const resolveDiscountType = (raw: unknown): DiscountType => {
  if (raw === "percentage") return "percentage";
  return "fixed";
};

const isScopeAllowed = (scope: DiscountScope, target: DiscountTarget) =>
  scope === "all" || scope === target;

const invalid = (code: string, error: string): DiscountValidationFailure => ({
  ok: false,
  code,
  error,
});

export async function validateDiscountCode(params: {
  code: string;
  target: DiscountTarget;
  amount: number;
  courseId?: string;
}): Promise<DiscountValidationResult> {
  const normalizedCode = normalizeDiscountCode(params.code);
  const normalizedAmount = normalizeAmount(params.amount);

  if (!normalizedCode) {
    return invalid("", "Masukkan kode unik terlebih dahulu.");
  }

  if (normalizedAmount <= 0) {
    return invalid(normalizedCode, "Nominal transaksi sudah Rp 0.");
  }

  try {
    const codeRef = doc(db, "discount_codes", normalizedCode);
    const snap = await getDoc(codeRef);

    if (!snap.exists()) {
      return invalid(normalizedCode, "Kode unik tidak ditemukan.");
    }

    const raw = snap.data() as DiscountCodeDoc;
    if (raw.active === false) {
      return invalid(normalizedCode, "Kode unik sudah tidak aktif.");
    }

    const startsAt = toMillis(raw.startsAt);
    const endsAt = toMillis(raw.endsAt);
    const now = Date.now();

    if (startsAt !== null && now < startsAt) {
      return invalid(normalizedCode, "Kode unik belum aktif.");
    }
    if (endsAt !== null && now > endsAt) {
      return invalid(normalizedCode, "Kode unik sudah kedaluwarsa.");
    }

    const scope = resolveScope(raw.appliesTo);
    if (!isScopeAllowed(scope, params.target)) {
      return invalid(
        normalizedCode,
        params.target === "course"
          ? "Kode unik ini tidak berlaku untuk pembelian course."
          : "Kode unik ini tidak berlaku untuk langganan.",
      );
    }

    const targetCourseIds = toStringArray(raw.targetCourseIds);
    if (params.target === "course" && targetCourseIds.length > 0) {
      const currentCourseId = (params.courseId || "").trim();
      if (!currentCourseId || !targetCourseIds.includes(currentCourseId)) {
        return invalid(normalizedCode, "Kode unik ini tidak berlaku untuk course ini.");
      }
    }

    const minAmount = normalizeAmount(toNumber(raw.minAmount, 0));
    if (minAmount > 0 && normalizedAmount < minAmount) {
      return invalid(
        normalizedCode,
        `Minimal transaksi Rp ${minAmount.toLocaleString("id-ID")} untuk memakai kode ini.`,
      );
    }

    const discountType = resolveDiscountType(raw.discountType);
    const discountValue = Math.max(0, toNumber(raw.discountValue, 0));
    if (discountValue <= 0) {
      return invalid(normalizedCode, "Kode unik belum dikonfigurasi dengan benar.");
    }

    let discountAmount =
      discountType === "percentage"
        ? Math.floor((normalizedAmount * discountValue) / 100)
        : Math.floor(discountValue);

    if (discountType === "percentage") {
      const maxDiscount = normalizeAmount(toNumber(raw.maxDiscount, 0));
      if (maxDiscount > 0) {
        discountAmount = Math.min(discountAmount, maxDiscount);
      }
    }

    discountAmount = Math.min(normalizedAmount, Math.max(0, discountAmount));
    const finalAmount = Math.max(0, normalizedAmount - discountAmount);

    return {
      ok: true,
      code: normalizedCode,
      title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : null,
      scope,
      discountType,
      discountValue,
      discountAmount,
      finalAmount,
    };
  } catch (error) {
    console.error("[discount-code] validate failed:", error);
    return invalid(normalizedCode, FALLBACK_ERROR);
  }
}
