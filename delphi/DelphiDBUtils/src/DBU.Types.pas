unit DBU.Types;

interface

uses
  System.SysUtils;

type
  TDBUEngine = (dbuFirebird, dbuSQLite, dbuMySQL);
  EDBUException = class(Exception);
  EDBUConnectionException = class(EDBUException);
  EDBUQueryException = class(EDBUException);
  EDBUTransactionException = class(EDBUException);

function DBUEngineToString(AEngine: TDBUEngine): string;

implementation

function DBUEngineToString(AEngine: TDBUEngine): string;
begin
  case AEngine of
    dbuFirebird: Result := 'Firebird';
    dbuSQLite: Result := 'SQLite';
    dbuMySQL: Result := 'MySQL';
  else
    Result := 'Unknown';
  end;
end;

end.
