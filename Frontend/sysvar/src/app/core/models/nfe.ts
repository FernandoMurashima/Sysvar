export interface NfeUploadResponse {
id: number;
chave?: string;
fornecedor?: string;
emitente?: string;
numero?: string;
serie?: string;
dataEmissao?: string; // ISO
}


export interface NfeConciliacaoItem {
idItemNfe: number; // id interno do item da NF-e
descricao: string; // descrição vinda do XML
ean?: string;
ncm?: string;
cfop?: string;
quantidade: number;
valorUnitario: number;
valorTotal: number;
produtoId?: number | null; // mapeamento com produto do sistema
sku?: string | null;
custoUnitario?: number;
desconto?: number;
}


export interface NfeConciliacaoResponse {
nfeId: number;
fornecedor?: string;
itens: NfeConciliacaoItem[];
}


export interface NfeConciliacaoPayload {
itens: Array<{
idItemNfe: number;
produtoId: number | null;
custoUnitario?: number;
desconto?: number;
}>;
}


export interface NfeConfirmacaoResponse {
nfeId: number;
compraId?: number; // se o backend gerar Compra/CompraItem
status: 'confirmada' | 'erro';
mensagem?: string;
}