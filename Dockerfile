# Dockerfile para desenvolvimento
FROM node:22-alpine

# Instalar dependências do sistema necessárias
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-client \
    # Dependências para build nativo (se necessário)
    libc6-compat

# Configurar diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências primeiro (cache otimizado)
COPY package*.json ./

# Instalar dependências
RUN npm cache clean --force

# Copiar o restante do código
COPY . .

# Instalar dependências de desenvolvimento
RUN npm install --omit=production

# Criar diretório para logs
RUN mkdir -p /app/logs

# Expor portas (5000 para frontend, 3000 para backend - ajuste conforme necessário)
EXPOSE 3000
EXPOSE 5000

# Comando padrão para desenvolvimento
CMD ["npm", "run", "dev"]