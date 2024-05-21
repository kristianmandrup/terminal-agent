# Use Alpine Linux as the base image
FROM alpine:latest

# Set the working directory
WORKDIR /app

# Define build arguments
ARG GIT_USER_NAME
ARG GIT_USER_EMAIL

# Install required packages, including Git
RUN apk add --no-cache bash git zsh curl fontconfig

# Configure Git using environment variables
RUN git config --global user.name "$GIT_USER_NAME" \
    && git config --global user.email "$GIT_USER_EMAIL"

# Install Powerline fonts
RUN git clone https://github.com/powerline/fonts.git --depth=1 && \
    fonts/install.sh && \
    rm -rf fonts

# Install oh-my-zsh
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended

# Set zsh as the default shell
RUN sed -i -e "s/bin\/ash/bin\/zsh/" /etc/passwd

# Install FiraCode font
RUN mkdir -p /usr/share/fonts/FiraCode && \
    curl -L -o /usr/share/fonts/FiraCode/FiraCode-Regular.ttf \
    https://github.com/tonsky/FiraCode/blob/master/distr/ttf/FiraCode-Regular.ttf?raw=true && \
    fc-cache -fv

# Install NVM, Node.js LTS, and latest npm
ENV NVM_DIR /root/.nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash && \
    . "$NVM_DIR/nvm.sh" && \
    nvm install --lts --latest-npm && \
    nvm use --lts && \
    nvm alias default --lts

# Configure oh-my-zsh with Agnoster theme
RUN sed -i -e "s/robbyrussell/agnoster/" ~/.zshrc && \
    echo 'ZSH_THEME="agnoster"' >> ~/.zshrc && \
    echo 'POWERLEVEL9K_MODE="nerdfont-complete"' >> ~/.zshrc && \
    echo 'export TERM="xterm-256color"' >> ~/.zshrc

# Set the theme to solarized light (example configuration, adjust as needed)
RUN echo 'SOLARIZED_THEME="light"' >> ~/.zshrc

# Default command to run zsh
CMD ["zsh"]