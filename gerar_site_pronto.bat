@echo off
echo.
echo   ==============================================
echo     GERADOR DE SITE PRONTO PARA HOSTINGER
echo   ==============================================
echo.
echo   1. Instalando dependencias...
call npm install

echo.
echo   2. Limpando versoes anteriores...
call npm run clean

echo.
echo   3. Criando a pasta public_html (Otimizada)...
call npm run build

echo.
echo.
echo   SUCESSO! 
echo.
echo   Agora siga estes passos:
echo   1. Abra a pasta "public_html" que apareceu no seu PC.
echo   2. No painel da Hostinger, abra o Gerenciador de Arquivos.
echo   3. Entre na pasta public_html (no servidor).
echo   4. APAGUE TUDO o que estiver la dentro (index.php, default.php, etc).
echo   5. Arraste TUDO o que esta DENTRO da pasta "public_html" (do seu PC) para la.
echo.
echo   IMPORTANTE: Nao use o botao "Migrar Site" da Hostinger. 
echo   Use o "Gerenciador de Arquivos" (File Manager).
echo.
pause
