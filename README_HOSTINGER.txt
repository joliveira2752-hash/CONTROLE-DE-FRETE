======================================================
   COMO COLOCAR SEU SITE NA HOSTINGER (PASSO A PASSO)
======================================================

O erro de "TELA BRANCA" acontece quando o site não consegue encontrar os arquivos
de estilo e script. Eu atualizei a configuração para usar "Caminhos Relativos",
o que deve resolver isso.

Siga estes passos exatos:

1. LIMPEZA TOTAL (MUITO IMPORTANTE):
   - No painel da Hostinger, procure por "Gerenciador de Arquivos" (File Manager).
   - Entre na pasta "public_html".
   - DELETE TUDO o que estiver lá dentro (inclusive pastas como .github ou arquivos antigos).
   - A pasta deve ficar VAZIA.

2. GERAR O SITE NO SEU COMPUTADOR:
   - Baixe o projeto (Export to ZIP) e extraia no seu PC.
   - Tenha o Node.js instalado (https://nodejs.org/).
   - Dê dois cliques no arquivo "gerar_site_pronto.bat" nesta pasta.
   - Isso vai criar uma pasta chamada "dist".

3. UPLOAD CORRETO:
   - Entre na pasta "dist" no seu computador.
   - Selecione TODOS os arquivos e pastas de DENTRO da "dist" (assets, index.html, .htaccess, etc).
   - Arraste e solte esses arquivos para DENTRO da "public_html" na Hostinger.

4. VERIFICAÇÃO:
   - Se você abrir o site e ver "Carregando sistema...", significa que o HTML carregou.
   - Se a tela continuar branca, aperte CTRL + F5 para limpar o cache do navegador.
   - Certifique-se de que NÃO existe um arquivo chamado 'index.php' ou 'default.php' na pasta.

DICA: Se você usa o GitHub, as "Secrets" (FTP_SERVER, FTP_USERNAME, FTP_PASSWORD) precisam estar configuradas no seu repositório para o deploy automático funcionar.

======================================================
