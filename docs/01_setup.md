# 01 — Setup do Backend (Django + DRF + MySQL) — **COMENTADO**

> **Resumo:** Este guia cria do zero o backend do **Sysmura** com Django + DRF, autenticação por Token, usuário customizado (com papéis) e integração MySQL. **Cada passo está comentado** para você entender o porquê de cada arquivo/configuração.

---

## Estrutura geral que vamos chegar
```
backend/
  manage.py
  requirements.txt
  .env
  .gitignore
  sysmura_project/
    __init__.py
    settings.py
    urls.py
    asgi.py
    wsgi.py
  sysmura_app/
    __init__.py
    admin.py
    apps.py
    models.py
    views.py
    urls.py
    serializers.py
```

---

## 1) Preparação do Ambiente (venv)

```powershell
mkdir C:\Users\ferna\sysmura\backend
cd C:\Users\ferna\sysmura\backend

python -m venv venv
.\venv\Scripts\Activate.ps1

python -m pip install --upgrade pip
```

---

## 2) Arquivos Iniciais

### `requirements.txt` — baseline oficial
```txt
# Framework principal
Django==4.2.11
djangorestframework==3.14.0

# Extensões úteis
django-cors-headers==4.7.0
django-filter==24.1
django-extensions==3.2.3

# Documentação da API
drf-yasg==1.21.7
Markdown==3.5.2

# Banco de dados
mysqlclient==2.2.4
# (se der erro no Windows, usar plano B: PyMySQL==1.1.1)

# Configuração por variáveis de ambiente
python-decouple==3.8
# (alternativa: django-environ==0.11.2)

# Tarefas assíncronas (para e-mails, relatórios, etc.)
celery==5.3.6
redis==5.0.1

# Dependências internas do Django
asgiref==3.8.1
sqlparse==0.5.3
pytz==2025.2
tzdata==2025.2
```

### `.env` (fica na raiz do backend)
```env
SECRET_KEY=

DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost

DB_ENGINE=mysql
DB_NAME=sysmura
DB_USER=root
DB_PASSWORD=senha
DB_HOST=127.0.0.1
DB_PORT=3306

CORS_ALLOW_ALL=True
CORS_ALLOWED_ORIGINS=http://localhost:4200

LANGUAGE_CODE=pt-br
TIME_ZONE=America/Sao_Paulo

# Celery/Redis (opcional)
# CELERY_BROKER_URL=redis://localhost:6379/0
# CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### `.gitignore`
```gitignore
venv/
__pycache__/
*.pyc
*.pyo
*.pyd
*.sqlite3
.env
.DS_Store
.idea/
.vscode/
dist/
node_modules/
```

---

## 3) Instalar dependências
```powershell
pip install -r requirements.txt
```

---

## 4) Criar projeto Django e app principal
```powershell
django-admin startproject sysmura_project .
python manage.py startapp sysmura_app
```

---

## 5) `settings.py` (trechos principais com sysmura)

- Projeto usa `sysmura_project.settings`
- App principal: `sysmura_app`
- Usuário customizado: `AUTH_USER_MODEL = 'sysmura_app.User'`
- Banco padrão: `DB_NAME=sysmura`

*(todo conteúdo segue igual ao que já detalhamos, só trocando `sysvar` → `sysmura`)*

---

## 6) Usuário customizado e endpoints básicos

- Criar `User` em `sysmura_app/models.py`
- Configurar `admin.py`, `serializers.py`, `views.py`, `urls.py`
- Ajustar `sysmura_project/urls.py`

*(códigos já fornecidos antes, apenas troque `sysvar_app` → `sysmura_app` e `sysvar_project` → `sysmura_project`)*

---

## 7) Migrações e superusuário

```powershell
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

---

## 8) Testes iniciais

- `GET http://127.0.0.1:8000/api/health/`
- `POST http://127.0.0.1:8000/api/auth/token/`
- `GET http://127.0.0.1:8000/api/me/`

---

## 9) Próximos passos

1. Cadastros base (Loja, Fornecedor, Produto, etc.)  
2. Estoque + Movimentações  
3. Pedido de Compra  
4. NF-e Entrada  
