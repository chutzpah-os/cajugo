# Supabase (Postgres + Auth) com Drizzle só no servidor

O banco é o Postgres do Supabase, acessado pelo Drizzle somente no servidor do Next; o login é o Supabase Auth. Trocamos o Firestore (Firebase) porque os filtros da vitrine, os painéis e as relações loja/assinatura/veículo são simples em SQL e caros no Firestore. A regra de negócio fica no código, não em RLS nem no SDK do Supabase no navegador: RLS fica ligado sem policy só como defesa extra, e o SQL continua portável para outro Postgres.
