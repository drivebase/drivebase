#!/bin/bash

# Define pastel colors
# Text colors
BLACK='\033[38;5;232m'
RED='\033[38;5;203m'
GREEN='\033[38;5;120m'
YELLOW='\033[38;5;229m'
BLUE='\033[38;5;153m'
MAGENTA='\033[38;5;219m'
CYAN='\033[38;5;159m'
WHITE='\033[38;5;255m'
GRAY='\033[38;5;245m'

# Background colors
BG_BLUE='\033[48;5;153m'
BG_MAGENTA='\033[48;5;219m'

# Styles
BOLD='\033[1m'
NC='\033[0m' # No Color

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

# 2. Download compose.yaml
echo -e "${CYAN}• Downloading Docker Compose configuration...${NC}"
if curl -s -o compose.yaml https://compose.drivebase.one; then
    echo -e "${GREEN}  ✓ compose.yaml downloaded${NC}"
else
    echo -e "${RED}  ✗ Failed to download compose.yaml${NC}"
    exit 1
fi

# 3. Download .env.example as .env.local
echo -e "${CYAN}• Downloading environment configuration...${NC}"
if curl -s -o .env.local https://raw.githubusercontent.com/drivebase/drivebase/main/.env.example; then
    echo -e "${GREEN}  ✓ .env.local downloaded${NC}"
else
    echo -e "${RED}  ✗ Failed to download .env.example${NC}"
    exit 1
fi

# 4. Generate secrets
echo -e "${CYAN}• Generating secure keys...${NC}"

# Function to generate safe base64 string
generate_secret() {
    openssl rand -base64 32 | tr -d '\n' | sed 's/[\/&]/\\&/g'
}

JWT_SECRET=$(generate_secret)
ENCRYPTION_KEY=$(generate_secret)

# Cross-platform sed (works on macOS and Linux)
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s|NODE_ENV=.*|NODE_ENV=production|" .env.local
  sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" .env.local
  sed -i '' "s|ENCRYPTION_KEY=.*|ENCRYPTION_KEY=${ENCRYPTION_KEY}|" .env.local
else
  sed -i "s|NODE_ENV=.*|NODE_ENV=production|" .env.local
  sed -i "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" .env.local
  sed -i "s|ENCRYPTION_KEY=.*|ENCRYPTION_KEY=${ENCRYPTION_KEY}|" .env.local
fi

echo -e "${GREEN}  ✓ Secrets generated and updated in .env.local${NC}"

# 5. Success Message
echo -e "\n${BOLD}${BG_MAGENTA}${BLACK}  Installation Ready!  ${NC}\n"

echo -e "${BOLD}Next steps:${NC}"
echo -e "  1. Go to the directory: ${BOLD}${BLUE}cd $DIR${NC}"
echo -e "  2. Review configuration: ${BOLD}${BLUE}nano .env.local${NC}"
echo -e "  3. Start Drivebase: ${BOLD}${BLUE}docker compose --env-file .env.local up -d${NC}"

echo -e "\n${GRAY}Need help? Visit https://drivebase.io/docs${NC}\n"
