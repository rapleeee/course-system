// types/midtrans.d.ts
export {};

type SnapCallbacks = Partial<{
  onSuccess: (res?: unknown) => void;
  onPending: (res?: unknown) => void;
  onError: (res?: unknown) => void;
  onClose: () => void;
}>;

interface SnapJS {
  pay: (token: string, callbacks?: SnapCallbacks) => void;
}

declare global {
  interface Window {
    snap?: SnapJS; // <- OPTIONAL, dan ini yg dipakai di semua file
  }
}