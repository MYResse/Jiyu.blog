@echo off
chcp 65001 >nul
cd /d "%~dp0"
start "" "http://127.0.0.1:8765"
"C:\Users\波波\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe" -m http.server 8765 --bind 127.0.0.1
echo.
echo 服务器已停止。直接关闭本窗口即可。
pause >nul
