unit DBU.CRUD;

interface

uses
  System.SysUtils, System.Variants, DBU.Connection, DBU.Query, DBU.Driver,
  DBU.SQL, DBU.Types;

type
  TDBUCRUD = class
  private
    FConnection: TDBUConnection;
    FDialect: IDBUDialect;
    procedure ValidateFields(const AFields: TArray<string>);
    procedure BindValues(AQuery: TDBUQuery; const AFields: TArray<string>;
      const AValues: TArray<Variant>);
  public
    constructor Create(AConnection: TDBUConnection; AEngine: TDBUEngine);

    function Insert(const ATable: string; const AFields: TArray<string>;
      const AValues: TArray<Variant>): Integer;
    function Update(const ATable: string; const AKeyField: string;
      const AKeyValue: Variant; const AFields: TArray<string>;
      const AValues: TArray<Variant>): Integer;
    function Delete(const ATable: string; const AKeyField: string;
      const AKeyValue: Variant): Integer;
  end;

implementation

constructor TDBUCRUD.Create(AConnection: TDBUConnection; AEngine: TDBUEngine);
begin
  inherited Create;

  if not Assigned(AConnection) then
    raise EArgumentException.Create('Conexão não pode ser nil.');

  FConnection := AConnection;
  FDialect := CreateDBUDialect(AEngine);
end;

procedure TDBUCRUD.ValidateFields(const AFields: TArray<string>);
var
  I: Integer;
begin
  if Length(AFields) = 0 then
    raise EArgumentException.Create('É necessário informar pelo menos um campo.');

  for I := 0 to Length(AFields) - 1 do
    if Trim(AFields[I]) = '' then
      raise EArgumentException.CreateFmt('Campo na posição %d está vazio.', [I]);
end;

procedure TDBUCRUD.BindValues(AQuery: TDBUQuery;
  const AFields: TArray<string>; const AValues: TArray<Variant>);
var
  I: Integer;
begin
  if Length(AFields) <> Length(AValues) then
    raise EArgumentException.Create('Quantidade de campos e valores deve ser igual.');

  for I := 0 to Length(AFields) - 1 do
    AQuery.ParamByName('p' + IntToStr(I), AValues[I]);
end;

function TDBUCRUD.Insert(const ATable: string; const AFields: TArray<string>;
  const AValues: TArray<Variant>): Integer;
var
  I: Integer;
  Columns, Params, SQL: string;
  Query: TDBUQuery;
begin
  if Trim(ATable) = '' then
    raise EArgumentException.Create('Tabela não pode ser vazia.');

  ValidateFields(AFields);
  if Length(AFields) <> Length(AValues) then
    raise EArgumentException.Create('Quantidade de campos e valores deve ser igual.');

  Columns := '';
  Params := '';

  for I := 0 to Length(AFields) - 1 do
  begin
    if I > 0 then
    begin
      Columns := Columns + ', ';
      Params := Params + ', ';
    end;

    Columns := Columns + DBUQuoteIdentifierPath(AFields[I], FDialect);
    Params := Params + ':p' + IntToStr(I);
  end;

  SQL := Format('INSERT INTO %s (%s) VALUES (%s)',
    [DBUQuoteIdentifierPath(ATable, FDialect), Columns, Params]);

  Query := TDBUQuery.Create(FConnection);
  try
    Query.Query.SQL.Text := SQL;
    BindValues(Query, AFields, AValues);
    Query.Query.ExecSQL;
    Result := Query.Query.RowsAffected;
  finally
    Query.Free;
  end;
end;

function TDBUCRUD.Update(const ATable, AKeyField: string;
  const AKeyValue: Variant; const AFields: TArray<string>;
  const AValues: TArray<Variant>): Integer;
var
  I: Integer;
  SetClause, SQL: string;
  Query: TDBUQuery;
begin
  if Trim(ATable) = '' then
    raise EArgumentException.Create('Tabela não pode ser vazia.');

  if Trim(AKeyField) = '' then
    raise EArgumentException.Create('Campo chave não pode ser vazio.');

  ValidateFields(AFields);
  if Length(AFields) <> Length(AValues) then
    raise EArgumentException.Create('Quantidade de campos e valores deve ser igual.');

  SetClause := '';

  for I := 0 to Length(AFields) - 1 do
  begin
    if I > 0 then
      SetClause := SetClause + ', ';

    SetClause := SetClause + DBUQuoteIdentifierPath(AFields[I], FDialect) +
      ' = :p' + IntToStr(I);
  end;

  SQL := Format('UPDATE %s SET %s WHERE %s = :__key',
    [DBUQuoteIdentifierPath(ATable, FDialect),
     SetClause,
     DBUQuoteIdentifierPath(AKeyField, FDialect)]);

  Query := TDBUQuery.Create(FConnection);
  try
    Query.Query.SQL.Text := SQL;
    BindValues(Query, AFields, AValues);
    Query.ParamByName('__key', AKeyValue);
    Query.Query.ExecSQL;
    Result := Query.Query.RowsAffected;
  finally
    Query.Free;
  end;
end;

function TDBUCRUD.Delete(const ATable, AKeyField: string;
  const AKeyValue: Variant): Integer;
var
  SQL: string;
  Query: TDBUQuery;
begin
  if Trim(ATable) = '' then
    raise EArgumentException.Create('Tabela não pode ser vazia.');

  if Trim(AKeyField) = '' then
    raise EArgumentException.Create('Campo chave não pode ser vazio.');

  SQL := Format('DELETE FROM %s WHERE %s = :__key',
    [DBUQuoteIdentifierPath(ATable, FDialect),
     DBUQuoteIdentifierPath(AKeyField, FDialect)]);

  Query := TDBUQuery.Create(FConnection);
  try
    Query.Query.SQL.Text := SQL;
    Query.ParamByName('__key', AKeyValue);
    Query.Query.ExecSQL;
    Result := Query.Query.RowsAffected;
  finally
    Query.Free;
  end;
end;

end.
