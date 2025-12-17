FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# --- base system ---
RUN apt-get update && apt-get install -y \
  build-essential \
  curl \
  file \
  git \
  sudo \
  ca-certificates \
  xz-utils \
  locales \
  gnupg \
  lsb-release \
  && rm -rf /var/lib/apt/lists/*

# --- locale ---
RUN locale-gen en_US.UTF-8
ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

# --- create user ---
RUN useradd -m -s /bin/bash runner \
  && echo "runner ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

USER runner
WORKDIR /home/runner

USER root

# --- Node.js (official NodeSource) ---
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# --- GitHub CLI ---
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && \
    chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      | tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && apt-get install -y gh

# --- useful CLI tools ---
RUN apt-get install -y \
  jq \
  ripgrep \
  fd-find \
  tree \
  bat

# Normalize binary names
RUN ln -s /usr/bin/fdfind /usr/bin/fd || true
RUN ln -s /usr/bin/batcat /usr/bin/bat || true
