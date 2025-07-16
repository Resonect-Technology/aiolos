FROM mcr.microsoft.com/devcontainers/base:jammy

RUN apt update && apt install -y \
    wget \
    curl \
    git

# Install Node.js (LTS) and pnpm
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g pnpm

# Set up PNPM storage to behave like on a local computer
ENV PNPM_HOME="/pnpm-store"
RUN mkdir -p $PNPM_HOME && \
    chown -R vscode:vscode $PNPM_HOME && \
    echo "export PNPM_HOME=$PNPM_HOME" >> /home/vscode/.bashrc && \
    echo "export PATH=\$PNPM_HOME:\$PATH" >> /home/vscode/.bashrc

CMD ["bash"]
