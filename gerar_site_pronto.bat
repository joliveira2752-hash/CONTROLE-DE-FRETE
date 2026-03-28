@echo off
echo ======================================================
echo   GERADOR DE SITE PRONTO PARA HOSTINGER
echo ======================================================
echo.
echo 1. Verificando Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado! 
    echo Por favor, instale o Node.js em https://nodejs.org/
    pause
    exit
)

echo 2. Instalando ferramentas (npm install)...
call npm install

echo 3. Criando o site final (npm run build)...
call npm run build

echo.
echo ======================================================
echo   SUCESSO! 
echo.
echo   Agora siga estes passos:
echo   1. Abra a pasta "dist" que apareceu no seu PC.
echo   2. No painel da Hostinger, abra o Gerenciador de Arquivos.
echo   3. Entre na pasta public_html.
echo   4. Arraste TUDO o que esta DENTRO da pasta "dist" para la.
echo ======================================================
pause
