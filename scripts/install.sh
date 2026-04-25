#!/bin/bash

# Text colors
BLACK='\033[38;5;232m'
RED='\033[38;5;203m'
GREEN='\033[38;5;120m'
YELLOW='\033[38;5;229m'
BLUE='\033[38;5;153m'
CYAN='\033[38;5;159m'
GRAY='\033[38;5;245m'
BG_BLUE='\033[48;5;153m'
BG_MAGENTA='\033[48;5;219m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "\n${BOLD}${BG_BLUE}${BLACK}  Drivebase Installer  ${NC}\n"

# 1. Create directory
DIR="drivebase"
if [ -d "$DIR" ]; then
    echo -e "${YELLOW}• Directory '$DIR' already exists.${NC}"
    read -p "  Do you want to continue and potentially overwrite configuration? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}  Installation aborted.${NC}"
        exit 1
    fi
else
    mkdir "$DIR"
    echo -e "${GREEN}• Created directory: ${BOLD}$DIR${NC}"
fi

cd "$DIR" || exit

# 2. Download compose.prod.yml
echo -e "${CYAN}• Downloading Docker Compose configuration...${NC}"
HTTP_STATUS=$(curl -s -H "Cache-Control: no-cache" -o compose.yml -w "%{http_code}" https://raw.githubusercontent.com/drivebase/drivebase/main/compose.prod.yml)
if [ "$HTTP_STATUS" != "200" ]; then
    echo -e "${RED}  ✗ Failed to download compose.prod.yml (HTTP $HTTP_STATUS)${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ compose.yml downloaded${NC}"

# 3. Download config.example.toml as config.toml
echo -e "${CYAN}• Downloading configuration template...${NC}"
HTTP_STATUS=$(curl -s -H "Cache-Control: no-cache" -o config.toml -w "%{http_code}" https://raw.githubusercontent.com/drivebase/drivebase/main/config.example.toml)
if [ "$HTTP_STATUS" != "200" ]; then
    echo -e "${RED}  ✗ Failed to download config.example.toml (HTTP $HTTP_STATUS)${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ config.toml downloaded${NC}"

# 4. Generate secrets
echo -e "${CYAN}• Generating secure keys...${NC}"

generate_secret() {
    openssl rand -base64 32 | tr -d '\n' | sed 's/[\/&]/\\&/g'
}

MASTER_KEY=$(generate_secret)
AUTH_SECRET=$(generate_secret)

if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|masterKeyBase64 = .*|masterKeyBase64 = \"${MASTER_KEY}\"|" config.toml
    sed -i '' "s|betterAuthSecret = .*|betterAuthSecret = \"${AUTH_SECRET}\"|" config.toml
    sed -i '' "s|env = \"dev\"|env = \"prod\"|" config.toml
    sed -i '' "s|127.0.0.1:5432|postgres:5432|" config.toml
    sed -i '' "s|127.0.0.1:6379|redis:6379|" config.toml
else
    sed -i "s|masterKeyBase64 = .*|masterKeyBase64 = \"${MASTER_KEY}\"|" config.toml
    sed -i "s|betterAuthSecret = .*|betterAuthSecret = \"${AUTH_SECRET}\"|" config.toml
    sed -i "s|env = \"dev\"|env = \"prod\"|" config.toml
    sed -i "s|127.0.0.1:5432|postgres:5432|" config.toml
    sed -i "s|127.0.0.1:6379|redis:6379|" config.toml
fi

echo -e "${GREEN}  ✓ Secrets generated and written to config.toml${NC}"

# 5. Success message
echo -e "\n${BOLD}${BG_MAGENTA}${BLACK}  Installation Ready!  ${NC}\n"

echo -e "${BOLD}Next steps:${NC}"
echo -e "  1. Enter the directory:   ${BOLD}${BLUE}cd $DIR${NC}"
echo -e "  2. Review configuration:  ${BOLD}${BLUE}nano config.toml${NC}"
echo -e "  3. Start Drivebase:       ${BOLD}${BLUE}docker compose up -d${NC}"

# Telemetry (fire and forget)
(
    OS=$(uname -s)
    ARCH=$(uname -m)
    INSTALL_ID=$(openssl rand -hex 16)

    curl -s -X POST "https://telemetry.drivebase.io/v1/send" \
        -H "Content-Type: application/json" \
        -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" \
        -d "{\"type\":\"event\",\"payload\":{\"hostname\":\"drivebase.io\",\"url\":\"/install\",\"name\":\"install\",\"data\":{\"os\":\"$OS\",\"arch\":\"$ARCH\",\"id\":\"$INSTALL_ID\"}}}" \
        > /dev/null 2>&1
) &

echo -e "\n${GRAY}Need help? Visit https://drivebase.io/docs${NC}\n"
