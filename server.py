#!/usr/bin/env python3
"""Servidor local do Editor de Arte e 3D.

Serve os arquivos da pasta e salva cada projeto em projetos/<id>/:
  projeto.json  -> tudo pra reabrir a arte
  capa.png      -> foto 3D usada na aba Meus projetos
  estampa.png   -> arte final em tamanho de impressão
  manual.pdf    -> manual pro fornecedor
Rodar: python3 server.py   (abre em http://127.0.0.1:5180)
"""
import base64
import json
import os
import re
import shutil
import time
import unicodedata
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.join(ROOT, "projetos")
TRASH = os.path.join(PROJ, ".lixeira")
PORT = int(os.environ.get("PORT", "5180"))
MAX_BODY = 120 * 1024 * 1024
ARQUIVOS_OK = {"estampa.png", "manual.pdf", "manual.png", "capa.png"}
ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,80}$")


def slugify(nome):
    s = unicodedata.normalize("NFD", nome or "").encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return (s or "projeto")[:60]


def pasta(pid):
    if not ID_RE.match(pid or ""):
        raise ValueError("id inválido")
    return os.path.join(PROJ, pid)


def data_url_bytes(url):
    if not url or "," not in url:
        return None
    return base64.b64decode(url.split(",", 1)[1])


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, fmt, *args):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get("Content-Length", "0"))
        if n > MAX_BODY:
            raise ValueError("arquivo grande demais")
        return self.rfile.read(n)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/api/projetos":
            return self._json(self.listar())
        return super().do_GET()

    def do_POST(self):
        u = urlparse(self.path)
        parts = [p for p in u.path.split("/") if p]
        try:
            if parts[:2] == ["api", "projetos"] and len(parts) == 3 and parts[2] == "novo":
                nome = json.loads(self._body() or b"{}").get("nome", "")
                return self._json(self.novo(nome))
            if parts[:2] == ["api", "projetos"] and len(parts) == 4:
                pid, acao = parts[2], parts[3]
                if acao == "salvar":
                    return self._json(self.salvar(pid, json.loads(self._body())))
                if acao == "arquivo":
                    nome = parse_qs(u.query).get("nome", [""])[0]
                    if nome not in ARQUIVOS_OK:
                        raise ValueError("arquivo não permitido")
                    d = pasta(pid)
                    os.makedirs(d, exist_ok=True)
                    with open(os.path.join(d, nome), "wb") as f:
                        f.write(self._body())
                    return self._json({"ok": True})
                if acao == "apagar":
                    return self._json(self.apagar(pid))
            return self._json({"erro": "rota não encontrada"}, 404)
        except Exception as e:  # noqa: BLE001
            return self._json({"erro": str(e)}, 400)

    # ---------- ações ----------
    def listar(self):
        out = []
        if not os.path.isdir(PROJ):
            return out
        for pid in os.listdir(PROJ):
            f = os.path.join(PROJ, pid, "projeto.json")
            if pid.startswith(".") or not os.path.isfile(f):
                continue
            try:
                with open(f, encoding="utf-8") as fh:
                    p = json.load(fh)
            except Exception:  # noqa: BLE001
                continue
            d = os.path.join(PROJ, pid)
            out.append({
                "id": pid,
                "nome": p.get("nome") or pid,
                "produto": p.get("produtoNome", ""),
                "tamanho": p.get("tamanhoNome", ""),
                "atualizado": p.get("atualizado", 0),
                "capa": f"projetos/{pid}/capa.png?t={int(os.path.getmtime(f))}" if os.path.isfile(os.path.join(d, "capa.png")) else None,
                "temEstampa": os.path.isfile(os.path.join(d, "estampa.png")),
                "temManual": os.path.isfile(os.path.join(d, "manual.pdf")),
            })
        out.sort(key=lambda x: x["atualizado"], reverse=True)
        return out

    def novo(self, nome):
        base = slugify(nome)
        pid, i = base, 2
        while os.path.exists(os.path.join(PROJ, pid)):
            pid = f"{base}-{i}"
            i += 1
        os.makedirs(pasta(pid))
        return {"id": pid}

    def salvar(self, pid, dados):
        d = pasta(pid)
        os.makedirs(d, exist_ok=True)
        capa = data_url_bytes(dados.pop("capa", None))
        estampa = data_url_bytes(dados.pop("estampa", None))
        dados["atualizado"] = int(time.time() * 1000)
        tmp = os.path.join(d, "projeto.json.tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(dados, f, ensure_ascii=False)
        os.replace(tmp, os.path.join(d, "projeto.json"))
        if capa:
            with open(os.path.join(d, "capa.png"), "wb") as f:
                f.write(capa)
        if estampa:
            with open(os.path.join(d, "estampa.png"), "wb") as f:
                f.write(estampa)
        return {"ok": True, "atualizado": dados["atualizado"]}

    def apagar(self, pid):
        d = pasta(pid)
        if not os.path.isdir(d):
            raise ValueError("projeto não existe")
        os.makedirs(TRASH, exist_ok=True)
        shutil.move(d, os.path.join(TRASH, f"{pid}-{int(time.time())}"))
        return {"ok": True}


if __name__ == "__main__":
    os.makedirs(PROJ, exist_ok=True)
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Editor de Arte e 3D rodando em http://127.0.0.1:{PORT}", flush=True)
    srv.serve_forever()
