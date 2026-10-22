# Next.js full-stack na Vercel, sem API separada

O servidor do CajuGo é o próprio Next.js (Server Actions e Route Handlers), serverless na Vercel. Descartamos o NestJS separado (no Render) para ter um deploy só, sem servidor ligado o tempo todo e com custo zero no início. Consequência: não geramos spec OpenAPI até existir o app Expo, e nada pode depender de recurso exclusivo da Vercel (KV, Blob, Edge Runtime), porque o Next deve poder sair da Vercel para uma VPS antes de cobrarmos clientes (o plano Hobby proíbe uso comercial).
