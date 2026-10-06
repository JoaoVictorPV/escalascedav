# Plantão de fim de semana

Espelho da planilha de escalas de plantão de fim de semana (Matriz, Ecoimagem e Seminário), com busca, filtros, visão por médico, histórico de alterações e conferência da planilha.

Site: https://joaovictorpv.github.io/escalascedav/

## Privacidade

A escala, o histórico e as planilhas originais ficam **criptografados** no repositório (AES-256-GCM, chave derivada da senha com PBKDF2-SHA256, 310 000 iterações). Sem a senha, o repositório e o site públicos mostram só o código. A senha nunca é gravada no repositório; cada navegador guarda apenas a chave derivada, se a pessoa marcar "Lembrar neste aparelho".

## Como atualizar a escala

1. No Excel Online, abra a planilha e use **Arquivo → Criar uma cópia → Baixar uma cópia**.
2. Abra o site e arraste o `.xlsx` para a página (ou clique em **Atualizar planilha**).
3. Confira a prévia com as mudanças e clique em **Publicar atualização**.

O site grava a nova versão no repositório num único commit, junto com a planilha original (criptografada), e registra tudo no **Histórico**. Para quem abrir o site, a nova versão aparece em cerca de 1 minuto (tempo do GitHub Pages).

Na primeira publicação o site pede um **token do GitHub**, que fica guardado só naquele navegador:

1. Acesse https://github.com/settings/personal-access-tokens/new
2. *Repository access* → *Only select repositories* → `escalascedav`
3. *Permissions* → *Contents* → **Read and write**
4. Gere o token e cole no site.

## Outras funções (rodapé do site)

O botão **Atualizar planilha**, o arrastar-e-soltar e **Trocar senha** só aparecem no navegador que tem um token do GitHub salvo. Quem tem apenas a senha da escala só consegue ver.

- **Acesso ao GitHub**: salva, troca ou remove o token deste navegador.
- **Trocar senha**: criptografa tudo de novo com uma senha nova, inclusive os arquivos do histórico.
- **Bloquear neste aparelho**: esquece a senha neste navegador.

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `index.html`, `styles.css` | Página |
| `js/parser.js` | Leitura da planilha: transforma as grades das abas numa tabela única, junta grafias diferentes do mesmo médico e aponta inconsistências |
| `js/app.js` | Interface, histórico e publicação no GitHub |
| `js/crypto.js` | Criptografia |
| `js/boot.js` | Tela de senha e carregamento |
| `data/escala.enc.json` | Escala + histórico (criptografados) |
| `data/arquivos/` | Cada planilha importada, criptografada |
