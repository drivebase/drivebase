import { describe, expect, test } from "bun:test";
import { ProviderRegistry } from "./registry.ts";
import { NotImplementedError, ProviderError } from "./errors.ts";
import type { IStorageProvider } from "./provider.ts";

function stubProvider(type: string): IStorageProvider {
  return {
    type,
    capabilities: {
      isHierarchical: true,
      supportsNativeCopy: false,
      supportsNativeMove: false,
      supportsDelta: false,
      supportsChecksum: false,
      supportsMultipartUpload: false,
      supportsPresignedUploadParts: false,
    },
    authenticate: async () => ({}),
    listChildren: async () => ({ nodes: [] }),
    getMetadata: async () => {
      throw new NotImplementedError("stub.getMetadata");
    },
    download: async () => {
      throw new NotImplementedError("stub.download");
    },
    upload: async () => {
      throw new NotImplementedError("stub.upload");
    },
    createFolder: async () => {
      throw new NotImplementedError("stub.createFolder");
    },
    move: async () => {
      throw new NotImplementedError("stub.move");
    },
    copy: async () => {
      throw new NotImplementedError("stub.copy");
    },
    delete: async () => {},
    getUsage: async () => ({}),
  };
}

describe("ProviderRegistry", () => {
  test("register + get + instantiate", async () => {
    const r = new ProviderRegistry();
    r.register({
      type: "stub",
      label: "Stub",
      authKind: "none",
      create: () => stubProvider("stub"),
    });
    const mod = r.get("stub");
    expect(mod.type).toBe("stub");
    const inst = await r.instantiate("stub", { kind: "none" });
    expect(inst.type).toBe("stub");
  });

  test("duplicate registration throws", () => {
    const r = new ProviderRegistry();
    r.register({
      type: "a",
      label: "A",
      authKind: "none",
      create: () => stubProvider("a"),
    });
    expect(() =>
      r.register({
        type: "a",
        label: "A2",
        authKind: "none",
        create: () => stubProvider("a"),
      }),
    ).toThrow(ProviderError);
  });

  test("unknown type throws", () => {
    const r = new ProviderRegistry();
    expect(() => r.get("missing")).toThrow(ProviderError);
  });

  test("oauth() throws when provider has no oauth module", () => {
    const r = new ProviderRegistry();
    r.register({
      type: "a",
      label: "A",
      authKind: "none",
      create: () => stubProvider("a"),
    });
    expect(() => r.oauth("a")).toThrow(ProviderError);
  });
});
