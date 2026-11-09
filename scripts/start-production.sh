#!/usr/bin/env bash
# Build de produção + servidor standalone na porta 3100 (pnpm test:e2e:prod).
set -euo pipefail
pnpm build
cp -r .next/static .next/standalone/.next/static
if [ -d public ]; then cp -r public .next/standalone/public; fi
# O log vira arquivo: os testes conferem que não há erro de pré-renderização.
PORT=3100 HOSTNAME=127.0.0.1 node --env-file=.env.local .next/standalone/server.js 2>&1 | tee .next/production-server.log
