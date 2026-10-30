import { describe, expect, it, vi } from "vitest";
import { startAutoSync } from "./auto-sync";
import type { SyncReport } from "./sync-engine";

const REPORT: SyncReport = { pushed: 1, pulled: 0, error: null };

function setup(sync = vi.fn().mockResolvedValue(REPORT)) {
  return { engine: { sync }, target: new EventTarget(), sync };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("startAutoSync", () => {
  it("sincroniza na partida e entrega o relatorio", async () => {
    const { engine, target, sync } = setup();
    const onReport = vi.fn();

    startAutoSync(engine, "u1", target, onReport);
    await flush();

    expect(sync).toHaveBeenCalledTimes(1);
    expect(sync).toHaveBeenCalledWith("u1");
    expect(onReport).toHaveBeenCalledWith(REPORT);
  });

  it("cada evento online dispara um sync", async () => {
    const { engine, target, sync } = setup();
    startAutoSync(engine, "u1", target);

    target.dispatchEvent(new Event("online"));
    await flush();

    expect(sync).toHaveBeenCalledTimes(2);
  });

  it("depois de cancelar, o evento online nao dispara mais sync", async () => {
    const { engine, target, sync } = setup();
    const stop = startAutoSync(engine, "u1", target);

    stop();
    target.dispatchEvent(new Event("online"));
    await flush();

    expect(sync).toHaveBeenCalledTimes(1);
  });

  it("repassa a rejeicao ao onError", async () => {
    const failure = new Error("boom");
    const { engine, target } = setup(vi.fn().mockRejectedValue(failure));
    const onError = vi.fn();

    startAutoSync(engine, "u1", target, undefined, onError);
    await flush();

    expect(onError).toHaveBeenCalledWith(failure);
  });

  it("sem onError, registra a rejeicao no console", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { engine, target } = setup(vi.fn().mockRejectedValue(new Error("boom")));

    startAutoSync(engine, "u1", target);
    await flush();

    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
