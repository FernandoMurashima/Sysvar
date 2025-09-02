# API: <Recurso>

- Base URL: /api/<versao>
- Auth: Bearer <token>

## Endpoints

### GET /<recurso>
- Query: paginação, filtros
- 200: { items: [], total }
- 401/403/404/422: estrutura de erro padrão

### POST /<recurso>
- Body: schema
- 201: recurso criado

### PUT/PATCH /<recurso>/:id
- Body: schema parcial/total

### DELETE /<recurso>/:id
- 204: sem conteúdo

## Esquemas
```json
{ "type": "object" }
```
