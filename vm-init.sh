#!/bin/bash

set -e

sudo apt update

# Install UFW
sudo apt install -y ufw
sudo ufw allow 443

# Install Make
sudo apt install -y make

# Install Docker dependencies
sudo apt install -y ca-certificates curl

# Add Docker repository
sudo install -m 0755 -d /etc/apt/keyrings

sudo curl -fsSL https://download.docker.com/linux/debian/gpg \
  -o /etc/apt/keyrings/docker.asc

sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update

# Install Docker
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable services
sudo systemctl enable --now docker

# Configure UFW
sudo ufw allow OpenSSH
sudo ufw --force enable