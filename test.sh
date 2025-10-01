#!/bin/bash
# system_info.sh - Ubuntu 시스템 정보 출력 스크립트

echo "===== 시스템 정보 ====="
uname -a

echo -e "\n===== 운영체제 버전 ====="
lsb_release -a 2>/dev/null || cat /etc/os-release

echo -e "\n===== CPU 정보 ====="
lscpu | grep -E 'Model name|Architecture|CPU\(s\)'

echo -e "\n===== 메모리 정보 ====="
free -h

echo -e "\n===== 디스크 사용량 ====="
df -h --total | grep total

echo -e "\n===== 네트워크 정보 ====="
ip addr show | grep inet

echo -e "\n===== 업타임 ====="
uptime -p

echo -e "\n===== 로그인한 사용자 ====="
who
