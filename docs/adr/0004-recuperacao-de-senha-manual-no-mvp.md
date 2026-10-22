# Recuperação de senha manual no MVP

No MVP não há e-mail de recuperação de senha: o lojista chama o suporte pelo WhatsApp e o Admin define uma senha temporária, que obriga a troca no próximo login. O e-mail nativo do Supabase Auth só serve para teste, e um provedor de SMTP próprio seria mais uma conta e configuração só para isso; com poucos lojistas no piloto, o processo manual basta. A recuperação automática por e-mail fica para a fase 2.
