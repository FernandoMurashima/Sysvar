export interface Produto {
  Idproduto?: number;
  Tipoproduto: string;         // '1' = produto com referência (coleção/grupo)
  Descricao: string;
  Desc_reduzida?: string | null;

  classificacao_fiscal?: string | null; // NCM (string)
  unidade?: string | number | null;     // FK -> Unidade (Idunidade) (string no backend antigo, aqui aceito number)

  grupo?: string | number | null;       // Código do grupo OU Idgrupo? No seu backend atual, referencia é montada por Código do Grupo.
  subgrupo?: string | number | null;    // Idsubgrupo (opcional)
  familia?: string | number | null;     // Idfamilia
  grade?: string | number | null;       // Idgrade
  colecao?: string | number | null;     // Código da Coleção (no seu serializer usa codigo da colecao)

  produto_foto?: string | null;
  produto_foto1?: string | null;
  produto_foto2?: string | null;

  Material?: string | number | null;
  data_cadastro?: string;

  referencia?: string | null;          // readonly do backend quando Tipoproduto='1'

  // Para a UI:
  tabela_preco?: number | null;        // selecionada na tela (não existe item-tabela no backend)
  preco?: number | null;               // valor informado na tela
}
