@echo off
title He Thong On Thi Nhap Mon Mat Ma Hoc (NMMMH)
cd /d "%~dp0"
echo ========================================================
echo   KHOI DONG WEB ON THI TRAC NGHIEM NMMMH
echo ========================================================
echo Dang khoi chay may chu cuc bo va mo trinh duyet...
python server.py
if %ERRORLEVEL% NEQ 0 (
    echo Python chua duoc them vao PATH hoac gap loi, dang mo truc tiep index.html bang trinh duyet...
    start index.html
)
pause
