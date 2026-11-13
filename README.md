# Cuadra

**Tu obra, con quien sabe hacerla.** Compara cotizaciones claras de especialistas y sabe exactamente qué pagas, sin gastos sorpresa.

## Cómo funciona

1. **Cuéntanos tu obra:** tipo de trabajo, fotos, nota de voz, presupuesto y fecha estimada.
2. **Compara cotizaciones:** los especialistas cercanos envían su propuesta con los mismos rubros (materiales, mano de obra, permisos, adicionales, plazo y calificación).
3. **Revisa el detalle:** desglose y distribución del monto por etapas antes de elegir.

`/demo` recorre estas tres pantallas sin crear cuenta, con cotizaciones de ejemplo, y mide cuánto tarda la persona en decidir.

## Algoritmo de recomendación

- **Especialistas para una obra:** puntaje de 0 a 100 con afinidad de especialidad (35), cercanía (20), reputación bayesiana (25), trayectoria (10) y confianza (10). El plan Pro suma 4 puntos y no supera a la calidad. Un especialista nuevo siempre aparece entre los tres primeros.
- **Niveles:** Nuevo, Bronce, Plata y Oro según obras realizadas, reseñas y verificación.
- **Obras para un especialista:** primero las que lo invitaron, luego las de su especialidad, las destacadas y las más cercanas.
- **Mejor valor en el comparador:** pondera precio (30), costos definidos (25), reputación (25), plazo (10) y presupuesto (10), y explica por qué.
- **Propuestas directas:** el especialista puede cotizar cualquier obra de su zona. La dirección y el celular de la familia solo se comparten cuando ella lo invita o elige su cotización.

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

La web queda en `http://localhost:3100`. `pnpm db:seed` crea una cuenta por rol, `familia@cuadra.test` y `especialista@cuadra.test`, con la contraseña de `DEFAULT_USERS_PASSWORD` en `.env`.

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
- La insignia de verificado solo se asigna manualmente en la base de datos. Las credenciales las declara el especialista.
- Los perfiles creados por `pnpm db:seed` se muestran como perfiles de demostración.
