unit DBU.SQL;

interface

uses
  System.SysUtils, DBU.Driver, DBU.Types;

function DBUStripTrailingSemicolon(const ASQL: string): string;
function DBUApplyPagination(const ASQL: string; const ADialect: IDBUDialect;
  ALimit, AOffset: Integer): string;
function DBUQuoteIdentifierPath(const AIdentifierPath: string;
  const ADialect: IDBUDialect): string;

implementation

function DBUStripTrailingSemicolon(const ASQL: string): string;
begin
  Result := Trim(ASQL);

  while (Result <> '') and (Result[Length(Result)] = ';') do
    Delete(Result, Length(Result), 1);

  Result := Trim(Result);

  if Result = '' then
    raise EArgumentException.Create('SQL não pode ser vazio.');
end;

function DBUApplyPagination(const ASQL: string; const ADialect: IDBUDialect;
  ALimit, AOffset: Integer): string;
begin
  if not Assigned(ADialect) then
    raise EArgumentException.Create('Dialeto não pode ser nil.');

  if ALimit <= 0 then
    raise EArgumentOutOfRangeException.Create('LIMIT deve ser maior que zero.');

  if AOffset < 0 then
    raise EArgumentOutOfRangeException.Create('OFFSET não pode ser negativo.');

  Result := ADialect.LimitOffset(DBUStripTrailingSemicolon(ASQL), ALimit, AOffset);
end;

function DBUQuoteIdentifierPath(const AIdentifierPath: string;
  const ADialect: IDBUDialect): string;
var
  Parts: TArray<string>;
  I: Integer;
begin
  if not Assigned(ADialect) then
    raise EArgumentException.Create('Dialeto não pode ser nil.');

  if Trim(AIdentifierPath) = '' then
    raise EArgumentException.Create('Identificador não pode ser vazio.');

  Parts := AIdentifierPath.Split(['.']);
  Result := '';

  for I := 0 to Length(Parts) - 1 do
  begin
    if Trim(Parts[I]) = '' then
      raise EArgumentException.Create('Identificador possui uma parte vazia.');

    if Result <> '' then
      Result := Result + '.';

    Result := Result + ADialect.QuoteIdentifier(Trim(Parts[I]));
  end;
end;

end.
