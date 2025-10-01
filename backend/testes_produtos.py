import os, sys, json, requests

BASE = os.environ.get("API_BASE", "http://127.0.0.1:8000/api/").rstrip("/") + "/"

USER = os.environ.get("API_USER", "takeshi")
PASS = os.environ.get("API_PASS", "ftju7439")  # você disse "tudo minúsculo"

# Se quiser forçar um produto específico: set API_PROD_ID=3 no ambiente
FORCE_PROD_ID = os.environ.get("API_PROD_ID")

def pr(h):
    print(h)
    sys.stdout.flush()

def req(method, url, **kw):
    r = requests.request(method, url, timeout=15, **kw)
    pr(f"{method} {url} -> {r.status_code}")
    return r

def main():
    pr(f"BASE: {BASE}")

    # 1) LOGIN CORRETO: /api/auth/login/
    login_url = BASE + "auth/login/"
    pr("\n=== LOGIN ===")
    r = req("POST", login_url, json={"username": USER, "password": PASS})
    if r.status_code != 200:
        pr(r.text)
        pr("Falha no login. Corrija usuário/senha ou verifique a rota /api/auth/login/")
        return
    token = r.json().get("token")
    if not token:
        pr("Login retornou 200 mas sem token.")
        pr(r.text)
        return
    headers = {"Authorization": f"Token {token}"}
    pr("Login OK.")

    # 2) ME
    pr("\n=== /api/me/ ===")
    r = req("GET", BASE + "me/", headers=headers)
    pr(r.text)

    # 3) LISTAR PRODUTOS
    pr("\n=== LISTAR PRODUTOS ===")
    r = req("GET", BASE + "produtos/?ordering=-data_cadastro&page_size=5", headers=headers)
    if r.status_code != 200:
        pr(r.text); return
    data = r.json()
    results = data if isinstance(data, list) else data.get("results", [])
    if not results:
        pr("Nenhum produto encontrado. Cadastre um e rode novamente.")
        return

    if FORCE_PROD_ID:
        prod_id = int(FORCE_PROD_ID)
    else:
        prod_id = results[0].get("Idproduto") or results[0].get("id")
    pr(f"Produto escolhido: {prod_id}")

    # 4) OPTIONS no detalhe para ver ações expostas
    pr("\n=== OPTIONS /api/produtos/{id}/ ===")
    det_url = BASE + f"produtos/{prod_id}/"
    r = req("OPTIONS", det_url, headers=headers)
    pr(r.text)

    # 5A) TENTAR ROTA CUSTOMIZADA /inativar/
    pr("\n=== TENTAR INATIVAR (rota customizada) ===")
    r = req("POST", det_url + "inativar/", headers=headers, json={"motivo": "teste api"})
    if r.status_code in (200, 400, 403, 404):
        pr(r.text)
    else:
        pr(r.text)

    # 5B) FALLBACK: PATCH com Ativo=false + header X-Audit-Reason
    pr("\n=== TENTAR INATIVAR (fallback PATCH) ===")
    headers_patch = {**headers, "X-Audit-Reason": "teste api patch"}
    r = req("PATCH", det_url, headers=headers_patch, json={"Ativo": False})
    pr(r.text)

    # 6) REATIVAR (para deixar como estava)
    pr("\n=== REATIVAR (rota customizada, se existir) ===")
    r = req("POST", det_url + "ativar/", headers=headers, json={})
    pr(r.text)

    pr("\n=== FIM ===")

if __name__ == "__main__":
    main()
