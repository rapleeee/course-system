// src/types/midtrans-client.d.ts
declare module "midtrans-client" {
  /* ===== Options ===== */
  export interface ClientOptions {
    isProduction: boolean;
    serverKey: string;
    clientKey?: string;
  }

  /* ===== Snap transaction params (minimal yang kamu pakai) ===== */
  export interface TransactionDetails {
    order_id: string;
    gross_amount: number;
  }

  export interface CustomerDetails {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  }

  export interface ItemDetail {
    id?: string;
    price: number;
    quantity: number;
    name: string;
  }

  export type ExpiryUnit = "minutes" | "hours" | "days";
  export interface Expiry {
    unit: ExpiryUnit;
    duration: number;
  }

  export interface Callbacks {
    finish?: string;
  }

  export interface SnapTransactionParams {
    transaction_details: TransactionDetails;
    customer_details?: CustomerDetails;
    item_details?: ItemDetail[];
    enabled_payments?: string[]; // biarkan generic string list
    callbacks?: Callbacks;
    expiry?: Expiry;
    /** Terima field tambahan dari Midtrans tanpa pakai any */
    [key: string]: unknown;
  }

  /* ===== Snap ===== */
  export class Snap {
    constructor(options: ClientOptions);
    createTransaction(
      params: SnapTransactionParams
    ): Promise<{ token: string; redirect_url: string }>;
    createTransactionToken(params: SnapTransactionParams): Promise<string>;
  }

  /* ===== Core API (tipe minimum yang aman) ===== */
  export interface CoreApiTransactionAPI {
    status(orderId: string): Promise<unknown>;
    approve(orderId: string): Promise<unknown>;
    cancel(orderId: string): Promise<unknown>;
  }

  export class CoreApi {
    constructor(options: ClientOptions);
    charge(params: Record<string, unknown>): Promise<unknown>;
    capture(params: Record<string, unknown>): Promise<unknown>;
    transaction: CoreApiTransactionAPI;
  }

  /* ===== CommonJS export bentuk objek ===== */
  const midtransClient: {
    Snap: typeof Snap;
    CoreApi: typeof CoreApi;
  };

  export = midtransClient;
}