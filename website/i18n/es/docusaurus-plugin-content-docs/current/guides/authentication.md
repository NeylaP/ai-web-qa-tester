---
sidebar_position: 2
title: Autenticación
---

# Autenticación

La mayoría de las APIs reales requieren autenticación. `ai-web-qa-tester` soporta tokens Bearer JWT via tres métodos, verificados en este orden:

1. `--auth-token <token>` — flag inline
2. `--auth-env <VAR>` — variable de entorno
3. `.qa/auth.json` — archivo de config con auto-login opcional

## Opción 1 — Flag inline

```bash
qa-tester pipeline \
  --backend ./api \
  --base-url http://localhost:3000 \
  --auth-token "eyJhbGciOiJSUzI1NiJ9..."
```

:::warning
Evitá esto en CI — el token va a aparecer en los logs.
:::

## Opción 2 — Variable de entorno (recomendado para CI)

```bash
export QA_AUTH_TOKEN=eyJhbGciOiJSUzI1NiJ9...

qa-tester pipeline \
  --backend ./api \
  --base-url http://localhost:3000 \
  --auth-env QA_AUTH_TOKEN
```

En GitHub Actions:

```yaml
- name: Run QA
  run: |
    qa-tester pipeline \
      --backend ./api \
      --base-url http://localhost:3000 \
      --auth-env QA_AUTH_TOKEN
  env:
    QA_AUTH_TOKEN: ${{ secrets.QA_AUTH_TOKEN }}
```

## Opción 3 — `.qa/auth.json` con token estático

```json
{
  "type": "bearer",
  "token": "eyJhbGciOiJSUzI1NiJ9..."
}
```

## Opción 4 — `.qa/auth.json` con auto-login

```json
{
  "type": "bearer",
  "login": {
    "url": "http://localhost:3000/auth/login",
    "body": {
      "username": "qa-user@example.com",
      "password": "super-secret"
    },
    "tokenPath": "access_token"
  }
}
```

El `tokenPath` es la ruta en notación de punto al JWT en la respuesta (ej. `"data.token"`).

:::caution
Agregá `.qa/auth.json` al `.gitignore` si contiene credenciales.
:::
