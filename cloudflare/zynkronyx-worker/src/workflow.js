import { WorkflowEntrypoint } from "cloudflare:workers";

export class ZynkronyxOrchestration extends WorkflowEntrypoint {
  async run(event, step) {
    const payload = event?.payload && typeof event.payload === "object" ? event.payload : {};

    const gateway = await step.do("validate gateway", async () => ({
      service: "zynkronyx-gateway",
      instanceId: event.instanceId,
      action: payload.action || "health-check",
      startedAt: new Date().toISOString(),
    }));

    const backend = await step.do(
      "check backend",
      { retries: { limit: 3, delay: "5 seconds", backoff: "linear" } },
      async () => {
        if (!this.env.BACKEND_URL) return { configured: false, status: "not-configured" };

        const response = await fetch(new URL("/health", this.env.BACKEND_URL), {
          headers: { "x-zynkronyx-workflow": "orchestration" },
        });

        return {
          configured: true,
          reachable: response.ok,
          status: response.status,
        };
      },
    );

    return {
      ok: backend.reachable !== false,
      workflow: "zynkronyx-orchestration",
      gateway,
      backend,
      completedAt: new Date().toISOString(),
    };
  }
}
