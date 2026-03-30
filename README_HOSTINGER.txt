======================================================
   COMO COLOCAR SEU SITE NA HOSTINGER (PASSO A PASSO)
======================================================

O erro de "TELA BRANCA" acontece quando o site não consegue encontrar os arquivos
de estilo e script. Eu atualizei a configuração para usar "Caminhos Relativos",
o que deve resolver isso.

Siga estes passos exatos:

1. GERAR O SITE NO SEU COMPUTADOR:
   - Baixe o projeto (Export to ZIP) e extraia no seu PC.
   - Tenha o Node.js instalado (https://nodejs.org/).
   - Dê dois cliques no arquivo "gerar_site_pronto.bat" nesta pasta.
   - Isso vai criar uma pasta chamada "dist".

2. NA HOSTINGER (NÃO USE O BOTÃO "MIGRAR SITE"):
   - No painel da Hostinger, procure por "Gerenciador de Arquivos" (File Manager).
   - Entre na pasta "public_html".
   - APAGUE TUDO o que estiver lá dentro (se houver algum index.php ou default.php).
   - Abra a pasta "dist" no seu computador.
   - Arraste TUDO o que está DENTRO da pasta "dist" para a pasta "public_html" na Hostinger.

3. ARQUIVOS QUE DEVEM ESTAR NA HOSTINGER:
   - assets (pasta)
   - index.html (arquivo)
   - index.php (arquivo que eu criei para ajudar a Hostinger)
   - .htaccess (arquivo para o login funcionar)

======================================================
