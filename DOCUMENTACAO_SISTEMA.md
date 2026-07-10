# Documentação do Sistema Barbearia

## Índice

- [1. Visão geral](#1-visão-geral)
- [2. Arquitetura técnica](#2-arquitetura-técnica)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [Estrutura principal de pastas](#estrutura-principal-de-pastas)
  - [Fluxo de execução](#fluxo-de-execução)
- [3. Modelos de dados principais](#3-modelos-de-dados-principais)
- [4. Funcionalidades do sistema](#4-funcionalidades-do-sistema)
  - [4.1 Autenticação e conta](#41-autenticação-e-conta)
  - [4.2 Homepage pública](#42-homepage-pública)
  - [4.3 Agendamento](#43-agendamento)
  - [4.4 Gestão de clientes](#44-gestão-de-clientes)
  - [4.5 Gestão de categorias e serviços](#45-gestão-de-categorias-e-serviços)
  - [4.6 Gestão de preços](#46-gestão-de-preços)
  - [4.7 Gestão de profissionais](#47-gestão-de-profissionais)
  - [4.8 Bloqueios de agenda](#48-bloqueios-de-agenda)
  - [4.9 Vendas e financeiro](#49-vendas-e-financeiro)
  - [4.10 Reviews e interação social](#410-reviews-e-interação-social)
  - [4.11 Configuração do site](#411-configuração-do-site)
- [5. Perfis de acesso](#5-perfis-de-acesso)
- [6. Rotas principais da API](#6-rotas-principais-da-api)
- [7. Fluxos de uso mais comuns](#7-fluxos-de-uso-mais-comuns)
- [8. Imagens e uploads](#8-imagens-e-uploads)
- [9. Configuração e execução](#9-configuração-e-execução)
- [10. Pontos importantes de manutenção](#10-pontos-importantes-de-manutenção)
- [11. Histórico de atualizações](#11-histórico-de-atualizações)
- [12. Configuração e Deployment](#12-configuração-e-deployment)
- [13. Troubleshooting](#13-troubleshooting)

## 1. Visão geral

O sistema Barbearia é uma aplicação full-stack para gestão de salões de beleza, com foco em:

- agendamento de serviços
- cadastro e gestão de clientes
- gestão de categorias, serviços, preços e profissionais
- painel administrativo para controle operacional
- vendas, relatórios e histórico financeiro
- avaliações, comentários e interações públicas
- personalização do site (banner, footer, tema, configuração geral)

A aplicação possui uma interface pública para clientes e um painel administrativo para usuários com perfil Admin ou Master.

---

## 2. Arquitetura técnica

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Radix UI
- Wouter para roteamento
- React Query para cache e sincronização de dados
- React Hook Form + Zod para validação de formulários

### Backend
- Node.js + TypeScript
- Express.js
- Passport.js para autenticação local e Google OAuth
- express-session + connect-pg-simple para sessões persistidas no PostgreSQL
- Drizzle ORM + PostgreSQL
- Multer para upload de arquivos
- Supabase para armazenamento de arquivos/imagens
- Nodemailer para recuperação de senha e comunicações

### Estrutura principal de pastas
- client/ — frontend React
- server/ — backend Express e rotas
- shared/ — schema e tipos compartilhados
- scripts/ — utilidades auxiliares (geração de documentos, screenshots, contratos, etc.)

### Fluxo de execução
- O frontend é servido pelo Vite em desenvolvimento.
- O backend expõe uma API REST e também serve a aplicação em produção.
- A porta padrão da aplicação é 5000.

---

## 3. Modelos de dados principais

### Usuários
Representam clientes, administradores e profissionais vinculados ao sistema.

Campos principais:
- id
- username
- password
- name
- phone
- email
- isAdmin
- isMaster
- profileImageBase64
- profileImageMimeType
- createdAt

### Categorias
- id
- name
- icon

### Serviços
- id
- name
- description
- minPrice
- maxPrice
- categoryId
- icon
- imageUrl
- imageDataBase64
- imageMimeType
- featured

### Preços
- id
- name
- minPrice
- maxPrice
- categoryId

### Agendamentos
- id
- name
- email
- phone
- serviceId
- categoryId
- professionalId
- date
- time
- notes
- status
- seenByProfessional
- createdAt

### Profissionais
- id
- name
- categoryId
- bio
- photoBase64
- photoMimeType
- active
- appointmentInterval
- userId
- lunchBreakStart
- lunchBreakEnd
- createdAt

### Bloqueios de agenda
- id
- professionalId
- startDate
- endDate
- startTime
- endTime
- reason
- description
- createdAt

### Avaliações e comentários
- reviews
- review_comments
- comment_likes
- review_likes

### Configurações do site
- banner
- footer
- site_config
- vendas e relatórios

---

## 4. Funcionalidades do sistema

### 4.1 Autenticação e conta
O sistema suporta:
- cadastro de usuário
- login com email/senha
- logout
- recuperação de senha
- autenticação com Google OAuth
- atualização de telefone e imagem de perfil
- verificação de sessão autenticada

Fluxo importante:
- O backend usa sessions persistidas com express-session e connect-pg-simple no PostgreSQL.
- O acesso a rotas protegidas é controlado por middleware e componentes frontend.
- As sessões são armazenadas na tabela `session` para suportar reinícios do servidor e ambientes de produção mais confiáveis.

### 4.2 Homepage pública
A homepage exibe:
- banner configurável
- categorias e serviços
- lista de profissionais
- avaliações públicas
- informações do salão
- seção de agendamento

### 4.3 Agendamento
O fluxo de agendamento inclui:
- escolha de categoria e serviço
- seleção de profissional (quando aplicável)
- escolha de data e horário disponível
- validação de data e horário
- bloqueios de agenda e horários já ocupados
- confirmação do agendamento
- atualização de status posterior

Regras de negócio relevantes:
- datas anteriores à data de negócio são bloqueadas
- horários já passados não podem ser selecionados
- horários ocupados ou bloqueados são mostrados como indisponíveis
- o sistema usa fuso horário de Brasília para comparações de data/hora

### 4.4 Gestão de clientes
O painel administrativo permite:
- listar clientes
- criar clientes
- editar clientes
- excluir clientes

### 4.5 Gestão de categorias e serviços
Permite:
- criar, editar e excluir categorias
- criar, editar e excluir serviços
- marcar serviços como destaque
- associar serviços a categorias
- fazer upload de imagem do serviço

### 4.6 Gestão de preços
Permite:
- listar itens de preço por categoria
- criar, editar e excluir itens de preço
- visualizar faixas de preço mínimo/máximo

### 4.7 Gestão de profissionais
Permite:
- listar profissionais
- filtrar profissionais por categoria
- ativar/desativar profissionais
- editar dados do profissional
- fazer upload de foto do profissional
- definir intervalo de atendimento
- definir intervalo de almoço
- visualizar agenda e atendimentos do profissional
- acessar painel próprio com marcação de atendimentos vistos e contagem de não vistos

### 4.8 Bloqueios de agenda
O sistema permite bloquear datas/horários de atendimento para:
- feriados
- folgas
- pausas de almoço
- indisponibilidade pontual

### 4.9 Vendas e financeiro
O sistema registra vendas e permite:
- cadastrar vendas
- listar histórico
- filtrar por período
- cancelar vendas
- gerar visão financeira básica

Fluxo de vendas:
- o usuário registra uma venda vinculada a um cliente e produtos/serviços
- o sistema salva o histórico e permite consultar ou cancelar a venda
- relatórios financeiros são gerados a partir do histórico de vendas e filtrações

### 4.10 Reviews e interação social
O sistema suporta:
- cadastro de avaliações públicas
- comentários em avaliações
- curtidas em reviews e comentários
- visualização de curtidas do usuário

### 4.11 Configuração do site
O painel administrativo permite:
- editar banner
- editar footer
- ajustar nome do site e slogan
- alterar cor principal do tema
- enviar logo
- enviar imagem de fundo para a seção de agendamento
- configurar chave PIX e dados do beneficiário

---

## 5. Perfis de acesso

### Cliente
- acessa a homepage pública
- agenda serviços
- visualiza seus agendamentos
- envia avaliações
- acessa perfil pessoal

### Profissional
- visualiza seus agendamentos
- marca atendimentos como vistos
- acessa painel próprio com agenda

### Admin
- acessa dashboard administrativo
- gerencia clientes, serviços, categorias, preços, profissionais e vendas
- gerencia avaliações, comentários e configuração do site

### Master
- possui todas as permissões do Admin
- cria e remove usuários Admin
- controla permissões Master

---

## 6. Rotas principais da API

### Autenticação
- POST /api/register
- POST /api/login
- GET /api/auth/google
- GET /api/auth/google/callback
- POST /api/logout
- GET /api/user
- GET /api/auth/google
- GET /api/auth/google/callback
- POST /api/forgot-password
- GET /api/reset-password/:token
- POST /api/reset-password/:token

### Clientes
- GET /api/clients
- GET /api/clients/:id
- POST /api/clients
- PATCH /api/clients/:id
- DELETE /api/clients/:id

### Categorias e serviços
- GET /api/categories
- GET /api/services/all
- GET /api/services/featured
- GET /api/services/:categoryId
- POST /api/services/:id/upload-image
- POST /api/admin/services
- PUT /api/admin/services/:id
- PATCH /api/admin/services/:id/featured
- DELETE /api/admin/services/:id
- POST /api/admin/categories
- PUT /api/admin/categories/:id
- DELETE /api/admin/categories/:id

### Preços
- GET /api/prices
- GET /api/prices/:categoryId
- POST /api/admin/prices
- PUT /api/admin/prices/:id
- DELETE /api/admin/prices/:id

### Vendas
- POST /api/sales
- GET /api/sales
- PATCH /api/sales/:id
- PATCH /api/sales/:id/cancel
- GET /api/sales/filter

### Agendamentos
- GET /api/appointments/available-times/:date
- POST /api/appointments
- GET /api/appointments
- GET /api/my-appointments
- PATCH /api/appointments/:id/status
- GET /api/appointments/stream

### Profissionais
- GET /api/professionals
- GET /api/professionals/category/:categoryId
- POST /api/admin/professionals
- PUT /api/admin/professionals/:id
- PATCH /api/admin/professionals/:id/active
- DELETE /api/admin/professionals/:id
- POST /api/professionals/:id/upload-photo
- GET /api/professional/me
- GET /api/professional/unseen-count
- GET /api/professional/appointments
- POST /api/professional/appointments/mark-seen

### Reviews e comentários
- GET /api/reviews
- POST /api/reviews
- POST /api/reviews/:id/like/:likeType
- GET /api/user/likes
- GET /api/reviews/:reviewId/comments
- POST /api/reviews/:reviewId/comments
- POST /api/comments/:commentId/like/:likeType
- GET /api/user/comment-likes

### Administração e configurações
- GET /api/admin/users
- POST /api/admin/users
- PATCH /api/admin/users/:id/master
- DELETE /api/admin/users/:id
- GET /api/banner
- PUT /api/banner
- POST /api/banner/upload-image
- GET /api/footer
- PUT /api/footer
- GET /api/site-config
- PUT /api/site-config
- POST /api/site-config/upload-logo
- POST /api/site-config/upload-appointment-background
- GET /api/schedule-blocks
- POST /api/schedule-blocks
- DELETE /api/schedule-blocks/:id
- PATCH /api/user/phone
- POST /api/user/upload-profile-image
- DELETE /api/user/profile-image
- GET /api/images/user/:id
- GET /api/images/service/:id
- GET /api/images/banner
- POST /api/storage/delete
- POST /api/admin/regenerate-images

---

## 7. Fluxos de uso mais comuns

### Cadastro e login
1. O usuário acessa /auth.
2. Pode registrar uma conta ou entrar com Google.
3. O backend cria ou valida a sessão do usuário.

### Agendamento
1. O cliente escolhe uma categoria e um serviço.
2. Seleciona um profissional, se houver.
3. Escolhe uma data e um horário.
4. O backend valida se a data/horário é válido e se o slot está disponível.
5. O agendamento é salvo com status inicial `pending`.

### Administração
1. O usuário entra com perfil Admin/Master.
2. Acesso ao dashboard e aos módulos de gestão.
3. O painel consome a API e atualiza o estado do sistema em tempo real (quando aplicável).

---

## 8. Imagens e uploads

O sistema usa upload para:
- foto de perfil do usuário
- foto de profissional
- imagem de serviço
- banner
- logo do site
- imagem de fundo da seção de agendamento

Processo:
1. O frontend envia o arquivo.
2. O backend usa Multer para processar o arquivo.
3. O arquivo é enviado ao Supabase.
4. A URL pública é salva no banco.
5. O frontend usa as URLs salvas para exibir as imagens.

---

## 9. Configuração e execução

### Variáveis de ambiente
```env
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=sua_chave_secreta_aqui
GOOGLE_CLIENT_ID=seu_google_client_id
GOOGLE_CLIENT_SECRET=seu_google_client_secret
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_senha_de_aplicativo
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_KEY=seu_service_role_key
SUPABASE_BUCKET=public
```

### Comandos
- npm install
- npm run dev
- npm run build
- npm run start
- npm run db:push

### Observações de ambiente
- A aplicação usa a porta 5000.
- O backend precisa de PostgreSQL disponível e configurado.
- As sessões agora são persistidas no PostgreSQL por meio da tabela `session`.
- Em produção, é necessário garantir os arquivos estáticos e o serviço node.

---

## 10. Pontos importantes de manutenção

- O sistema depende de regras de calendário/horário em Brasília.
- O fluxo de agendamento é sensível a datas, horários e bloqueios de agenda.
- As imagens são armazenadas externamente no Supabase.
- O frontend usa React Query, então mudanças no backend podem exigir invalidation de queries.
- O sistema possui permissões separadas para Admin, Master, profissional e cliente.

---

## 11. Histórico de atualizações

- 2026-07-04 — documentação revisada para refletir o estado real do sistema, incluindo fluxo de agendamento, configurações, avaliações, vendas, rotas administrativas e gestão de imagens.
- 2026-07-04 — documentadas rotas de profissionais, bloqueios de agenda, uploads e personalização do site.
- 2026-06-24 — documentação atualizada com rotas reais e fluxo de upload no bucket Supabase.
- 2026-06-24 — scripts legados de migração e limpeza removidos do código principal.
- 2026-06-24 — documentados perfis Master, Admin, Profissional e Cliente.

---

## 12. Configuração e Deployment

### Variáveis de ambiente principais

```env
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=sua_chave_secreta_aqui
GOOGLE_CLIENT_ID=seu_google_client_id
GOOGLE_CLIENT_SECRET=seu_google_client_secret
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_senha_de_aplicativo
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_KEY=seu_service_role_key
SUPABASE_BUCKET=public
```

### Comandos úteis

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run db:push`

### Deploy

1. Configure variáveis de ambiente no servidor
2. Configure PostgreSQL e Supabase corretamente
3. Execute `npm install`
4. Execute `npm run db:push` quando necessário
5. Execute `npm run build` e `npm run start`

---

## 13. Troubleshooting

### Erro de autenticação Google

- Verifique credenciais Google OAuth
- Confira callback URI no Google Cloud
- Garanta que a URL de aplicação esteja correta

### Problemas de email

- Confirme `EMAIL_USER` e `EMAIL_PASS`
- Use senha de aplicativo do Gmail
- Verifique o envio SMTP

### Imagens não carregam

- Verifique configuração do bucket Supabase
- Refaça uploads no painel
- Valide rotas de imagem do backend

### Agendamentos com conflito

- Confira horários disponíveis
- Ajuste bloqueios de agenda
- Verifique se o profissional está ativo

---
