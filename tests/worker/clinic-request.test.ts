import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { call, freshIp, json } from "./helpers";

describe("clinic appointment requests", () => {
  it("saves a real staff-review request and never confirms a booked appointment", async () => {
    const response = await call("/api/public/forms/submit", {
      method: "POST",
      headers: { "cf-connecting-ip": freshIp() },
      body: {
        path: "services",
        formId: "clinic-request",
        turnstileToken: "pass",
        values: {
          name: "Fixture Patient",
          email: "patient@example.org",
          phone: "614-555-0123",
          language: "Spanish",
          contact: "Call in the afternoon",
          acknowledge: true,
        },
      },
    });
    expect(response.status).toBe(200);
    expect((await json(response)).message).toContain("not a confirmed appointment");
    const row = await env.DB.prepare("SELECT data_json FROM form_submissions WHERE form_id = 'clinic-request' ORDER BY created_at DESC LIMIT 1").first<{
      data_json: string;
    }>();
    expect(row).not.toBeNull();
    expect(JSON.parse(row!.data_json)).toContainEqual({ label: "Preferred language", value: "Spanish" });
  });

  it("requires a phone number and acknowledgment and rejects an invalid language", async () => {
    for (const values of [
      { name: "Fixture Patient", phone: "", language: "English", acknowledge: true },
      { name: "Fixture Patient", phone: "614-555-0123", language: "English", acknowledge: false },
      { name: "Fixture Patient", phone: "614-555-0123", language: "Invalid option", acknowledge: true },
    ]) {
      const response = await call("/api/public/forms/submit", {
        method: "POST",
        headers: { "cf-connecting-ip": freshIp() },
        body: { path: "services", formId: "clinic-request", turnstileToken: "pass", values },
      });
      expect(response.status).toBe(422);
    }
  });
});
