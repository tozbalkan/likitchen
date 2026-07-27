export type Uuid = string & { readonly __brand: unique symbol };

/**
 * Instant is an abstraction. Its current implementation is Readonly<Date>
 * but may migrate to Temporal.Instant in the future without changing public APIs.
 */
export type Instant = Readonly<Date>;

export type CorrelationId = string & { readonly __brand: unique symbol };
export type TraceId = string & { readonly __brand: unique symbol };
export type RequestId = string & { readonly __brand: unique symbol };
export type IdempotencyKey = string & { readonly __brand: unique symbol };

export type ProcessContext = Readonly<{
  correlationId: CorrelationId;
  traceId: TraceId;
  requestId?: RequestId;
  idempotencyKey?: IdempotencyKey;
}>;
