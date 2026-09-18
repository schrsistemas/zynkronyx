unit DBU.Driver;

interface

uses
  DBU.Types;

type
  IDBUDialect = interface
    ['{B8B4D8C5-AB2E-4E2F-8A1B-DB7F1A1F6D21}']
    function Engine: TDBUEngine;
    function LimitOffset(const ASQL: string; ALimit, AOffset: Integer): string;
    function QuoteIdentifier(const AIdentifier: string): string;
    function CurrentTimestampSQL: string;
  end;

function CreateDBUDialect(AEngine: TDBUEngine): IDBUDialect;

implementation

uses
  System.SysUtils;

type
  TDBUDialectBase = class(TInterfacedObject, IDBUDialect)
  private
    FEngine: TDBUEngine;
  public
    constructor Create(AEngine: TDBUEngine);
    function Engine: TDBUEngine;
    function LimitOffset(const ASQL: string; ALimit, AOffset: Integer): string; virtual;
    function QuoteIdentifier(const AIdentifier: string): string; virtual;
    function CurrentTimestampSQL: string; virtual;
  end;

  TFirebirdDialect = class(TDBUDialectBase)
  public
    function LimitOffset(const ASQL: string; ALimit, AOffset: Integer): string; override;
  end;

  TSQLiteDialect = class(TDBUDialectBase);
  TMySQLDialect = class(TDBUDialectBase)
  public
    function QuoteIdentifier(const AIdentifier: string): string; override;
  end;

constructor TDBUDialectBase.Create(AEngine: TDBUEngine);
begin
  inherited Create;
  FEngine := AEngine;
end;

function TDBUDialectBase.Engine: TDBUEngine;
begin
  Result := FEngine;
end;

function TDBUDialectBase.LimitOffset(const ASQL: string; ALimit, AOffset: Integer): string;
begin
  if (ALimit < 0) or (AOffset < 0) then
    raise EArgumentOutOfRangeException.Create('LIMIT/OFFSET não podem ser negativos.');
  Result := Format('%s LIMIT %d OFFSET %d', [ASQL, ALimit, AOffset]);
end;

function TDBUDialectBase.QuoteIdentifier(const AIdentifier: string): string;
begin
  if Trim(AIdentifier) = '' then
    raise EArgumentException.Create('Identificador não pode ser vazio.');
  Result := '"' + StringReplace(AIdentifier, '"', '""', [rfReplaceAll]) + '"';
end;

function TDBUDialectBase.CurrentTimestampSQL: string;
begin
  Result := 'CURRENT_TIMESTAMP';
end;

function TFirebirdDialect.LimitOffset(const ASQL: string; ALimit, AOffset: Integer): string;
begin
  if (ALimit <= 0) or (AOffset < 0) then
    raise EArgumentOutOfRangeException.Create('LIMIT deve ser maior que zero.');
  Result := Format('%s ROWS %d TO %d', [ASQL, AOffset + 1, AOffset + ALimit]);
end;

function TMySQLDialect.QuoteIdentifier(const AIdentifier: string): string;
begin
  if Trim(AIdentifier) = '' then
    raise EArgumentException.Create('Identificador não pode ser vazio.');
  Result := Chr(96) + StringReplace(AIdentifier, Chr(96), Chr(96) + Chr(96), [rfReplaceAll]) + Chr(96);
end;

function CreateDBUDialect(AEngine: TDBUEngine): IDBUDialect;
begin
  case AEngine of
    dbuFirebird: Result := TFirebirdDialect.Create(AEngine);
    dbuSQLite: Result := TSQLiteDialect.Create(AEngine);
    dbuMySQL: Result := TMySQLDialect.Create(AEngine);
  else
    raise EArgumentException.Create('Engine de banco não suportada.');
  end;
end;

end.
