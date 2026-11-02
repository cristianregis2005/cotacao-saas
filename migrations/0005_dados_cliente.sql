-- Dados cadastrais do cliente: identificação e endereço de origem para as cotações.

ALTER TABLE usuarios ADD COLUMN empresa TEXT;
ALTER TABLE usuarios ADD COLUMN documento TEXT;          -- CPF ou CNPJ, só números
ALTER TABLE usuarios ADD COLUMN telefone TEXT;           -- com DDD, só números
ALTER TABLE usuarios ADD COLUMN origem_cep TEXT;
ALTER TABLE usuarios ADD COLUMN origem_logradouro TEXT;
ALTER TABLE usuarios ADD COLUMN origem_numero TEXT;
ALTER TABLE usuarios ADD COLUMN origem_complemento TEXT;
ALTER TABLE usuarios ADD COLUMN origem_bairro TEXT;
ALTER TABLE usuarios ADD COLUMN origem_cidade TEXT;
ALTER TABLE usuarios ADD COLUMN origem_uf TEXT;
