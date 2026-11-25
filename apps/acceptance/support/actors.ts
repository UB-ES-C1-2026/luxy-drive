import { randomUUID } from "node:crypto";
import { type BrowserContext, test as base, expect } from "@playwright/test";

type Role = "client" | "provider";

export type Listing = { id: number; title: string; status: "draft" | "published" | "withdrawn" };
export type Reservation = {
  id: number;
  experienceId: number;
  status: "pending" | "confirmed" | "rejected";
};

const DAY = 24 * 60 * 60 * 1000;

/** Fecha y hora de Madrid como la envía un `<input type="datetime-local">`: 2030-06-14T20:00. */
export function madridLocal(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid",
    dateStyle: "short",
    timeStyle: "short",
  })
    .format(date)
    .replace(" ", "T");
}

/** Un instante dentro de `days` días, sin segundos, para compararlo con lo que guarda la API. */
export function inDays(days: number) {
  return new Date(Math.floor((Date.now() + days * DAY) / 60_000) * 60_000);
}

/**
 * Una persona que usa la aplicación con su propia sesión (su propio navegador). Todo lo que
 * hace pasa por la API pública o por las pantallas, igual que un usuario real.
 */
export class Actor {
  readonly published: number[] = [];

  constructor(
    readonly context: BrowserContext,
    private readonly origin: string,
  ) {}

  // La API exige el mismo origen en todas las llamadas con sesión (SP-002).
  private get headers() {
    return { Origin: this.origin };
  }

  get(path: string) {
    return this.context.request.get(path, { headers: this.headers });
  }

  post(path: string, data?: unknown) {
    return this.context.request.post(path, { headers: this.headers, data });
  }

  patch(path: string, data: unknown) {
    return this.context.request.patch(path, { headers: this.headers, data });
  }

  delete(path: string) {
    return this.context.request.delete(path, { headers: this.headers });
  }

  /** Proveedor: crea un borrador con solo el título. */
  async createDraft(): Promise<Listing> {
    const res = await this.post("/api/provider/experiences", {
      title: `QA · Borrador ${randomUUID().slice(0, 8)}`,
    });
    expect(res.status(), "crear el borrador").toBe(201);
    return res.json();
  }

  /** Proveedor: crea un anuncio completo y lo publica. Precio normal: 1000 €; servicio en 3 días. */
  async publishListing(): Promise<Listing> {
    const created = await this.post("/api/provider/experiences", {
      title: `QA · Anuncio ${randomUUID().slice(0, 8)}`,
      description: "Anuncio ficticio creado por los tests de aceptación.",
      category: "yacht",
      vehicle: "Velero de pruebas",
      location: "Palma",
      capacity: 4,
      price: 1000,
      serviceAt: madridLocal(inDays(3)),
    });
    expect(created.status(), "crear el anuncio").toBe(201);
    const { id } = (await created.json()) as Listing;
    const published = await this.post(`/api/provider/experiences/${id}/publish`);
    expect(published.status(), "publicar el anuncio").toBe(200);
    this.published.push(id);
    return published.json();
  }

  /** Cliente: solicita una experiencia disponible. */
  async requestReservation(experienceId: number): Promise<Reservation> {
    const res = await this.post("/api/reservations", { experienceId });
    expect(res.status(), "solicitar la reserva").toBe(201);
    return res.json();
  }

  /** Ids de las experiencias que cualquiera encuentra en el catálogo. */
  async catalogIds(): Promise<number[]> {
    const res = await this.get("/api/experiences");
    expect(res.status(), "consultar el catálogo").toBe(200);
    return ((await res.json()) as { id: number }[]).map((experience) => experience.id);
  }
}

type Fixtures = {
  /** Registra una cuenta nueva con su propia sesión. */
  signUp: (role: Role) => Promise<Actor>;
  /** Alguien sin sesión. */
  visitor: Actor;
};

export const test = base.extend<Fixtures>({
  signUp: async ({ browser, baseURL }, use) => {
    if (!baseURL) throw new Error("Falta baseURL en playwright.config.ts");
    const actors: Actor[] = [];

    await use(async (role) => {
      const actor = new Actor(await browser.newContext({ baseURL }), new URL(baseURL).origin);
      actors.push(actor);
      const id = randomUUID().slice(0, 8);
      const res = await actor.post(
        role === "provider" ? "/api/auth/signup/provider" : "/api/auth/signup",
        {
          name: role === "provider" ? `QA Proveedor ${id}` : `QA Cliente ${id}`,
          email: `qa-${id}@luxydrive.test`,
          // Cuenta de un solo uso: la contraseña no se guarda en ningún sitio.
          password: randomUUID(),
        },
      );
      expect(res.status(), `registrar la cuenta de ${role}`).toBe(201);
      return actor;
    });

    // Los anuncios de prueba no se quedan en el catálogo del entorno. Retirar es US-014:
    // si el entorno aún no lo tiene, no pasa nada.
    for (const actor of actors) {
      for (const id of actor.published) {
        await actor.post(`/api/provider/experiences/${id}/withdraw`).catch(() => {});
      }
      await actor.context.close();
    }
  },

  visitor: async ({ browser, baseURL }, use) => {
    if (!baseURL) throw new Error("Falta baseURL en playwright.config.ts");
    const context = await browser.newContext({ baseURL });
    await use(new Actor(context, new URL(baseURL).origin));
    await context.close();
  },
});

export { expect };
