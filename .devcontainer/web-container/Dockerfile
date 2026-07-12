FROM node:24-bookworm

# Basic tooling for development inside the container
RUN apt-get update && apt-get install -y --no-install-recommends \
    git gh sqlite3 less procps sudo jq nano vim \
    && rm -rf /var/lib/apt/lists/*

# pnpm via corepack, pinned to the workspace's packageManager version
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

# Allow the node user to sudo (devcontainer convenience)
RUN echo "node ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/node
