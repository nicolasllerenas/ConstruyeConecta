# ConstruyeConecta

Compara cotizaciones desglosadas de especialistas para saber exactamente qué pagas por tu obra y evitar gastos sorpresa.

## Arquitectura

```text
Navegador ── apps/web (Next.js + Tailwind, gateway con cookies httpOnly)
                 │  token de servicio firmado + JWT de usuario
                 ├── services/identity     cuentas y sesiones
                 ├── services/marketplace  perfiles, obras, swipes y matches
                 ├── services/contracts    cotizaciones, etapas y avances
                 └── services/reputation   calificaciones mutuas
                          │
                 Postgres (un esquema y un rol por servicio)
```

| Ruta                 | Contenido                                                          |
| -------------------- | ------------------------------------------------------------------ |
| `apps/web`           | Interfaz web responsive y gateway                                  |
| `services/*`         | Microservicios NestJS, cada uno es un proyecto de Vercel           |
| `packages/contracts` | Esquemas Zod y tipos compartidos                                   |
| `packages/platform`  | Autenticación, roles, límite de intentos y cliente entre servicios |
| `infra/db`           | Migraciones y datos iniciales                                      |
| `tests/e2e`          | Pruebas de flujo y seguridad de punta a punta                      |

## Seguridad

- Contraseñas con scrypt y tokens en cookies `httpOnly`, `Secure` y `SameSite=Lax`.
- JWT ES256 de 15 minutos: solo `identity` tiene la llave privada.
- Refresh tokens rotados y guardados como hash, con detección de reutilización.
- Cada servicio exige un token firmado de corta duración, así que no acepta llamadas directas.
- Roles y propiedad de los datos validados en cada servicio, y entradas validadas con Zod.
- Límite de intentos en Postgres, protección contra CSRF por origen y CSP con nonce.
- Cada servicio tiene su propio rol de base de datos y no puede leer esquemas ajenos.

## Desarrollo local

Requiere Node 22 o superior, pnpm y Docker.

```bash
pnpm install
pnpm env:local
pnpm db:up
pnpm build
pnpm db:migrate
pnpm db:seed
pnpm dev
```

La web queda en `http://localhost:3100`. `pnpm db:seed` crea una cuenta por rol, `familia@construyeconecta.test` y `especialista@construyeconecta.test`, con la contraseña de `DEFAULT_USERS_PASSWORD` en `.env`.

## Pruebas

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

`pnpm test:e2e` necesita el entorno local en marcha.

## Alcance del piloto

- Los pagos por etapa están simulados: no se mueve dinero real.
- La insignia de verificado solo se asigna manualmente en la base de datos.
- Los perfiles creados por `pnpm db:seed` se muestran como perfiles de demostración.
