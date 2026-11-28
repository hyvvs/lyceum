/**
 * A minimal typed description of the Rust bridge. No network or keychain call
 * occurs simply by loading this module; later consumers must explicitly invoke
 * the native commands from the trusted packaged desktop window.
 */
export interface NativeHttpResponse {
  readonly status: number;
  readonly body: string;
}

/** Destination identifiers are compiled into native policy, never sent as arbitrary URLs. */
export interface NativeHttpRequest {
  readonly destinationId: string;
  readonly method: "GET" | "POST";
  readonly body?: string;
  readonly requestId: string;
}

export interface DesktopNativeCommands {
  readonly credential_set: {
    readonly input: { readonly keyId: string; readonly secret: string };
    readonly output: null;
  };
  /** Native-only credential_get is intentionally not available to the renderer. */
  readonly credential_has: {
    readonly input: { readonly keyId: string };
    readonly output: boolean;
  };
  readonly credential_delete: {
    readonly input: { readonly keyId: string };
    readonly output: boolean;
  };
  readonly app_data_directory: {
    readonly input: Record<string, never>;
    readonly output: string;
  };
  readonly native_http_request: {
    readonly input: { readonly request: NativeHttpRequest };
    readonly output: NativeHttpResponse;
  };
  readonly cancel_http_request: {
    readonly input: { readonly requestId: string };
    readonly output: boolean;
  };
}
