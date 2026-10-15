@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================================
echo   CampusMart  -  one-click start
echo ============================================================
echo.

set "FAIL=0"
set "MYSQL=D:\MYSQL\mysql-8.0.34-winx64\bin\mysql.exe"
set "MYSQL_PWD_ARG=-uroot -p1234"

REM ---------- 1. application.yml ----------
if not exist "src\main\resources\application.yml" (
    echo [1/5] application.yml not found - copying from the example ...
    copy /y "src\main\resources\application.yml.example" "src\main\resources\application.yml" >nul
    echo       Created: src\main\resources\application.yml
    echo       ACTION : open it and set your own MySQL password / JWT secret
    echo.
    pause
    exit /b 1
) else (
    echo [1/5] application.yml ..................... OK
)

REM ---------- 2. Redis ----------
netstat -ano | findstr ":6379" | findstr "LISTENING" >nul
if errorlevel 1 (
    echo [2/5] Redis  127.0.0.1:6379 .............. NOT RUNNING
    echo       start it:  net start Redis    ^(or run redis-server.exe^)
    set "FAIL=1"
) else (
    echo [2/5] Redis  127.0.0.1:6379 .............. OK
)

REM ---------- 3. MySQL ----------
netstat -ano | findstr ":3306" | findstr "LISTENING" >nul
if errorlevel 1 (
    echo [3/5] MySQL  127.0.0.1:3306 .............. NOT RUNNING
    set "FAIL=1"
) else (
    echo [3/5] MySQL  127.0.0.1:3306 .............. OK
)

if "%FAIL%"=="1" (
    echo.
    echo Fix the items above, then run this script again.
    pause
    exit /b 1
)

REM ---------- 4. database ----------
if exist "%MYSQL%" (
    "%MYSQL%" %MYSQL_PWD_ARG% -N -e "SHOW DATABASES LIKE 'campusmart';" 2>nul | findstr "campusmart" >nul
    if errorlevel 1 (
        echo [4/5] database campusmart .............. NOT FOUND - creating from sql\init.sql ...
        "%MYSQL%" %MYSQL_PWD_ARG% --default-character-set=utf8mb4 < "sql\init.sql"
        echo       done.
    ) else (
        echo [4/5] database campusmart .............. OK
    )
) else (
    echo [4/5] mysql.exe not found at %MYSQL%
    echo       skip the database check ^(make sure database "campusmart" exists^)
)

REM ---------- 5. run ----------
set "MVN=mvn"
where mvn >nul 2>nul
if errorlevel 1 (
    if exist "D:\maven\apache-maven-3.9.4\bin\mvn.cmd" set "MVN=D:\maven\apache-maven-3.9.4\bin\mvn.cmd"
)

echo [5/5] starting Spring Boot at http://localhost:8080 ...
echo       using:  %MVN%
echo       first run compiles the project, please wait
echo.
call "%MVN%" spring-boot:run

endlocal
