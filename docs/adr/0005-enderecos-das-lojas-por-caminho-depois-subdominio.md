# Endereços das lojas: por caminho no MVP, subdomínio depois

No MVP o catálogo da loja fica em `cajugo.vercel.app/{slug}` (ex.: `/lojaA`), sem domínio próprio nem custo. Quando o domínio `cajugo.com.br` for registrado, cada loja passa a `{slug}.cajugo.com.br`: o `proxy.ts` do Next reescreve o subdomínio para a mesma rota `/{slug}`, então nenhuma página é duplicada, e os links antigos recebem 301 para não quebrar QR codes já impressos. Por isso o slug já nasce com regras de subdomínio (`[a-z0-9-]`, sem hífen nas pontas, lista de reservados) e toda URL de loja é montada por uma função única.
