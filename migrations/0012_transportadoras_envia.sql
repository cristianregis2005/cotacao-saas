-- Permite desligar também cada transportadora dentro da Envia (chaves envia:correios, envia:jadlog...).
-- O CHECK antigo só aceitava as plataformas, então a tabela é recriada com os mesmos dados.
CREATE TABLE transportadoras_ativas_nova (
  transportadora TEXT PRIMARY KEY,
  ativa INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0, 1)),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO transportadoras_ativas_nova (transportadora, ativa, atualizado_em)
  SELECT transportadora, ativa, atualizado_em FROM transportadoras_ativas;
DROP TABLE transportadoras_ativas;
ALTER TABLE transportadoras_ativas_nova RENAME TO transportadoras_ativas;
